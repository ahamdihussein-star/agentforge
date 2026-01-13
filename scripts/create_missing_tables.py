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


if __name__ == "__main__":
    success = create_missing_tables()
    sys.exit(0 if success else 1)

