"""
Organization Model - Multi-tenancy support
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from ..types import UUID, JSON as JSONB

from ..base import Base


class Organization(Base):
    """Organization/Tenant model"""
    __tablename__ = "organizations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    
    # Plan & Settings
    plan = Column(String(50), default="free")  # free, starter, pro, enterprise
    settings = Column(JSON, default={})  # Organization-specific settings
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Organization {self.name}>"
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'name': self.name,
            'slug': self.slug,
            'plan': self.plan,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

