"""
Lab History Model - Persisted Lab-generated items (API, document, image)
Replaces localStorage so history is per-user and consistent across devices.
DATABASE-AGNOSTIC: Uses column_types (UUID, JSON).
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, Index

from ..base import Base
from ..column_types import UUID, JSON


class LabHistoryItem(Base):
    """
    One generated item in the Lab (API, document, or image).
    Stored per user so history is reliable and not tied to browser storage.
    """
    __tablename__ = "lab_history_items"

    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)

    # Owner (required for multi-user)
    user_id = Column(UUID, nullable=False, index=True)

    # Item type: api | document | image
    type = Column(String(20), nullable=False, index=True)

    # Display name
    name = Column(String(255), nullable=False)

    # Full result payload (same shape as generate API responses)
    result = Column(JSON, nullable=False, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_lab_history_items_user_created", "user_id", "created_at"),
    )
