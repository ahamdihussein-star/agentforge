"""
AgentForge Security API Endpoints - Complete Enterprise Implementation
======================================================================
REST API for all security operations including:
- Authentication (Local, OAuth, LDAP)
- MFA (TOTP, SMS, Email)
- User Management
- Role Management (RBAC)
- Policy Management (ABAC)
- Resource Permissions (Tools, KB, DB)
- Security Settings
- Audit Trail
- SSO Integration
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import secrets
import json
import csv
import io
import os
import httpx

# Import from core.security module
from core.security import (
    security_state,
    User, UserProfile, UserMFA, UserStatus, AuthProvider, MFAMethod,
    Organization, Department, UserGroup, Role, Policy, PolicyRule, PolicyCondition,
    ToolPermission, KnowledgeBasePermission, DatabasePermission,
    Session, Invitation, AuditLog, LDAPConfig, SecuritySettings,
    PasswordService, MFAService, TokenService, EmailService, LDAPService, OAuthService,
    ActionType, ResourceType, Permission, DataClassification, TenancyMode,
    DEFAULT_ROLES
)

router = APIRouter(prefix="/api/security", tags=["Security"])
security_bearer = HTTPBearer(auto_error=False)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def save_user_to_db(user: User):
    """Save user to database with fallback to disk"""
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 User saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()

def save_invitation_to_db(invitation: Invitation):
    """Save invitation to database with fallback to disk"""
    try:
        from database.services import InvitationService
        InvitationService.save_invitation(invitation)
        print(f"💾 Invitation saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()

def save_audit_log_to_db(log: AuditLog):
    """Save audit log to database with fallback to disk"""
    try:
        from database.services import AuditService
        AuditService.save_audit_log(log)
        print(f"💾 Audit log saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

# Auth Requests
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    org_id: Optional[str] = None
    invitation_token: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    org_id: Optional[str] = None
    mfa_code: Optional[str] = None
    remember_me: bool = False

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class FirstLoginPasswordChangeRequest(BaseModel):
    """Request model for first-login password change"""
    new_password: str
    confirm_password: str

class AcceptInvitationRequest(BaseModel):
    token: str
    first_name: str
    last_name: str
    password: str

class ConfirmResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# MFA Requests
class EnableMFARequest(BaseModel):
    method: MFAMethod = MFAMethod.TOTP

class VerifyMFARequest(BaseModel):
    code: str

class DisableMFARequest(BaseModel):
    password: str
    code: Optional[str] = None  # Optional - password is enough for security

# User Requests
class CreateUserRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    password: Optional[str] = None
    role_ids: List[str] = ["role_user"]
    department_id: Optional[str] = None
    group_ids: List[str] = []
    send_invitation: bool = True

class UpdateUserRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    department_id: Optional[str] = None
    role_ids: Optional[List[str]] = None
    group_ids: Optional[List[str]] = None
    status: Optional[UserStatus] = None
    user_metadata: Optional[Dict[str, Any]] = None  # Custom profile fields (dynamic)

class InviteUserRequest(BaseModel):
    email: EmailStr
    role_ids: List[str] = []
    group_ids: List[str] = []
    department_id: Optional[str] = None
    message: Optional[str] = None
    expires_in_days: int = 7
    has_admin_access: bool = False    # Can access Admin Portal
    has_enduser_access: bool = True   # Can access End User Portal

class BulkInviteRequest(BaseModel):
    emails: List[EmailStr]
    role_ids: List[str] = ["role_user"]
    department_id: Optional[str] = None
    message: Optional[str] = None

# Role Requests
class CreateRoleRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    parent_id: Optional[str] = None

class UpdateRoleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    parent_id: Optional[str] = None

# Policy Requests
class PolicyConditionRequest(BaseModel):
    attribute: str
    operator: str
    value: Any

class PolicyRuleRequest(BaseModel):
    conditions: List[PolicyConditionRequest]
    logic: str = "AND"

class CreatePolicyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    resource_type: ResourceType
    resource_ids: List[str] = []
    actions: List[str] = []
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    rules: List[PolicyRuleRequest] = []
    effect: str = "allow"
    priority: int = 100

class UpdatePolicyRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    resource_ids: Optional[List[str]] = None
    actions: Optional[List[str]] = None
    role_ids: Optional[List[str]] = None
    user_ids: Optional[List[str]] = None
    group_ids: Optional[List[str]] = None
    rules: Optional[List[PolicyRuleRequest]] = None
    effect: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

# Permission Requests
class ToolPermissionRequest(BaseModel):
    tool_id: str
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    can_view: bool = True
    can_execute: bool = True
    can_edit: bool = False
    can_delete: bool = False
    allowed_actions: List[str] = []
    denied_actions: List[str] = []
    rate_limit: Optional[int] = None
    daily_limit: Optional[int] = None
    allowed_hours_start: Optional[int] = None
    allowed_hours_end: Optional[int] = None

class KBPermissionRequest(BaseModel):
    kb_id: str
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    allowed_document_ids: List[str] = []
    denied_document_ids: List[str] = []
    allowed_categories: List[str] = []
    denied_categories: List[str] = []
    max_classification: DataClassification = DataClassification.INTERNAL
    can_search: bool = True
    can_view_full_content: bool = True
    can_download: bool = False
    can_upload: bool = False
    can_delete: bool = False

class DBPermissionRequest(BaseModel):
    tool_id: str
    role_ids: List[str] = []
    user_ids: List[str] = []
    group_ids: List[str] = []
    allowed_tables: List[str] = []
    denied_tables: List[str] = []
    column_permissions: Dict[str, Dict[str, bool]] = {}
    row_filters: Dict[str, str] = {}
    can_select: bool = True
    can_insert: bool = False
    can_update: bool = False
    can_delete: bool = False
    max_rows_returned: int = 1000

# Department & Group Requests
class CreateDepartmentRequest(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None

class CreateGroupRequest(BaseModel):
    name: str
    description: Optional[str] = None
    user_ids: List[str] = []
    member_ids: List[str] = []  # Alias for user_ids
    role_ids: List[str] = []

# Settings Requests
class UpdateSecuritySettingsRequest(BaseModel):
    # Registration
    registration_mode: Optional[str] = None  # open, invite_only, disabled
    email_verification_required: Optional[bool] = None
    allowed_email_domains: Optional[List[str]] = None
    
    # Password Policy
    password_min_length: Optional[int] = None
    password_require_uppercase: Optional[bool] = None
    password_require_lowercase: Optional[bool] = None
    password_require_numbers: Optional[bool] = None
    password_require_symbols: Optional[bool] = None
    password_expiry_days: Optional[int] = None
    password_history_count: Optional[int] = None
    
    # Session
    session_timeout_minutes: Optional[int] = None
    remember_me_days: Optional[int] = None
    max_concurrent_sessions: Optional[int] = None
    force_logout_on_password_change: Optional[bool] = None
    
    # Security
    account_lockout_attempts: Optional[int] = None
    account_lockout_duration_minutes: Optional[int] = None
    mfa_enforcement: Optional[str] = None  # off, optional, required_admins, required_all
    ip_whitelist_enabled: Optional[bool] = None
    ip_whitelist: Optional[List[str]] = None
    
    # Audit
    audit_retention_days: Optional[int] = None
    audit_log_level: Optional[str] = None  # all, security_only

# LDAP Requests
class LDAPConfigRequest(BaseModel):
    name: str
    server_url: str
    bind_dn: str
    bind_password: str
    base_dn: str
    use_ssl: bool = False
    use_tls: bool = True
    user_search_filter: str = "(uid={username})"
    user_search_base: Optional[str] = None
    group_search_filter: str = "(objectClass=groupOfNames)"
    group_search_base: Optional[str] = None
    attribute_mapping: Dict[str, str] = {}
    group_role_mapping: Dict[str, str] = {}
    sync_enabled: bool = True
    sync_interval_hours: int = 24

# OAuth Requests
class OAuthConfigRequest(BaseModel):
    provider: AuthProvider
    client_id: str
    client_secret: str
    tenant_id: Optional[str] = None  # For Microsoft
    scopes: List[str] = []
    enabled: bool = True

# Response Models
class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int
    user: Dict[str, Any]
    requires_mfa: bool = False
    mfa_methods: List[str] = []
    must_change_password: bool = False

# ============================================================================
# AUTHENTICATION HELPERS
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer)
) -> Optional[User]:
    """Get current user from bearer token"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = TokenService.verify_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    session_id = payload.get("session_id")
    
    # Verify session is still active
    session = security_state.sessions.get(session_id)
    if not session or not session.is_active:
        return None
    
    # Check session timeout
    settings = security_state.get_settings()
    if settings.session_timeout_minutes > 0:
        last_activity = datetime.fromisoformat(session.last_activity)
        if datetime.utcnow() - last_activity > timedelta(minutes=settings.session_timeout_minutes):
            session.is_active = False
            return None
    
    user = security_state.users.get(user_id)
    
    # If user not in security_state, try to load from database
    if not user:
        try:
            from database.services import UserService
            import uuid as uuid_lib
            try:
                user_uuid = uuid_lib.UUID(user_id)
                db_users = UserService.get_all_users()
                user = next((u for u in db_users if u.id == user_id), None)
                if user:
                    # Add to security_state cache
                    security_state.users[user.id] = user
            except ValueError:
                print(f"⚠️  [AUTH] Invalid user_id format: {user_id}")
        except Exception as e:
            print(f"⚠️  [AUTH] Failed to load user from database: {e}")
            import traceback
            traceback.print_exc()
    
    if not user or user.status != UserStatus.ACTIVE:
        return None
    
    # Update last activity
    session.last_activity = datetime.utcnow().isoformat()
    user.last_active = datetime.utcnow().isoformat()
    
    # Save last_active to database
    try:
        from database.services import UserService
        UserService.save_user(user)
    except Exception as e:
        print(f"⚠️  [AUTH] Failed to save last_active to database: {e}")
    
    return user

# Alias for optional authentication (same as get_current_user, returns None if not authenticated)
get_current_user_optional = get_current_user

async def require_auth(user: User = Depends(get_current_user)) -> User:
    """Require authenticated user"""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(user: User = Depends(require_auth)) -> User:
    """Require admin user"""
    if not security_state.check_permission(user, Permission.USERS_EDIT.value):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: User = Depends(require_auth)) -> User:
    """Require super admin user"""
    if not security_state.check_permission(user, Permission.SYSTEM_ADMIN.value):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

def check_ip_whitelist(request: Request) -> bool:
    """Check if request IP is whitelisted"""
    settings = security_state.get_settings()
    if not settings.ip_whitelist_enabled:
        return True
    
    client_ip = request.client.host
    return client_ip in settings.ip_whitelist

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================



@router.get("/invitations")
async def list_invitations(user: User = Depends(require_admin)):
    """List all pending invitations"""
    invitations = []
    for inv in security_state.invitations.values():
        # Skip accepted invitations
        if inv.accepted_at:
            continue
        if inv.org_id == user.org_id:
            invitations.append({
                "id": inv.id,
                "email": inv.email,
                "role_ids": inv.role_ids,
                "roles": [security_state.roles[r].name for r in inv.role_ids if r in security_state.roles],
                "invited_by": inv.invited_by,
                "inviter_name": security_state.users.get(inv.invited_by, {}).get_display_name() if security_state.users.get(inv.invited_by) else "Unknown",
                "created_at": inv.created_at,
                "expires_at": inv.expires_at,
                "status": "expired" if inv.expires_at and datetime.fromisoformat(inv.expires_at) < datetime.utcnow() else "pending"
            })
    return {"invitations": invitations}

