"""
Fix Super Admin Role Permissions
Ensures the Super Admin role has all necessary permissions
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
import json
import traceback

# All available permissions in the system
ALL_PERMISSIONS = [
    # Agent Management
    "agents.view",
    "agents.create",
    "agents.edit",
    "agents.delete",
    "agents.publish",
    "agents.share",
    "agents.execute",
    
    # Tool Management
    "tools.view",
    "tools.create",
    "tools.edit",
    "tools.delete",
    "tools.share",
    "tools.execute",
    
    # Knowledge Base
    "kb.view",
    "kb.create",
    "kb.edit",
    "kb.delete",
    "kb.share",
    "kb.query",
    
    # User Management
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.invite",
    "users.manage_roles",
    
    # Role Management
    "roles.view",
    "roles.create",
    "roles.edit",
    "roles.delete",
    "roles.assign",
    
    # Organization Management
    "org.view",
    "org.edit",
    "org.settings",
    "org.billing",
    
    # Security & Audit
    "security.view",
    "security.manage",
    "audit.view",
    "audit.export",
    
    # Settings
    "settings.view",
    "settings.edit",
    
    # Integration Management
    "integrations.view",
    "integrations.configure",
    "integrations.delete",
    
    # Workflow Management
    "workflows.view",
    "workflows.create",
    "workflows.edit",
    "workflows.delete",
    "workflows.execute",
    
    # Admin
    "admin.full_access",
    "admin.system_config",
]

def fix_super_admin_permissions():
    """Add all permissions to ALL Super Admin roles (handle duplicates)"""
    print("\n" + "="*80)
    print("🔧 FIXING SUPER ADMIN PERMISSIONS (ALL INSTANCES)")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # Find ALL Super Admin roles (not just first one!)
            print("📌 Step 1: Finding ALL Super Admin roles...")
            super_admin_roles = session.query(Role).filter_by(name="Super Admin").all()
            
            if not super_admin_roles:
                print("   ❌ No Super Admin roles found!")
                return False
            
            print(f"   ✅ Found {len(super_admin_roles)} Super Admin role(s):\n")
            for i, role in enumerate(super_admin_roles, 1):
                print(f"      {i}. UUID: {role.id}")
                current_perms = []
                if role.permissions:
                    if isinstance(role.permissions, str):
                        try:
                            current_perms = json.loads(role.permissions)
                        except:
                            current_perms = []
                    elif isinstance(role.permissions, list):
                        current_perms = role.permissions
                print(f"         Current permissions: {len(current_perms)}")
            
            # Update ALL Super Admin roles with all permissions
            print(f"\n📌 Step 2: Updating ALL Super Admin roles...")
            print(f"   Adding {len(ALL_PERMISSIONS)} permissions to each role...")
            
            updated_count = 0
            for role in super_admin_roles:
                role.permissions = json.dumps(ALL_PERMISSIONS)
                updated_count += 1
            
            print(f"   ✅ Updated {updated_count} role(s)\n")
            
            # Save changes
            print("📌 Step 3: Saving changes...")
            session.commit()
            print("   ✅ Committed changes to database\n")
            
            # Verify
            print("📌 Step 4: Verifying changes...")
            for i, role in enumerate(super_admin_roles, 1):
                session.refresh(role)
                verified_perms = json.loads(role.permissions) if isinstance(role.permissions, str) else role.permissions
                print(f"   ✅ Role {i} ({role.id}): {len(verified_perms)} permissions")
            
            print(f"\n   Sample permissions: {ALL_PERMISSIONS[:5]}... (showing first 5)\n")
            
            print("="*80)
            print(f"✅ SUCCESS: Fixed {len(super_admin_roles)} Super Admin role(s)!")
            print("="*80 + "\n")
            
            return True
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        traceback.print_exc()
        if 'session' in locals() and session.is_active:
            session.rollback()
        return False

if __name__ == "__main__":
    success = fix_super_admin_permissions()
    sys.exit(0 if success else 1)

