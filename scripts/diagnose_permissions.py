#!/usr/bin/env python3
"""
Diagnostic script to check user permissions
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.user import User as DBUser
from database.models.role import Role as DBRole
from database.services.user_service import UserService
from database.services.role_service import RoleService
import json

def diagnose():
    print("\n" + "="*80)
    print("🔍 PERMISSION DIAGNOSIS TOOL")
    print("="*80 + "\n")
    
    print("📌 Step 1: Load users from database...")
    try:
        users = UserService.get_all_users()
        print(f"   ✅ Loaded {len(users)} users\n")
        
        for user in users:
            print(f"👤 User: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   role_ids type: {type(user.role_ids)}")
            print(f"   role_ids value: {user.role_ids}")
            print(f"   role_ids length: {len(user.role_ids)}\n")
    except Exception as e:
        print(f"   ❌ Error loading users: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("📌 Step 2: Load roles from database...")
    try:
        roles = RoleService.get_all_roles()
        print(f"   ✅ Loaded {len(roles)} roles\n")
        
        # Filter Super Admin role
        super_admin_role = None
        for role in roles:
            if role.name == "Super Admin":
                super_admin_role = role
                break
        
        if super_admin_role:
            print(f"🎭 Super Admin Role:")
            print(f"   ID: {super_admin_role.id}")
            print(f"   Name: {super_admin_role.name}")
            print(f"   permissions type: {type(super_admin_role.permissions)}")
            print(f"   permissions value: {super_admin_role.permissions}")
            print(f"   permissions length: {len(super_admin_role.permissions) if isinstance(super_admin_role.permissions, list) else 'N/A'}\n")
        else:
            print("   ⚠️  Super Admin role not found!\n")
    except Exception as e:
        print(f"   ❌ Error loading roles: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("📌 Step 3: Check role_ids match...")
    if users and super_admin_role:
        user = users[0]
        print(f"   User role_ids: {user.role_ids}")
        print(f"   Super Admin ID: {super_admin_role.id}")
        print(f"   Match: {super_admin_role.id in user.role_ids}")
        
        if super_admin_role.id in user.role_ids:
            print(f"   ✅ User HAS Super Admin role!")
            print(f"   ✅ User SHOULD have {len(super_admin_role.permissions)} permissions")
        else:
            print(f"   ❌ User DOES NOT have Super Admin role!")
    
    print("\n" + "="*80)
    print("✅ Diagnosis Complete")
    print("="*80 + "\n")

if __name__ == "__main__":
    diagnose()

