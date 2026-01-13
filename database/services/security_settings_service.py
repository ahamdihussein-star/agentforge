"""
SecuritySettings Service - Database Operations for Security Settings
"""
import json
from typing import Optional
from datetime import datetime
from ..base import get_db_session
from ..models.security_settings import SecuritySettings as DBSecuritySettings
from core.security import SecuritySettings as CoreSecuritySettings, RegistrationMode, MFAEnforcement, AuditLogLevel, MFAMethod


class SecuritySettingsService:
    """SecuritySettings Service - Bridge between API and Database"""
    
    @staticmethod
    def get_settings(org_id: str) -> CoreSecuritySettings:
        """Get security settings for an organization (creates default if not exists)"""
        with get_db_session() as session:
            db_settings = session.query(DBSecuritySettings).filter_by(org_id=org_id).first()
            if not db_settings:
                # Create default settings
                print(f"💾 [DATABASE] Creating default security settings for org: {org_id[:8]}...")
                db_settings = DBSecuritySettings(org_id=org_id)
                session.add(db_settings)
                session.commit()
                session.refresh(db_settings)
                print(f"✅ [DATABASE] Default security settings created for org: {org_id[:8]}...")
            else:
                print(f"📊 [DATABASE] Retrieved security settings from database for org: {org_id[:8]}...")
            return SecuritySettingsService._db_to_core_settings(db_settings)
    
    @staticmethod
    def save_settings(settings: CoreSecuritySettings) -> CoreSecuritySettings:
        """Save security settings to database"""
        with get_db_session() as session:
            db_settings = session.query(DBSecuritySettings).filter_by(org_id=settings.org_id).first()
            if db_settings:
                # Update existing
                print(f"💾 [DATABASE] Updating security settings in database for org: {settings.org_id[:8]}...")
                SecuritySettingsService._update_db_settings(db_settings, settings)
                print(f"✅ [DATABASE] Security settings updated successfully for org: {settings.org_id[:8]}...")
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new security settings in database for org: {settings.org_id[:8]}...")
                db_settings = DBSecuritySettings(org_id=settings.org_id)
                SecuritySettingsService._update_db_settings(db_settings, settings)
                session.add(db_settings)
                print(f"✅ [DATABASE] Security settings created successfully for org: {settings.org_id[:8]}...")
            session.commit()
            session.refresh(db_settings)
            return SecuritySettingsService._db_to_core_settings(db_settings)
    
    @staticmethod
    def _update_db_settings(db_settings: DBSecuritySettings, core_settings: CoreSecuritySettings):
        """Update database settings from core settings"""
        # Registration
        db_settings.registration_mode = core_settings.registration_mode.value if hasattr(core_settings.registration_mode, 'value') else str(core_settings.registration_mode)
        db_settings.email_verification_required = core_settings.email_verification_required
        db_settings.allowed_email_domains = json.dumps(core_settings.allowed_email_domains) if core_settings.allowed_email_domains else json.dumps([])
        
        # Password Policy
        db_settings.password_min_length = core_settings.password_min_length
        db_settings.password_max_length = core_settings.password_max_length
        db_settings.password_require_uppercase = core_settings.password_require_uppercase
        db_settings.password_require_lowercase = core_settings.password_require_lowercase
        db_settings.password_require_numbers = core_settings.password_require_numbers
        db_settings.password_require_symbols = core_settings.password_require_symbols
        db_settings.password_expiry_days = core_settings.password_expiry_days
        db_settings.password_history_count = core_settings.password_history_count
        db_settings.password_min_age_hours = core_settings.password_min_age_hours
        
        # Session Management
        db_settings.session_timeout_minutes = core_settings.session_timeout_minutes
        db_settings.remember_me_days = core_settings.remember_me_days
        db_settings.max_concurrent_sessions = core_settings.max_concurrent_sessions
        db_settings.force_logout_on_password_change = core_settings.force_logout_on_password_change
        db_settings.single_session_per_device = core_settings.single_session_per_device
        
        # Account Security
        db_settings.account_lockout_enabled = core_settings.account_lockout_enabled
        db_settings.account_lockout_attempts = core_settings.account_lockout_attempts
        db_settings.account_lockout_duration_minutes = core_settings.account_lockout_duration_minutes
        db_settings.account_lockout_reset_after_minutes = core_settings.account_lockout_reset_after_minutes
        
        # MFA Settings
        db_settings.mfa_enforcement = core_settings.mfa_enforcement.value if hasattr(core_settings.mfa_enforcement, 'value') else str(core_settings.mfa_enforcement)
        db_settings.mfa_remember_device_days = core_settings.mfa_remember_device_days
        db_settings.mfa_allow_user_optout = core_settings.mfa_allow_user_optout
        db_settings.mfa_allowed_methods = json.dumps([m.value if hasattr(m, 'value') else str(m) for m in core_settings.mfa_allowed_methods]) if core_settings.mfa_allowed_methods else json.dumps([])
        
        # IP Security
        db_settings.ip_whitelist_enabled = core_settings.ip_whitelist_enabled
        db_settings.ip_whitelist = json.dumps(core_settings.ip_whitelist) if core_settings.ip_whitelist else json.dumps([])
        db_settings.ip_blacklist_enabled = core_settings.ip_blacklist_enabled
        db_settings.ip_blacklist = json.dumps(core_settings.ip_blacklist) if core_settings.ip_blacklist else json.dumps([])
        
        # API Security
        db_settings.api_rate_limit_enabled = core_settings.api_rate_limit_enabled
        db_settings.api_rate_limit_requests = core_settings.api_rate_limit_requests
        db_settings.api_key_expiry_days = core_settings.api_key_expiry_days
        
        # Audit Settings
        db_settings.audit_retention_days = core_settings.audit_retention_days
        db_settings.audit_log_level = core_settings.audit_log_level.value if hasattr(core_settings.audit_log_level, 'value') else str(core_settings.audit_log_level)
        db_settings.audit_log_ip_addresses = core_settings.audit_log_ip_addresses
        db_settings.audit_log_user_agents = core_settings.audit_log_user_agents
        
        # Notification Settings
        db_settings.notify_on_new_login = core_settings.notify_on_new_login
        db_settings.notify_on_password_change = core_settings.notify_on_password_change
        db_settings.notify_on_failed_login = core_settings.notify_on_failed_login
        db_settings.notify_admin_on_lockout = core_settings.notify_admin_on_lockout
        
        # Advanced
        db_settings.allow_api_token_auth = core_settings.allow_api_token_auth
        db_settings.cors_allowed_origins = json.dumps(core_settings.cors_allowed_origins) if core_settings.cors_allowed_origins else json.dumps(["*"])
        db_settings.csrf_protection_enabled = core_settings.csrf_protection_enabled
        
        db_settings.updated_at = datetime.utcnow()
        if core_settings.updated_by:
            db_settings.updated_by = core_settings.updated_by
    
    @staticmethod
    def _db_to_core_settings(db_settings: DBSecuritySettings) -> CoreSecuritySettings:
        """Convert database SecuritySettings to core SecuritySettings model"""
        # Parse JSON arrays
        allowed_email_domains = []
        if db_settings.allowed_email_domains:
            if isinstance(db_settings.allowed_email_domains, str):
                allowed_email_domains = json.loads(db_settings.allowed_email_domains)
            elif isinstance(db_settings.allowed_email_domains, list):
                allowed_email_domains = db_settings.allowed_email_domains
        
        mfa_allowed_methods = []
        if db_settings.mfa_allowed_methods:
            if isinstance(db_settings.mfa_allowed_methods, str):
                mfa_allowed_methods = json.loads(db_settings.mfa_allowed_methods)
            elif isinstance(db_settings.mfa_allowed_methods, list):
                mfa_allowed_methods = db_settings.mfa_allowed_methods
        # Convert to MFAMethod enum
        mfa_methods = []
        for m in mfa_allowed_methods:
            try:
                if isinstance(m, str):
                    mfa_methods.append(MFAMethod(m))
                else:
                    mfa_methods.append(m)
            except (ValueError, AttributeError):
                pass
        
        ip_whitelist = []
        if db_settings.ip_whitelist:
            if isinstance(db_settings.ip_whitelist, str):
                ip_whitelist = json.loads(db_settings.ip_whitelist)
            elif isinstance(db_settings.ip_whitelist, list):
                ip_whitelist = db_settings.ip_whitelist
        
        ip_blacklist = []
        if db_settings.ip_blacklist:
            if isinstance(db_settings.ip_blacklist, str):
                ip_blacklist = json.loads(db_settings.ip_blacklist)
            elif isinstance(db_settings.ip_blacklist, list):
                ip_blacklist = db_settings.ip_blacklist
        
        cors_allowed_origins = []
        if db_settings.cors_allowed_origins:
            if isinstance(db_settings.cors_allowed_origins, str):
                cors_allowed_origins = json.loads(db_settings.cors_allowed_origins)
            elif isinstance(db_settings.cors_allowed_origins, list):
                cors_allowed_origins = db_settings.cors_allowed_origins
        
        # Parse enums
        try:
            registration_mode = RegistrationMode(db_settings.registration_mode)
        except (ValueError, AttributeError):
            registration_mode = RegistrationMode.OPEN
        
        try:
            mfa_enforcement = MFAEnforcement(db_settings.mfa_enforcement)
        except (ValueError, AttributeError):
            mfa_enforcement = MFAEnforcement.OPTIONAL
        
        try:
            audit_log_level = AuditLogLevel(db_settings.audit_log_level)
        except (ValueError, AttributeError):
            audit_log_level = AuditLogLevel.ALL
        
        return CoreSecuritySettings(
            id="security_settings",
            org_id=str(db_settings.org_id),
            registration_mode=registration_mode,
            email_verification_required=db_settings.email_verification_required,
            allowed_email_domains=allowed_email_domains,
            password_min_length=db_settings.password_min_length,
            password_max_length=db_settings.password_max_length,
            password_require_uppercase=db_settings.password_require_uppercase,
            password_require_lowercase=db_settings.password_require_lowercase,
            password_require_numbers=db_settings.password_require_numbers,
            password_require_symbols=db_settings.password_require_symbols,
            password_expiry_days=db_settings.password_expiry_days,
            password_history_count=db_settings.password_history_count,
            password_min_age_hours=db_settings.password_min_age_hours,
            session_timeout_minutes=db_settings.session_timeout_minutes,
            remember_me_days=db_settings.remember_me_days,
            max_concurrent_sessions=db_settings.max_concurrent_sessions,
            force_logout_on_password_change=db_settings.force_logout_on_password_change,
            single_session_per_device=db_settings.single_session_per_device,
            account_lockout_enabled=db_settings.account_lockout_enabled,
            account_lockout_attempts=db_settings.account_lockout_attempts,
            account_lockout_duration_minutes=db_settings.account_lockout_duration_minutes,
            account_lockout_reset_after_minutes=db_settings.account_lockout_reset_after_minutes,
            mfa_enforcement=mfa_enforcement,
            mfa_remember_device_days=db_settings.mfa_remember_device_days,
            mfa_allow_user_optout=db_settings.mfa_allow_user_optout,
            mfa_allowed_methods=mfa_methods if mfa_methods else [MFAMethod.TOTP, MFAMethod.EMAIL],
            ip_whitelist_enabled=db_settings.ip_whitelist_enabled,
            ip_whitelist=ip_whitelist,
            ip_blacklist_enabled=db_settings.ip_blacklist_enabled,
            ip_blacklist=ip_blacklist,
            api_rate_limit_enabled=db_settings.api_rate_limit_enabled,
            api_rate_limit_requests=db_settings.api_rate_limit_requests,
            api_key_expiry_days=db_settings.api_key_expiry_days,
            audit_retention_days=db_settings.audit_retention_days,
            audit_log_level=audit_log_level,
            audit_log_ip_addresses=db_settings.audit_log_ip_addresses,
            audit_log_user_agents=db_settings.audit_log_user_agents,
            notify_on_new_login=db_settings.notify_on_new_login,
            notify_on_password_change=db_settings.notify_on_password_change,
            notify_on_failed_login=db_settings.notify_on_failed_login,
            notify_admin_on_lockout=db_settings.notify_admin_on_lockout,
            allow_api_token_auth=db_settings.allow_api_token_auth,
            cors_allowed_origins=cors_allowed_origins if cors_allowed_origins else ["*"],
            csrf_protection_enabled=db_settings.csrf_protection_enabled,
            created_at=db_settings.created_at.isoformat() if db_settings.created_at else datetime.utcnow().isoformat(),
            updated_at=db_settings.updated_at.isoformat() if db_settings.updated_at else datetime.utcnow().isoformat(),
            updated_by=str(db_settings.updated_by) if db_settings.updated_by else None
        )

