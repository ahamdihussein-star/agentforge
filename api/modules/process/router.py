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

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
import os
import re
import uuid
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr

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
    EnrichFormFieldsRequest,
    EnrichFormFieldsResponse,
    EnrichedFormField,
    SummarizeProcessRequest,
    SummarizeProcessResponse,
    UpdateProcessScheduleRequest,
    UpdateProcessScheduleResponse,
    PendingApprovalDisplayResponse,
)
from .service import ProcessAPIService

# Import security from platform's auth system
from api.security import require_auth, User
from core.security import security_state, Permission

# Import business-friendly messages and RFC 9457 problem details
from core.process.messages import (
    ErrorCode,
    format_error_for_user,
    get_success_message,
    sanitize_for_user,
    problem_details_rfc9457,
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
    
    # Get role_ids and group_ids (the User model uses role_ids, not roles)
    role_ids = getattr(user, 'role_ids', []) or []
    group_ids = getattr(user, 'group_ids', []) or []
    
    return {
        "id": str(user.id),
        "org_id": str(org_id),
        "name": name,
        "email": email,
        "role_ids": role_ids,
        "group_ids": group_ids
    }


def _is_platform_admin(user: User) -> bool:
    """
    Determine if the current user should be treated as a platform/org admin for portal-scoped visibility.

    We intentionally keep this check lightweight and aligned with existing approvals behavior.
    """
    try:
        return (
            security_state.check_permission(user, Permission.SYSTEM_ADMIN.value) or
            security_state.check_permission(user, Permission.USERS_VIEW.value) or
            security_state.check_permission(user, Permission.USERS_EDIT.value)
        )
    except Exception:
        return False


def _is_approval_visible_to_user(approval: Any, user_dict: Dict[str, Any]) -> bool:
    """Check whether an approval request should be visible/actionable for a user."""
    if not approval or not user_dict:
        return False
    try:
        assignee_type = str(getattr(approval, "assignee_type", "") or "").strip().lower()
        if assignee_type == "any":
            return True
        user_id = str(user_dict.get("id") or "")
        role_ids = set(str(x) for x in (user_dict.get("role_ids") or []) if x)
        group_ids = set(str(x) for x in (user_dict.get("group_ids") or []) if x)
        assigned_user_ids = set(str(x) for x in (getattr(approval, "assigned_user_ids", None) or []) if x)
        assigned_role_ids = set(str(x) for x in (getattr(approval, "assigned_role_ids", None) or []) if x)
        assigned_group_ids = set(str(x) for x in (getattr(approval, "assigned_group_ids", None) or []) if x)
        if user_id and user_id in assigned_user_ids:
            return True
        if role_ids and assigned_role_ids and role_ids.intersection(assigned_role_ids):
            return True
        if group_ids and assigned_group_ids and group_ids.intersection(assigned_group_ids):
            return True
    except Exception:
        return False
    return False


# =============================================================================
# FILE UPLOADS FOR PROCESS RUNS (Trigger "file" fields)
# =============================================================================

def _process_upload_base_dir() -> str:
    """
    Base directory for uploaded files.

    We intentionally reuse the platform's UPLOAD_PATH convention (used by Documents/Kits),
    but isolate process-run uploads under a dedicated subfolder.
    """
    base = os.environ.get("UPLOAD_PATH", "data/uploads")
    return str(base)


def _safe_filename(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return "upload"
    # keep dots for extensions, but strip everything else unsafe
    n = re.sub(r"[^A-Za-z0-9\.\-_]+", "_", n)
    n = n.strip("._")
    return n or "upload"


@router.post("/uploads")
async def upload_process_file(
    file: UploadFile = File(...),
    user: User = Depends(require_auth)
):
    """
    Upload a file to be used as a trigger input for a workflow run.

    Returns a **file reference object** that can be embedded inside `trigger_input`.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found for current user.")

    file_id = str(uuid.uuid4())
    original_name = file.filename or "upload"
    safe_name = _safe_filename(original_name)
    content_type = file.content_type or "application/octet-stream"
    ext = safe_name.split(".")[-1].lower() if "." in safe_name else ""

    base_dir = _process_upload_base_dir()
    dest_dir = os.path.join(base_dir, "process_uploads", org_id)
    os.makedirs(dest_dir, exist_ok=True)
    stored_name = f"{file_id}_{safe_name}"
    dest_path = os.path.join(dest_dir, stored_name)

    size = 0
    try:
        # Stream to disk (avoid loading large files into memory)
        with open(dest_path, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                size += len(chunk)
                out.write(chunk)
    except Exception as e:
        try:
            if os.path.exists(dest_path):
                os.remove(dest_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to upload file.")

    return {
        "success": True,
        "file": {
            "kind": "uploadedFile",
            "id": file_id,
            "name": original_name,
            "content_type": content_type,
            "file_type": ext,
            "size": size,
            # This path is used internally by file/text extraction steps (not shown to end users)
            "path": dest_path,
            # Download URL for UIs (optional)
            "download_url": f"/process/uploads/{file_id}/download",
        }
    }


@router.get("/uploads/{file_id}/download")
async def download_process_file(
    file_id: str,
    user: User = Depends(require_auth)
):
    """
    Download a previously uploaded process-run file by id.

    Security: files are scoped to the caller's org folder.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found for current user.")

    try:
        uuid.UUID(str(file_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file id.")

    base_dir = _process_upload_base_dir()
    dest_dir = os.path.join(base_dir, "process_uploads", org_id)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="File not found.")

    prefix = f"{file_id}_"
    match = None
    try:
        for name in os.listdir(dest_dir):
            if name.startswith(prefix):
                match = name
                break
    except Exception:
        match = None

    if not match:
        raise HTTPException(status_code=404, detail="File not found.")

    path = os.path.join(dest_dir, match)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found.")

    original_name = match[len(prefix):] or "download"
    return FileResponse(
        path,
        filename=original_name,
        media_type="application/octet-stream"
    )


# =============================================================================
# BUILDER TEST UTILITIES
# =============================================================================

class ProcessTestSendNotificationRequest(BaseModel):
    """Send a real notification during a visual builder test run."""
    channel: str = Field(default="email", description="Notification channel (only email supported for test)")
    recipients: List[EmailStr] = Field(default_factory=list, description="Recipient email addresses")
    title: str = Field(default="Notification", description="Email subject")
    message: str = Field(default="", description="Email body (plain text or HTML)")


@router.post("/test/send-notification")
async def test_send_notification(
    request: ProcessTestSendNotificationRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Send a real notification during a Process Builder "Test" run.

    This is used by the visual builder playback/simulation so business users can verify
    that email notifications actually deliver (SendGrid), while still using the animated
    path playback UX.
    """
    channel = (request.channel or "email").strip().lower()
    if channel != "email":
        raise HTTPException(status_code=400, detail="Only email notifications are supported in test mode right now.")
    if not request.recipients:
        raise HTTPException(status_code=400, detail="At least one recipient is required.")
    if len(request.recipients) > 10:
        raise HTTPException(status_code=400, detail="Too many recipients (max 10).")
    if request.message is None or not str(request.message).strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    # Use the same platform email service as verification / MFA (SendGrid via env)
    from core.process.services.notification import NotificationService
    from core.security import EmailService as PlatformEmailService

    svc = NotificationService(db=db, platform_email_service=PlatformEmailService)
    result = await svc.send(
        channel="email",
        recipients=[str(x).strip() for x in request.recipients if str(x).strip()],
        title=(request.title or "Notification").strip() or "Notification",
        message=str(request.message),
        template_id=None,
        template_data={},
        priority="normal",
        config={},
    )
    return result


# =============================================================================
# PRE-FLIGHT VALIDATION (before test run)
# =============================================================================

@router.post("/preflight-check")
async def preflight_check(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    AI-driven pre-flight validation before running a process test.
    
    Analyzes the process definition to find ALL required identity fields,
    checks the current user's profile against them, and returns actionable
    warnings with fix suggestions.
    
    This runs BEFORE the actual test to give the user a chance to fix
    missing data (assign manager, fill profile fields, etc.) instead of
    discovering failures mid-execution.
    """
    import uuid as uuid_module
    from core.identity.service import UserDirectoryService
    from database.models.agent import Agent
    
    user_dict = _user_to_dict(user)
    agent_id = request.get("agent_id", "")
    
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    
    # Normalize agent_id to UUID for consistent DB query
    try:
        agent_uuid = uuid_module.UUID(str(agent_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid agent_id format")
    
    # Load process definition
    agent = db.query(Agent).filter(Agent.id == agent_uuid).first()
    if not agent or not agent.process_definition:
        raise HTTPException(status_code=404, detail="Process not found or has no definition")
    
    process_def = agent.process_definition
    if isinstance(process_def, str):
        import json as _json
        process_def = _json.loads(process_def)
    
    nodes = process_def.get("nodes", [])
    
    # =====================================================================
    # Step 1: Analyze process nodes to extract required identity fields
    # =====================================================================
    requirements = _analyze_process_identity_requirements(nodes)
    
    # =====================================================================
    # Step 2: Get the current user's identity data
    # =====================================================================
    dir_svc = UserDirectoryService()
    user_data = {}
    identity_ctx = {}
    try:
        user_data = dir_svc.enrich_process_context(user_dict["id"], user_dict["org_id"])
        print(f"[Preflight] enrich_process_context: user_id={user_dict['id']}, org_id={user_dict['org_id']}, "
              f"email={user_data.get('email', '(none)')}, manager_email={user_data.get('manager_email', '(none)')}, "
              f"keys={list(user_data.keys())}")
    except Exception as e:
        print(f"[Preflight] enrich_process_context FAILED: user_id={user_dict['id']}, org_id={user_dict['org_id']}, error={e}")
        import traceback
        traceback.print_exc()
        user_data = {}
    
    # Fallback: if enrich returned minimal data, inject email from auth token
    if not user_data.get("email") and user_dict.get("email"):
        user_data["email"] = user_dict["email"]
        print(f"[Preflight] Injected email from auth token as fallback: {user_dict['email']}")
    
    try:
        identity_ctx = dir_svc.discover_identity_context(user_dict["org_id"])
        print(f"[Preflight] identity_context: source={identity_ctx.get('source')}, warnings={identity_ctx.get('warnings')}")
    except Exception as e:
        print(f"[Preflight] discover_identity_context FAILED: {e}")
        identity_ctx = {}
    
    # =====================================================================
    # Step 3: Check requirements against actual data
    # =====================================================================
    issues = _check_requirements_against_data(requirements, user_data, identity_ctx, user_dict)
    
    # =====================================================================
    # Step 4: Return structured result
    # =====================================================================
    return {
        "ok": len([i for i in issues if i["severity"] == "error"]) == 0,
        "issues": issues,
        "identity_source": identity_ctx.get("source_label", "Unknown"),
        "user_profile_summary": {
            "email": user_data.get("email", None),
            "name": user_data.get("display_name") or user_data.get("name", None),
            "has_manager": bool(user_data.get("manager_email") or user_data.get("manager_id")),
            "manager_name": user_data.get("manager_name", None),
            "manager_email": user_data.get("manager_email", None),
            "department": user_data.get("department_name", None),
            "has_custom_fields": bool(user_data.get("custom_attributes")),
        },
        "requirements": requirements,
    }


def _analyze_process_identity_requirements(nodes: list) -> Dict[str, Any]:
    """
    Scan ALL process nodes to determine which identity fields are required.
    
    This is a deterministic, thorough scan — not LLM-based — so it's instant
    and 100% accurate. It checks:
    - Notification recipients (requester, manager, custom emails)
    - Approval assignees (dynamic_manager, department, role)
    - Variable references ({{ _user_context.X }})
    - Condition expressions referencing identity
    - AI task prompts referencing identity
    - Form fields with prefill from identity
    """
    import re as _re
    
    reqs = {
        "needs_email": False,
        "needs_manager": False,
        "needs_department": False,
        "needs_custom_fields": [],
        "referenced_identity_fields": set(),
        "details": [],  # Human-readable description of why each field is needed
    }
    
    # Regex to find {{ _user_context.FIELD }} or {{ trigger_input._user_context.FIELD }}
    ctx_ref_re = _re.compile(r'\{\{\s*(?:trigger_input\.)?_user_context\.(\w+)\s*\}\}')
    # Also catch manager_id / manager_email at top-level trigger_input
    top_ref_re = _re.compile(r'\{\{\s*(?:trigger_input\.)?(manager_id|manager_email|department_id|department_name|employee_id)\s*\}\}')
    
    for node in nodes:
        if not isinstance(node, dict):
            continue
        
        node_type = (node.get("type") or "").lower()
        node_name = node.get("name") or node.get("label") or node_type
        config = node.get("config") or node.get("data") or {}
        if isinstance(config, dict) and "config" in config:
            config = config["config"]  # Handle nested config from visual builder
        if not isinstance(config, dict):
            config = {}
        
        # --- Scan the entire node config as text for variable references ---
        config_text = str(config)
        for match in ctx_ref_re.finditer(config_text):
            field = match.group(1)
            reqs["referenced_identity_fields"].add(field)
            if field in ("email",):
                reqs["needs_email"] = True
            elif field in ("manager_id", "manager_email", "manager_name"):
                reqs["needs_manager"] = True
            elif field in ("department_name", "department_id"):
                reqs["needs_department"] = True
        
        for match in top_ref_re.finditer(config_text):
            field = match.group(1)
            if "manager" in field:
                reqs["needs_manager"] = True
            if "department" in field:
                reqs["needs_department"] = True
        
        # --- NOTIFICATION nodes ---
        if node_type == "notification":
            recipients = config.get("recipients") or []
            if not recipients:
                single = config.get("recipient")
                if single:
                    recipients = [single]
            
            for r in recipients:
                r_str = str(r).strip().lower()
                if r_str in ("requester", "submitter", "initiator", "self"):
                    reqs["needs_email"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "email",
                        "reason": f"Notification node '{node_name}' sends to '{r_str}' — requires user's email address",
                    })
                elif r_str in ("manager", "supervisor", "direct_manager"):
                    reqs["needs_manager"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "manager_email",
                        "reason": f"Notification node '{node_name}' sends to '{r_str}' — requires manager's email address",
                    })
        
        # --- APPROVAL nodes ---
        if node_type == "approval":
            assignee_source = (config.get("assignee_source") or "").lower()
            dir_type = (config.get("directory_assignee_type") or "").lower()
            
            if assignee_source == "user_directory":
                if dir_type in ("dynamic_manager", "manager"):
                    reqs["needs_manager"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "manager",
                        "reason": f"Approval node '{node_name}' routes to user's manager — requires manager assignment",
                    })
                elif "department" in dir_type:
                    reqs["needs_department"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "department",
                        "reason": f"Approval node '{node_name}' uses department-based routing — requires department assignment",
                    })
            
            # Check for dynamic expressions in assignee_ids
            assignee_ids = config.get("assignee_ids") or config.get("approvers") or []
            for aid in (assignee_ids if isinstance(assignee_ids, list) else [assignee_ids]):
                aid_str = str(aid or "")
                if "manager" in aid_str.lower():
                    reqs["needs_manager"] = True
                if "department" in aid_str.lower():
                    reqs["needs_department"] = True
        
        # --- CONDITION nodes ---
        if node_type == "condition":
            expression = str(config.get("expression") or config.get("condition") or "")
            if "_user_context" in expression or "manager" in expression.lower():
                for match in ctx_ref_re.finditer(expression):
                    reqs["referenced_identity_fields"].add(match.group(1))
                if "manager" in expression.lower():
                    reqs["needs_manager"] = True
                if "department" in expression.lower():
                    reqs["needs_department"] = True
        
        # --- AI_TASK nodes (scan prompt for identity references) ---
        if node_type == "ai_task":
            prompt = str(config.get("prompt") or config.get("system_prompt") or "")
            for match in ctx_ref_re.finditer(prompt):
                field = match.group(1)
                reqs["referenced_identity_fields"].add(field)
                if field == "email":
                    reqs["needs_email"] = True
                elif "manager" in field:
                    reqs["needs_manager"] = True
                elif "department" in field:
                    reqs["needs_department"] = True
        
        # --- START node: scan prefill fields ---
        if node_type in ("start", "form"):
            fields = config.get("fields") or []
            if isinstance(fields, list):
                for f in fields:
                    if not isinstance(f, dict):
                        continue
                    prefill = f.get("prefill") or ""
                    prefill_str = str(prefill).lower()
                    if "manager" in prefill_str:
                        reqs["needs_manager"] = True
                    if "email" in prefill_str and ("user" in prefill_str or "requester" in prefill_str):
                        reqs["needs_email"] = True
                    if "department" in prefill_str:
                        reqs["needs_department"] = True
                    # Check for custom field prefills
                    if prefill_str.startswith("_user_context."):
                        field_name = prefill_str.replace("_user_context.", "")
                        reqs["referenced_identity_fields"].add(field_name)
    
    # Convert set to list for JSON serialization
    reqs["referenced_identity_fields"] = sorted(reqs["referenced_identity_fields"])
    return reqs


def _check_requirements_against_data(
    requirements: Dict[str, Any],
    user_data: Dict[str, Any],
    identity_ctx: Dict[str, Any],
    user_dict: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Compare what the process NEEDS vs what the user's profile HAS.
    Returns a list of issues, each with severity, message, and fix action.
    """
    issues = []
    
    # Check: Is identity configured at all?
    if not user_data:
        issues.append({
            "severity": "error",
            "code": "NO_IDENTITY_DATA",
            "title": "No identity data found",
            "message": (
                "Your user profile could not be loaded from the Identity Directory. "
                "This process requires identity data to run correctly."
            ),
            "action": {
                "type": "open_settings",
                "label": "Set up Identity Directory",
                "target": "identity",
            },
        })
        # If no identity data at all, remaining checks don't apply
        return issues
    
    # Check: Email
    if requirements.get("needs_email"):
        email = user_data.get("email") or user_dict.get("email")
        if not email:
            reasons = [d["reason"] for d in requirements.get("details", []) if d.get("field") == "email"]
            issues.append({
                "severity": "error",
                "code": "MISSING_EMAIL",
                "title": "Your email address is missing",
                "message": (
                    "This process sends notifications to you (the requester), "
                    "but your profile has no email address."
                    + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                ),
                "action": {
                    "type": "open_profile",
                    "label": "Update your profile",
                    "target": "profile",
                    "field": "email",
                },
            })
    
    # Check: Manager
    if requirements.get("needs_manager"):
        has_manager = bool(user_data.get("manager_email") or user_data.get("manager_id"))
        manager_email = user_data.get("manager_email")
        manager_name = user_data.get("manager_name")
        
        if not has_manager:
            reasons = [d["reason"] for d in requirements.get("details", []) if "manager" in d.get("field", "")]
            issues.append({
                "severity": "error",
                "code": "NO_MANAGER_ASSIGNED",
                "title": "No manager assigned to your profile",
                "message": (
                    "This process requires manager approval or sends notifications to your manager, "
                    "but you don't have a manager assigned in the Identity Directory."
                    + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                ),
                "action": {
                    "type": "open_profile",
                    "label": "Assign a manager",
                    "target": "user_management",
                    "field": "manager",
                },
            })
        elif has_manager and not manager_email:
            # Manager is assigned but has no email — manager's profile is incomplete
            issues.append({
                "severity": "warning",
                "code": "MANAGER_NO_EMAIL",
                "title": f"Your manager{' (' + manager_name + ')' if manager_name else ''} has no email address",
                "message": (
                    "Your manager is assigned, but their profile doesn't have an email address. "
                    "Notifications sent to 'manager' will fail."
                ),
                "action": {
                    "type": "open_profile",
                    "label": f"Update manager's profile",
                    "target": "user_management",
                    "field": "manager_email",
                    "manager_id": user_data.get("manager_id"),
                },
            })
    
    # Check: Department
    if requirements.get("needs_department"):
        has_dept = bool(user_data.get("department_name") or user_data.get("department_id"))
        if not has_dept:
            caps = identity_ctx.get("capabilities", {})
            has_any_depts = caps.get("has_departments", False)
            reasons = [d["reason"] for d in requirements.get("details", []) if "department" in d.get("field", "")]
            
            if not has_any_depts:
                issues.append({
                    "severity": "error",
                    "code": "NO_DEPARTMENTS",
                    "title": "No departments configured",
                    "message": (
                        "This process uses department-based routing, "
                        "but no departments exist in the system."
                        + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                    ),
                    "action": {
                        "type": "open_settings",
                        "label": "Set up departments",
                        "target": "departments",
                    },
                })
            else:
                issues.append({
                    "severity": "error",
                    "code": "NO_DEPARTMENT_ASSIGNED",
                    "title": "You are not assigned to a department",
                    "message": (
                        "This process uses department-based routing, "
                        "but your profile has no department assigned."
                        + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                    ),
                    "action": {
                        "type": "open_profile",
                        "label": "Assign your department",
                        "target": "user_management",
                        "field": "department",
                    },
                })
    
    # Check: Referenced custom identity fields
    referenced = requirements.get("referenced_identity_fields", [])
    standard_fields = {
        "email", "name", "display_name", "first_name", "last_name", "phone",
        "job_title", "employee_id", "department_name", "department_id",
        "manager_id", "manager_name", "manager_email", "role_names",
        "group_names", "is_manager", "user_id", "roles", "groups",
        "direct_report_count", "identity_source",
    }
    for field in referenced:
        if field in standard_fields:
            # Check if this standard field has a value
            value = user_data.get(field)
            if not value and field not in ("is_manager", "direct_report_count"):
                issues.append({
                    "severity": "warning",
                    "code": "MISSING_PROFILE_FIELD",
                    "title": f"Profile field '{field}' is empty",
                    "message": (
                        f"The process references '{{{{ _user_context.{field} }}}}' "
                        f"but this field is empty in your profile."
                    ),
                    "action": {
                        "type": "open_profile",
                        "label": f"Fill in '{field}'",
                        "target": "profile",
                        "field": field,
                    },
                })
        else:
            # This is a custom field — check if it exists in user_data
            value = user_data.get(field)
            if value is None:
                issues.append({
                    "severity": "warning",
                    "code": "MISSING_CUSTOM_FIELD",
                    "title": f"Custom field '{field}' is not set",
                    "message": (
                        f"The process references a custom profile field '{field}' "
                        f"but it doesn't exist in your profile. This may need to be added "
                        f"via Settings > Identity Directory > Custom Fields."
                    ),
                    "action": {
                        "type": "open_profile",
                        "label": f"Add '{field}' to profile",
                        "target": "user_management",
                        "field": field,
                    },
                })
    
    # Check identity source warnings
    id_warnings = identity_ctx.get("warnings", [])
    for w in id_warnings:
        issues.append({
            "severity": "warning",
            "code": "IDENTITY_WARNING",
            "title": "Identity Directory warning",
            "message": w,
            "action": {
                "type": "open_settings",
                "label": "Review Identity Settings",
                "target": "identity",
            },
        })
    
    return issues


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
            detail=problem_details_rfc9457(403, ErrorCode.ACCESS_DENIED),
        )
    except ValueError as e:
        sanitized = sanitize_for_user(str(e))
        raise HTTPException(
            status_code=400,
            detail=problem_details_rfc9457(
                400, ErrorCode.VALIDATION_FAILED,
                detail_override=sanitized,
            ),
        )
    except Exception as e:
        import logging
        import traceback
        logging.getLogger(__name__).exception(
            "Process execution failed: %s", type(e).__name__
        )
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=problem_details_rfc9457(500, ErrorCode.EXECUTION_FAILED),
        )


@router.post("/execute-fast", response_model=ProcessExecutionResponse)
async def start_execution_fast(
    request: ProcessExecutionCreate,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Fast-start a new workflow run for the Chat Portal.
    Returns immediately with a reference/run ID, while the process continues in background.
    """
    user_dict = _user_to_dict(user)
    try:
        return await service.start_execution_fast(
            agent_id=request.agent_id,
            org_id=user_dict["org_id"],
            user_id=user_dict["id"],
            trigger_input=request.trigger_input,
            trigger_type="manual",
            conversation_id=request.conversation_id,
            correlation_id=request.correlation_id,
            user_info=user_dict
        )
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=problem_details_rfc9457(403, ErrorCode.ACCESS_DENIED),
        )
    except ValueError as e:
        sanitized = sanitize_for_user(str(e))
        raise HTTPException(
            status_code=400,
            detail=problem_details_rfc9457(
                400, ErrorCode.VALIDATION_FAILED,
                detail_override=sanitized,
            ),
        )
    except Exception as e:
        logging.getLogger(__name__).exception(
            "Process execution fast-start failed: %s", type(e).__name__
        )
        raise HTTPException(
            status_code=500,
            detail=problem_details_rfc9457(500, ErrorCode.EXECUTION_FAILED),
        )


@router.post("/enrich-form-fields", response_model=EnrichFormFieldsResponse)
async def enrich_form_fields(
    request: EnrichFormFieldsRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Get LLM-enriched form field labels for the process run form.
    Uses process context (name, goal) and raw fields to generate professional,
    business-friendly labels and placeholders.
    """
    process_definition = request.process_definition
    goal = request.goal or ''
    name = request.name or 'Workflow'
    if request.agent_id:
        from database.services import AgentService
        org_id = getattr(user, 'org_id', None) or 'org_default'
        agent_dict = AgentService.get_agent_by_id(request.agent_id, org_id)
        if agent_dict:
            process_definition = agent_dict.get('process_definition')
            goal = agent_dict.get('goal') or goal
            name = agent_dict.get('name') or name
    if process_definition is None and not request.agent_id:
        return EnrichFormFieldsResponse(fields=[])
    process_definition = service._ensure_dict(process_definition)
    raw_fields = service._extract_form_fields_from_definition(process_definition)
    if not raw_fields:
        return EnrichFormFieldsResponse(fields=[])
    enriched = await service.enrich_form_fields(name, goal, raw_fields)
    return EnrichFormFieldsResponse(
        fields=[EnrichedFormField(**f) for f in enriched]
    )


@router.post("/summarize", response_model=SummarizeProcessResponse)
async def summarize_process(
    request: SummarizeProcessRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Create a short, business-friendly summary for a workflow.
    Used by the Admin Portal "Play" modal to show what the workflow does
    without exposing the original generation prompt.
    """
    process_definition = request.process_definition
    goal = request.goal or ''
    name = request.name or 'Workflow'
    if request.agent_id:
        from database.services import AgentService
        org_id = getattr(user, 'org_id', None) or 'org_default'
        agent_dict = AgentService.get_agent_by_id(request.agent_id, org_id)
        if agent_dict:
            process_definition = agent_dict.get('process_definition')
            goal = agent_dict.get('goal') or goal
            name = agent_dict.get('name') or name
    if process_definition is None and not request.agent_id:
        return SummarizeProcessResponse(summary='')
    process_definition = service._ensure_dict(process_definition)
    summary = await service.summarize_process(name=name, goal=goal, process_definition=process_definition)
    return SummarizeProcessResponse(summary=summary or '')


@router.put("/agents/{agent_id}/schedule", response_model=UpdateProcessScheduleResponse)
async def update_process_schedule(
    agent_id: str,
    request: UpdateProcessScheduleRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Update a scheduled Process AI Agent's schedule.
    Designed for business admins (delegated) via the Chat Portal.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found")
    try:
        ok = service.update_agent_schedule(
            org_id=org_id,
            agent_id=agent_id,
            user_id=str(user_dict.get("id") or ""),
            user_info=user_dict,
            cron=request.cron,
            timezone=request.timezone,
            enabled=request.enabled,
            is_platform_admin=_is_platform_admin(user),
        )
        return UpdateProcessScheduleResponse(ok=bool(ok))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update schedule: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update schedule")


@router.get("/executions", response_model=ProcessExecutionListResponse)
async def list_executions(
    agent_id: Optional[str] = Query(None, description="Filter by workflow"),
    status: Optional[str] = Query(None, description="Filter by status"),
    scope: Optional[str] = Query(
        "auto",
        description="Visibility scope: mine (only your runs), org (all org runs, admins only), auto (admins=org, others=mine)",
    ),
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
        scope_norm = (scope or "auto").strip().lower()
        is_platform_admin = _is_platform_admin(user)
        created_by = None
        if scope_norm in ("mine", "my", "me"):
            created_by = user_dict["id"]
        elif scope_norm in ("org", "all"):
            created_by = None if is_platform_admin else user_dict["id"]
        else:
            # auto / unknown → admins see org, others see mine
            created_by = None if is_platform_admin else user_dict["id"]
        items, total = service.list_executions(
            org_id=user_dict["org_id"],
            agent_id=agent_id,
            status=status,
            created_by=created_by,
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
        execution = service.exec_service.get_execution(execution_id)
        if not execution or str(execution.org_id) != user_dict["org_id"]:
            raise ValueError("not found")
        is_platform_admin = _is_platform_admin(user)
        is_creator = str(getattr(execution, "created_by", "")) == user_dict["id"]
        if not is_creator and not is_platform_admin:
            raise HTTPException(
                status_code=403,
                detail=format_error_for_user(ErrorCode.PERMISSION_DENIED),
            )
        return service._to_response(execution)
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
    include_io: bool = Query(False, description="Include step input/output payloads (sanitized)"),
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

    # End-user privacy: only creator can view steps unless platform admin
    is_platform_admin = _is_platform_admin(user)
    is_creator = str(getattr(execution, "created_by", "")) == user_dict["id"]
    if not is_creator and not is_platform_admin:
        raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
    
    nodes = exec_service.get_node_executions(execution_id)

    def _sanitize_io(value: Any, _depth: int = 0) -> Any:
        if _depth >= 5:
            return "[truncated]"
        if value is None:
            return None
        if isinstance(value, (int, float, bool)):
            return value
        if isinstance(value, str):
            s = value
            if len(s) > 4000:
                return s[:4000] + "…"
            return s
        if isinstance(value, list):
            out = [_sanitize_io(v, _depth=_depth + 1) for v in value[:60]]
            if len(value) > 60:
                out.append("…")
            return out
        if isinstance(value, dict):
            # Special-case: uploaded file reference
            try:
                if value.get("kind") == "uploadedFile" and value.get("id"):
                    return {
                        "kind": "uploadedFile",
                        "id": value.get("id"),
                        "name": value.get("name"),
                        "content_type": value.get("content_type"),
                        "file_type": value.get("file_type"),
                        "size": value.get("size"),
                        "download_url": value.get("download_url"),
                    }
            except Exception:
                pass

            out = {}
            for k, v in list(value.items())[:80]:
                ks = str(k)
                kl = ks.lower()
                # Hide server filesystem paths and other internal fields
                if kl in ("path", "file_path", "filepath", "stored_path", "local_path"):
                    continue
                # Mask secrets/tokens
                if any(t in kl for t in ("token", "authorization", "api_key", "apikey", "secret", "password")):
                    out[ks] = "***MASKED***"
                    continue
                out[ks] = _sanitize_io(v, _depth=_depth + 1)
            if len(value) > 80:
                out["…"] = f"+{len(value) - 80} more"
            return out
        # Fallback: stringify
        try:
            return str(value)
        except Exception:
            return None
    
    return {
        "steps": [
            {
                "id": str(n.id),
                "node_id": n.node_id,
                "node_type": n.node_type,
                "step_name": n.node_name or get_node_type_display(n.node_type),
                "step_type": get_node_type_display(n.node_type),
                "order": n.execution_order,
                "status": get_status_info(n.status),
                "branch_taken": n.branch_taken,
                "error": sanitize_for_user(n.error_message) if n.error_message else None,
                "error_detail": (n.output_data or {}).get("error_detail") if isinstance(n.output_data, dict) else None,
                **({
                    "input": _sanitize_io(n.input_data),
                    "output": _sanitize_io(n.output_data),
                } if include_io else {}),
                "started_at": n.started_at.isoformat() if n.started_at else None,
                "completed_at": n.completed_at.isoformat() if n.completed_at else None,
                "duration_seconds": round(n.duration_ms / 1000, 2) if n.duration_ms else None
            }
            for n in nodes
        ],
        "total": len(nodes)
    }


@router.get("/executions/{execution_id}/pending-approvals", response_model=PendingApprovalDisplayResponse)
async def get_execution_pending_approvals(
    execution_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Request tracking helper: show who the request is waiting with (name/email + routing meaning).
    """
    user_dict = _user_to_dict(user)
    items = service.get_execution_pending_approvals_display(
        execution_id=execution_id,
        org_id=user_dict["org_id"],
        requester_user_id=user_dict["id"],
        is_platform_admin=_is_platform_admin(user),
    )
    return PendingApprovalDisplayResponse(items=items)


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
    For assignees (user/role/group): only their approvals.
    For platform admin/superadmin: all pending approvals in the org (for testing processes run from the platform).
    """
    user_dict = _user_to_dict(user)
    is_platform_admin = (
        security_state.check_permission(user, Permission.SYSTEM_ADMIN.value) or
        security_state.check_permission(user, Permission.USERS_VIEW.value) or
        security_state.check_permission(user, Permission.USERS_EDIT.value)
    )
    approvals = service.get_pending_approvals(
        user_id=user_dict["id"],
        org_id=user_dict["org_id"],
        user_role_ids=user_dict.get("role_ids", []),
        user_group_ids=user_dict.get("group_ids", []),
        user_email=user_dict.get("email"),
        include_all_for_org_admin=is_platform_admin
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

    # Only assignees (or platform admins) can view the approval details
    is_platform_admin = _is_platform_admin(user)
    if not is_platform_admin and not _is_approval_visible_to_user(approval, user_dict):
        raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
    
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
        # Ensure user is allowed to decide this approval (assignee or platform admin)
        user_dict = _user_to_dict(user)
        approval = service.exec_service.get_approval_request(approval_id)
        if not approval or str(getattr(approval, "org_id", "")) != user_dict["org_id"]:
            raise HTTPException(status_code=404, detail=format_error_for_user(ErrorCode.APPROVAL_NOT_FOUND))
        is_platform_admin = _is_platform_admin(user)
        if not is_platform_admin and not _is_approval_visible_to_user(approval, user_dict):
            raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
        return await service.handle_approval_decision(
            approval_id=approval_id,
            user_id=user_dict["id"],
            decision=request.decision,
            comments=request.comments,
            decision_data=request.decision_data,
            user_info=user_dict
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


@router.get("/available-models")
async def get_available_models(
    user: User = Depends(require_auth)
):
    """
    Return all configured and active AI models for use in AI Step dropdowns.
    """
    try:
        registry = LLMRegistry()
        models = registry.list_all(active_only=True)
        result = []
        for m in models:
            result.append({
                "id": m.model_id or m.id,
                "name": m.display_name,
                "provider": m.provider,
                "recommended": "gpt-4o" in (m.model_id or m.id).lower()
            })
        # If no models registered, return sensible defaults
        if not result:
            result = [
                {"id": "gpt-4o", "name": "GPT-4o (Recommended)", "provider": "openai", "recommended": True},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Faster)", "provider": "openai", "recommended": False},
                {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet", "provider": "anthropic", "recommended": False}
            ]
        return {"models": result}
    except Exception as e:
        # Fallback defaults if registry fails
        return {"models": [
            {"id": "gpt-4o", "name": "GPT-4o (Recommended)", "provider": "openai", "recommended": True},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Faster)", "provider": "openai", "recommended": False},
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet", "provider": "anthropic", "recommended": False}
        ]}


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
    goal = (request.get('goal') or '').strip()
    output_format = request.get('output_format') or request.get('format') or 'visual_builder'
    context = request.get('context') or {}
    if not isinstance(context, dict):
        context = {}
    
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
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
    # Discover available user attributes + identity configuration for this org
    # This lets the AI know exactly what fields can be auto-filled AND
    # whether identity features (manager, department, custom fields) are actually available
    try:
        from core.identity.service import UserDirectoryService
        _dir_svc = UserDirectoryService()
        available_attrs = _dir_svc.discover_available_attributes(user_dict["org_id"])
        context["available_user_attributes"] = available_attrs
        # Identity context: tells the AI WHAT identity source is configured,
        # whether managers/departments exist, and any warnings
        identity_ctx = _dir_svc.discover_identity_context(user_dict["org_id"])
        context["identity_context"] = identity_ctx
    except Exception as e:
        print(f"⚠️  [Wizard] Failed to discover user attributes/identity: {e}")
    
    # Discover published processes so the AI can suggest call_process nodes
    try:
        from database.services.agent_service import AgentService
        all_agents = AgentService.get_all_agents(org_id=user_dict["org_id"])
        published_processes = []
        for ag in all_agents:
            if (
                ag.get("agent_type") == "process"
                and ag.get("status") == "published"
            ):
                # Extract input fields from the process definition's start node
                input_fields = []
                proc_def = ag.get("process_definition")
                if proc_def and isinstance(proc_def, dict):
                    nodes = proc_def.get("nodes") or []
                    for nd in nodes:
                        if nd.get("type") in ("trigger", "start"):
                            cfg = nd.get("config") or {}
                            for fld in (cfg.get("fields") or []):
                                input_fields.append({
                                    "name": fld.get("name"),
                                    "label": fld.get("label"),
                                    "type": fld.get("type", "text"),
                                    "required": fld.get("required", False),
                                })
                            break
                published_processes.append({
                    "id": ag.get("id"),
                    "name": ag.get("name"),
                    "description": ag.get("goal") or ag.get("description") or "",
                    "input_fields": input_fields,
                })
        context["published_processes"] = published_processes
    except Exception as e:
        print(f"⚠️  [Wizard] Failed to discover published processes: {e}")
    
    # Generate process
    wizard = ProcessWizard(llm=llm, org_settings=org_settings)
    
    try:
        process_def = await wizard.generate_from_goal(
            goal=goal,
            additional_context=context,
            output_format=output_format
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
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
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


# =============================================================================
# BUSINESS SUMMARY — LLM-powered test report translation
# =============================================================================

@router.post("/executions/{execution_id}/business-summary")
async def generate_business_summary(
    execution_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Generate a business-friendly summary of a process execution using LLM.
    
    Takes the technical execution steps and asks the LLM to translate them
    into clear, business-friendly language that non-technical users can understand.
    """
    from database.services.process_execution_service import ProcessExecutionService
    from core.process.messages import get_node_type_display, get_status_info
    
    user_dict = _user_to_dict(user)
    exec_service = ProcessExecutionService(db)
    
    # Fetch execution
    execution = exec_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Fetch steps with I/O
    nodes = exec_service.get_node_executions(execution_id)
    
    # Resolve process/agent name
    process_name = "Workflow"
    try:
        from database.models.agent import Agent
        agent = db.query(Agent).filter(Agent.id == execution.agent_id).first()
        if agent:
            process_name = agent.name or "Workflow"
    except Exception:
        pass
    
    # Build a compact representation of steps for the LLM
    steps_for_llm = []
    for n in nodes:
        step = {
            "step_name": n.node_name or get_node_type_display(n.node_type),
            "step_type": n.node_type,
            "status": n.status,
            "error": n.error_message if n.error_message else None,
        }
        # Include business-friendly error info if available
        if n.output_data and isinstance(n.output_data, dict):
            ed = n.output_data.get("error_detail")
            if ed and isinstance(ed, dict):
                if ed.get("business_message"):
                    step["business_error"] = ed["business_message"]
                if ed.get("is_user_fixable") is not None:
                    step["is_user_fixable"] = ed["is_user_fixable"]
        # Include key output data (compact)
        if n.output_data:
            out = n.output_data if isinstance(n.output_data, dict) else {}
            # Include relevant output fields but keep it small
            compact_out = {}
            for k in ("output", "data", "branch", "condition_result", "status"):
                if k in out:
                    v = out[k]
                    # Truncate long strings
                    if isinstance(v, str) and len(v) > 300:
                        v = v[:300] + "..."
                    compact_out[k] = v
            if out.get("variables_update"):
                compact_out["variables_update"] = out["variables_update"]
            if compact_out:
                step["output"] = compact_out
        # Include key input config (node name/type context)
        if n.input_data and isinstance(n.input_data, dict):
            cfg = n.input_data.get("config") or {}
            if n.node_type == "condition":
                step["condition"] = {
                    "field": cfg.get("field", ""),
                    "operator": cfg.get("operator", ""),
                    "value": cfg.get("value", ""),
                }
                resolved = n.input_data.get("resolved") or {}
                if resolved.get("expression"):
                    step["condition"]["resolved_expression"] = resolved["expression"]
            elif n.node_type == "notification":
                step["notification"] = {
                    "channel": cfg.get("channel", "email"),
                    "recipient": cfg.get("recipient", ""),
                    "message_preview": (cfg.get("message") or "")[:200],
                }
            elif n.node_type == "approval":
                step["approval_title"] = cfg.get("title") or cfg.get("message") or ""
        if n.branch_taken:
            step["branch_taken"] = n.branch_taken
        steps_for_llm.append(step)
    
    # Build trigger input summary
    trigger_input = {}
    identity_warnings_for_llm = []
    raw_input = execution.trigger_input if execution.trigger_input else {}
    if isinstance(raw_input, dict):
        for k, v in raw_input.items():
            if k == "_identity_warnings":
                identity_warnings_for_llm = v if isinstance(v, list) else []
                continue
            if k.startswith("_"):
                continue  # skip internal fields
            if isinstance(v, dict) and v.get("kind") == "uploadedFile":
                trigger_input[k] = f"[File: {v.get('name', 'uploaded file')}]"
            elif isinstance(v, str) and len(v) > 200:
                trigger_input[k] = v[:200] + "..."
            else:
                trigger_input[k] = v
    
    # Get LLM
    llm = None
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
    if not llm:
        return {
            "success": False,
            "error": "No LLM available to generate summary",
            "fallback": "technical"
        }
    
    import json as _json
    
    system_prompt = """You are a business process analyst. Your job is to explain what happened during a workflow execution in clear, simple business language.

Rules:
- Write for a non-technical business user (manager, HR, finance, etc.)
- Use plain English, no code, no JSON, no variable names
- Explain what happened at each step in 1-2 sentences
- If something failed, explain what went wrong and what it means for the business
- Use bullet points for the step-by-step summary
- Start with a one-line overall outcome (success/failure and what it means)
- Include any key data points (amounts, names, dates, decisions)
- If a condition was evaluated, explain the business rule in plain language
- For approvals, explain who approved/rejected and why it matters
- For notifications, mention who was notified and about what
- Keep the total summary concise (under 300 words)

ERROR CLASSIFICATION (IMPORTANT — when steps fail):
- If a step failed, classify the error into one of these categories:
  a) CONFIGURATION ISSUE — the user can fix it (e.g., missing field, wrong setting, empty recipient).
     Tell the user exactly what to check or change.
  b) TECHNICAL ISSUE — requires IT support (e.g., service unavailable, code error, unexpected exception).
     Tell the user: "This is a technical issue. Please share the Technical view with your IT team."
  c) DATA ISSUE — the input data was incomplete or invalid (e.g., blurry image, empty file, missing info).
     Tell the user what to fix in their submission.
- NEVER use generic phrases like "something went wrong" — always explain the specific problem.
- NEVER fabricate error explanations — only describe what actually happened based on the step data.

Response format (plain text, NOT JSON):
OUTCOME: <one-line business outcome>

SUMMARY:
• <step 1 explanation>
• <step 2 explanation>
...

KEY DETAILS:
- <any important data points, amounts, decisions>
"""
    
    _id_warnings_text = ""
    if identity_warnings_for_llm:
        _id_warnings_text = (
            "\n\nIdentity warnings (these affected the workflow):\n"
            + "\n".join(f"- {w}" for w in identity_warnings_for_llm)
        )
    
    user_prompt = f"""Here is a workflow execution result. Please explain what happened in business-friendly language.

Workflow: {process_name}
Status: {execution.status}
{f'Error: {execution.error_message}' if execution.error_message else ''}{_id_warnings_text}

Submitted information:
{_json.dumps(trigger_input, indent=2, default=str)}

Steps executed:
{_json.dumps(steps_for_llm, indent=2, default=str)}
"""
    
    try:
        from core.llm.base import Message, MessageRole
        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=user_prompt),
        ]
    except ImportError:
        try:
            from core.llm.models import Message, MessageRole
            messages = [
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=user_prompt),
            ]
        except ImportError:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
    
    try:
        response = await llm.chat(messages=messages, temperature=0.3, max_tokens=1500)
        content = getattr(response, "content", None) or str(response)
        
        return {
            "success": True,
            "summary": content,
            "execution_status": execution.status,
            "process_name": process_name
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate summary: {str(e)}",
            "fallback": "technical"
        }
