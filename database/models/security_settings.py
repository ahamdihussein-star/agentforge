"""
SecuritySettings Model - Security settings per organization
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from ..types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class SecuritySettings(Base):
    """Global security settings for the organization"""
    __tablename__ = "security_settings"
    
    # Primary Key (one settings per org)
    org_id = Column(UUID, primary_key=True)
    
    # Registration
    registration_mode = Column(String(50), default="open")  # RegistrationMode enum value
    email_verification_required = Column(Boolean, default=True)
    allowed_email_domains = Column(JSONArray, default=list)  # List of allowed domains
    
    # Password Policy
    password_min_length = Column(Integer, default=8)
    password_max_length = Column(Integer, default=128)
    password_require_uppercase = Column(Boolean, default=True)
    password_require_lowercase = Column(Boolean, default=True)
    password_require_numbers = Column(Boolean, default=True)
    password_require_symbols = Column(Boolean, default=True)
    password_expiry_days = Column(Integer, default=0)  # 0 = never expires
    password_history_count = Column(Integer, default=5)
    password_min_age_hours = Column(Integer, default=0)
    
    # Session Management
    session_timeout_minutes = Column(Integer, default=480)  # 8 hours
    remember_me_days = Column(Integer, default=30)
    max_concurrent_sessions = Column(Integer, default=5)  # 0 = unlimited
    force_logout_on_password_change = Column(Boolean, default=True)
    single_session_per_device = Column(Boolean, default=False)
    
    # Account Security
    account_lockout_enabled = Column(Boolean, default=True)
    account_lockout_attempts = Column(Integer, default=5)
    account_lockout_duration_minutes = Column(Integer, default=30)
    account_lockout_reset_after_minutes = Column(Integer, default=30)
    
    # MFA Settings
    mfa_enforcement = Column(String(50), default="optional")  # MFAEnforcement enum value
    mfa_remember_device_days = Column(Integer, default=30)
    mfa_allow_user_optout = Column(Boolean, default=False)
    mfa_allowed_methods = Column(JSONArray, default=["totp", "email"])  # List of MFAMethod enum values
    
    # IP Security
    ip_whitelist_enabled = Column(Boolean, default=False)
    ip_whitelist = Column(JSONArray, default=list)
    ip_blacklist_enabled = Column(Boolean, default=False)
    ip_blacklist = Column(JSONArray, default=list)
    
    # API Security
    api_rate_limit_enabled = Column(Boolean, default=True)
    api_rate_limit_requests = Column(Integer, default=1000)  # Per hour
    api_key_expiry_days = Column(Integer, default=365)
    
    # Audit Settings
    audit_retention_days = Column(Integer, default=365)  # 0 = forever
    audit_log_level = Column(String(50), default="all")  # AuditLogLevel enum value
    audit_log_ip_addresses = Column(Boolean, default=True)
    audit_log_user_agents = Column(Boolean, default=True)
    
    # Notification Settings
    notify_on_new_login = Column(Boolean, default=False)
    notify_on_password_change = Column(Boolean, default=True)
    notify_on_failed_login = Column(Boolean, default=False)
    notify_admin_on_lockout = Column(Boolean, default=True)
    
    # Advanced
    allow_api_token_auth = Column(Boolean, default=True)
    cors_allowed_origins = Column(JSONArray, default=["*"])
    csrf_protection_enabled = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID, nullable=True)
    
    def __repr__(self):
        return f"<SecuritySettings {self.org_id}>"

