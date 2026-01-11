"""
Railway-specific database configuration
Railway automatically provides DATABASE_URL environment variable
"""
import os
from .config import DatabaseConfig


def get_railway_database_url():
    """
    Get database URL from Railway environment
    Railway provides DATABASE_URL in format:
    postgresql://user:password@host:port/database
    """
    railway_db_url = os.getenv('DATABASE_URL')
    
    if railway_db_url:
        # Railway uses postgresql:// but SQLAlchemy 2.0 needs postgresql://
        if railway_db_url.startswith('postgres://'):
            railway_db_url = railway_db_url.replace('postgres://', 'postgresql://', 1)
        
        return railway_db_url
    
    # Fallback to manual configuration
    return DatabaseConfig.get_database_url()


# Override get_database_url for Railway
original_get_database_url = DatabaseConfig.get_database_url
DatabaseConfig.get_database_url = lambda: get_railway_database_url()