@router.post("/invitations/{invitation_id}/resend")
async def resend_invitation(invitation_id: str, user: User = Depends(require_admin)):
    """Resend an invitation email"""
    invitation = security_state.invitations.get(invitation_id)
    if not invitation or invitation.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Update expiry date
    invitation.expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    invitation.resend_count += 1
    
    # Save to database
    try:
        from database.services import InvitationService
        InvitationService.save_invitation(invitation)
        print(f"💾 Invitation updated in database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    # Resend email
    sent = await EmailService.send_invitation_email(invitation, user.get_display_name())
    
    return {"status": "success", "email_sent": sent}

@router.delete("/invitations/{invitation_id}")
async def delete_invitation(invitation_id: str, user: User = Depends(require_admin)):
    """Delete a pending invitation"""
    invitation = security_state.invitations.get(invitation_id)
    if not invitation or invitation.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    del security_state.invitations[invitation_id]
    
    # Delete from database
    try:
        from database.services import InvitationService
        InvitationService.delete_invitation(invitation_id)
        print(f"💾 Invitation deleted from database")
    except Exception as e:
        print(f"⚠️  Database delete failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.DELETE,
        resource_type=ResourceType.INVITATION,
        resource_id=invitation_id,
        resource_name=invitation.email
    )
    
    return {"status": "success"}

@router.post("/auth/register")
async def register(request: RegisterRequest, req: Request):
    """Register a new user"""
    settings = security_state.get_settings()
    
    # Check registration mode
    if settings.registration_mode == "disabled":
        raise HTTPException(status_code=403, detail="Registration is disabled")
    
    if settings.registration_mode == "invite_only" and not request.invitation_token:
        raise HTTPException(status_code=403, detail="Registration requires an invitation")
    
    # Check if email already exists
    if security_state.get_user_by_email(request.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check email domain restrictions
    if settings.allowed_email_domains:
        email_domain = request.email.split('@')[1].lower()
        if email_domain not in [d.lower() for d in settings.allowed_email_domains]:
            raise HTTPException(status_code=400, detail="Email domain not allowed")
    
    # Validate password
    is_valid, errors = PasswordService.validate_password(request.password, settings)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": errors})
    
    # Determine organization
    org_id = request.org_id or "org_default"
    
    # Handle invitation
    role_ids = None  # Will be set below
    department_id = None
    
    if request.invitation_token:
        invitation = None
        for inv in security_state.invitations.values():
            if inv.token == request.invitation_token and inv.email.lower() == request.email.lower():
                invitation = inv
                break
        
        if not invitation:
            raise HTTPException(status_code=400, detail="Invalid invitation token")
        
        if datetime.fromisoformat(invitation.expires_at) < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invitation has expired")
        
        if invitation.accepted_at:
            raise HTTPException(status_code=400, detail="Invitation already used")
        
        role_ids = invitation.role_ids or []
        department_id = invitation.department_id
        org_id = invitation.org_id
        invitation.accepted_at = datetime.utcnow().isoformat()
    else:
        # Self-registration: Get or create "User" role
        try:
            from database.services import RoleService
            user_role = RoleService.get_or_create_user_role(org_id)
            role_ids = [user_role.id]
        except Exception as e:
            print(f"⚠️  [REGISTER ERROR] Failed to get/create 'User' role: {e}")
            import traceback
            traceback.print_exc()
            # Fallback: try to find any role with name "User" in security_state
            for role_id, role in security_state.roles.items():
                if role.name.lower() == "user":
                    role_ids = [role.id]
                    break
            
            if not role_ids:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to assign default role to new user. Please contact administrator."
                )
    
    # Create user
    user = User(
        org_id=org_id,
        email=request.email.lower(),
        password_hash=PasswordService.hash_password(request.password),
        profile=UserProfile(
            first_name=request.first_name,
            last_name=request.last_name
        ),
        role_ids=role_ids,
        department_id=department_id,
        status=UserStatus.PENDING if settings.email_verification_required else UserStatus.ACTIVE,
        email_verified=not settings.email_verification_required,
        verification_token=secrets.token_urlsafe(32) if settings.email_verification_required else None
    )
    
    security_state.users[user.id] = user
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 [REGISTER] User saved to database: {user.email} (ID: {user.id[:8]}...)")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    # Send verification email if required
    if settings.email_verification_required:
        await EmailService.send_verification_email(user)
    
    # Log action
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        resource_name=user.email,
        details={"registration_method": "self" if not request.invitation_token else "invitation"}
    )
    
    return {
        "status": "success",
        "user_id": user.id,
        "email_verification_required": settings.email_verification_required
    }

@router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, req: Request):
    """Login with email and password"""
    settings = security_state.get_settings()
    
    # Check IP whitelist
    if not check_ip_whitelist(req):
        raise HTTPException(status_code=403, detail="Access denied from this IP address")
    
    # Find user (will check database if not in security_state cache)
    user = security_state.get_user_by_email(request.email, request.org_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Ensure user MFA settings are loaded from database (refresh if needed)
    try:
        from database.services import UserService
        import uuid as uuid_lib
        try:
            user_uuid = uuid_lib.UUID(user.id)
            db_users = UserService.get_all_users()
            db_user = next((u for u in db_users if u.id == user.id), None)
            if db_user:
                # Update security_state cache with latest MFA settings from database
                security_state.users[user.id] = db_user
                user = db_user
        except ValueError:
            print(f"⚠️  [LOGIN] Invalid user_id format: {user.id}")
    except Exception as e:
        print(f"⚠️  [LOGIN] Failed to refresh user from database: {e}")
        import traceback
        traceback.print_exc()
    
    # Check if account is locked
    if user.status == UserStatus.LOCKED:
        if user.locked_until:
            lock_until = datetime.fromisoformat(user.locked_until)
            if datetime.utcnow() < lock_until:
                remaining = int((lock_until - datetime.utcnow()).total_seconds() / 60)
                raise HTTPException(status_code=423, detail=f"Account locked. Try again in {remaining} minutes")
            else:
                user.status = UserStatus.ACTIVE
                user.failed_login_attempts = 0
                user.locked_until = None
    
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(status_code=403, detail="Account suspended. Contact administrator")
    
    if user.status == UserStatus.PENDING:
        raise HTTPException(status_code=403, detail="Please verify your email first")
    
    # Verify password
    if not PasswordService.verify_password(request.password, user.password_hash):
        user.failed_login_attempts += 1
        
        # Check lockout
        if settings.account_lockout_attempts > 0 and user.failed_login_attempts >= settings.account_lockout_attempts:
            user.status = UserStatus.LOCKED
            user.locked_until = (datetime.utcnow() + timedelta(minutes=settings.account_lockout_duration_minutes)).isoformat()
            save_user_to_db(user)
            
            security_state.add_audit_log(
                user=user,
                action=ActionType.LOGIN_FAILED,
                resource_type=ResourceType.USER,
                resource_id=user.id,
                details={"reason": "account_locked", "attempts": user.failed_login_attempts},
                success=False,
                ip_address=req.client.host
            )
            
            raise HTTPException(status_code=423, detail="Account locked due to too many failed attempts")
        
        save_user_to_db(user)
        
        security_state.add_audit_log(
            user=user,
            action=ActionType.LOGIN_FAILED,
            resource_type=ResourceType.USER,
            resource_id=user.id,
            details={"reason": "invalid_password", "attempts": user.failed_login_attempts},
            success=False,
            ip_address=req.client.host
        )
        
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check MFA requirement based on settings
    mfa_required = False
    
    # Super Admin bypass - skip MFA for system admins with non-real emails
    is_super_admin = security_state.check_permission(user, Permission.SYSTEM_ADMIN.value)
    if is_super_admin and (user.id == "user_super_admin" or not user.email or user.email.endswith("@local")):
        mfa_required = False  # Bypass MFA for super admin with fake email
    elif settings.mfa_enforcement == "all":
        mfa_required = True
    elif settings.mfa_enforcement == "admins":
        is_admin = security_state.check_permission(user, Permission.SYSTEM_ADMIN.value)
        mfa_required = is_admin
    elif settings.mfa_enforcement == "optional" and user.mfa.enabled:
        mfa_required = True
    
    
    if mfa_required and not request.mfa_code:
        # Auto-send email code
        code = MFAService.generate_email_code()
        user.mfa.email_code = code
        user.mfa.email_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        
        # Save to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            print(f"💾 [LOGIN] MFA email code saved to database for {user.email}")
        except Exception as e:
            print(f"⚠️  [LOGIN ERROR] Database save failed for MFA email code: {e}, saving to disk only")
            import traceback
            traceback.print_exc()
        
        security_state.save_to_disk()
        
        # Send email in background
        try:
            await EmailService.send_mfa_code(user, code)
            print(f"📧 [LOGIN] MFA code sent to {user.email}")
        except Exception as e:
            print(f"⚠️  [LOGIN] Failed to send MFA email: {e}")
        
        # Return MFA required response
        mfa_methods_list = [m.value for m in user.mfa.methods] if user.mfa and user.mfa.methods else ["email"]
        response = AuthResponse(
            access_token="",
            expires_in=0,
            user={"id": user.id, "email": user.email},
            requires_mfa=True,
            mfa_methods=mfa_methods_list
        )
        print(f"🔐 [LOGIN] MFA required for {user.email}, returning requires_mfa=True response")
        return response
    
    # Verify MFA if provided
    if mfa_required and request.mfa_code:
        # Refresh user from database to get latest MFA code
        try:
            from database.services import UserService
            # Use email to get user (more reliable than ID + org_id)
            org_id = user.org_id
            if org_id == "org_default":
                # Get actual org UUID
                from database.services import OrganizationService
                orgs = OrganizationService.get_all_organizations()
                if orgs:
                    org_id = orgs[0].id
            
            db_user = UserService.get_user_by_email(user.email, org_id)
            if db_user:
                # Update security_state cache with latest MFA settings from database
                security_state.users[user.id] = db_user
                user = db_user
                print(f"🔄 [LOGIN] Refreshed user from database for MFA verification: {user.email}")
            else:
                print(f"⚠️  [LOGIN] User not found in database: {user.email}, org_id: {org_id}")
        except Exception as e:
            print(f"⚠️  [LOGIN] Failed to refresh user from database for MFA verification: {e}")
            import traceback
            traceback.print_exc()
        
        # Debug: Print MFA code info
        if user.mfa:
            print(f"🔍 [LOGIN MFA DEBUG] User: {user.email}, email_code: {user.mfa.email_code}, expires: {user.mfa.email_code_expires}")
            print(f"🔍 [LOGIN MFA DEBUG] Code provided: {request.mfa_code}")
        else:
            print(f"⚠️  [LOGIN MFA DEBUG] User {user.email} has no MFA object!")
        
        if not MFAService.verify_code(user, request.mfa_code):
            print(f"❌ [LOGIN] MFA code verification failed for {user.email}")
            raise HTTPException(status_code=401, detail="Invalid MFA code")
        
        print(f"✅ [LOGIN] MFA code verified successfully for {user.email}")
        user.mfa.last_used = datetime.utcnow().isoformat()
        
        # Save updated MFA state to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            security_state.users[user.id] = user
        except Exception as e:
            print(f"⚠️  [LOGIN ERROR] Failed to save MFA last_used to database: {e}")
            import traceback
            traceback.print_exc()
    
    
    # Check concurrent sessions
    if settings.max_concurrent_sessions > 0:
        active_sessions = [s for s in security_state.sessions.values() 
                         if s.user_id == user.id and s.is_active]
        if len(active_sessions) >= settings.max_concurrent_sessions:
            # Invalidate oldest session
            oldest = min(active_sessions, key=lambda s: s.created_at)
            oldest.is_active = False
    
    # Create session
    session = Session(
        user_id=user.id,
        org_id=user.org_id,
        ip_address=req.client.host,
        user_agent=req.headers.get("user-agent", ""),
        remember_me=request.remember_me
    )
    security_state.sessions[session.id] = session
    
    # Create tokens
    access_token = TokenService.create_access_token(user.id, user.org_id, session.id)
    refresh_token = TokenService.create_refresh_token(user.id, session.id) if request.remember_me else None
    
    # Update user
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    # Log successful login
    security_state.add_audit_log(
        user=user,
        action=ActionType.LOGIN,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        details={"remember_me": request.remember_me, "mfa_used": mfa_required},
        session=session,
        ip_address=req.client.host
    )
    
    # Prepare user data for response
    user_data = {
        "id": user.id,
        "email": user.email,
        "name": user.get_display_name(),
        "profile": user.profile.dict(),
        "status": user.status.value,
        "role_ids": user.role_ids,
        "roles": [security_state.roles[r].name for r in user.role_ids if r in security_state.roles],
        "permissions": list(security_state.get_user_permissions(user)),
        "department_id": user.department_id,
        "group_ids": user.group_ids,
        "org_id": user.org_id,
        "mfa_enabled": user.mfa.enabled, "must_change_password": user.must_change_password
    }
    
    expires_in = settings.remember_me_days * 86400 if request.remember_me else settings.session_timeout_minutes * 60
    
    # Log successful login with user info for debugging tool access
    print(f"✅ [LOGIN SUCCESS] User '{user.email}' logged in")
    print(f"   📋 User ID: {user.id}")
    print(f"   📋 Org ID: {user.org_id}")
    print(f"   📋 Roles: {user.role_ids}")
    print(f"   📋 Groups: {user.group_ids}")
    
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=user_data,
        must_change_password=user.must_change_password
    )

@router.post("/auth/logout")
async def logout(user: User = Depends(require_auth), credentials: HTTPAuthorizationCredentials = Depends(security_bearer)):
    """Logout current user"""
    if credentials:
        payload = TokenService.verify_token(credentials.credentials)
        if payload:
            session_id = payload.get("session_id")
            if session_id in security_state.sessions:
                security_state.sessions[session_id].is_active = False
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.LOGOUT,
        resource_type=ResourceType.USER,
        resource_id=user.id
    )
    
    security_state.save_to_disk()
    return {"status": "success"}

