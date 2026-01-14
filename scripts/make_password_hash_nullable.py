#!/usr/bin/env python3
"""
Make password_hash nullable for OAuth users
"""
import sys
import os
from sqlalchemy import text

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine, get_db_session

def make_password_hash_nullable():
    """Make password_hash column nullable in users table"""
    print("\n" + "="*60)
    print("🔧 Making password_hash nullable for OAuth users")
    print("="*60 + "\n")
    
    engine = get_engine()
    print(f"✅ Database engine created: {engine.dialect.name}")
    
    with get_db_session() as session:
        try:
            # Check current constraint
            if engine.dialect.name == 'postgresql':
                # PostgreSQL: ALTER COLUMN to allow NULL
                alter_query = text("""
                    ALTER TABLE users 
                    ALTER COLUMN password_hash DROP NOT NULL
                """)
            else:
                # SQLite/MySQL: Similar syntax
                alter_query = text("""
                    ALTER TABLE users 
                    MODIFY COLUMN password_hash VARCHAR(255) NULL
                """)
            
            session.execute(alter_query)
            session.commit()
            print("✅ password_hash column is now nullable")
            
        except Exception as e:
            session.rollback()
            # Check if error is because column is already nullable
            if "already" in str(e).lower() or "does not exist" in str(e).lower():
                print(f"ℹ️  password_hash column is already nullable (or error: {e})")
            else:
                print(f"⚠️  Error making password_hash nullable: {e}")
                import traceback
                traceback.print_exc()
                raise
    
    print("\n" + "="*60)
    print("✅ password_hash nullable constraint update complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    make_password_hash_nullable()

