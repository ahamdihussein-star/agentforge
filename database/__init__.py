"""
AgentForge Database Package
Database-agnostic ORM layer using SQLAlchemy
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle
"""
# Lazy import to avoid circular import with database.types
# Import base module only when accessed, not at module level

__all__ = ['Base', 'get_engine', 'get_session', 'init_db', 'check_connection']

# Lazy import - only import when actually accessed
def __getattr__(name):
    if name in __all__:
        # Import only when needed to avoid circular import
        from . import base
        if name == 'Base':
            return base.Base
        elif name == 'get_engine':
            return base.get_engine
        elif name == 'get_session':
            return base.get_session
        elif name == 'init_db':
            return base.init_db
        elif name == 'check_connection':
            return base.check_connection
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

