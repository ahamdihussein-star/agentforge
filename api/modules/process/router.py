"""
Process API Router
FastAPI endpoints for process execution

Endpoints:
- POST /process/execute - Start new execution
- GET /process/executions - List executions
- GET /process/executions/{id} - Get execution details
- POST /process/executions/{id}/resume - Resume paused execution
- POST /process/executions/{id}/cancel - Cancel execution
- GET /process/executions/{id}/nodes - Get node executions
- GET /process/approvals - List pending approvals
- POST /process/approvals/{id}/decide - Approve/reject
- GET /process/stats - Execution statistics
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session

from database.config import get_db
from core.llm.registry import LLMRegistry

from .schemas import (
    ProcessExecutionCreate,
    ProcessExecutionResponse,
    ProcessExecutionListResponse,
    ApprovalRequestResponse,
    ApprovalDecisionRequest,
    ApprovalListResponse,
    ProcessResumeRequest,
    ProcessCancelRequest,
    ProcessStatsResponse,
    NodeExecutionResponse,
)
from .service import ProcessAPIService

# Import security from platform's auth system
from api.security import require_auth, User

# Import business-friendly messages
from core.process.messages import (
    ErrorCode, 
    format_error_for_user,
    get_success_message,
    sanitize_for_user
)


router = APIRouter(prefix="/process", tags=["Process Execution"])


# Global LLM registry instance (initialized on first request)
_llm_registry: Optional[LLMRegistry] = None


def _get_llm_registry() -> LLMRegistry:
    """Get or create LLM registry singleton"""
    global _llm_registry
    if _llm_registry is None:
        _llm_registry = LLMRegistry()
        # Load from environment or configuration
        _llm_registry.load_from_env()
    return _llm_registry


def get_service(db: Session = Depends(get_db)) -> ProcessAPIService:
    """Get process service instance with dependencies"""
    return ProcessAPIService(
        db=db, 
        llm_registry=_get_llm_registry()
    )


def _user_to_dict(user: User) -> Dict[str, Any]:
    """Convert User object to dict for service layer"""
    # Handle different User model variations
    org_id = getattr(user, 'org_id', None) or getattr(user, 'organization_id', None) or ''
    name = getattr(user, 'name', None) or getattr(user, 'email', 'Unknown')
    email = getattr(user, 'email', '') 
    
    # Get role_ids (the User model uses role_ids, not roles)
    role_ids = getattr(user, 'role_ids', []) or []
    
    return {
        "id": str(user.id),
        "org_id": str(org_id),
        "name": name,
        "email": email,
        "role_ids": role_ids
    }


# =============================================================================
# EXECUTION ENDPOINTS
# =============================================================================

@router.post("/execute", response_model=ProcessExecutionResponse)
async def start_execution(
    request: ProcessExecutionCreate,
    background_tasks: BackgroundTasks,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Start a new workflow run
    
    Starts running the selected workflow with the provided input.
    """
    user_dict = _user_to_dict(user)
    try:
        result = await service.start_execution(
            agent_id=request.agent_id,
            org_id=user_dict["org_id"],
            user_id=user_dict["id"],
            trigger_input=request.trigger_input,
            trigger_type="manual",
            conversation_id=request.conversation_id,
            correlation_id=request.correlation_id,
            user_info=user_dict
        )
        return result
    except PermissionError as e:
        raise HTTPException(
            status_code=403, 
            detail=format_error_for_user(ErrorCode.ACCESS_DENIED)
        )
    except ValueError as e:
        # Sanitize technical error messages
        raise HTTPException(
            status_code=400, 
            detail=sanitize_for_user(str(e))
        )
    except Exception as e:
        # Log full error; return user-friendly message with optional detail
        import traceback
        traceback.print_exc()
        detail = format_error_for_user(ErrorCode.EXECUTION_FAILED)
        if isinstance(detail, dict) and "message" in detail:
            detail["message"] = detail["message"] + " " + str(e)
        elif isinstance(detail, str):
            detail = detail + " " + str(e)
        raise HTTPException(
            status_code=500, 
            detail=detail
        )


