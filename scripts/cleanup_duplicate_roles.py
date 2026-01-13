"""
Cleanup Duplicate Roles
Removes all duplicate roles, keeping only the FIRST instance of each role name per org
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
from database.models.user import User
from sqlalchemy import func
import json
import traceback

def cleanup_duplicate_roles():
    """Remove duplicate roles, keeping only the first instance"""
    print("\n" + "="*80)
    print("🧹 CLEANING UP DUPLICATE ROLES")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # Get count of each role name
            print("📌 Step 1: Finding duplicate roles...")
            duplicates = session.query(
                Role.name, 
                func.count(Role.id).label('count')
            ).group_by(Role.name).having(func.count(Role.id) > 1).all()
            
            if not duplicates:
                print("   ✅ No duplicate roles found!")
                return True
            
            print(f"   ⚠️  Found {len(duplicates)} role names with duplicates:\n")
            total_duplicates_to_remove = 0
            for role_name, count in duplicates:
                print(f"      - {role_name}: {count} instances")
                total_duplicates_to_remove += (count - 1)
            
            print(f"\n   📊 Total roles to remove: {total_duplicates_to_remove}\n")
            
            # For each duplicate role name, keep the FIRST one, delete the rest
            print("📌 Step 2: Removing duplicates (keeping first instance)...")
            deleted_count = 0
            
            for role_name, count in duplicates:
                print(f"\n   🔄 Processing '{role_name}'...")
                
                # Get all instances of this role, ordered by created_at (oldest first)
                role_instances = session.query(Role).filter_by(name=role_name).order_by(Role.created_at).all()
                
                if len(role_instances) <= 1:
                    print(f"      ℹ️  Only 1 instance, skipping")
                    continue
                
                # Keep the first one
                primary_role = role_instances[0]
                print(f"      ✅ Keeping: {primary_role.id} (created: {primary_role.created_at})")
                
                # Delete the rest
                duplicates_to_delete = role_instances[1:]
                print(f"      🗑️  Deleting {len(duplicates_to_delete)} duplicate(s):")
                
                for dup in duplicates_to_delete:
                    print(f"         - {dup.id}")
                    
                    # Update users who have this role to use the primary role
                    users_with_dup = session.query(User).all()
                    users_updated = 0
                    for user in users_with_dup:
                        if user.role_ids:
                            try:
                                # Parse role_ids (handle double encoding)
                                role_ids_str = user.role_ids
                                if isinstance(role_ids_str, str):
                                    parsed = json.loads(role_ids_str)
                                    if isinstance(parsed, str):  # Double encoded
                                        role_ids = json.loads(parsed)
                                    else:
                                        role_ids = parsed
                                else:
                                    role_ids = role_ids_str
                                
                                # Replace duplicate role ID with primary role ID
                                if str(dup.id) in role_ids:
                                    role_ids = [str(primary_role.id) if r == str(dup.id) else r for r in role_ids]
                                    user.role_ids = json.dumps(role_ids)
                                    users_updated += 1
                            except Exception as e:
                                print(f"         ⚠️  Error updating user {user.email}: {e}")
                    
                    if users_updated > 0:
                        print(f"         ↪️  Updated {users_updated} user(s) to use primary role")
                    
                    # Delete the duplicate role
                    session.delete(dup)
                    deleted_count += 1
            
            # Commit all changes
            print(f"\n📌 Step 3: Saving changes...")
            session.commit()
            print(f"   ✅ Deleted {deleted_count} duplicate role(s)")
            
            # Verify final count
            print(f"\n📌 Step 4: Verifying...")
            final_roles = session.query(Role).all()
            role_names = {}
            for role in final_roles:
                role_names[role.name] = role_names.get(role.name, 0) + 1
            
            print(f"   ✅ Final role count: {len(final_roles)}")
            print(f"   Breakdown:")
            for name, count in sorted(role_names.items()):
                print(f"      - {name}: {count}")
            
            print("\n" + "="*80)
            print(f"✅ SUCCESS: Cleaned up {deleted_count} duplicate roles!")
            print("="*80 + "\n")
            
            return True
            
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        traceback.print_exc()
        if 'session' in locals() and session.is_active:
            session.rollback()
        return False

if __name__ == "__main__":
    success = cleanup_duplicate_roles()
    sys.exit(0 if success else 1)

