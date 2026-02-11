#!/usr/bin/env python3
"""
Add Identity & Org Chart Columns to Users and Organizations Tables

Adds:
- users.manager_id (VARCHAR(36)) - Direct reporting manager (User ID)
- users.employee_id (VARCHAR(100)) - HR system employee identifier
- organizations.directory_source (VARCHAR(20)) - Identity source: internal, ldap, hr_api, hybrid
- organizations.hr_api_config (TEXT) - HR API configuration JSON
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


def add_identity_columns():
    """Add identity and org chart columns to users and organizations tables."""
    print("\n" + "=" * 60)
    print("🔧 Adding Identity & Org Chart Columns")
    print("=" * 60 + "\n")

    engine = get_engine()
    print(f"✅ Database engine created: {engine.dialect.name}")

    # ── Users table columns ──────────────────────────────────────
    users_columns = [
        ("manager_id", "VARCHAR(36)", "NULL"),      # Direct reporting manager (User ID)
        ("employee_id", "VARCHAR(100)", "NULL"),     # HR system employee identifier
    ]

    # ── Organizations table columns ──────────────────────────────
    org_columns = [
        ("directory_source", "VARCHAR(20)", "'internal'"),  # internal | ldap | hr_api | hybrid
        ("hr_api_config", "TEXT", "NULL"),                   # HR API configuration JSON
    ]

    with get_db_session() as session:
        # --- Users ---
        for col_name, col_type, default_value in users_columns:
            try:
                exists = _column_exists(session, engine, "users", col_name)
                if not exists:
                    print(f"   Adding users.{col_name} ({col_type})...")
                    alter_sql = text(
                        f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}"
                    )
                    session.execute(alter_sql)
                    session.commit()

                    # Create index for manager_id and employee_id
                    idx_name = f"ix_users_{col_name}"
                    try:
                        session.execute(text(
                            f"CREATE INDEX IF NOT EXISTS {idx_name} ON users ({col_name})"
                        ))
                        session.commit()
                        print(f"   ✅ Added users.{col_name} with index")
                    except Exception:
                        session.rollback()
                        print(f"   ✅ Added users.{col_name} (index may already exist)")
                else:
                    print(f"   ⏭️  users.{col_name} already exists, skipping")
            except Exception as e:
                error_msg = str(e).lower()
                if "already exists" in error_msg or "duplicate column" in error_msg:
                    print(f"   ⏭️  users.{col_name} already exists (caught), skipping")
                else:
                    print(f"   ❌ Error adding users.{col_name}: {e}")
                session.rollback()

        # --- Organizations ---
        for col_name, col_type, default_value in org_columns:
            try:
                exists = _column_exists(session, engine, "organizations", col_name)
                if not exists:
                    print(f"   Adding organizations.{col_name} ({col_type})...")
                    alter_sql = text(
                        f"ALTER TABLE organizations ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}"
                    )
                    session.execute(alter_sql)
                    session.commit()
                    print(f"   ✅ Added organizations.{col_name}")
                else:
                    print(f"   ⏭️  organizations.{col_name} already exists, skipping")
            except Exception as e:
                error_msg = str(e).lower()
                if "already exists" in error_msg or "duplicate column" in error_msg:
                    print(f"   ⏭️  organizations.{col_name} already exists (caught), skipping")
                else:
                    print(f"   ❌ Error adding organizations.{col_name}: {e}")
                session.rollback()

    print("\n" + "=" * 60)
    print("✅ Identity & Org Chart columns verification complete!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    add_identity_columns()
