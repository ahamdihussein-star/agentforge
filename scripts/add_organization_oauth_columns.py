#!/usr/bin/env python3
"""
Add OAuth and Auth Settings Columns to Organizations Table
"""
import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine, get_db_session
from sqlalchemy import text


def add_organization_oauth_columns():
    """Add OAuth and auth settings columns to organizations table"""
    print("\n" + "="*60)
    print("🔧 Adding OAuth & Auth Settings Columns to Organizations Table")
    print("="*60 + "\n")
    
    engine = get_engine()
    print(f"✅ Database engine created: {engine.dialect.name}")
    
    # Define columns with proper defaults for PostgreSQL
    columns_to_add = [
        ("allowed_auth_providers", "JSONB", "'[]'::jsonb"),  # JSON array as JSONB
        ("require_mfa", "VARCHAR(10)", "'false'"),
        ("allowed_email_domains", "JSONB", "'[]'::jsonb"),  # JSON array as JSONB
        ("google_client_id", "VARCHAR(500)", "NULL"),
        ("google_client_secret", "VARCHAR(500)", "NULL"),
        ("microsoft_client_id", "VARCHAR(500)", "NULL"),
        ("microsoft_client_secret", "VARCHAR(500)", "NULL"),
        ("microsoft_tenant_id", "VARCHAR(255)", "NULL"),
        ("ldap_config_id", "UUID", "NULL"),
        ("max_users", "VARCHAR(10)", "'100'"),
        ("max_agents", "VARCHAR(10)", "'50'"),
        ("max_tools", "VARCHAR(10)", "'100'"),
        ("status", "VARCHAR(20)", "'active'"),
        ("domain", "VARCHAR(255)", "NULL"),
        ("logo_url", "VARCHAR(500)", "NULL"),
    ]
    
    with get_db_session() as session:
        for col_name, col_type, default_value in columns_to_add:
            try:
                # Check if column exists
                if engine.dialect.name == 'postgresql':
                    check_query = text("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name='organizations' AND column_name=:col_name
                    """)
                    result = session.execute(check_query, {"col_name": col_name})
                    exists = result.fetchone() is not None
                else:
                    exists = False
                
                if not exists:
                    print(f"   Adding column '{col_name}' ({col_type})...")
                    # PostgreSQL supports IF NOT EXISTS (9.5+)
                    if engine.dialect.name == 'postgresql':
                        # Use proper PostgreSQL syntax
                        if col_type == "JSONB":
                            alter_query = text(f"""
                                ALTER TABLE organizations 
                                ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}
                            """)
                        elif col_type == "UUID":
                            alter_query = text(f"""
                                ALTER TABLE organizations 
                                ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}
                            """)
                        else:
                            alter_query = text(f"""
                                ALTER TABLE organizations 
                                ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}
                            """)
                    else:
                        # Generic SQL syntax
                        alter_query = text(f"""
                            ALTER TABLE organizations 
                            ADD COLUMN {col_name} {col_type} DEFAULT {default_value}
                        """)
                    
                    session.execute(alter_query)
                    session.commit()
                    print(f"   ✅ Added column '{col_name}' ({col_type})")
                else:
                    print(f"   ⏭️  Column '{col_name}' already exists, skipping")
            except Exception as e:
                error_msg = str(e)
                # If column already exists, that's OK
                if "already exists" in error_msg.lower() or "duplicate column" in error_msg.lower():
                    print(f"   ⏭️  Column '{col_name}' already exists (caught exception), skipping")
                else:
                    print(f"   ❌ Error adding column '{col_name}': {e}")
                    import traceback
                    traceback.print_exc()
                session.rollback()
                # Continue with next column
    
    print("\n" + "="*60)
    print("✅ OAuth & Auth Settings columns verification complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    add_organization_oauth_columns()

