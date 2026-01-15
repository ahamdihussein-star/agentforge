"""
Fix message role column from PostgreSQL ENUM to VARCHAR(20)
This ensures database agnosticism.
"""
import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine

def fix_message_role_to_string():
    print("=" * 60)
    print("🔧 Converting MessageRole from ENUM to VARCHAR(20)")
    print("=" * 60)

    engine = get_engine()
    with engine.connect() as connection:
        try:
            # Check current type
            result = connection.execute(text("""
                SELECT data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'messages' AND column_name = 'role';
            """)).fetchone()

            if result:
                print(f"   Current type: {result[0]} ({result[1]})")
                
                if result[1] == 'messagerole':
                    print("   🔄 Converting ENUM to VARCHAR(20)...")
                    connection.execute(text("""
                        ALTER TABLE messages
                        ALTER COLUMN role TYPE VARCHAR(20)
                        USING role::text;
                    """))
                    print("   ✅ Successfully converted to VARCHAR(20)")

                    # Drop the old enum type
                    print("   🔄 Dropping old enum type...")
                    connection.execute(text("DROP TYPE IF EXISTS messagerole;"))
                    print("   ✅ Dropped old enum type")
                    connection.commit()
                else:
                    print("   ⏭️  Column is already VARCHAR, skipping")
                    connection.rollback()
            else:
                print("   ⚠️  Column 'role' not found in messages table")
                connection.rollback()
        except Exception as e:
            print(f"   ❌ Error: {e}")
            connection.rollback()
    
    print()
    print("=" * 60)
    print("✅ MessageRole column fix complete!")
    print("=" * 60)

if __name__ == "__main__":
    fix_message_role_to_string()
    sys.exit(0)

