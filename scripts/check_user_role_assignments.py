"""
Check User Role Assignments vs Actual Roles in Database
Find orphaned role references (user has role_id that doesn't exist in roles table)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
from database.models.user import User
import json

def check_user_roles():
    print("\n" + "="*80)
    print("🔍 CHECKING USER ROLE ASSIGNMENTS")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # 1. Get all roles
            all_roles = session.query(Role).all()
            role_ids_in_db = {str(role.id): role.name for role in all_roles}
            
            print(f"📋 Roles in database: {len(all_roles)}")
            print("-" * 80)
            for role in all_roles:
                print(f"   • {role.name}")
                print(f"     ID: {role.id}")
                print(f"     Org ID: {role.org_id}")
                print(f"     Permissions: {len(role.permissions) if role.permissions else 0}")
            
            # 2. Get all users
            print("\n" + "="*80)
            print("👥 Users and their role assignments:")
            print("="*80 + "\n")
            
            users = session.query(User).all()
            orphaned_found = False
            
            for user in users:
                print(f"📧 {user.email}")
                print(f"   User ID: {user.id}")
                print(f"   Role IDs (raw): {user.role_ids}")
                
                # Parse role_ids
                try:
                    if user.role_ids:
                        if isinstance(user.role_ids, str):
                            parsed = json.loads(user.role_ids)
                            if isinstance(parsed, str):  # Double encoded
                                role_ids = json.loads(parsed)
                            else:
                                role_ids = parsed
                        else:
                            role_ids = user.role_ids
                        
                        print(f"   Role IDs (parsed): {role_ids}")
                        print(f"   Assigned roles:")
                        
                        for role_id in role_ids:
                            if str(role_id) in role_ids_in_db:
                                role_name = role_ids_in_db[str(role_id)]
                                print(f"      ✅ {role_name} (ID: {role_id})")
                            else:
                                print(f"      ❌ ORPHANED! Role ID {role_id} NOT FOUND in roles table!")
                                orphaned_found = True
                    else:
                        print(f"   ⚠️  No roles assigned!")
                        
                except Exception as e:
                    print(f"   ❌ Error parsing role_ids: {e}")
                
                print()
            
            # 3. Summary
            print("="*80)
            if orphaned_found:
                print("❌ PROBLEM FOUND: Some users have role_ids that don't exist!")
                print("\n🔧 SOLUTION:")
                print("   1. Find the correct role IDs from the roles table above")
                print("   2. Update users' role_ids to use valid role IDs")
                print("   3. This explains why UI shows UUID instead of role name!")
            else:
                print("✅ All user role assignments are valid!")
            print("="*80 + "\n")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_user_roles()

