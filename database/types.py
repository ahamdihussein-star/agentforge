"""
Database-Agnostic Type Definitions
Works with PostgreSQL, MySQL, SQLite, SQL Server, Oracle

Enterprise Best Practice: Lazy imports to avoid circular import issues
with Python's typing module during startup.

This module uses __getattr__ (PEP 562) to delay SQLAlchemy imports until
classes are actually accessed, preventing circular import issues.
"""
import json
import uuid

# Module-level cache for lazy-loaded classes
_classes_initialized = False
_GUID = None
_JSON = None
_JSONArray = None


def __getattr__(name):
    """
    Lazy import mechanism for database types.
    
    Enterprise best practice: Delay SQLAlchemy imports until classes
    are actually accessed, preventing circular import issues with
    Python's typing module during startup.
    
    This is called when a name is not found in the module namespace,
    allowing us to delay SQLAlchemy imports until classes are actually needed.
    """
    global _classes_initialized, _GUID, _JSON, _JSONArray
    
    # Initialize classes on first access
    if not _classes_initialized:
        try:
            _initialize_classes()
            _classes_initialized = True
        except ImportError as e:
            # Log error for debugging
            import sys
            print(f"⚠️  Error initializing database types: {e}", file=sys.stderr)
            raise
    
    # Return requested class
    if name == 'GUID' or name == 'UUID':
        return _GUID
    elif name == 'JSON' or name == 'JSONB':
        return _JSON
    elif name == 'JSONArray' or name == 'ARRAY_UUID' or name == 'ARRAY_String':
        return _JSONArray
    else:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


def _initialize_classes():
    """Initialize TypeDecorator classes with lazy SQLAlchemy imports"""
    global _GUID, _JSON, _JSONArray
    
    # Lazy import SQLAlchemy - only when classes are actually needed
    # This prevents circular import issues with Python's typing module
    try:
        from sqlalchemy.types import TypeDecorator, TEXT, String
        from sqlalchemy.dialects import postgresql, mysql, sqlite
    except ImportError as e:
        import sys
        print(f"❌ Failed to import SQLAlchemy types: {e}", file=sys.stderr)
        raise
    
    class GUID(TypeDecorator):
        """
        Platform-independent GUID type.
        Uses PostgreSQL's UUID, MySQL's CHAR(36), SQLite's TEXT, etc.
        """
        impl = String(36)
        cache_ok = True
        
        def load_dialect_impl(self, dialect):
            if dialect.name == 'postgresql':
                return dialect.type_descriptor(postgresql.UUID(as_uuid=True))
            elif dialect.name == 'mysql':
                return dialect.type_descriptor(String(36))
            elif dialect.name == 'mssql':
                return dialect.type_descriptor(String(36))
            else:
                return dialect.type_descriptor(String(36))
        
        def process_bind_param(self, value, dialect):
            if value is None:
                return value
            elif dialect.name == 'postgresql':
                return value
            else:
                if isinstance(value, uuid.UUID):
                    return str(value)
                return value
        
        def process_result_value(self, value, dialect):
            if value is None:
                return value
            if isinstance(value, uuid.UUID):
                return value
            return uuid.UUID(value)
    
    class JSON(TypeDecorator):
        """
        Platform-independent JSON type.
        Uses PostgreSQL's JSONB, MySQL's JSON, SQLite's TEXT with JSON serialization.
        """
        impl = TEXT
        cache_ok = True
        
        def load_dialect_impl(self, dialect):
            if dialect.name == 'postgresql':
                return dialect.type_descriptor(postgresql.JSONB())
            elif dialect.name == 'mysql':
                return dialect.type_descriptor(mysql.JSON())
            else:
                return dialect.type_descriptor(TEXT())
        
        def process_bind_param(self, value, dialect):
            if value is None:
                return value
            if dialect.name in ('postgresql', 'mysql'):
                return value  # Native JSON support
            else:
                return json.dumps(value)  # Serialize for others
        
        def process_result_value(self, value, dialect):
            if value is None:
                return value
            if dialect.name in ('postgresql', 'mysql'):
                return value  # Already deserialized
            else:
                return json.loads(value)  # Deserialize for others
    
    class JSONArray(TypeDecorator):
        """
        Platform-independent JSON Array type.
        Stores arrays as JSON regardless of database.
        """
        impl = TEXT
        cache_ok = True
        
        def load_dialect_impl(self, dialect):
            if dialect.name == 'postgresql':
                return dialect.type_descriptor(postgresql.JSONB())
            elif dialect.name == 'mysql':
                return dialect.type_descriptor(mysql.JSON())
            else:
                return dialect.type_descriptor(TEXT())
        
        def process_bind_param(self, value, dialect):
            if value is None:
                return []
            # If value is a JSON string, deserialize it first
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    # If it's not valid JSON, treat as single string element
                    pass
            if dialect.name in ('postgresql', 'mysql'):
                return value
            else:
                return json.dumps(value)
        
        def process_result_value(self, value, dialect):
            if value is None:
                return []
            if dialect.name in ('postgresql', 'mysql'):
                return value
            else:
                return json.loads(value) if value else []
    
    # Cache classes
    _GUID = GUID
    _JSON = JSON
    _JSONArray = JSONArray


# Note: Classes are initialized lazily via __getattr__
# This prevents SQLAlchemy imports during module load, avoiding circular imports
# Models will trigger __getattr__ when they access UUID, JSON, etc.

__all__ = ['GUID', 'UUID', 'JSON', 'JSONB', 'JSONArray', 'ARRAY_UUID', 'ARRAY_String']