@router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token"""
    payload = TokenService.verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("user_id")
    session_id = payload.get("session_id")
    
    user = security_state.users.get(user_id)
    session = security_state.sessions.get(session_id)
    
    if not user or not session or not session.is_active:
        raise HTTPException(status_code=401, detail="Session expired")
    
    new_access_token = TokenService.create_access_token(user.id, user.org_id, session.id)
    
    return {
        "access_token": new_access_token,
        "token_type": "Bearer",
        "expires_in": TokenService.ACCESS_TOKEN_EXPIRE_HOURS * 3600
    }

@router.get("/auth/me")
async def get_current_user_info(user: User = Depends(require_auth)):
    """Get current user information - loads from database"""
    # Ensure user is loaded from database (refresh from DB to get latest MFA settings)
    try:
        from database.services import UserService
        import uuid as uuid_lib
        try:
            user_uuid = uuid_lib.UUID(user.id)
            db_users = UserService.get_all_users()
            db_user = next((u for u in db_users if u.id == user.id), None)
            if db_user:
                # Update security_state cache with latest data from database
                security_state.users[user.id] = db_user
                user = db_user
        except ValueError:
            print(f"⚠️  [API] Invalid user_id format: {user.id}")
    except Exception as e:
        print(f"⚠️  [API] Failed to refresh user from database: {e}")
        import traceback
        traceback.print_exc()
    
    # Get first MFA method for UI compatibility (UI expects mfa.method, not mfa_methods array)
    mfa_method = None
    if user.mfa and user.mfa.methods:
        mfa_method = user.mfa.methods[0].value if hasattr(user.mfa.methods[0], 'value') else str(user.mfa.methods[0])
    
    # Resolve ALL identity data from User Directory (DYNAMIC — includes custom attributes)
    identity_data = {}
    custom_attributes = {}
    try:
        from core.identity.service import UserDirectoryService
        _dir_service = UserDirectoryService()
        user_attrs = _dir_service.get_user(user.id, user.org_id)
        if user_attrs:
            identity_data = {
                "manager_id": user_attrs.manager_id,
                "manager_name": user_attrs.manager_name,
                "manager_email": user_attrs.manager_email,
                "employee_id": user_attrs.employee_id,
                "department_name": user_attrs.department_name,
                "job_title": user_attrs.job_title,
                "phone": user_attrs.phone,
                "first_name": user_attrs.first_name,
                "last_name": user_attrs.last_name,
                "is_manager": user_attrs.is_manager,
                "direct_report_count": user_attrs.direct_report_count,
                "group_names": user_attrs.group_names,
                "role_names": user_attrs.role_names,
            }
            # Include ALL custom attributes from HR/LDAP (national_id, hire_date, etc.)
            if user_attrs.custom_attributes and isinstance(user_attrs.custom_attributes, dict):
                custom_attributes = user_attrs.custom_attributes
    except Exception as e:
        print(f"⚠️  [API] Failed to load identity data: {e}")

    response = {
        "id": user.id,
        "email": user.email,
        "name": user.get_display_name(),
        "full_name": user.get_display_name(),
        "profile": user.profile.dict(),
        "status": user.status.value,
        "role_ids": user.role_ids,
        "roles": [security_state.roles[r].dict() for r in user.role_ids if r in security_state.roles],
        "permissions": list(security_state.get_user_permissions(user)),
        "department_id": user.department_id,
        "department": security_state.departments.get(user.department_id).dict() if user.department_id and user.department_id in security_state.departments else None,
        "group_ids": user.group_ids,
        "groups": [security_state.groups[g].dict() for g in user.group_ids if g in security_state.groups],
        "org_id": user.org_id,
        "mfa": {
            "enabled": user.mfa.enabled if user.mfa else False,
            "method": mfa_method,  # ✅ Singular method for UI compatibility
            "methods": [m.value for m in user.mfa.methods] if user.mfa and user.mfa.methods else []  # ✅ Array for backward compatibility
        },
        "mfa_enabled": user.mfa.enabled if user.mfa else False,  # ✅ Backward compatibility
        "mfa_methods": [m.value for m in user.mfa.methods] if user.mfa and user.mfa.methods else [],  # ✅ Backward compatibility
        "must_change_password": user.must_change_password,
        "last_login": user.last_login,
        "created_at": user.created_at
    }
    # Merge identity data (only non-None values)
    for k, v in identity_data.items():
        if v is not None:
            response[k] = v
    # Include custom_attributes dict for dynamic frontend access
    # This includes: HR/LDAP custom fields + built-in user_metadata fields
    if custom_attributes:
        response["custom_attributes"] = custom_attributes
    # Also include profile.custom_attributes for admin edit form
    if hasattr(user, 'profile') and hasattr(user.profile, 'custom_attributes') and user.profile.custom_attributes:
        if "custom_attributes" not in response:
            response["custom_attributes"] = {}
        # Merge (profile custom_attributes may overlap with identity custom_attributes)
        for k, v in user.profile.custom_attributes.items():
            if not k.startswith('mfa_') and not k.startswith('_') and k not in response.get("custom_attributes", {}):
                response.setdefault("custom_attributes", {})[k] = v
    return response

@router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, user: User = Depends(require_auth)):
    """Change user password"""
    settings = security_state.get_settings()
    
    # Verify current password
    if not PasswordService.verify_password(request.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Validate new password
    is_valid, errors = PasswordService.validate_password(request.new_password, settings)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": errors})
    
    # Check password history
    if settings.password_history_count > 0:
        if PasswordService.is_password_in_history(request.new_password, user):
            raise HTTPException(status_code=400, detail=f"Cannot reuse last {settings.password_history_count} passwords")
    
    # Update password
    old_hash = user.password_hash
    user.password_hash = PasswordService.hash_password(request.new_password)
    user.password_changed_at = datetime.utcnow().isoformat()
    user.must_change_password = False
    
    # Add to password history
    if not hasattr(user, 'password_history'):
        user.password_history = []
    user.password_history.append(old_hash)
    if len(user.password_history) > settings.password_history_count:
        user.password_history = user.password_history[-settings.password_history_count:]
    
    # Force logout if setting enabled
    if settings.force_logout_on_password_change:
        for session in security_state.sessions.values():
            if session.user_id == user.id:
                session.is_active = False
    
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.PASSWORD_CHANGE,
        resource_type=ResourceType.USER,
        resource_id=user.id
    )
    
    return {"status": "success"}

@router.post("/auth/first-login-password-change")
async def first_login_password_change(
    request: FirstLoginPasswordChangeRequest,
    user: User = Depends(require_auth)
):
    """Change password on first login."""
    settings = security_state.get_settings()
    if not user.must_change_password:
        raise HTTPException(status_code=400, detail="Password change not required")
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    is_valid, errors = PasswordService.validate_password(request.new_password, settings)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": errors})
    if PasswordService.verify_password(request.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from temporary password")
    user.password_hash = PasswordService.hash_password(request.new_password)
    user.password_changed_at = datetime.utcnow().isoformat()
    user.must_change_password = False
    security_state.save_to_disk()
    security_state.add_audit_log(user=user, action=ActionType.PASSWORD_CHANGE, resource_type=ResourceType.USER, resource_id=user.id, details={"reason": "first_login"})
    return {"status": "success", "message": "Password changed successfully"}

@router.post("/auth/forgot-password")
async def forgot_password(request: ResetPasswordRequest):
    """Request password reset"""
    user = security_state.get_user_by_email(request.email)
    
    # Always return success to prevent email enumeration
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_password_token = token
        user.reset_password_expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()
        security_state.save_to_disk()
        
        await EmailService.send_password_reset_email(user, token)
    
    return {"status": "success", "message": "If the email exists, a reset link has been sent"}

@router.post("/auth/reset-password")
async def reset_password(request: ConfirmResetPasswordRequest):
    """Reset password with token"""
    settings = security_state.get_settings()
    
    # Find user with token
    user = None
    for u in security_state.users.values():
        if hasattr(u, 'reset_password_token') and u.reset_password_token == request.token:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    if datetime.fromisoformat(user.reset_password_expires) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate new password
    is_valid, errors = PasswordService.validate_password(request.new_password, settings)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": errors})
    
    # Update password
    user.password_hash = PasswordService.hash_password(request.new_password)
    user.password_changed_at = datetime.utcnow().isoformat()
    user.reset_password_token = None
    user.reset_password_expires = None
    user.failed_login_attempts = 0
    if user.status == UserStatus.LOCKED:
        user.status = UserStatus.ACTIVE
    
    security_state.save_to_disk()
    
    return {"status": "success"}

@router.post("/auth/accept-invitation")
async def accept_invitation(request: AcceptInvitationRequest, req: Request):
    """Accept invitation and create account"""
    settings = security_state.get_settings()
    
    # Find invitation by token
    invitation = None
    for inv in security_state.invitations.values():
        if inv.token == request.token and not inv.accepted_at:
            invitation = inv
            break
    
    if not invitation:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")
    
    if datetime.fromisoformat(invitation.expires_at) < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Check if email already registered
    if security_state.get_user_by_email(invitation.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password
    is_valid, errors = PasswordService.validate_password(request.password, settings)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Password does not meet requirements", "errors": errors})
    
    # Create user with portal access from invitation
    user = User(
        org_id=invitation.org_id,
        email=invitation.email.lower(),
        password_hash=PasswordService.hash_password(request.password),
        profile=UserProfile(
            first_name=request.first_name,
            last_name=request.last_name
        ),
        role_ids=invitation.role_ids or [],
        group_ids=invitation.group_ids or [],
        department_id=invitation.department_id,
        has_admin_access=getattr(invitation, 'has_admin_access', False),
        has_enduser_access=getattr(invitation, 'has_enduser_access', True),
        status=UserStatus.ACTIVE,
        email_verified=True
    )
    
    security_state.users[user.id] = user
    
    # Save user to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 User saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    # Mark invitation as accepted
    invitation.accepted_at = datetime.utcnow().isoformat()
    # invitation.accepted_by = user.id
    
    # Save invitation to database
    try:
        from database.services import InvitationService
        InvitationService.save_invitation(invitation)
        print(f"💾 Invitation updated in database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        resource_name=user.email,
        details={"registration_method": "invitation"}
    )
    
    return {"status": "success", "message": "Account created successfully"}

class VerifyEmailRequest(BaseModel):
    token: str

@router.post("/auth/verify-email")
async def verify_email(request: VerifyEmailRequest):
    """Verify email with token"""
    token = request.token
    user = None
    for u in security_state.users.values():
        if u.verification_token == token:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    user.email_verified = True
    user.verification_token = None
    if user.status == UserStatus.PENDING:
        user.status = UserStatus.ACTIVE
    
    security_state.save_to_disk()
    
    return {"status": "success"}


class ResendVerificationRequest(BaseModel):
    email: str

@router.post("/auth/resend-verification")
async def resend_verification(request: ResendVerificationRequest):
    """Resend verification email"""
    user = security_state.get_user_by_email(request.email)
    
    if user and not user.email_verified:
        if not user.verification_token:
            user.verification_token = secrets.token_urlsafe(32)
            security_state.save_to_disk()
        
        await EmailService.send_verification_email(user)
    
    return {"status": "success", "message": "If the email exists and is unverified, a verification link has been sent"}

@router.post("/users/{user_id}/resend-verification")
async def admin_resend_verification(user_id: str, admin: User = Depends(require_admin)):
    """Admin: Resend verification email to a user"""
    user = security_state.users.get(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    if not user.verification_token:
        user.verification_token = secrets.token_urlsafe(32)
        security_state.save_to_disk()
    
    sent = await EmailService.send_verification_email(user)
    
    if sent:
        return {"status": "success", "message": f"Verification email sent to {user.email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email")

# ============================================================================
# MFA ENDPOINTS
# ============================================================================

@router.post("/mfa/enable")
async def enable_mfa(request: EnableMFARequest, user: User = Depends(require_auth)):
    """Enable MFA for user"""
    if request.method == MFAMethod.TOTP:
        secret = MFAService.generate_totp_secret()
        uri = MFAService.get_totp_uri(secret, user.email)
        
        user.mfa.totp_secret = secret
        user.mfa.totp_verified = False
        security_state.users[user.id] = user  # Update in-memory state
        
        # Save to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            print(f"💾 [MFA] MFA setup saved to database for {user.email}")
        except Exception as e:
            print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
            import traceback
            traceback.print_exc()
        
        security_state.save_to_disk()
        
        return {
            "method": "totp",
            "secret": secret,
            "uri": uri,
            "qr_code": MFAService.generate_qr_code(uri)
        }
    
    elif request.method == MFAMethod.EMAIL:
        code = MFAService.generate_email_code()
        user.mfa.email_code = code
        user.mfa.email_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        security_state.users[user.id] = user  # Update in-memory state
        
        # Save to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            print(f"💾 [MFA] MFA setup saved to database for {user.email}")
        except Exception as e:
            print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
            import traceback
            traceback.print_exc()
        
        security_state.save_to_disk()
        
        await EmailService.send_mfa_code(user, code)
        
        return {"method": "email", "message": "Verification code sent to your email"}
    
    elif request.method == MFAMethod.SMS:
        if not user.profile.phone:
            raise HTTPException(status_code=400, detail="Phone number required for SMS MFA")
        
        code = MFAService.generate_sms_code()
        user.mfa.sms_code = code
        user.mfa.sms_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
        security_state.users[user.id] = user  # Update in-memory state
        
        # Save to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            print(f"💾 [MFA] MFA setup saved to database for {user.email}")
        except Exception as e:
            print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
            import traceback
            traceback.print_exc()
        
        security_state.save_to_disk()
        
        # SMS sending would be implemented here
        # await SMSService.send_code(user.profile.phone, code)
        
        return {"method": "sms", "message": "Verification code sent to your phone"}
    
    raise HTTPException(status_code=400, detail="Unsupported MFA method")

@router.post("/mfa/verify")
async def verify_mfa_setup(request: VerifyMFARequest, user: User = Depends(require_auth)):
    """Verify and complete MFA setup"""
    
    # Check TOTP verification
    if user.mfa.totp_secret and not user.mfa.totp_verified:
        if MFAService.verify_totp(user.mfa.totp_secret, request.code):
            user.mfa.enabled = True
            user.mfa.totp_verified = True
            if MFAMethod.TOTP not in user.mfa.methods:
                user.mfa.methods.append(MFAMethod.TOTP)
            
            # Generate backup codes
            backup_codes = MFAService.generate_backup_codes()
            user.mfa.backup_codes = [PasswordService.hash_password(c) for c in backup_codes]
            
            security_state.users[user.id] = user  # Update in-memory state
            
            # Save to database
            try:
                from database.services import UserService
                UserService.save_user(user)
                print(f"💾 [MFA] MFA enabled and saved to database for {user.email} (TOTP)")
            except Exception as e:
                print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
                import traceback
                traceback.print_exc()
            
            security_state.save_to_disk()
            
            security_state.add_audit_log(
                user=user,
                action=ActionType.MFA_ENABLED,
                resource_type=ResourceType.USER,
                resource_id=user.id,
                details={"method": "totp"}
            )
            
            return {
                "status": "success",
                "backup_codes": backup_codes,
                "message": "Save these backup codes in a safe place"
            }
    
    # Check Email verification
    if user.mfa.email_code:
        # Check if code is expired
        if user.mfa.email_code_expires:
            expires = datetime.fromisoformat(user.mfa.email_code_expires)
            if datetime.utcnow() > expires:
                raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
        
        if user.mfa.email_code == request.code:
            user.mfa.enabled = True
            if MFAMethod.EMAIL not in user.mfa.methods:
                user.mfa.methods.append(MFAMethod.EMAIL)
            
            # Clear email code
            user.mfa.email_code = None
            user.mfa.email_code_expires = None
            
            # Generate backup codes
            backup_codes = MFAService.generate_backup_codes()
            user.mfa.backup_codes = [PasswordService.hash_password(c) for c in backup_codes]
            
            security_state.users[user.id] = user  # Update in-memory state
            
            # Save to database
            try:
                from database.services import UserService
                UserService.save_user(user)
                print(f"💾 [MFA] MFA enabled and saved to database for {user.email} (Email)")
            except Exception as e:
                print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
                import traceback
                traceback.print_exc()
            
            security_state.save_to_disk()
            
            security_state.add_audit_log(
                user=user,
                action=ActionType.MFA_ENABLED,
                resource_type=ResourceType.USER,
                resource_id=user.id,
                details={"method": "email"}
            )
            
            return {
                "status": "success",
                "backup_codes": backup_codes,
                "message": "Save these backup codes in a safe place"
            }
    
    raise HTTPException(status_code=400, detail="Invalid verification code")


@router.post("/mfa/send-login-code")
async def send_mfa_login_code(request: LoginRequest, req: Request):
    """Send MFA code for login (Email method)"""
    # Find user (will check database if not in security_state cache)
    user = security_state.get_user_by_email(request.email, request.org_id)
    
    if not user:
        # Don't reveal if user exists
        return {"status": "success", "message": "If the account exists, a code has been sent"}
    
    # Ensure user MFA settings are loaded from database (refresh if needed)
    try:
        from database.services import UserService
        import uuid as uuid_lib
        try:
            user_uuid = uuid_lib.UUID(user.id)
            db_users = UserService.get_all_users()
            db_user = next((u for u in db_users if u.id == user.id), None)
            if db_user:
                # Update security_state cache with latest MFA settings from database
                security_state.users[user.id] = db_user
                user = db_user
        except ValueError:
            print(f"⚠️  [MFA_SEND] Invalid user_id format: {user.id}")
    except Exception as e:
        print(f"⚠️  [MFA_SEND] Failed to refresh user from database: {e}")
        import traceback
        traceback.print_exc()
    
    if not user.mfa.enabled or MFAMethod.EMAIL not in user.mfa.methods:
        raise HTTPException(status_code=400, detail="Email MFA not enabled for this account")
    
    # Verify password first
    if not PasswordService.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate and send code
    code = MFAService.generate_email_code()
    user.mfa.email_code = code
    user.mfa.email_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    security_state.save_to_disk()
    
    await EmailService.send_mfa_code(user, code)
    
    return {"status": "success", "message": "Verification code sent to your email"}


@router.post("/mfa/user-toggle")
async def toggle_user_mfa(request: dict, user: User = Depends(require_auth)):
    """Allow user to toggle their own MFA (if permitted by admin)"""
    settings = security_state.get_settings()
    
    # Check if opt-out is allowed
    if not settings.mfa_allow_user_optout:
        raise HTTPException(status_code=403, detail="MFA opt-out is not allowed by your administrator")
    
    enabled = request.get('enabled', True)
    
    if enabled:
        # Enable MFA for user
        user.mfa.enabled = True
        if MFAMethod.EMAIL not in user.mfa.methods:
            user.mfa.methods.append(MFAMethod.EMAIL)
    else:
        # Disable MFA for user
        user.mfa.enabled = False
    
    security_state.users[user.id] = user  # Update in-memory state
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 [MFA] MFA toggled and saved to database for {user.email} (enabled: {enabled})")
    except Exception as e:
        print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
    
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.MFA_ENABLED if enabled else ActionType.MFA_DISABLED,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        details={"method": "user_toggle", "enabled": enabled}
    )
    
    return {"status": "success", "mfa_enabled": enabled}

@router.post("/mfa/disable")
async def disable_mfa(request: DisableMFARequest, user: User = Depends(require_auth)):
    """Disable MFA - requires password confirmation only (user is already authenticated)"""
    # Verify password
    if not PasswordService.verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # MFA code verification is optional - password is enough since user is already logged in
    # If code is provided, verify it for extra security
    if request.code:
        if not MFAService.verify_code(user, request.code):
            raise HTTPException(status_code=401, detail="Invalid MFA code")
    
    user.mfa.enabled = False
    user.mfa.methods = []
    user.mfa.totp_secret = None
    user.mfa.totp_verified = False
    user.mfa.backup_codes = []
    
    security_state.users[user.id] = user  # Update in-memory state
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 [MFA] MFA disabled and saved to database for {user.email}")
    except Exception as e:
        print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
    
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.MFA_DISABLED,
        resource_type=ResourceType.USER,
        resource_id=user.id
    )
    
    return {"status": "success"}

@router.get("/mfa/backup-codes")
async def regenerate_backup_codes(user: User = Depends(require_auth)):
    """Regenerate backup codes"""
    if not user.mfa.enabled:
        raise HTTPException(status_code=400, detail="MFA is not enabled")
    
    backup_codes = MFAService.generate_backup_codes()
    user.mfa.backup_codes = [PasswordService.hash_password(c) for c in backup_codes]
    
    security_state.users[user.id] = user  # Update in-memory state
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 [MFA] Backup codes regenerated and saved to database for {user.email}")
    except Exception as e:
        print(f"⚠️  [MFA ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
    
    security_state.save_to_disk()
    
    return {"backup_codes": backup_codes}

# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/users")
async def list_users(
    user: User = Depends(require_auth),
    page: int = 1,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[UserStatus] = None,
    role_id: Optional[str] = None,
    department_id: Optional[str] = None
):
    """List users with filtering"""
    if not security_state.check_permission(user, Permission.USERS_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    users = [u for u in security_state.users.values() if u.org_id == user.org_id]
    
    # Apply filters
    if search:
        search_lower = search.lower()
        users = [u for u in users if 
                search_lower in u.email.lower() or 
                search_lower in u.profile.first_name.lower() or 
                search_lower in u.profile.last_name.lower()]
    
    if status:
        users = [u for u in users if u.status == status]
    
    if role_id:
        users = [u for u in users if role_id in u.role_ids]
    
    if department_id:
        users = [u for u in users if u.department_id == department_id]
    
    # Pagination
    total = len(users)
    start = (page - 1) * limit
    end = start + limit
    users = users[start:end]
    
    return {
        "users": [{
            "id": u.id,
            "email": u.email,
            "name": u.get_display_name(),
            "profile": u.profile.dict(),
            "status": u.status.value,
            "role_ids": u.role_ids,
            "roles": [security_state.roles[r].name for r in u.role_ids if r in security_state.roles],
            "department_id": u.department_id,
            "department": security_state.departments.get(u.department_id, {}).name if u.department_id else None,
            "manager_id": getattr(u, 'manager_id', None),
            "employee_id": getattr(u, 'employee_id', None),
            "job_title": getattr(u.profile, 'job_title', None) if u.profile else None,
            "mfa_enabled": u.mfa.enabled,
            "last_login": u.last_login,
            "created_at": u.created_at
        } for u in users],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/users/{user_id}")
async def get_user(user_id: str, user: User = Depends(require_auth)):
    """Get user details"""
    is_self = user.id == user_id
    if not is_self and not security_state.check_permission(user, Permission.USERS_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    target_user = security_state.users.get(user_id)
    if not target_user or target_user.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": target_user.id,
        "email": target_user.email,
        "name": target_user.get_display_name(),
        "profile": target_user.profile.dict(),
        "status": target_user.status.value,
        "role_ids": target_user.role_ids,
        "roles": [security_state.roles[r].dict() for r in target_user.role_ids if r in security_state.roles],
        "department_id": target_user.department_id,
        "group_ids": target_user.group_ids,
        "mfa_enabled": target_user.mfa.enabled,
        "email_verified": target_user.email_verified,
        "last_login": target_user.last_login,
        "last_active": target_user.last_active,
        "created_at": target_user.created_at,
        "created_by": target_user.created_by
    }

@router.post("/users")
async def create_user(request: CreateUserRequest, user: User = Depends(require_admin)):
    """Create a new user"""
    if security_state.get_user_by_email(request.email):
        raise HTTPException(status_code=400, detail="Email already exists")
    
    password = request.password or PasswordService.generate_temp_password()
    
    new_user = User(
        org_id=user.org_id,
        email=request.email.lower(),
        password_hash=PasswordService.hash_password(password),
        profile=UserProfile(
            first_name=request.first_name,
            last_name=request.last_name
        ),
        role_ids=request.role_ids,
        department_id=request.department_id,
        group_ids=request.group_ids,
        status=UserStatus.ACTIVE if not request.send_invitation else UserStatus.PENDING,
        email_verified=not request.send_invitation,
        must_change_password=True,
        created_by=user.id
    )
    
    security_state.users[new_user.id] = new_user
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(new_user)
        print(f"💾 User saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    if request.send_invitation:
        await EmailService.send_welcome_email(new_user, password)
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.USER,
        resource_id=new_user.id,
        resource_name=new_user.email
    )
    
    return {
        "status": "success",
        "user": {"id": new_user.id, "email": new_user.email},
        "temp_password": password if not request.send_invitation else None
    }

@router.put("/users/{user_id}")
async def update_user(user_id: str, request: UpdateUserRequest, user: User = Depends(require_auth)):
    """Update user"""
    is_self = user.id == user_id
    if not is_self and not security_state.check_permission(user, Permission.USERS_EDIT.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    target_user = security_state.users.get(user_id)
    if not target_user or target_user.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    changes = {}
    
    # Update profile fields (self or admin)
    print(f"📝 [PROFILE UPDATE] Updating profile for user: {target_user.email}")
    print(f"   Request data: first_name={request.first_name}, last_name={request.last_name}, display_name={request.display_name}")
    
    if request.first_name is not None:
        changes["first_name"] = {"old": target_user.profile.first_name, "new": request.first_name}
        target_user.profile.first_name = request.first_name
        print(f"   ✅ Updated first_name: {request.first_name}")
    if request.last_name is not None:
        changes["last_name"] = {"old": target_user.profile.last_name, "new": request.last_name}
        target_user.profile.last_name = request.last_name
        print(f"   ✅ Updated last_name: {request.last_name}")
    if request.display_name is not None:
        target_user.profile.display_name = request.display_name
        print(f"   ✅ Updated display_name: {request.display_name}")
    if request.phone is not None:
        target_user.profile.phone = request.phone
    if request.job_title is not None:
        target_user.profile.job_title = request.job_title
    if request.timezone is not None:
        target_user.profile.timezone = request.timezone
    if request.language is not None:
        target_user.profile.language = request.language
    
    # Admin-only updates
    if security_state.check_permission(user, Permission.USERS_EDIT.value):
        if request.department_id is not None:
            changes["department_id"] = {"old": target_user.department_id, "new": request.department_id}
            target_user.department_id = request.department_id
        if request.role_ids is not None:
            changes["role_ids"] = {"old": target_user.role_ids, "new": request.role_ids}
            target_user.role_ids = request.role_ids
        if request.group_ids is not None:
            target_user.group_ids = request.group_ids
        if request.status is not None:
            changes["status"] = {"old": target_user.status.value, "new": request.status.value}
            target_user.status = request.status
    
    # Custom profile fields (user_metadata) — available to both self and admin
    if request.user_metadata is not None:
        # Merge with existing metadata (so partial updates work)
        if not hasattr(target_user.profile, 'custom_attributes'):
            target_user.profile.custom_attributes = {}
        target_user.profile.custom_attributes = request.user_metadata
        changes["user_metadata"] = {"updated": True}
        print(f"   ✅ Updated custom profile fields: {list(request.user_metadata.keys())}")
    
    target_user.updated_at = datetime.utcnow().isoformat()
    
    # Update in-memory state
    security_state.users[target_user.id] = target_user
    
    # Save to database
    print(f"💾 [API] Updating user in database: {target_user.email} (ID: {user_id[:8]}...)")
    print(f"   📝 Profile fields: first_name={target_user.profile.first_name if target_user.profile else 'N/A'}, last_name={target_user.profile.last_name if target_user.profile else 'N/A'}, display_name={target_user.profile.display_name if target_user.profile else 'N/A'}")
    print(f"   🔐 MFA enabled: {target_user.mfa.enabled if target_user.mfa else False}")
    print(f"   📊 Final profile: first_name={target_user.profile.first_name}, last_name={target_user.profile.last_name}, display_name={target_user.profile.display_name}")
    
    try:
        from database.services import UserService
        saved_user = UserService.save_user(target_user)
        print(f"   ✅ User saved to database successfully")
        print(f"   📊 DB response: first_name={saved_user.profile.first_name if saved_user and saved_user.profile else 'N/A'}, last_name={saved_user.profile.last_name if saved_user and saved_user.profile else 'N/A'}")
    except Exception as e:
        print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target_user.id,
        resource_name=target_user.email,
        changes=changes if changes else None
    )
    
    # Return the updated user data so frontend can use it immediately
    return {
        "status": "success", 
        "user": {
            "id": target_user.id,
            "name": target_user.get_display_name(),
            "profile": {
                "first_name": target_user.profile.first_name,
                "last_name": target_user.profile.last_name,
                "display_name": target_user.profile.display_name
            }
        }
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: User = Depends(require_admin)):
    """Delete user"""
    if user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    target_user = security_state.users.get(user_id)
    if not target_user or target_user.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Invalidate all sessions
    for session in security_state.sessions.values():
        if session.user_id == user_id:
            session.is_active = False
    
    del security_state.users[user_id]
    
    # Delete from database
    try:
        from database.services import UserService
        UserService.delete_user(user_id, user.org_id)
        print(f"💾 User deleted from database")
    except Exception as e:
        print(f"⚠️  Database delete failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.DELETE,
        resource_type=ResourceType.USER,
        resource_id=user_id,
        resource_name=target_user.email
    )
    
    return {"status": "success"}

@router.post("/users/invite")
async def invite_user(request: InviteUserRequest, user: User = Depends(require_admin)):
    """Invite a new user"""
    if security_state.get_user_by_email(request.email):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Check for existing pending invitation
    for inv in security_state.invitations.values():
        if inv.email.lower() == request.email.lower() and not inv.accepted_at:
            raise HTTPException(status_code=400, detail="Invitation already sent to this email")
    
    invitation = Invitation(
        org_id=user.org_id,
        email=request.email.lower(),
        role_ids=request.role_ids,
        group_ids=request.group_ids,
        department_id=request.department_id,
        invited_by=user.id,
        message=request.message,
        has_admin_access=request.has_admin_access,
        has_enduser_access=request.has_enduser_access,
        expires_at=(datetime.utcnow() + timedelta(days=request.expires_in_days)).isoformat()
    )
    
    security_state.invitations[invitation.id] = invitation
    
    # Save to database
    try:
        from database.services import InvitationService
        InvitationService.save_invitation(invitation)
        print(f"💾 Invitation saved to database")
    except Exception as e:
        print(f"⚠️  Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    await EmailService.send_invitation_email(invitation, user)
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.USER,
        resource_id=invitation.id,
        resource_name=request.email,
        details={"type": "invitation"}
    )
    
    return {"status": "success", "invitation_id": invitation.id}

@router.post("/users/bulk-invite")
async def bulk_invite_users(request: BulkInviteRequest, user: User = Depends(require_admin)):
    """Invite multiple users"""
    results = {"success": [], "failed": []}
    
    for email in request.emails:
        try:
            if security_state.get_user_by_email(email):
                results["failed"].append({"email": email, "reason": "Already exists"})
                continue
            
            invitation = Invitation(
                org_id=user.org_id,
                email=email.lower(),
                role_ids=request.role_ids,
                department_id=request.department_id,
                invited_by=user.id,
                message=request.message
            )
            
            security_state.invitations[invitation.id] = invitation
            await EmailService.send_invitation_email(invitation, user)
            results["success"].append(email)
        except Exception as e:
            results["failed"].append({"email": email, "reason": str(e)})
    
    security_state.save_to_disk()
    
    return results

@router.get("/users/{user_id}/sessions")
async def get_user_sessions(user_id: str, user: User = Depends(require_auth)):
    """Get user's active sessions"""
    if user.id != user_id and not security_state.check_permission(user, Permission.USERS_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    sessions = [s for s in security_state.sessions.values() 
                if s.user_id == user_id and s.is_active]
    
    return {
        "sessions": [{
            "id": s.id,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at,
            "last_activity": s.last_activity
        } for s in sessions]
    }

@router.delete("/users/{user_id}/sessions/{session_id}")
async def revoke_session(user_id: str, session_id: str, user: User = Depends(require_auth)):
    """Revoke a specific session"""
    if user.id != user_id and not security_state.check_permission(user, Permission.USERS_EDIT.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    session = security_state.sessions.get(session_id)
    if not session or session.user_id != user_id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_active = False
    security_state.save_to_disk()
    
    return {"status": "success"}

# ============================================================================
# ROLE MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/roles")
async def list_roles(user: User = Depends(require_auth)):
    """List all roles"""
    if not security_state.check_permission(user, Permission.ROLES_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    roles = [r for r in security_state.roles.values() if r.org_id == user.org_id or r.is_system]
    
    # Count users per role
    role_user_counts = {}
    for u in security_state.users.values():
        for role_id in u.role_ids:
            role_user_counts[role_id] = role_user_counts.get(role_id, 0) + 1
    
    return {
        "roles": [{
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "permissions": r.permissions,
            "is_system": r.is_system,
            "level": r.level,
            "parent_id": r.parent_id,
            "user_count": role_user_counts.get(r.id, 0),
            "created_at": r.created_at
        } for r in sorted(roles, key=lambda x: x.level)]
    }

@router.delete("/roles/cleanup-string-ids")
async def cleanup_string_id_roles(user: User = Depends(require_super_admin)):
    """
    Emergency endpoint to reload roles from database only.
    This clears in-memory roles (including string ID roles from roles.json)
    and reloads fresh from the database.
    """
    try:
        old_count = len(security_state.roles)
        
        # Use the new reload method
        security_state.reload_roles_from_database()
        
        new_count = len(security_state.roles)
        
        return {
            "status": "success",
            "message": "Roles reloaded from database",
            "old_count": old_count,
            "new_count": new_count,
            "roles": [{
                "id": r.id,
                "name": r.name,
                "permissions_count": len(r.permissions)
            } for r in security_state.roles.values()]
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error reloading roles: {str(e)}")

@router.post("/roles/reload-from-database")
async def reload_roles_from_database(user: User = Depends(require_super_admin)):
    """
    Reload roles from database only (removes any roles loaded from roles.json).
    This endpoint clears the in-memory roles and reloads them fresh from the database.
    """
    try:
        from database.services import RoleService
        
        # Clear existing roles
        old_count = len(security_state.roles)
        security_state.roles.clear()
        
        # Load roles from database
        db_roles = RoleService.get_all_roles()
        if db_roles:
            for role in db_roles:
                security_state.roles[role.id] = role
        
        new_count = len(security_state.roles)
        
        # Remove string ID roles if any still exist
        string_ids = ['role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer']
        removed_string_ids = []
        for role_id in string_ids:
            if role_id in security_state.roles:
                del security_state.roles[role_id]
                removed_string_ids.append(role_id)
        
        return {
            "status": "success",
            "message": "Roles reloaded from database",
            "old_count": old_count,
            "new_count": new_count,
            "removed_string_ids": removed_string_ids,
            "roles": [{
                "id": r.id,
                "name": r.name,
                "permissions_count": len(r.permissions)
            } for r in security_state.roles.values()]
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error reloading roles: {str(e)}")


@router.get("/roles/{role_id}")
async def get_role(role_id: str, user: User = Depends(require_auth)):
    """Get role details"""
    if not security_state.check_permission(user, Permission.ROLES_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    role = security_state.roles.get(role_id)
    if not role or (role.org_id != user.org_id and not role.is_system):
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get users with this role
    users_with_role = [u for u in security_state.users.values() if role_id in u.role_ids]
    
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "permissions": role.permissions,
        "is_system": role.is_system,
        "level": role.level,
        "parent_id": role.parent_id,
        "users": [{"id": u.id, "email": u.email, "name": u.get_display_name()} for u in users_with_role],
        "created_at": role.created_at
    }

@router.post("/roles")
async def create_role(request: CreateRoleRequest, user: User = Depends(require_admin)):
    """Create a new role"""
    if not security_state.check_permission(user, Permission.ROLES_CREATE.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check for duplicate name
    for r in security_state.roles.values():
        if r.name.lower() == request.name.lower() and r.org_id == user.org_id:
            raise HTTPException(status_code=400, detail="Role with this name already exists")
    
    role = Role(
        org_id=user.org_id,
        name=request.name,
        description=request.description,
        permissions=request.permissions,
        parent_id=request.parent_id,
        created_by=user.id
    )
    
    security_state.roles[role.id] = role
    
    # Save to database (primary storage)
    print(f"💾 [API] Creating role in database: {role.name} (ID: {role.id[:8]}...)")
    try:
        from database.services import RoleService
        saved_role = RoleService.save_role(role)
    except Exception as e:
        print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.ROLE,
        resource_id=role.id,
        resource_name=role.name
    )
    
    return {"status": "success", "role": role.dict()}

@router.put("/roles/{role_id}")
async def update_role(role_id: str, request: UpdateRoleRequest, user: User = Depends(require_admin)):
    """Update a role"""
    print(f"   User: {user.email}")
    print(f"   User role_ids: {user.role_ids}")
    print(f"   Target role_id: {role_id}")
    print(f"   Request permissions: {len(request.permissions) if request.permissions else 0} permissions")
    
    # Check permission
    has_permission = security_state.check_permission(user, Permission.ROLES_EDIT.value)
    print(f"   Has ROLES_EDIT permission: {has_permission}")
    if not has_permission:
        print(f"   ❌ BLOCKED: No ROLES_EDIT permission")
        raise HTTPException(status_code=403, detail="Permission denied")
    
    role = security_state.roles.get(role_id)
    print(f"   Role found: {role is not None}")
    if role:
        print(f"   Role name: {role.name}")
        print(f"   Role org_id: {role.org_id}")
        print(f"   Role is_system: {role.is_system}")
        print(f"   Role level (raw): {role.level} (type: {type(role.level)})")
    
    if not role or (role.org_id != user.org_id and not role.is_system):
        print(f"   ❌ BLOCKED: Role not found or org mismatch")
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check role hierarchy - user can only edit roles with higher level (lower privilege)
    # Super Admin (level 0) can edit any role
    # Ensure all levels are int (might be string from database)
    user_levels = []
    for r_id in user.role_ids:
        if r_id in security_state.roles:
            r = security_state.roles[r_id]
            raw_level = r.level
            level = int(raw_level) if isinstance(raw_level, str) else raw_level
            user_levels.append(level)
            print(f"      Role {r.name} (ID: {r_id[:8]}...): level={raw_level} (raw) → {level} (int)")
        else:
            print(f"      ⚠️  Role ID {r_id} not found in security_state.roles")
    
    user_min_level = min(user_levels) if user_levels else 100
    
    # Ensure role level is int
    role_level_raw = role.level
    role_level = int(role_level_raw) if isinstance(role_level_raw, str) else role_level_raw
    
    print(f"\n   🔐 Hierarchy check:")
    print(f"      user_min_level: {user_min_level}")
    print(f"      role_level: {role_level}")
    print(f"      user_min_level == 0: {user_min_level == 0}")
    print(f"      role_level <= user_min_level: {role_level <= user_min_level}")
    
    if user_min_level == 0:
        # Super Admin can edit any role (including system roles)
        pass
    elif role_level <= user_min_level:
        print(f"   ❌ BLOCKED: role_level ({role_level}) <= user_min_level ({user_min_level})")
        raise HTTPException(status_code=403, detail="Cannot modify a role with equal or higher privilege than yours")
    
    # Allow editing system roles permissions, but not renaming them
    if role.is_system and request.name is not None and request.name != role.name:
        raise HTTPException(status_code=400, detail="Cannot rename system role")
    
    changes = {}
    
    if request.name is not None:
        changes["name"] = {"old": role.name, "new": request.name}
        role.name = request.name
    if request.description is not None:
        role.description = request.description
    if request.permissions is not None:
        changes["permissions"] = {"old": role.permissions, "new": request.permissions}
        role.permissions = request.permissions
    if request.parent_id is not None:
        role.parent_id = request.parent_id
    
    role.updated_at = datetime.utcnow().isoformat()
    print(f"🔧 [API] Updating role {role.name}: {len(role.permissions)} permissions")
    
    # Save to database (primary storage)
    print(f"💾 [API] Updating role in database: {role.name} (ID: {role.id[:8]}...)")
    try:
        from database.services import RoleService
        saved_role = RoleService.save_role(role)
    except Exception as e:
        print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.UPDATE,
        resource_type=ResourceType.ROLE,
        resource_id=role.id,
        resource_name=role.name,
        changes=changes if changes else None
    )
    
    return {"status": "success", "role": role.dict()}

@router.post("/roles/reset-defaults")
async def reset_default_roles(user: User = Depends(require_super_admin)):
    """Reset system roles to default permissions (Super Admin only)"""
    from core.security.models import DEFAULT_ROLES
    
    # Update only system roles with new defaults
    updated = 0
    for default_role in DEFAULT_ROLES:
        role_id = default_role["id"]
        if role_id in security_state.roles:
            role = security_state.roles[role_id]
            role.permissions = default_role["permissions"]
            role.description = default_role["description"]
            
            # Save to database
            print(f"💾 [API] Resetting role to defaults in database: {role.name} (ID: {role_id[:8]}...)")
            try:
                from database.services import RoleService
                RoleService.save_role(role)
            except Exception as e:
                print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
                import traceback
                traceback.print_exc()
                security_state.save_to_disk()
            
            updated += 1
    
    if updated > 0:
        security_state.save_to_disk()
    
    return {"message": f"Reset {updated} system roles to defaults", "updated": updated}

@router.post("/roles/fix-levels")
async def fix_role_levels_endpoint(user: User = Depends(require_super_admin)):
    """Fix role levels in database to match DEFAULT_ROLES hierarchy (Super Admin only)"""
    if not security_state.check_permission(user, Permission.SYSTEM_ADMIN.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    from database.base import get_db_session
    from core.security.models import DEFAULT_ROLES
    from sqlalchemy import text
    
    # Create mapping from role name to level
    name_to_level = {}
    for role_data in DEFAULT_ROLES:
        name_to_level[role_data['name']] = role_data.get('level', 100)
    
    updated_roles = []
    
    try:
        with get_db_session() as session:
            # Update Super Admin to level 0
            result1 = session.execute(
                text("UPDATE roles SET level = '0' WHERE name = 'Super Admin' RETURNING id, name, level")
            )
            super_admin = result1.fetchone()
            if super_admin:
                updated_roles.append({"id": str(super_admin[0]), "name": super_admin[1], "level": super_admin[2]})
            
            # Update Admin to level 1
            result2 = session.execute(
                text("UPDATE roles SET level = '1' WHERE name = 'Admin' RETURNING id, name, level")
            )
            admin = result2.fetchone()
            if admin:
                updated_roles.append({"id": str(admin[0]), "name": admin[1], "level": admin[2]})
            
            # Verify all roles
            result3 = session.execute(
                text("SELECT id, name, level FROM roles ORDER BY name")
            )
            all_roles = [{"id": str(r[0]), "name": r[1], "level": r[2]} for r in result3.fetchall()]
            
            session.commit()
            
            # Reload roles from database into security_state
            security_state.reload_roles_from_database()
            
            return {
                "status": "success",
                "updated": updated_roles,
                "all_roles": all_roles,
                "message": "Role levels fixed successfully. Please refresh the page."
            }
    except Exception as e:
        print(f"❌ Error in fix_role_levels_endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {e}")

@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: User = Depends(require_admin)):
    """Delete a role"""
    if not security_state.check_permission(user, Permission.ROLES_DELETE.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    role = security_state.roles.get(role_id)
    if not role or (role.org_id != user.org_id and not role.is_system):
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system role")
    
    # Remove role from users
    for u in security_state.users.values():
        if role_id in u.role_ids:
            u.role_ids.remove(role_id)
    
    # Delete from database (primary storage)
    print(f"🗑️  [API] Deleting role from database: {role.name} (ID: {role_id[:8]}...)")
    try:
        from database.services import RoleService
        RoleService.delete_role(role_id)
    except Exception as e:
        print(f"⚠️  [API ERROR] Database delete failed: {e}")
        import traceback
        traceback.print_exc()
    
    del security_state.roles[role_id]
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.DELETE,
        resource_type=ResourceType.ROLE,
        resource_id=role_id,
        resource_name=role.name
    )
    
    return {"status": "success"}

# ============================================================================
# POLICY MANAGEMENT ENDPOINTS (ABAC)
# ============================================================================

@router.get("/policies")
async def list_policies(
    user: User = Depends(require_admin),
    resource_type: Optional[ResourceType] = None
):
    """List all policies"""
    policies = [p for p in security_state.policies.values() if p.org_id == user.org_id]
    
    if resource_type:
        policies = [p for p in policies if p.resource_type == resource_type]
    
    return {
        "policies": [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "resource_type": p.resource_type.value,
            "effect": p.effect,
            "priority": p.priority,
            "is_active": p.is_active,
            "created_at": p.created_at
        } for p in sorted(policies, key=lambda x: x.priority)]
    }

@router.get("/policies/{policy_id}")
async def get_policy(policy_id: str, user: User = Depends(require_admin)):
    """Get policy details"""
    policy = security_state.policies.get(policy_id)
    if not policy or policy.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    return policy.dict()

@router.post("/policies")
async def create_policy(request: CreatePolicyRequest, user: User = Depends(require_admin)):
    """Create a new policy"""
    rules = [PolicyRule(
        conditions=[PolicyCondition(**c.dict()) for c in r.conditions],
        logic=r.logic
    ) for r in request.rules]
    
    policy = Policy(
        org_id=user.org_id,
        name=request.name,
        description=request.description,
        resource_type=request.resource_type,
        resource_ids=request.resource_ids,
        actions=request.actions,
        role_ids=request.role_ids,
        user_ids=request.user_ids,
        group_ids=request.group_ids,
        rules=rules,
        effect=request.effect,
        priority=request.priority,
        created_by=user.id
    )
    
    security_state.policies[policy.id] = policy
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.CREATE,
        resource_type=ResourceType.POLICY,
        resource_id=policy.id,
        resource_name=policy.name
    )
    
    return {"status": "success", "policy": policy.dict()}

@router.put("/policies/{policy_id}")
async def update_policy(policy_id: str, request: UpdatePolicyRequest, user: User = Depends(require_admin)):
    """Update a policy"""
    policy = security_state.policies.get(policy_id)
    if not policy or policy.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    if request.name is not None:
        policy.name = request.name
    if request.description is not None:
        policy.description = request.description
    if request.resource_ids is not None:
        policy.resource_ids = request.resource_ids
    if request.actions is not None:
        policy.actions = request.actions
    if request.role_ids is not None:
        policy.role_ids = request.role_ids
    if request.user_ids is not None:
        policy.user_ids = request.user_ids
    if request.group_ids is not None:
        policy.group_ids = request.group_ids
    if request.rules is not None:
        policy.rules = [PolicyRule(
            conditions=[PolicyCondition(**c.dict()) for c in r.conditions],
            logic=r.logic
        ) for r in request.rules]
    if request.effect is not None:
        policy.effect = request.effect
    if request.priority is not None:
        policy.priority = request.priority
    if request.is_active is not None:
        policy.is_active = request.is_active
    
    policy.updated_at = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.UPDATE,
        resource_type=ResourceType.POLICY,
        resource_id=policy.id,
        resource_name=policy.name
    )
    
    return {"status": "success", "policy": policy.dict()}

@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, user: User = Depends(require_admin)):
    """Delete a policy"""
    policy = security_state.policies.get(policy_id)
    if not policy or policy.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Policy not found")
    
    del security_state.policies[policy_id]
    security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.DELETE,
        resource_type=ResourceType.POLICY,
        resource_id=policy_id,
        resource_name=policy.name
    )
    
    return {"status": "success"}

