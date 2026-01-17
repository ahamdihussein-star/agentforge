"""
Access Control Service
Business logic for 3-level access control

This service can be extracted to a microservice later.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
import re

from database.base import get_session
from database.models.agent_access import AgentAccessPolicy, AgentActionPolicy
from database.models.agent import Agent
from .schemas import (
    AccessType, EntityType, AccessEntity,
    AgentAccessResponse, TaskAccessConfig, ToolAccessConfig,
    TaskPermission, ToolPermission, AccessCheckResult,
    FullAccessConfig, UserAccessPreview
)


# Default org UUID for "org_default" fallback
DEFAULT_ORG_UUID = "2c969bf1-16d3-43d3-95da-66965c3fa132"

# UUID regex pattern
UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)


def normalize_org_id(org_id: str) -> str:
    """
    Normalize org_id to a valid UUID.
    Converts "org_default" or invalid UUIDs to the default org UUID.
    """
    if not org_id or org_id == "org_default" or not UUID_PATTERN.match(org_id):
        return DEFAULT_ORG_UUID
    return org_id


def is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID"""
    return bool(value and UUID_PATTERN.match(value))


class AccessControlService:
    """
    Service for managing agent access control policies.
    Implements 3-level access control:
    1. Agent Access - Who can use the agent
    2. Task Access - Which tasks users can use
    3. Tool Access - Which tools the agent can use for users
    """
    
    # ========================================================================
    # LEVEL 1: AGENT ACCESS
    # ========================================================================
    
    @staticmethod
    def get_agent_access(agent_id: str, org_id: str) -> AgentAccessResponse:
        """Get agent access configuration (NOT admin policies)"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # IMPORTANT: Exclude 'agent_admin' type - those are for delegation, not chat access
            policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.is_active == True,
                AgentAccessPolicy.access_type != 'agent_admin'  # ✨ Exclude admin policies
            ).order_by(AgentAccessPolicy.priority.desc()).first()
            
            if not policy:
                # Default: PRIVATE (only owner can access until they configure access)
                return AgentAccessResponse(
                    agent_id=agent_id,
                    access_type=AccessType.SPECIFIC,  # Specific with no entities = private
                    entities=[]
                )
            
            # Build entities list from policy
            entities = []
            
            # Add users
            for user_id in (policy.user_ids or []):
                entities.append(AccessEntity(
                    id=str(user_id),
                    type=EntityType.USER,
                    name=f"User {user_id[:8]}..."  # TODO: Fetch actual name
                ))
            
            # Add groups
            for group_id in (policy.group_ids or []):
                entities.append(AccessEntity(
                    id=str(group_id),
                    type=EntityType.GROUP,
                    name=f"Group {group_id[:8]}..."  # TODO: Fetch actual name
                ))
            
            # Add roles
            for role_id in (policy.role_ids or []):
                entities.append(AccessEntity(
                    id=str(role_id),
                    type=EntityType.ROLE,
                    name=f"Role {role_id[:8]}..."  # TODO: Fetch actual name
                ))
            
            return AgentAccessResponse(
                agent_id=agent_id,
                access_type=AccessType(policy.access_type) if policy.access_type in [e.value for e in AccessType] else AccessType.AUTHENTICATED,
                entities=entities,
                updated_at=policy.updated_at
            )
    
    @staticmethod
    def update_agent_access(
        agent_id: str, 
        org_id: str,
        access_type: AccessType,
        entities: List[AccessEntity],
        updated_by: str
    ) -> AgentAccessResponse:
        """Update agent access configuration (NOT admin policies)"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # Find or create policy - EXCLUDE agent_admin policies!
            policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.access_type != 'agent_admin'  # ✨ Don't overwrite admin policy!
            ).first()
            
            if not policy:
                policy = AgentAccessPolicy(
                    agent_id=agent_id,
                    org_id=org_id,
                    name=f"Default Access Policy",
                    created_by=updated_by
                )
                session.add(policy)
            
            # Update fields
            policy.access_type = access_type.value
            policy.user_ids = [e.id for e in entities if e.type == EntityType.USER]
            policy.group_ids = [e.id for e in entities if e.type == EntityType.GROUP]
            policy.role_ids = [e.id for e in entities if e.type == EntityType.ROLE]
            policy.updated_by = updated_by
            policy.updated_at = datetime.utcnow()
            policy.is_active = True
            
            session.commit()
            
            return AccessControlService.get_agent_access(agent_id, org_id)
    
    # ========================================================================
    # LEVEL 2: TASK ACCESS
    # ========================================================================
    
    @staticmethod
    def get_task_access(agent_id: str, org_id: str) -> TaskAccessConfig:
        """Get task access configuration for an agent"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # Get the agent to see its tasks
            agent = session.query(Agent).filter(
                Agent.id == agent_id,
                Agent.org_id == org_id
            ).first()
            
            if not agent:
                return TaskAccessConfig(agent_id=agent_id, allow_all_by_default=True)
            
            # Get action policy for task restrictions
            policy = session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id,
                AgentActionPolicy.is_active == True
            ).first()
            
            # Parse agent tasks
            tasks = agent.tasks if isinstance(agent.tasks, list) else []
            if isinstance(agent.tasks, str):
                import json
                try:
                    tasks = json.loads(agent.tasks)
                except:
                    tasks = []
            
            task_permissions = []
            for task in tasks:
                task_id = task.get('id', '')
                task_name = task.get('name', 'Unnamed Task')
                
                # Check if this task is in denied list
                denied_ids = []
                allowed_ids = []
                
                if policy:
                    if task_id in (policy.denied_task_ids or []):
                        # Task is denied for entities in this policy
                        denied_ids = (policy.user_ids or []) + (policy.role_ids or [])
                    if task_id in (policy.allowed_task_ids or []):
                        allowed_ids = (policy.user_ids or []) + (policy.role_ids or [])
                
                task_permissions.append(TaskPermission(
                    task_id=task_id,
                    task_name=task_name,
                    allowed_entity_ids=allowed_ids,
                    denied_entity_ids=denied_ids
                ))
            
            return TaskAccessConfig(
                agent_id=agent_id,
                allow_all_by_default=not policy or not policy.denied_task_ids,
                task_permissions=task_permissions
            )
    
    @staticmethod
    def update_task_access(
        agent_id: str,
        org_id: str,
        task_permissions: List[TaskPermission],
        allow_all_by_default: bool,
        updated_by: str
    ) -> TaskAccessConfig:
        """
        Update task access configuration.
        
        Creates separate policies for each entity with their denied tasks.
        This allows fine-grained per-user/group task permissions.
        """
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # Delete existing action policies for this agent (clean slate)
            session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id
            ).delete()
            
            # Build per-entity denied task mapping
            # {entity_id: [denied_task_ids]}
            entity_denied_tasks = {}
            global_denied_tasks = []
            
            for perm in task_permissions:
                task_id = perm.task_id
                
                # Check if task is globally denied (default_allowed is False with no specific entities)
                if not perm.denied_entity_ids and perm.allowed_entity_ids == []:
                    # This might be a global deny - check if it's explicitly set
                    pass
                
                # Add to per-entity mapping
                for entity_id in (perm.denied_entity_ids or []):
                    if entity_id not in entity_denied_tasks:
                        entity_denied_tasks[entity_id] = []
                    entity_denied_tasks[entity_id].append(task_id)
            
            # Create a policy for each entity with their denied tasks
            for entity_id, denied_tasks in entity_denied_tasks.items():
                if not denied_tasks:
                    continue
                    
                policy = AgentActionPolicy(
                    agent_id=agent_id,
                    org_id=org_id,
                    name=f"Task Policy for {entity_id[:8]}",
                    description=f"Denies specific tasks for entity {entity_id}",
                    applies_to="specific",
                    user_ids=[entity_id],  # Could be user or group ID
                    denied_task_ids=denied_tasks,
                    allowed_task_ids=[],
                    created_by=updated_by
                )
                session.add(policy)
            
            # Also create a default policy if needed
            if not allow_all_by_default:
                # Collect all tasks that should be denied by default
                all_denied_by_default = []
                for perm in task_permissions:
                    if not perm.allowed_entity_ids:
                        all_denied_by_default.append(perm.task_id)
                
                if all_denied_by_default:
                    default_policy = AgentActionPolicy(
                        agent_id=agent_id,
                        org_id=org_id,
                        name="Default Task Policy",
                        description="Default policy - denies tasks unless explicitly allowed",
                        applies_to="all",
                        denied_task_ids=all_denied_by_default,
                        allowed_task_ids=[],
                        created_by=updated_by
                    )
                    session.add(default_policy)
            
            session.commit()
            print(f"✅ Saved task permissions: {len(entity_denied_tasks)} entity-specific policies")
            
            return AccessControlService.get_task_access(agent_id, org_id)
    
    # ========================================================================
    # LEVEL 3: TOOL ACCESS
    # ========================================================================
    
    @staticmethod
    def get_tool_access(agent_id: str, org_id: str) -> ToolAccessConfig:
        """Get tool access configuration for an agent"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # Get the agent to see its tools
            agent = session.query(Agent).filter(
                Agent.id == agent_id,
                Agent.org_id == org_id
            ).first()
            
            if not agent:
                return ToolAccessConfig(agent_id=agent_id, allow_all_by_default=True)
            
            # Get action policy for tool restrictions
            policy = session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id,
                AgentActionPolicy.is_active == True
            ).first()
            
            # Get tool IDs from agent
            tool_ids = agent.tool_ids if isinstance(agent.tool_ids, list) else []
            if isinstance(agent.tool_ids, str):
                import json
                try:
                    tool_ids = json.loads(agent.tool_ids)
                except:
                    tool_ids = []
            
            # TODO: Fetch actual tool names from database
            tool_permissions = []
            for tool_id in tool_ids:
                denied_ids = []
                allowed_ids = []
                
                if policy:
                    if tool_id in (policy.denied_tool_ids or []):
                        denied_ids = (policy.user_ids or []) + (policy.role_ids or [])
                    if tool_id in (policy.allowed_tool_ids or []):
                        allowed_ids = (policy.user_ids or []) + (policy.role_ids or [])
                
                tool_permissions.append(ToolPermission(
                    tool_id=tool_id,
                    tool_name=f"Tool {tool_id[:8]}...",  # TODO: Fetch actual name
                    allowed_entity_ids=allowed_ids,
                    denied_entity_ids=denied_ids
                ))
            
            return ToolAccessConfig(
                agent_id=agent_id,
                allow_all_by_default=not policy or not policy.denied_tool_ids,
                tool_permissions=tool_permissions
            )
    
    @staticmethod
    def update_tool_access(
        agent_id: str,
        org_id: str,
        tool_permissions: List[ToolPermission],
        allow_all_by_default: bool,
        updated_by: str
    ) -> ToolAccessConfig:
        """Update tool access configuration"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            policy = session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id
            ).first()
            
            if not policy:
                policy = AgentActionPolicy(
                    agent_id=agent_id,
                    org_id=org_id,
                    name="Default Action Policy",
                    applies_to="all",
                    created_by=updated_by
                )
                session.add(policy)
            
            denied_tool_ids = []
            allowed_tool_ids = []
            
            for perm in tool_permissions:
                if perm.denied_entity_ids:
                    denied_tool_ids.append(perm.tool_id)
                if perm.allowed_entity_ids and not allow_all_by_default:
                    allowed_tool_ids.append(perm.tool_id)
            
            policy.denied_tool_ids = denied_tool_ids
            policy.allowed_tool_ids = allowed_tool_ids if not allow_all_by_default else []
            policy.updated_at = datetime.utcnow()
            
            session.commit()
            
            return AccessControlService.get_tool_access(agent_id, org_id)
    
    # ========================================================================
    # ACCESS CHECKS (for End User Portal)
    # ========================================================================
    
    @staticmethod
    def check_user_access(
        user_id: str,
        user_role_ids: List[str],
        user_group_ids: List[str],
        agent_id: str,
        org_id: str
    ) -> AccessCheckResult:
        """
        Check what a user can do with an agent.
        Called from End User Portal during chat.
        
        PRIVATE BY DEFAULT: If no access policy exists, only the owner can access.
        Ownership check is done at the API level before calling this service.
        """
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            # Check Level 1: Agent Access
            access_policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.is_active == True,
                AgentAccessPolicy.access_type != 'agent_admin'  # Exclude admin policies from access check
            ).first()
            
            # PRIVATE BY DEFAULT: No policy means no access (only owner can access)
            has_access = False
            reason = "This assistant is not available for your account. Please contact the owner to request access."
            
            if access_policy:
                if access_policy.access_type == 'public':
                    has_access = True
                    reason = None
                elif access_policy.access_type == 'authenticated':
                    has_access = bool(user_id)
                    if not has_access:
                        reason = "Please log in to access this assistant."
                elif access_policy.access_type == 'specific':
                    # Check if user or their role/group has access
                    user_has_access = user_id in (access_policy.user_ids or [])
                    role_has_access = any(r in (access_policy.role_ids or []) for r in user_role_ids)
                    group_has_access = any(g in (access_policy.group_ids or []) for g in user_group_ids)
                    
                    has_access = user_has_access or role_has_access or group_has_access
                    
                    if has_access:
                        reason = None
                    else:
                        reason = "This assistant is not available for your account. Please contact your administrator if you need access."
            
            if not has_access:
                return AccessCheckResult(
                    has_access=False,
                    reason=reason or "This assistant is not available. Please contact your administrator."
                )
            
            # Check Level 2 & 3: Task and Tool access
            # Get ALL action policies for this agent (we now have per-entity policies)
            action_policies = session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id,
                AgentActionPolicy.is_active == True
            ).all()
            
            allowed_tasks = []
            denied_tasks = []
            allowed_tools = []
            denied_tools = []
            
            # Check each policy to see if it applies to this user
            for policy in action_policies:
                applies_to_user = False
                
                # Check if policy applies to all users
                if policy.applies_to == 'all':
                    applies_to_user = True
                else:
                    # Check if user is specifically in this policy
                    user_in_policy = user_id in (policy.user_ids or [])
                    role_in_policy = any(r in (policy.role_ids or []) for r in user_role_ids)
                    group_in_policy = any(g in (policy.user_ids or []) for g in user_group_ids)  # Groups stored in user_ids
                    
                    applies_to_user = user_in_policy or role_in_policy or group_in_policy
                
                if applies_to_user:
                    # Add denied tasks from this policy
                    for task_id in (policy.denied_task_ids or []):
                        if task_id not in denied_tasks:
                            denied_tasks.append(task_id)
                    
                    # Add allowed tasks from this policy
                    for task_id in (policy.allowed_task_ids or []):
                        if task_id not in allowed_tasks:
                            allowed_tasks.append(task_id)
                    
                    # Add denied tools from this policy
                    for tool_id in (policy.denied_tool_ids or []):
                        if tool_id not in denied_tools:
                            denied_tools.append(tool_id)
                    
                    # Add allowed tools from this policy
                    for tool_id in (policy.allowed_tool_ids or []):
                        if tool_id not in allowed_tools:
                            allowed_tools.append(tool_id)
            
            print(f"🔐 Access check for user {user_id[:8]}...: denied_tasks={denied_tasks}, denied_tools={denied_tools}")
            
            return AccessCheckResult(
                has_access=True,
                allowed_tasks=allowed_tasks,
                denied_tasks=denied_tasks,
                allowed_tools=allowed_tools,
                denied_tools=denied_tools
            )
    
    # ========================================================================
    # FULL CONFIG (for UI)
    # ========================================================================
    
    @staticmethod
    def get_full_access_config(agent_id: str, org_id: str) -> FullAccessConfig:
        """Get complete access configuration for UI display"""
        org_id = normalize_org_id(org_id)
        with get_session() as session:
            agent = session.query(Agent).filter(
                Agent.id == agent_id,
                Agent.org_id == org_id
            ).first()
            
            agent_name = agent.name if agent else "Unknown Agent"
            
            return FullAccessConfig(
                agent_id=agent_id,
                agent_name=agent_name,
                agent_access=AccessControlService.get_agent_access(agent_id, org_id),
                task_access=AccessControlService.get_task_access(agent_id, org_id),
                tool_access=AccessControlService.get_tool_access(agent_id, org_id)
            )
    
    @staticmethod
    def preview_user_access(
        agent_id: str,
        org_id: str,
        preview_user_id: str
    ) -> UserAccessPreview:
        """Preview what a specific user would see/do with an agent"""
        # TODO: Implement preview feature
        # Fetch user's roles and groups, then call check_user_access
        return UserAccessPreview(
            user_id=preview_user_id,
            user_name="Preview User",
            can_access_agent=True,
            accessible_tasks=[],
            accessible_tools=[],
            denied_tasks=[],
            denied_tools=[]
        )
    
    # ========================================================================
    # AGENT MANAGEMENT PERMISSIONS (Owner delegation)
    # ========================================================================
    
    @staticmethod
    def get_agent_management_config(agent_id: str, org_id: str) -> Dict[str, Any]:
        """
        Get the complete management delegation configuration for an agent.
        Shows owner info and all delegated admins with their permissions.
        """
        org_id = normalize_org_id(org_id)
        
        with get_session() as session:
            agent = session.query(Agent).filter(
                Agent.id == agent_id,
                Agent.org_id == org_id
            ).first()
            
            if not agent:
                return {
                    "agent_id": agent_id,
                    "owner_id": None,
                    "delegated_admins": []
                }
            
            owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
            
            # Get admin policies (where access_type = 'agent_admin')
            admin_policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.access_type == 'agent_admin',
                AgentAccessPolicy.is_active == True
            ).first()
            
            delegated_admins = []
            
            if admin_policy:
                # Try to parse permissions from description (JSON format)
                # or use default full_admin
                default_permissions = ["full_admin"]
                try:
                    if admin_policy.description:
                        import json
                        perms_data = json.loads(admin_policy.description)
                        if isinstance(perms_data, dict):
                            # description contains per-entity permissions
                            pass
                except:
                    perms_data = {}
                
                # Get user admins with their permissions
                for user_id in (admin_policy.user_ids or []):
                    # Check if this user has specific permissions in the description
                    user_perms = perms_data.get(user_id, default_permissions) if isinstance(perms_data, dict) else default_permissions
                    delegated_admins.append({
                        "entity_id": user_id,
                        "entity_type": "user",
                        "permissions": user_perms
                    })
                
                # Get group admins
                for group_id in (admin_policy.group_ids or []):
                    group_perms = perms_data.get(group_id, default_permissions) if isinstance(perms_data, dict) else default_permissions
                    delegated_admins.append({
                        "entity_id": group_id,
                        "entity_type": "group",
                        "permissions": group_perms
                    })
            
            return {
                "agent_id": agent_id,
                "owner_id": owner_id,
                "delegated_admins": delegated_admins,
                "updated_at": admin_policy.updated_at if admin_policy else None
            }
    
    @staticmethod
    def update_agent_management(
        agent_id: str,
        org_id: str,
        delegated_admins: List[Dict[str, Any]],
        updated_by: str
    ) -> Dict[str, Any]:
        """
        Update the management delegation for an agent.
        Only the owner can call this.
        
        delegated_admins: List of {entity_id, entity_type, permissions[]}
        """
        org_id = normalize_org_id(org_id)
        
        with get_session() as session:
            # Find or create the agent_admin policy
            policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.access_type == 'agent_admin'
            ).first()
            
            if not policy:
                policy = AgentAccessPolicy(
                    agent_id=agent_id,
                    org_id=org_id,
                    name="Agent Administrators",
                    description="Users and groups who can manage this agent",
                    access_type='agent_admin',
                    is_active=True,
                    created_by=updated_by
                )
                session.add(policy)
            
            # Extract user IDs, group IDs, and per-entity permissions
            user_ids = []
            group_ids = []
            permissions_map = {}  # entity_id -> permissions[]
            
            for admin in delegated_admins:
                entity_id = admin.get('entity_id')
                entity_type = admin.get('entity_type')
                permissions = admin.get('permissions', ['full_admin'])
                
                if entity_type == 'user':
                    user_ids.append(entity_id)
                elif entity_type == 'group':
                    group_ids.append(entity_id)
                
                # Store per-entity permissions
                permissions_map[entity_id] = permissions
            
            policy.user_ids = user_ids
            policy.group_ids = group_ids
            
            # Store per-entity permissions in description as JSON
            import json
            policy.description = json.dumps(permissions_map)
            
            policy.updated_by = updated_by
            policy.updated_at = datetime.utcnow()
            
            session.commit()
            
            return AccessControlService.get_agent_management_config(agent_id, org_id)
    
    @staticmethod
    def check_agent_permission(
        user_id: str,
        user_role_ids: List[str],
        user_group_ids: List[str],
        agent_id: str,
        org_id: str,
        permission: str
    ) -> Dict[str, Any]:
        """
        Check if a user has a specific permission on an agent.
        
        Returns:
            {
                has_permission: bool,
                is_owner: bool,
                granted_by: "owner" | "delegation" | None,
                reason: str
            }
        """
        org_id = normalize_org_id(org_id)
        
        with get_session() as session:
            # Get the agent
            agent = session.query(Agent).filter(
                Agent.id == agent_id,
                Agent.org_id == org_id
            ).first()
            
            if not agent:
                return {
                    "has_permission": False,
                    "is_owner": False,
                    "granted_by": None,
                    "reason": "Agent not found"
                }
            
            owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
            
            # 1. Owner has ALL permissions
            if user_id == owner_id:
                return {
                    "has_permission": True,
                    "is_owner": True,
                    "granted_by": "owner",
                    "reason": "You are the owner of this agent"
                }
            
            # 2. Check delegated permissions
            admin_policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.access_type == 'agent_admin',
                AgentAccessPolicy.is_active == True
            ).first()
            
            if not admin_policy:
                return {
                    "has_permission": False,
                    "is_owner": False,
                    "granted_by": None,
                    "reason": "No admin delegation exists for this agent"
                }
            
            # Check if user is in the admin list
            user_is_admin = user_id in (admin_policy.user_ids or [])
            group_is_admin = any(g in (admin_policy.group_ids or []) for g in user_group_ids)
            
            if not user_is_admin and not group_is_admin:
                return {
                    "has_permission": False,
                    "is_owner": False,
                    "granted_by": None,
                    "reason": "You are not a delegated admin for this agent"
                }
            
            # Check if the requested permission is granted
            granted_permissions = admin_policy.allowed_actions or []
            
            # FULL_ADMIN grants all permissions except delete
            if "full_admin" in granted_permissions:
                if permission != "delete_agent":
                    return {
                        "has_permission": True,
                        "is_owner": False,
                        "granted_by": "delegation",
                        "reason": "Granted via full admin delegation"
                    }
            
            # Check specific permission
            if permission in granted_permissions:
                return {
                    "has_permission": True,
                    "is_owner": False,
                    "granted_by": "delegation",
                    "reason": f"Granted via delegated permission: {permission}"
                }
            
            return {
                "has_permission": False,
                "is_owner": False,
                "granted_by": None,
                "reason": f"Permission '{permission}' not granted"
            }

