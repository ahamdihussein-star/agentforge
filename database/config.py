"""
Database Configuration
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle
"""
import os
from enum import Enum
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session


class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    SQLSERVER = "sqlserver"
    ORACLE = "oracle"


class DatabaseConfig:
    """Database configuration with environment variable support"""
    
    # Database type (default: PostgreSQL)
    DB_TYPE = os.getenv('DB_TYPE', 'postgresql')
    
    # Connection parameters
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'agentforge')
    DB_USER = os.getenv('DB_USER', 'agentforge')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # SQLite file path (if using SQLite)
    SQLITE_PATH = os.getenv('SQLITE_PATH', 'data/agentforge.db')
    
    # Connection pool settings
    POOL_SIZE = int(os.getenv('DB_POOL_SIZE', '20'))
    MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', '10'))
    POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', '30'))
    POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))
    
    # SSL/TLS settings
    DB_SSL_MODE = os.getenv('DB_SSL_MODE', 'require')  # PostgreSQL
    DB_SSL_CA = os.getenv('DB_SSL_CA', '')
    DB_SSL_CERT = os.getenv('DB_SSL_CERT', '')
    DB_SSL_KEY = os.getenv('DB_SSL_KEY', '')
    
    # Enable query logging (development only)
    ECHO_SQL = os.getenv('DB_ECHO_SQL', 'false').lower() == 'true'

    # Connection timeouts (avoid long hangs during startup)
    CONNECT_TIMEOUT_SECONDS = int(os.getenv('DB_CONNECT_TIMEOUT', '5'))
    
    @classmethod
    def get_database_url(cls) -> str:
        """Generate database URL based on configuration"""
        
        # Railway automatic DATABASE_URL (highest priority)
        railway_url = os.getenv('DATABASE_URL')
        if railway_url:
            # Railway uses postgres:// but SQLAlchemy 2.0 needs postgresql://
            if railway_url.startswith('postgres://'):
                railway_url = railway_url.replace('postgres://', 'postgresql://', 1)
            return railway_url
        
        if cls.DB_TYPE == DatabaseType.SQLITE:
            return f"sqlite:///{cls.SQLITE_PATH}"
        
        elif cls.DB_TYPE == DatabaseType.POSTGRESQL:
            url = f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
            if cls.DB_SSL_MODE:
                url += f"?sslmode={cls.DB_SSL_MODE}"
            return url
        
        elif cls.DB_TYPE == DatabaseType.MYSQL:
            return f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"
        
        elif cls.DB_TYPE == DatabaseType.SQLSERVER:
            return f"mssql+pyodbc://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server"
        
        elif cls.DB_TYPE == DatabaseType.ORACLE:
            return f"oracle+cx_oracle://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        
        else:
            raise ValueError(f"Unsupported database type: {cls.DB_TYPE}")
    
    @classmethod
    def get_engine_config(cls) -> dict:
        """Get SQLAlchemy engine configuration"""
        config = {
            'echo': cls.ECHO_SQL,
            'future': True,  # Use SQLAlchemy 2.0 style
        }

        # Ensure connection attempts fail fast (prevents Railway "initializing" hangs)
        try:
            if cls.DB_TYPE == DatabaseType.POSTGRESQL:
                config['connect_args'] = {
                    'connect_timeout': cls.CONNECT_TIMEOUT_SECONDS
                }
        except Exception:
            # Never block engine creation on timeout config
            pass
        
        # Connection pooling (not for SQLite)
        if cls.DB_TYPE != DatabaseType.SQLITE:
            config.update({
                'pool_size': cls.POOL_SIZE,
                'max_overflow': cls.MAX_OVERFLOW,
                'pool_timeout': cls.POOL_TIMEOUT,
                'pool_recycle': cls.POOL_RECYCLE,
                'pool_pre_ping': True,  # Verify connections before using
            })
        
        return config


# =============================================================================
# DATABASE SESSION MANAGEMENT
# =============================================================================

# Lazy-initialized engine and session factory
_engine = None
_SessionLocal = None


def get_engine():
    """Get or create database engine (singleton)"""
    global _engine
    if _engine is None:
        _engine = create_engine(
            DatabaseConfig.get_database_url(),
            **DatabaseConfig.get_engine_config()
        )
    return _engine


def get_session_factory():
    """Get or create session factory (singleton)"""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=get_engine()
        )
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.
    Use with FastAPI's Depends():
    
    @app.get("/items")
    def get_items(db: Session = Depends(get_db)):
        ...
    """
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    """
    Get a new database session (must be closed manually).
    Use for non-FastAPI contexts.
    """
    SessionLocal = get_session_factory()
    return SessionLocal()

