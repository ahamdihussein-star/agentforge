#!/usr/bin/env python3
"""
Fix user role_ids in database
Safely adds Super Admin role to existing users
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.user import User
from database.models.role import Role
import json

def fix_user_roles():
    """Fix role_ids for existing users in database"""
    
    print("\n" + "="*80)
    print("🔧 FIXING USER ROLES")
    print("="*80)
    
    with get_db_session() as session:
        # Step 1: Get Super Admin role UUID
        print("\n📌 Step 1: Finding Super Admin role...")
        super_admin_role = session.query(Role).filter_by(name="Super Admin").first()
        
        if not super_admin_role:
            print("   ❌ Super Admin role not found in database!")
            print("   Please run migration scripts first.")
            return False
        
        print(f"   ✅ Found Super Admin role: {super_admin_role.id}")
        
        # Step 2: Get all users
        print("\n📌 Step 2: Finding users...")
        users = session.query(User).all()
        
        if not users:
            print("   ⚠️  No users found in database!")
            return False
        
        print(f"   ✅ Found {len(users)} users")
        
        # Step 3: Update each user
        print("\n📌 Step 3: Updating user role_ids...")
        role_ids_json = json.dumps([str(super_admin_role.id)])
        
        updated_count = 0
        for user in users:
            print(f"\n   👤 User: {user.email}")
            print(f"      Current role_ids: {user.role_ids}")
            
            # Update role_ids
            user.role_ids = role_ids_json
            print(f"      New role_ids: {role_ids_json}")
            
            updated_count += 1
        
        # Step 4: Commit changes
        print("\n📌 Step 4: Saving changes...")
        session.commit()
        print(f"   ✅ Committed changes to database")
        
        print("\n" + "="*80)
        print(f"✅ SUCCESS: Updated {updated_count} users with Super Admin role")
        print("="*80)
        
        # Step 5: Verify changes
        print("\n📌 Step 5: Verifying changes...")
        for user in users:
            session.refresh(user)
            print(f"   ✅ {user.email}: role_ids = {user.role_ids}")
        
        return True

if __name__ == "__main__":
    try:
        success = fix_user_roles()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