@router.get("/executions", response_model=ProcessExecutionListResponse)
async def list_executions(
    agent_id: Optional[str] = Query(None, description="Filter by workflow"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    List workflow runs
    
    Returns your workflow run history.
    """
    user_dict = _user_to_dict(user)
    try:
        items, total = service.list_executions(
            org_id=user_dict["org_id"],
            agent_id=agent_id,
            status=status,
            limit=limit,
            offset=offset
        )
        return ProcessExecutionListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail="Unable to load workflow runs. Please try again."
        )


@router.get("/executions/{execution_id}", response_model=ProcessExecutionResponse)
async def get_execution(
    execution_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Get workflow run details
    
    Returns details of a specific workflow run.
    """
    user_dict = _user_to_dict(user)
    try:
        return service.get_execution(
            execution_id=execution_id,
            org_id=user_dict["org_id"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.EXECUTION_NOT_FOUND)
        )


@router.post("/executions/{execution_id}/resume", response_model=ProcessExecutionResponse)
async def resume_execution(
    execution_id: str,
    request: ProcessResumeRequest = None,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Continue a paused workflow
    
    Continues the workflow from where it was waiting (e.g., after approval).
    """
    user_dict = _user_to_dict(user)
    try:
        return await service.resume_execution(
            execution_id=execution_id,
            user_id=user_dict["id"],
            user_info=user_dict,
            resume_input=request.resume_input if request else {}
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=403, 
            detail=format_error_for_user(ErrorCode.PERMISSION_DENIED)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=format_error_for_user(ErrorCode.EXECUTION_CANNOT_RESUME)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=format_error_for_user(ErrorCode.EXECUTION_FAILED)
        )


@router.post("/executions/{execution_id}/cancel", response_model=ProcessExecutionResponse)
async def cancel_execution(
    execution_id: str,
    request: ProcessCancelRequest = None,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Cancel a workflow run
    
    Stops a running or paused workflow.
    """
    user_dict = _user_to_dict(user)
    try:
        return await service.cancel_execution(
            execution_id=execution_id,
            user_id=user_dict["id"],
            user_info=user_dict,
            reason=request.reason if request else None
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=403, 
            detail=format_error_for_user(ErrorCode.PERMISSION_DENIED)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=format_error_for_user(ErrorCode.EXECUTION_CANNOT_CANCEL)
        )


@router.get("/executions/{execution_id}/steps")
async def get_step_executions(
    execution_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get workflow step history
    
    Shows what happened at each step of the workflow run.
    """
    user_dict = _user_to_dict(user)
    from database.services.process_execution_service import ProcessExecutionService
    from core.process.messages import get_node_type_display, get_status_info, sanitize_for_user
    
    exec_service = ProcessExecutionService(db)
    
    # Verify execution belongs to org
    execution = exec_service.get_execution(execution_id)
    if not execution or str(execution.org_id) != user_dict["org_id"]:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.EXECUTION_NOT_FOUND)
        )
    
    nodes = exec_service.get_node_executions(execution_id)
    
    return {
        "steps": [
            {
                "id": str(n.id),
                "step_name": n.node_name or get_node_type_display(n.node_type),
                "step_type": get_node_type_display(n.node_type),
                "order": n.execution_order,
                "status": get_status_info(n.status),
                "branch_taken": n.branch_taken,
                "error": sanitize_for_user(n.error_message) if n.error_message else None,
                "started_at": n.started_at.isoformat() if n.started_at else None,
                "completed_at": n.completed_at.isoformat() if n.completed_at else None,
                "duration_seconds": round(n.duration_ms / 1000, 2) if n.duration_ms else None
            }
            for n in nodes
        ],
        "total": len(nodes)
    }


# =============================================================================
# APPROVAL ENDPOINTS
# =============================================================================

@router.get("/approvals", response_model=ApprovalListResponse)
async def list_pending_approvals(
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    List your pending approvals
    
    Shows approval requests waiting for your decision.
    """
    user_dict = _user_to_dict(user)
    approvals = service.get_pending_approvals(
        user_id=user_dict["id"],
        org_id=user_dict["org_id"],
        user_role_ids=user_dict.get("roles", [])
    )
    return ApprovalListResponse(items=approvals, total=len(approvals))


@router.get("/approvals/{approval_id}", response_model=ApprovalRequestResponse)
async def get_approval(
    approval_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get approval request details
    
    Shows the details of an approval request for review.
    """
    user_dict = _user_to_dict(user)
    from database.services.process_execution_service import ProcessExecutionService
    
    exec_service = ProcessExecutionService(db)
    approval = exec_service.get_approval_request(approval_id)
    
    if not approval or str(approval.org_id) != user_dict["org_id"]:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.APPROVAL_NOT_FOUND)
        )
    
    return service._approval_to_response(approval)


@router.post("/approvals/{approval_id}/decide", response_model=ApprovalRequestResponse)
async def decide_approval(
    approval_id: str,
    request: ApprovalDecisionRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Submit your approval decision
    
    Approve or reject the request. The workflow will continue based on your decision.
    """
    user_dict = _user_to_dict(user)
    if request.decision not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400, 
            detail="Please choose either 'Approve' or 'Reject'."
        )
    
    try:
        return await service.handle_approval_decision(
            approval_id=approval_id,
            user_id=user_dict["id"],
            decision=request.decision,
            comments=request.comments,
            decision_data=request.decision_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail="Unable to process your decision. The request may have already been processed."
        )


# =============================================================================
# STATISTICS ENDPOINTS
# =============================================================================

@router.get("/stats", response_model=ProcessStatsResponse)
async def get_workflow_stats(
    agent_id: Optional[str] = Query(None, description="Filter by workflow"),
    days: int = Query(30, ge=1, le=365, description="Time period in days"),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Get workflow statistics
    
    Shows summary statistics for your workflow runs.
    """
    user_dict = _user_to_dict(user)
    return service.get_stats(
        org_id=user_dict["org_id"],
        agent_id=agent_id,
        days=days
    )


# =============================================================================
# WEBHOOK ENDPOINT
# =============================================================================

@router.post("/webhook/{agent_id}")
async def process_webhook(
    agent_id: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    correlation_id: Optional[str] = Query(None),
    service: ProcessAPIService = Depends(get_service),
    db: Session = Depends(get_db)
):
    """
    Webhook to start a workflow
    
    External systems can call this URL to start a workflow.
    The workflow runs in the background and the response is immediate.
    """
    from database.models import Agent
    import uuid as uuid_module
    
    # Get agent
    agent = db.query(Agent).filter(
        Agent.id == uuid_module.UUID(agent_id),
        Agent.agent_type == "process",
        Agent.is_published == True
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=404, 
            detail="Workflow not found or not published."
        )
    
    # Create execution ID
    execution_id = str(uuid_module.uuid4())
    
    # Start execution in background
    async def run_execution():
        await service.start_execution(
            agent_id=agent_id,
            org_id=str(agent.org_id),
            user_id=str(agent.owner_id),  # Use agent owner as trigger user
            trigger_input=payload,
            trigger_type="http_webhook",
            correlation_id=correlation_id
        )
    
    background_tasks.add_task(run_execution)
    
    return {
        "status": "accepted",
        "message": "Process execution started",
        "agent_id": agent_id,
        "correlation_id": correlation_id
    }


# =============================================================================
# CONFIGURATION ENDPOINTS
# =============================================================================

@router.get("/config/node-types")
async def get_node_types(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """
    Get available node types for the process builder
    
    Returns all enabled node types that can be used in process definitions.
    This allows dynamic UI configuration without hardcoding.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    settings_service = ProcessSettingsService(db)
    
    if category:
        all_types = settings_service.get_node_types_by_category()
        return {
            "node_types": all_types.get(category, []),
            "category": category
        }
    
    return {
        "node_types": settings_service.get_node_types(),
        "categories": settings_service.get_node_types_by_category()
    }


@router.get("/config/settings")
async def get_org_process_settings(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get organization's process settings
    
    Returns merged settings (system defaults + org overrides).
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    return settings_service.get_org_settings(user_dict["org_id"])


@router.put("/config/settings")
async def update_org_process_settings(
    updates: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Update organization's process settings
    
    Allows customizing defaults for the organization.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    return settings_service.update_org_settings(
        org_id=user_dict["org_id"],
        updates=updates,
        updated_by=user_dict["id"]
    )


@router.get("/config/templates")
async def get_process_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get available process templates
    
    Returns templates for quick-starting new processes.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    templates = settings_service.get_templates(
        org_id=user_dict["org_id"],
        category=category,
        include_public=True
    )
    
    return {"templates": templates}


@router.post("/config/templates")
async def create_process_template(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Create a new process template
    
    Save a process definition as a reusable template.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    template = settings_service.create_template(
        name=request.get('name', 'Untitled Template'),
        process_definition=request.get('process_definition', {}),
        description=request.get('description'),
        category=request.get('category', 'general'),
        is_public=request.get('is_public', False),
        org_id=user_dict["org_id"],
        created_by=user_dict["id"]
    )
    
    return template


@router.post("/config/templates/{template_id}/use")
async def use_process_template(
    template_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Use a template to create a new process
    
    Returns the template's process definition for use.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    settings_service = ProcessSettingsService(db)
    
    try:
        template = settings_service.use_template(template_id)
        return template
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# WIZARD ENDPOINTS (AI-powered workflow creation)
# =============================================================================

@router.post("/wizard/generate")
async def generate_workflow_from_goal(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Create a workflow from your description
    
    Just describe what you want the workflow to do in plain language,
    and we'll create it for you!
    
    Example:
        "Create an approval workflow for expense reports over $500"
    """
    from core.process.wizard import ProcessWizard
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    goal = request.get('goal', '')
    
    if not goal:
        raise HTTPException(
            status_code=400, 
            detail="Please describe what you want the workflow to do."
        )
    
    # Get org settings
    settings_service = ProcessSettingsService(db)
    org_settings = settings_service.get_org_settings(user_dict["org_id"])
    
    # Get LLM if available
    llm = None
    if _llm_registry:
        models = _llm_registry.list_all()
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    
    # Generate process
    wizard = ProcessWizard(llm=llm, org_settings=org_settings)
    
    try:
        process_def = await wizard.generate_from_goal(
            goal=goal,
            additional_context=request.get('context')
        )
        
        return {
            "success": True,
            "workflow": process_def,
            "message": "Your workflow has been created! You can now customize it or run it."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail="We couldn't create the workflow. Please try describing it differently."
        )


@router.post("/wizard/suggest-settings")
async def suggest_step_settings(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get AI-suggested settings for a step
    
    Tell us what this step should do, and we'll suggest the best settings.
    """
    from core.process.wizard import ProcessWizard
    from database.services.process_settings_service import ProcessSettingsService
    from core.process.messages import get_node_type_display
    
    user_dict = _user_to_dict(user)
    
    step_type = request.get('step_type')
    if not step_type:
        raise HTTPException(
            status_code=400, 
            detail="Please select a step type first."
        )
    
    # Get org settings
    settings_service = ProcessSettingsService(db)
    org_settings = settings_service.get_org_settings(user_dict["org_id"])
    
    # Get LLM if available
    llm = None
    if _llm_registry:
        models = _llm_registry.list_all()
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    
    wizard = ProcessWizard(llm=llm, org_settings=org_settings)
    
    try:
        config = await wizard.suggest_node_config(
            node_type=step_type,
            node_name=request.get('step_name', ''),
            purpose=request.get('purpose', ''),
            goal=request.get('workflow_goal', ''),
            existing_variables=request.get('available_data', [])
        )
        
        return {
            "success": True,
            "suggested_settings": config,
            "step_type_name": get_node_type_display(step_type),
            "message": "Here are our suggested settings. Feel free to adjust them!"
        }
    except Exception as e:
        # Return defaults on error
        default_config = wizard._get_default_node_config(step_type)
        return {
            "success": True,
            "suggested_settings": default_config,
            "step_type_name": get_node_type_display(step_type),
            "message": "Here are the default settings for this step type."
        }
