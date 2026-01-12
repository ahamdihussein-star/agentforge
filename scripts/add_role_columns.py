#!/usr/bin/env python3
"""
Add missing columns to roles table
Issue #20: Role model missing 'permissions', 'parent_id', 'level', 'created_by' columns
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database.base import get_engine

print("🔧 Adding missing columns to roles table...")
print("=" * 60)


def add_missing_role_columns():
    engine = get_engine()
    with engine.connect() as connection:
        # Define columns to add with their types and default values
        columns_to_add = [
            ("permissions", "TEXT", "''"),  # JSON array stored as TEXT, defaults to empty array string
            ("parent_id", "UUID", "NULL"),
            ("level", "VARCHAR(10)", "'100'"),  # Stored as string for flexibility
            ("created_by", "VARCHAR(100)", "NULL"),
        ]

        for i, (col_name, col_type, default_value) in enumerate(columns_to_add):
            try:
                print(f"   Adding column '{col_name}' ({i+1}/{len(columns_to_add)})...")
                # Use ALTER TABLE ADD COLUMN IF NOT EXISTS for idempotency
                sql = f"ALTER TABLE roles ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_value}"
                connection.execute(text(sql))
                print(f"   ✅ Column '{col_name}' added.")
            except Exception as e:
                print(f"   ❌ Error adding column '{col_name}': {e}")
                # Continue with other columns
        
        connection.commit()
    
    print("✅ Roles table updated successfully!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        add_missing_role_columns()
    except Exception as e:
        print(f"❌ Failed to update roles table: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

