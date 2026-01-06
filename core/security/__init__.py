"""
AgentForge Security Module
==========================
Enterprise-grade security with:
- Authentication (Local, OAuth, LDAP/AD, SAML)
- Multi-Factor Authentication (TOTP, SMS, Email)
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Fine-grained Resource Permissions
- Audit Trail
- Multi-tenancy Support
"""

from .models import (
    # Enums
    AuthProvider, MFAMethod, UserStatus, Permission, ActionType,
    ResourceType, DataClassification, TenancyMode,
    RegistrationMode, MFAEnforcement, AuditLogLevel,
    
    # Organization Models
    Organization, Department, UserGroup,
    
    # User Models
    User, UserProfile, UserMFA, Session, Invitation,
    
    # RBAC Models
    Role, DEFAULT_ROLES,
    
    # ABAC Models
    Policy, PolicyRule, PolicyCondition,
    
    # Permission Models
    ToolPermission, KnowledgeBasePermission, DatabasePermission,
    
    # Audit
    AuditLog,
    
    # External Auth
    LDAPConfig, OAuthConfig,
    
    # Settings
    SecuritySettings
)

from .services import (
    PasswordService,
    MFAService,
    TokenService,
    EmailService,
    LDAPService,
    OAuthService
)

from .engine import PolicyEngine
from .state import SecurityState, security_state

__all__ = [
    # Enums
    'AuthProvider', 'MFAMethod', 'UserStatus', 'Permission', 'ActionType',
    'ResourceType', 'DataClassification', 'TenancyMode',
    'RegistrationMode', 'MFAEnforcement', 'AuditLogLevel',
    
    # Organization Models
    'Organization', 'Department', 'UserGroup',
    
    # User Models
    'User', 'UserProfile', 'UserMFA', 'Session', 'Invitation',
    
    # RBAC Models
    'Role', 'DEFAULT_ROLES',
    
    # ABAC Models
    'Policy', 'PolicyRule', 'PolicyCondition',
    
    # Permission Models
    'ToolPermission', 'KnowledgeBasePermission', 'DatabasePermission',
    
    # Audit
    'AuditLog',
    
    # External Auth
    'LDAPConfig', 'OAuthConfig',
    
    # Settings
    'SecuritySettings',
    
    # Services
    'PasswordService', 'MFAService', 'TokenService',
    'EmailService', 'LDAPService', 'OAuthService',
    
    # Engine & State
    'PolicyEngine', 'SecurityState', 'security_state'
]

__version__ = "1.0.0"
