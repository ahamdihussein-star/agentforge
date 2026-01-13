#!/usr/bin/env python3
"""
Fix Role Levels in Database
===========================
Updates role levels in database to match DEFAULT_ROLES hierarchy:
- Super Admin: level 0
- Admin: level 1
- Other roles: level 100 (default)
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.role import Role as DBRole
from core.security.models import DEFAULT_ROLES
from sqlalchemy import text

def fix_role_levels():
    """Update role levels in database to match DEFAULT_ROLES"""
    print("="*60)
    print("🔧 FIXING ROLE LEVELS IN DATABASE")
    print("="*60)
    print()
    
    # Create mapping from role name to level
    name_to_level = {}
    for role_data in DEFAULT_ROLES:
        name_to_level[role_data['name']] = role_data.get('level', 100)
    
    print(f"📋 Default role levels:")
    for name, level in name_to_level.items():
        print(f"   - {name}: level {level}")
    print()
    
    try:
        with get_db_session() as session:
            # Get all roles
            db_roles = session.query(DBRole).all()
            print(f"📊 Found {len(db_roles)} roles in database")
            print()
            
            updated_count = 0
            for db_role in db_roles:
                role_name = db_role.name
                current_level = db_role.level
                
                # Get expected level from DEFAULT_ROLES
                expected_level = name_to_level.get(role_name, 100)
                
                # Convert to int for comparison
                try:
                    current_level_int = int(current_level) if isinstance(current_level, str) else current_level
                    expected_level_int = int(expected_level) if isinstance(expected_level, str) else expected_level
                except (ValueError, TypeError):
                    current_level_int = 100
                    expected_level_int = name_to_level.get(role_name, 100)
                
                if current_level_int != expected_level_int:
                    print(f"🔄 Updating {role_name}:")
                    print(f"   Current level: {current_level} (type: {type(current_level).__name__})")
                    print(f"   Expected level: {expected_level_int}")
                    
                    # Update using raw SQL to ensure it works
                    session.execute(
                        text("UPDATE roles SET level = :level WHERE id = :id"),
                        {"level": str(expected_level_int), "id": db_role.id}
                    )
                    updated_count += 1
                    print(f"   ✅ Updated to level {expected_level_int}")
                else:
                    print(f"✅ {role_name}: level {current_level_int} (correct)")
            
            if updated_count > 0:
                session.commit()
                print()
                print(f"✅ Updated {updated_count} role(s)")
            else:
                print()
                print("✅ All role levels are correct!")
            
            print()
            print("="*60)
            print("✅ Role levels fixed successfully!")
            print("="*60)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    fix_role_levels()

