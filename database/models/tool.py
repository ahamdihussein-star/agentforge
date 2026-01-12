"""
Tool Models - External Tools & Integrations
Support for API, Database, RAG, Email, Web Scraping, etc.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from enum import Enum

from ..base import Base


class ToolType(str, Enum):
    """Tool categories"""
    API = "api"
    DATABASE = "database"
    RAG = "rag"
    EMAIL = "email"
    WEB_SCRAPING = "web_scraping"
    WEB_SEARCH = "web_search"
    SLACK = "slack"
    WEBHOOK = "webhook"
    SPREADSHEET = "spreadsheet"
    CALENDAR = "calendar"
    CRM = "crm"
    CUSTOM = "custom"


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
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Basic Info
    type = Column(SQLEnum(ToolType), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Configuration
    config = Column(JSONB, default={})  # demo_mode, mock_response, source, kit_id, etc.
    
    # Type-specific configurations
    api_config = Column(JSONB)  # base_url, http_method, endpoint_path, auth_type, headers, etc.
    database_config = Column(JSONB)  # connection_string, query_template, etc.
    rag_config = Column(JSONB)  # kb_id, search_top_k, etc.
    email_config = Column(JSONB)  # smtp_config, template, etc.
    slack_config = Column(JSONB)  # webhook_url, channel, etc.
    
    # Parameters (inputs/outputs)
    input_parameters = Column(JSONB, default=[])  # Array of {name, description, type, required}
    output_schema = Column(JSONB)  # Expected response structure
    
    # Status & Activation
    is_active = Column(Boolean, default=True)
    is_validated = Column(Boolean, default=False)  # Has config been tested
    last_validation_at = Column(DateTime)
    validation_error = Column(Text)  # Last validation error if any
    
    # Access Control
    is_public = Column(Boolean, default=False)  # Public tools available to all org users
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    shared_with_user_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    shared_with_role_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
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
    allowed_domains = Column(ARRAY(String))  # Whitelist for API tools
    blocked_domains = Column(ARRAY(String))  # Blacklist
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID(as_uuid=True))
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True))
    
    # Additional metadata
    metadata = Column(JSONB, default={})
    
    def __repr__(self):
        return f"<Tool {self.name} ({self.type})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': self.id,
            'org_id': str(self.org_id),
            'type': self.type.value if self.type else None,
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
            'is_public': self.is_public,
            'owner_id': str(self.owner_id),
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
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # References
    tool_id = Column(String(100), nullable=False, index=True)
    agent_id = Column(UUID(as_uuid=True), index=True)
    conversation_id = Column(UUID(as_uuid=True), index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Execution Details
    input_params = Column(JSONB)  # Actual parameters passed
    output_data = Column(JSONB)  # Response data
    
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

