"""
AgentForge Database Package
Database-agnostic ORM layer using SQLAlchemy
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle
"""
from .base import Base, get_engine, get_session, init_db, check_connection

# Don't import types at module level to avoid circular import
# Types should be imported directly from database.types in model files
# Example: from ..types import UUID, JSON

__all__ = ['Base', 'get_engine', 'get_session', 'init_db', 'check_connection']

