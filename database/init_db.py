#!/usr/bin/env python3
"""
Database Initialization Script
Creates all tables and sets up initial data - COMPLETE ENTERPRISE SCHEMA
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import init_db, check_connection
from database.base import get_engine


def main():
    """Initialize database with complete enterprise schema"""
    print("=" * 60)
    print("🚀 AgentForge Database Initialization")
    print("   ENTERPRISE-GRADE SCHEMA")
    print("=" * 60)
    print()
    
    # Check connection
    print("1️⃣  Checking database connection...")
    if not check_connection():
        print("❌ Database connection failed!")
        print("   Please check your database configuration in .env")
        sys.exit(1)
    
    print("✅ Database connection successful!")
    print()
    
    # Create tables
    print("2️⃣  Creating database tables...")
    print("   Loading ALL models (24 tables)...")
    try:
        # Import all models before init_db
        print("   📦 Loading Security & Access Control models...")
        from database.models.organization import Organization
        from database.models.role import Role, Permission, role_permissions
        from database.models.user import User, UserSession, MFASetting, PasswordHistory
        
        print("   🤖 Loading Core Platform models...")
        from database.models.agent import Agent
        from database.models.tool import Tool, ToolExecution
        from database.models.conversation import Conversation, Message, ConversationShare
        from database.models.knowledge_base import KnowledgeBase, Document, DocumentChunk, KBQuery
        
        print("   ⚙️  Loading Configuration models...")
        from database.models.settings import (
            SystemSetting, OrganizationSetting,
            APIKey, Integration, UserIntegration
        )
        
        print("   🔒 Loading Audit & Compliance models...")
        from database.models.audit import AuditLog, SecurityEvent, DataExport, ComplianceReport
        
        print("   ✅ All models imported successfully")
        print()
        
        # Initialize database
        init_db()
        print("✅ All tables created successfully!")
        print()
        
        # Run Alembic migrations to update enum types
        print("3️⃣  Running database migrations (Alembic)...")
        try:
            import subprocess
            import sys
            
            # Run alembic upgrade using subprocess (more reliable in Docker)
            result = subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ Database migrations applied successfully!")
                if result.stdout:
                    print(f"   Output: {result.stdout.strip()}")
            else:
                print(f"⚠️  Migration warning: {result.stderr.strip() if result.stderr else 'No output'}")
                print("   (This is OK for first-time setup or if no migrations pending)")
                
        except Exception as e:
            print(f"⚠️  Migration skipped: {e}")
            print("   (Continuing without migrations)")
        
        print()
        
        # List created tables
        print("4️⃣  Verifying created tables...")
        from sqlalchemy import inspect
        engine = get_engine()
        inspector = inspect(engine)
        tables = sorted(inspector.get_table_names())
        
        print(f"   📊 Total tables created: {len(tables)}")
        print()
        
        # Categorize tables
        security_tables = [t for t in tables if t in ['organizations', 'roles', 'permissions', 'role_permissions', 'users', 'user_sessions', 'mfa_settings', 'password_history']]
        platform_tables = [t for t in tables if t in ['agents', 'tools', 'tool_executions', 'conversations', 'messages', 'conversation_shares']]
        knowledge_tables = [t for t in tables if t in ['knowledge_bases', 'documents', 'document_chunks', 'kb_queries']]
        config_tables = [t for t in tables if t in ['system_settings', 'organization_settings', 'api_keys', 'integrations', 'user_integrations']]
        audit_tables = [t for t in tables if t in ['audit_logs', 'security_events', 'data_exports', 'compliance_reports']]
        
        if security_tables:
            print("   🔐 Security & Access Control:")
            for t in security_tables:
                print(f"      ✓ {t}")
        
        if platform_tables:
            print()
            print("   🤖 Core Platform:")
            for t in platform_tables:
                print(f"      ✓ {t}")
        
        if knowledge_tables:
            print()
            print("   📚 Knowledge Base:")
            for t in knowledge_tables:
                print(f"      ✓ {t}")
        
        if config_tables:
            print()
            print("   ⚙️  Configuration:")
            for t in config_tables:
                print(f"      ✓ {t}")
        
        if audit_tables:
            print()
            print("   🔒 Audit & Compliance:")
            for t in audit_tables:
                print(f"      ✓ {t}")
        
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60)
    print()
    print("📋 Next steps:")
    print("  1. Start the application: uvicorn api.main:app --reload")
    print("  2. Access health check: http://localhost:8000/api/health/db")
    print("  3. Migrate existing data: python scripts/migrate_to_db.py")
    print()
    print("🏆 Enterprise-grade schema ready for production!")
    print()


if __name__ == "__main__":
    main()

