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
import traceback
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
        
        # Don't add default roles here - they will be added in _ensure_default_roles()
        # only if database is not available. This prevents string ID roles from
        # being added when database roles exist.
        
        # Create default settings
        if "org_default" not in self.settings:
            self.settings["org_default"] = SecuritySettings(org_id="org_default")
        
    
    def get_settings(self, org_id: str = "org_default") -> SecuritySettings:
        """Get security settings for an organization (loads from database if not in memory)"""
        if org_id not in self.settings:
            # Try to load from database
            try:
                from database.services import SecuritySettingsService
                db_settings = SecuritySettingsService.get_settings(org_id)
                self.settings[org_id] = db_settings
            except Exception as e:
                print(f"⚠️  [DATABASE ERROR] Failed to load security settings: {e}, using defaults")
                import traceback
                traceback.print_exc()
                # Fallback to default
            self.settings[org_id] = SecuritySettings(org_id=org_id)
        return self.settings[org_id]
    
    def save_to_disk(self):
        """
        Save security state to database (primary) and disk (backup).
        Database is now the primary storage, disk is backup only.
        """
        # Save to database first (primary storage)
        try:
            # Save organizations
            from database.services import OrganizationService
            for org in self.organizations.values():
                try:
                    OrganizationService.save_organization(org)
                except Exception as e:
                    print(f"⚠️ Error saving organization {org.id} to database: {e}")
            
            # Save users
            from database.services import UserService
            for user in self.users.values():
                try:
                    UserService.save_user(user)
                except Exception as e:
                    print(f"⚠️ Error saving user {user.id} to database: {e}")
            
            # Save roles
            from database.services import RoleService
            for role in self.roles.values():
                try:
                    RoleService.save_role(role)
                except Exception as e:
                    print(f"⚠️ Error saving role {role.id} to database: {e}")
            
            # Save invitations
            from database.services import InvitationService
            for invitation in self.invitations.values():
                try:
                    InvitationService.save_invitation(invitation)
                except Exception as e:
                    print(f"⚠️ Error saving invitation {invitation.id} to database: {e}")
            
            # Save departments
            from database.services import DepartmentService
            for dept in self.departments.values():
                try:
                    DepartmentService.save_department(dept)
                except Exception as e:
                    print(f"⚠️ Error saving department {dept.id} to database: {e}")
            
            # Save user groups
            from database.services import UserGroupService
            for group in self.groups.values():
                try:
                    UserGroupService.save_group(group)
                except Exception as e:
                    print(f"⚠️ Error saving group {group.id} to database: {e}")
            
            # Save security settings
            from database.services import SecuritySettingsService
            for org_id, settings in self.settings.items():
                try:
                    SecuritySettingsService.save_settings(settings)
                except Exception as e:
                    print(f"⚠️ Error saving security settings for {org_id} to database: {e}")
            
            print("💾 Security state saved to database")
        except Exception as db_error:
            print(f"❌ Database save failed: {type(db_error).__name__}: {str(db_error)}")
            import traceback
            traceback.print_exc()
            print("📂 Falling back to disk save...")
        
        # Also save to disk as backup (for backward compatibility)
        data_dir = os.environ.get("DATA_PATH", "data")
        security_dir = os.path.join(data_dir, "security")
        os.makedirs(security_dir, exist_ok=True)
        
        # Save each collection to disk (backup only)
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
        
        # Save audit logs (append mode, keep last 10k) - backup only
        audit_path = os.path.join(security_dir, "audit_logs.json")
        try:
            with open(audit_path, "w", encoding="utf-8") as f:
                logs = self.audit_logs[-10000:]  # Keep last 10k
                json.dump([log.dict() for log in logs], f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"⚠️ Error saving audit_logs.json: {e}")
    
    def load_from_disk(self):
        """Load security state from disk (with database priority)"""
        import traceback
        
        data_dir = os.environ.get("DATA_PATH", "data")
        security_dir = os.path.join(data_dir, "security")
        
        # Try to load from database first
        db_users_loaded = False
        try:
            from database.services import UserService
            
            db_users = UserService.get_all_users()
            if db_users:
                for user in db_users:
                    self.users[user.id] = user
                db_users_loaded = True
                
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load users: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        # --- Load roles from database ---
        db_roles_loaded = False
        try:
            from database.services import RoleService
            
            db_roles = RoleService.get_all_roles()
            if db_roles:
                # Remove string ID roles (from _init_defaults) before loading from database
                string_ids = ['role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer']
                for role_id in string_ids:
                    if role_id in self.roles:
                        del self.roles[role_id]
                
                # Load fresh from database
                for role in db_roles:
                    self.roles[role.id] = role
                db_roles_loaded = True
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load roles: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        if not os.path.exists(security_dir):
            return
        
        # --- Load Organizations from database ---
        db_orgs_loaded = False
        try:
            from database.services import OrganizationService
            db_orgs = OrganizationService.get_all_organizations()
            if db_orgs:
                for org in db_orgs:
                    self.organizations[org.id] = org
                db_orgs_loaded = True
        except Exception as db_error:
            error_msg = str(db_error)
            if "does not exist" in error_msg or "UndefinedColumn" in error_msg:
                print(f"❌ [DATABASE ERROR] Failed to load organizations: Missing columns")
            else:
                print(f"❌ [DATABASE ERROR] Failed to load organizations: {type(db_error).__name__}: {str(db_error)}")
                traceback.print_exc()
        
        # --- Load Invitations from database ---
        db_invitations_loaded = False
        try:
            from database.services import InvitationService
            db_invitations = InvitationService.get_all_invitations()
            if db_invitations:
                for inv in db_invitations:
                    self.invitations[inv.id] = inv
                db_invitations_loaded = True
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load invitations: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        # --- Load Departments from database ---
        db_departments_loaded = False
        try:
            from database.services import DepartmentService
            db_departments = DepartmentService.get_all_departments()
            if db_departments:
                for dept in db_departments:
                    self.departments[dept.id] = dept
                db_departments_loaded = True
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load departments: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        # --- Load User Groups from database ---
        db_groups_loaded = False
        try:
            from database.services import UserGroupService
            db_groups = UserGroupService.get_all_groups()
            if db_groups:
                for group in db_groups:
                    self.groups[group.id] = group
                db_groups_loaded = True
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load user groups: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        # --- Load Audit Logs from database ---
        db_audit_loaded = False
        try:
            from database.services import AuditService
            db_audit_logs = AuditService.get_all_audit_logs(limit=1000)
            if db_audit_logs:
                self.audit_logs = db_audit_logs
                db_audit_loaded = True
            else:
                if not hasattr(self, 'audit_logs') or self.audit_logs is None:
                    self.audit_logs = []
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load audit logs: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
            if not hasattr(self, 'audit_logs') or self.audit_logs is None:
                self.audit_logs = []
        
        # --- Load Security Settings from database ---
        db_settings_loaded = False
        try:
            from database.services import SecuritySettingsService, OrganizationService
            default_org = OrganizationService.get_organization_by_slug("default")
            if default_org:
                org_id = default_org.id
            else:
                org_id = "org_default"
            
            default_settings = SecuritySettingsService.get_settings(org_id)
            self.settings["org_default"] = default_settings
            db_settings_loaded = True
        except Exception as db_error:
            print(f"❌ [DATABASE ERROR] Failed to load security settings: {type(db_error).__name__}: {str(db_error)}")
            traceback.print_exc()
        
        # Fallback to JSON files only if database loading failed
        if not os.path.exists(security_dir):
            return
        
        # Load settings from JSON only if database loading failed
        if not db_settings_loaded:
            settings_path = os.path.join(security_dir, "settings.json")
            if os.path.exists(settings_path):
                try:
                    with open(settings_path, encoding="utf-8") as f:
                        data = json.load(f)
                        self.tenancy_mode = TenancyMode(data.get("tenancy_mode", "single"))
                        for org_id, settings_dict in data.get("settings", {}).items():
                            self.settings[org_id] = SecuritySettings(**settings_dict)
                except Exception as e:
                    print(f"⚠️ Error loading settings.json: {e}")
        
        # Only load from JSON if database loading failed
        loaders = []
        
        if not db_orgs_loaded:
            loaders.append(("organizations.json", Organization, self.organizations))
        if not db_users_loaded:
            loaders.append(("users.json", User, self.users))
        if not db_roles_loaded:
            loaders.append(("roles.json", Role, self.roles))
        if not db_departments_loaded:
            loaders.append(("departments.json", Department, self.departments))
        if not db_groups_loaded:
            loaders.append(("groups.json", UserGroup, self.groups))
        if not db_invitations_loaded:
            loaders.append(("invitations.json", Invitation, self.invitations))
        
        # Policies and permissions - still from JSON (can be migrated later if needed)
        loaders.extend([
            ("policies.json", Policy, self.policies),
            ("tool_permissions.json", ToolPermission, self.tool_permissions),
            ("kb_permissions.json", KnowledgeBasePermission, self.kb_permissions),
            ("db_permissions.json", DatabasePermission, self.db_permissions),
            ("ldap_configs.json", LDAPConfig, self.ldap_configs),
            ("oauth_configs.json", OAuthConfig, self.oauth_configs),
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
                except Exception as e:
                    print(f"⚠️ Error loading {filename}: {e}")
        
        # Load audit logs from JSON only if database loading failed
        if not db_audit_loaded:
            audit_path = os.path.join(security_dir, "audit_logs.json")
            if os.path.exists(audit_path):
                try:
                    with open(audit_path, encoding="utf-8") as f:
                        data = json.load(f)
                        self.audit_logs = []
                        for log_data in data:
                            try:
                                if 'action' in log_data and isinstance(log_data['action'], str):
                                    log_data['action'] = ActionType(log_data['action'])
                                if 'resource_type' in log_data and isinstance(log_data['resource_type'], str):
                                    log_data['resource_type'] = ResourceType(log_data['resource_type'])
                                self.audit_logs.append(AuditLog(**log_data))
                            except Exception:
                                pass
                except Exception as e:
                    print(f"⚠️ Error loading audit logs: {e}")
        
        # Ensure default roles exist
        self._ensure_default_roles()
    
    def _ensure_default_roles(self):
        """
        Ensure default system roles exist.
        Only adds roles if database is not available (fallback mode).
        If database roles exist, this method does nothing to avoid duplicates.
        """
        # Check if we have database roles (UUIDs) - if so, skip adding string ID roles
        has_database_roles = any(
            role_id not in ['role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer']
            for role_id in self.roles.keys()
        )
        
        if has_database_roles:
            # Database roles exist, don't add string ID roles
            return
        
        # No database roles - add defaults (fallback mode)
        for role_data in DEFAULT_ROLES:
            if role_data["id"] not in self.roles:
                role = Role(
                    org_id="org_default",
                    **role_data
                )
                self.roles[role.id] = role
                print(f"✨ Created missing default role: {role.name}")
    
    def reload_roles_from_database(self):
        """
        Reload roles from database only, clearing any roles loaded from files.
        This is useful when roles.json has been removed and we want to refresh
        the in-memory state without restarting the application.
        """
        import traceback
        from database.services import RoleService
        
        # Remove string ID roles first
        string_ids = ['role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer']
        removed_count = 0
        for role_id in string_ids:
            if role_id in self.roles:
                del self.roles[role_id]
                removed_count += 1
        
        # Clear all roles
        old_count = len(self.roles)
        self.roles.clear()
        
        # Load fresh from database
        try:
            db_roles = RoleService.get_all_roles()
            if db_roles:
                for role in db_roles:
                    self.roles[role.id] = role
            else:
                print("⚠️  No roles found in database")
        except Exception as e:
            print(f"❌ Error reloading roles from database: {e}")
            traceback.print_exc()
            raise
    
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
        
        # Save to database immediately
        try:
            from database.services import AuditService
            AuditService.save_audit_log(log)
        except Exception as e:
            # Fallback: keep in memory, will be saved to disk on next save_to_disk()
            pass
        
        # Auto-save periodically (for disk backup)
        if len(self.audit_logs) % 100 == 0:
            self.save_to_disk()
        
        return log
    
    def get_user_by_email(self, email: str, org_id: Optional[str] = None) -> Optional[User]:
        """Find user by email - checks security_state first, then database"""
        email_lower = email.lower()
        
        # First, check in-memory cache (security_state)
        for user in self.users.values():
            if user.email.lower() == email_lower:
                if org_id is None or user.org_id == org_id:
                    return user
        
        # If not found in cache, try to load from database
        try:
            from database.services import UserService
            import uuid as uuid_lib
            
            # Convert org_id to UUID if needed
            org_uuid = None
            if org_id:
                try:
                    org_uuid = uuid_lib.UUID(org_id) if isinstance(org_id, str) else org_id
                except ValueError:
                    # If org_id is not a valid UUID (e.g., "org_default"), try to find org by slug
                    from database.services import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    org_obj = next((o for o in orgs if o.slug == org_id or o.id == org_id), None)
                    if org_obj:
                        org_uuid = uuid_lib.UUID(org_obj.id)
            
            db_users = UserService.get_all_users()
            for db_user in db_users:
                if db_user.email.lower() == email_lower:
                    # Compare org_id (handle both UUID and string like "org_default")
                    try:
                        db_org_uuid = uuid_lib.UUID(db_user.org_id) if isinstance(db_user.org_id, str) else db_user.org_id
                    except (ValueError, AttributeError):
                        # If org_id is not a valid UUID, try to resolve it
                        from database.services import OrganizationService
                        orgs = OrganizationService.get_all_organizations()
                        db_org_obj = next((o for o in orgs if o.slug == db_user.org_id or o.id == db_user.org_id), None)
                        if db_org_obj:
                            db_org_uuid = uuid_lib.UUID(db_org_obj.id)
                        else:
                            db_org_uuid = None
                    
                    if org_uuid is None or db_org_uuid == org_uuid:
                        # Add to security_state cache
                        self.users[db_user.id] = db_user
                        return db_user
        except Exception as e:
            print(f"⚠️  [SECURITY_STATE] Failed to load user from database: {e}")
            import traceback
            traceback.print_exc()
        
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
