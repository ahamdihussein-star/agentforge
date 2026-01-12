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
            try:
                if isinstance(db_role.permissions, str):
                    permissions = json.loads(db_role.permissions)
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

