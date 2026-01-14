"""
Conversation Models - Chat History & Messages
Enterprise-grade with PII protection and audit trail
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, Enum as SQLEnum, Index, Boolean
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON  # Alias for backwards compatibility
from enum import Enum

from ..base import Base


class MessageRole(str, Enum):
    """Message sender role"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class Conversation(Base):
    """
    Chat Conversation
    Multi-tenant with privacy controls
    GDPR-compliant with data retention policies
    """
    __tablename__ = "conversations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # References
    agent_id = Column(UUID, nullable=False, index=True)
    user_id = Column(UUID, nullable=False, index=True)
    
    # Conversation Info
    title = Column(String(500))  # Auto-generated or user-set
    summary = Column(Text)  # AI-generated summary
    
    # Message Count (for quick stats)
    message_count = Column(Integer, default=0)
    
    # Status
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime)
    
    # Privacy & Compliance
    contains_pii = Column(Boolean, default=False)  # Flagged if PII detected
    pii_masked = Column(Boolean, default=False)  # Has PII been masked
    retention_policy_id = Column(UUID)  # Link to data retention policy
    scheduled_deletion_at = Column(DateTime)  # Auto-delete date per policy
    
    # Soft Delete
    deleted_at = Column(DateTime)
    deleted_by = Column(UUID)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_message_at = Column(DateTime)  # Last activity
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})  # Tags, labels, etc.
    
    def __repr__(self):
        return f"<Conversation {self.title} (agent:{self.agent_id})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'agent_id': str(self.agent_id),
            'user_id': str(self.user_id),
            'title': self.title,
            'summary': self.summary,
            'message_count': self.message_count,
            'is_archived': self.is_archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
        }


class Message(Base):
    """
    Individual Chat Message
    Immutable for audit trail
    PII protection built-in
    """
    __tablename__ = "messages"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    conversation_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    user_id = Column(UUID, nullable=False, index=True)
    
    # Message Content
    role = Column(SQLEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    content_masked = Column(Text)  # PII-masked version
    
    # Tool Usage
    tool_calls = Column(JSON, default=[])  # Tools called in this message
    tool_results = Column(JSON, default=[])  # Results from tool calls
    
    # RAG Sources
    sources = Column(JSON, default=[])  # Knowledge base sources cited
    
    # Metadata
    model_used = Column(String(100))  # LLM model that generated response
    tokens_used = Column(Integer)  # Token count
    response_time_ms = Column(Integer)  # Generation time
    
    # Security & PII
    contains_pii = Column(Boolean, default=False)
    pii_types = Column(JSONArray)  # ['email', 'phone', 'ssn', etc.]
    sentiment = Column(String(20))  # 'positive', 'negative', 'neutral', 'angry'
    
    # Flagging & Moderation
    flagged = Column(Boolean, default=False)
    flag_reason = Column(String(200))  # Inappropriate content, policy violation, etc.
    reviewed = Column(Boolean, default=False)
    reviewed_by = Column(UUID)
    reviewed_at = Column(DateTime)
    
    # Feedback
    user_feedback = Column(String(20))  # 'thumbs_up', 'thumbs_down'
    user_feedback_comment = Column(Text)
    user_feedback_at = Column(DateTime)
    
    # Immutable timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Soft Delete (GDPR right to be forgotten)
    deleted_at = Column(DateTime)
    
    def __repr__(self):
        return f"<Message {self.role} in {self.conversation_id}>"
    
    def to_dict(self, include_pii=True):
        """
        Convert to dictionary for API response
        include_pii: False to return masked content (for compliance)
        """
        return {
            'id': str(self.id),
            'conversation_id': str(self.conversation_id),
            'role': self.role.value if self.role else None,
            'content': self.content if include_pii or not self.pii_masked else self.content_masked,
            'tool_calls': self.tool_calls,
            'sources': self.sources,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user_feedback': self.user_feedback,
        }


class ConversationShare(Base):
    """
    Conversation Sharing
    For collaboration and review
    """
    __tablename__ = "conversation_shares"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # References
    conversation_id = Column(UUID, nullable=False, index=True)
    org_id = Column(UUID, nullable=False, index=True)
    
    # Sharing
    shared_by = Column(UUID, nullable=False)
    shared_with_user_id = Column(UUID)
    shared_with_role_id = Column(UUID)
    
    # Permissions
    can_view = Column(Boolean, default=True)
    can_comment = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)
    
    # Expiry
    expires_at = Column(DateTime)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime)
    revoked_by = Column(UUID)
    
    def __repr__(self):
        return f"<ConversationShare {self.conversation_id}>"


# Composite indexes for performance
Index('idx_conversation_org_user', Conversation.org_id, Conversation.user_id)
Index('idx_conversation_org_agent', Conversation.org_id, Conversation.agent_id)
Index('idx_conversation_time', Conversation.org_id, Conversation.created_at.desc())
Index('idx_message_conversation_time', Message.conversation_id, Message.timestamp.desc())
Index('idx_message_org_time', Message.org_id, Message.timestamp.desc())

