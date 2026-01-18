"""
Tool Models - External Tools & Integrations
Support for API, Database, RAG, Email, Web Scraping, etc.
DATABASE-AGNOSTIC: Works with PostgreSQL, MySQL, SQLite, etc.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Index
from enum import Enum

from ..base import Base
from ..enums import ToolType  # Import from centralized enums
from ..column_types import UUID, JSON, JSONArray  # Database-agnostic types


class Tool(Base):
    """
    External Tool Definition
    Multi-tenant with row-level security
    Supports various tool types
    """
    __tablename__ = "tools"
    
    # Primary Key
    id = Column(String(100), primary_key=True)  # e.g., "kit_654ba0a4_api_0"
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Basic Info
    # Use String instead of PostgreSQL enum for flexibility (Enterprise Best Practice)
    # Validation handled by Python enum at application level
    type = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Configuration
    config = Column(JSON, default={})  # demo_mode, mock_response, source, kit_id, etc.
    
    # Type-specific configurations
    api_config = Column(JSON)  # base_url, http_method, endpoint_path, auth_type, headers, etc.
    database_config = Column(JSON)  # connection_string, query_template, etc.
    rag_config = Column(JSON)  # kb_id, search_top_k, etc.
    email_config = Column(JSON)  # smtp_config, template, etc.
    slack_config = Column(JSON)  # webhook_url, channel, etc.
    
    # Parameters (inputs/outputs)
    input_parameters = Column(JSON, default=[])  # Array of {name, description, type, required}
    output_schema = Column(JSON)  # Expected response structure
    
    # Status & Activation
    is_active = Column(Boolean, default=True)
    is_validated = Column(Boolean, default=False)  # Has config been tested
    last_validation_at = Column(DateTime)
    validation_error = Column(Text)  # Last validation error if any
    
    # Access Control
    owner_id = Column(UUID, nullable=False, index=True)
    # Access type: 'owner_only', 'authenticated', 'specific_users', 'public'
    access_type = Column(String(30), nullable=False, default='owner_only')
    # For specific_users access type
    allowed_user_ids = Column(JSONArray, default=[])  # Users who can view/use the tool
    allowed_group_ids = Column(JSONArray, default=[])  # Groups who can view/use the tool
    # Granular permissions (only for specific_users type)
    can_edit_user_ids = Column(JSONArray, default=[])  # Users who can edit the tool
    can_delete_user_ids = Column(JSONArray, default=[])  # Users who can delete the tool
    can_execute_user_ids = Column(JSONArray, default=[])  # Users who can use tool in agents
    # Legacy fields (kept for backward compatibility)
    is_public = Column(Boolean, default=False)  # Deprecated: Use access_type='public'
    shared_with_user_ids = Column(JSONArray, default=[])  # Deprecated: Use allowed_user_ids
    shared_with_role_ids = Column(JSONArray, default=[])  # Deprecated
    
    # Usage Tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    avg_response_time_ms = Column(Integer)  # Average response time
    
    # Rate Limiting
    rate_limit_per_minute = Column(Integer)  # Max calls per minute
    rate_limit_per_hour = Column(Integer)  # Max calls per hour
    rate_limit_per_day = Column(Integer)  # Max calls per day
    
    # Security
    requires_approval = Column(Boolean, default=False)  # Requires admin approval to use
    allowed_domains = Column(JSONArray)  # Whitelist for API tools
    blocked_domains = Column(JSONArray)  # Blacklist
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})
    
    def __repr__(self):
        return f"<Tool {self.name} ({self.type})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': self.id,
            'org_id': str(self.org_id),
            'type': self.type,  # Already a string now
            'name': self.name,
            'description': self.description,
            'config': self.config,
            'api_config': self.api_config,
            'database_config': self.database_config,
            'rag_config': self.rag_config,
            'email_config': self.email_config,
            'slack_config': self.slack_config,
            'input_parameters': self.input_parameters,
            'output_schema': self.output_schema,
            'is_active': self.is_active,
            'is_validated': self.is_validated,
            # Access Control
            'owner_id': str(self.owner_id),
            'access_type': self.access_type,
            'allowed_user_ids': self.allowed_user_ids or [],
            'allowed_group_ids': self.allowed_group_ids or [],
            'can_edit_user_ids': self.can_edit_user_ids or [],
            'can_delete_user_ids': self.can_delete_user_ids or [],
            'can_execute_user_ids': self.can_execute_user_ids or [],
            'is_public': self.is_public,  # Legacy
            'usage_count': self.usage_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ToolExecution(Base):
    """
    Tool Execution History
    Security & compliance logging
    Performance monitoring
    """
    __tablename__ = "tool_executions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    tool_id = Column(String(100), nullable=False, index=True)
    agent_id = Column(UUID, index=True)
    conversation_id = Column(UUID, index=True)
    user_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # Execution Details
    input_params = Column(JSON)  # Actual parameters passed
    output_data = Column(JSON)  # Response data
    
    # Result
    success = Column(Boolean, nullable=False)
    error_message = Column(Text)
    http_status_code = Column(Integer)
    
    # Performance
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)  # Execution duration
    
    # Network (for API tools)
    request_url = Column(String(1000))
    request_method = Column(String(10))
    response_size_bytes = Column(Integer)
    
    # Security
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(String(500))
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<ToolExecution {self.tool_id} ({'success' if self.success else 'failed'})>"


# Composite indexes for performance
Index('idx_tool_org_type', Tool.org_id, Tool.type)
Index('idx_tool_org_active', Tool.org_id, Tool.is_active)
Index('idx_tool_execution_org_tool', ToolExecution.org_id, ToolExecution.tool_id)
Index('idx_tool_execution_time', ToolExecution.org_id, ToolExecution.created_at.desc())

