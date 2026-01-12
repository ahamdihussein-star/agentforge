#!/usr/bin/env python3
"""
Script to convert all PostgreSQL-specific types to database-agnostic types
Run this once to update all models
"""
import os
import re

MODELS_DIR = "database/models"

# Replacement patterns
REPLACEMENTS = [
    # Import statements
    (r'from sqlalchemy\.dialects\.postgresql import UUID, JSONB, ARRAY', 
     'from ..types import UUID, JSON as JSONB, JSONArray'),
    
    (r'from sqlalchemy\.dialects\.postgresql import UUID, JSONB', 
     'from ..types import UUID, JSON as JSONB'),
    
    (r'from sqlalchemy\.dialects\.postgresql import JSONB',
     'from ..types import JSON as JSONB'),
    
    # UUID usage
    (r'Column\(UUID\(as_uuid=True\)', 'Column(UUID'),
    
    # ARRAY usage
    (r'Column\(ARRAY\(UUID\(as_uuid=True\)\)', 'Column(JSONArray'),
    (r'Column\(ARRAY\(String\)', 'Column(JSONArray'),
    (r'Column\(ARRAY\(Integer\)', 'Column(JSONArray'),
    
    # JSONB -> JSON
    (r'Column\(JSONB', 'Column(JSON'),
]

def update_file(filepath):
    """Update a single file"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ Updated: {filepath}")
        return True
    else:
        print(f"⏭️  No changes: {filepath}")
        return False

def main():
    """Update all model files"""
    print("🔧 Converting PostgreSQL-specific types to database-agnostic types...")
    print("=" * 60)
    
    updated_count = 0
    
    for filename in os.listdir(MODELS_DIR):
        if filename.endswith('.py') and filename != '__init__.py':
            filepath = os.path.join(MODELS_DIR, filename)
            if update_file(filepath):
                updated_count += 1
    
    print("=" * 60)
    print(f"✅ Updated {updated_count} files")
    print("\n✅ All models are now database-agnostic!")

if __name__ == "__main__":
    main()

