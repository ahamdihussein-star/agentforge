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
    """Add all permissions to the Super Admin role"""
    print("\n" + "="*80)
    print("🔧 FIXING SUPER ADMIN PERMISSIONS")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # Find Super Admin role
            print("📌 Step 1: Finding Super Admin role...")
            super_admin_role = session.query(Role).filter_by(name="Super Admin").first()
            
            if not super_admin_role:
                print("   ❌ Super Admin role not found!")
                return False
            
            print(f"   ✅ Found Super Admin role: {super_admin_role.id}")
            print(f"   Current permissions: {super_admin_role.permissions}\n")
            
            # Parse current permissions
            current_perms = []
            if super_admin_role.permissions:
                if isinstance(super_admin_role.permissions, str):
                    try:
                        current_perms = json.loads(super_admin_role.permissions)
                    except:
                        current_perms = []
                elif isinstance(super_admin_role.permissions, list):
                    current_perms = super_admin_role.permissions
            
            print(f"   Parsed current permissions: {len(current_perms)} permissions")
            
            # Update with all permissions
            print(f"\n📌 Step 2: Updating permissions...")
            print(f"   Adding {len(ALL_PERMISSIONS)} permissions...")
            
            super_admin_role.permissions = json.dumps(ALL_PERMISSIONS)
            
            print(f"   ✅ Permissions updated\n")
            
            # Save changes
            print("📌 Step 3: Saving changes...")
            session.commit()
            print("   ✅ Committed changes to database\n")
            
            # Verify
            print("📌 Step 4: Verifying changes...")
            session.refresh(super_admin_role)
            
            verified_perms = json.loads(super_admin_role.permissions) if isinstance(super_admin_role.permissions, str) else super_admin_role.permissions
            print(f"   ✅ Super Admin now has {len(verified_perms)} permissions")
            print(f"   Permissions: {verified_perms[:5]}... (showing first 5)\n")
            
            print("="*80)
            print("✅ SUCCESS: Super Admin permissions fixed!")
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

