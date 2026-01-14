"""
UserGroup Model - User groups for permission assignment
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class UserGroup(Base):
    """User group for permission assignment"""
    __tablename__ = "user_groups"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Group info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Memberships
    user_ids = Column(JSONArray, default=list)  # List of user IDs
    role_ids = Column(JSONArray, default=list)  # List of role IDs assigned to this group
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<UserGroup {self.name}>"

