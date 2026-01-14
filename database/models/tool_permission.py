"""
ToolPermission Model - Fine-grained permissions for tools
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class ToolPermission(Base):
    """Fine-grained permissions for a specific tool"""
    __tablename__ = "tool_permissions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Tool reference
    tool_id = Column(String(255), nullable=False, index=True)
    tool_name = Column(String(255), nullable=True)  # For display
    
    # Who has access
    role_ids = Column(JSONArray, default=list)
    user_ids = Column(JSONArray, default=list)
    group_ids = Column(JSONArray, default=list)
    
    # What actions are allowed
    can_view = Column(Boolean, default=True)
    can_execute = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    
    # Specific tool actions
    allowed_actions = Column(JSONArray, default=list)  # Specific tool actions allowed
    denied_actions = Column(JSONArray, default=list)   # Specific tool actions denied
    
    # Rate limits
    rate_limit_per_hour = Column(Integer, nullable=True)
    rate_limit_per_day = Column(Integer, nullable=True)
    
    # Time restrictions
    allowed_hours_start = Column(Integer, nullable=True)  # 0-23
    allowed_hours_end = Column(Integer, nullable=True)
    allowed_days = Column(JSONArray, default=[0, 1, 2, 3, 4, 5, 6])  # 0=Monday, 6=Sunday
    
    # IP restrictions
    allowed_ips = Column(JSONArray, default=list)
    denied_ips = Column(JSONArray, default=list)
    
    # Data scope restrictions
    data_scope = Column(JSON, nullable=True)  # Custom data filtering rules
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID, nullable=True)
    
    def __repr__(self):
        return f"<ToolPermission {self.tool_id}>"

