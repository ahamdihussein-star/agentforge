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
        print("📊 Attempting to load roles from database...")
        try:
            with get_db_session() as session:
                db_roles = session.query(DBRole).all()
                print(f"🔍 Found {len(db_roles)} roles in database")
                
                # Convert DB roles to core.security.Role Pydantic models
                core_roles = []
                for db_role in db_roles:
                    try:
                        core_role = RoleService._db_to_core_role(db_role)
                        core_roles.append(core_role)
                    except Exception as e:
                        print(f"⚠️  Error converting role '{db_role.name}' (ID: {db_role.id}): {e}")
                        continue
                
                print(f"✅ Successfully converted {len(core_roles)} roles")
                return core_roles
                
        except Exception as e:
            print(f"❌ Error in get_all_roles: {type(e).__name__}: {e}")
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
    def save_role(role: Role) -> bool:
        """
        Save or update a role in the database (UPSERT pattern).
        Returns True if successful, False otherwise.
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
                    print(f"✅ Updated role '{role.name}' (ID: {role.id[:8]}...) in database")
                    return True
                else:
                    # INSERT new role
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
                    print(f"✅ Created role '{role.name}' (ID: {role.id[:8]}...) in database")
                    return True
                    
        except Exception as e:
            print(f"❌ Error saving role '{role.name}': {type(e).__name__}: {e}")
            traceback.print_exc()
            return False

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
                    print(f"⚠️  Role with ID '{role_id}' not found in database")
                    return False
                
                session.delete(role)
                session.commit()
                print(f"✅ Deleted role '{role.name}' (ID: {role_id[:8]}...) from database")
                return True
                
        except Exception as e:
            print(f"❌ Error deleting role '{role_id}': {type(e).__name__}: {e}")
            traceback.print_exc()
            return False

