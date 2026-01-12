"""
Agent Models - AI Agent Management
Enterprise-grade schema with audit trail and security
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from enum import Enum

from ..base import Base


class AgentStatus(str, Enum):
    """Agent lifecycle status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"
    DELETED = "deleted"  # Soft delete


class Agent(Base):
    """
    AI Agent Definition
    Multi-tenant with row-level security
    Audit trail for compliance
    """
    __tablename__ = "agents"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    icon = Column(String(10), default="🤖")
    goal = Column(Text, nullable=False)
    description = Column(Text)
    
    # Configuration
    model_id = Column(String(100), nullable=False)  # e.g., "gpt-4o", "claude-3"
    personality = Column(JSONB, default={})  # tone, voice, languages, traits, etc.
    guardrails = Column(JSONB, default={})  # anti_hallucination, cite_sources, etc.
    
    # Tasks & Tools
    tasks = Column(JSONB, default=[])  # Array of task definitions
    tool_ids = Column(ARRAY(String), default=[])  # References to tools
    
    # Memory & Context
    memory = Column(JSONB, default=[])  # Conversation memory
    memory_enabled = Column(Boolean, default=True)
    context_window = Column(Integer, default=4096)
    
    # Status & Publishing
    status = Column(SQLEnum(AgentStatus), default=AgentStatus.DRAFT, nullable=False)
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)
    
    # Access Control
    is_public = Column(Boolean, default=False)  # Public agents visible to all org users
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Created by
    shared_with_user_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])  # Shared users
    shared_with_role_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])  # Shared roles
    
    # Usage Tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Versioning (for future enhancement)
    version = Column(Integer, default=1)
    parent_version_id = Column(UUID(as_uuid=True))  # For version history
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID(as_uuid=True))
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID(as_uuid=True))
    
    # Additional metadata
    extra_metadata = Column(JSONB, default={})  # Extensible for future fields
    
    def __repr__(self):
        return f"<Agent {self.name} (org:{self.org_id})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'name': self.name,
            'icon': self.icon,
            'goal': self.goal,
            'description': self.description,
            'model_id': self.model_id,
            'personality': self.personality,
            'guardrails': self.guardrails,
            'tasks': self.tasks,
            'tool_ids': self.tool_ids,
            'memory_enabled': self.memory_enabled,
            'status': self.status.value if self.status else None,
            'is_published': self.is_published,
            'is_public': self.is_public,
            'owner_id': str(self.owner_id),
            'usage_count': self.usage_count,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


# Composite indexes for performance
Index('idx_agent_org_status', Agent.org_id, Agent.status)
Index('idx_agent_org_owner', Agent.org_id, Agent.owner_id)
Index('idx_agent_org_public', Agent.org_id, Agent.is_public)

