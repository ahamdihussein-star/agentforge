"""
DatabasePermission Model - Fine-grained permissions for database tools
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class DatabasePermission(Base):
    """Fine-grained permissions for database tool access"""
    __tablename__ = "db_permissions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Database tool reference
    tool_id = Column(String(255), nullable=False, index=True)  # Database tool ID
    tool_name = Column(String(255), nullable=True)  # For display
    
    # Who has access
    role_ids = Column(JSONArray, default=list)
    user_ids = Column(JSONArray, default=list)
    group_ids = Column(JSONArray, default=list)
    
    # Table-level permissions
    allowed_tables = Column(JSONArray, default=list)  # Empty = all
    denied_tables = Column(JSONArray, default=list)
    
    # Column-level permissions (per table)
    column_permissions = Column(JSON, default=dict)
    # e.g., {"users": {"salary": False, "ssn": False}}
    
    # Hidden columns (completely invisible)
    hidden_columns = Column(JSON, default=dict)
    # e.g., {"users": ["password_hash", "ssn"]}
    
    # Row-level security (filter rules)
    row_filters = Column(JSON, default=dict)
    # e.g., {"employees": "department_id = ${user.department_id}"}
    
    # Action permissions
    can_select = Column(Boolean, default=True)
    can_insert = Column(Boolean, default=False)
    can_update = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_execute_procedures = Column(Boolean, default=False)
    can_create_tables = Column(Boolean, default=False)
    can_alter_tables = Column(Boolean, default=False)
    can_drop_tables = Column(Boolean, default=False)
    
    # Query restrictions
    max_rows_returned = Column(Integer, default=1000)
    max_query_time_seconds = Column(Integer, default=30)
    allowed_operations = Column(JSONArray, default=["SELECT"])  # SELECT, INSERT, UPDATE, DELETE
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID, nullable=True)
    
    def __repr__(self):
        return f"<DatabasePermission {self.tool_id}>"

