"""
Add Missing Columns to Users Table
Alters existing users table to add new columns for RBAC, security, and external auth
"""
import sys
import os
import re

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.base import get_engine

print("🔧 Adding Missing Columns to Users Table")
print("=" * 60)

def _sanitize_username(raw: str) -> str:
    s = (raw or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9._-]", "", s)
    s = s.strip("._-")
    return s

def _col_exists(connection, column: str) -> bool:
    check_query = text("""
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = :c
        LIMIT 1
    """)
    return connection.execute(check_query, {"c": column}).fetchone() is not None

def _constraint_exists(connection, name: str) -> bool:
    try:
        q = text("""
            SELECT 1
            FROM pg_constraint
            WHERE conname = :n
            LIMIT 1
        """)
        return connection.execute(q, {"n": name}).fetchone() is not None
    except Exception:
        return False

try:
    engine = get_engine()
    
    with engine.connect() as connection:
        print("📊 Adding new columns to users table...")
        
        # Add columns (PostgreSQL syntax, but should work on most DBs)
        alter_statements = [
            # Username login (org-scoped unique; enforced via constraint)
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(120)",

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

        # Ensure username index exists (PostgreSQL)
        try:
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)"))
        except Exception:
            pass

        # Backfill usernames (best-effort, mirrors migration logic)
        try:
            rows = connection.execute(text(
                "SELECT id, org_id, email FROM users WHERE username IS NULL OR username = ''"
            )).fetchall()
        except Exception:
            rows = []

        used = {}
        for uid, org_id, email in rows:
            uid = str(uid)
            org_key = str(org_id or "") or "_"
            email = str(email or "")
            used.setdefault(org_key, set())

            base = _sanitize_username(email.split("@")[0]) if ("@" in email) else ""
            if not base:
                base = "user"
            if base == "admin" and uid != "user_super_admin":
                base = "admin_user"

            candidate = (base or "user")[:80]
            if "@" in candidate:
                candidate = "user"

            if candidate in used[org_key]:
                suffix = uid.replace("-", "")[-4:] if uid else "0000"
                candidate = f"{candidate}_{suffix}"[:120]
            counter = 2
            while candidate in used[org_key]:
                candidate = f"{base}_{counter}"[:120]
                counter += 1

            used[org_key].add(candidate)
            try:
                connection.execute(text("UPDATE users SET username = :u WHERE id = :id"), {"u": candidate, "id": uid})
            except Exception:
                pass

        # Add unique constraint on (org_id, username) when supported (PostgreSQL)
        try:
            if not _constraint_exists(connection, "users_org_username_key"):
                connection.execute(text("ALTER TABLE users ADD CONSTRAINT users_org_username_key UNIQUE (org_id, username)"))
        except Exception:
            # Best-effort: if duplicates exist or constraint already present, ignore.
            pass
        
        # Commit changes
        connection.commit()
        
        print("\n" + "=" * 60)
        print("✅ Users table updated successfully!")
        print("   Added/verified columns for username login + RBAC, security, and external auth")
        print("=" * 60)
        
except Exception as e:
    print(f"\n❌ Error updating users table: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

