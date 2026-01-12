"""
Settings & Configuration Models
System-wide and organization-level settings
Secrets management with encryption
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Index, Integer
from ..types import UUID, JSON, JSONArray
JSONB = JSON
from enum import Enum

from ..base import Base


class SystemSetting(Base):
    """
    System-wide Settings
    Admin-only configuration
    """
    __tablename__ = "system_settings"
    
    # Primary Key
    key = Column(String(100), primary_key=True)
    
    # Value
    value = Column(JSON, nullable=False)
    value_type = Column(String(50))  # 'string', 'number', 'boolean', 'json'
    
    # Metadata
    category = Column(String(50))  # 'llm', 'email', 'security', 'storage', etc.
    description = Column(Text)
    is_secret = Column(Boolean, default=False)  # Sensitive data (encrypted)
    is_required = Column(Boolean, default=False)
    default_value = Column(JSON)
    
    # Validation
    validation_regex = Column(String(500))
    min_value = Column(String(100))
    max_value = Column(String(100))
    allowed_values = Column(JSON)  # Array of valid values
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    def __repr__(self):
        return f"<SystemSetting {self.key}>"


class OrganizationSetting(Base):
    """
    Organization-level Settings
    Override system defaults per org
    """
    __tablename__ = "organization_settings"
    
    # Composite Primary Key
    org_id = Column(UUID, primary_key=True)
    key = Column(String(100), primary_key=True)
    
    # Value
    value = Column(JSON, nullable=False)
    value_type = Column(String(50))
    
    # Metadata
    category = Column(String(50))
    is_secret = Column(Boolean, default=False)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    def __repr__(self):
        return f"<OrgSetting {self.org_id}:{self.key}>"


class APIKey(Base):
    """
    API Keys for External Services
    Encrypted at rest, rotatable
    """
    __tablename__ = "api_keys"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Scope
    org_id = Column(UUID, nullable=False, index=True)
    user_id = Column(UUID, index=True)  # Optional: user-specific
    
    # Key Info
    name = Column(String(255), nullable=False)  # e.g., "OpenAI Production Key"
    service = Column(String(100), nullable=False)  # 'openai', 'anthropic', 'sendgrid', etc.
    key_encrypted = Column(Text, nullable=False)  # AES-256 encrypted
    
    # Permissions
    scopes = Column(JSON, default=[])  # Array of permissions/scopes
    
    # Rate Limiting
    rate_limit_per_minute = Column(Integer)
    rate_limit_per_day = Column(Integer)
    
    # Usage Tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime)
    
    # Security
    last_rotated_at = Column(DateTime)
    rotation_reminder_sent = Column(Boolean, default=False)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    revoked_at = Column(DateTime)
    revoked_by = Column(UUID)
    
    def __repr__(self):
        return f"<APIKey {self.name} ({self.service})>"


class Integration(Base):
    """
    Third-party Integrations
    OAuth, SAML, External APIs
    """
    __tablename__ = "integrations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Scope
    org_id = Column(UUID, nullable=False, index=True)
    
    # Integration Info
    type = Column(String(100), nullable=False)  # 'google_oauth', 'microsoft_oauth', 'slack', etc.
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Configuration (encrypted)
    config_encrypted = Column(JSON, nullable=False)  # client_id, client_secret, etc.
    
    # OAuth Specific
    oauth_redirect_uri = Column(String(500))
    oauth_scopes = Column(JSON)  # Requested scopes
    
    # Status
    is_active = Column(Boolean, default=True)
    is_validated = Column(Boolean, default=False)
    last_validated_at = Column(DateTime)
    validation_error = Column(Text)
    
    # Usage
    connected_users_count = Column(Integer, default=0)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    def __repr__(self):
        return f"<Integration {self.name} ({self.type})>"


class UserIntegration(Base):
    """
    User-specific Integration Connections
    OAuth tokens per user
    """
    __tablename__ = "user_integrations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    integration_id = Column(UUID, nullable=False, index=True)
    user_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # OAuth Tokens (encrypted)
    access_token_encrypted = Column(Text)
    refresh_token_encrypted = Column(Text)
    token_expires_at = Column(DateTime)
    
    # External User Info
    external_user_id = Column(String(255))  # User ID in external system
    external_email = Column(String(255))
    external_name = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime)
    
    # Audit Trail
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    disconnected_at = Column(DateTime)
    
    def __repr__(self):
        return f"<UserIntegration {self.user_id}:{self.integration_id}>"


# Composite indexes
Index('idx_org_setting_category', OrganizationSetting.org_id, OrganizationSetting.category)
Index('idx_api_key_org_service', APIKey.org_id, APIKey.service)
Index('idx_integration_org_type', Integration.org_id, Integration.type)
Index('idx_user_integration_user', UserIntegration.user_id, UserIntegration.is_active)

