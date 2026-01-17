"""
Access Control Schemas
Pydantic models for API requests/responses
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class AccessType(str, Enum):
    """Who can access the agent"""
    PUBLIC = "public"           # Anyone (no login required)
    AUTHENTICATED = "authenticated"  # Any logged-in user
    SPECIFIC = "specific"       # Specific users/groups/roles


class EntityType(str, Enum):
    """Types of entities that can have access"""
    USER = "user"
    GROUP = "group"
    ROLE = "role"


# ============================================================================
# ACCESS ENTITY (User, Group, or Role)
# ============================================================================

class AccessEntity(BaseModel):
    """A user, group, or role that has access"""
    id: str
    type: EntityType
    name: str
    member_count: Optional[int] = None  # For groups


# ============================================================================
# LEVEL 1: AGENT ACCESS
# ============================================================================

class AgentAccessCreate(BaseModel):
    """Create agent access policy"""
    access_type: AccessType = AccessType.AUTHENTICATED
    entities: List[AccessEntity] = []  # Users/groups/roles with access


class AgentAccessUpdate(BaseModel):
    """Update agent access policy"""
    access_type: Optional[AccessType] = None
    entities: Optional[List[AccessEntity]] = None
    add_entities: Optional[List[AccessEntity]] = None
    remove_entity_ids: Optional[List[str]] = None


class AgentAccessResponse(BaseModel):
    """Agent access policy response"""
    agent_id: str
    access_type: AccessType
    entities: List[AccessEntity] = []
    updated_at: Optional[datetime] = None


# ============================================================================
# LEVEL 2: TASK ACCESS
# ============================================================================

class TaskPermission(BaseModel):
    """Permission for a single task"""
    task_id: str
    task_name: str
    allowed_entity_ids: List[str] = []  # Empty = allowed for all with agent access
    denied_entity_ids: List[str] = []


class TaskAccessConfig(BaseModel):
    """Task access configuration for an agent"""
    agent_id: str
    allow_all_by_default: bool = True
    task_permissions: List[TaskPermission] = []


class TaskAccessUpdate(BaseModel):
    """Update task access"""
    allow_all_by_default: Optional[bool] = None
    task_permissions: Optional[List[TaskPermission]] = None


# ============================================================================
# LEVEL 3: TOOL ACCESS
# ============================================================================

class ToolPermission(BaseModel):
    """Permission for a single tool"""
    tool_id: str
    tool_name: str
    allowed_entity_ids: List[str] = []  # Empty = allowed for all with agent access
    denied_entity_ids: List[str] = []


class ToolAccessConfig(BaseModel):
    """Tool access configuration for an agent"""
    agent_id: str
    allow_all_by_default: bool = True
    tool_permissions: List[ToolPermission] = []


class ToolAccessUpdate(BaseModel):
    """Update tool access"""
    allow_all_by_default: Optional[bool] = None
    tool_permissions: Optional[List[ToolPermission]] = None


# ============================================================================
# ACCESS CHECK RESULTS
# ============================================================================

class AccessCheckResult(BaseModel):
    """Result of checking user's access"""
    has_access: bool
    allowed_tasks: List[str] = []  # Task IDs user can use
    denied_tasks: List[str] = []   # Task IDs user cannot use
    allowed_tools: List[str] = []  # Tool IDs that can be used
    denied_tools: List[str] = []   # Tool IDs that cannot be used
    reason: Optional[str] = None   # Why access was denied (if applicable)


class UserAccessPreview(BaseModel):
    """Preview what a user can do with an agent"""
    user_id: str
    user_name: str
    can_access_agent: bool
    accessible_tasks: List[Dict[str, Any]] = []
    accessible_tools: List[Dict[str, Any]] = []
    denied_tasks: List[Dict[str, Any]] = []
    denied_tools: List[Dict[str, Any]] = []


# ============================================================================
# COMBINED ACCESS CONFIG (for UI)
# ============================================================================

class FullAccessConfig(BaseModel):
    """Complete access configuration for an agent (all 3 levels)"""
    agent_id: str
    agent_name: str
    
    # Level 1
    agent_access: AgentAccessResponse
    
    # Level 2
    task_access: TaskAccessConfig
    
    # Level 3
    tool_access: ToolAccessConfig
    
    # Metadata
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class QuickTemplate(BaseModel):
    """Pre-configured access template"""
    id: str
    name: str
    description: str
    icon: str
    access_type: AccessType
    allow_all_tasks: bool
    allow_all_tools: bool
    denied_task_ids: List[str] = []
    denied_tool_ids: List[str] = []


# ============================================================================
# AGENT MANAGEMENT PERMISSIONS (Owner delegation to other admins)
# ============================================================================

class AgentPermissionType(str, Enum):
    """Types of permissions an owner can delegate on their agent"""
    # Core Configuration
    EDIT_BASIC_INFO = "edit_basic_info"       # Name, icon, description, goal
    EDIT_PERSONALITY = "edit_personality"      # Personality settings
    EDIT_MODEL = "edit_model"                  # LLM model selection
    EDIT_GUARDRAILS = "edit_guardrails"        # Safety guardrails
    
    # Components
    MANAGE_TASKS = "manage_tasks"              # Add/edit/delete tasks
    MANAGE_TOOLS = "manage_tools"              # Add/edit/delete tools
    MANAGE_KNOWLEDGE = "manage_knowledge"      # Knowledge base documents
    
    # Access Control
    MANAGE_ACCESS = "manage_access"            # End-user access control
    MANAGE_TASK_PERMISSIONS = "manage_task_permissions"  # Task-level permissions
    
    # Deployment
    PUBLISH_AGENT = "publish_agent"            # Publish/unpublish
    DELETE_AGENT = "delete_agent"              # Delete the agent (rarely delegated)
    
    # Full Access (shorthand for all permissions except delete)
    FULL_ADMIN = "full_admin"


class AgentAdminPermission(BaseModel):
    """Permissions granted to a delegated admin"""
    entity_id: str                          # User or Group ID
    entity_type: EntityType                 # USER or GROUP
    entity_name: Optional[str] = None       # Display name
    permissions: List[AgentPermissionType]  # Granted permissions


class AgentManagementConfig(BaseModel):
    """Complete management delegation configuration"""
    agent_id: str
    owner_id: str
    owner_name: Optional[str] = None
    delegated_admins: List[AgentAdminPermission] = []
    updated_at: Optional[datetime] = None


class AgentManagementUpdate(BaseModel):
    """Update delegated admin permissions"""
    add_admins: Optional[List[AgentAdminPermission]] = None
    remove_admin_ids: Optional[List[str]] = None
    update_permissions: Optional[List[AgentAdminPermission]] = None


class PermissionCheckResult(BaseModel):
    """Result of checking if user has a specific permission"""
    has_permission: bool
    is_owner: bool = False
    granted_by: Optional[str] = None  # "owner" or "delegation"
    reason: Optional[str] = None

