#!/usr/bin/env python3
"""
Database Initialization Script
Creates all tables and sets up initial data
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, check_connection


def main():
    """Initialize database"""
    print("=" * 60)
    print("🚀 AgentForge Database Initialization")
    print("=" * 60)
    print()
    
    # Check connection
    print("1️⃣  Checking database connection...")
    if not check_connection():
        print("❌ Database connection failed!")
        print("   Please check your database configuration in .env")
        sys.exit(1)
    
    print("✅ Database connection successful!")
    print()
    
    # Create tables
    print("2️⃣  Creating database tables...")
    try:
        init_db()
        print("✅ All tables created successfully!")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Start the application: uvicorn api.main:app --reload")
    print("  2. Access health check: http://localhost:8000/api/health/db")
    print("  3. (Optional) Migrate data: python scripts/migrate_to_db.py")
    print()


if __name__ == "__main__":
    main()

