"""
OAuthConfig Model - OAuth provider configuration
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class OAuthConfig(Base):
    """OAuth provider configuration"""
    __tablename__ = "oauth_configs"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Provider
    provider = Column(String(50), nullable=False)  # AuthProvider enum value
    
    # Credentials
    client_id = Column(String(500), nullable=False)
    client_secret = Column(String(500), nullable=False)  # Should be encrypted in production
    
    # Provider-specific
    tenant_id = Column(String(255), nullable=True)  # For Microsoft
    
    # Scopes
    scopes = Column(JSONArray, default=list)
    
    # Settings
    enabled = Column(Boolean, default=True)
    auto_create_users = Column(Boolean, default=True)
    update_profile_on_login = Column(Boolean, default=True)
    default_role_id = Column(String(255), default="role_user")
    
    # Domain restrictions
    allowed_domains = Column(JSONArray, default=list)  # Empty = all domains
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<OAuthConfig {self.provider}>"

