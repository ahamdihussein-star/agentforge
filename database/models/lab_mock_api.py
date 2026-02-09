"""
Lab Mock API Model - Persisted mock API definitions and data
Stores all mock API info in DB so retrieval is by id/slug and data comes from DB.
DATABASE-AGNOSTIC: Uses column_types (UUID, JSON).
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Integer, Index

from ..base import Base
from ..column_types import UUID, JSON


class LabMockAPI(Base):
    """
    One generated mock API: metadata + data array.
    Enables lookup by id or slug and serves data from DB (no file scan).
    """
    __tablename__ = "lab_mock_apis"

    # Primary Key (same id as generated and used in URLs)
    id = Column(UUID, primary_key=True, default=uuid.uuid4)

    # Owner (optional for backward compat with file-only)
    user_id = Column(UUID, nullable=True, index=True)

    # Identity
    name = Column(String(255), nullable=False)
    slug = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Endpoint
    endpoint = Column(String(512), nullable=False)

    # Agent/tool metadata
    agent_description = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=True, default=list)  # [{name, description, data_type, required, location}]
    response_schema = Column(JSON, nullable=True, default=dict)

    # Data (array of records)
    data = Column(JSON, nullable=True, default=list)
    record_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_lab_mock_apis_user_created", "user_id", "created_at"),
    )
