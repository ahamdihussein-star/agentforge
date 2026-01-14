"""
LDAPConfig Model - LDAP/Active Directory configuration
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from ..column_types import UUID, JSON
JSONB = JSON

from ..base import Base


class LDAPConfig(Base):
    """LDAP/Active Directory configuration"""
    __tablename__ = "ldap_configs"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Config info
    name = Column(String(255), default="LDAP")
    
    # Connection
    server_url = Column(String(500), nullable=False)  # e.g., ldap://ldap.example.com:389
    use_ssl = Column(Boolean, default=False)
    use_tls = Column(Boolean, default=True)
    verify_ssl = Column(Boolean, default=True)
    connection_timeout = Column(Integer, default=10)
    
    # Bind credentials (service account)
    bind_dn = Column(String(500), nullable=False)  # e.g., cn=admin,dc=example,dc=com
    bind_password = Column(String(500), nullable=False)  # Should be encrypted in production
    
    # Search settings
    base_dn = Column(String(500), nullable=False)  # e.g., dc=example,dc=com
    user_search_filter = Column(String(500), default="(uid={username})")
    user_search_base = Column(String(500), nullable=True)  # Defaults to base_dn
    user_object_class = Column(String(100), default="person")
    group_search_filter = Column(String(500), default="(objectClass=groupOfNames)")
    group_search_base = Column(String(500), nullable=True)
    group_object_class = Column(String(100), default="groupOfNames")
    
    # Attribute mapping (LDAP attribute -> AgentForge field)
    attribute_mapping = Column(JSON, default=dict)
    
    # Group to role mapping (LDAP group DN -> AgentForge role ID)
    group_role_mapping = Column(JSON, default=dict)
    
    # Default role for new users
    default_role_id = Column(String(255), default="role_user")
    
    # Sync settings
    sync_enabled = Column(Boolean, default=True)
    sync_interval_hours = Column(Integer, default=24)
    sync_delete_removed = Column(Boolean, default=False)  # Delete users removed from LDAP
    sync_update_existing = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    last_sync_status = Column(String(50), nullable=True)
    last_sync_users_synced = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    connection_status = Column(String(50), default="unknown")  # connected, error, unknown
    last_connection_test = Column(DateTime, nullable=True)
    last_error = Column(String(1000), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<LDAPConfig {self.name}>"

