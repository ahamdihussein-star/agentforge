"""
AgentForge Database Package
Database-agnostic ORM layer using SQLAlchemy
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle

Enterprise-grade lazy loading pattern:
- Uses __getattr__ for delayed imports (PEP 562)
- Caches imported module to avoid repeated imports
- Follows same pattern as Django, Flask, SQLAlchemy
"""
__all__ = ['Base', 'get_engine', 'get_session', 'init_db', 'check_connection']

# Cache for lazy-loaded base module (enterprise pattern)
_base_module = None


def __getattr__(name):
    """
    Lazy import mechanism for database.base module.
    
    Enterprise best practice:
    - Delays import until attribute is actually accessed
    - Caches module to avoid repeated imports
    - Prevents circular import issues during module initialization
    - Same pattern used by Django, Flask, SQLAlchemy
    
    This is the standard Python pattern (PEP 562) for lazy imports
    used in production enterprise frameworks.
    """
    global _base_module
    
    if name not in __all__:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
    
    # Lazy import: only import base module when first attribute is accessed
    if _base_module is None:
        from . import base
        _base_module = base
    
    # Return requested attribute from cached module
    return getattr(_base_module, name)

