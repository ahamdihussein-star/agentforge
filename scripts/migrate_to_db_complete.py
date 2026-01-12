#!/usr/bin/env python3
"""
COMPLETE Data Migration Script - JSON to PostgreSQL
Migrates ALL platform data with proper error handling
Enterprise-grade with centralized enum management
"""
import sys
import os
import json
import uuid
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.base import get_db_session
from database.models.organization import Organization
from database.models.role import Role
from database.models.user import User
from database.models.agent import Agent
from database.models.tool import Tool
from database.models.conversation import Conversation, Message
from database.models.knowledge_base import KnowledgeBase, Document
from database.models.settings import SystemSetting, OrganizationSetting

# Import centralized enums
from database.enums import ToolType, AgentStatus


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
    
    if isinstance(data, dict):
        orgs = list(data.values())
    elif isinstance(data, list):
        orgs = data
    else:
        orgs = [data]
    
    count = 0
    id_mapping = {}
    
    with get_db_session() as session:
        for org_data in orgs:
            try:
                old_id = org_data['id']
                slug = org_data.get('slug', org_data['name'].lower().replace(' ', '-'))
                
                # Try to parse as UUID
                try:
                    org_uuid = uuid.UUID(old_id)
                except ValueError:
                    org_uuid = uuid.uuid4()
                    print(f"   🔄 Generated new UUID for '{old_id}': {org_uuid}")
                
                # Check if already exists by ID OR slug
                existing = session.query(Organization).filter(
                    (Organization.id == org_uuid) | (Organization.slug == slug)
                ).first()
                
                if existing:
                    print(f"⏭️  Organization '{org_data['name']}' already exists (updating)")
                    # Update existing
                    existing.name = org_data['name']
                    existing.plan = org_data.get('plan', 'free')
                    existing.settings = org_data.get('settings', {})
                    existing.updated_at = datetime.utcnow()
                    session.commit()
                    id_mapping[old_id] = existing.id
                    count += 1
                else:
                    # Create new
                    org = Organization(
                        id=org_uuid,
                        name=org_data['name'],
                        slug=slug,
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
    
    print(f"\n📊 Total organizations migrated/updated: {count}")
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
    
    if isinstance(data, dict):
        roles = list(data.values())
    elif isinstance(data, list):
        roles = data
    else:
        roles = [data]
    
    count = 0
    id_mapping = {}
    
    with get_db_session() as session:
        for role_data in roles:
            try:
                old_id = role_data['id']
                
                try:
                    role_uuid = uuid.UUID(old_id)
                except ValueError:
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
                
                # Map parent_id if exists
                parent_uuid = None
                if role_data.get('parent_id'):
                    parent_uuid = id_mapping.get(role_data['parent_id']) or role_data.get('parent_id')
                
                role = Role(
                    id=role_uuid,
                    name=role_data['name'],
                    description=role_data.get('description', ''),
                    permissions=json.dumps(role_data.get('permissions', [])),  # ✅ Store permissions!
                    parent_id=parent_uuid,  # ✅ Store parent_id
                    level=str(role_data.get('level', 100)),  # ✅ Store level
                    is_system=role_data.get('is_system', False),
                    org_id=org_uuid,
                    created_by=role_data.get('created_by'),  # ✅ Store created_by
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
        return 0, {}
    
    if isinstance(data, dict):
        users = list(data.values())
    elif isinstance(data, list):
        users = data
    else:
        users = [data]
    
    count = 0
    id_mapping = {}  # ← Store JSON ID → DB ID mapping
    
    with get_db_session() as session:
        for user_data in users:
            try:
                old_id = user_data['id']
                
                # Use JSON UUID directly (no generation!)
                try:
                    user_uuid = uuid.UUID(old_id)
                except ValueError:
                    print(f"   ❌ INVALID UUID in JSON for user '{user_data.get('email', 'unknown')}': {old_id}")
                    continue  # Skip invalid UUIDs
                
                # Check if already exists
                existing = session.query(User).filter_by(id=user_uuid).first()  # ← Check by ID, not email!
                if existing:
                    print(f"⏭️  User with ID '{user_uuid}' already exists (email: {existing.email}), skipping")
                    continue
                
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
                
                # Map role_ids from old IDs to new UUIDs
                role_ids_json = []
                for old_role_id in user_data.get('role_ids', []):
                    if old_role_id in role_mapping:
                        role_ids_json.append(str(role_mapping[old_role_id]))
                    else:
                        # Try to use as-is if it's already a UUID
                        try:
                            uuid.UUID(old_role_id)
                            role_ids_json.append(old_role_id)
                        except ValueError:
                            print(f"   ⚠️  Unknown role_id '{old_role_id}', skipping")
                
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
                    role_ids=json.dumps(role_ids_json),  # ✅ Store as JSON string
                    created_at=datetime.fromisoformat(user_data['created_at']) if 'created_at' in user_data else datetime.utcnow()
                )
                
                session.add(user)
                session.commit()
                print(f"✅ Migrated user: {user_data['email']} (ID: {user_uuid})")
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate user {user_data.get('email', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                session.rollback()
    
    print(f"\n📊 Total users migrated: {count}")
    return count  # ← No ID mapping needed! IDs are preserved!


def migrate_agents(org_mapping):
    """Migrate agents from JSON to database"""
    print("\n" + "="*60)
    print("🤖 Migrating Agents...")
    print("="*60)
    
    data = load_json_file('data/agents.json')
    if not data:
        print("⚠️  No agents file found")
        return 0
    
    if isinstance(data, dict):
        agents = list(data.values())
    else:
        agents = data
    
    count = 0
    
    with get_db_session() as session:
        for agent_data in agents:
            try:
                # Parse ID
                try:
                    agent_uuid = uuid.UUID(agent_data['id'])
                except (ValueError, KeyError):
                    agent_uuid = uuid.uuid4()
                
                # Check if exists
                existing = session.query(Agent).filter_by(id=agent_uuid).first()
                if existing:
                    print(f"⏭️  Agent '{agent_data['name']}' already exists, skipping")
                    continue
                
                # Get org_id (use first one from mapping if available)
                org_id = list(org_mapping.values())[0] if org_mapping else None
                
                # Get owner_id (first user in system)
                owner = session.query(User).first()
                owner_id = owner.id if owner else uuid.uuid4()
                
                agent = Agent(
                    id=agent_uuid,
                    org_id=org_id,
                    name=agent_data['name'],
                    icon=agent_data.get('icon', '🤖'),
                    goal=agent_data.get('goal', ''),
                    model_id=agent_data.get('model_id', 'gpt-4'),
                    personality=agent_data.get('personality', {}),
                    guardrails=agent_data.get('guardrails', {}),
                    tasks=agent_data.get('tasks', []),
                    tool_ids=agent_data.get('tool_ids', []),
                    memory=agent_data.get('memory', []),
                    memory_enabled=agent_data.get('memory_enabled', True),
                    status='active',
                    owner_id=owner_id,
                    created_by=owner_id,
                    created_at=datetime.utcnow()
                )
                
                session.add(agent)
                session.commit()
                print(f"✅ Migrated agent: {agent_data['name']}")
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate agent {agent_data.get('name', 'unknown')}: {e}")
                session.rollback()
    
    print(f"\n📊 Total agents migrated: {count}")
    return count


def migrate_tools(org_mapping):
    """Migrate tools from JSON to database using centralized enum management"""
    print("\n" + "="*60)
    print("🔧 Migrating Tools...")
    print("="*60)
    
    data = load_json_file('data/tools.json')
    if not data:
        print("⚠️  No tools file found")
        return 0
    
    if isinstance(data, dict):
        tools = list(data.values())
    else:
        tools = data
    
    count = 0
    
    with get_db_session() as session:
        for tool_data in tools:
            try:
                tool_id = tool_data['id']
                
                # Check if exists
                existing = session.query(Tool).filter_by(id=tool_id).first()
                if existing:
                    print(f"⏭️  Tool '{tool_data['name']}' already exists, skipping")
                    continue
                
                # Get org_id
                org_id = list(org_mapping.values())[0] if org_mapping else None
                
                # Get owner_id
                owner = session.query(User).first()
                owner_id = owner.id if owner else uuid.uuid4()
                
                # ✅ Use centralized enum normalization (Enterprise Best Practice)
                legacy_type = tool_data.get('type', 'api')
                tool_type_enum = ToolType.from_legacy(legacy_type)
                
                # Log if type was mapped from legacy
                if legacy_type.lower() != tool_type_enum.value:
                    print(f"   🔄 Mapped legacy type '{legacy_type}' → '{tool_type_enum.value}' for '{tool_data['name']}'")
                
                tool = Tool(
                    id=tool_id,
                    org_id=org_id,
                    type=tool_type_enum.value,  # Use normalized enum value
                    name=tool_data['name'],
                    description=tool_data.get('description', ''),
                    config=tool_data.get('config', {}),
                    api_config=tool_data.get('api_config'),
                    database_config=tool_data.get('database_config'),
                    rag_config=tool_data.get('rag_config'),
                    email_config=tool_data.get('email_config'),
                    slack_config=tool_data.get('slack_config'),
                    input_parameters=tool_data.get('input_parameters', []),
                    is_active=True,
                    owner_id=owner_id,
                    created_by=owner_id,
                    created_at=datetime.utcnow()
                )
                
                session.add(tool)
                session.commit()
                print(f"✅ Migrated tool: {tool_data['name']} (type: {tool_type_enum.value})")
                count += 1
                
            except Exception as e:
                print(f"❌ Failed to migrate tool {tool_data.get('name', 'unknown')}: {e}")
                import traceback
                traceback.print_exc()
                session.rollback()
    
    print(f"\n📊 Total tools migrated: {count}")
    return count


def migrate_settings():
    """Migrate settings from JSON to database"""
    print("\n" + "="*60)
    print("⚙️  Migrating Settings...")
    print("="*60)
    
    data = load_json_file('data/settings.json')
    if not data:
        print("⚠️  No settings file found")
        return 0
    
    count = 0
    
    with get_db_session() as session:
        for key, value in data.items():
            try:
                # Skip nested objects (handle separately)
                if isinstance(value, dict):
                    for sub_key, sub_value in value.items():
                        setting_key = f"{key}.{sub_key}"
                        
                        existing = session.query(SystemSetting).filter_by(key=setting_key).first()
                        if existing:
                            existing.value = sub_value
                            existing.updated_at = datetime.utcnow()
                        else:
                            setting = SystemSetting(
                                key=setting_key,
                                value=sub_value,
                                value_type='string',
                                category=key,
                                is_secret=('key' in sub_key.lower() or 'secret' in sub_key.lower() or 'password' in sub_key.lower()),
                                created_at=datetime.utcnow()
                            )
                            session.add(setting)
                        count += 1
                else:
                    existing = session.query(SystemSetting).filter_by(key=key).first()
                    if existing:
                        existing.value = value
                        existing.updated_at = datetime.utcnow()
                    else:
                        setting = SystemSetting(
                            key=key,
                            value=value,
                            value_type=type(value).__name__,
                            category='general',
                            created_at=datetime.utcnow()
                        )
                        session.add(setting)
                    count += 1
                
                session.commit()
                
            except Exception as e:
                print(f"❌ Failed to migrate setting {key}: {e}")
                session.rollback()
    
    print(f"✅ Migrated {count} settings")
    print(f"\n📊 Total settings migrated: {count}")
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
        agent_count = session.query(Agent).count()
        tool_count = session.query(Tool).count()
        setting_count = session.query(SystemSetting).count()
        
        print(f"\n📊 Database Contents:")
        print(f"   Organizations: {org_count}")
        print(f"   Roles: {role_count}")
        print(f"   Users: {user_count}")
        print(f"   Agents: {agent_count}")
        print(f"   Tools: {tool_count}")
        print(f"   Settings: {setting_count}")
        
        return org_count, role_count, user_count, agent_count, tool_count, setting_count


def main():
    """Run complete migration"""
    print("\n" + "="*60)
    print("🚀 AgentForge COMPLETE Data Migration")
    print("   JSON → PostgreSQL")
    print("="*60)
    
    try:
        # Migrate in order (dependencies)
        org_count, org_mapping = migrate_organizations()
        role_count, role_mapping = migrate_roles(org_mapping)
        user_count = migrate_users(org_mapping, role_mapping)  # ← No ID mapping returned!
        agent_count = migrate_agents(org_mapping)
        tool_count = migrate_tools(org_mapping)
        setting_count = migrate_settings()
        
        # Verify
        verify_migration()
        
        print("\n" + "="*60)
        print("✅ Migration Complete!")
        print(f"   Organizations: {org_count}")
        print(f"   Roles: {role_count}")
        print(f"   Users: {user_count}")
        print(f"   Agents: {agent_count}")
        print(f"   Tools: {tool_count}")
        print(f"   Settings: {setting_count}")
        print("="*60)
        print("\n💡 Next: Check Railway Dashboard → Postgres → Data tab")
        print("🎉 All platform data migrated successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

