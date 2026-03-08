"""
Settings API Router
Centralized settings management including email notifications
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel, EmailStr

from database.config import get_db
from database.services.email_settings_service import EmailSettingsService
from core.security import EmailService
from api.dependencies import require_auth, User

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class EmailSettingsRequest(BaseModel):
    """Request model for email settings"""
    provider: str  # 'sendgrid', 'smtp', 'ses'
    sendgrid_api_key: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = True
    from_email: EmailStr
    from_name: Optional[str] = "AgentForge"
    reply_to_email: Optional[EmailStr] = None
    is_active: bool = True


class TestEmailRequest(BaseModel):
    """Request model for testing email"""
    to_email: EmailStr
    subject: Optional[str] = "Test Email from AgentForge"
    message: Optional[str] = "This is a test email to verify your email configuration."


# ============================================================================
# EMAIL SETTINGS ENDPOINTS
# ============================================================================

@router.get("/email")
async def get_email_settings(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Get email notification settings for the organization"""
    service = EmailSettingsService(db)
    settings = service.get_by_org(user.org_id)
    
    if not settings:
        return {
            "configured": False,
            "provider": None,
            "from_email": None,
            "is_active": False
        }
    
    # Return settings without sensitive data
    return {
        "configured": True,
        "provider": settings.provider,
        "smtp_host": settings.smtp_host,
        "smtp_port": settings.smtp_port,
        "smtp_user": settings.smtp_user,
        "smtp_use_tls": settings.smtp_use_tls,
        "from_email": settings.from_email,
        "from_name": settings.from_name,
        "reply_to_email": settings.reply_to_email,
        "is_active": settings.is_active,
        "is_verified": settings.is_verified,
        "last_test_sent_at": settings.last_test_sent_at.isoformat() if settings.last_test_sent_at else None,
        "last_test_success": settings.last_test_success,
        "last_error": settings.last_error
    }


@router.post("/email")
async def create_or_update_email_settings(
    request: EmailSettingsRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Create or update email notification settings"""
    service = EmailSettingsService(db)
    existing = service.get_by_org(user.org_id)
    
    settings_data = {
        "provider": request.provider,
        "sendgrid_api_key": request.sendgrid_api_key,
        "smtp_host": request.smtp_host,
        "smtp_port": request.smtp_port,
        "smtp_user": request.smtp_user,
        "smtp_password": request.smtp_password,
        "smtp_use_tls": request.smtp_use_tls,
        "from_email": request.from_email,
        "from_name": request.from_name,
        "reply_to_email": request.reply_to_email,
        "is_active": request.is_active,
        "updated_by": user.id
    }
    
    if existing:
        settings = service.update(user.org_id, **settings_data)
    else:
        settings_data["created_by"] = user.id
        settings = service.create(user.org_id, **settings_data)
    
    return {
        "status": "success",
        "message": "Email settings saved successfully",
        "settings": settings.to_dict()
    }


@router.post("/email/test")
async def test_email_settings(
    request: TestEmailRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Send a test email to verify configuration"""
    service = EmailSettingsService(db)
    settings = service.get_by_org(user.org_id)
    
    if not settings or not settings.is_active:
        raise HTTPException(
            status_code=400,
            detail="Email settings not configured or inactive"
        )
    
    # Build test email HTML
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">✅ Email Test Successful!</h2>
        <p>Hi {user.profile.first_name},</p>
        <p>{request.message}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Provider:</strong> {settings.provider.upper()}</p>
            <p><strong>From:</strong> {settings.from_email}</p>
            <p><strong>Configuration:</strong> Active ✓</p>
        </div>
        <p style="color: #666; font-size: 14px;">If you received this email, your notification system is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
    </div>
    """
    
    # Send test email
    try:
        success = await EmailService.send_email(
            to_email=request.to_email,
            subject=request.subject,
            html_content=html,
            org_id=user.org_id
        )
        
        # Update test status
        service.update(
            user.org_id,
            last_test_success=success,
            last_error=None if success else "Failed to send test email"
        )
        
        if success:
            return {
                "status": "success",
                "message": f"Test email sent successfully to {request.to_email}"
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send test email. Please check your configuration."
            )
    except Exception as e:
        # Update error status
        service.update(
            user.org_id,
            last_test_success=False,
            last_error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Error sending test email: {str(e)}"
        )


@router.delete("/email")
async def delete_email_settings(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """Delete email notification settings"""
    service = EmailSettingsService(db)
    success = service.delete(user.org_id)
    
    if success:
        return {
            "status": "success",
            "message": "Email settings deleted successfully"
        }
    else:
        raise HTTPException(
            status_code=404,
            detail="Email settings not found"
        )
