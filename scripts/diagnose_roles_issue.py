"""
Diagnose Roles Issue - Check what's happening with roles
This script should be run in the Railway deployment environment
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role
from database.models.user import User
import json

def diagnose():
    print("\n" + "="*80)
    print("🔍 DIAGNOSING ROLES ISSUE")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # 1. Count all roles in DB
            all_roles = session.query(Role).all()
            print(f"📊 Total roles in database: {len(all_roles)}\n")
            
            if len(all_roles) == 0:
                print("❌ NO ROLES FOUND IN DATABASE!")
                print("   This explains why the API returns only 1 role - it might be")
                print("   falling back to loading from roles.json file.\n")
                return
            
            # 2. List all roles with details
            print("📋 All roles in database:")
            print("-" * 80)
            for role in all_roles:
                print(f"\n🏷️  Role: {role.name}")
                print(f"   ID: {role.id}")
                print(f"   Org ID: {role.org_id}")
                print(f"   Is System: {role.is_system if hasattr(role, 'is_system') else 'N/A'}")
                print(f"   Permissions: {len(role.permissions) if role.permissions else 0} items")
                print(f"   Created: {role.created_at}")
            
            # 3. Check if roles have the 'is_system' field
            print("\n" + "="*80)
            print("🔍 Checking 'is_system' field...")
            print("="*80)
            
            # Use raw SQL to check the actual column
            from sqlalchemy import text
            result = session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'roles'"))
            columns = [row[0] for row in result]
            
            print(f"\n📋 Columns in 'roles' table:")
            for col in columns:
                print(f"   - {col}")
            
            has_is_system = 'is_system' in columns
            print(f"\n{'✅' if has_is_system else '❌'} 'is_system' column exists: {has_is_system}")
            
            if not has_is_system:
                print("\n⚠️  WARNING: 'is_system' column is MISSING!")
                print("   This could cause the API filter to fail:")
                print("   `r.org_id == user.org_id or r.is_system`")
                print("   Fix: Add 'is_system' column to roles table\n")
            
            # 4. Check users and their org_ids
            print("\n" + "="*80)
            print("👥 Users and their organization IDs:")
            print("="*80)
            
            users = session.query(User).all()
            for user in users:
                print(f"\n📧 {user.email}")
                print(f"   User ID: {user.id}")
                print(f"   Org ID: {user.org_id}")
                
                # Check if their org_id matches any role's org_id
                matching_roles = [r for r in all_roles if str(r.org_id) == str(user.org_id)]
                print(f"   Matching roles (by org_id): {len(matching_roles)}")
                if matching_roles:
                    for r in matching_roles:
                        print(f"      - {r.name} (ID: {r.id})")
            
            # 5. Simulate the API filter
            print("\n" + "="*80)
            print("🧪 SIMULATING API FILTER")
            print("="*80)
            
            admin_user = next((u for u in users if u.email == "admin@agentforge.app"), None)
            if admin_user:
                print(f"\n👤 Simulating for user: {admin_user.email}")
                print(f"   User Org ID: {admin_user.org_id}")
                
                # This is the filter from api/security.py line 1599
                filtered_roles = []
                for r in all_roles:
                    matches_org = str(r.org_id) == str(admin_user.org_id)
                    is_system = r.is_system if hasattr(r, 'is_system') else False
                    
                    if matches_org or is_system:
                        filtered_roles.append(r)
                        print(f"   ✅ {r.name}: matches_org={matches_org}, is_system={is_system}")
                    else:
                        print(f"   ❌ {r.name}: matches_org={matches_org}, is_system={is_system} (FILTERED OUT)")
                
                print(f"\n📊 Filtered roles count: {len(filtered_roles)}")
                print(f"   Expected by test: 3 (Super Admin, Admin, Presales)")
                print(f"   {'✅' if len(filtered_roles) == 3 else '❌'} Result: {len(filtered_roles)}")
            
            print("\n" + "="*80)
            print("✅ DIAGNOSIS COMPLETE")
            print("="*80 + "\n")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose()

