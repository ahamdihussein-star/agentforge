#!/usr/bin/env python3
"""
Add Identity & Org Chart Columns to Users and Organizations Tables

Adds:
- users.manager_id (UUID) - Direct reporting manager (User ID)
- users.employee_id (VARCHAR(100)) - HR system employee identifier
- organizations.directory_source (VARCHAR(20)) - Identity source: internal, ldap, hr_api, hybrid
- organizations.hr_api_config (TEXT) - HR API configuration JSON

Also fixes: if manager_id was previously created as VARCHAR(36), converts it to UUID.
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine, get_db_session
from sqlalchemy import text


def _column_exists(session, engine, table_name: str, col_name: str) -> bool:
    """Check if a column exists in a table."""
    if engine.dialect.name == 'postgresql':
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name=:table_name AND column_name=:col_name
        """)
        result = session.execute(check_query, {"table_name": table_name, "col_name": col_name})
        return result.fetchone() is not None
    # SQLite / other - try and catch
    return False


def _get_column_type(session, engine, table_name: str, col_name: str) -> str:
    """Get the data_type of a column (PostgreSQL only)."""
    if engine.dialect.name != 'postgresql':
        return ''
    result = session.execute(text(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_name=:table_name AND column_name=:col_name"
    ), {"table_name": table_name, "col_name": col_name})
    row = result.fetchone()
    return row[0] if row else ''


def add_identity_columns():
    """Add identity and org chart columns to users and organizations tables."""
    print("\n" + "=" * 60)
    print("🔧 Adding Identity & Org Chart Columns")
    print("=" * 60 + "\n")

    engine = get_engine()
    is_pg = engine.dialect.name == 'postgresql'
    print(f"✅ Database engine created: {engine.dialect.name}")

    with get_db_session() as session:
        # ── Users: manager_id (UUID on PostgreSQL, VARCHAR(36) elsewhere) ──
        try:
            exists = _column_exists(session, engine, "users", "manager_id")
            if not exists:
                if is_pg:
                    session.execute(text("ALTER TABLE users ADD COLUMN manager_id UUID"))
                else:
                    session.execute(text("ALTER TABLE users ADD COLUMN manager_id VARCHAR(36)"))
                session.commit()
                try:
                    session.execute(text("CREATE INDEX IF NOT EXISTS ix_users_manager_id ON users (manager_id)"))
                    session.commit()
                except Exception:
                    session.rollback()
                print("   ✅ Added users.manager_id (UUID)")
            else:
                # Column exists — check if it's the wrong type (VARCHAR instead of UUID)
                if is_pg:
                    col_type = _get_column_type(session, engine, "users", "manager_id")
                    if col_type == 'character varying':
                        print("   ⚠️  users.manager_id is VARCHAR, converting to UUID...")
                        session.execute(text(
                            "ALTER TABLE users ALTER COLUMN manager_id TYPE UUID USING manager_id::uuid"
                        ))
                        session.commit()
                        print("   ✅ users.manager_id converted to UUID")
                    else:
                        print(f"   ⏭️  users.manager_id already exists ({col_type}), skipping")
                else:
                    print("   ⏭️  users.manager_id already exists, skipping")
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate column" in error_msg:
                print("   ⏭️  users.manager_id already exists (caught), skipping")
            else:
                print(f"   ❌ Error adding users.manager_id: {e}")
            session.rollback()

        # ── Users: employee_id ──
        try:
            exists = _column_exists(session, engine, "users", "employee_id")
            if not exists:
                session.execute(text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(100)"))
                session.commit()
                try:
                    session.execute(text("CREATE INDEX IF NOT EXISTS ix_users_employee_id ON users (employee_id)"))
                    session.commit()
                except Exception:
                    session.rollback()
                print("   ✅ Added users.employee_id")
            else:
                print("   ⏭️  users.employee_id already exists, skipping")
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate column" in error_msg:
                print("   ⏭️  users.employee_id already exists (caught), skipping")
            else:
                print(f"   ❌ Error adding users.employee_id: {e}")
            session.rollback()

        # ── Organizations: directory_source ──
        try:
            exists = _column_exists(session, engine, "organizations", "directory_source")
            if not exists:
                session.execute(text("ALTER TABLE organizations ADD COLUMN directory_source VARCHAR(20) DEFAULT 'internal'"))
                session.commit()
                print("   ✅ Added organizations.directory_source")
            else:
                print("   ⏭️  organizations.directory_source already exists, skipping")
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate column" in error_msg:
                print("   ⏭️  organizations.directory_source already exists (caught), skipping")
            else:
                print(f"   ❌ Error adding organizations.directory_source: {e}")
            session.rollback()

        # ── Organizations: hr_api_config ──
        try:
            exists = _column_exists(session, engine, "organizations", "hr_api_config")
            if not exists:
                session.execute(text("ALTER TABLE organizations ADD COLUMN hr_api_config TEXT"))
                session.commit()
                print("   ✅ Added organizations.hr_api_config")
            else:
                print("   ⏭️  organizations.hr_api_config already exists, skipping")
        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "duplicate column" in error_msg:
                print("   ⏭️  organizations.hr_api_config already exists (caught), skipping")
            else:
                print(f"   ❌ Error adding organizations.hr_api_config: {e}")
            session.rollback()

    print("\n" + "=" * 60)
    print("✅ Identity & Org Chart columns verification complete!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    add_identity_columns()
