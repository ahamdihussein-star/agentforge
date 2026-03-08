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
from api.security import require_auth, User

router = APIRouter(tags=["settings"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class EmailSettingsRequest(BaseModel):
    """Request model for email settings"""
    provider: str  # 'sendgrid', 'smtp', 'resend'
    sendgrid_api_key: Optional[str] = None
    resend_api_key: Optional[str] = None
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
    
    # Store Resend API key in sendgrid_api_key field (reuse column, provider field distinguishes)
    api_key = request.sendgrid_api_key or request.resend_api_key
    
    settings_data = {
        "provider": request.provider,
        "sendgrid_api_key": api_key,
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
    """Send a test email to verify configuration - sends DIRECTLY using DB settings"""
    service = EmailSettingsService(db)
    settings = service.get_by_org(user.org_id)
    
    if not settings or not settings.is_active:
        raise HTTPException(
            status_code=400,
            detail="Email settings not configured or inactive"
        )
    
    # Get user display name safely
    user_name = "there"
    try:
        user_name = user.profile.first_name or user.email.split("@")[0]
    except Exception:
        pass
    
    # Build test email HTML
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Email Test Successful!</h2>
        <p>Hi {user_name},</p>
        <p>{request.message}</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Provider:</strong> {settings.provider.upper()}</p>
            <p><strong>From:</strong> {settings.from_email}</p>
            <p><strong>Configuration:</strong> Active</p>
        </div>
        <p style="color: #666; font-size: 14px;">If you received this email, your notification system is working correctly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
    </div>
    """
    
    # Send DIRECTLY via SMTP using the settings from DB (bypass _get_settings)
    error_detail = None
    try:
        if settings.provider == 'smtp':
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            smtp_host = settings.smtp_host
            smtp_port = settings.smtp_port or 587
            smtp_user = settings.smtp_user
            smtp_pass = settings.smtp_password
            from_email = settings.from_email
            
            print(f"📧 [TEST] SMTP direct send: host={smtp_host}, port={smtp_port}, user={smtp_user}, from={from_email}")
            
            if not smtp_host or not smtp_user or not smtp_pass:
                raise ValueError(f"SMTP config incomplete: host={bool(smtp_host)}, user={bool(smtp_user)}, pass={bool(smtp_pass)}")
            
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{settings.from_name or 'AgentForge'} <{from_email}>"
            msg["To"] = request.to_email
            msg["Subject"] = request.subject
            msg.attach(MIMEText(request.message, "plain"))
            msg.attach(MIMEText(html, "html"))
            
            # Try configured port first, then fallback to alternative port
            # Cloud providers often block port 587, so fallback to 465 (SSL)
            ports_to_try = [smtp_port]
            if smtp_port == 587:
                ports_to_try.append(465)
            elif smtp_port == 465:
                ports_to_try.append(587)
            
            last_error = None
            for port in ports_to_try:
                try:
                    print(f"📧 [TEST] Trying port {port}...")
                    if port == 465:
                        smtp_client = aiosmtplib.SMTP(hostname=smtp_host, port=port, use_tls=True, timeout=15)
                    else:
                        smtp_client = aiosmtplib.SMTP(hostname=smtp_host, port=port, timeout=15)
                    
                    await smtp_client.connect()
                    print(f"📧 [TEST] Connected on port {port}! Logging in...")
                    await smtp_client.login(smtp_user, smtp_pass)
                    print(f"📧 [TEST] Logged in! Sending...")
                    await smtp_client.send_message(msg)
                    await smtp_client.quit()
                    print(f"✅ [TEST] Email sent to {request.to_email} via port {port}")
                    
                    # Update saved port if fallback worked
                    if port != smtp_port:
                        print(f"📧 [TEST] Updating saved port from {smtp_port} to {port}")
                        service.update(user.org_id, smtp_port=port)
                    
                    last_error = None
                    break
                except Exception as port_err:
                    last_error = port_err
                    print(f"❌ [TEST] Port {port} failed: {port_err}")
                    continue
            
            if last_error:
                raise last_error
            
            print(f"✅ [TEST] Email sent successfully")
            
            # Update test status
            service.update(user.org_id, last_test_success=True, last_error=None)
            
            return {
                "status": "success",
                "message": f"Test email sent successfully to {request.to_email}"
            }
        
        elif settings.provider == 'resend':
            import httpx
            
            api_key = settings.sendgrid_api_key  # Resend key stored in this field
            from_email = settings.from_email
            from_name = settings.from_name or 'AgentForge'
            
            print(f"📧 [TEST] Resend API send: from={from_name} <{from_email}>, to={request.to_email}")
            
            if not api_key:
                raise ValueError("Resend API key not configured")
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "from": f"{from_name} <{from_email}>",
                        "to": [request.to_email],
                        "subject": request.subject,
                        "html": html,
                        "text": request.message
                    },
                    timeout=30
                )
            
            print(f"📧 [TEST] Resend response: {resp.status_code} {resp.text}")
            
            if resp.status_code in (200, 201):
                service.update(user.org_id, last_test_success=True, last_error=None)
                return {"status": "success", "message": f"Test email sent to {request.to_email}"}
            else:
                friendly_error = "Email provider rejected the request. Please check your configuration."
                try:
                    data = resp.json() if resp.text else {}
                    msg = (data or {}).get("message") or ""
                    if resp.status_code == 403 and "domain" in msg.lower() and "not verified" in msg.lower():
                        friendly_error = (
                            "Your email domain is not verified in Resend yet. "
                            "Please open Resend → Domains, add 'agentforge.to', then add the DNS records and wait for verification."
                        )
                    elif msg:
                        friendly_error = msg
                except Exception:
                    pass

                raise ValueError(friendly_error)
        
        elif settings.provider == 'sendgrid':
            success = await EmailService.send_email(
                to_email=request.to_email,
                subject=request.subject,
                html_content=html,
                org_id=user.org_id
            )
            if success:
                service.update(user.org_id, last_test_success=True, last_error=None)
                return {"status": "success", "message": f"Test email sent to {request.to_email}"}
            else:
                error_detail = "SendGrid send returned False"
                raise ValueError(error_detail)
        else:
            error_detail = f"Unsupported provider: {settings.provider}"
            raise ValueError(error_detail)
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e) or "Email sending failed"
        print(f"❌ [TEST] Failed: {error_msg}")
        
        # Update error status
        try:
            service.update(user.org_id, last_test_success=False, last_error=error_msg)
        except Exception:
            pass
        
        user_msg = error_msg
        if 'Timed out' in error_msg:
            user_msg = "Could not connect to the email server. This hosting provider may block SMTP. Please use Resend (recommended for cloud)."
        if 'not verified' in error_msg.lower() and 'domain' in error_msg.lower():
            user_msg = (
                "Your email domain is not verified yet. "
                "In Resend, add the domain and complete the DNS verification, then try again."
            )
        raise HTTPException(
            status_code=500,
            detail=user_msg
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
