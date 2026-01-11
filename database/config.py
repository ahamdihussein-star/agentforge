"""
Database Configuration
Supports: PostgreSQL, MySQL, SQLite, SQL Server, Oracle
"""
import os
from enum import Enum


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

