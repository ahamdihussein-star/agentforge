"""
Add Missing Columns to Users Table
Alters existing users table to add new columns for RBAC, security, and external auth
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.base import get_engine

print("🔧 Adding Missing Columns to Users Table")
print("=" * 60)

try:
    engine = get_engine()
    
    with engine.connect() as connection:
        # Check if role_ids column exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role_ids'
        """)
        result = connection.execute(check_query).fetchone()
        
        if result:
            print("✅ Columns already exist, skipping...")
            sys.exit(0)
        
        print("📊 Adding new columns to users table...")
        
        # Add columns (PostgreSQL syntax, but should work on most DBs)
        alter_statements = [
            # RBAC
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role_ids TEXT DEFAULT '[]'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS group_ids TEXT DEFAULT '[]'",
            
            # External Auth
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)",
            
            # Security
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP",
            
            # Activity
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
        ]
        
        for i, statement in enumerate(alter_statements, 1):
            try:
                connection.execute(text(statement))
                print(f"   ✅ {i}/{len(alter_statements)} columns added")
            except Exception as e:
                # Column might already exist, that's OK
                if "already exists" not in str(e).lower():
                    print(f"   ⚠️  {i}/{len(alter_statements)}: {e}")
        
        # Commit changes
        connection.commit()
        
        print("\n" + "=" * 60)
        print("✅ Users table updated successfully!")
        print("   Added 11 new columns for RBAC, security, and external auth")
        print("=" * 60)
        
except Exception as e:
    print(f"\n❌ Error updating users table: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

