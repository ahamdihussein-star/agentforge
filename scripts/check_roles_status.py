#!/usr/bin/env python3
"""
Check the current status of roles in the database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_engine
from sqlalchemy import text

def check_roles():
    print("=" * 80)
    print("🔍 CHECKING ROLES IN DATABASE")
    print("=" * 80)
    
    engine = get_engine()
    
    with engine.connect() as conn:
        # Count total roles
        result = conn.execute(text("SELECT COUNT(*) FROM roles"))
        total_roles = result.scalar()
        print(f"\n📊 Total roles in database: {total_roles}")
        
        # List all roles with details
        result = conn.execute(text("""
            SELECT id, name, description, org_id, 
                   LENGTH(permissions) as permissions_length,
                   created_at
            FROM roles
            ORDER BY name, created_at
        """))
        
        print(f"\n📋 Roles breakdown:")
        print("-" * 80)
        
        roles_by_name = {}
        for row in result:
            role_id, name, description, org_id, perm_len, created_at = row
            if name not in roles_by_name:
                roles_by_name[name] = []
            roles_by_name[name].append({
                'id': role_id,
                'description': description,
                'org_id': org_id,
                'permissions_length': perm_len,
                'created_at': created_at
            })
        
        for name, roles in roles_by_name.items():
            print(f"\n🏷️  Role Name: {name}")
            print(f"   Count: {len(roles)}")
            for i, role in enumerate(roles, 1):
                print(f"   #{i}:")
                print(f"      ID: {role['id']}")
                print(f"      Org ID: {role['org_id']}")
                print(f"      Permissions JSON Length: {role['permissions_length']} chars")
                print(f"      Created: {role['created_at']}")
        
        # Check user role assignments
        print("\n" + "=" * 80)
        print("👥 USER ROLE ASSIGNMENTS")
        print("=" * 80)
        
        result = conn.execute(text("""
            SELECT id, email, role_ids
            FROM users
            ORDER BY email
        """))
        
        for row in result:
            user_id, email, role_ids = row
            print(f"\n📧 {email}")
            print(f"   User ID: {user_id}")
            print(f"   Role IDs: {role_ids}")
        
        # Check for orphaned role references
        print("\n" + "=" * 80)
        print("⚠️  CHECKING FOR ORPHANED ROLE REFERENCES")
        print("=" * 80)
        
        result = conn.execute(text("""
            SELECT DISTINCT jsonb_array_elements_text(role_ids::jsonb) as role_id
            FROM users
            WHERE role_ids IS NOT NULL AND role_ids != '[]'
        """))
        
        user_role_ids = [row[0] for row in result]
        
        result = conn.execute(text("SELECT id FROM roles"))
        actual_role_ids = [str(row[0]) for row in result]
        
        orphaned = [rid for rid in user_role_ids if rid not in actual_role_ids]
        
        if orphaned:
            print(f"\n❌ Found {len(orphaned)} orphaned role references:")
            for role_id in orphaned:
                print(f"   - {role_id}")
        else:
            print(f"\n✅ No orphaned role references found")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    check_roles()

