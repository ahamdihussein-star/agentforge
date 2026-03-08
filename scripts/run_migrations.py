#!/usr/bin/env python3
"""
Database Migration Runner
Runs Alembic migrations to upgrade database schema
Safe for production use on Railway and other platforms
"""
import sys
import os
import subprocess

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    """Run database migrations"""
    print("=" * 60)
    print("🔄 Running Database Migrations")
    print("=" * 60)
    print()
    
    # Check database connection first
    print("1️⃣  Checking database connection...")
    try:
        from database import check_connection
        if not check_connection():
            print("❌ Database connection failed!")
            print("   Please check your DATABASE_URL environment variable")
            sys.exit(1)
        print("✅ Database connection successful!")
    except Exception as e:
        print(f"⚠️  Could not verify connection: {e}")
        print("   Proceeding with migration anyway...")
    
    print()
    
    # Run Alembic migrations
    print("2️⃣  Running Alembic migrations...")
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=project_root,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Database migrations applied successfully!")
            if result.stdout:
                print()
                print("Migration output:")
                print(result.stdout)
        else:
            print(f"❌ Migration failed with return code {result.returncode}")
            if result.stderr:
                print()
                print("Error output:")
                print(result.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Failed to run migrations: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ Migration complete!")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
