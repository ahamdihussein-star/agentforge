"""
Email Notification Settings Model
Centralized email configuration per organization
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from ..column_types import UUID, JSON
from ..base import Base


class EmailSettings(Base):
    """
    Organization-level Email Notification Settings
    Single source of truth for all email sending (Security, Process, Tools)
    """
    __tablename__ = "email_settings"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID, nullable=False, unique=True, index=True)
    
    # Provider Selection
    provider = Column(String(50), nullable=False, default='smtp')  # 'sendgrid', 'smtp', 'ses', etc.
    
    # SendGrid Settings
    sendgrid_api_key = Column(Text)  # Encrypted in production
    
    # SMTP Settings
    smtp_host = Column(String(255))
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(255))
    smtp_password = Column(Text)  # Encrypted in production
    smtp_use_tls = Column(Boolean, default=True)
    smtp_use_ssl = Column(Boolean, default=False)
    
    # AWS SES Settings (future)
    ses_region = Column(String(50))
    ses_access_key = Column(Text)
    ses_secret_key = Column(Text)
    
    # Common Settings
    from_email = Column(String(255), nullable=False, default='noreply@agentforge.to')
    from_name = Column(String(255), default='AgentForge')
    reply_to_email = Column(String(255))
    
    # Rate Limiting
    rate_limit_per_minute = Column(Integer)
    rate_limit_per_hour = Column(Integer)
    rate_limit_per_day = Column(Integer)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Domain/sender verified
    last_test_sent_at = Column(DateTime)
    last_test_success = Column(Boolean)
    last_error = Column(Text)
    
    # Audit Trail
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(UUID)
    
    def __repr__(self):
        return f"<EmailSettings org={self.org_id} provider={self.provider}>"
    
    def to_dict(self):
        """Convert to dict (excluding sensitive data)"""
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'provider': self.provider,
            'smtp_host': self.smtp_host,
            'smtp_port': self.smtp_port,
            'smtp_user': self.smtp_user,
            'smtp_use_tls': self.smtp_use_tls,
            'from_email': self.from_email,
            'from_name': self.from_name,
            'reply_to_email': self.reply_to_email,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_test_sent_at': self.last_test_sent_at.isoformat() if self.last_test_sent_at else None,
            'last_test_success': self.last_test_success,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
