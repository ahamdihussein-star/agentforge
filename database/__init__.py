"""
AgentForge Database Package
Database-agnostic ORM layer using SQLAlchemy
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle
"""
# Don't import base at module level to avoid circular import
# Import directly from database.base when needed
# Example: from database.base import Base, get_engine

__all__ = ['Base', 'get_engine', 'get_session', 'init_db', 'check_connection']

