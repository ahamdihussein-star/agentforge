"""
Role Service - Database operations for roles
Implements dual-read pattern (database first, fallback to files)
"""
import json
import traceback
from typing import List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from core.security import Role
from ..base import get_db_session
from ..models.role import Role as DBRole


class RoleService:
    """Service for managing roles in the database."""

    @staticmethod
    def get_all_roles() -> List[Role]:
        """Retrieve all roles from the database."""
        try:
            with get_db_session() as session:
                db_roles = session.query(DBRole).all()
                
                # Convert DB roles to core.security.Role Pydantic models
                core_roles = []
                for db_role in db_roles:
                    try:
                        core_role = RoleService._db_to_core_role(db_role)
                        core_roles.append(core_role)
                    except Exception as e:
                        print(f"⚠️  [DATABASE ERROR] Error converting role '{db_role.name}' (ID: {str(db_role.id)[:8]}...): {e}")
                        continue
                
                return core_roles
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to retrieve roles: {type(e).__name__}: {e}")
            print("📂 Traceback:")
            traceback.print_exc()
            raise

    @staticmethod
    def _db_to_core_role(db_role: DBRole) -> Role:
        """Converts a database Role object to a core.security.Role Pydantic model."""
        try:
            # Convert UUID to string
            role_id = str(db_role.id) if db_role.id else ""
            org_id = str(db_role.org_id) if db_role.org_id else ""
            parent_id = str(db_role.parent_id) if db_role.parent_id else None
            
            # Parse permissions (stored as JSON array in DB)
            # Handle double JSON encoding (Issue #26)
            try:
                if isinstance(db_role.permissions, str):
                    # First parse attempt
                    permissions = json.loads(db_role.permissions)
                    # Check if result is still a string (double encoding)
                    if isinstance(permissions, str):
                        # Second parse attempt
                        permissions = json.loads(permissions)
                elif isinstance(db_role.permissions, list):
                    permissions = db_role.permissions
                else:
                    permissions = []
            except (json.JSONDecodeError, TypeError):
                permissions = []
            
            # Parse level (stored as string in DB)
            try:
                level = int(db_role.level) if db_role.level else 100
            except (ValueError, TypeError):
                level = 100
            
            return Role(
                id=role_id,
                org_id=org_id,
                name=db_role.name,
                description=db_role.description or "",
                permissions=permissions,
                parent_id=parent_id,
                level=level,
                is_system=db_role.is_system if hasattr(db_role, 'is_system') else False,
                created_at=db_role.created_at.isoformat() if db_role.created_at else datetime.utcnow().isoformat(),
                updated_at=db_role.updated_at.isoformat() if db_role.updated_at else datetime.utcnow().isoformat(),
                created_by=db_role.created_by if hasattr(db_role, 'created_by') else None
            )
        except Exception as e:
            print(f"❌ Error in _db_to_core_role: {type(e).__name__}: {e}")
            print(f"   Role data: id={db_role.id}, name={db_role.name}")
            traceback.print_exc()
            raise

    @staticmethod
    def save_role(role: Role) -> Role:
        """
        Save or update a role in the database (UPSERT pattern).
        Returns the saved Role model.
        """
        try:
            import uuid as uuid_lib
            from sqlalchemy import text
            
            with get_db_session() as session:
                # Check if role exists
                try:
                    role_uuid = uuid_lib.UUID(role.id)
                except ValueError:
                    print(f"❌ Invalid role ID: {role.id}")
                    return False
                
                existing = session.query(DBRole).filter_by(id=role_uuid).first()
                
                # Prepare permissions as JSON string
                permissions_json = json.dumps(role.permissions) if role.permissions else json.dumps([])
                
                # Prepare org_id
                try:
                    org_uuid = uuid_lib.UUID(role.org_id) if role.org_id else None
                except ValueError:
                    org_uuid = None
                
                # Prepare parent_id
                parent_uuid = None
                if role.parent_id:
                    try:
                        parent_uuid = uuid_lib.UUID(role.parent_id)
                    except ValueError:
                        parent_uuid = None
                
                if existing:
                    # UPDATE existing role
                    existing.name = role.name
                    existing.description = role.description or ""
                    existing.permissions = permissions_json
                    existing.parent_id = parent_uuid
                    existing.level = str(role.level) if role.level else "100"
                    existing.is_system = role.is_system if hasattr(role, 'is_system') else False
                    if hasattr(role, 'created_by') and role.created_by:
                        existing.created_by = role.created_by
                    existing.updated_at = datetime.utcnow()
                    
                    session.commit()
                    session.refresh(existing)
                    return RoleService._db_to_core_role(existing)
                else:
                    # INSERT new role
                    print(f"💾 [DATABASE] Creating new role in database: {role.name} (ID: {role.id[:8]}...)")
                    new_role = DBRole(
                        id=role_uuid,
                        name=role.name,
                        description=role.description or "",
                        permissions=permissions_json,
                        parent_id=parent_uuid,
                        level=str(role.level) if role.level else "100",
                        is_system=role.is_system if hasattr(role, 'is_system') else False,
                        org_id=org_uuid,
                        created_by=role.created_by if hasattr(role, 'created_by') and role.created_by else None,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    session.add(new_role)
                    session.commit()
                    session.refresh(new_role)
                    return RoleService._db_to_core_role(new_role)
                    
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to save role '{role.name}': {type(e).__name__}: {e}")
            traceback.print_exc()
            raise

    @staticmethod
    def delete_role(role_id: str) -> bool:
        """
        Delete a role from the database.
        Returns True if successful, False otherwise.
        """
        try:
            import uuid as uuid_lib
            
            with get_db_session() as session:
                try:
                    role_uuid = uuid_lib.UUID(role_id)
                except ValueError:
                    print(f"❌ Invalid role ID: {role_id}")
                    return False
                
                role = session.query(DBRole).filter_by(id=role_uuid).first()
                if not role:
                    print(f"⚠️  [DATABASE] Role with ID '{role_id[:8]}...' not found in database")
                    return False
                
                role_name = role.name
                session.delete(role)
                session.commit()
                print(f"🗑️  [DATABASE] Deleted role from database: {role_name} (ID: {role_id[:8]}...)")
                return True
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to delete role '{role_id[:8]}...': {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
    
    @staticmethod
    def get_or_create_user_role(org_id: str = "org_default") -> Role:
        """
        Get or create the default "User" role for self-registered users.
        This role has limited permissions (chat only).
        Returns the Role model.
        """
        try:
            import uuid as uuid_lib
            from core.security import Permission
            
            with get_db_session() as session:
                # Try to find existing "User" role by name
                # First, resolve org_id to UUID
                try:
                    org_uuid = uuid_lib.UUID(org_id) if org_id != "org_default" else None
                except ValueError:
                    org_uuid = None
                
                # Search for "User" role by name (case-insensitive)
                if org_uuid:
                    existing = session.query(DBRole).filter(
                        DBRole.name.ilike("User"),
                        DBRole.org_id == org_uuid
                    ).first()
                else:
                    # For org_default, search by name and check if org_id is null or matches default org
                    from database.services import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    default_org = next((o for o in orgs if o.slug == "default"), None)
                    if default_org:
                        try:
                            default_org_uuid = uuid_lib.UUID(default_org.id)
                            existing = session.query(DBRole).filter(
                                DBRole.name.ilike("User"),
                                DBRole.org_id == default_org_uuid
                            ).first()
                        except ValueError:
                            existing = None
                    else:
                        existing = None
                
                if existing:
                    return RoleService._db_to_core_role(existing)
                
                # Create new "User" role with limited permissions (chat only)
                print(f"💾 [DATABASE] Creating new 'User' role for self-registered users...")
                user_role_id = uuid_lib.uuid4()
                
                # Default permissions for self-registered users (chat only)
                user_permissions = [
                    Permission.CHAT_USE.value,  # Only chat permission
                ]
                
                # Resolve org_id to UUID
                if org_id == "org_default":
                    from database.services import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    default_org = next((o for o in orgs if o.slug == "default"), None)
                    if default_org:
                        try:
                            org_uuid = uuid_lib.UUID(default_org.id)
                        except ValueError:
                            org_uuid = None
                    else:
                        org_uuid = None
                else:
                    try:
                        org_uuid = uuid_lib.UUID(org_id)
                    except ValueError:
                        org_uuid = None
                
                new_role = DBRole(
                    id=user_role_id,
                    name="User",
                    description="Default role for self-registered users (chat access only)",
                    permissions=json.dumps(user_permissions),
                    parent_id=None,
                    level="100",  # Lowest privilege level
                    is_system=True,  # System role, cannot be deleted
                    org_id=org_uuid,
                    created_by=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_role)
                session.commit()
                session.refresh(new_role)
                return RoleService._db_to_core_role(new_role)
                
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to get/create 'User' role: {type(e).__name__}: {e}")
            traceback.print_exc()
            raise

