"""
User Service - Database Operations for User Management
Enterprise-grade user authentication and management
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..base import get_db_session
from ..models.user import User as DBUser, UserSession
# Note: UserMFA table not imported - not needed for basic user operations

# Import core models for API compatibility
from core.security import User, Session as CoreSession, UserStatus, MFAMethod, AuthProvider, UserProfile, UserMFA


class UserService:
    """
    User Service - Bridge between API and Database
    Handles all user-related database operations
    """
    
    @staticmethod
    def get_user_by_email(email: str, org_id: str) -> Optional[User]:
        """
        Get user by email and organization
        Returns: Core User model (for API compatibility)
        """
        with get_db_session() as db:
            db_user = db.query(DBUser).filter(
                DBUser.email == email.lower(),
                DBUser.org_id == org_id
            ).first()
            
            if not db_user:
                return None
            
            # Convert DB model to Core model (for API compatibility)
            return UserService._db_to_core_user(db_user)
    
    @staticmethod
    def get_user_by_id(user_id: str, org_id: str) -> Optional[User]:
        """Get user by ID"""
        with get_db_session() as db:
            db_user = db.query(DBUser).filter(
                DBUser.id == user_id,
                DBUser.org_id == org_id
            ).first()
            
            if not db_user:
                return None
            
            return UserService._db_to_core_user(db_user)
    
    @staticmethod
    def get_all_users(org_id: Optional[str] = None) -> List[User]:
        """
        Get all users (optionally filtered by org)
        Returns: List of Core User models
        """
        try:
            with get_db_session() as db:
                query = db.query(DBUser)
                
                if org_id:
                    query = query.filter(DBUser.org_id == org_id)
                
                db_users = query.all()
                
                print(f"🔍 Found {len(db_users)} users in database")
                
                return [UserService._db_to_core_user(db_user) for db_user in db_users]
        except Exception as e:
            print(f"❌ Error in get_all_users: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def create_user(user: User) -> User:
        """Create new user in database"""
        with get_db_session() as db:
            # Convert Core model to DB model
            db_user = DBUser(
                id=user.id,
                org_id=user.org_id,
                email=user.email.lower(),
                password_hash=user.password_hash,
                status=user.status.value if hasattr(user.status, 'value') else user.status,
                role_ids=user.role_ids or [],
                department_id=user.department_id,
                group_ids=user.group_ids or [],
                auth_provider=user.auth_provider.value if user.auth_provider else None,
                external_id=user.external_id,
                email_verified=user.email_verified,
                must_change_password=user.must_change_password,
                failed_login_attempts=user.failed_login_attempts,
                last_login=datetime.fromisoformat(user.last_login) if user.last_login else None,
                last_active=datetime.fromisoformat(user.last_active) if user.last_active else None,
                created_at=datetime.fromisoformat(user.created_at) if user.created_at else datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            return UserService._db_to_core_user(db_user)
    
    @staticmethod
    def update_user(user: User) -> User:
        """Update user in database"""
        with get_db_session() as db:
            db_user = db.query(DBUser).filter(
                DBUser.id == user.id,
                DBUser.org_id == user.org_id
            ).first()
            
            if not db_user:
                raise ValueError(f"User {user.id} not found")
            
            # Update fields
            db_user.email = user.email.lower()
            if user.password_hash:
                db_user.password_hash = user.password_hash
            db_user.status = user.status.value if hasattr(user.status, 'value') else user.status
            db_user.role_ids = user.role_ids or []
            db_user.department_id = user.department_id
            db_user.group_ids = user.group_ids or []
            db_user.email_verified = user.email_verified
            db_user.must_change_password = user.must_change_password
            db_user.failed_login_attempts = user.failed_login_attempts
            
            if user.last_login:
                db_user.last_login = datetime.fromisoformat(user.last_login) if isinstance(user.last_login, str) else user.last_login
            if user.last_active:
                db_user.last_active = datetime.fromisoformat(user.last_active) if isinstance(user.last_active, str) else user.last_active
            
            db_user.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(db_user)
            
            return UserService._db_to_core_user(db_user)
    
    @staticmethod
    def _db_to_core_user(db_user: DBUser) -> User:
        """
        Convert Database User model to Core User model
        Ensures API compatibility
        """
        from core.security import UserProfile, UserMFA
        
        # Convert status string to enum
        try:
            status = UserStatus(db_user.status) if isinstance(db_user.status, str) else db_user.status
        except:
            status = UserStatus.ACTIVE
        
        # Build MFA methods list
        mfa_methods = []
        if hasattr(db_user, 'mfa_enabled') and db_user.mfa_enabled:
            if hasattr(db_user, 'mfa_method') and db_user.mfa_method:
                try:
                    # Convert DB MFA method (enum or string) to MFAMethod
                    if isinstance(db_user.mfa_method, str):
                        mfa_methods = [MFAMethod(db_user.mfa_method)]
                    else:
                        mfa_methods = [db_user.mfa_method]
                except (ValueError, AttributeError):
                    pass  # Skip invalid method
        
        # Type conversions for Pydantic validation
        import json
        
        # Convert UUID to string
        user_id = str(db_user.id) if db_user.id else str(uuid.uuid4())
        org_id = str(db_user.org_id) if db_user.org_id else ""
        department_id = str(db_user.department_id) if db_user.department_id else None
        
        # Convert auth_provider string to AuthProvider enum (required field)
        try:
            auth_provider = AuthProvider(db_user.auth_provider) if db_user.auth_provider else AuthProvider.LOCAL
        except (ValueError, AttributeError):
            auth_provider = AuthProvider.LOCAL  # Default to LOCAL
        
        # Parse JSON arrays from TEXT columns (stored as JSON strings in DB)
        # DEBUG: Log the type and value of role_ids
        print(f"   🔍 DEBUG [{db_user.email}] role_ids type: {type(db_user.role_ids)}, value: {repr(db_user.role_ids)}")
        
        try:
            # Always ensure role_ids is a list
            if isinstance(db_user.role_ids, str):
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is STRING, parsing...")
                role_ids = json.loads(db_user.role_ids) if db_user.role_ids else []
                print(f"   🔍 DEBUG [{db_user.email}] Parsed role_ids: {role_ids} (type: {type(role_ids)})")
            elif isinstance(db_user.role_ids, list):
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is already a LIST")
                role_ids = db_user.role_ids
            else:
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is NEITHER str nor list!")
                role_ids = []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"   ⚠️  Error parsing role_ids for {db_user.email}: {e}")
            role_ids = []
        
        try:
            # Always ensure group_ids is a list
            if isinstance(db_user.group_ids, str):
                group_ids = json.loads(db_user.group_ids) if db_user.group_ids else []
            elif isinstance(db_user.group_ids, list):
                group_ids = db_user.group_ids
            else:
                group_ids = []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"   ⚠️  Error parsing group_ids for {db_user.email}: {e}")
            group_ids = []
        
        return User(
            id=user_id,
            org_id=org_id,
            email=db_user.email,
            password_hash=db_user.password_hash or "",
            status=status,
            role_ids=role_ids,
            department_id=department_id,
            group_ids=group_ids,
            profile=UserProfile(
                first_name=db_user.first_name or "",
                last_name=db_user.last_name or "",
                phone=db_user.phone or "",
                avatar_url=""  # Not in DB model yet
            ),
            mfa=UserMFA(
                enabled=db_user.mfa_enabled if hasattr(db_user, 'mfa_enabled') else False,
                methods=mfa_methods,  # ✅ List of MFAMethods
                totp_secret=db_user.mfa_secret_encrypted if hasattr(db_user, 'mfa_secret_encrypted') else None,
                totp_verified=db_user.mfa_enabled if hasattr(db_user, 'mfa_enabled') else False,
                backup_codes=[]  # Stored in separate MFASetting table
            ),
            auth_provider=auth_provider,  # ✅ AuthProvider enum (required)
            external_id=db_user.external_id,
            email_verified=db_user.email_verified,
            must_change_password=db_user.must_change_password,
            failed_login_attempts=db_user.failed_login_attempts,
            locked_until=None,  # TODO: Extract from status
            last_login=db_user.last_login.isoformat() if db_user.last_login else None,
            last_active=db_user.last_active.isoformat() if db_user.last_active else None,
            created_at=db_user.created_at.isoformat() if db_user.created_at else datetime.utcnow().isoformat(),
            updated_at=db_user.updated_at.isoformat() if db_user.updated_at else datetime.utcnow().isoformat()
        )


class SessionService:
    """
    Session Service - Database Operations for Session Management
    """
    
    @staticmethod
    def create_session(session: CoreSession) -> CoreSession:
        """Create new session in database"""
        with get_db_session() as db:
            db_session = UserSession(
                id=session.id,
                user_id=session.user_id,
                org_id=session.org_id,
                is_active=session.is_active,
                ip_address=session.ip_address,
                user_agent=session.user_agent or "",
                remember_me=session.remember_me,
                last_activity=datetime.fromisoformat(session.last_activity) if session.last_activity else datetime.utcnow(),
                created_at=datetime.fromisoformat(session.created_at) if session.created_at else datetime.utcnow()
            )
            
            db.add(db_session)
            db.commit()
            db.refresh(db_session)
            
            return session
    
    @staticmethod
    def get_session(session_id: str) -> Optional[CoreSession]:
        """Get session by ID"""
        with get_db_session() as db:
            db_session = db.query(UserSession).filter(
                UserSession.id == session_id
            ).first()
            
            if not db_session:
                return None
            
            return CoreSession(
                id=db_session.id,
                user_id=db_session.user_id,
                org_id=db_session.org_id,
                is_active=db_session.is_active,
                ip_address=db_session.ip_address,
                user_agent=db_session.user_agent or "",
                remember_me=db_session.remember_me,
                last_activity=db_session.last_activity.isoformat() if db_session.last_activity else datetime.utcnow().isoformat(),
                created_at=db_session.created_at.isoformat() if db_session.created_at else datetime.utcnow().isoformat()
            )
    
    @staticmethod
    def update_session(session: CoreSession) -> CoreSession:
        """Update session in database"""
        with get_db_session() as db:
            db_session = db.query(UserSession).filter(
                UserSession.id == session.id
            ).first()
            
            if not db_session:
                raise ValueError(f"Session {session.id} not found")
            
            db_session.is_active = session.is_active
            db_session.last_activity = datetime.fromisoformat(session.last_activity) if isinstance(session.last_activity, str) else session.last_activity
            
            db.commit()
            db.refresh(db_session)
            
            return session
    
    @staticmethod
    def deactivate_session(session_id: str):
        """Deactivate session (logout)"""
        with get_db_session() as db:
            db_session = db.query(UserSession).filter(
                UserSession.id == session_id
            ).first()
            
            if db_session:
                db_session.is_active = False
                db_session.expires_at = datetime.utcnow()
                db.commit()
