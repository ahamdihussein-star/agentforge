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
        try:
            with get_db_session() as session:
                db_orgs = session.query(DBOrganization).all()
                return [OrganizationService._db_to_core_org(db_org) for db_org in db_orgs]
        except Exception as e:
            error_msg = str(e)
            if "does not exist" in error_msg or "UndefinedColumn" in error_msg:
                print(f"❌ [DATABASE ERROR] Missing columns in organizations table: {e}")
                print("   💡 This usually means add_organization_oauth_columns.py hasn't run yet")
                print("   💡 The script should run automatically on deployment")
                raise
            raise
    
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
        try:
            with get_db_session() as session:
                db_org = session.query(DBOrganization).filter_by(slug=slug).first()
                if not db_org:
                    return None
                return OrganizationService._db_to_core_org(db_org)
        except Exception as e:
            error_msg = str(e)
            if "does not exist" in error_msg or "UndefinedColumn" in error_msg:
                print(f"❌ [DATABASE ERROR] Missing columns in organizations table: {e}")
                print("   💡 This usually means add_organization_oauth_columns.py hasn't run yet")
                raise
            raise
    
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
                db_org.name = org.name
                db_org.slug = org.slug
                db_org.plan = org.settings.get('plan', 'free')
                db_org.settings = json.dumps(org.settings)
                
                # Auth settings
                db_org.allowed_auth_providers = json.dumps([p.value if hasattr(p, 'value') else str(p) for p in org.allowed_auth_providers]) if org.allowed_auth_providers else json.dumps([])
                db_org.require_mfa = "true" if org.require_mfa else "false"
                db_org.allowed_email_domains = json.dumps(org.allowed_email_domains) if org.allowed_email_domains else json.dumps([])
                
                # OAuth credentials
                db_org.google_client_id = org.google_client_id
                db_org.google_client_secret = org.google_client_secret
                db_org.microsoft_client_id = org.microsoft_client_id
                db_org.microsoft_client_secret = org.microsoft_client_secret
                db_org.microsoft_tenant_id = org.microsoft_tenant_id
                
                # LDAP
                db_org.ldap_config_id = org.ldap_config_id
                
                # Limits
                db_org.max_users = str(org.max_users) if org.max_users else "100"
                db_org.max_agents = str(org.max_agents) if org.max_agents else "50"
                db_org.max_tools = str(org.max_tools) if org.max_tools else "100"
                
                # Status & Branding
                db_org.status = org.status if hasattr(org, 'status') else "active"
                db_org.domain = org.domain
                db_org.logo_url = org.logo_url
                
                db_org.updated_at = datetime.utcnow()
            else:
                # Create new
                print(f"💾 [DATABASE] Creating new organization in database: {org.name} (ID: {org_id_uuid[:8]}...)")
                db_org = DBOrganization(
                    id=org_id_uuid,
                    name=org.name,
                    slug=org.slug,
                    plan=org.settings.get('plan', 'free'),
                    settings=json.dumps(org.settings),
                    # Auth settings
                    allowed_auth_providers=json.dumps([p.value if hasattr(p, 'value') else str(p) for p in org.allowed_auth_providers]) if org.allowed_auth_providers else json.dumps([]),
                    require_mfa="true" if org.require_mfa else "false",
                    allowed_email_domains=json.dumps(org.allowed_email_domains) if org.allowed_email_domains else json.dumps([]),
                    # OAuth credentials
                    google_client_id=org.google_client_id,
                    google_client_secret=org.google_client_secret,
                    microsoft_client_id=org.microsoft_client_id,
                    microsoft_client_secret=org.microsoft_client_secret,
                    microsoft_tenant_id=org.microsoft_tenant_id,
                    # LDAP
                    ldap_config_id=org.ldap_config_id,
                    # Limits
                    max_users=str(org.max_users) if org.max_users else "100",
                    max_agents=str(org.max_agents) if org.max_agents else "50",
                    max_tools=str(org.max_tools) if org.max_tools else "100",
                    # Status & Branding
                    status=org.status if hasattr(org, 'status') else "active",
                    domain=org.domain,
                    logo_url=org.logo_url,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(db_org)
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
        
        # Parse allowed_auth_providers
        allowed_auth_providers = []
        if db_org.allowed_auth_providers:
            if isinstance(db_org.allowed_auth_providers, str):
                try:
                    providers_list = json.loads(db_org.allowed_auth_providers)
                    from core.security import AuthProvider
                    allowed_auth_providers = [AuthProvider(p) if isinstance(p, str) else p for p in providers_list]
                except (json.JSONDecodeError, ValueError):
                    allowed_auth_providers = []
            elif isinstance(db_org.allowed_auth_providers, list):
                from core.security import AuthProvider
                allowed_auth_providers = [AuthProvider(p) if isinstance(p, str) else p for p in db_org.allowed_auth_providers]
        
        # Parse allowed_email_domains
        allowed_email_domains = []
        if db_org.allowed_email_domains:
            if isinstance(db_org.allowed_email_domains, str):
                try:
                    allowed_email_domains = json.loads(db_org.allowed_email_domains)
                except json.JSONDecodeError:
                    allowed_email_domains = []
            elif isinstance(db_org.allowed_email_domains, list):
                allowed_email_domains = db_org.allowed_email_domains
        
        # Parse require_mfa
        require_mfa = False
        if db_org.require_mfa:
            require_mfa = str(db_org.require_mfa).lower() in ("true", "1", "yes")
        
        return CoreOrganization(
            id=str(db_org.id),
            name=db_org.name,
            slug=db_org.slug,
            domain=db_org.domain,
            logo_url=db_org.logo_url,
            settings=settings,
            allowed_auth_providers=allowed_auth_providers,
            require_mfa=require_mfa,
            allowed_email_domains=allowed_email_domains,
            google_client_id=db_org.google_client_id,
            google_client_secret=db_org.google_client_secret,
            microsoft_client_id=db_org.microsoft_client_id,
            microsoft_client_secret=db_org.microsoft_client_secret,
            microsoft_tenant_id=db_org.microsoft_tenant_id,
            ldap_config_id=str(db_org.ldap_config_id) if db_org.ldap_config_id else None,
            max_users=int(db_org.max_users) if db_org.max_users and str(db_org.max_users).isdigit() else 100,
            max_agents=int(db_org.max_agents) if db_org.max_agents and str(db_org.max_agents).isdigit() else 50,
            max_tools=int(db_org.max_tools) if db_org.max_tools and str(db_org.max_tools).isdigit() else 100,
            status=db_org.status if db_org.status else "active",
            created_at=db_org.created_at.isoformat() if db_org.created_at else datetime.utcnow().isoformat(),
            updated_at=db_org.updated_at.isoformat() if db_org.updated_at else datetime.utcnow().isoformat()
        )

