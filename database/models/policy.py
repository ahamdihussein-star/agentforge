"""
Policy Model - ABAC policies
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from ..types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class Policy(Base):
    """Access policy definition for ABAC"""
    __tablename__ = "policies"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Policy info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # What this policy applies to
    resource_type = Column(String(100), nullable=False)  # ResourceType enum value
    resource_ids = Column(JSONArray, default=list)  # Empty = all resources of this type
    
    # Actions this policy governs
    actions = Column(JSONArray, default=list)  # e.g., ["read", "write", "execute"]
    
    # Who this policy applies to (optional - if empty, uses conditions)
    role_ids = Column(JSONArray, default=list)
    user_ids = Column(JSONArray, default=list)
    group_ids = Column(JSONArray, default=list)
    
    # Conditions (ABAC) - stored as JSON
    rules = Column(JSON, default=list)  # List of PolicyRule objects
    
    # Effect
    effect = Column(String(20), default="allow")  # allow, deny
    
    # Priority (lower = higher priority, deny policies should have lower priority)
    priority = Column(Integer, default=100)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID, nullable=True)
    
    def __repr__(self):
        return f"<Policy {self.name}>"

