"""
Database-Agnostic Type Definitions
Works with PostgreSQL, MySQL, SQLite, SQL Server, Oracle
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


# Convenience aliases
UUID = GUID
JSONB = JSON
ARRAY_UUID = JSONArray  # Store UUID arrays as JSON
ARRAY_String = JSONArray  # Store string arrays as JSON


__all__ = ['GUID', 'UUID', 'JSON', 'JSONB', 'JSONArray', 'ARRAY_UUID', 'ARRAY_String']

