"""
Health Check Endpoints for Database Status
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("/db")
async def check_database_health():
    """
    Check database connection and status
    Returns database type, connection status, and version
    """
    try:
        from database.base import check_connection, get_engine
        from database.config import DatabaseConfig
        
        # Check connection
        is_connected = check_connection()
        
        if not is_connected:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        # Get engine info
        engine = get_engine()
        
        # Get database version (if possible)
        db_version = None
        try:
            with engine.connect() as conn:
                if DatabaseConfig.DB_TYPE == "postgresql":
                    result = conn.execute("SELECT version()")
                    db_version = result.scalar()
                elif DatabaseConfig.DB_TYPE == "mysql":
                    result = conn.execute("SELECT VERSION()")
                    db_version = result.scalar()
                elif DatabaseConfig.DB_TYPE == "sqlite":
                    result = conn.execute("SELECT sqlite_version()")
                    db_version = result.scalar()
        except:
            pass
        
        return {
            "status": "healthy",
            "database": {
                "type": DatabaseConfig.DB_TYPE,
                "connected": True,
                "version": db_version,
                "host": DatabaseConfig.DB_HOST if DatabaseConfig.DB_TYPE != "sqlite" else "file",
                "pool_size": DatabaseConfig.POOL_SIZE if DatabaseConfig.DB_TYPE != "sqlite" else "N/A"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/")
async def check_overall_health():
    """
    Overall health check
    """
    try:
        # Check database
        db_status = await check_database_health()
        
        return {
            "status": "healthy" if db_status.get("status") == "healthy" else "degraded",
            "components": {
                "database": db_status.get("status", "unknown"),
                "api": "healthy"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat()
        }

