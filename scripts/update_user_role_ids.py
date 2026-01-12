#!/usr/bin/env python3
"""
Update user role_ids from JSON files to use UUID-based IDs
Issue #19.2 fix: Maps old string IDs (e.g., "role_super_admin") to new UUIDs
"""
import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine
from database.models.user import User as DBUser
from database.models.role import Role as DBRole
from sqlalchemy.orm import sessionmaker

print("🔧 Updating User role_ids from JSON Files")
print("=" * 60)


def load_users_from_json():
    """Load users from JSON file and return email -> old_role_ids mapping"""
    json_path = 'data/security/users.json'
    if not os.path.exists(json_path):
        print(f"❌ File not found: {json_path}")
        return {}
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    user_roles = {}
    for user_data in data.values():
        email = user_data.get('email')
        role_ids = user_data.get('role_ids', [])
        if email:
            user_roles[email] = role_ids
    
    print(f"📂 Loading user role_ids from JSON...")
    print(f"    Found {len(user_roles)} users in JSON")
    return user_roles


def main():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Load old role IDs from JSON (e.g., ['role_super_admin'])
        json_user_roles = load_users_from_json()

        # 2. Load roles from database to get their UUIDs
        db_roles = session.query(DBRole).all()
        
        # Create multiple mapping strategies
        role_name_to_uuid_map = {role.name: str(role.id) for role in db_roles}
        role_id_to_uuid_map = {str(role.id): str(role.id) for role in db_roles}  # For existing UUIDs
        
        # Legacy string ID mapping (e.g., "role_super_admin" → "Super Admin")
        legacy_name_mapping = {
            "role_super_admin": "Super Admin",
            "role_admin": "Admin",
            "role_manager": "Manager",
            "role_user": "User",
            "role_viewer": "Viewer"
        }
        
        print(f"📊 Found {len(db_roles)} roles in database:")
        for role in db_roles:
            print(f"   - {role.name}: {role.id}")

        # 3. Get users from database
        db_users = session.query(DBUser).all()
        print(f"\n📊 Found {len(db_users)} users in database\n")

        updated_count = 0
        for db_user in db_users:
            email = db_user.email
            current_db_role_ids = json.loads(db_user.role_ids) if isinstance(db_user.role_ids, str) else (db_user.role_ids or [])
            
            # Get old role IDs from JSON (e.g., ['role_super_admin'])
            old_json_role_ids = json_user_roles.get(email, [])
            
            if not old_json_role_ids:
                print(f"   ⚠️  No role_ids found in JSON for '{email}', skipping.")
                continue
            
            # Convert old JSON role IDs to new UUIDs
            new_uuid_role_ids = []
            for old_role_id_str in old_json_role_ids:
                found_uuid = None
                
                # Strategy 1: Check if it's already a UUID (from previous migration)
                if old_role_id_str in role_id_to_uuid_map:
                    found_uuid = role_id_to_uuid_map[old_role_id_str]
                
                # Strategy 2: Use legacy mapping (e.g., "role_super_admin" → "Super Admin")
                elif old_role_id_str in legacy_name_mapping:
                    role_name = legacy_name_mapping[old_role_id_str]
                    if role_name in role_name_to_uuid_map:
                        found_uuid = role_name_to_uuid_map[role_name]
                
                # Strategy 3: Direct name match (if somehow the name was stored)
                elif old_role_id_str in role_name_to_uuid_map:
                    found_uuid = role_name_to_uuid_map[old_role_id_str]
                
                if found_uuid:
                    new_uuid_role_ids.append(found_uuid)
                else:
                    print(f"   ⚠️  Warning: Could not map old role ID '{old_role_id_str}' for user '{email}'. Skipping this role.")

            # Only update if there's a change
            if set(current_db_role_ids) != set(new_uuid_role_ids) and new_uuid_role_ids:
                print(f"🔄 Updating '{email}':")
                print(f"   Old DB: {current_db_role_ids}")
                print(f"   JSON: {old_json_role_ids}")
                print(f"   New (UUIDs): {new_uuid_role_ids}")
                db_user.role_ids = new_uuid_role_ids
                updated_count += 1
            elif not new_uuid_role_ids:
                print(f"   ❌ User '{email}' has no valid role mappings!")
            else:
                print(f"   ✅ User '{email}' already has correct role_ids: {current_db_role_ids}")

        session.commit()
        print(f"\n============================================================")
        print(f"✅ Updated {updated_count} users successfully!")
        print(f"============================================================\n")

    except Exception as e:
        print(f"❌ Error updating user role_ids: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()
