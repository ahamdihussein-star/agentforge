#!/usr/bin/env python3
"""
Read-Only Database Inspection Script
Shows current state of users and roles in the database
NO MODIFICATIONS - 100% Safe
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.user import User
from database.models.role import Role
import json

def inspect_database():
    """Inspect current database state (READ-ONLY)"""
    
    print("\n" + "="*80)
    print("📊 DATABASE INSPECTION (READ-ONLY)")
    print("="*80)
    
    with get_db_session() as session:
        # ============================================================
        # 1. ROLES
        # ============================================================
        print("\n🎭 ROLES IN DATABASE:")
        print("-" * 80)
        roles = session.query(Role).all()
        
        if not roles:
            print("   ⚠️  No roles found in database!")
        else:
            for role in roles:
                permissions = role.permissions
                if isinstance(permissions, str):
                    try:
                        permissions = json.loads(permissions)
                    except:
                        permissions = []
                
                print(f"\n   📌 {role.name}")
                print(f"      ID: {role.id}")
                print(f"      Description: {role.description}")
                print(f"      Permissions Count: {len(permissions) if permissions else 0}")
                print(f"      Is System: {role.is_system}")
                print(f"      Level: {role.level}")
                
                if permissions:
                    print(f"      Permissions: {', '.join(permissions[:5])}{'...' if len(permissions) > 5 else ''}")
        
        print(f"\n   📊 Total Roles: {len(roles)}")
        
        # ============================================================
        # 2. USERS
        # ============================================================
        print("\n\n👤 USERS IN DATABASE:")
        print("-" * 80)
        users = session.query(User).all()
        
        if not users:
            print("   ⚠️  No users found in database!")
        else:
            for user in users:
                # Parse role_ids
                role_ids = user.role_ids
                if isinstance(role_ids, str):
                    try:
                        role_ids = json.loads(role_ids) if role_ids else []
                    except:
                        role_ids = []
                
                print(f"\n   📌 {user.email}")
                print(f"      ID: {user.id}")
                print(f"      Name: {user.first_name} {user.last_name}")
                print(f"      Status: {user.status}")
                print(f"      MFA Enabled: {user.mfa_enabled}")
                print(f"      Email Verified: {user.email_verified}")
                print(f"      Created At: {user.created_at}")
                
                # Role IDs
                print(f"      Role IDs (raw): {user.role_ids}")
                print(f"      Role IDs (parsed): {role_ids}")
                
                # Try to match with actual roles
                if role_ids:
                    print(f"      Assigned Roles:")
                    for role_id in role_ids:
                        matching_role = session.query(Role).filter_by(id=role_id).first()
                        if matching_role:
                            print(f"         ✅ {matching_role.name} ({role_id})")
                        else:
                            print(f"         ❌ Unknown Role ({role_id})")
                else:
                    print(f"      ⚠️  NO ROLES ASSIGNED!")
        
        print(f"\n   📊 Total Users: {len(users)}")
        
        # ============================================================
        # 3. SUMMARY
        # ============================================================
        print("\n\n📋 SUMMARY:")
        print("="*80)
        print(f"   Roles: {len(roles)}")
        print(f"   Users: {len(users)}")
        
        users_without_roles = [u for u in users if not u.role_ids or u.role_ids == '[]' or u.role_ids == 'null']
        if users_without_roles:
            print(f"\n   ⚠️  WARNING: {len(users_without_roles)} users have NO roles assigned:")
            for u in users_without_roles:
                print(f"      - {u.email}")
        else:
            print(f"\n   ✅ All users have roles assigned")
        
        print("\n" + "="*80)
        print("✅ Inspection complete (no changes made)")
        print("="*80 + "\n")

if __name__ == "__main__":
    try:
        inspect_database()
    except Exception as e:
        print(f"\n❌ Error inspecting database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

