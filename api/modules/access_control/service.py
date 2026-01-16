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

from database.base import get_session
from database.models.agent_access import AgentAccessPolicy, AgentActionPolicy
from database.models.agent import Agent
from .schemas import (
    AccessType, EntityType, AccessEntity,
    AgentAccessResponse, TaskAccessConfig, ToolAccessConfig,
    TaskPermission, ToolPermission, AccessCheckResult,
    FullAccessConfig, UserAccessPreview
)


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
        """Get agent access configuration"""
        with get_session() as session:
            policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.is_active == True
            ).order_by(AgentAccessPolicy.priority.desc()).first()
            
            if not policy:
                # Default: authenticated users
                return AgentAccessResponse(
                    agent_id=agent_id,
                    access_type=AccessType.AUTHENTICATED,
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
        """Update agent access configuration"""
        with get_session() as session:
            # Find or create policy
            policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id
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
        """Update task access configuration"""
        with get_session() as session:
            # Find or create action policy
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
            
            # Update denied/allowed task lists
            denied_task_ids = []
            allowed_task_ids = []
            
            for perm in task_permissions:
                if perm.denied_entity_ids:
                    denied_task_ids.append(perm.task_id)
                if perm.allowed_entity_ids and not allow_all_by_default:
                    allowed_task_ids.append(perm.task_id)
            
            policy.denied_task_ids = denied_task_ids
            policy.allowed_task_ids = allowed_task_ids if not allow_all_by_default else []
            policy.updated_at = datetime.utcnow()
            
            session.commit()
            
            return AccessControlService.get_task_access(agent_id, org_id)
    
    # ========================================================================
    # LEVEL 3: TOOL ACCESS
    # ========================================================================
    
    @staticmethod
    def get_tool_access(agent_id: str, org_id: str) -> ToolAccessConfig:
        """Get tool access configuration for an agent"""
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
        """
        with get_session() as session:
            # Check Level 1: Agent Access
            access_policy = session.query(AgentAccessPolicy).filter(
                AgentAccessPolicy.agent_id == agent_id,
                AgentAccessPolicy.org_id == org_id,
                AgentAccessPolicy.is_active == True
            ).first()
            
            has_access = True
            reason = None
            
            if access_policy:
                if access_policy.access_type == 'public':
                    has_access = True
                elif access_policy.access_type == 'authenticated':
                    has_access = bool(user_id)
                elif access_policy.access_type == 'specific':
                    # Check if user or their role/group has access
                    user_has_access = user_id in (access_policy.user_ids or [])
                    role_has_access = any(r in (access_policy.role_ids or []) for r in user_role_ids)
                    group_has_access = any(g in (access_policy.group_ids or []) for g in user_group_ids)
                    
                    has_access = user_has_access or role_has_access or group_has_access
                    
                    if not has_access:
                        reason = "This assistant is not available for your account. Please contact your administrator if you need access."
            
            if not has_access:
                return AccessCheckResult(
                    has_access=False,
                    reason=reason or "This assistant is not available. Please contact your administrator."
                )
            
            # Check Level 2 & 3: Task and Tool access
            action_policy = session.query(AgentActionPolicy).filter(
                AgentActionPolicy.agent_id == agent_id,
                AgentActionPolicy.org_id == org_id,
                AgentActionPolicy.is_active == True
            ).first()
            
            allowed_tasks = []
            denied_tasks = []
            allowed_tools = []
            denied_tools = []
            
            if action_policy:
                # Check tasks
                for task_id in (action_policy.denied_task_ids or []):
                    # Check if user is in denied list
                    if user_id in (action_policy.user_ids or []) or \
                       any(r in (action_policy.role_ids or []) for r in user_role_ids):
                        denied_tasks.append(task_id)
                
                for task_id in (action_policy.allowed_task_ids or []):
                    allowed_tasks.append(task_id)
                
                # Check tools
                for tool_id in (action_policy.denied_tool_ids or []):
                    if user_id in (action_policy.user_ids or []) or \
                       any(r in (action_policy.role_ids or []) for r in user_role_ids):
                        denied_tools.append(tool_id)
                
                for tool_id in (action_policy.allowed_tool_ids or []):
                    allowed_tools.append(tool_id)
            
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

