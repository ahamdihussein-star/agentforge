"""
Agent Models - AI Agent Management
Enterprise-grade schema with audit trail and security
Supports both Conversational and Process-based agents
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Index
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON  # Alias for backwards compatibility

from ..base import Base


class Agent(Base):
    """
    AI Agent Definition
    Multi-tenant with row-level security
    Audit trail for compliance
    
    Supports two agent types:
    - CONVERSATIONAL: Free-form chat with tasks (default)
    - PROCESS: Workflow/Integration process with defined steps
    """
    __tablename__ = "agents"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    icon = Column(String(10), default="🤖")
    goal = Column(Text, nullable=False)
    description = Column(Text)
    
    # ==========================================================================
    # AGENT TYPE (NEW) - Database-agnostic: stored as String
    # ==========================================================================
    # Values: "conversational" (default), "process"
    # Python enum: database.enums.AgentType
    agent_type = Column(String(20), default="conversational", nullable=False, index=True)
    
    # Configuration
    model_id = Column(String(100), nullable=False)  # e.g., "gpt-4o", "claude-3"
    personality = Column(JSON, default={})  # tone, voice, languages, traits, etc.
    guardrails = Column(JSON, default={})  # anti_hallucination, cite_sources, etc.
    
    # Tasks & Tools (for CONVERSATIONAL agents)
    tasks = Column(JSON, default=[])  # Array of task definitions
    tool_ids = Column(JSONArray, default=[])  # References to tools
    
    # ==========================================================================
    # PROCESS DEFINITION (for PROCESS agents)
    # ==========================================================================
    # Full process/workflow definition stored as JSON
    # Schema defined in core/process/schemas.py
    process_definition = Column(JSON, default=None)
    
    # Process-specific settings
    process_settings = Column(JSON, default={})  # timeout, retry policy, etc.
    
    # Memory & Context
    memory = Column(JSON, default=[])  # Conversation memory
    memory_enabled = Column(Boolean, default=True)
    context_window = Column(Integer, default=4096)
    
    # Status & Publishing (String for database-agnostic design)
    status = Column(String(20), default="draft", nullable=False)
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime)
    
    # Access Control
    is_public = Column(Boolean, default=False)  # Public agents visible to all org users
    owner_id = Column(UUID, nullable=False, index=True)  # Created by
    shared_with_user_ids = Column(JSONArray, default=[])  # Shared users
    shared_with_role_ids = Column(JSONArray, default=[])  # Shared roles
    
    # Usage Tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)
    
    # Versioning (for future enhancement)
    version = Column(Integer, default=1)
    parent_version_id = Column(UUID)  # For version history
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})  # Extensible for future fields
    
    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================
    
    @property
    def is_conversational(self) -> bool:
        """Check if this is a conversational agent"""
        return self.agent_type == "conversational"
    
    @property
    def is_process(self) -> bool:
        """Check if this is a process/workflow agent"""
        return self.agent_type == "process"
    
    def __repr__(self):
        return f"<Agent {self.name} (org:{self.org_id})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        result = {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'name': self.name,
            'icon': self.icon,
            'goal': self.goal,
            'description': self.description,
            'agent_type': self.agent_type,
            'model_id': self.model_id,
            'personality': self.personality,
            'guardrails': self.guardrails,
            'memory_enabled': self.memory_enabled,
            'status': self.status,
            'is_published': self.is_published,
            'is_public': self.is_public,
            'owner_id': str(self.owner_id),
            'usage_count': self.usage_count,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        # Include type-specific fields
        if self.agent_type == "conversational":
            result['tasks'] = self.tasks
            result['tool_ids'] = self.tool_ids
        elif self.agent_type == "process":
            result['process_definition'] = self.process_definition
            result['process_settings'] = self.process_settings
        
        return result


# Composite indexes for performance
Index('idx_agent_org_status', Agent.org_id, Agent.status)
Index('idx_agent_org_owner', Agent.org_id, Agent.owner_id)
Index('idx_agent_org_public', Agent.org_id, Agent.is_public)
Index('idx_agent_org_type', Agent.org_id, Agent.agent_type)

