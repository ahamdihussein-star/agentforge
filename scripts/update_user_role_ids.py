"""
Update User role_ids from JSON Files
Fixes Issue #19: Missing role_ids in migrated users
"""
import sys
import os
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine
from database.models.user import User as DBUser
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

print("🔧 Updating User role_ids from JSON Files")
print("=" * 60)

def load_users_from_json():
    """Load users from JSON file"""
    json_path = 'data/security/users.json'
    if not os.path.exists(json_path):
        print(f"❌ File not found: {json_path}")
        return {}
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Create email -> role_ids mapping
    user_roles = {}
    for user_data in data.values():
        email = user_data.get('email')
        role_ids = user_data.get('role_ids', [])
        if email:
            user_roles[email] = role_ids
    
    return user_roles

def main():
    try:
        # Load role mappings from JSON
        print("📂 Loading user role_ids from JSON...")
        user_roles = load_users_from_json()
        print(f"   Found {len(user_roles)} users in JSON")
        
        # Get database engine
        engine = get_engine()
        Session = sessionmaker(bind=engine)
        
        with Session() as session:
            # Get all users from database
            db_users = session.query(DBUser).all()
            print(f"📊 Found {len(db_users)} users in database")
            print()
            
            updated_count = 0
            for db_user in db_users:
                email = db_user.email
                
                if email not in user_roles:
                    print(f"⚠️  User '{email}' not found in JSON, skipping")
                    continue
                
                json_role_ids = user_roles[email]
                
                # Convert to JSON string for storage
                current_role_ids = json.loads(db_user.role_ids) if isinstance(db_user.role_ids, str) else (db_user.role_ids or [])
                
                if current_role_ids != json_role_ids:
                    print(f"🔄 Updating '{email}':")
                    print(f"   Old: {current_role_ids}")
                    print(f"   New: {json_role_ids}")
                    
                    # Update role_ids (stored as JSON string in TEXT column)
                    db_user.role_ids = json.dumps(json_role_ids)
                    updated_count += 1
                else:
                    print(f"✅ '{email}' already has correct role_ids: {json_role_ids}")
            
            # Commit changes
            if updated_count > 0:
                session.commit()
                print()
                print("=" * 60)
                print(f"✅ Updated {updated_count} users successfully!")
                print("=" * 60)
            else:
                print()
                print("=" * 60)
                print("ℹ️  No users needed updating")
                print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

