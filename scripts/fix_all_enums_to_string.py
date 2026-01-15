"""
Fix ALL remaining PostgreSQL ENUM columns to VARCHAR
This ensures complete database agnosticism.
"""
import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine

ENUM_FIXES = [
    # (table, column, enum_name)
    ("messages", "role", "messagerole"),
    ("users", "status", "userstatus"),
    ("users", "mfa_method", "mfamethod"),
    ("mfa_settings", "method", "mfamethod"),
    ("documents", "file_type", "documenttype"),
    ("documents", "status", "documentstatus"),
]

def fix_all_enums():
    print("=" * 60)
    print("🔧 Converting ALL ENUM columns to VARCHAR(20)")
    print("=" * 60)
    print()

    engine = get_engine()
    enums_to_drop = set()
    
    with engine.connect() as conn:
        for table, column, enum_name in ENUM_FIXES:
            try:
                # Check if table exists
                result = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    );
                """)).fetchone()
                
                if not result or not result[0]:
                    print(f"   ⏭️  Table '{table}' doesn't exist, skipping")
                    continue
                
                # Check column type
                result = conn.execute(text(f"""
                    SELECT data_type, udt_name
                    FROM information_schema.columns
                    WHERE table_name = '{table}' AND column_name = '{column}';
                """)).fetchone()
                
                if not result:
                    print(f"   ⏭️  Column '{table}.{column}' doesn't exist, skipping")
                    continue
                
                if result[1] == enum_name:
                    print(f"   🔄 Converting {table}.{column} from ENUM to VARCHAR(20)...")
                    conn.execute(text(f"""
                        ALTER TABLE {table}
                        ALTER COLUMN {column} TYPE VARCHAR(20)
                        USING {column}::text;
                    """))
                    print(f"   ✅ Converted {table}.{column}")
                    enums_to_drop.add(enum_name)
                else:
                    print(f"   ⏭️  {table}.{column} is already {result[1]}, skipping")
                    
            except Exception as e:
                print(f"   ⚠️  Error with {table}.{column}: {e}")
                conn.rollback()
                continue
        
        # Drop unused enum types
        for enum_name in enums_to_drop:
            try:
                conn.execute(text(f"DROP TYPE IF EXISTS {enum_name};"))
                print(f"   🗑️  Dropped enum type: {enum_name}")
            except Exception as e:
                print(f"   ⚠️  Could not drop {enum_name}: {e}")
        
        conn.commit()
    
    print()
    print("=" * 60)
    print("✅ All ENUM columns converted to VARCHAR!")
    print("=" * 60)

if __name__ == "__main__":
    fix_all_enums()
    sys.exit(0)

