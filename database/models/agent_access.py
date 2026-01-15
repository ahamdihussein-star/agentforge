"""
Agent Access Control Models
Enterprise-grade access policies for end-user agent usage
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..base import Base
from ..column_types import UUID, JSON

# Alias for compatibility
JSONB = JSON


class AgentAccessPolicy(Base):
    """
    Controls WHO can access WHICH agent
    Layer 1: Agent Access Control
    """
    __tablename__ = "agent_access_policies"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # Policy name for easy management
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Access Type: 'public', 'authenticated', 'role_based', 'user_specific', 'group_based'
    access_type = Column(String(30), nullable=False, default='authenticated')
    
    # Who has access (depending on access_type)
    role_ids = Column(JSONB, default=[])       # For role_based
    user_ids = Column(JSONB, default=[])       # For user_specific
    group_ids = Column(JSONB, default=[])      # For group_based
    department_ids = Column(JSONB, default=[]) # For department filtering
    
    # Channel restrictions
    allowed_channels = Column(JSONB, default=["web", "api"])  # 'web', 'slack', 'teams', 'whatsapp', 'api', 'widget'
    
    # Time-based access
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)
    active_hours_start = Column(String(10))  # "09:00"
    active_hours_end = Column(String(10))    # "18:00"
    active_timezone = Column(String(50), default='UTC')
    active_days = Column(JSONB, default=[1,2,3,4,5])  # 1=Monday, 7=Sunday
    
    # Rate limiting
    rate_limit_per_minute = Column(Integer, default=20)
    rate_limit_per_hour = Column(Integer, default=100)
    rate_limit_per_day = Column(Integer, default=1000)
    
    # Priority (higher = checked first)
    priority = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    def __repr__(self):
        return f"<AgentAccessPolicy {self.name} ({self.access_type})>"


class AgentDataPolicy(Base):
    """
    Controls WHAT DATA an agent can show to specific users
    Layer 2: Data Access Control
    """
    __tablename__ = "agent_data_policies"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Who this policy applies to
    applies_to = Column(String(30), nullable=False)  # 'all', 'role', 'user', 'group', 'department'
    role_ids = Column(JSONB, default=[])
    user_ids = Column(JSONB, default=[])
    group_ids = Column(JSONB, default=[])
    
    # Knowledge Base Access Scoping
    allowed_kb_ids = Column(JSONB, default=[])    # Empty = all allowed
    denied_kb_ids = Column(JSONB, default=[])
    
    # Document-level filtering
    document_filters = Column(JSONB, default={})  # {"department": "user.department"}
    
    # Field-level security
    hidden_fields = Column(JSONB, default=[])     # Fields to completely hide
    masked_fields = Column(JSONB, default=[])     # Fields to mask with ***
    
    # PII Handling
    pii_access_level = Column(String(20), default='masked')  # 'full', 'masked', 'redacted', 'none'
    
    # Priority
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AgentDataPolicy {self.name}>"


class AgentActionPolicy(Base):
    """
    Controls WHAT ACTIONS an agent can perform for specific users
    Layer 3: Action Access Control
    """
    __tablename__ = "agent_action_policies"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Who this policy applies to
    applies_to = Column(String(30), nullable=False)
    role_ids = Column(JSONB, default=[])
    user_ids = Column(JSONB, default=[])
    
    # Tool Restrictions
    allowed_tool_ids = Column(JSONB, default=[])   # Empty = all allowed
    denied_tool_ids = Column(JSONB, default=[])
    
    # Task Restrictions
    allowed_task_ids = Column(JSONB, default=[])   # Empty = all allowed
    denied_task_ids = Column(JSONB, default=[])
    
    # Action Limits
    max_actions_per_session = Column(Integer, default=50)
    max_tool_calls_per_message = Column(Integer, default=5)
    
    # Approval Requirements
    require_approval_for_tools = Column(JSONB, default=[])  # Tool IDs needing approval
    approval_workflow_id = Column(UUID)
    
    # Audit Level
    audit_level = Column(String(20), default='standard')  # 'minimal', 'standard', 'detailed'
    
    # Priority
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AgentActionPolicy {self.name}>"


class AgentDeployment(Base):
    """
    Deployment channels for agents
    Web Widget, Slack, Teams, WhatsApp, API, Embed
    """
    __tablename__ = "agent_deployments"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # Deployment name
    name = Column(String(255), nullable=False)
    
    # Channel type
    channel = Column(String(50), nullable=False)  # 'web_widget', 'slack', 'teams', 'whatsapp', 'api', 'embed', 'mobile'
    
    # Channel-specific configuration
    config = Column(JSONB, default={})  # Webhook URLs, API keys, etc.
    
    # Widget/Embed appearance
    appearance = Column(JSONB, default={})  # Colors, logo, position, theme
    
    # Access credentials
    access_token = Column(String(255), unique=True, index=True)
    api_key = Column(String(255), unique=True, index=True)
    
    # Allowed domains (for embed/widget)
    allowed_domains = Column(JSONB, default=[])  # ["example.com", "*.example.com"]
    
    # Rate limits for this deployment
    rate_limit_per_minute = Column(Integer, default=60)
    rate_limit_per_hour = Column(Integer, default=1000)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Stats
    total_conversations = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(UUID)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<AgentDeployment {self.name} ({self.channel})>"


class EndUserSession(Base):
    """
    Track end-user sessions across channels
    """
    __tablename__ = "end_user_sessions"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # User (can be anonymous for public agents)
    user_id = Column(UUID, index=True)  # NULL for anonymous
    anonymous_id = Column(String(255), index=True)  # For anonymous users
    
    # Session context
    agent_id = Column(UUID, ForeignKey('agents.id'), nullable=False, index=True)
    deployment_id = Column(UUID, ForeignKey('agent_deployments.id'), index=True)
    channel = Column(String(50), nullable=False)
    
    # Session data
    session_token = Column(String(255), unique=True, index=True)
    
    # Client info
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_type = Column(String(20))  # 'desktop', 'mobile', 'tablet'
    
    # Limits tracking
    messages_count = Column(Integer, default=0)
    actions_count = Column(Integer, default=0)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<EndUserSession {self.channel} ({self.agent_id})>"

