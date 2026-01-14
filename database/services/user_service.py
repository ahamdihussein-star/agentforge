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
                
                
                return [UserService._db_to_core_user(db_user) for db_user in db_users]
        except Exception as e:
            print(f"❌ [DATABASE ERROR] Failed to retrieve users: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def create_user(user: User) -> User:
        """Create new user in database"""
        import uuid as uuid_lib
        with get_db_session() as db:
            # Resolve org_id: convert "org_default" to actual UUID
            org_uuid = None
            if user.org_id:
                if user.org_id == "org_default":
                    # Find default organization by slug
                    from .organization_service import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    default_org = next((o for o in orgs if o.slug == "default"), None)
                    if default_org:
                        try:
                            org_uuid = uuid_lib.UUID(default_org.id)
                        except ValueError:
                            org_uuid = None
                else:
                    try:
                        org_uuid = uuid_lib.UUID(user.org_id)
                    except ValueError:
                        org_uuid = None
            
            # Convert MFA data
            mfa_enabled = user.mfa.enabled if user.mfa else False
            # Import DB MFAMethod which has NONE value
            from ..models.user import MFAMethod as DBMFAMethod
            mfa_method = DBMFAMethod.NONE
            mfa_secret_encrypted = None
            
            if user.mfa and user.mfa.enabled:
                # Get first enabled method (TOTP takes priority)
                if user.mfa.methods:
                    # Convert core MFAMethod to DB MFAMethod
                    core_method = user.mfa.methods[0] if isinstance(user.mfa.methods[0], MFAMethod) else MFAMethod(user.mfa.methods[0])
                    # Map to DB enum
                    if core_method == MFAMethod.TOTP:
                        mfa_method = DBMFAMethod.TOTP
                    elif core_method == MFAMethod.EMAIL:
                        mfa_method = DBMFAMethod.EMAIL
                    elif core_method == MFAMethod.SMS:
                        mfa_method = DBMFAMethod.EMAIL  # Fallback to EMAIL if SMS not in DB enum
                    else:
                        mfa_method = DBMFAMethod.NONE
                elif user.mfa.totp_secret:
                    mfa_method = DBMFAMethod.TOTP
                elif user.mfa.email_code:
                    mfa_method = DBMFAMethod.EMAIL
                
                # Store TOTP secret if available (should be encrypted in production)
                if user.mfa.totp_secret:
                    mfa_secret_encrypted = user.mfa.totp_secret
            
            # Convert Core model to DB model
            db_user = DBUser(
                id=user.id,
                org_id=org_uuid,
                email=user.email.lower(),
                password_hash=user.password_hash,  # Can be None for OAuth users
                # Profile fields
                first_name=user.profile.first_name if user.profile and user.profile.first_name else None,
                last_name=user.profile.last_name if user.profile and user.profile.last_name else None,
                display_name=user.profile.display_name if user.profile and user.profile.display_name else None,
                phone=user.profile.phone if user.profile and user.profile.phone else None,
                job_title=user.profile.job_title if user.profile and user.profile.job_title else None,
                status=user.status.value if hasattr(user.status, 'value') else user.status,
                role_ids=user.role_ids or [],
                department_id=user.department_id,
                group_ids=user.group_ids or [],
                auth_provider=user.auth_provider.value if user.auth_provider else None,
                external_id=user.external_id,
                email_verified=user.email_verified,
                mfa_enabled=mfa_enabled,
                mfa_method=mfa_method,
                mfa_secret_encrypted=mfa_secret_encrypted,
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
    def save_user(user: User) -> User:
        """Save user to database (insert or update) - UPSERT pattern"""
        with get_db_session() as db:
            # First, try to find by ID
            db_user = db.query(DBUser).filter_by(id=user.id).first()
            
            # If not found by ID, try to find by email (for OAuth users with different IDs)
            if not db_user and user.email:
                db_user = db.query(DBUser).filter_by(email=user.email.lower()).first()
                if db_user:
                    # Update the user.id to match the existing database ID
                    print(f"🔄 [DATABASE] Found existing user by email '{user.email}' with different ID. Updating ID from {user.id[:8]}... to {str(db_user.id)[:8]}...")
                    user.id = str(db_user.id)
            
            if db_user:
                # Update existing
                print(f"💾 [DATABASE] Updating user in database: {user.email} (ID: {user.id[:8]}...)")
                result = UserService.update_user(user)
                return result
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new user in database: {user.email} (ID: {user.id[:8]}...)")
                result = UserService.create_user(user)
                return result
    
    @staticmethod
    def update_user(user: User) -> User:
        """Update user in database"""
        import uuid as uuid_lib
        with get_db_session() as db:
            # Find user by ID only (org_id might be string)
            db_user = db.query(DBUser).filter(DBUser.id == user.id).first()
            
            if not db_user:
                raise ValueError(f"User {user.id} not found")
            
            # Resolve org_id: convert "org_default" to actual UUID
            org_uuid = None
            if user.org_id:
                if user.org_id == "org_default":
                    # Find default organization by slug
                    from .organization_service import OrganizationService
                    orgs = OrganizationService.get_all_organizations()
                    default_org = next((o for o in orgs if o.slug == "default"), None)
                    if default_org:
                        try:
                            org_uuid = uuid_lib.UUID(default_org.id)
                        except ValueError:
                            org_uuid = None
                else:
                    try:
                        org_uuid = uuid_lib.UUID(user.org_id)
                    except ValueError:
                        org_uuid = None
            
            # Convert MFA data
            mfa_enabled = user.mfa.enabled if user.mfa else False
            # Import DB MFAMethod which has NONE value
            from ..models.user import MFAMethod as DBMFAMethod
            mfa_method = DBMFAMethod.NONE
            mfa_secret_encrypted = None
            
            if user.mfa and user.mfa.enabled:
                # Get first enabled method (TOTP takes priority)
                if user.mfa.methods:
                    # Convert core MFAMethod to DB MFAMethod
                    core_method = user.mfa.methods[0] if isinstance(user.mfa.methods[0], MFAMethod) else MFAMethod(user.mfa.methods[0])
                    # Map to DB enum
                    if core_method == MFAMethod.TOTP:
                        mfa_method = DBMFAMethod.TOTP
                    elif core_method == MFAMethod.EMAIL:
                        mfa_method = DBMFAMethod.EMAIL
                    elif core_method == MFAMethod.SMS:
                        mfa_method = DBMFAMethod.EMAIL  # Fallback to EMAIL if SMS not in DB enum
                    else:
                        mfa_method = DBMFAMethod.NONE
                elif user.mfa.totp_secret:
                    mfa_method = DBMFAMethod.TOTP
                elif user.mfa.email_code:
                    mfa_method = DBMFAMethod.EMAIL
                
                # Store TOTP secret if available (should be encrypted in production)
                if user.mfa.totp_secret:
                    mfa_secret_encrypted = user.mfa.totp_secret
            
            # Update fields
            db_user.email = user.email.lower()
            if org_uuid:
                db_user.org_id = org_uuid
            if user.password_hash:
                db_user.password_hash = user.password_hash
            
            # Update profile fields
            if user.profile:
                db_user.first_name = user.profile.first_name if user.profile.first_name else db_user.first_name
                db_user.last_name = user.profile.last_name if user.profile.last_name else db_user.last_name
                db_user.display_name = user.profile.display_name if user.profile.display_name else db_user.display_name
                db_user.phone = user.profile.phone if user.profile.phone else db_user.phone
                db_user.job_title = user.profile.job_title if user.profile.job_title else db_user.job_title
            
            db_user.status = user.status.value if hasattr(user.status, 'value') else user.status
            db_user.role_ids = user.role_ids or []
            db_user.department_id = user.department_id
            db_user.group_ids = user.group_ids or []
            db_user.email_verified = user.email_verified
            db_user.mfa_enabled = mfa_enabled
            db_user.mfa_method = mfa_method
            db_user.mfa_secret_encrypted = mfa_secret_encrypted
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
        mfa_enabled_db = hasattr(db_user, 'mfa_enabled') and db_user.mfa_enabled
        mfa_method_db = getattr(db_user, 'mfa_method', None) if hasattr(db_user, 'mfa_method') else None
        
        print(f"   🔍 DEBUG [{db_user.email}] MFA: enabled={mfa_enabled_db}, method={mfa_method_db} (type: {type(mfa_method_db)})")
        
        if mfa_enabled_db:
            if mfa_method_db:
                try:
                    # Convert DB MFA method (enum or string) to MFAMethod
                    # DB enum uses lowercase: "email", "totp", "none"
                    # Core enum uses lowercase: MFAMethod.EMAIL = "email"
                    mfa_method_str = str(mfa_method_db).lower() if mfa_method_db else None
                    
                    # Skip NONE method - if mfa_enabled is True, there should be a valid method
                    if mfa_method_str and mfa_method_str != "none":
                        try:
                            # Try direct conversion (handles both "email" and "EMAIL")
                            mfa_methods = [MFAMethod(mfa_method_str)]
                        except ValueError:
                            # If method string doesn't match enum, try to map it
                            if "email" in mfa_method_str.lower():
                                mfa_methods = [MFAMethod.EMAIL]
                                mfa_methods = [MFAMethod.EMAIL]
                            elif "totp" in mfa_method_str.lower():
                                mfa_methods = [MFAMethod.TOTP]
                            elif "sms" in mfa_method_str.lower():
                                mfa_methods = [MFAMethod.SMS]
                            else:
                                print(f"   ⚠️  [{db_user.email}] Unknown MFA method: {mfa_method_str}, defaulting to EMAIL")
                                mfa_methods = [MFAMethod.EMAIL]
                    else:
                        print(f"   ⚠️  [{db_user.email}] MFA enabled but method is NONE or empty, defaulting to EMAIL")
                        mfa_methods = [MFAMethod.EMAIL]
                except (ValueError, AttributeError) as e:
                    print(f"   ⚠️  [{db_user.email}] Error converting MFA method: {e}")
                    # If mfa_enabled is True but method is invalid, default to EMAIL
                    mfa_methods = [MFAMethod.EMAIL]
            else:
                print(f"   ⚠️  [{db_user.email}] MFA enabled but no method set, defaulting to EMAIL")
                mfa_methods = [MFAMethod.EMAIL]
        else:
            print(f"   ℹ️  [{db_user.email}] MFA disabled")
        
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
        
        # Parse JSON arrays from TEXT columns (may be DOUBLE-ENCODED!)
        # DEBUG: Log the type and value of role_ids
        print(f"   🔍 DEBUG [{db_user.email}] raw role_ids type: {type(db_user.role_ids)}, value: {repr(db_user.role_ids)}")
        
        try:
            # Always ensure role_ids is a list
            if isinstance(db_user.role_ids, str):
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is STRING, parsing (1st attempt)...")
                role_ids = json.loads(db_user.role_ids) if db_user.role_ids else []
                print(f"   🔍 DEBUG [{db_user.email}] After 1st parse: {role_ids} (type: {type(role_ids)})")
                
                # 🔥 CRITICAL FIX: Handle DOUBLE JSON encoding!
                # If the result is STILL a string, parse again!
                if isinstance(role_ids, str):
                    print(f"   🔥 DOUBLE-ENCODED DETECTED! Parsing again...")
                    role_ids = json.loads(role_ids)
                
                # Final sanity check
                if not isinstance(role_ids, list):
                    print(f"   ⚠️  Final role_ids is STILL not a list! type={type(role_ids)}, defaulting to []")
                    role_ids = []
            elif isinstance(db_user.role_ids, list):
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is already a LIST")
                role_ids = db_user.role_ids
            else:
                print(f"   🔍 DEBUG [{db_user.email}] role_ids is NEITHER str nor list!")
                role_ids = []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"   ⚠️  Error parsing role_ids for {db_user.email}: {e}")
            traceback.print_exc()
            role_ids = []
        
        try:
            # Always ensure group_ids is a list (with same double-encoding handling)
            if isinstance(db_user.group_ids, str):
                group_ids = json.loads(db_user.group_ids) if db_user.group_ids else []
                # Handle double JSON encoding
                if isinstance(group_ids, str):
                    group_ids = json.loads(group_ids)
                if not isinstance(group_ids, list):
                    group_ids = []
            elif isinstance(db_user.group_ids, list):
                group_ids = db_user.group_ids
            else:
                group_ids = []
        except (json.JSONDecodeError, TypeError) as e:
            print(f"   ⚠️  Error parsing group_ids for {db_user.email}: {e}")
            traceback.print_exc()
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
    
    @staticmethod
    def delete_user(user_id: str, org_id: str):
        """Delete user from database"""
        with get_db_session() as db:
            db_user = db.query(DBUser).filter_by(id=user_id, org_id=org_id).first()
            if db_user:
                email = db_user.email
                db.delete(db_user)
                db.commit()
                print(f"🗑️  [DATABASE] Deleted user from database: {email} (ID: {user_id[:8]}...)")
            else:
                print(f"⚠️  [DATABASE] User {user_id[:8]}... not found in database for deletion")
