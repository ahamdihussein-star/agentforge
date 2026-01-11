"""
User Model - Authentication and User Management
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum as SQLEnum, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from enum import Enum

from ..base import Base


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class MFAMethod(str, Enum):
    TOTP = "totp"
    EMAIL = "email"
    NONE = "none"


class User(Base):
    """User account model"""
    __tablename__ = "users"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Profile
    first_name = Column(String(100))
    last_name = Column(String(100))
    display_name = Column(String(100))
    phone = Column(String(20))
    job_title = Column(String(100))
    
    # Status
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    email_verified = Column(Boolean, default=False)
    
    # MFA
    mfa_enabled = Column(Boolean, default=False)
    mfa_method = Column(SQLEnum(MFAMethod), default=MFAMethod.NONE)
    mfa_secret_encrypted = Column(Text)  # Encrypted TOTP secret
    
    # Organization (Multi-tenancy) - FK removed for simplicity
    org_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    
    # Additional data (flexible JSON field)
    user_metadata = Column(JSONB, default={})
    
    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'display_name': self.display_name,
            'status': self.status.value if self.status else None,
            'email_verified': self.email_verified,
            'mfa_enabled': self.mfa_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class UserSession(Base):
    """User session tracking"""
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # FK removed
    
    # Session data
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    
    # Expiry
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<UserSession {self.user_id}>"


class MFASetting(Base):
    """MFA configuration and backup codes"""
    __tablename__ = "mfa_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)  # FK removed
    
    # MFA Configuration
    method = Column(SQLEnum(MFAMethod), nullable=False)
    secret_encrypted = Column(Text)  # TOTP secret (encrypted)
    backup_codes_encrypted = Column(Text)  # JSON array of backup codes (encrypted)
    
    # Status
    enabled = Column(Boolean, default=True)
    verified_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<MFASetting {self.user_id} - {self.method}>"


class PasswordHistory(Base):
    """Password change history for security auditing"""
    __tablename__ = "password_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # FK removed
    
    password_hash = Column(String(255), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    changed_by_user_id = Column(UUID(as_uuid=True))  # Who changed it (if admin)
    ip_address = Column(String(45))
    
    def __repr__(self):
        return f"<PasswordHistory {self.user_id}>"