# ============================================================================
# RESOURCE PERMISSIONS ENDPOINTS
# ============================================================================

# Tool Permissions
@router.get("/permissions/tools")
async def list_tool_permissions(user: User = Depends(require_admin)):
    """List all tool permissions"""
    perms = [p for p in security_state.tool_permissions.values() if p.org_id == user.org_id]
    return {"permissions": [p.dict() for p in perms]}

@router.post("/permissions/tools")
async def create_tool_permission(request: ToolPermissionRequest, user: User = Depends(require_admin)):
    """Create tool permission"""
    perm = ToolPermission(
        org_id=user.org_id,
        **request.dict()
    )
    security_state.tool_permissions[perm.id] = perm
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.put("/permissions/tools/{perm_id}")
async def update_tool_permission(perm_id: str, request: ToolPermissionRequest, user: User = Depends(require_admin)):
    """Update tool permission"""
    perm = security_state.tool_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    for key, value in request.dict().items():
        if hasattr(perm, key):
            setattr(perm, key, value)
    
    perm.updated_at = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.delete("/permissions/tools/{perm_id}")
async def delete_tool_permission(perm_id: str, user: User = Depends(require_admin)):
    """Delete tool permission"""
    perm = security_state.tool_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    del security_state.tool_permissions[perm_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

# Knowledge Base Permissions
@router.get("/permissions/kb")
async def list_kb_permissions(user: User = Depends(require_admin)):
    """List all KB permissions"""
    perms = [p for p in security_state.kb_permissions.values() if p.org_id == user.org_id]
    return {"permissions": [p.dict() for p in perms]}

@router.post("/permissions/kb")
async def create_kb_permission(request: KBPermissionRequest, user: User = Depends(require_admin)):
    """Create KB permission"""
    perm = KnowledgeBasePermission(
        org_id=user.org_id,
        **request.dict()
    )
    security_state.kb_permissions[perm.id] = perm
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.put("/permissions/kb/{perm_id}")
async def update_kb_permission(perm_id: str, request: KBPermissionRequest, user: User = Depends(require_admin)):
    """Update KB permission"""
    perm = security_state.kb_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    for key, value in request.dict().items():
        if hasattr(perm, key):
            setattr(perm, key, value)
    
    perm.updated_at = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.delete("/permissions/kb/{perm_id}")
async def delete_kb_permission(perm_id: str, user: User = Depends(require_admin)):
    """Delete KB permission"""
    perm = security_state.kb_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    del security_state.kb_permissions[perm_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

# Database Permissions
@router.get("/permissions/db")
async def list_db_permissions(user: User = Depends(require_admin)):
    """List all DB permissions"""
    perms = [p for p in security_state.db_permissions.values() if p.org_id == user.org_id]
    return {"permissions": [p.dict() for p in perms]}

@router.post("/permissions/db")
async def create_db_permission(request: DBPermissionRequest, user: User = Depends(require_admin)):
    """Create DB permission"""
    perm = DatabasePermission(
        org_id=user.org_id,
        **request.dict()
    )
    security_state.db_permissions[perm.id] = perm
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.put("/permissions/db/{perm_id}")
async def update_db_permission(perm_id: str, request: DBPermissionRequest, user: User = Depends(require_admin)):
    """Update DB permission"""
    perm = security_state.db_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    for key, value in request.dict().items():
        if hasattr(perm, key):
            setattr(perm, key, value)
    
    perm.updated_at = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    return {"status": "success", "permission": perm.dict()}

@router.delete("/permissions/db/{perm_id}")
async def delete_db_permission(perm_id: str, user: User = Depends(require_admin)):
    """Delete DB permission"""
    perm = security_state.db_permissions.get(perm_id)
    if not perm or perm.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    del security_state.db_permissions[perm_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

# ============================================================================
# DEPARTMENT & GROUP ENDPOINTS
# ============================================================================

@router.get("/departments")
async def list_departments(user: User = Depends(require_auth)):
    """List departments"""
    depts = [d for d in security_state.departments.values() if d.org_id == user.org_id]
    return {"departments": [d.dict() for d in depts]}

@router.post("/departments")
async def create_department(request: CreateDepartmentRequest, user: User = Depends(require_admin)):
    """Create department"""
    dept = Department(
        org_id=user.org_id,
        name=request.name,
        description=request.description,
        parent_id=request.parent_id,
        manager_id=request.manager_id
    )
    security_state.departments[dept.id] = dept
    security_state.save_to_disk()
    
    return {"status": "success", "department": dept.dict()}

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, user: User = Depends(require_admin)):
    """Delete department"""
    dept = security_state.departments.get(dept_id)
    if not dept or dept.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Remove department from users
    for u in security_state.users.values():
        if u.department_id == dept_id:
            u.department_id = None
    
    del security_state.departments[dept_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

@router.get("/groups")
async def list_groups(user: User = Depends(require_auth)):
    """List groups"""
    groups = [g for g in security_state.groups.values() if g.org_id == user.org_id]
    return {"groups": [g.dict() for g in groups]}

@router.post("/groups")
async def create_group(request: CreateGroupRequest, user: User = Depends(require_admin)):
    """Create group"""
    # Combine member_ids and user_ids
    all_members = list(set(request.user_ids + request.member_ids))
    
    group = UserGroup(
        org_id=user.org_id,
        name=request.name,
        description=request.description,
        user_ids=all_members,
        member_ids=all_members,
        role_ids=request.role_ids
    )
    security_state.groups[group.id] = group
    
    # Save to database
    try:
        from database.services import UserGroupService
        UserGroupService.save_group(group)
    except Exception as e:
        print(f"⚠️ Error saving group to database: {e}")
    
    security_state.save_to_disk()
    
    return {"status": "success", "group": group.dict()}

@router.put("/groups/{group_id}")
async def update_group(group_id: str, request: CreateGroupRequest, user: User = Depends(require_admin)):
    """Update group"""
    group = security_state.groups.get(group_id)
    if not group or group.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Update fields
    group.name = request.name
    group.description = request.description
    
    # Handle member_ids (prefer member_ids over user_ids for new API)
    members = request.member_ids if request.member_ids else request.user_ids
    if members:
        group.user_ids = members
        group.member_ids = members
    
    group.updated_at = datetime.utcnow().isoformat()
    
    # Save to database
    try:
        from database.services import UserGroupService
        UserGroupService.save_group(group)
    except Exception as e:
        print(f"⚠️ Error saving group to database: {e}")
    
    security_state.save_to_disk()
    
    return {"status": "success", "group": group.dict()}

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: User = Depends(require_admin)):
    """Delete group"""
    group = security_state.groups.get(group_id)
    if not group or group.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Remove group from users
    for u in security_state.users.values():
        if group_id in u.group_ids:
            u.group_ids.remove(group_id)
    
    del security_state.groups[group_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

# ============================================================================
# SECURITY SETTINGS ENDPOINTS
# ============================================================================

@router.get("/settings")
async def get_security_settings(user: User = Depends(require_admin)):
    """Get security settings"""
    settings = security_state.get_settings()
    return settings.dict()

@router.put("/settings")
async def update_security_settings(request: UpdateSecuritySettingsRequest, user: User = Depends(require_super_admin)):
    """Update security settings (saves to database)"""
    settings = security_state.get_settings()
    
    changes = {}
    for key, value in request.dict(exclude_unset=True).items():
        if value is not None and hasattr(settings, key):
            old_value = getattr(settings, key)
            if old_value != value:
                changes[key] = {"old": old_value, "new": value}
                setattr(settings, key, value)
    
    settings.updated_at = datetime.utcnow().isoformat()
    settings.updated_by = user.id
    
    # Save to database
    print(f"💾 [API] Updating security settings in database for org: {settings.org_id[:8]}...")
    try:
        from database.services import SecuritySettingsService
        SecuritySettingsService.save_settings(settings)
    except Exception as e:
        print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
        security_state.save_to_disk()
    
    security_state.add_audit_log(
        user=user,
        action=ActionType.UPDATE,
        resource_type=ResourceType.SETTINGS,
        resource_id="security_settings",
        resource_name="Security Settings",
        changes=changes if changes else None
    )
    
    return {"status": "success", "settings": settings.dict()}

# ============================================================================
# LDAP CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/ldap")
async def list_ldap_configs(user: User = Depends(require_super_admin)):
    """List LDAP configurations"""
    configs = [c for c in security_state.ldap_configs.values() if c.org_id == user.org_id]
    return {"configs": [{
        "id": c.id,
        "name": c.name,
        "server_url": c.server_url,
        "is_active": c.is_active,
        "sync_enabled": c.sync_enabled,
        "last_sync": c.last_sync,
        "connection_status": c.connection_status
    } for c in configs]}

@router.post("/ldap")
async def create_ldap_config(request: LDAPConfigRequest, user: User = Depends(require_super_admin)):
    """Create LDAP configuration"""
    config = LDAPConfig(
        org_id=user.org_id,
        **request.dict()
    )
    security_state.ldap_configs[config.id] = config
    security_state.save_to_disk()
    
    return {"status": "success", "config": {"id": config.id, "name": config.name}}

@router.post("/ldap/{config_id}/test")
async def test_ldap_connection(config_id: str, user: User = Depends(require_super_admin)):
    """Test LDAP connection"""
    config = security_state.ldap_configs.get(config_id)
    if not config or config.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="LDAP config not found")
    
    success, message = await LDAPService.test_connection(config)
    
    config.connection_status = "connected" if success else "error"
    config.last_connection_test = datetime.utcnow().isoformat()
    security_state.save_to_disk()
    
    return {"success": success, "message": message}

@router.post("/ldap/{config_id}/sync")
async def sync_ldap_users(config_id: str, background_tasks: BackgroundTasks, user: User = Depends(require_super_admin)):
    """Sync users from LDAP"""
    config = security_state.ldap_configs.get(config_id)
    if not config or config.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="LDAP config not found")
    
    background_tasks.add_task(LDAPService.sync_users, config, security_state)
    
    return {"status": "sync_started"}

@router.delete("/ldap/{config_id}")
async def delete_ldap_config(config_id: str, user: User = Depends(require_super_admin)):
    """Delete LDAP configuration"""
    config = security_state.ldap_configs.get(config_id)
    if not config or config.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="LDAP config not found")
    
    del security_state.ldap_configs[config_id]
    security_state.save_to_disk()
    
    return {"status": "success"}

