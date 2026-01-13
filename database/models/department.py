"""
Department Model - Organization departments
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from ..types import UUID, JSON
JSONB = JSON

from ..base import Base


class Department(Base):
    """Department within an organization"""
    __tablename__ = "departments"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Organization
    org_id = Column(UUID, nullable=False, index=True)
    
    # Department info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Hierarchy
    parent_id = Column(UUID, nullable=True)  # For nested departments
    manager_id = Column(UUID, nullable=True)  # User ID of department manager
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Department {self.name}>"

