"""
KnowledgeBasePermission Model - Fine-grained permissions for Knowledge Bases
"""
import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON

from ..base import Base


class KnowledgeBasePermission(Base):
    """Fine-grained permissions for Knowledge Base access"""
    __tablename__ = "kb_permissions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # KB reference
    kb_id = Column(String(255), nullable=False, index=True)  # Tool ID of the knowledge base
    kb_name = Column(String(255), nullable=True)  # For display
    
    # Who has access
    role_ids = Column(JSONArray, default=list)
    user_ids = Column(JSONArray, default=list)
    group_ids = Column(JSONArray, default=list)
    
    # Document-level permissions
    allowed_document_ids = Column(JSONArray, default=list)  # Empty = all
    denied_document_ids = Column(JSONArray, default=list)
    
    # Category-based access
    allowed_categories = Column(JSONArray, default=list)
    denied_categories = Column(JSONArray, default=list)
    
    # Tag-based access
    allowed_tags = Column(JSONArray, default=list)
    denied_tags = Column(JSONArray, default=list)
    
    # Classification-based access (user must have clearance)
    max_classification = Column(String(50), default="internal")  # DataClassification enum value
    
    # Action permissions
    can_search = Column(Boolean, default=True)
    can_view_full_content = Column(Boolean, default=True)
    can_view_metadata = Column(Boolean, default=True)
    can_download = Column(Boolean, default=False)
    can_upload = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    
    # Filter rules (row-level security for structured data)
    filter_rules = Column(JSON, default=dict)  # e.g., {"department": "${user.department_id}"}
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID, nullable=True)
    
    def __repr__(self):
        return f"<KnowledgeBasePermission {self.kb_id}>"

