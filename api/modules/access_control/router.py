"""
Access Control API Router
RESTful endpoints for 3-level access control

This router is designed to be extracted to a microservice later.
SECURITY: All modification endpoints require admin privileges.
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

# Import authentication dependencies
from api.security import get_current_user, require_admin
from core.security.models import User

router = APIRouter(prefix="/api/access-control", tags=["Access Control"])


# ============================================================================
# AUTHORIZATION HELPER
# ============================================================================

def check_agent_management_permission(user: User, agent_id: str, org_id: str):
    """
    Check if user has permission to manage agent access control.
    
    Allowed (in order of priority):
    1. Agent owner/creator - ALWAYS has access to their own agent
    2. Agent admins - Users granted admin access by the owner
    3. Platform super admins - Can manage all agents
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check organization
    if user.org_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied - wrong organization")
    
    # Import database session and models
    from database.base import get_session
    from database.models.agent import Agent
    from database.models.agent_access import AgentAccessPolicy
    
    with get_session() as session:
        # Get the agent
        agent = session.query(Agent).filter(
            Agent.id == agent_id,
            Agent.org_id == org_id
        ).first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # 1. Check if user is the OWNER of this agent
        if str(agent.owner_id) == user.id or str(agent.created_by) == user.id:
            print(f"✅ User {user.id[:8]}... is the OWNER of agent {agent_id[:8]}...")
            return  # Owner has full access
        
        # 2. Check if user is an AGENT ADMIN (granted by owner)
        # Look for a special "admin" access policy for this user
        admin_policy = session.query(AgentAccessPolicy).filter(
            AgentAccessPolicy.agent_id == agent_id,
            AgentAccessPolicy.org_id == org_id,
            AgentAccessPolicy.access_type == 'agent_admin',
            AgentAccessPolicy.is_active == True
        ).first()
        
        if admin_policy:
            user_in_admins = user.id in (admin_policy.user_ids or [])
            role_in_admins = any(r in (admin_policy.role_ids or []) for r in (user.role_ids or []))
            group_in_admins = any(g in (admin_policy.group_ids or []) for g in (user.group_ids or []))
            
            if user_in_admins or role_in_admins or group_in_admins:
                print(f"✅ User {user.id[:8]}... is an AGENT ADMIN for agent {agent_id[:8]}...")
                return  # Agent admin has access
        
        # 3. Check if user is a PLATFORM SUPER ADMIN
        from core.security.state import security_state
        user_permissions = security_state.get_user_permissions(user)
        
        # Only super admin / platform admin can manage OTHER people's agents
        is_super_admin = 'admin' in user_permissions or 'super_admin' in user_permissions
        
        # Check if user has super admin role
        for role_id in (user.role_ids or []):
            role = security_state.roles.get(role_id)
            if role and ('super' in role.name.lower()):
                is_super_admin = True
                break
        
        if is_super_admin:
            print(f"✅ User {user.id[:8]}... is a SUPER ADMIN")
            return  # Super admin has access
        
        # User doesn't have permission
        raise HTTPException(
            status_code=403, 
            detail="Access denied - only the agent owner or delegated admins can manage this agent's access control"
        )


def is_agent_owner(user: User, agent_id: str, org_id: str) -> bool:
    """Check if user is the owner of an agent"""
    from database.base import get_session
    from database.models.agent import Agent
    
    with get_session() as session:
        agent = session.query(Agent).filter(
            Agent.id == agent_id,
            Agent.org_id == org_id
        ).first()
        
        if not agent:
            return False
        
        return str(agent.owner_id) == user.id or str(agent.created_by) == user.id


