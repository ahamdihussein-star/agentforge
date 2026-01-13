"""
Organization Service - Database Operations for Organizations
"""
import json
import uuid
from typing import Optional, List
from datetime import datetime
from ..base import get_db_session
from ..models.organization import Organization as DBOrganization
from core.security import Organization as CoreOrganization


class OrganizationService:
    """Organization Service - Bridge between API and Database"""
    
    @staticmethod
    def get_all_organizations() -> List[CoreOrganization]:
        """Get all organizations from database"""
        with get_db_session() as session:
            db_orgs = session.query(DBOrganization).all()
            print(f"📊 [DATABASE] Retrieved {len(db_orgs)} organizations from database")
            return [OrganizationService._db_to_core_org(db_org) for db_org in db_orgs]
    
    @staticmethod
    def get_organization_by_id(org_id: str) -> Optional[CoreOrganization]:
        """Get organization by ID"""
        # Convert org_id to UUID if it's "org_default"
        if org_id == "org_default":
            return OrganizationService.get_organization_by_slug("default")
        
        with get_db_session() as session:
            db_org = session.query(DBOrganization).filter_by(id=org_id).first()
            if not db_org:
                return None
            return OrganizationService._db_to_core_org(db_org)
    
    @staticmethod
    def get_organization_by_slug(slug: str) -> Optional[CoreOrganization]:
        """Get organization by slug"""
        with get_db_session() as session:
            db_org = session.query(DBOrganization).filter_by(slug=slug).first()
            if not db_org:
                return None
            return OrganizationService._db_to_core_org(db_org)
    
    @staticmethod
    def save_organization(org: CoreOrganization) -> CoreOrganization:
        """Save organization to database (insert or update)"""
        with get_db_session() as session:
            # Convert org.id to UUID if it's "org_default"
            org_id_uuid = org.id
            if org_id_uuid == "org_default":
                # Try to find existing organization by slug
                existing_org = session.query(DBOrganization).filter_by(slug="default").first()
                if existing_org:
                    org_id_uuid = str(existing_org.id)
                    print(f"🔄 Converting 'org_default' to existing organization UUID: {org_id_uuid[:8]}...")
                else:
                    print(f"⚠️  [DATABASE ERROR] Organization 'org_default' not found, cannot save")
                    raise ValueError("Cannot save organization with id='org_default'. Please use a valid UUID or create the organization first.")
            
            # Ensure org_id is a valid UUID
            try:
                org_id_uuid = str(uuid.UUID(org_id_uuid)) if org_id_uuid else None
            except (ValueError, AttributeError):
                print(f"⚠️  [DATABASE ERROR] Invalid org.id format: {org_id_uuid}")
                raise ValueError(f"Invalid org.id format: {org_id_uuid}")
            
            db_org = session.query(DBOrganization).filter_by(id=org_id_uuid).first()
            if db_org:
                # Update existing
                print(f"💾 [DATABASE] Updating organization in database: {org.name} (ID: {org_id_uuid[:8]}...)")
                db_org.name = org.name
                db_org.slug = org.slug
                db_org.plan = org.settings.get('plan', 'free')
                db_org.settings = json.dumps(org.settings)
                db_org.updated_at = datetime.utcnow()
                print(f"✅ [DATABASE] Organization updated successfully: {org.name}")
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new organization in database: {org.name} (ID: {org_id_uuid[:8]}...)")
                db_org = DBOrganization(
                    id=org_id_uuid,
                    name=org.name,
                    slug=org.slug,
                    plan=org.settings.get('plan', 'free'),
                    settings=json.dumps(org.settings),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(db_org)
                print(f"✅ [DATABASE] Organization created successfully: {org.name}")
            session.commit()
            session.refresh(db_org)
            return OrganizationService._db_to_core_org(db_org)
    
    @staticmethod
    def _db_to_core_org(db_org: DBOrganization) -> CoreOrganization:
        """Convert database Organization to core Organization model"""
        settings = {}
        if db_org.settings:
            if isinstance(db_org.settings, str):
                settings = json.loads(db_org.settings)
            elif isinstance(db_org.settings, dict):
                settings = db_org.settings
        
        # Merge plan into settings
        if db_org.plan:
            settings['plan'] = db_org.plan
        
        return CoreOrganization(
            id=str(db_org.id),
            name=db_org.name,
            slug=db_org.slug,
            domain=None,  # Not in DB model yet
            logo_url=None,  # Not in DB model yet
            settings=settings,
            allowed_auth_providers=[],  # Not in DB model yet
            require_mfa=False,  # Not in DB model yet
            allowed_email_domains=[],  # Not in DB model yet
            google_client_id=None,  # Not in DB model yet
            google_client_secret=None,  # Not in DB model yet
            microsoft_client_id=None,  # Not in DB model yet
            microsoft_client_secret=None,  # Not in DB model yet
            microsoft_tenant_id=None,  # Not in DB model yet
            ldap_config_id=None,  # Not in DB model yet
            max_users=100,  # Not in DB model yet
            max_agents=50,  # Not in DB model yet
            max_tools=100,  # Not in DB model yet
            status="active",  # Not in DB model yet
            created_at=db_org.created_at.isoformat() if db_org.created_at else datetime.utcnow().isoformat(),
            updated_at=db_org.updated_at.isoformat() if db_org.updated_at else datetime.utcnow().isoformat()
        )

