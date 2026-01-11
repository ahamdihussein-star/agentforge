#!/usr/bin/env python3
"""
Data Migration Script - JSON to PostgreSQL
Migrates existing users, organizations, and roles from JSON files to database
"""
import sys
import os
import json
import uuid
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.user import User
from database.models.organization import Organization
from database.models.role import Role


def load_json_file(filepath):
    """Load and parse JSON file"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File not found: {filepath}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {filepath}: {e}")
        return None


def migrate_organizations():
    """Migrate organizations from JSON to database"""
    print("\n" + "="*60)
    print("📦 Migrating Organizations...")
    print("="*60)
    
    data = load_json_file('data/security/organizations.json')
    if not data:
        print("⚠️  No organizations file found")
        return 0, {}
    
    # Handle both dict-of-dicts and list formats
    if isinstance(data, dict):
        orgs = list(data.values())  # Convert dict to list of values
    elif isinstance(data, list):
        orgs = data
    else:
        orgs = [data]
    
    count = 0
    id_mapping = {}  # old_id -> new_uuid mapping
    
    with get_db_session() as session:
        for org_data in orgs:
            try:
                old_id = org_data['id']
                
                # Try to parse as UUID, if fails, generate new one
                try:
                    org_uuid = uuid.UUID(old_id)
                except ValueError:
                    # Not a valid UUID, generate new one
                    org_uuid = uuid.uuid4()
                    print(f"   🔄 Generated new UUID for '{old_id}': {org_uuid}")
                
                # Check if already exists
                existing = session.query(Organization).filter_by(id=org_uuid).first()
                if existing:
                    print(f"⏭️  Organization '{org_data['name']}' already exists, skipping")
                    id_mapping[old_id] = org_uuid
                    continue
                
                org = Organization(
                    id=org_uuid,
                    name=org_data['name'],
                    slug=org_data.get('slug', org_data['name'].lower().replace(' ', '-')),
                    plan=org_data.get('plan', 'free'),
                    settings=org_data.get('settings', {}),
                    created_at=datetime.fromisoformat(org_data['created_at']) if 'created_at' in org_data else datetime.utcnow()
                )
                
                session.add(org)
                session.commit()
                print(f"✅ Migrated organization: {org_data['name']} (UUID: {org_uuid})")
                id_mapping[old_id] = org_uuid
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate organization {org_data.get('name', 'unknown')}: {e}")
                session.rollback()
    
    print(f"\n📊 Total organizations migrated: {count}")
    return count, id_mapping


def migrate_roles(org_mapping):
    """Migrate roles from JSON to database"""
    print("\n" + "="*60)
    print("🎭 Migrating Roles...")
    print("="*60)
    
    data = load_json_file('data/security/roles.json')
    if not data:
        print("⚠️  No roles file found")
        return 0, {}
    
    # Handle both dict-of-dicts and list formats
    if isinstance(data, dict):
        roles = list(data.values())  # Convert dict to list of values
    elif isinstance(data, list):
        roles = data
    else:
        roles = [data]
    
    count = 0
    id_mapping = {}  # old_id -> new_uuid mapping
    
    with get_db_session() as session:
        for role_data in roles:
            try:
                old_id = role_data['id']
                
                # Try to parse as UUID, if fails, generate new one
                try:
                    role_uuid = uuid.UUID(old_id)
                except ValueError:
                    # Not a valid UUID, generate new one
                    role_uuid = uuid.uuid4()
                    print(f"   🔄 Generated new UUID for '{old_id}': {role_uuid}")
                
                # Check if already exists
                existing = session.query(Role).filter_by(id=role_uuid).first()
                if existing:
                    print(f"⏭️  Role '{role_data['name']}' already exists, skipping")
                    id_mapping[old_id] = role_uuid
                    continue
                
                # Map org_id
                old_org_id = role_data.get('org_id')
                org_uuid = None
                if old_org_id:
                    org_uuid = org_mapping.get(old_org_id)
                    if not org_uuid:
                        try:
                            org_uuid = uuid.UUID(old_org_id)
                        except ValueError:
                            print(f"   ⚠️  Unknown org_id '{old_org_id}', setting to None")
                
                role = Role(
                    id=role_uuid,
                    name=role_data['name'],
                    description=role_data.get('description', ''),
                    is_system=role_data.get('is_system', False),
                    org_id=org_uuid,
                    created_at=datetime.fromisoformat(role_data['created_at']) if 'created_at' in role_data else datetime.utcnow()
                )
                
                session.add(role)
                session.commit()
                print(f"✅ Migrated role: {role_data['name']} (UUID: {role_uuid})")
                id_mapping[old_id] = role_uuid
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate role {role_data.get('name', 'unknown')}: {e}")
                session.rollback()
    
    print(f"\n📊 Total roles migrated: {count}")
    return count, id_mapping


def migrate_users(org_mapping, role_mapping):
    """Migrate users from JSON to database"""
    print("\n" + "="*60)
    print("👥 Migrating Users...")
    print("="*60)
    
    data = load_json_file('data/security/users.json')
    if not data:
        print("⚠️  No users file found")
        return 0
    
    # Handle both dict-of-dicts and list formats
    if isinstance(data, dict):
        users = list(data.values())  # Convert dict to list of values
    elif isinstance(data, list):
        users = data
    else:
        users = [data]
    
    count = 0
    
    with get_db_session() as session:
        for user_data in users:
            try:
                # Check if already exists
                existing = session.query(User).filter_by(email=user_data['email']).first()
                if existing:
                    print(f"⏭️  User '{user_data['email']}' already exists, skipping")
                    continue
                
                # Parse user ID
                old_id = user_data['id']
                try:
                    user_uuid = uuid.UUID(old_id)
                except ValueError:
                    user_uuid = uuid.uuid4()
                    print(f"   🔄 Generated new UUID for user '{user_data['email']}': {user_uuid}")
                
                # Map org_id
                old_org_id = user_data.get('org_id')
                org_uuid = None
                if old_org_id:
                    org_uuid = org_mapping.get(old_org_id)
                    if not org_uuid:
                        try:
                            org_uuid = uuid.UUID(old_org_id)
                        except ValueError:
                            print(f"   ⚠️  Unknown org_id '{old_org_id}', setting to None")
                
                # Extract profile data if nested
                profile = user_data.get('profile', {})
                
                user = User(
                    id=user_uuid,
                    email=user_data['email'],
                    password_hash=user_data.get('password_hash', ''),
                    first_name=profile.get('first_name') or user_data.get('first_name'),
                    last_name=profile.get('last_name') or user_data.get('last_name'),
                    display_name=profile.get('display_name') or user_data.get('display_name'),
                    phone=profile.get('phone') or user_data.get('phone'),
                    job_title=profile.get('job_title') or user_data.get('job_title'),
                    status=user_data.get('status', 'active'),
                    email_verified=user_data.get('email_verified', False),
                    mfa_enabled=user_data.get('mfa', {}).get('enabled', False),
                    mfa_method=user_data.get('mfa', {}).get('methods', ['none'])[0] if user_data.get('mfa', {}).get('methods') else 'none',
                    org_id=org_uuid,
                    created_at=datetime.fromisoformat(user_data['created_at']) if 'created_at' in user_data else datetime.utcnow()
                )
                
                session.add(user)
                session.commit()
                print(f"✅ Migrated user: {user_data['email']}")
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate user {user_data.get('email', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                session.rollback()
    
    print(f"\n📊 Total users migrated: {count}")
    return count


def verify_migration():
    """Verify migrated data"""
    print("\n" + "="*60)
    print("🔍 Verifying Migration...")
    print("="*60)
    
    with get_db_session() as session:
        org_count = session.query(Organization).count()
        role_count = session.query(Role).count()
        user_count = session.query(User).count()
        
        print(f"\n📊 Database Contents:")
        print(f"   Organizations: {org_count}")
        print(f"   Roles: {role_count}")
        print(f"   Users: {user_count}")
        
        if user_count > 0:
            print(f"\n👥 Users in database:")
            users = session.query(User).all()
            for user in users:
                print(f"   - {user.email} (ID: {user.id})")
        
        return org_count, role_count, user_count


def main():
    """Run complete migration"""
    print("\n" + "="*60)
    print("🚀 AgentForge Data Migration")
    print("   JSON → PostgreSQL")
    print("="*60)
    
    try:
        # Migrate in order (dependencies)
        org_count, org_mapping = migrate_organizations()
        role_count, role_mapping = migrate_roles(org_mapping)
        user_count = migrate_users(org_mapping, role_mapping)
        
        # Verify
        verify_migration()
        
        print("\n" + "="*60)
        print("✅ Migration Complete!")
        print(f"   Organizations: {org_count}")
        print(f"   Roles: {role_count}")
        print(f"   Users: {user_count}")
        print("="*60)
        print("\n💡 Next: Check Railway Dashboard → Postgres → Data tab")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