# ============================================================================
# OAUTH CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/oauth/providers")
async def list_oauth_providers(user: User = Depends(require_super_admin)):
    """List configured OAuth providers"""
    org = security_state.organizations.get(user.org_id)
    if not org:
        return {"providers": []}
    
    return {
        "providers": [{
            "provider": p.value,
            "enabled": p in org.allowed_auth_providers,
            "configured": hasattr(org, f"{p.value}_client_id") and getattr(org, f"{p.value}_client_id")
        } for p in [AuthProvider.GOOGLE, AuthProvider.MICROSOFT]]
    }

@router.post("/oauth/configure")
async def configure_oauth(request: OAuthConfigRequest, user: User = Depends(require_super_admin)):
    """Configure OAuth provider"""
    org = security_state.organizations.get(user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Update OAuth credentials
    setattr(org, f"{request.provider.value}_client_id", request.client_id)
    setattr(org, f"{request.provider.value}_client_secret", request.client_secret)
    if request.tenant_id:
        setattr(org, f"{request.provider.value}_tenant_id", request.tenant_id)
    
    # Update allowed_auth_providers
    if request.enabled and request.provider not in org.allowed_auth_providers:
        org.allowed_auth_providers.append(request.provider)
    elif not request.enabled and request.provider in org.allowed_auth_providers:
        org.allowed_auth_providers.remove(request.provider)
    
    # Save to database
    print(f"💾 [API] Saving OAuth configuration to database for provider: {request.provider.value}")
    try:
        from database.services import OrganizationService
        OrganizationService.save_organization(org)
    except Exception as e:
        print(f"⚠️  [API ERROR] Database save failed: {e}, saving to disk only")
        import traceback
        traceback.print_exc()
    
    # Save to disk (backup)
    security_state.save_to_disk()
    
    return {"status": "success"}

@router.get("/oauth/{provider}/login")
async def oauth_login(provider: str, req: Request):
    """Initiate OAuth login"""
    auth_provider = AuthProvider(provider)
    org_id = req.query_params.get("org_id", "org_default")
    
    # Try to get organization from security_state first
    org = security_state.organizations.get(org_id)
    
    # Check if OAuth credentials are missing (even if org exists in cache)
    client_id_attr = f'{provider}_client_id'
    needs_reload = False
    
    if not org:
        needs_reload = True
    elif not hasattr(org, client_id_attr) or not getattr(org, client_id_attr, None):
        needs_reload = True
    
    # If not found or missing OAuth credentials, load from database
    if needs_reload:
        try:
            from database.services import OrganizationService
            if org_id == "org_default":
                # Try to find by slug
                orgs = OrganizationService.get_all_organizations()
                db_org = next((o for o in orgs if o.slug == "default"), None)
                if not db_org:
                    db_org = orgs[0] if orgs else None
            else:
                db_org = OrganizationService.get_organization_by_id(org_id)
            
            if db_org:
                # Update security_state cache with fresh data from database
                security_state.organizations[db_org.id] = db_org
                # Also update by org_id key if different
                if db_org.id != org_id:
                    security_state.organizations[org_id] = db_org
                org = db_org
        except Exception as e:
            print(f"❌ [OAUTH ERROR] Failed to load organization from database: {e}")
            import traceback
            traceback.print_exc()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if auth_provider not in org.allowed_auth_providers:
        raise HTTPException(status_code=400, detail="OAuth provider not enabled")
    
    # Build redirect URI - force https in production
    base_url = str(req.base_url).rstrip('/')
    if "localhost" not in base_url and "127.0.0.1" not in base_url:
        base_url = base_url.replace("http://", "https://")
    redirect_uri = f"{base_url}/api/security/oauth/{provider}/callback"
    
    # Get client ID for the provider
    client_id = getattr(org, f'{provider}_client_id', None)
    
    # Validate client ID exists
    if not client_id:
        raise HTTPException(
            status_code=400, 
            detail=f"OAuth provider '{provider}' not configured. Please configure Google OAuth credentials in the Security Center."
        )
    
    auth_url = OAuthService.get_authorization_url(auth_provider, org, redirect_uri)
    
    return {"auth_url": auth_url}

@router.get("/oauth/{provider}/callback")
async def oauth_callback(provider: str, req: Request):
    """OAuth callback"""
    code = req.query_params.get("code")
    state = req.query_params.get("state")
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    
    auth_provider = AuthProvider(provider)
    org_id = "org_default"  # Should be extracted from state
    
    # Try to get organization from security_state first
    org = security_state.organizations.get(org_id)
    
    # Check if OAuth credentials are missing (even if org exists in cache)
    client_id_attr = f'{provider}_client_id'
    needs_reload = False
    
    if not org:
        needs_reload = True
    elif not hasattr(org, client_id_attr) or not getattr(org, client_id_attr, None):
        needs_reload = True
    
    # If not found or missing OAuth credentials, load from database
    if needs_reload:
        try:
            from database.services import OrganizationService
            if org_id == "org_default":
                # Try to find by slug
                orgs = OrganizationService.get_all_organizations()
                db_org = next((o for o in orgs if o.slug == "default"), None)
                if not db_org:
                    db_org = orgs[0] if orgs else None
            else:
                db_org = OrganizationService.get_organization_by_id(org_id)
            
            if db_org:
                # Update security_state cache with fresh data from database
                security_state.organizations[db_org.id] = db_org
                # Also update by org_id key if different
                if db_org.id != org_id:
                    security_state.organizations[org_id] = db_org
                org = db_org
        except Exception as e:
            print(f"❌ [OAUTH ERROR] Failed to load organization from database: {e}")
            import traceback
            traceback.print_exc()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Build redirect URI - force https in production
    base_url = str(req.base_url).rstrip('/')
    if "localhost" not in base_url and "127.0.0.1" not in base_url:
        base_url = base_url.replace("http://", "https://")
    redirect_uri = f"{base_url}/api/security/oauth/{provider}/callback"
    
    try:
        user_info = await OAuthService.exchange_code(auth_provider, org, code, redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Find or create user
    email = user_info.get("email")
    # Use org.id (UUID) if available, otherwise use org_id (string)
    actual_org_id = org.id if hasattr(org, 'id') else org_id
    user = security_state.get_user_by_email(email, actual_org_id)
    
    # If not found in security_state, try to load from database
    if not user:
        try:
            from database.services import UserService
            import uuid as uuid_lib
            # Convert org_id to UUID for comparison
            org_uuid = None
            if actual_org_id:
                try:
                    org_uuid = uuid_lib.UUID(actual_org_id) if isinstance(actual_org_id, str) else actual_org_id
                except ValueError:
                    # If org_id is not a valid UUID, try to find org by slug
                    from database.services import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    org_obj = next((o for o in orgs if o.slug == "default" or o.id == actual_org_id), None)
                    if org_obj:
                        org_uuid = uuid_lib.UUID(org_obj.id)
            
            db_users = UserService.get_all_users()
            for db_user in db_users:
                if db_user.email.lower() == email.lower():
                    # Compare org_id (handle both UUID and string like "org_default")
                    try:
                        db_org_uuid = uuid_lib.UUID(db_user.org_id) if isinstance(db_user.org_id, str) else db_user.org_id
                    except (ValueError, AttributeError):
                        # If org_id is not a valid UUID (e.g., "org_default"), try to resolve it
                        from database.services import OrganizationService
                        orgs = OrganizationService.get_all_organizations()
                        db_org_obj = next((o for o in orgs if o.slug == db_user.org_id or o.id == db_user.org_id), None)
                        if db_org_obj:
                            db_org_uuid = uuid_lib.UUID(db_org_obj.id)
                        else:
                            db_org_uuid = None
                    
                    if org_uuid is None or db_org_uuid == org_uuid:
                        user = db_user
                        # Add to security_state cache
                        security_state.users[user.id] = user
                        break
        except Exception as e:
            print(f"⚠️  [OAUTH] Failed to search database for user: {e}")
            import traceback
            traceback.print_exc()
    
    if not user:
        # Get or create "User" role for self-registered users
        # Use org.id (UUID) instead of org_id (string) for role creation
        actual_org_id = org.id if hasattr(org, 'id') else org_id
        try:
            from database.services import RoleService
            user_role = RoleService.get_or_create_user_role(actual_org_id)
            user_role_id = user_role.id
        except Exception as e:
            print(f"⚠️  [OAUTH ERROR] Failed to get/create 'User' role: {e}")
            import traceback
            traceback.print_exc()
            # Fallback: try to find any role with name "User" in security_state
            user_role_id = None
            for role_id, role in security_state.roles.items():
                if role.name.lower() == "user":
                    user_role_id = role.id
                    break
            
            if not user_role_id:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to assign default role to new user. Please contact administrator."
                )
        
        # Create new user from OAuth
        # Use org.id (UUID) if available, otherwise use org_id (will be converted in UserService)
        user_org_id = org.id if hasattr(org, 'id') else org_id
        user = User(
            org_id=user_org_id,
            email=email.lower(),
            auth_provider=auth_provider,
            external_id=user_info.get("id"),
            profile=UserProfile(
                first_name=user_info.get("given_name", ""),
                last_name=user_info.get("family_name", ""),
                avatar_url=user_info.get("picture")
            ),
            role_ids=[user_role_id],  # Use UUID from database
            status=UserStatus.ACTIVE,
            email_verified=True
        )
        security_state.users[user.id] = user
        
        # Save to database
        try:
            from database.services import UserService
            UserService.save_user(user)
            print(f"💾 [OAUTH] User saved to database: {user.email} (ID: {user.id[:8]}...)")
        except Exception as e:
            print(f"⚠️  [OAUTH ERROR] Database save failed: {e}, saving to disk only")
            import traceback
            traceback.print_exc()
            security_state.save_to_disk()
    
    # Check MFA requirement (same logic as login endpoint)
    settings = security_state.get_settings()
    mfa_required = False
    mfa_code = req.query_params.get("mfa_code")  # Get MFA code from query params if provided
    
    # Super Admin bypass - skip MFA for system admins with non-real emails
    is_super_admin = security_state.check_permission(user, Permission.SYSTEM_ADMIN.value)
    if is_super_admin and (user.id == "user_super_admin" or not user.email or user.email.endswith("@local")):
        mfa_required = False  # Bypass MFA for super admin with fake email
    elif settings.mfa_enforcement == "all":
        mfa_required = True
    elif settings.mfa_enforcement == "admins":
        is_admin = security_state.check_permission(user, Permission.SYSTEM_ADMIN.value)
        mfa_required = is_admin
    elif settings.mfa_enforcement == "optional" and user.mfa.enabled:
        mfa_required = True
    
    # If MFA is required and no code provided, redirect to MFA page
    if mfa_required and not mfa_code:
        # Auto-send email code if email MFA is enabled
        if MFAMethod.EMAIL in user.mfa.methods:
            code = MFAService.generate_email_code()
            user.mfa.email_code = code
            user.mfa.email_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
            security_state.save_to_disk()
            
            # Send email in background
            try:
                await EmailService.send_mfa_code(user, code)
            except Exception as e:
                print(f"⚠️  [OAUTH] Failed to send MFA email: {e}")
        
        # Create temporary session for MFA verification
        # This session will be used after MFA verification
        temp_session = Session(
            user_id=user.id,
            org_id=user.org_id,
            ip_address=req.client.host,
            user_agent=req.headers.get("user-agent", ""),
            is_active=False  # Not active until MFA verified
        )
        security_state.sessions[temp_session.id] = temp_session
        
        # Redirect to MFA verification page with session ID
        redirect_url = f"/ui/#mfa-verify?session_id={temp_session.id}&email={user.email}&provider={provider}"
        return Response(
            status_code=302,
            headers={"Location": redirect_url}
        )
    
    # Verify MFA if provided (from query param or separate endpoint)
    if mfa_required and mfa_code:
        if not MFAService.verify_code(user, mfa_code):
            print(f"❌ [OAUTH] Invalid MFA code for {user.email}")
            # Redirect back to login with error
            return Response(
                status_code=302,
                headers={"Location": f"/ui/#login?error=invalid_mfa_code"}
            )
        user.mfa.last_used = datetime.utcnow().isoformat()
    
    # Create session
    session = Session(
        user_id=user.id,
        org_id=user.org_id,
        ip_address=req.client.host,
        user_agent=req.headers.get("user-agent", "")
    )
    security_state.sessions[session.id] = session
    
    access_token = TokenService.create_access_token(user.id, user.org_id, session.id)
    
    # Add audit log
    security_state.add_audit_log(
        user=user,
        action=ActionType.LOGIN,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        resource_name=user.email,
        details={"method": "oauth", "provider": provider, "mfa_used": mfa_required},
        session=session,
        ip_address=req.client.host
    )
    
    # Redirect to frontend with token
    return Response(
        status_code=302,
        headers={"Location": f"/ui/#login?token={access_token}"}
    )

@router.post("/oauth/mfa/resend")
async def resend_oauth_mfa_code(request: dict):
    """
    Resend MFA code for OAuth login using session_id.
    """
    session_id = request.get("session_id")
    email = request.get("email")
    
    if not session_id or not email:
        raise HTTPException(status_code=400, detail="session_id and email are required")
    
    # Get temporary session
    temp_session = security_state.sessions.get(session_id)
    if not temp_session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    # Get user from session
    user = security_state.users.get(temp_session.user_id)
    if not user or user.email.lower() != email.lower():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate and send new MFA code
    code = MFAService.generate_email_code()
    user.mfa.email_code = code
    user.mfa.email_code_expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    security_state.users[user.id] = user
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
        print(f"💾 [OAUTH MFA RESEND] User MFA email code saved to database for {user.email}")
    except Exception as e:
        print(f"⚠️  [OAUTH MFA RESEND ERROR] Database save failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Send email
    try:
        await EmailService.send_mfa_code(user, code)
        print(f"📧 [OAUTH MFA RESEND] MFA code sent to {user.email}")
    except Exception as e:
        print(f"⚠️  [OAUTH MFA RESEND] Failed to send MFA email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send MFA code")
    
    return {"status": "success", "message": "MFA code sent"}

@router.post("/oauth/mfa/verify")
async def verify_oauth_mfa(request: dict):
    """
    Verify MFA code for OAuth login using session_id.
    This is called from the frontend after user enters MFA code.
    """
    session_id = request.get("session_id")
    mfa_code = request.get("mfa_code")
    
    if not session_id or not mfa_code:
        raise HTTPException(status_code=400, detail="session_id and mfa_code are required")
    
    # Get temporary session
    temp_session = security_state.sessions.get(session_id)
    if not temp_session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    # Get user from session
    user = security_state.users.get(temp_session.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify MFA code
    if not MFAService.verify_code(user, mfa_code):
        print(f"❌ [OAUTH MFA] Invalid MFA code for {user.email}")
        raise HTTPException(status_code=401, detail="Invalid MFA code")
    
    
    # Update user MFA last_used
    user.mfa.last_used = datetime.utcnow().isoformat()
    security_state.users[user.id] = user
    
    # Save to database
    try:
        from database.services import UserService
        UserService.save_user(user)
    except Exception as e:
        print(f"⚠️  [OAUTH MFA ERROR] Database save failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Create active session
    session = Session(
        user_id=user.id,
        org_id=user.org_id,
        ip_address=temp_session.ip_address,
        user_agent=temp_session.user_agent
    )
    security_state.sessions[session.id] = session
    
    # Save session to database
    try:
        from database.services import SessionService
        SessionService.create_session(session)
    except Exception as e:
        print(f"⚠️  [OAUTH MFA ERROR] Database save failed for session: {e}")
        import traceback
        traceback.print_exc()
    
    # Delete temporary session
    del security_state.sessions[session_id]
    
    # Create access token
    access_token = TokenService.create_access_token(user.id, user.org_id, session.id)
    
    # Add audit log
    security_state.add_audit_log(
        user=user,
        action=ActionType.LOGIN,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        resource_name=user.email,
        details={"method": "oauth", "mfa_used": True},
        session=session,
        ip_address=temp_session.ip_address
    )
    
    return {
        "access_token": access_token,
        "expires_in": 3600,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.profile.display_name or f"{user.profile.first_name} {user.profile.last_name}".strip() or user.email,
            "roles": [security_state.roles.get(rid).name if security_state.roles.get(rid) else "Unknown" for rid in user.role_ids],
            "permissions": security_state.get_user_permissions(user),
            "mfa": {
                "enabled": user.mfa.enabled if user.mfa else False,
                "method": user.mfa.methods[0].value if user.mfa and user.mfa.methods else "none",
                "methods": [m.value for m in user.mfa.methods] if user.mfa and user.mfa.methods else []
            }
        }
    }

# ============================================================================
# AUDIT LOG ENDPOINTS
# ============================================================================

@router.get("/audit-logs")
async def list_audit_logs(
    user: User = Depends(require_admin),
    page: int = 1,
    limit: int = 50,
    action: Optional[ActionType] = None,
    resource_type: Optional[ResourceType] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """List audit logs with filtering"""
    if not security_state.check_permission(user, Permission.AUDIT_VIEW.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    logs = [l for l in security_state.audit_logs if l.org_id == user.org_id]
    
    # Apply filters
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
    
    # Pagination
    total = len(logs)
    start = (page - 1) * limit
    end = start + limit
    logs = logs[start:end]
    
    return {
        "logs": [l.dict() for l in logs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/audit-logs/export")
async def export_audit_logs(
    user: User = Depends(require_admin),
    format: str = "csv",
    action: Optional[ActionType] = None,
    resource_type: Optional[ResourceType] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Export audit logs"""
    if not security_state.check_permission(user, Permission.AUDIT_EXPORT.value):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    logs = [l for l in security_state.audit_logs if l.org_id == user.org_id]
    
    # Apply filters
    if action:
        logs = [l for l in logs if l.action == action]
    if resource_type:
        logs = [l for l in logs if l.resource_type == resource_type]
    if start_date:
        logs = [l for l in logs if l.timestamp >= start_date]
    if end_date:
        logs = [l for l in logs if l.timestamp <= end_date]
    
    logs = sorted(logs, key=lambda x: x.timestamp, reverse=True)
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "User", "Action", "Resource Type", "Resource", "IP", "Success", "Details"])
        
        for log in logs:
            writer.writerow([
                log.timestamp,
                log.user_email,
                log.action.value,
                log.resource_type.value,
                log.resource_name or log.resource_id,
                log.ip_address,
                "Yes" if log.success else "No",
                json.dumps(log.details) if log.details else ""
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )
    
    elif format == "json":
        return StreamingResponse(
            iter([json.dumps([l.dict() for l in logs], indent=2)]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.utcnow().strftime('%Y%m%d')}.json"}
        )
    
    raise HTTPException(status_code=400, detail="Unsupported format")

# ============================================================================
# STATISTICS & MISC ENDPOINTS
# ============================================================================

@router.get("/stats")
async def get_security_stats(user: User = Depends(require_admin)):
    """Get security statistics"""
    org_users = [u for u in security_state.users.values() if u.org_id == user.org_id]
    org_sessions = [s for s in security_state.sessions.values() if s.org_id == user.org_id]
    
    # Calculate login stats for last 7 days
    week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    recent_logins = [l for l in security_state.audit_logs 
                    if l.org_id == user.org_id and l.action == ActionType.LOGIN and l.timestamp >= week_ago]
    failed_logins = [l for l in security_state.audit_logs 
                    if l.org_id == user.org_id and l.action == ActionType.LOGIN_FAILED and l.timestamp >= week_ago]
    
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
            "active": len([s for s in org_sessions if s.is_active])
        },
        "invitations": {
            "pending": len([i for i in security_state.invitations.values() 
                          if i.org_id == user.org_id and not i.accepted_at])
        },
        "roles": len([r for r in security_state.roles.values() if r.org_id == user.org_id or r.is_system]),
        "policies": len([p for p in security_state.policies.values() if p.org_id == user.org_id]),
        "login_stats": {
            "successful_7d": len(recent_logins),
            "failed_7d": len(failed_logins)
        }
    }

@router.get("/permissions")
async def list_all_permissions(user: User = Depends(require_auth)):
    """List all available permissions"""
    return {
        "permissions": [
            {
                "value": p.value,
                "name": p.name,
                "category": p.value.split(':')[0]
            } for p in Permission
        ]
    }

@router.post("/check-access")
async def check_access(
    action: str,
    resource_type: ResourceType,
    resource_id: Optional[str] = None,
    user: User = Depends(require_auth)
):
    """Check if current user has access to perform an action"""
    allowed, reason = security_state.policy_engine.evaluate_access(
        user, action, resource_type, resource_id
    )
    
    return {
        "allowed": allowed,
        "reason": reason
    }

@router.delete("/roles/{role_id}/force")
async def force_delete_system_role(role_id: str, user: User = Depends(require_super_admin)):
    """Force delete a system role (Super Admin only) - Cannot delete super_admin or admin"""
    protected_roles = ["role_super_admin", "role_admin"]
    
    if role_id in protected_roles:
        raise HTTPException(status_code=400, detail="Cannot delete protected system roles (Super Admin, Admin)")
    
    role = security_state.roles.get(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Remove role from users
    for u in security_state.users.values():
        if role_id in u.role_ids:
            u.role_ids.remove(role_id)
    
    del security_state.roles[role_id]
    security_state.save_to_disk()
    
    return {"message": f"Role {role.name} deleted successfully"}
