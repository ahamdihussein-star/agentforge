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
            print(f"📊 [DATABASE] Retrieved {len(db_invitations)} invitations from database")
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
            
            db_inv = session.query(DBInvitation).filter_by(id=invitation.id).first()
            if db_inv:
                # Update existing
                print(f"💾 [DATABASE] Updating invitation in database: {invitation.email} (ID: {invitation.id[:8]}...)")
                db_inv.org_id = org_id_uuid
                db_inv.email = invitation.email
                db_inv.token = invitation.token
                db_inv.role_ids = json.dumps(invitation.role_ids)
                db_inv.department_id = invitation.department_id
                db_inv.group_ids = json.dumps(invitation.group_ids)
                db_inv.invited_by = invitation.invited_by
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
                    role_ids=json.dumps(invitation.role_ids),
                    department_id=invitation.department_id,
                    group_ids=json.dumps(invitation.group_ids),
                    invited_by=invitation.invited_by,
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

