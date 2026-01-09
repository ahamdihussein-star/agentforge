"""
AgentForge Security Data Models - Complete Enterprise Implementation
====================================================================
All Pydantic models for the security module including:
- Enums for all security types
- User, Profile, MFA models
- Organization, Department, Group models
- Role, Policy models (RBAC + ABAC)
- Permission models (Tool, KB, DB)
- Session, Invitation, Audit models
- LDAP, OAuth configuration models
- Security Settings model
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr

# ============================================================================
# ENUMS
# ============================================================================

class AuthProvider(str, Enum):
    """Authentication provider types"""
    LOCAL = "local"           # Email/Password
    GOOGLE = "google"         # Google OAuth
    MICROSOFT = "microsoft"   # Microsoft/Azure AD
    LDAP = "ldap"            # LDAP/Active Directory
    SAML = "saml"            # SAML 2.0
    OIDC = "oidc"            # OpenID Connect

class MFAMethod(str, Enum):
    """Multi-factor authentication methods"""
    TOTP = "totp"            # Time-based OTP (Google Authenticator)
    SMS = "sms"              # SMS verification
    EMAIL = "email"          # Email verification
    PUSH = "push"            # Push notification

class UserStatus(str, Enum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"      # Awaiting email verification
    LOCKED = "locked"        # Too many failed attempts
    SUSPENDED = "suspended"  # Admin suspended

class Permission(str, Enum):
    """All system permissions"""
    # System permissions
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_SETTINGS = "system:settings"
    
    # User management
    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_EDIT = "users:edit"
    USERS_DELETE = "users:delete"
    
    # Role management
    ROLES_VIEW = "roles:view"
    ROLES_CREATE = "roles:create"
    ROLES_EDIT = "roles:edit"
    ROLES_DELETE = "roles:delete"
    
    # Policy management
    POLICIES_VIEW = "policies:view"
    POLICIES_CREATE = "policies:create"
    POLICIES_EDIT = "policies:edit"
    POLICIES_DELETE = "policies:delete"
    
    # Agent permissions
    AGENTS_VIEW = "agents:view"
    AGENTS_CREATE = "agents:create"
    AGENTS_EDIT = "agents:edit"
    AGENTS_DELETE = "agents:delete"
    AGENTS_PUBLISH = "agents:publish"
    AGENTS_TEST = "agents:test"
    
    # Tool permissions
    TOOLS_VIEW = "tools:view"
    TOOLS_CREATE = "tools:create"
    TOOLS_EDIT = "tools:edit"
    TOOLS_DELETE = "tools:delete"
    TOOLS_EXECUTE = "tools:execute"
    TOOLS_MANAGE_PERMISSIONS = "tools:manage_permissions"
    
    # Knowledge Base permissions
    KB_VIEW = "kb:view"
    KB_CREATE = "kb:create"
    KB_EDIT = "kb:edit"
    KB_DELETE = "kb:delete"
    KB_UPLOAD = "kb:upload"
    KB_MANAGE_PERMISSIONS = "kb:manage_permissions"
    
    # Database permissions
    DB_VIEW = "db:view"
    DB_CREATE = "db:create"
    DB_EDIT = "db:edit"
    DB_DELETE = "db:delete"
    DB_MANAGE_PERMISSIONS = "db:manage_permissions"
    
    # Conversation/Chat permissions
    CHAT_USE = "chat:use"
    CHAT_VIEW_ALL = "chat:view_all"
    CHAT_DELETE = "chat:delete"
    
    # Audit permissions
    AUDIT_VIEW = "audit:view"
    AUDIT_EXPORT = "audit:export"
    
    # Organization permissions
    ORG_VIEW = "org:view"
    ORG_EDIT = "org:edit"
    ORG_MANAGE = "org:manage"



# Permission Categories
PLATFORM_PERMISSIONS = [
    # System
    "system:admin", "system:settings",
    # Users
    "users:view", "users:create", "users:edit", "users:delete",
    # Roles
    "roles:view", "roles:create", "roles:edit", "roles:delete",
    # Policies
    "policies:view", "policies:create", "policies:edit", "policies:delete",
    # Audit
    "audit:view", "audit:export",
    # Organization
    "org:view", "org:edit", "org:manage",
]

AGENT_PERMISSIONS = [
    # Agents
    "agents:view", "agents:create", "agents:edit", "agents:delete", "agents:publish", "agents:test",
    # Tools
    "tools:view", "tools:create", "tools:edit", "tools:delete", "tools:execute", "tools:manage_permissions",
    # Knowledge Base
    "kb:view", "kb:create", "kb:edit", "kb:delete", "kb:upload", "kb:manage_permissions",
    # Database
    "db:view", "db:create", "db:edit", "db:delete", "db:manage_permissions",
    # Chat
    "chat:use", "chat:view_all", "chat:delete",
]

# Menu permission mapping
MENU_PERMISSIONS = {
    "chat": "chat:use",
    "agents": "agents:view",
    "tools": "tools:view",
    "create": "agents:create",
    "demo": "agents:test",
    "settings": "system:settings",
    "security": "users:view",
}




class ActionType(str, Enum):
    """Audit action types"""
    # Auth actions
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    
    # CRUD actions
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    
    # Tool actions
    EXECUTE = "execute"
    
    # Other
    EXPORT = "export"
    IMPORT = "import"
    SHARE = "share"
    PUBLISH = "publish"
    INVITE = "invite"
    SETTINGS_CHANGE = "settings_change"

class ResourceType(str, Enum):
    """Resource types for permissions and audit"""
    USER = "user"
    ROLE = "role"
    POLICY = "policy"
    AGENT = "agent"
    TOOL = "tool"
    KNOWLEDGE_BASE = "knowledge_base"
    DATABASE = "database"
    DOCUMENT = "document"
    CONVERSATION = "conversation"
    SETTINGS = "settings"
    ORGANIZATION = "organization"
    DEPARTMENT = "department"
    GROUP = "group"
    INVITATION = "invitation"
    SESSION = "session"

class DataClassification(str, Enum):
    """Data classification levels for KB and DB"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"

