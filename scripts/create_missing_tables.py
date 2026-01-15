#!/usr/bin/env python3
"""
Create Missing Database Tables
Fixes UndefinedTable errors for invitations, departments, user_groups, security_settings
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine, Base
from sqlalchemy import inspect, text


def create_missing_tables():
    """Create missing tables if they don't exist"""
    print("=" * 60)
    print("🔧 Creating Missing Database Tables")
    print("=" * 60)
    print()
    
    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    
    # Import all models to register them with Base.metadata
    print("📦 Importing all models...")
    try:
        from database.models.organization import Organization
        from database.models.role import Role, Permission, role_permissions
        from database.models.user import User, UserSession, MFASetting, PasswordHistory
        from database.models.invitation import Invitation
        from database.models.department import Department
        from database.models.user_group import UserGroup
        from database.models.policy import Policy
        from database.models.tool_permission import ToolPermission
        from database.models.kb_permission import KnowledgeBasePermission
        from database.models.db_permission import DatabasePermission
        from database.models.ldap_config import LDAPConfig
        from database.models.oauth_config import OAuthConfig
        from database.models.security_settings import SecuritySettings
        from database.models.agent import Agent
        from database.models.tool import Tool, ToolExecution
        from database.models.conversation import Conversation, Message, ConversationShare
        from database.models.knowledge_base import KnowledgeBase, Document, DocumentChunk, KBQuery
        from database.models.settings import SystemSetting, OrganizationSetting, APIKey, Integration, UserIntegration
        from database.models.audit import AuditLog, SecurityEvent, DataExport, ComplianceReport
        print("✅ All models imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import models: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    print("🔨 Creating all tables...")
    
    # Create all tables (SQLAlchemy will skip existing ones)
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("✅ Tables creation completed")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    print("📊 Verifying created tables...")
    inspector = inspect(engine)
    all_tables = set(inspector.get_table_names())
    
    # Check for missing tables
    required_tables = {
        'invitations', 'departments', 'user_groups', 'security_settings',
        'organizations', 'roles', 'users', 'audit_logs'
    }
    
    missing_tables = required_tables - all_tables
    
    if missing_tables:
        print(f"❌ Still missing tables: {missing_tables}")
        print()
        print("🔧 Attempting to create missing tables individually...")
        
        # Try to create missing tables individually
        for table_name in missing_tables:
            try:
                # Get the table definition from metadata
                if table_name in Base.metadata.tables:
                    table = Base.metadata.tables[table_name]
                    table.create(bind=engine, checkfirst=True)
                    print(f"   ✅ Created table: {table_name}")
                else:
                    print(f"   ⚠️  Table '{table_name}' not found in metadata")
            except Exception as e:
                print(f"   ❌ Failed to create table '{table_name}': {e}")
        
        # Re-check
        inspector = inspect(engine)
        all_tables = set(inspector.get_table_names())
        missing_tables = required_tables - all_tables
        
        if missing_tables:
            print()
            print(f"❌ Still missing tables after individual creation: {missing_tables}")
            return False
    
    print()
    print("✅ All required tables exist!")
    print()
    print("📋 Created/Verified tables:")
    for table in sorted(required_tables):
        status = "✅" if table in all_tables else "❌"
        print(f"   {status} {table}")
    
    print()
    print("=" * 60)
    print("✅ Missing tables creation complete!")
    print("=" * 60)
    
    return True


def fix_jsonarray_column_types():
    """
    Fix JSONArray columns that were incorrectly created as PostgreSQL ARRAY.
    Changes them from text[]/uuid[] to JSONB.
    """
    print()
    print("=" * 60)
    print("🔧 Fixing JSONArray Column Types (ARRAY → JSONB)")
    print("=" * 60)
    print()
    
    engine = get_engine()
    
    # Columns that should be JSONB but might be ARRAY
    columns_to_fix = [
        ('agents', 'tool_ids'),
        ('agents', 'shared_with_user_ids'),
        ('agents', 'shared_with_role_ids'),
        ('agents', 'memory'),
        ('knowledge_bases', 'tags'),
        # Messages table JSON columns
        ('messages', 'tool_calls'),
        ('messages', 'tool_results'),
        ('messages', 'sources'),
        ('messages', 'pii_types'),
        # Documents table JSON columns
        ('documents', 'tags'),
        ('documents', 'pii_types'),
        ('documents', 'allowed_user_ids'),
        ('documents', 'allowed_role_ids'),
        # Users table JSON columns
        ('users', 'role_ids'),
        ('users', 'group_ids'),
        # Knowledge bases table JSON columns
        ('knowledge_bases', 'shared_with_user_ids'),
        ('knowledge_bases', 'shared_with_role_ids'),
    ]
    
    with engine.connect() as conn:
        for table_name, column_name in columns_to_fix:
            try:
                # Check if table exists
                result = conn.execute(text(f"""
                    SELECT column_name, data_type, udt_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND column_name = '{column_name}'
                """))
                row = result.fetchone()
                
                if not row:
                    print(f"   ⏭️  Column '{table_name}.{column_name}' doesn't exist, skipping")
                    continue
                
                data_type = row[1]
                udt_name = row[2]
                
                # Check if it's an ARRAY type (udt_name starts with '_')
                if udt_name.startswith('_') or data_type == 'ARRAY':
                    print(f"   🔄 Converting {table_name}.{column_name} from {udt_name} to JSONB...")
                    
                    # Convert ARRAY to JSONB
                    # First, create a temp column, convert data, drop old, rename new
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN IF NOT EXISTS {column_name}_new JSONB DEFAULT '[]'::jsonb
                    """))
                    
                    # Copy data from old column, converting ARRAY to JSON
                    conn.execute(text(f"""
                        UPDATE {table_name} 
                        SET {column_name}_new = COALESCE(to_jsonb({column_name}), '[]'::jsonb)
                        WHERE {column_name} IS NOT NULL
                    """))
                    
                    # Drop old column
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} DROP COLUMN {column_name}
                    """))
                    
                    # Rename new column
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} RENAME COLUMN {column_name}_new TO {column_name}
                    """))
                    
                    conn.commit()
                    print(f"   ✅ Converted {table_name}.{column_name} to JSONB")
                    
                elif udt_name == 'jsonb' or data_type == 'jsonb':
                    print(f"   ✅ {table_name}.{column_name} is already JSONB")
                    
                elif udt_name == 'text' or data_type == 'text':
                    print(f"   🔄 Converting {table_name}.{column_name} from TEXT to JSONB...")
                    
                    # Convert TEXT to JSONB
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} 
                        ADD COLUMN IF NOT EXISTS {column_name}_new JSONB DEFAULT '[]'::jsonb
                    """))
                    
                    conn.execute(text(f"""
                        UPDATE {table_name} 
                        SET {column_name}_new = CASE 
                            WHEN {column_name} IS NULL THEN '[]'::jsonb
                            WHEN {column_name} = '' THEN '[]'::jsonb
                            ELSE {column_name}::jsonb 
                        END
                    """))
                    
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} DROP COLUMN {column_name}
                    """))
                    
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} RENAME COLUMN {column_name}_new TO {column_name}
                    """))
                    
                    conn.commit()
                    print(f"   ✅ Converted {table_name}.{column_name} to JSONB")
                else:
                    print(f"   ⚠️  {table_name}.{column_name} has unexpected type: {data_type}/{udt_name}")
                    
            except Exception as e:
                print(f"   ⚠️  Error processing {table_name}.{column_name}: {e}")
                # Don't fail on individual column errors
                continue
    
    print()
    print("✅ Column type fixes complete!")
    print()


def add_missing_columns():
    """Add missing columns to existing tables"""
    print("=" * 60)
    print("🔧 Adding Missing Columns")
    print("=" * 60)
    
    engine = get_engine()
    
    columns_to_add = [
        ("conversations", "is_test", "BOOLEAN DEFAULT FALSE"),
    ]
    
    with engine.connect() as conn:
        for table_name, column_name, column_def in columns_to_add:
            try:
                # Check if column exists
                result = conn.execute(text(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND column_name = '{column_name}'
                """))
                if result.fetchone():
                    print(f"   ✅ {table_name}.{column_name} already exists")
                else:
                    conn.execute(text(f"""
                        ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}
                    """))
                    conn.commit()
                    print(f"   ✅ Added {table_name}.{column_name}")
            except Exception as e:
                print(f"   ⚠️  Error adding {table_name}.{column_name}: {e}")
    
    print()


if __name__ == "__main__":
    success = create_missing_tables()
    fix_jsonarray_column_types()  # Fix column types after table creation
    add_missing_columns()  # Add any missing columns
    sys.exit(0 if success else 1)

