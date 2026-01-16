"""
Access Control API Router
RESTful endpoints for 3-level access control

This router is designed to be extracted to a microservice later.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from uuid import UUID

from .service import AccessControlService
from .schemas import (
    AccessType, AccessEntity, EntityType,
    AgentAccessCreate, AgentAccessUpdate, AgentAccessResponse,
    TaskAccessConfig, TaskAccessUpdate, TaskPermission,
    ToolAccessConfig, ToolAccessUpdate, ToolPermission,
    FullAccessConfig, AccessCheckResult, UserAccessPreview,
    QuickTemplate
)

router = APIRouter(prefix="/api/access-control", tags=["Access Control"])


# ============================================================================
# LEVEL 1: AGENT ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/access", response_model=AgentAccessResponse)
async def get_agent_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID")
):
    """
    Get who can access this agent.
    
    Level 1 of 3-level access control.
    """
    try:
        return AccessControlService.get_agent_access(agent_id, org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/access", response_model=AgentAccessResponse)
async def update_agent_access(
    agent_id: str,
    data: AgentAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    user_id: str = Query(..., description="User making the update")
):
    """
    Update who can access this agent.
    
    - PUBLIC: Anyone can access (no login required)
    - AUTHENTICATED: Any logged-in user can access
    - SPECIFIC: Only specified users/groups/roles can access
    """
    try:
        entities = data.entities or []
        
        # Handle add/remove operations
        if data.add_entities:
            current = AccessControlService.get_agent_access(agent_id, org_id)
            entities = current.entities + data.add_entities
        
        if data.remove_entity_ids:
            current = AccessControlService.get_agent_access(agent_id, org_id)
            entities = [e for e in current.entities if e.id not in data.remove_entity_ids]
        
        access_type = data.access_type
        if access_type is None:
            current = AccessControlService.get_agent_access(agent_id, org_id)
            access_type = current.access_type
        
        return AccessControlService.update_agent_access(
            agent_id=agent_id,
            org_id=org_id,
            access_type=access_type,
            entities=entities,
            updated_by=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEVEL 2: TASK ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/tasks", response_model=TaskAccessConfig)
async def get_task_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID")
):
    """
    Get which tasks users can use with this agent.
    
    Level 2 of 3-level access control.
    """
    try:
        return AccessControlService.get_task_access(agent_id, org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/tasks", response_model=TaskAccessConfig)
async def update_task_access(
    agent_id: str,
    data: TaskAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    user_id: str = Query(..., description="User making the update")
):
    """
    Update which tasks users can use with this agent.
    
    - allow_all_by_default: If true, all tasks are allowed unless denied
    - task_permissions: Per-task access configuration
    """
    try:
        current = AccessControlService.get_task_access(agent_id, org_id)
        
        return AccessControlService.update_task_access(
            agent_id=agent_id,
            org_id=org_id,
            task_permissions=data.task_permissions or current.task_permissions,
            allow_all_by_default=data.allow_all_by_default if data.allow_all_by_default is not None else current.allow_all_by_default,
            updated_by=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEVEL 3: TOOL ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/tools", response_model=ToolAccessConfig)
async def get_tool_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID")
):
    """
    Get which tools the agent can use for different users.
    
    Level 3 of 3-level access control.
    """
    try:
        return AccessControlService.get_tool_access(agent_id, org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/tools", response_model=ToolAccessConfig)
async def update_tool_access(
    agent_id: str,
    data: ToolAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    user_id: str = Query(..., description="User making the update")
):
    """
    Update which tools the agent can use for different users.
    
    - allow_all_by_default: If true, all tools are allowed unless denied
    - tool_permissions: Per-tool access configuration
    """
    try:
        current = AccessControlService.get_tool_access(agent_id, org_id)
        
        return AccessControlService.update_tool_access(
            agent_id=agent_id,
            org_id=org_id,
            tool_permissions=data.tool_permissions or current.tool_permissions,
            allow_all_by_default=data.allow_all_by_default if data.allow_all_by_default is not None else current.allow_all_by_default,
            updated_by=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FULL CONFIG (for UI)
# ============================================================================

@router.get("/agents/{agent_id}/full", response_model=FullAccessConfig)
async def get_full_access_config(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID")
):
    """
    Get complete access configuration (all 3 levels) for an agent.
    
    Useful for the Access Control UI tab.
    """
    try:
        return AccessControlService.get_full_access_config(agent_id, org_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ACCESS CHECKS (for End User Portal)
# ============================================================================

@router.get("/check/{agent_id}", response_model=AccessCheckResult)
async def check_access(
    agent_id: str,
    user_id: str = Query(..., description="User ID to check"),
    org_id: str = Query(..., description="Organization ID"),
    role_ids: Optional[str] = Query(None, description="Comma-separated role IDs"),
    group_ids: Optional[str] = Query(None, description="Comma-separated group IDs")
):
    """
    Check what a user can do with an agent.
    
    Called from End User Portal to determine:
    - Can user access the agent?
    - Which tasks are allowed?
    - Which tools can be used?
    """
    try:
        user_role_ids = role_ids.split(",") if role_ids else []
        user_group_ids = group_ids.split(",") if group_ids else []
        
        return AccessControlService.check_user_access(
            user_id=user_id,
            user_role_ids=user_role_ids,
            user_group_ids=user_group_ids,
            agent_id=agent_id,
            org_id=org_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{agent_id}", response_model=UserAccessPreview)
async def preview_user_access(
    agent_id: str,
    preview_user_id: str = Query(..., description="User ID to preview"),
    org_id: str = Query(..., description="Organization ID")
):
    """
    Preview what a specific user would see/do with an agent.
    
    Used in the Access Control UI for "Preview as User" feature.
    """
    try:
        return AccessControlService.preview_user_access(
            agent_id=agent_id,
            org_id=org_id,
            preview_user_id=preview_user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# TEMPLATES
# ============================================================================

@router.get("/templates", response_model=List[QuickTemplate])
async def get_templates():
    """
    Get available access control templates.
    """
    return [
        QuickTemplate(
            id="read_only",
            name="Read Only",
            description="View only, no actions allowed",
            icon="🔒",
            access_type=AccessType.AUTHENTICATED,
            allow_all_tasks=False,
            allow_all_tools=False,
            denied_task_ids=[],
            denied_tool_ids=[]
        ),
        QuickTemplate(
            id="standard",
            name="Standard",
            description="All tasks, safe tools only",
            icon="📖",
            access_type=AccessType.AUTHENTICATED,
            allow_all_tasks=True,
            allow_all_tools=True,
            denied_task_ids=[],
            denied_tool_ids=[]
        ),
        QuickTemplate(
            id="full_access",
            name="Full Access",
            description="Everything allowed",
            icon="⚡",
            access_type=AccessType.AUTHENTICATED,
            allow_all_tasks=True,
            allow_all_tools=True,
            denied_task_ids=[],
            denied_tool_ids=[]
        )
    ]


@router.post("/agents/{agent_id}/apply-template")
async def apply_template(
    agent_id: str,
    template_id: str = Query(..., description="Template ID to apply"),
    org_id: str = Query(..., description="Organization ID"),
    user_id: str = Query(..., description="User making the update")
):
    """
    Apply a pre-configured template to an agent.
    """
    templates = {
        "read_only": {
            "access_type": AccessType.AUTHENTICATED,
            "allow_all_tasks": False,
            "allow_all_tools": False
        },
        "standard": {
            "access_type": AccessType.AUTHENTICATED,
            "allow_all_tasks": True,
            "allow_all_tools": True
        },
        "full_access": {
            "access_type": AccessType.AUTHENTICATED,
            "allow_all_tasks": True,
            "allow_all_tools": True
        }
    }
    
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = templates[template_id]
    
    # Apply template
    AccessControlService.update_agent_access(
        agent_id=agent_id,
        org_id=org_id,
        access_type=template["access_type"],
        entities=[],
        updated_by=user_id
    )
    
    return {
        "status": "success",
        "message": f"Template '{template_id}' applied successfully"
    }

