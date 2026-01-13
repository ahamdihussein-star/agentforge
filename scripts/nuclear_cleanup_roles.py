"""
NUCLEAR CLEANUP - Fix ALL role issues in one go
This script will:
1. Delete ALL duplicate roles (keep best one only)
2. Update ALL users to use valid role IDs
3. Verify everything is correct
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from sqlalchemy import text
import json

def nuclear_cleanup():
    print("\n" + "="*80)
    print("💣 NUCLEAR CLEANUP - FIXING ALL ROLE ISSUES")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # ==================== STEP 1: ANALYZE CURRENT STATE ====================
            print("📊 STEP 1: Current state analysis...")
            print("-" * 80)
            
            # Get all roles with RAW SQL
            result = session.execute(text("""
                SELECT id, name, permissions, org_id, created_at
                FROM roles
                ORDER BY name, created_at
            """))
            
            all_roles = []
            for row in result:
                role_id, name, perms, org_id, created_at = row
                
                # Count permissions
                perms_count = 0
                try:
                    if perms:
                        p = json.loads(perms) if isinstance(perms, str) else perms
                        perms_count = len(p) if isinstance(p, list) else 0
                except:
                    pass
                
                all_roles.append({
                    'id': str(role_id),
                    'name': name,
                    'perms_count': perms_count,
                    'org_id': str(org_id),
                    'created_at': created_at
                })
            
            print(f"Found {len(all_roles)} total roles:")
            for r in all_roles:
                print(f"  • {r['name']}: {r['perms_count']} perms (ID: {r['id'][:8]}...)")
            
            # Group by name
            roles_by_name = {}
            for r in all_roles:
                if r['name'] not in roles_by_name:
                    roles_by_name[r['name']] = []
                roles_by_name[r['name']].append(r)
            
            print(f"\nGrouped by name:")
            for name, roles in roles_by_name.items():
                print(f"  • {name}: {len(roles)} instance(s)")
            
            # ==================== STEP 2: DELETE DUPLICATES ====================
            print("\n📊 STEP 2: Deleting duplicate roles...")
            print("-" * 80)
            
            roles_to_keep = {}  # name -> best role id
            roles_to_delete = []  # list of role ids to delete
            
            for name, roles in roles_by_name.items():
                if len(roles) == 1:
                    roles_to_keep[name] = roles[0]['id']
                    print(f"✅ {name}: Only 1 instance, keeping {roles[0]['id'][:8]}...")
                else:
                    # Find best role (most permissions)
                    best = max(roles, key=lambda r: (r['perms_count'], r['created_at']))
                    roles_to_keep[name] = best['id']
                    
                    print(f"🔍 {name}: Found {len(roles)} duplicates")
                    print(f"   ✅ KEEPING: {best['id'][:8]}... ({best['perms_count']} perms)")
                    
                    for r in roles:
                        if r['id'] != best['id']:
                            roles_to_delete.append(r['id'])
                            print(f"   ❌ DELETING: {r['id'][:8]}... ({r['perms_count']} perms)")
            
            # Delete duplicate roles
            if roles_to_delete:
                print(f"\n💥 Deleting {len(roles_to_delete)} duplicate roles...")
                for role_id in roles_to_delete:
                    session.execute(
                        text("DELETE FROM roles WHERE id = :role_id"),
                        {"role_id": role_id}
                    )
                    print(f"   ✅ Deleted {role_id[:8]}...")
                session.commit()
                print(f"✅ Deleted {len(roles_to_delete)} duplicate roles!")
            else:
                print("✅ No duplicates to delete")
            
            # ==================== STEP 3: FIX USER ROLE ASSIGNMENTS ====================
            print("\n📊 STEP 3: Fixing user role assignments...")
            print("-" * 80)
            
            # Get all users
            result = session.execute(text("""
                SELECT id, email, role_ids
                FROM users
            """))
            
            users_fixed = 0
            super_admin_id = roles_to_keep.get('Super Admin')
            
            if not super_admin_id:
                print("❌ ERROR: Super Admin role not found!")
                return False
            
            print(f"Using Super Admin role ID: {super_admin_id[:8]}...\n")
            
            for row in result:
                user_id, email, role_ids_raw = row
                
                print(f"👤 {email}")
                print(f"   Current role_ids: {role_ids_raw}")
                
                # Parse role_ids
                current_role_ids = []
                try:
                    if role_ids_raw:
                        parsed = json.loads(role_ids_raw) if isinstance(role_ids_raw, str) else role_ids_raw
                        if isinstance(parsed, str):  # Double encoded
                            current_role_ids = json.loads(parsed)
                        else:
                            current_role_ids = parsed
                except:
                    pass
                
                # Check if roles are valid
                valid_role_ids_set = set(roles_to_keep.values())
                has_orphaned = any(str(rid) not in valid_role_ids_set for rid in current_role_ids)
                
                if has_orphaned or not current_role_ids:
                    # Assign Super Admin
                    new_role_ids = [super_admin_id]
                    
                    session.execute(
                        text("UPDATE users SET role_ids = :role_ids WHERE id = :user_id"),
                        {"role_ids": json.dumps(new_role_ids), "user_id": str(user_id)}
                    )
                    
                    print(f"   ✅ FIXED: Assigned Super Admin ({super_admin_id[:8]}...)")
                    users_fixed += 1
                else:
                    print(f"   ✅ Valid roles")
            
            if users_fixed > 0:
                session.commit()
                print(f"\n✅ Fixed {users_fixed} users!")
            else:
                print(f"\n✅ All users already have valid roles!")
            
            # ==================== STEP 4: VERIFY ====================
            print("\n📊 STEP 4: Verification...")
            print("-" * 80)
            
            # Count final roles
            result = session.execute(text("SELECT COUNT(*), name FROM roles GROUP BY name"))
            print("Final roles in database:")
            total_roles = 0
            for row in result:
                count, name = row
                total_roles += count
                status = "✅" if count == 1 else "❌"
                print(f"   {status} {name}: {count} instance(s)")
            
            print(f"\n📊 Total: {total_roles} roles")
            
            # Check users
            result = session.execute(text("""
                SELECT email, role_ids FROM users
            """))
            
            print(f"\nUser role assignments:")
            all_valid = True
            for row in result:
                email, role_ids_raw = row
                
                try:
                    if role_ids_raw:
                        parsed = json.loads(role_ids_raw) if isinstance(role_ids_raw, str) else role_ids_raw
                        if isinstance(parsed, str):
                            role_ids = json.loads(parsed)
                        else:
                            role_ids = parsed
                        
                        # Check if all role IDs are valid
                        valid_role_ids_set = set(roles_to_keep.values())
                        is_valid = all(str(rid) in valid_role_ids_set for rid in role_ids)
                        
                        status = "✅" if is_valid else "❌"
                        print(f"   {status} {email}: {len(role_ids)} role(s)")
                        
                        if not is_valid:
                            all_valid = False
                    else:
                        print(f"   ⚠️  {email}: No roles")
                        all_valid = False
                except Exception as e:
                    print(f"   ❌ {email}: Error - {e}")
                    all_valid = False
            
            print("\n" + "="*80)
            if all_valid and total_roles == len(roles_to_keep):
                print("✅ SUCCESS! All issues fixed:")
                print(f"   • {len(roles_to_keep)} unique roles (no duplicates)")
                print(f"   • All users have valid role assignments")
                print(f"   • Role names should now display correctly in UI")
            else:
                print("⚠️  Some issues remain - check output above")
            print("="*80 + "\n")
            
            return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = nuclear_cleanup()
    sys.exit(0 if success else 1)

