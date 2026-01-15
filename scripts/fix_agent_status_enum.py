#!/usr/bin/env python3
"""
Fix AgentStatus PostgreSQL Enum - Add PUBLISHED value

This script adds the 'published' value to the agentstatus enum in PostgreSQL.
PostgreSQL enums need to be explicitly updated when new values are added.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

def fix_agent_status_enum():
    """Add PUBLISHED value to PostgreSQL agentstatus enum"""
    print("=" * 60)
    print("🔧 Fixing AgentStatus PostgreSQL Enum")
    print("=" * 60)
    print()
    
    try:
        from database.base import get_engine
        engine = get_engine()
        print(f"✅ Database engine created: {engine.dialect.name}")
        
        with engine.connect() as connection:
            # Check if 'published' already exists in the enum
            result = connection.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'published' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agentstatus')
                );
            """)).fetchone()
            
            if result and result[0]:
                print("   ⏭️  'published' value already exists in agentstatus enum")
            else:
                print("   🔄 Adding 'published' value to agentstatus enum...")
                # First check what values exist in the enum
                existing = connection.execute(text("""
                    SELECT enumlabel FROM pg_enum 
                    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'agentstatus')
                    ORDER BY enumsortorder;
                """)).fetchall()
                print(f"   📋 Current enum values: {[e[0] for e in existing]}")
                
                # Add 'published' without AFTER clause (safer)
                connection.execute(text("""
                    ALTER TYPE agentstatus ADD VALUE IF NOT EXISTS 'published';
                """))
                connection.commit()
                print("   ✅ Added 'published' to agentstatus enum")
            
            print()
            print("=" * 60)
            print("✅ AgentStatus enum fix complete!")
            print("=" * 60)
            print()
            return True
            
    except Exception as e:
        print(f"❌ Error fixing AgentStatus enum: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = fix_agent_status_enum()
    sys.exit(0 if success else 1)

