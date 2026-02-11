"""
Organization Model - Multi-tenancy support
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class Organization(Base):
    """Organization/Tenant model"""
    __tablename__ = "organizations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    
    # Plan & Settings
    plan = Column(String(50), default="free")  # free, starter, pro, enterprise
    settings = Column(JSON, default={})  # Organization-specific settings
    
    # Auth settings
    allowed_auth_providers = Column(JSONArray, default=list)  # List of allowed auth providers
    require_mfa = Column(String(10), default="false")  # Boolean as string for database-agnostic
    allowed_email_domains = Column(JSONArray, default=list)  # List of allowed email domains
    
    # OAuth credentials (should be encrypted in production)
    google_client_id = Column(String(500), nullable=True)
    google_client_secret = Column(String(500), nullable=True)
    microsoft_client_id = Column(String(500), nullable=True)
    microsoft_client_secret = Column(String(500), nullable=True)
    microsoft_tenant_id = Column(String(255), nullable=True)
    
    # LDAP/AD settings
    ldap_config_id = Column(UUID, nullable=True)
    
    # ==========================================================================
    # USER DIRECTORY / IDENTITY SETTINGS
    # ==========================================================================
    # Determines where user attributes (manager, employee_id, department, etc.)
    # are resolved from. This is critical for process automation (approvals, etc.)
    #
    # Values: "internal" (default), "ldap", "hr_api", "hybrid"
    #  - internal: Use built-in org chart (users.manager_id, departments)
    #  - ldap: Resolve from LDAP/AD (uses ldap_config_id)
    #  - hr_api: Resolve from external HR system API
    #  - hybrid: Use internal as primary, fall back to external
    directory_source = Column(String(20), default="internal")
    
    # HR API Configuration (when directory_source = "hr_api" or "hybrid")
    # Stored as JSON: {
    #   "base_url": "https://hr-api.company.com/v1",
    #   "auth_type": "bearer" | "api_key" | "oauth2",
    #   "auth_config": { "token": "..." } | { "api_key": "..." } | { "client_id": "...", "client_secret": "..." },
    #   "endpoints": {
    #     "get_user": "/employees/{employee_id}",
    #     "get_manager": "/employees/{employee_id}/manager",
    #     "get_department_members": "/departments/{department_id}/members",
    #     "get_direct_reports": "/employees/{employee_id}/direct-reports",
    #     "search_users": "/employees/search"
    #   },
    #   "attribute_mapping": {
    #     "employee_id": "employeeId",
    #     "email": "workEmail",
    #     "first_name": "firstName",
    #     "last_name": "lastName",
    #     "manager_id": "managerId",
    #     "department": "departmentName",
    #     "job_title": "jobTitle"
    #   },
    #   "sync_enabled": true,
    #   "sync_interval_hours": 24,
    #   "cache_ttl_minutes": 60
    # }
    hr_api_config = Column(JSON, default=None)
    
    # Limits
    max_users = Column(String(10), default="100")  # Integer as string
    max_agents = Column(String(10), default="50")
    max_tools = Column(String(10), default="100")
    
    # Status
    status = Column(String(20), default="active")  # active, suspended, deleted
    
    # Domain & Branding
    domain = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    
    # Branding Configuration (stored as JSON)
    branding = Column(JSON, default={})
    # Expected structure:
    # {
    #     "primary_color": "#6366f1",
    #     "secondary_color": "#8b5cf6",
    #     "banner_text": "Welcome to Company AI",
    #     "banner_enabled": true,
    #     "banner_bg_color": "#1a1a24",
    #     "banner_text_color": "#ffffff",
    #     "chat_welcome_title": "How can I help you?",
    #     "chat_welcome_message": "Select an assistant to start",
    #     "theme": "dark",  # dark, light, system
    #     "custom_css": ""
    # }
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Organization {self.name}>"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'plan': self.plan,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

