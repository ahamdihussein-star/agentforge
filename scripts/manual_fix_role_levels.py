#!/usr/bin/env python3
"""
Manual Fix Role Levels - Direct SQL Update
==========================================
Directly updates role levels in database using raw SQL.
This bypasses any ORM issues.
"""

import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from sqlalchemy import text

def manual_fix():
    """Manually update role levels using raw SQL"""
    print("="*60)
    print("🔧 MANUAL FIX: ROLE LEVELS")
    print("="*60)
    print()
    
    try:
        with get_db_session() as session:
            # Update Super Admin to level 0
            result1 = session.execute(
                text("UPDATE roles SET level = '0' WHERE name = 'Super Admin' RETURNING id, name, level")
            )
            super_admin = result1.fetchone()
            if super_admin:
                print(f"✅ Updated Super Admin: {super_admin[0]} → level {super_admin[2]}")
            else:
                print("⚠️  Super Admin role not found")
            
            # Update Admin to level 1
            result2 = session.execute(
                text("UPDATE roles SET level = '1' WHERE name = 'Admin' RETURNING id, name, level")
            )
            admin = result2.fetchone()
            if admin:
                print(f"✅ Updated Admin: {admin[0]} → level {admin[2]}")
            else:
                print("⚠️  Admin role not found")
            
            # Verify all roles
            result3 = session.execute(
                text("SELECT id, name, level FROM roles ORDER BY name")
            )
            roles = result3.fetchall()
            
            print()
            print("📊 Current role levels:")
            for role in roles:
                print(f"   - {role[1]}: level {role[2]}")
            
            session.commit()
            print()
            print("="*60)
            print("✅ Role levels updated successfully!")
            print("="*60)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    manual_fix()

