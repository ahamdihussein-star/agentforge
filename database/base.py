"""
SQLAlchemy Base and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator

from .config import DatabaseConfig

# Create declarative base
Base = declarative_base()

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
def get_db_session() -> Generator[Session, None, None]:
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
    
    # Import all models here to ensure they're registered
    from .models import *  # noqa
    
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def check_connection():
    """Check if database connection is working"""
    try:
        from sqlalchemy import text
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        # Silent failure for retry logic
        return False

