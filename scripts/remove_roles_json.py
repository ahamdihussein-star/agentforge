"""
Remove roles.json to prevent any future loading
This file should NOT exist when using database
"""
import os

roles_json = "data/security/roles.json"

if os.path.exists(roles_json):
    # Backup first
    backup = roles_json + ".backup"
    os.rename(roles_json, backup)
    print(f"✅ Moved {roles_json} → {backup}")
    print("   roles.json will no longer be loaded!")
else:
    print(f"ℹ️  {roles_json} doesn't exist (good!)")

