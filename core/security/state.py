"""
AgentForge Security State - Complete Enterprise Implementation
==============================================================
Main security state container with:
- All security collections (users, roles, policies, etc.)
- Persistence to disk
- Default initialization
- Helper methods
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

from .models import (
    UserProfile,
    Organization, Department, UserGroup,
    User, Session, Invitation,
    Role, Policy, PolicyRule, PolicyCondition,
    ToolPermission, KnowledgeBasePermission, DatabasePermission,
    AuditLog, LDAPConfig, OAuthConfig, SecuritySettings,
    TenancyMode, AuthProvider, ActionType, ResourceType, UserStatus,
    RegistrationMode, MFAEnforcement, AuditLogLevel,
    DEFAULT_ROLES
)
from .engine import PolicyEngine


class SecurityState:
    """
    Main security state container.
    Manages all security-related data and provides persistence.
    """
    
    def __init__(self):
        # Multi-tenancy
        self.tenancy_mode: TenancyMode = TenancyMode.SINGLE
        self.organizations: Dict[str, Organization] = {}
        
        # Users & Groups
        self.users: Dict[str, User] = {}
        self.departments: Dict[str, Department] = {}
        self.groups: Dict[str, UserGroup] = {}
        
        # Sessions & Invitations
        self.sessions: Dict[str, Session] = {}
        self.invitations: Dict[str, Invitation] = {}
        
        # RBAC
        self.roles: Dict[str, Role] = {}
        
        # ABAC
        self.policies: Dict[str, Policy] = {}
        
        # Resource Permissions
        self.tool_permissions: Dict[str, ToolPermission] = {}
        self.kb_permissions: Dict[str, KnowledgeBasePermission] = {}
        self.db_permissions: Dict[str, DatabasePermission] = {}
        
        # External Auth
        self.ldap_configs: Dict[str, LDAPConfig] = {}
        self.oauth_configs: Dict[str, OAuthConfig] = {}
        
        # Settings
        self.settings: Dict[str, SecuritySettings] = {}
        
        # Audit
        self.audit_logs: List[AuditLog] = []
        
        # Policy Engine
        self.policy_engine: PolicyEngine = PolicyEngine(self)
        
        # Initialize defaults
        self._init_defaults()
        
        # Try to load from disk
        self.load_from_disk()
        
        # Create default super admin if no users exist (after loading)
        if not self.users:
            from .services import PasswordService
            default_admin = User(
                id="user_super_admin",
                org_id="org_default",
                email="admin@agentforge.app",
                password_hash=PasswordService.hash_password("Admin@123"),
                profile=UserProfile(first_name="Super", last_name="Admin"),
                role_ids=["role_super_admin"],
                status=UserStatus.ACTIVE,
                email_verified=True
            )
            self.users[default_admin.id] = default_admin
            self.save_to_disk()
            print("✅ Created default super admin: admin@agentforge.app / Admin@123")
    
    def _init_defaults(self):
        """Initialize default organization, roles, and settings"""
        # Create default organization
        if "org_default" not in self.organizations:
            default_org = Organization(
                id="org_default",
                name="Default Organization",
                slug="default",
                allowed_auth_providers=[AuthProvider.LOCAL, AuthProvider.GOOGLE, AuthProvider.MICROSOFT]
            )
            self.organizations[default_org.id] = default_org
        
        # Create default roles
        for role_data in DEFAULT_ROLES:
            if role_data["id"] not in self.roles:
                role = Role(
                    org_id="org_default",
                    **role_data
                )
                self.roles[role.id] = role
        
        # Create default settings
        if "org_default" not in self.settings:
            self.settings["org_default"] = SecuritySettings(org_id="org_default")
        
    
    def get_settings(self, org_id: str = "org_default") -> SecuritySettings:
        """Get security settings for an organization"""
        if org_id not in self.settings:
            self.settings[org_id] = SecuritySettings(org_id=org_id)
        return self.settings[org_id]
    
    def save_to_disk(self):
        """Save security state to disk"""
        data_dir = os.environ.get("DATA_PATH", "data")
        security_dir = os.path.join(data_dir, "security")
        os.makedirs(security_dir, exist_ok=True)
        
        # Save each collection
        collections = {
            "organizations.json": self.organizations,
            "users.json": self.users,
            "departments.json": self.departments,
            "groups.json": self.groups,
            "roles.json": self.roles,
            "policies.json": self.policies,
            "tool_permissions.json": self.tool_permissions,
            "kb_permissions.json": self.kb_permissions,
            "db_permissions.json": self.db_permissions,
            "ldap_configs.json": self.ldap_configs,
            "oauth_configs.json": self.oauth_configs,
            "invitations.json": self.invitations
        }
        
        for filename, data in collections.items():
            path = os.path.join(security_dir, filename)
            try:
                with open(path, "w", encoding="utf-8") as f:
                    serialized = {}
                    for k, v in data.items():
                        if hasattr(v, 'dict'):
                            serialized[k] = v.dict()
                        elif hasattr(v, '__dict__'):
                            serialized[k] = v.__dict__
                        else:
                            serialized[k] = v
                    json.dump(serialized, f, indent=2, ensure_ascii=False, default=str)
            except Exception as e:
                print(f"⚠️ Error saving {filename}: {e}")
        
        # Save settings separately (dict of settings objects)
        settings_path = os.path.join(security_dir, "settings.json")
        try:
            with open(settings_path, "w", encoding="utf-8") as f:
                settings_data = {
                    "tenancy_mode": self.tenancy_mode.value,
                    "settings": {k: v.dict() for k, v in self.settings.items()}
                }
                json.dump(settings_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Error saving settings.json: {e}")
        
        # Save audit logs (append mode, keep last 10k)
        audit_path = os.path.join(security_dir, "audit_logs.json")
        try:
            with open(audit_path, "w", encoding="utf-8") as f:
                logs = self.audit_logs[-10000:]  # Keep last 10k
                json.dump([log.dict() for log in logs], f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"⚠️ Error saving audit_logs.json: {e}")
    
    def load_from_disk(self):
        """Load security state from disk (with database priority)"""
        data_dir = os.environ.get("DATA_PATH", "data")
        security_dir = os.path.join(data_dir, "security")
        
        # Try to load from database first
        try:
            from database.services import UserService
            
            # Check if database is available
            db_users = UserService.get_all_users()
            if db_users:
                print("📊 Loading users from database...")
                for user in db_users:
                    self.users[user.id] = user
                print(f"✅ Loaded {len(db_users)} users from database")
            else:
                print("⚠️  No users in database, falling back to files...")
                # Fall through to file loading
                raise Exception("No users in DB")
                
        except Exception as db_error:
            # Fallback to file loading
            print(f"📂 Loading from files (database unavailable: {db_error})")
        
        if not os.path.exists(security_dir):
            print("📁 Security data directory not found, using defaults")
            return
        
        print("📂 Loading security data from disk...")
        
        # Load settings first
        settings_path = os.path.join(security_dir, "settings.json")
        if os.path.exists(settings_path):
            try:
                with open(settings_path, encoding="utf-8") as f:
                    data = json.load(f)
                    self.tenancy_mode = TenancyMode(data.get("tenancy_mode", "single"))
                    for org_id, settings_dict in data.get("settings", {}).items():
                        self.settings[org_id] = SecuritySettings(**settings_dict)
                print(f"✅ Loaded settings.json")
            except Exception as e:
                print(f"⚠️ Error loading settings.json: {e}")
        
        # Model mapping for each collection
        # Skip users.json if already loaded from database
        loaders = [
            ("organizations.json", Organization, self.organizations),
        ]
        
        # Only load users from file if not loaded from database
        if not self.users:
            loaders.append(("users.json", User, self.users))
        
        loaders.extend([
            ("departments.json", Department, self.departments),
            ("groups.json", UserGroup, self.groups),
            ("roles.json", Role, self.roles),
            ("policies.json", Policy, self.policies),
            ("tool_permissions.json", ToolPermission, self.tool_permissions),
            ("kb_permissions.json", KnowledgeBasePermission, self.kb_permissions),
            ("db_permissions.json", DatabasePermission, self.db_permissions),
            ("ldap_configs.json", LDAPConfig, self.ldap_configs),
            ("oauth_configs.json", OAuthConfig, self.oauth_configs),
            ("invitations.json", Invitation, self.invitations)
        ])
        
        for filename, cls, container in loaders:
            path = os.path.join(security_dir, filename)
            if os.path.exists(path):
                try:
                    with open(path, encoding="utf-8") as f:
                        data = json.load(f)
                        for k, v in data.items():
                            try:
                                container[k] = cls(**v)
                            except Exception as item_error:
                                print(f"  ⚠️ Error loading item {k} from {filename}: {item_error}")
                    print(f"✅ Loaded {filename}: {len(container)} items")
                except Exception as e:
                    print(f"⚠️ Error loading {filename}: {e}")
        
        # Load audit logs
        audit_path = os.path.join(security_dir, "audit_logs.json")
        if os.path.exists(audit_path):
            try:
                with open(audit_path, encoding="utf-8") as f:
                    data = json.load(f)
                    self.audit_logs = []
                    for log_data in data:
                        try:
                            # Handle enum conversion
                            if 'action' in log_data and isinstance(log_data['action'], str):
                                log_data['action'] = ActionType(log_data['action'])
                            if 'resource_type' in log_data and isinstance(log_data['resource_type'], str):
                                log_data['resource_type'] = ResourceType(log_data['resource_type'])
                            self.audit_logs.append(AuditLog(**log_data))
                        except Exception as item_error:
                            pass  # Skip malformed log entries
                print(f"✅ Loaded audit_logs.json: {len(self.audit_logs)} entries")
            except Exception as e:
                print(f"⚠️ Error loading audit logs: {e}")
        
        # Ensure default roles exist
        self._ensure_default_roles()
        
        print("✅ Security data loaded successfully")
    
    def _ensure_default_roles(self):
        """Ensure default system roles exist"""
        for role_data in DEFAULT_ROLES:
            if role_data["id"] not in self.roles:
                role = Role(
                    org_id="org_default",
                    **role_data
                )
                self.roles[role.id] = role
                print(f"✨ Created missing default role: {role.name}")
    
    def add_audit_log(
        self,
        user: User,
        action: ActionType,
        resource_type: ResourceType,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        details: Dict[str, Any] = None,
        changes: Dict[str, Any] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        session: Optional[Session] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_path: Optional[str] = None,
        request_method: Optional[str] = None
    ):
        """Add an audit log entry"""
        log = AuditLog(
            org_id=user.org_id,
            user_id=user.id,
            user_email=user.email,
            user_name=user.get_display_name(),
            session_id=session.id if session else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            details=details or {},
            changes=changes,
            success=success,
            error_message=error_message,
            ip_address=ip_address or (session.ip_address if session else None),
            user_agent=user_agent or (session.user_agent if session else None),
            request_path=request_path,
            request_method=request_method
        )
        self.audit_logs.append(log)
        
        # Auto-save periodically
        if len(self.audit_logs) % 100 == 0:
            self.save_to_disk()
        
        return log
    
    def get_user_by_email(self, email: str, org_id: Optional[str] = None) -> Optional[User]:
        """Find user by email"""
        email_lower = email.lower()
        for user in self.users.values():
            if user.email.lower() == email_lower:
                if org_id is None or user.org_id == org_id:
                    return user
        return None
    
    def get_user_by_external_id(self, external_id: str, provider: AuthProvider, org_id: Optional[str] = None) -> Optional[User]:
        """Find user by external provider ID"""
        for user in self.users.values():
            if user.external_id == external_id and user.auth_provider == provider:
                if org_id is None or user.org_id == org_id:
                    return user
        return None
    
    def get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for a user"""
        return list(self.policy_engine._get_user_permissions(user))
    
    def check_permission(self, user: User, permission: str) -> bool:
        """Check if user has a specific permission"""
        return self.policy_engine.has_permission(user, permission)
    
    def get_user_roles(self, user: User) -> List[Role]:
        """Get all roles for a user"""
        return [self.roles[r] for r in user.role_ids if r in self.roles]
    
    def get_users_by_role(self, role_id: str) -> List[User]:
        """Get all users with a specific role"""
        return [u for u in self.users.values() if role_id in u.role_ids]
    
    def get_users_by_department(self, department_id: str) -> List[User]:
        """Get all users in a department"""
        return [u for u in self.users.values() if u.department_id == department_id]
    
    def get_users_by_group(self, group_id: str) -> List[User]:
        """Get all users in a group"""
        return [u for u in self.users.values() if group_id in u.group_ids]
    
    def get_active_sessions(self, user_id: Optional[str] = None) -> List[Session]:
        """Get all active sessions, optionally filtered by user"""
        sessions = [s for s in self.sessions.values() if s.is_active]
        if user_id:
            sessions = [s for s in sessions if s.user_id == user_id]
        return sessions
    
    def invalidate_user_sessions(self, user_id: str):
        """Invalidate all sessions for a user"""
        for session in self.sessions.values():
            if session.user_id == user_id:
                session.is_active = False
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        now = datetime.utcnow()
        settings = self.get_settings()
        
        for session_id, session in list(self.sessions.items()):
            if not session.is_active:
                continue
            
            # Check session timeout
            if settings.session_timeout_minutes > 0:
                last_activity = datetime.fromisoformat(session.last_activity)
                if (now - last_activity).total_seconds() > settings.session_timeout_minutes * 60:
                    session.is_active = False
            
            # Check remember me expiry
            if session.remember_me and session.expires_at:
                if datetime.fromisoformat(session.expires_at) < now:
                    session.is_active = False
    
    def cleanup_expired_invitations(self):
        """Remove expired invitations"""
        now = datetime.utcnow()
        expired = []
        
        for inv_id, inv in self.invitations.items():
            if not inv.accepted_at and datetime.fromisoformat(inv.expires_at) < now:
                expired.append(inv_id)
        
        for inv_id in expired:
            del self.invitations[inv_id]
    
    def get_audit_logs(
        self,
        org_id: str,
        action: Optional[ActionType] = None,
        resource_type: Optional[ResourceType] = None,
        user_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        """Get filtered audit logs"""
        logs = [l for l in self.audit_logs if l.org_id == org_id]
        
        if action:
            logs = [l for l in logs if l.action == action]
        if resource_type:
            logs = [l for l in logs if l.resource_type == resource_type]
        if user_id:
            logs = [l for l in logs if l.user_id == user_id]
        if start_date:
            logs = [l for l in logs if l.timestamp >= start_date]
        if end_date:
            logs = [l for l in logs if l.timestamp <= end_date]
        
        # Sort by timestamp descending
        logs = sorted(logs, key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        return logs[offset:offset + limit]
    
    def get_stats(self, org_id: str) -> Dict[str, Any]:
        """Get security statistics for an organization"""
        org_users = [u for u in self.users.values() if u.org_id == org_id]
        org_sessions = [s for s in self.sessions.values() if s.org_id == org_id and s.is_active]
        org_invitations = [i for i in self.invitations.values() if i.org_id == org_id and not i.accepted_at]
        
        return {
            "users": {
                "total": len(org_users),
                "active": len([u for u in org_users if u.status == UserStatus.ACTIVE]),
                "pending": len([u for u in org_users if u.status == UserStatus.PENDING]),
                "locked": len([u for u in org_users if u.status == UserStatus.LOCKED]),
                "suspended": len([u for u in org_users if u.status == UserStatus.SUSPENDED]),
                "mfa_enabled": len([u for u in org_users if u.mfa.enabled])
            },
            "sessions": {
                "active": len(org_sessions)
            },
            "invitations": {
                "pending": len(org_invitations)
            },
            "roles": len([r for r in self.roles.values() if r.org_id == org_id or r.is_system]),
            "policies": len([p for p in self.policies.values() if p.org_id == org_id]),
            "tool_permissions": len([p for p in self.tool_permissions.values() if p.org_id == org_id]),
            "kb_permissions": len([p for p in self.kb_permissions.values() if p.org_id == org_id]),
            "db_permissions": len([p for p in self.db_permissions.values() if p.org_id == org_id])
        }


# Global singleton instance
security_state = SecurityState()
