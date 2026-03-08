"""
Email Settings Service
CRUD operations for centralized email configuration
"""
from typing import Optional
from sqlalchemy.orm import Session
from database.models.email_settings import EmailSettings


class EmailSettingsService:
    """Service for managing organization email settings"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_org(self, org_id: str) -> Optional[EmailSettings]:
        """Get email settings for an organization"""
        return self.db.query(EmailSettings).filter(
            EmailSettings.org_id == org_id
        ).first()
    
    def create(self, org_id: str, **kwargs) -> EmailSettings:
        """Create email settings for an organization"""
        settings = EmailSettings(org_id=org_id, **kwargs)
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings
    
    def update(self, org_id: str, **kwargs) -> Optional[EmailSettings]:
        """Update email settings for an organization"""
        settings = self.get_by_org(org_id)
        if not settings:
            return None
        
        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        self.db.commit()
        self.db.refresh(settings)
        return settings
    
    def delete(self, org_id: str) -> bool:
        """Delete email settings for an organization"""
        settings = self.get_by_org(org_id)
        if not settings:
            return False
        
        self.db.delete(settings)
        self.db.commit()
        return True
    
    def get_or_create_default(self, org_id: str) -> EmailSettings:
        """Get existing settings or create default ones"""
        settings = self.get_by_org(org_id)
        if not settings:
            settings = self.create(
                org_id=org_id,
                provider='smtp',
                from_email='noreply@agentforge.to',
                from_name='AgentForge',
                is_active=False  # Requires configuration
            )
        return settings
