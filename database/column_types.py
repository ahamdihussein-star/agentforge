"""
Database-Agnostic Column Type Definitions
Works with PostgreSQL, MySQL, SQLite, SQL Server, Oracle

Note: This file was renamed from 'types.py' to 'column_types.py' to avoid
conflict with Python's standard library 'types' module.
"""
from sqlalchemy.types import TypeDecorator, TEXT, String
from sqlalchemy.dialects import postgresql, mysql, sqlite
import json
import uuid


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
    Stores arrays as JSONB (not PostgreSQL ARRAY) regardless of database.
    IMPORTANT: This stores as JSONB, NOT as native PostgreSQL ARRAY type.
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
        # Ensure we always have a list, never a string
        if value is None:
            value = []
        
        # If value is a JSON string, deserialize it
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # If not valid JSON, wrap in list
                value = [value] if value else []
        
        # Ensure it's a list
        if not isinstance(value, list):
            value = [value] if value else []
        
        # For PostgreSQL/MySQL with JSONB/JSON, pass the Python list directly
        # The driver will handle serialization
        if dialect.name in ('postgresql', 'mysql'):
            return value  # Return Python list - psycopg2/mysqlclient handles it
        else:
            return json.dumps(value)  # Serialize for SQLite etc.
    
    def process_result_value(self, value, dialect):
        if value is None:
            return []
        if dialect.name in ('postgresql', 'mysql'):
            # Should already be a Python list from JSONB
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return []
            return value if isinstance(value, list) else []
        else:
            return json.loads(value) if value else []


# Convenience aliases
UUID = GUID
JSONB = JSON
ARRAY_UUID = JSONArray  # Store UUID arrays as JSON
ARRAY_String = JSONArray  # Store string arrays as JSON

__all__ = ['GUID', 'UUID', 'JSON', 'JSONB', 'JSONArray', 'ARRAY_UUID', 'ARRAY_String']
