"""
Role and Permission Models - RBAC
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Table
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from ..base import Base


# Association table for many-to-many relationship (FKs removed)
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), primary_key=True)
)


class Role(Base):
    """Role definition"""
    __tablename__ = "roles"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Role Info
    name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # System vs Custom
    is_system = Column(Boolean, default=False)  # Cannot be deleted if True
    
    # Organization (Multi-tenancy) - FK removed
    org_id = Column(UUID, index=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Role {self.name}>"


class Permission(Base):
    """Permission definition"""
    __tablename__ = "permissions"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Permission Info
    name = Column(String(100), unique=True, nullable=False, index=True)
    resource = Column(String(50), nullable=False)  # agents, tools, users, etc.
    action = Column(String(50), nullable=False)    # read, write, delete, execute
    description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Permission {self.name}>"

