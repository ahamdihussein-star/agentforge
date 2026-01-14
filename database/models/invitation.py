"""
Invitation Model - User invitations
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class Invitation(Base):
    """User invitation model"""
    __tablename__ = "invitations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Invitation details
    email = Column(String(255), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    
    # Assignment
    role_ids = Column(JSONArray, default=list)  # List of role IDs
    department_id = Column(UUID, nullable=True)
    group_ids = Column(JSONArray, default=list)  # List of group IDs
    
    # Invitation details
    invited_by = Column(UUID, nullable=True)  # User ID (nullable for legacy invitations)
    message = Column(Text, nullable=True)
    
    # Status
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    # Tracking
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    resend_count = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<Invitation {self.email}>"

