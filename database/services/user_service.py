"""
User Service - Dual-write implementation (JSON + Database)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import select

from ..models.user import User, UserSession, MFASetting, PasswordHistory
from ..base import get_db_session  # Use context manager version


class UserService:
    """
    User service with dual-write support
    Writes to both JSON files and PostgreSQL database
    Reads from database first, falls back to JSON
    """
    
    def __init__(self, json_storage=None):
        """
        Initialize service
        
        Args:
            json_storage: Reference to existing JSON storage system
        """
        self.json_storage = json_storage
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create user in both DB and JSON
        
        Args:
            user_data: User information
            
        Returns:
            Created user dict
        """
        user_id = user_data.get('id') or str(uuid.uuid4())
        
        # 1. Write to Database
        try:
            with get_db_session() as session:
                db_user = User(
                    id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
                    email=user_data.get('email'),
                    username=user_data.get('username'),
                    password_hash=user_data.get('password_hash'),
                    first_name=user_data.get('first_name'),
                    last_name=user_data.get('last_name'),
                    display_name=user_data.get('display_name'),
                    phone=user_data.get('phone'),
                    job_title=user_data.get('job_title'),
                    status=user_data.get('status', 'active'),
                    email_verified=user_data.get('email_verified', False),
                    mfa_enabled=user_data.get('mfa_enabled', False),
                    mfa_method=user_data.get('mfa_method', 'none'),
                    org_id=uuid.UUID(user_data['org_id']) if user_data.get('org_id') else None,
                    created_at=datetime.fromisoformat(user_data['created_at']) if user_data.get('created_at') else datetime.utcnow()
                )
                session.add(db_user)
                session.commit()
                print(f"✅ User {user_data.get('email')} written to database")
        except Exception as e:
            print(f"⚠️  Database write failed: {e}")
            # Continue to JSON write even if DB fails
        
        # 2. Write to JSON (existing system)
        if self.json_storage:
            try:
                self.json_storage.save_user(user_data)
                print(f"✅ User {user_data.get('email')} written to JSON")
            except Exception as e:
                print(f"⚠️  JSON write failed: {e}")
        
        return user_data
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user by email - reads from DB first, falls back to JSON
        
        Args:
            email: User email
            
        Returns:
            User dict or None
        """
        # 1. Try Database first
        try:
            with get_session() as session:
                stmt = select(User).where(User.email == email)
                db_user = session.execute(stmt).scalar_one_or_none()
                
                if db_user:
                    print(f"✅ User {email} found in database")
                    return db_user.to_dict()
        except Exception as e:
            print(f"⚠️  Database read failed: {e}")
        
        # 2. Fallback to JSON
        if self.json_storage:
            try:
                json_user = self.json_storage.get_user_by_email(email)
                if json_user:
                    print(f"✅ User {email} found in JSON (fallback)")
                    return json_user
            except Exception as e:
                print(f"⚠️  JSON read failed: {e}")
        
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by ID - reads from DB first, falls back to JSON
        
        Args:
            user_id: User UUID
            
        Returns:
            User dict or None
        """
        # 1. Try Database first
        try:
            with get_session() as session:
                stmt = select(User).where(User.id == uuid.UUID(user_id))
                db_user = session.execute(stmt).scalar_one_or_none()
                
                if db_user:
                    print(f"✅ User {user_id} found in database")
                    return db_user.to_dict()
        except Exception as e:
            print(f"⚠️  Database read failed: {e}")
        
        # 2. Fallback to JSON
        if self.json_storage:
            try:
                json_user = self.json_storage.get_user_by_id(user_id)
                if json_user:
                    print(f"✅ User {user_id} found in JSON (fallback)")
                    return json_user
            except Exception as e:
                print(f"⚠️  JSON read failed: {e}")
        
        return None
    
    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update user in both DB and JSON
        
        Args:
            user_id: User UUID
            update_data: Fields to update
            
        Returns:
            Updated user dict or None
        """
        # 1. Update in Database
        try:
            with get_session() as session:
                stmt = select(User).where(User.id == uuid.UUID(user_id))
                db_user = session.execute(stmt).scalar_one_or_none()
                
                if db_user:
                    for key, value in update_data.items():
                        if hasattr(db_user, key):
                            setattr(db_user, key, value)
                    
                    db_user.updated_at = datetime.utcnow()
                    session.commit()
                    print(f"✅ User {user_id} updated in database")
        except Exception as e:
            print(f"⚠️  Database update failed: {e}")
        
        # 2. Update in JSON
        if self.json_storage:
            try:
                self.json_storage.update_user(user_id, update_data)
                print(f"✅ User {user_id} updated in JSON")
            except Exception as e:
                print(f"⚠️  JSON update failed: {e}")
        
        # Return updated user
        return self.get_user_by_id(user_id)
    
    def list_users(self, org_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List users - reads from DB first, falls back to JSON
        
        Args:
            org_id: Optional organization filter
            limit: Max results
            
        Returns:
            List of user dicts
        """
        # 1. Try Database first
        try:
            with get_session() as session:
                stmt = select(User)
                
                if org_id:
                    stmt = stmt.where(User.org_id == uuid.UUID(org_id))
                
                stmt = stmt.limit(limit)
                db_users = session.execute(stmt).scalars().all()
                
                if db_users:
                    print(f"✅ Found {len(db_users)} users in database")
                    return [user.to_dict() for user in db_users]
        except Exception as e:
            print(f"⚠️  Database list failed: {e}")
        
        # 2. Fallback to JSON
        if self.json_storage:
            try:
                json_users = self.json_storage.list_users(org_id=org_id, limit=limit)
                if json_users:
                    print(f"✅ Found {len(json_users)} users in JSON (fallback)")
                    return json_users
            except Exception as e:
                print(f"⚠️  JSON list failed: {e}")
        
        return []
    
    def delete_user(self, user_id: str) -> bool:
        """
        Delete user from both DB and JSON
        
        Args:
            user_id: User UUID
            
        Returns:
            Success boolean
        """
        success = False
        
        # 1. Delete from Database
        try:
            with get_session() as session:
                stmt = select(User).where(User.id == uuid.UUID(user_id))
                db_user = session.execute(stmt).scalar_one_or_none()
                
                if db_user:
                    session.delete(db_user)
                    session.commit()
                    print(f"✅ User {user_id} deleted from database")
                    success = True
        except Exception as e:
            print(f"⚠️  Database delete failed: {e}")
        
        # 2. Delete from JSON
        if self.json_storage:
            try:
                self.json_storage.delete_user(user_id)
                print(f"✅ User {user_id} deleted from JSON")
                success = True
            except Exception as e:
                print(f"⚠️  JSON delete failed: {e}")
        
        return success

