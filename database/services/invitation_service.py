"""
Invitation Service - Database Operations for Invitations
"""
import json
import uuid
from typing import Optional, List
from datetime import datetime
from ..base import get_db_session
from ..models.invitation import Invitation as DBInvitation
from core.security import Invitation as CoreInvitation


class InvitationService:
    """Invitation Service - Bridge between API and Database"""
    
    @staticmethod
    def get_all_invitations() -> List[CoreInvitation]:
        """Get all invitations from database"""
        with get_db_session() as session:
            db_invitations = session.query(DBInvitation).all()
            return [InvitationService._db_to_core_invitation(db_inv) for db_inv in db_invitations]
    
    @staticmethod
    def get_invitation_by_id(invitation_id: str) -> Optional[CoreInvitation]:
        """Get invitation by ID"""
        with get_db_session() as session:
            db_inv = session.query(DBInvitation).filter_by(id=invitation_id).first()
            if not db_inv:
                return None
            return InvitationService._db_to_core_invitation(db_inv)
    
    @staticmethod
    def get_invitation_by_token(token: str) -> Optional[CoreInvitation]:
        """Get invitation by token"""
        with get_db_session() as session:
            db_inv = session.query(DBInvitation).filter_by(token=token).first()
            if not db_inv:
                return None
            return InvitationService._db_to_core_invitation(db_inv)
    
    @staticmethod
    def save_invitation(invitation: CoreInvitation) -> CoreInvitation:
        """Save invitation to database (insert or update)"""
        with get_db_session() as session:
            # Convert org_id to UUID if it's "org_default"
            org_id_uuid = invitation.org_id
            if org_id_uuid == "org_default":
                from .organization_service import OrganizationService
                default_org = OrganizationService.get_organization_by_slug("default")
                if default_org:
                    org_id_uuid = default_org.id
                else:
                    # Try to get first organization
                    all_orgs = OrganizationService.get_all_organizations()
                    if all_orgs:
                        org_id_uuid = all_orgs[0].id
                    else:
                        print(f"⚠️  [DATABASE ERROR] No organization found for 'org_default', using invitation.org_id as-is")
            
            # Ensure org_id is a valid UUID
            try:
                org_id_uuid = str(uuid.UUID(org_id_uuid)) if org_id_uuid else None
            except (ValueError, AttributeError):
                print(f"⚠️  [DATABASE ERROR] Invalid org_id format: {org_id_uuid}")
                raise ValueError(f"Invalid org_id format: {org_id_uuid}")
            
            # Convert invited_by to UUID if it's a string ID (e.g., "user_super_admin")
            invited_by_uuid = invitation.invited_by
            if invited_by_uuid and not isinstance(invited_by_uuid, uuid.UUID):
                try:
                    # Try to parse as UUID first
                    invited_by_uuid = str(uuid.UUID(invited_by_uuid))
                except (ValueError, AttributeError):
                    # If not a UUID, try to find user by email or other identifier
                    from .user_service import UserService
                    # Try to find user by email if invited_by looks like an email
                    if "@" in str(invited_by_uuid):
                        user = UserService.get_user_by_email(str(invited_by_uuid))
                        if user:
                            invited_by_uuid = user.id
                        else:
                            print(f"⚠️  [DATABASE ERROR] User not found for invited_by: {invited_by_uuid}, setting to None")
                            invited_by_uuid = None
                    else:
                        # Try to find by old string ID (e.g., "user_super_admin")
                        # First, try to find Super Admin user (most common case)
                        if str(invited_by_uuid) == "user_super_admin":
                            all_users = UserService.get_all_users()
                            for user in all_users:
                                # Check if user has Super Admin role
                                if user.role_ids:
                                    from .role_service import RoleService
                                    all_roles = RoleService.get_all_roles()
                                    for role in all_roles:
                                        if role.name == "Super Admin" and role.id in user.role_ids:
                                            invited_by_uuid = user.id
                                            print(f"🔄 Converted 'user_super_admin' to user UUID: {user.id[:8]}...")
                                            break
                                    if invited_by_uuid != invitation.invited_by:
                                        break
                        
                        # If still not found, try all users
                        if invited_by_uuid == invitation.invited_by:
                            all_users = UserService.get_all_users()
                            for user in all_users:
                                if user.id == str(invited_by_uuid) or (hasattr(user, 'old_id') and user.old_id == str(invited_by_uuid)):
                                    invited_by_uuid = user.id
                                    break
                            else:
                                print(f"⚠️  [DATABASE ERROR] User not found for invited_by: {invited_by_uuid}, setting to None")
                                invited_by_uuid = None
            
            # Ensure invited_by is a valid UUID string
            if invited_by_uuid:
                try:
                    invited_by_uuid = str(uuid.UUID(invited_by_uuid))
                except (ValueError, AttributeError):
                    print(f"⚠️  [DATABASE ERROR] Invalid invited_by format: {invited_by_uuid}, setting to None")
                    invited_by_uuid = None
            
            # Convert role_ids from string IDs to UUIDs (e.g., "role_admin" -> UUID)
            role_ids_uuid = []
            if invitation.role_ids:
                from .role_service import RoleService
                all_roles = RoleService.get_all_roles()
                role_name_to_uuid = {role.name.lower(): role.id for role in all_roles}
                
                for role_id in invitation.role_ids:
                    # Check if it's already a UUID
                    try:
                        uuid.UUID(role_id)
                        role_ids_uuid.append(role_id)  # Already a UUID
                    except (ValueError, TypeError):
                        # It's a string ID, try to find by name
                        # Handle common patterns: "role_admin" -> "Admin", "role_super_admin" -> "Super Admin"
                        role_name = str(role_id).replace("role_", "").replace("_", " ").title()
                        # Special case for "Super Admin"
                        if "super admin" in role_name.lower():
                            role_name = "Super Admin"
                        elif "admin" in role_name.lower() and "super" not in role_name.lower():
                            role_name = "Admin"
                        
                        if role_name.lower() in role_name_to_uuid:
                            role_ids_uuid.append(role_name_to_uuid[role_name.lower()])
                            print(f"🔄 Converted role_id '{role_id}' to UUID: {role_name_to_uuid[role_name.lower()][:8]}...")
                        else:
                            print(f"⚠️  [DATABASE ERROR] Role not found for role_id: {role_id} (tried: {role_name}), skipping")
            else:
                role_ids_uuid = []
            
            db_inv = session.query(DBInvitation).filter_by(id=invitation.id).first()
            if db_inv:
                # Update existing
                print(f"💾 [DATABASE] Updating invitation in database: {invitation.email} (ID: {invitation.id[:8]}...)")
                db_inv.org_id = org_id_uuid
                db_inv.email = invitation.email
                db_inv.token = invitation.token
                db_inv.role_ids = json.dumps(role_ids_uuid)
                db_inv.department_id = invitation.department_id
                db_inv.group_ids = json.dumps(invitation.group_ids)
                db_inv.invited_by = invited_by_uuid
                db_inv.message = invitation.message
                db_inv.expires_at = datetime.fromisoformat(invitation.expires_at) if invitation.expires_at else None
                db_inv.accepted_at = datetime.fromisoformat(invitation.accepted_at) if invitation.accepted_at else None
                db_inv.email_sent = invitation.email_sent
                db_inv.email_sent_at = datetime.fromisoformat(invitation.email_sent_at) if invitation.email_sent_at else None
                db_inv.resend_count = invitation.resend_count
                print(f"✅ [DATABASE] Invitation updated successfully: {invitation.email}")
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new invitation in database: {invitation.email} (ID: {invitation.id[:8]}...)")
                db_inv = DBInvitation(
                    id=invitation.id,
                    org_id=org_id_uuid,
                    email=invitation.email,
                    token=invitation.token,
                    role_ids=json.dumps(role_ids_uuid),
                    department_id=invitation.department_id,
                    group_ids=json.dumps(invitation.group_ids),
                    invited_by=invited_by_uuid,
                    message=invitation.message,
                    created_at=datetime.fromisoformat(invitation.created_at) if invitation.created_at else datetime.utcnow(),
                    expires_at=datetime.fromisoformat(invitation.expires_at) if invitation.expires_at else datetime.utcnow(),
                    accepted_at=datetime.fromisoformat(invitation.accepted_at) if invitation.accepted_at else None,
                    email_sent=invitation.email_sent,
                    email_sent_at=datetime.fromisoformat(invitation.email_sent_at) if invitation.email_sent_at else None,
                    resend_count=invitation.resend_count
                )
                session.add(db_inv)
                print(f"✅ [DATABASE] Invitation created successfully: {invitation.email}")
            session.commit()
            session.refresh(db_inv)
            return InvitationService._db_to_core_invitation(db_inv)
    
    @staticmethod
    def delete_invitation(invitation_id: str):
        """Delete invitation from database"""
        with get_db_session() as session:
            db_inv = session.query(DBInvitation).filter_by(id=invitation_id).first()
            if db_inv:
                email = db_inv.email
                session.delete(db_inv)
                session.commit()
                print(f"🗑️  [DATABASE] Deleted invitation from database: {email} (ID: {invitation_id[:8]}...)")
    
    @staticmethod
    def _db_to_core_invitation(db_inv: DBInvitation) -> CoreInvitation:
        """Convert database Invitation to core Invitation model"""
        # Parse JSON arrays
        role_ids = []
        if db_inv.role_ids:
            if isinstance(db_inv.role_ids, str):
                role_ids = json.loads(db_inv.role_ids)
            elif isinstance(db_inv.role_ids, list):
                role_ids = db_inv.role_ids
        
        group_ids = []
        if db_inv.group_ids:
            if isinstance(db_inv.group_ids, str):
                group_ids = json.loads(db_inv.group_ids)
            elif isinstance(db_inv.group_ids, list):
                group_ids = db_inv.group_ids
        
        return CoreInvitation(
            id=str(db_inv.id),
            org_id=str(db_inv.org_id),
            email=db_inv.email,
            token=db_inv.token,
            role_ids=role_ids,
            department_id=str(db_inv.department_id) if db_inv.department_id else None,
            group_ids=group_ids,
            invited_by=str(db_inv.invited_by),
            message=db_inv.message,
            created_at=db_inv.created_at.isoformat() if db_inv.created_at else datetime.utcnow().isoformat(),
            expires_at=db_inv.expires_at.isoformat() if db_inv.expires_at else datetime.utcnow().isoformat(),
            accepted_at=db_inv.accepted_at.isoformat() if db_inv.accepted_at else None,
            email_sent=db_inv.email_sent,
            email_sent_at=db_inv.email_sent_at.isoformat() if db_inv.email_sent_at else None,
            resend_count=db_inv.resend_count
        )