class TenancyMode(str, Enum):
    """Multi-tenancy modes"""
    SINGLE = "single"        # Single organization
    MULTI = "multi"          # Multiple organizations

class RegistrationMode(str, Enum):
    """User registration modes"""
    OPEN = "open"            # Anyone can register
    INVITE_ONLY = "invite_only"  # Only invited users
    DISABLED = "disabled"    # No registration allowed

class MFAEnforcement(str, Enum):
    """MFA enforcement levels"""
    OFF = "off"                      # MFA optional
    OPTIONAL = "optional"            # Users can enable
    REQUIRED_ADMINS = "required_admins"  # Required for admins
    REQUIRED_ALL = "required_all"    # Required for everyone

class AuditLogLevel(str, Enum):
    """Audit log detail levels"""
    ALL = "all"              # Log everything
    SECURITY_ONLY = "security_only"  # Only security events

# ============================================================================
# ORGANIZATION MODELS
# ============================================================================

class Organization(BaseModel):
    """Organization/Tenant model for multi-tenancy"""
    id: str = Field(default_factory=lambda: f"org_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str                # URL-friendly identifier
    domain: Optional[str] = None  # Custom domain
    logo_url: Optional[str] = None
    settings: Dict[str, Any] = {}
    
    # Auth settings
    allowed_auth_providers: List[AuthProvider] = [AuthProvider.LOCAL]
    require_mfa: bool = False
    allowed_email_domains: List[str] = []  # Restrict signups to these domains
    
    # OAuth credentials (encrypted in production)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    microsoft_client_id: Optional[str] = None
    microsoft_client_secret: Optional[str] = None
    microsoft_tenant_id: Optional[str] = None
    
    # LDAP/AD settings
    ldap_config_id: Optional[str] = None
    
    # Limits
    max_users: int = 100
    max_agents: int = 50
    max_tools: int = 100
    
    # Metadata
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Department(BaseModel):
    """Department within an organization"""
    id: str = Field(default_factory=lambda: f"dept_{uuid.uuid4().hex[:12]}")
    org_id: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None  # For nested departments
    manager_id: Optional[str] = None  # User ID of department manager
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UserGroup(BaseModel):
    """User group for permission assignment"""
    id: str = Field(default_factory=lambda: f"grp_{uuid.uuid4().hex[:12]}")
    org_id: str
    name: str
    description: Optional[str] = None
    user_ids: List[str] = []
    role_ids: List[str] = []  # Roles assigned to this group
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ============================================================================
# USER & AUTHENTICATION MODELS
# ============================================================================

class UserMFA(BaseModel):
    """MFA configuration for a user"""
    enabled: bool = False
    methods: List[MFAMethod] = []
    totp_secret: Optional[str] = None
    totp_verified: bool = False
    backup_codes: List[str] = []  # Hashed backup codes
    backup_codes_generated_at: Optional[str] = None
    phone_number: Optional[str] = None  # For SMS
    phone_verified: bool = False
    email_code: Optional[str] = None
    email_code_expires: Optional[str] = None
    sms_code: Optional[str] = None
    sms_code_expires: Optional[str] = None
    last_used: Optional[str] = None
    recovery_email: Optional[str] = None

class UserProfile(BaseModel):
    """Extended user profile information"""
    first_name: str
    last_name: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = "UTC"
    language: str = "en"
    job_title: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    
    # Custom attributes (extensible)
    custom_attributes: Dict[str, Any] = {}

class User(BaseModel):
    """Main user model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str  # Organization this user belongs to
    
    # Authentication
    email: str
    password_hash: Optional[str] = None  # Null for OAuth-only users
    auth_provider: AuthProvider = AuthProvider.LOCAL
    external_id: Optional[str] = None  # ID from external provider (Google, LDAP, etc.)
    
    # Profile
    profile: UserProfile
    
    # MFA
    mfa: UserMFA = Field(default_factory=UserMFA)
    
    # Organization structure
    department_id: Optional[str] = None
    group_ids: List[str] = []
    role_ids: List[str] = []
    
    # Direct permissions (in addition to role permissions)
    direct_permissions: List[str] = []
    
    # Status
    status: UserStatus = UserStatus.PENDING
    email_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires: Optional[str] = None
    
    # Password reset
    reset_password_token: Optional[str] = None
    reset_password_expires: Optional[str] = None
    password_history: List[str] = []  # Hashed previous passwords
    
    # Security
    failed_login_attempts: int = 0
    locked_until: Optional[str] = None
    password_changed_at: Optional[str] = None
    must_change_password: bool = False
    
    # Metadata
    last_login: Optional[str] = None
    last_active: Optional[str] = None
    last_login_ip: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None
    
    def get_display_name(self) -> str:
        """Get user's display name"""
        if self.profile.display_name:
            return self.profile.display_name
        return f"{self.profile.first_name} {self.profile.last_name}".strip() or self.email.split('@')[0]
    
    @property
    def full_name(self) -> str:
        return f"{self.profile.first_name} {self.profile.last_name}".strip()

class Session(BaseModel):
    """User session"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    org_id: str
    
    # Session info
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    
    # Status
    is_active: bool = True
    remember_me: bool = False
    
    # Timestamps
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_activity: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    expires_at: Optional[str] = None

class Invitation(BaseModel):
    """User invitation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    email: str
    token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    
    # Assignment
    role_ids: List[str] = []
    department_id: Optional[str] = None
    group_ids: List[str] = []
    
    # Invitation details
    invited_by: str  # User ID
    message: Optional[str] = None
    
    # Status
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    expires_at: str = Field(default_factory=lambda: (datetime.utcnow().replace(day=datetime.utcnow().day + 7)).isoformat())
    accepted_at: Optional[str] = None
    
    # Tracking
    email_sent: bool = False
    email_sent_at: Optional[str] = None
    resend_count: int = 0

# ============================================================================
# ROLE & PERMISSION MODELS (RBAC)
# ============================================================================

class Role(BaseModel):
    """Role definition for RBAC"""
    id: str = Field(default_factory=lambda: f"role_{uuid.uuid4().hex[:12]}")
    org_id: str
    name: str
    description: Optional[str] = None
    
    # Permissions
    permissions: List[str] = []
    
    # Hierarchy
    parent_id: Optional[str] = None  # For role inheritance
    level: int = 100  # Lower = more privileged (0 = super admin)
    
    # System role flag
    is_system: bool = False  # Cannot be deleted/modified
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None

# Default system roles
DEFAULT_ROLES = [
    {
        "id": "role_super_admin",
        "name": "Super Admin",
        "description": "Full system access with all permissions",
        "permissions": [p.value for p in Permission],
        "level": 0,
        "is_system": True
    },
    {
        "id": "role_admin",
        "name": "Admin",
        "description": "Organization administrator",
        "permissions": [
            Permission.USERS_VIEW.value, Permission.USERS_CREATE.value, Permission.USERS_EDIT.value, Permission.USERS_DELETE.value,
            Permission.ROLES_VIEW.value, Permission.ROLES_CREATE.value, Permission.ROLES_EDIT.value,
            Permission.POLICIES_VIEW.value, Permission.POLICIES_CREATE.value, Permission.POLICIES_EDIT.value,
            Permission.AGENTS_VIEW.value, Permission.AGENTS_CREATE.value, Permission.AGENTS_EDIT.value,
            Permission.AGENTS_DELETE.value, Permission.AGENTS_PUBLISH.value, Permission.AGENTS_TEST.value,
            Permission.TOOLS_VIEW.value, Permission.TOOLS_CREATE.value, Permission.TOOLS_EDIT.value,
            Permission.TOOLS_DELETE.value, Permission.TOOLS_EXECUTE.value, Permission.TOOLS_MANAGE_PERMISSIONS.value,
            Permission.KB_VIEW.value, Permission.KB_CREATE.value, Permission.KB_EDIT.value,
            Permission.KB_DELETE.value, Permission.KB_UPLOAD.value, Permission.KB_MANAGE_PERMISSIONS.value,
            Permission.DB_VIEW.value, Permission.DB_CREATE.value, Permission.DB_EDIT.value,
            Permission.DB_MANAGE_PERMISSIONS.value,
            Permission.CHAT_USE.value, Permission.CHAT_VIEW_ALL.value, Permission.CHAT_DELETE.value,
            Permission.AUDIT_VIEW.value, Permission.AUDIT_EXPORT.value,
            Permission.ORG_VIEW.value, Permission.ORG_EDIT.value
        ],
        "level": 1,
        "is_system": True
    },
    {
        "id": "role_manager",
        "name": "Manager",
        "description": "Team manager with elevated access",
        "permissions": [
            Permission.USERS_VIEW.value,
            Permission.ROLES_VIEW.value,
            Permission.AGENTS_VIEW.value, Permission.AGENTS_CREATE.value, Permission.AGENTS_EDIT.value,
            Permission.AGENTS_PUBLISH.value, Permission.AGENTS_TEST.value,
            Permission.TOOLS_VIEW.value, Permission.TOOLS_CREATE.value, Permission.TOOLS_EDIT.value,
            Permission.TOOLS_EXECUTE.value,
            Permission.KB_VIEW.value, Permission.KB_CREATE.value, Permission.KB_EDIT.value, Permission.KB_UPLOAD.value,
            Permission.DB_VIEW.value,
            Permission.CHAT_USE.value, Permission.CHAT_VIEW_ALL.value,
            Permission.AUDIT_VIEW.value
        ],
        "level": 2,
        "is_system": True
    },
    {
        "id": "role_user",
        "name": "User",
        "description": "Standard user with basic access",
        "permissions": [
            Permission.AGENTS_VIEW.value, Permission.AGENTS_TEST.value,
            Permission.TOOLS_VIEW.value, Permission.TOOLS_EXECUTE.value,
            Permission.KB_VIEW.value,
            Permission.DB_VIEW.value,
            Permission.CHAT_USE.value
        ],
        "level": 3,
        "is_system": True
    },
    {
        "id": "role_viewer",
        "name": "Viewer",
        "description": "Read-only access",
        "permissions": [
            Permission.AGENTS_VIEW.value,
            Permission.TOOLS_VIEW.value,
            Permission.KB_VIEW.value,
            Permission.DB_VIEW.value
        ],
        "level": 4,
        "is_system": True
    }
]

# ============================================================================
# POLICY MODELS (ABAC)
# ============================================================================

class PolicyCondition(BaseModel):
    """Single condition in a policy"""
    attribute: str       # e.g., "user.department_id", "resource.classification", "context.time"
    operator: str        # eq, ne, in, not_in, gt, lt, gte, lte, contains, starts_with, ends_with, regex
    value: Any           # The value to compare against

class PolicyRule(BaseModel):
    """Policy rule combining conditions"""
    conditions: List[PolicyCondition]
    logic: str = "AND"   # AND, OR
    
class Policy(BaseModel):
    """Access policy definition for ABAC"""
    id: str = Field(default_factory=lambda: f"pol_{uuid.uuid4().hex[:12]}")
    org_id: str
    name: str
    description: Optional[str] = None
    
    # What this policy applies to
    resource_type: ResourceType
    resource_ids: List[str] = []  # Empty = all resources of this type
    
    # Actions this policy governs
    actions: List[str] = []  # e.g., ["read", "write", "execute"]
    
    # Who this policy applies to (optional - if empty, uses conditions)
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    
    # Conditions (ABAC)
    rules: List[PolicyRule] = []
    
    # Effect
    effect: str = "allow"  # allow, deny
    
    # Priority (lower = higher priority, deny policies should have lower priority)
    priority: int = 100
    
    # Status
    is_active: bool = True
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None

# ============================================================================
# RESOURCE PERMISSION MODELS
# ============================================================================

class ToolPermission(BaseModel):
    """Fine-grained permissions for a specific tool"""
    id: str = Field(default_factory=lambda: f"tp_{uuid.uuid4().hex[:12]}")
    org_id: str
    tool_id: str
    tool_name: Optional[str] = None  # For display
    
    # Who has access
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    
    # What actions are allowed
    can_view: bool = True
    can_execute: bool = True
    can_edit: bool = False
    can_delete: bool = False
    
    # Specific tool actions
    allowed_actions: List[str] = []  # Specific tool actions allowed
    denied_actions: List[str] = []   # Specific tool actions denied
    
    # Rate limits
    rate_limit_per_hour: Optional[int] = None
    rate_limit_per_day: Optional[int] = None
    
    # Time restrictions
    allowed_hours_start: Optional[int] = None  # 0-23
    allowed_hours_end: Optional[int] = None
    allowed_days: List[int] = [0, 1, 2, 3, 4, 5, 6]  # 0=Monday, 6=Sunday
    
    # IP restrictions
    allowed_ips: List[str] = []
    denied_ips: List[str] = []
    
    # Data scope restrictions
    data_scope: Optional[Dict[str, Any]] = None  # Custom data filtering rules
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None

class KnowledgeBasePermission(BaseModel):
    """Fine-grained permissions for Knowledge Base access"""
    id: str = Field(default_factory=lambda: f"kbp_{uuid.uuid4().hex[:12]}")
    org_id: str
    kb_id: str  # Tool ID of the knowledge base
    kb_name: Optional[str] = None  # For display
    
    # Who has access
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    
    # Document-level permissions
    allowed_document_ids: List[str] = []  # Empty = all
    denied_document_ids: List[str] = []
    
    # Category-based access
    allowed_categories: List[str] = []
    denied_categories: List[str] = []
    
    # Tag-based access
    allowed_tags: List[str] = []
    denied_tags: List[str] = []
    
    # Classification-based access (user must have clearance)
    max_classification: DataClassification = DataClassification.INTERNAL
    
    # Action permissions
    can_search: bool = True
    can_view_full_content: bool = True
    can_view_metadata: bool = True
    can_download: bool = False
    can_upload: bool = False
    can_edit: bool = False
    can_delete: bool = False
    
    # Filter rules (row-level security for structured data)
    filter_rules: Dict[str, Any] = {}  # e.g., {"department": "${user.department_id}"}
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None

class DatabasePermission(BaseModel):
    """Fine-grained permissions for database tool access"""
    id: str = Field(default_factory=lambda: f"dbp_{uuid.uuid4().hex[:12]}")
    org_id: str
    tool_id: str  # Database tool ID
    tool_name: Optional[str] = None  # For display
    
    # Who has access
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    
    # Table-level permissions
    allowed_tables: List[str] = []  # Empty = all
    denied_tables: List[str] = []
    
    # Column-level permissions (per table)
    column_permissions: Dict[str, Dict[str, bool]] = {}
    # e.g., {"users": {"salary": False, "ssn": False}}
    
    # Hidden columns (completely invisible)
    hidden_columns: Dict[str, List[str]] = {}
    # e.g., {"users": ["password_hash", "ssn"]}
    
    # Row-level security (filter rules)
    row_filters: Dict[str, str] = {}
    # e.g., {"employees": "department_id = ${user.department_id}"}
    
    # Action permissions
    can_select: bool = True
    can_insert: bool = False
    can_update: bool = False
    can_delete: bool = False
    can_execute_procedures: bool = False
    can_create_tables: bool = False
    can_alter_tables: bool = False
    can_drop_tables: bool = False
    
    # Query restrictions
    max_rows_returned: int = 1000
    max_query_time_seconds: int = 30
    allowed_operations: List[str] = ["SELECT"]  # SELECT, INSERT, UPDATE, DELETE
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_by: Optional[str] = None

# ============================================================================
# AUDIT MODEL
# ============================================================================

class AuditLog(BaseModel):
    """Audit log entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    
    # Who
    user_id: str
    user_email: str
    user_name: str
    session_id: Optional[str] = None
    
    # What
    action: ActionType
    resource_type: ResourceType
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None
    
    # Details
    details: Dict[str, Any] = {}
    changes: Optional[Dict[str, Any]] = None  # For updates: {field: {old: x, new: y}}
    
    # Request context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    
    # Result
    success: bool = True
    error_message: Optional[str] = None
    
    # Timestamp
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ============================================================================
# LDAP CONFIGURATION MODEL
# ============================================================================

class LDAPConfig(BaseModel):
    """LDAP/Active Directory configuration"""
    id: str = Field(default_factory=lambda: f"ldap_{uuid.uuid4().hex[:12]}")
    org_id: str
    name: str = "LDAP"
    
    # Connection
    server_url: str  # e.g., ldap://ldap.example.com:389 or ldaps://ldap.example.com:636
    use_ssl: bool = False
    use_tls: bool = True
    verify_ssl: bool = True
    connection_timeout: int = 10
    
    # Bind credentials (service account)
    bind_dn: str  # e.g., cn=admin,dc=example,dc=com
    bind_password: str
    
    # Search settings
    base_dn: str  # e.g., dc=example,dc=com
    user_search_filter: str = "(uid={username})"
    user_search_base: Optional[str] = None  # Defaults to base_dn
    user_object_class: str = "person"
    group_search_filter: str = "(objectClass=groupOfNames)"
    group_search_base: Optional[str] = None
    group_object_class: str = "groupOfNames"
    
    # Attribute mapping (LDAP attribute -> AgentForge field)
    attribute_mapping: Dict[str, str] = {
        "email": "mail",
        "first_name": "givenName",
        "last_name": "sn",
        "display_name": "displayName",
        "phone": "telephoneNumber",
        "department": "department",
        "job_title": "title",
        "employee_id": "employeeNumber",
        "manager": "manager"
    }
    
    # Group to role mapping (LDAP group DN -> AgentForge role ID)
    group_role_mapping: Dict[str, str] = {}
    # e.g., {"CN=Admins,OU=Groups,DC=example,DC=com": "role_admin"}
    
    # Default role for new users
    default_role_id: str = "role_user"
    
    # Sync settings
    sync_enabled: bool = True
    sync_interval_hours: int = 24
    sync_delete_removed: bool = False  # Delete users removed from LDAP
    sync_update_existing: bool = True
    last_sync: Optional[str] = None
    last_sync_status: Optional[str] = None
    last_sync_users_synced: int = 0
    
    # Status
    is_active: bool = True
    connection_status: str = "unknown"  # connected, error, unknown
    last_connection_test: Optional[str] = None
    last_error: Optional[str] = None
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ============================================================================
# OAUTH CONFIGURATION MODEL
# ============================================================================

class OAuthConfig(BaseModel):
    """OAuth provider configuration"""
    id: str = Field(default_factory=lambda: f"oauth_{uuid.uuid4().hex[:12]}")
    org_id: str
    provider: AuthProvider
    
    # Credentials
    client_id: str
    client_secret: str
    
    # Provider-specific
    tenant_id: Optional[str] = None  # For Microsoft
    
    # Scopes
    scopes: List[str] = []
    
    # Settings
    enabled: bool = True
    auto_create_users: bool = True
    update_profile_on_login: bool = True
    default_role_id: str = "role_user"
    
    # Domain restrictions
    allowed_domains: List[str] = []  # Empty = all domains
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ============================================================================
# SECURITY SETTINGS MODEL
# ============================================================================

class SecuritySettings(BaseModel):
    """Global security settings for the organization"""
    id: str = "security_settings"
    org_id: str = "org_default"
    
    # Registration
    registration_mode: RegistrationMode = RegistrationMode.OPEN
    email_verification_required: bool = True
    allowed_email_domains: List[str] = []  # Empty = all domains allowed
    
    # Password Policy
    password_min_length: int = 8
    password_max_length: int = 128
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    password_expiry_days: int = 0  # 0 = never expires
    password_history_count: int = 5  # Prevent reuse of last N passwords
    password_min_age_hours: int = 0  # Minimum time before password can be changed
    
    # Session Management
    session_timeout_minutes: int = 480  # 8 hours, 0 = no timeout
    remember_me_days: int = 30
    max_concurrent_sessions: int = 5  # 0 = unlimited
    force_logout_on_password_change: bool = True
    single_session_per_device: bool = False
    
    # Account Security
    account_lockout_enabled: bool = True
    account_lockout_attempts: int = 5
    account_lockout_duration_minutes: int = 30  # 0 = manual unlock only
    account_lockout_reset_after_minutes: int = 30  # Reset failed attempts after
    
    # MFA Settings
    mfa_enforcement: MFAEnforcement = MFAEnforcement.OPTIONAL
    mfa_remember_device_days: int = 30  # 0 = always require
    mfa_allowed_methods: List[MFAMethod] = [MFAMethod.TOTP, MFAMethod.EMAIL]
    
    # IP Security
    ip_whitelist_enabled: bool = False
    ip_whitelist: List[str] = []
    ip_blacklist_enabled: bool = False
    ip_blacklist: List[str] = []
    
    # API Security
    api_rate_limit_enabled: bool = True
    api_rate_limit_requests: int = 1000  # Per hour
    api_key_expiry_days: int = 365
    
    # Audit Settings
    audit_retention_days: int = 365  # 0 = forever
    audit_log_level: AuditLogLevel = AuditLogLevel.ALL
    audit_log_ip_addresses: bool = True
    audit_log_user_agents: bool = True
    
    # Notification Settings
    notify_on_new_login: bool = False
    notify_on_password_change: bool = True
    notify_on_failed_login: bool = False
    notify_admin_on_lockout: bool = True
    
    # Advanced
    allow_api_token_auth: bool = True
    cors_allowed_origins: List[str] = ["*"]
    csrf_protection_enabled: bool = True
    
    # Metadata
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_by: Optional[str] = None
