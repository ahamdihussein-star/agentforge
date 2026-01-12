"""
Drop and recreate tools table to remove PostgreSQL enum
This script removes the native enum type and recreates the table with VARCHAR
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from database.base import get_db_session, engine
from sqlalchemy import text

def drop_and_recreate_tools_table():
    """Drop tools table and enum type, then recreate with VARCHAR"""
    
    print("🔧 Fixing Tools Table (Removing PostgreSQL Enum)")
    print("=" * 60)
    
    with engine.connect() as conn:
        try:
            # 1. Drop the tools table
            print("1️⃣  Dropping tools table...")
            conn.execute(text("DROP TABLE IF EXISTS tools CASCADE"))
            conn.commit()
            print("   ✅ Tools table dropped")
            
            # 2. Drop the enum type
            print("2️⃣  Dropping tooltype enum...")
            conn.execute(text("DROP TYPE IF EXISTS tooltype CASCADE"))
            conn.commit()
            print("   ✅ tooltype enum dropped")
            
            # 3. Recreate table using SQLAlchemy (will use String(50))
            print("3️⃣  Recreating tools table with VARCHAR...")
            from database.models.tool import Tool
            Tool.__table__.create(engine, checkfirst=True)
            print("   ✅ Tools table recreated with VARCHAR type column")
            
            print()
            print("=" * 60)
            print("✅ Tools table fixed! Now using VARCHAR instead of enum")
            print("   This is database-agnostic and works on ALL databases")
            print()
            
        except Exception as e:
            print(f"❌ Error: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    drop_and_recreate_tools_table()

