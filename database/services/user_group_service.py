"""
UserGroup Service - Database Operations for User Groups
"""
import json
from typing import Optional, List
from datetime import datetime
from ..base import get_db_session
from ..models.user_group import UserGroup as DBUserGroup
from core.security import UserGroup as CoreUserGroup


class UserGroupService:
    """UserGroup Service - Bridge between API and Database"""
    
    @staticmethod
    def get_all_groups() -> List[CoreUserGroup]:
        """Get all user groups from database"""
        with get_db_session() as session:
            db_groups = session.query(DBUserGroup).all()
            print(f"📊 [DATABASE] Retrieved {len(db_groups)} user groups from database")
            return [UserGroupService._db_to_core_group(db_group) for db_group in db_groups]
    
    @staticmethod
    def save_group(group: CoreUserGroup) -> CoreUserGroup:
        """Save user group to database"""
        with get_db_session() as session:
            db_group = session.query(DBUserGroup).filter_by(id=group.id).first()
            if db_group:
                print(f"💾 [DATABASE] Updating user group in database: {group.name} (ID: {group.id[:8]}...)")
                db_group.name = group.name
                db_group.description = group.description
                db_group.user_ids = json.dumps(group.user_ids)
                db_group.role_ids = json.dumps(group.role_ids)
                db_group.updated_at = datetime.utcnow()
                print(f"✅ [DATABASE] User group updated successfully: {group.name}")
            else:
                print(f"💾 [DATABASE] Creating new user group in database: {group.name} (ID: {group.id[:8]}...)")
                db_group = DBUserGroup(
                    id=group.id,
                    org_id=group.org_id,
                    name=group.name,
                    description=group.description,
                    user_ids=json.dumps(group.user_ids),
                    role_ids=json.dumps(group.role_ids),
                    created_at=datetime.fromisoformat(group.created_at) if group.created_at else datetime.utcnow(),
                    updated_at=datetime.fromisoformat(group.updated_at) if group.updated_at else datetime.utcnow()
                )
                session.add(db_group)
                print(f"✅ [DATABASE] User group created successfully: {group.name}")
            session.commit()
            session.refresh(db_group)
            return UserGroupService._db_to_core_group(db_group)
    
    @staticmethod
    def _db_to_core_group(db_group: DBUserGroup) -> CoreUserGroup:
        """Convert database UserGroup to core UserGroup model"""
        # Parse JSON arrays
        user_ids = []
        if db_group.user_ids:
            if isinstance(db_group.user_ids, str):
                user_ids = json.loads(db_group.user_ids)
            elif isinstance(db_group.user_ids, list):
                user_ids = db_group.user_ids
        
        role_ids = []
        if db_group.role_ids:
            if isinstance(db_group.role_ids, str):
                role_ids = json.loads(db_group.role_ids)
            elif isinstance(db_group.role_ids, list):
                role_ids = db_group.role_ids
        
        return CoreUserGroup(
            id=str(db_group.id),
            org_id=str(db_group.org_id),
            name=db_group.name,
            description=db_group.description,
            user_ids=user_ids,
            role_ids=role_ids,
            created_at=db_group.created_at.isoformat() if db_group.created_at else datetime.utcnow().isoformat(),
            updated_at=db_group.updated_at.isoformat() if db_group.updated_at else datetime.utcnow().isoformat()
        )

