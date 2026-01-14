"""
SQLAlchemy Base and Session Management

Enterprise Best Practices:
- Uses PEP 563 (from __future__ import annotations) for postponed evaluation
- Uses TYPE_CHECKING to avoid runtime imports of typing modules
- Follows same patterns as Django, Flask, SQLAlchemy core
- Prevents circular import issues in enterprise deployments
"""
from __future__ import annotations  # PEP 563: Postponed evaluation of annotations

from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # Enterprise pattern: Type hints only, not imported at runtime
    # This prevents circular import issues with Python's typing module
    # Same approach used by Django, Flask, FastAPI, SQLAlchemy
    from typing import Generator

from .config import DatabaseConfig

# Create declarative base
Base = declarative_base()

# Models will be imported in init_db() when needed
# Removed module-level imports to avoid crashes on startup

# Global engine and session factory
_engine = None
_SessionLocal = None


def get_engine():
    """Get or create database engine (singleton)"""
    global _engine
    
    if _engine is None:
        database_url = DatabaseConfig.get_database_url()
        engine_config = DatabaseConfig.get_engine_config()
        
        _engine = create_engine(database_url, **engine_config)
        
        print(f"✅ Database engine created: {DatabaseConfig.DB_TYPE}")
    
    return _engine


def get_session_factory():
    """Get or create session factory"""
    global _SessionLocal
    
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
            expire_on_commit=False
        )
    
    return _SessionLocal


def get_session() -> Session:
    """Get a new database session"""
    SessionLocal = get_session_factory()
    return SessionLocal()


@contextmanager
def get_db_session() -> "Generator[Session, None, None]":
    """
    Context manager for database sessions
    
    Usage:
        with get_db_session() as db:
            user = db.query(User).first()
    """
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db():
    """Initialize database (create all tables)"""
    engine = get_engine()
    
    # Import ALL models to register with Base.metadata
    try:
        print("📦 Importing all database models...")
        
        # Security & Access Control
        from .models.organization import Organization
        from .models.role import Role, Permission, role_permissions
        from .models.user import User, UserSession, MFASetting, PasswordHistory
        from .models.invitation import Invitation
        from .models.department import Department
        from .models.user_group import UserGroup
        from .models.policy import Policy
        from .models.tool_permission import ToolPermission
        from .models.kb_permission import KnowledgeBasePermission
        from .models.db_permission import DatabasePermission
        from .models.ldap_config import LDAPConfig
        from .models.oauth_config import OAuthConfig
        from .models.security_settings import SecuritySettings
        
        # Core Platform
        from .models.agent import Agent
        from .models.tool import Tool, ToolExecution
        from .models.conversation import Conversation, Message, ConversationShare
        from .models.knowledge_base import KnowledgeBase, Document, DocumentChunk, KBQuery
        
        # Configuration
        from .models.settings import SystemSetting, OrganizationSetting, APIKey, Integration, UserIntegration
        
        # Audit & Compliance
        from .models.audit import AuditLog, SecurityEvent, DataExport, ComplianceReport
        
        print("✅ All models imported successfully")
    except ImportError as e:
        print(f"⚠️  Could not import some models: {e}")
        import traceback
        traceback.print_exc()
    
    # Create all tables
    print("🔨 Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def check_connection():
    """Check if database connection is working"""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        # Silent failure for retry logic
        return False

