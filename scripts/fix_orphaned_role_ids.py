"""
Fix Orphaned User Role IDs
Updates users' role_ids to point to actual roles in the database
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
from database.models.user import User
from sqlalchemy import text
import json

def fix_orphaned_role_ids():
    print("\n" + "="*80)
    print("🔧 FIXING ORPHANED USER ROLE IDs")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # 1. Get all roles and create name-to-id mapping
            all_roles = session.query(Role).all()
            role_map = {}  # name -> id
            role_ids_set = set()  # all valid role IDs
            
            print(f"📋 Found {len(all_roles)} roles in database:")
            for role in all_roles:
                role_map[role.name.lower()] = str(role.id)
                role_ids_set.add(str(role.id))
                print(f"   • {role.name} → {role.id}")
            
            if len(all_roles) == 0:
                print("\n❌ ERROR: No roles found in database!")
                print("   Cannot fix user role assignments without roles.")
                return False
            
            # 2. Check and fix users
            print("\n" + "="*80)
            print("👥 Checking and fixing users...")
            print("="*80 + "\n")
            
            users = session.query(User).all()
            users_fixed = 0
            
            for user in users:
                print(f"📧 {user.email}")
                
                # Parse current role_ids
                current_role_ids = []
                try:
                    if user.role_ids:
                        if isinstance(user.role_ids, str):
                            parsed = json.loads(user.role_ids)
                            if isinstance(parsed, str):  # Double encoded
                                current_role_ids = json.loads(parsed)
                            else:
                                current_role_ids = parsed
                        else:
                            current_role_ids = user.role_ids
                except Exception as e:
                    print(f"   ⚠️  Error parsing role_ids: {e}")
                    current_role_ids = []
                
                print(f"   Current role IDs: {current_role_ids}")
                
                # Check if any role IDs are orphaned
                orphaned = [rid for rid in current_role_ids if str(rid) not in role_ids_set]
                valid = [rid for rid in current_role_ids if str(rid) in role_ids_set]
                
                if orphaned:
                    print(f"   ❌ Found {len(orphaned)} orphaned role ID(s): {orphaned}")
                    
                    # Try to fix by assigning Super Admin role
                    super_admin_id = role_map.get('super admin')
                    
                    if super_admin_id:
                        print(f"   🔧 Assigning Super Admin role: {super_admin_id}")
                        new_role_ids = [super_admin_id]
                        
                        # Use RAW SQL to force update
                        session.execute(
                            text("UPDATE users SET role_ids = :role_ids WHERE id = :user_id"),
                            {"role_ids": json.dumps(new_role_ids), "user_id": str(user.id)}
                        )
                        
                        users_fixed += 1
                        print(f"   ✅ Fixed! New role_ids: {new_role_ids}")
                    else:
                        print(f"   ⚠️  Cannot fix: Super Admin role not found!")
                        
                elif valid:
                    print(f"   ✅ Valid role assignments: {valid}")
                else:
                    print(f"   ⚠️  No roles assigned!")
                    
                    # Assign Super Admin role
                    super_admin_id = role_map.get('super admin')
                    if super_admin_id:
                        print(f"   🔧 Assigning Super Admin role: {super_admin_id}")
                        new_role_ids = [super_admin_id]
                        
                        session.execute(
                            text("UPDATE users SET role_ids = :role_ids WHERE id = :user_id"),
                            {"role_ids": json.dumps(new_role_ids), "user_id": str(user.id)}
                        )
                        
                        users_fixed += 1
                        print(f"   ✅ Fixed! New role_ids: {new_role_ids}")
                
                print()
            
            # Commit changes
            if users_fixed > 0:
                print("="*80)
                print(f"💾 Saving changes...")
                session.commit()
                print(f"✅ Fixed {users_fixed} user(s)")
                print("="*80 + "\n")
            else:
                print("="*80)
                print(f"✅ No fixes needed - all users have valid role assignments")
                print("="*80 + "\n")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_orphaned_role_ids()
    sys.exit(0 if success else 1)

