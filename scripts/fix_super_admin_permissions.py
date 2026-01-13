"""
Fix Super Admin Role Permissions
Ensures the Super Admin role has all necessary permissions
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
from core.security.models import ALL_PERMISSIONS  # Import from source of truth!
import json
import traceback

# Use ALL_PERMISSIONS from core.security.models (the actual source of truth!)
# This ensures we're using the EXACT permissions defined in the system
print(f"\n📋 Using permissions from core.security.models.ALL_PERMISSIONS")
print(f"   Total permissions in system: {len(ALL_PERMISSIONS)}")
print(f"   Sample: {ALL_PERMISSIONS[:5]}...\n")

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
            
            # Update with all permissions (REPLACE using RAW SQL to avoid ORM issues!)
            print(f"\n📌 Step 2: Replacing permissions with correct {len(ALL_PERMISSIONS)} permissions...")
            print(f"   Using RAW SQL UPDATE to ensure complete replacement...\n")
            
            from sqlalchemy import text
            
            permissions_json = json.dumps(ALL_PERMISSIONS)
            
            for role in super_admin_roles:
                print(f"   🔄 Role {role.id}:")
                
                # Get old count
                old_perms = []
                if role.permissions:
                    try:
                        old_perms = json.loads(role.permissions) if isinstance(role.permissions, str) else (role.permissions or [])
                    except:
                        old_perms = []
                
                print(f"      Old: {len(old_perms)} permissions")
                
                # Use RAW SQL UPDATE to force complete replacement
                session.execute(
                    text("UPDATE roles SET permissions = :perms WHERE id = :role_id"),
                    {"perms": permissions_json, "role_id": str(role.id)}
                )
                
                print(f"      New: {len(ALL_PERMISSIONS)} permissions (via RAW SQL)")
            
            print(f"\n   ✅ Updated {len(super_admin_roles)} role(s)\n")
            
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

