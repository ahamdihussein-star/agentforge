#!/usr/bin/env python3
"""
Fix Admin and Presales Role Permissions

This script ensures Admin and Presales roles have the correct permissions
in the database, even if they were migrated without permissions.
"""

import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role as DBRole
from sqlalchemy import text
from core.security.models import Permission, DEFAULT_ROLES

def fix_role_permissions():
    """Fix permissions for Admin and Presales roles"""
    print("\n" + "="*60)
    print("🔧 FIXING ADMIN & PRESALES ROLE PERMISSIONS")
    print("="*60)
    
    with get_db_session() as session:
        # Get Admin role permissions from DEFAULT_ROLES
        admin_default = next((r for r in DEFAULT_ROLES if r['name'] == 'Admin'), None)
        if not admin_default:
            print("❌ Admin role not found in DEFAULT_ROLES")
            return
        
        admin_permissions = admin_default['permissions']
        print(f"\n📋 Admin role should have {len(admin_permissions)} permissions")
        print(f"   Sample: {admin_permissions[:5]}...")
        
        # Find Admin role in database
        admin_roles = session.query(DBRole).filter(DBRole.name == 'Admin').all()
        if not admin_roles:
            print("❌ Admin role not found in database")
        else:
            for admin_role in admin_roles:
                # Get current permissions
                current_perms = []
                if admin_role.permissions:
                    if isinstance(admin_role.permissions, str):
                        try:
                            current_perms = json.loads(admin_role.permissions)
                        except:
                            current_perms = []
                    elif isinstance(admin_role.permissions, list):
                        current_perms = admin_role.permissions
                
                print(f"\n🔄 Updating Admin role (ID: {admin_role.id[:8]}...):")
                print(f"   Current: {len(current_perms)} permissions")
                print(f"   Target: {len(admin_permissions)} permissions")
                
                # Update using RAW SQL to ensure complete replacement
                permissions_json = json.dumps(admin_permissions)
                update_query = text("""
                    UPDATE roles 
                    SET permissions = :permissions
                    WHERE id = :role_id
                """)
                session.execute(update_query, {
                    'permissions': permissions_json,
                    'role_id': str(admin_role.id)
                })
                print(f"   ✅ Updated to {len(admin_permissions)} permissions")
        
        # For Presales role - we don't have default permissions, so we'll set basic ones
        # You can customize this based on your needs
        presales_permissions = [
            Permission.AGENTS_VIEW.value,
            Permission.AGENTS_CREATE.value,
            Permission.AGENTS_EDIT.value,
            Permission.TOOLS_VIEW.value,
            Permission.TOOLS_EXECUTE.value,
            Permission.CHAT_USE.value,
            Permission.DEMO_ACCESS.value,
        ]
        
        print(f"\n📋 Presales role will have {len(presales_permissions)} permissions")
        print(f"   Permissions: {presales_permissions}")
        
        # Find Presales role in database
        presales_roles = session.query(DBRole).filter(DBRole.name == 'Presales').all()
        if not presales_roles:
            print("⚠️  Presales role not found in database (this is OK if it's a custom role)")
        else:
            for presales_role in presales_roles:
                # Get current permissions
                current_perms = []
                if presales_role.permissions:
                    if isinstance(presales_role.permissions, str):
                        try:
                            current_perms = json.loads(presales_role.permissions)
                        except:
                            current_perms = []
                    elif isinstance(presales_role.permissions, list):
                        current_perms = presales_role.permissions
                
                print(f"\n🔄 Updating Presales role (ID: {presales_role.id[:8]}...):")
                print(f"   Current: {len(current_perms)} permissions")
                print(f"   Target: {len(presales_permissions)} permissions")
                
                # Only update if permissions are empty (0)
                # If you want to force update, remove this check
                if len(current_perms) == 0:
                    permissions_json = json.dumps(presales_permissions)
                    update_query = text("""
                        UPDATE roles 
                        SET permissions = :permissions
                        WHERE id = :role_id
                    """)
                    session.execute(update_query, {
                        'permissions': permissions_json,
                        'role_id': str(presales_role.id)
                    })
                    print(f"   ✅ Updated to {len(presales_permissions)} permissions")
                else:
                    print(f"   ⏭️  Skipping (already has {len(current_perms)} permissions)")
                    print(f"   💡 To force update, modify this script")
        
        # Commit changes
        session.commit()
        print("\n✅ Committed changes to database")
        
        # Verify
        print("\n📌 Verification:")
        admin_roles = session.query(DBRole).filter(DBRole.name == 'Admin').all()
        for admin_role in admin_roles:
            perms = []
            if admin_role.permissions:
                if isinstance(admin_role.permissions, str):
                    try:
                        perms = json.loads(admin_role.permissions)
                    except:
                        perms = []
                elif isinstance(admin_role.permissions, list):
                    perms = admin_role.permissions
            print(f"   ✅ Admin (ID: {admin_role.id[:8]}...): {len(perms)} permissions")
        
        presales_roles = session.query(DBRole).filter(DBRole.name == 'Presales').all()
        for presales_role in presales_roles:
            perms = []
            if presales_role.permissions:
                if isinstance(presales_role.permissions, str):
                    try:
                        perms = json.loads(presales_role.permissions)
                    except:
                        perms = []
                elif isinstance(presales_role.permissions, list):
                    perms = presales_role.permissions
            print(f"   ✅ Presales (ID: {presales_role.id[:8]}...): {len(perms)} permissions")
    
    print("\n" + "="*60)
    print("✅ SUCCESS: Admin & Presales permissions fixed!")
    print("="*60)

if __name__ == '__main__':
    try:
        fix_role_permissions()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