# ============================================================================
# LEVEL 1: AGENT ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/access", response_model=AgentAccessResponse)
async def get_agent_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get who can access this agent.
    
    Level 1 of 3-level access control.
    Requires authentication. Only admins can see detailed config.
    """
    try:
        # Verify user belongs to this org
        if current_user.org_id != org_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Only admins can see full access configuration
        check_agent_management_permission(current_user, agent_id, org_id)
        
        return AccessControlService.get_agent_access(agent_id, org_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/access", response_model=AgentAccessResponse)
async def update_agent_access(
    agent_id: str,
    data: AgentAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Update who can access this agent.
    
    - PUBLIC: Anyone can access (no login required)
    - AUTHENTICATED: Any logged-in user can access
    - SPECIFIC: Only specified users/groups/roles can access
    
    REQUIRES: Admin privileges or 'manage_agents' permission
    """
    try:
        # SECURITY: Check admin permission
        check_agent_management_permission(current_user, agent_id, org_id)
        
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
            updated_by=current_user.id  # Use authenticated user ID
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEVEL 2: TASK ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/tasks", response_model=TaskAccessConfig)
async def get_task_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get which tasks users can use with this agent.
    
    Level 2 of 3-level access control.
    Requires admin privileges.
    """
    try:
        # SECURITY: Check admin permission
        check_agent_management_permission(current_user, agent_id, org_id)
        
        return AccessControlService.get_task_access(agent_id, org_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/tasks", response_model=TaskAccessConfig)
async def update_task_access(
    agent_id: str,
    data: TaskAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Update which tasks users can use with this agent.
    
    - allow_all_by_default: If true, all tasks are allowed unless denied
    - task_permissions: Per-task access configuration
    
    REQUIRES: Admin privileges or 'manage_agents' permission
    """
    try:
        # SECURITY: Check admin permission
        check_agent_management_permission(current_user, agent_id, org_id)
        
        current = AccessControlService.get_task_access(agent_id, org_id)
        
        return AccessControlService.update_task_access(
            agent_id=agent_id,
            org_id=org_id,
            task_permissions=data.task_permissions or current.task_permissions,
            allow_all_by_default=data.allow_all_by_default if data.allow_all_by_default is not None else current.allow_all_by_default,
            updated_by=current_user.id  # Use authenticated user ID
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEVEL 3: TOOL ACCESS
# ============================================================================

@router.get("/agents/{agent_id}/tools", response_model=ToolAccessConfig)
async def get_tool_access(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get which tools the agent can use for different users.
    
    Level 3 of 3-level access control.
    Requires admin privileges.
    """
    try:
        # SECURITY: Check admin permission
        check_agent_management_permission(current_user, agent_id, org_id)
        
        return AccessControlService.get_tool_access(agent_id, org_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}/tools", response_model=ToolAccessConfig)
async def update_tool_access(
    agent_id: str,
    data: ToolAccessUpdate,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Update which tools the agent can use for different users.
    
    - allow_all_by_default: If true, all tools are allowed unless denied
    - tool_permissions: Per-tool access configuration
    
    REQUIRES: Admin privileges or 'manage_agents' permission
    """
    try:
        # SECURITY: Check admin permission
        check_agent_management_permission(current_user, agent_id, org_id)
        
        current = AccessControlService.get_tool_access(agent_id, org_id)
        
        return AccessControlService.update_tool_access(
            agent_id=agent_id,
            org_id=org_id,
            tool_permissions=data.tool_permissions or current.tool_permissions,
            allow_all_by_default=data.allow_all_by_default if data.allow_all_by_default is not None else current.allow_all_by_default,
            updated_by=current_user.id  # Use authenticated user ID
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FULL CONFIG (for UI - ADMIN ONLY)
# ============================================================================

@router.get("/agents/{agent_id}/full", response_model=FullAccessConfig)
async def get_full_access_config(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete access configuration (all 3 levels) for an agent.
    
    Useful for the Access Control UI tab.
    REQUIRES: Admin privileges - this exposes all access policies.
    """
    try:
        # SECURITY: Only admins can see full access configuration
        check_agent_management_permission(current_user, agent_id, org_id)
        
        return AccessControlService.get_full_access_config(agent_id, org_id)
    except HTTPException:
        raise
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
    current_user: User = Depends(get_current_user)
):
    """
    Apply a pre-configured template to an agent.
    
    REQUIRES: Admin privileges or 'manage_agents' permission
    """
    # SECURITY: Check admin permission
    check_agent_management_permission(current_user, agent_id, org_id)
    
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
        updated_by=current_user.id  # Use authenticated user ID
    )
    
    return {
        "status": "success",
        "message": f"Template '{template_id}' applied successfully"
    }


# ============================================================================
# AGENT ADMINS (Owner can delegate admin access)
# ============================================================================

from pydantic import BaseModel as PydanticBaseModel

class AgentAdminUpdate(PydanticBaseModel):
    """Update agent admins request"""
    add_user_ids: Optional[List[str]] = None
    remove_user_ids: Optional[List[str]] = None
    add_group_ids: Optional[List[str]] = None
    remove_group_ids: Optional[List[str]] = None

@router.get("/agents/{agent_id}/admins")
async def get_agent_admins(
    agent_id: str,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users/groups who have admin access to this agent.
    
    REQUIRES: Agent owner or existing agent admin
    """
    # Check if user can manage this agent
    check_agent_management_permission(current_user, agent_id, org_id)
    
    from database.base import get_session
    from database.models.agent import Agent
    from database.models.agent_access import AgentAccessPolicy
    
    with get_session() as session:
        agent = session.query(Agent).filter(
            Agent.id == agent_id,
            Agent.org_id == org_id
        ).first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # Get the admin policy
        admin_policy = session.query(AgentAccessPolicy).filter(
            AgentAccessPolicy.agent_id == agent_id,
            AgentAccessPolicy.org_id == org_id,
            AgentAccessPolicy.access_type == 'agent_admin'
        ).first()
        
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        
        return {
            "agent_id": agent_id,
            "owner_id": owner_id,
            "admin_user_ids": admin_policy.user_ids if admin_policy else [],
            "admin_group_ids": admin_policy.group_ids if admin_policy else [],
            "is_owner": owner_id == current_user.id
        }


@router.put("/agents/{agent_id}/admins")
async def update_agent_admins(
    agent_id: str,
    data: AgentAdminUpdate,
    org_id: str = Query(..., description="Organization ID"),
    current_user: User = Depends(get_current_user)
):
    """
    Add or remove agent admins.
    
    REQUIRES: Agent OWNER only (not just admins - only owner can delegate admin access)
    """
    from database.base import get_session
    from database.models.agent import Agent
    from database.models.agent_access import AgentAccessPolicy
    from datetime import datetime
    
    with get_session() as session:
        agent = session.query(Agent).filter(
            Agent.id == agent_id,
            Agent.org_id == org_id
        ).first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        # ONLY the owner can delegate admin access
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        if owner_id != current_user.id:
            # Check if super admin
            from core.security.state import security_state
            user_permissions = security_state.get_user_permissions(current_user)
            if 'super_admin' not in user_permissions and 'admin' not in user_permissions:
                raise HTTPException(
                    status_code=403, 
                    detail="Only the agent owner can manage admin delegation"
                )
        
        # Find or create admin policy
        admin_policy = session.query(AgentAccessPolicy).filter(
            AgentAccessPolicy.agent_id == agent_id,
            AgentAccessPolicy.org_id == org_id,
            AgentAccessPolicy.access_type == 'agent_admin'
        ).first()
        
        if not admin_policy:
            admin_policy = AgentAccessPolicy(
                agent_id=agent_id,
                org_id=org_id,
                name="Agent Admins",
                description="Users who can manage this agent's access control",
                access_type='agent_admin',
                user_ids=[],
                group_ids=[],
                role_ids=[],
                created_by=current_user.id
            )
            session.add(admin_policy)
        
        # Update user_ids
        current_users = admin_policy.user_ids or []
        if data.add_user_ids:
            for uid in data.add_user_ids:
                if uid not in current_users:
                    current_users.append(uid)
        if data.remove_user_ids:
            current_users = [u for u in current_users if u not in data.remove_user_ids]
        admin_policy.user_ids = current_users
        
        # Update group_ids
        current_groups = admin_policy.group_ids or []
        if data.add_group_ids:
            for gid in data.add_group_ids:
                if gid not in current_groups:
                    current_groups.append(gid)
        if data.remove_group_ids:
            current_groups = [g for g in current_groups if g not in data.remove_group_ids]
        admin_policy.group_ids = current_groups
        
        admin_policy.updated_at = datetime.utcnow()
        admin_policy.is_active = True
        
        session.commit()
        
        print(f"✅ Updated agent admins for {agent_id[:8]}...: users={current_users}, groups={current_groups}")
        
        return {
            "status": "success",
            "admin_user_ids": current_users,
            "admin_group_ids": current_groups
        }

