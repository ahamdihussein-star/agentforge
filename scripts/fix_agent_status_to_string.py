#!/usr/bin/env python3
"""
Fix AgentStatus column - Convert from PostgreSQL ENUM to VARCHAR(20)
This makes the platform database-agnostic.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.base import get_engine

def fix_agent_status_column():
    """Convert status column from ENUM to VARCHAR(20)"""
    print("=" * 60)
    print("🔧 Converting AgentStatus from ENUM to VARCHAR(20)")
    print("=" * 60)
    
    engine = get_engine()
    with engine.connect() as conn:
        try:
            # Check current column type
            result = conn.execute(text("""
                SELECT data_type, udt_name 
                FROM information_schema.columns 
                WHERE table_name = 'agents' AND column_name = 'status';
            """)).fetchone()
            
            if result:
                print(f"   Current type: {result[0]} ({result[1]})")
                
                if result[1] == 'agentstatus':
                    print("   🔄 Converting ENUM to VARCHAR(20)...")
                    
                    # Convert enum to varchar, keeping existing values as lowercase
                    conn.execute(text("""
                        ALTER TABLE agents 
                        ALTER COLUMN status TYPE VARCHAR(20) 
                        USING LOWER(status::text);
                    """))
                    conn.commit()
                    print("   ✅ Successfully converted to VARCHAR(20)")
                    
                    # Drop the old enum type
                    try:
                        conn.execute(text("DROP TYPE IF EXISTS agentstatus;"))
                        conn.commit()
                        print("   ✅ Dropped old enum type")
                    except Exception as e:
                        print(f"   ⚠️  Could not drop enum type: {e}")
                else:
                    print("   ⏭️  Column is already VARCHAR, skipping")
            else:
                print("   ⚠️  Column 'status' not found in 'agents' table")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            conn.rollback()
    
    print()
    print("=" * 60)
    print("✅ AgentStatus column fix complete!")
    print("=" * 60)

if __name__ == "__main__":
    fix_agent_status_column()

