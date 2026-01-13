"""
Simple Direct Fix - Delete roles with string IDs from database
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from sqlalchemy import text

def fix_now():
    print("\n" + "="*80)
    print("🔧 DIRECT FIX - Deleting roles with string IDs")
    print("="*80 + "\n")
    
    try:
        with get_db_session() as session:
            # Delete roles where ID is a string (like "role_super_admin")
            result = session.execute(text("""
                DELETE FROM roles 
                WHERE id IN ('role_super_admin', 'role_admin', 'role_manager', 'role_user', 'role_viewer')
                RETURNING id, name
            """))
            
            deleted = result.fetchall()
            
            if deleted:
                print(f"✅ Deleted {len(deleted)} roles with string IDs:")
                for role_id, name in deleted:
                    print(f"   - {name} (ID: {role_id})")
            else:
                print("ℹ️  No string ID roles found (already clean)")
            
            session.commit()
            
            # Verify
            result = session.execute(text("SELECT id, name FROM roles ORDER BY name"))
            remaining = result.fetchall()
            
            print(f"\n📊 Remaining roles in database: {len(remaining)}")
            for role_id, name in remaining:
                print(f"   ✅ {name} (UUID: {str(role_id)[:8]}...)")
            
            print("\n" + "="*80)
            print("✅ DONE! Refresh the UI now.")
            print("="*80 + "\n")
            
            return True
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = fix_now()
    sys.exit(0 if success else 1)

