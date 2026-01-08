"""
AgentForge Security Services - Complete Enterprise Implementation
================================================================
All security services including:
- PasswordService: Hashing, validation, history
- MFAService: TOTP, SMS, Email, Backup codes
- TokenService: JWT-like tokens
- EmailService: Verification, reset, invitation emails
- LDAPService: LDAP/AD authentication and sync
- OAuthService: Google, Microsoft OAuth
"""

import os
import json
import hashlib
import secrets
import base64
import hmac
import time
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from urllib.parse import urlencode, quote

# Optional imports with fallbacks
try:
    import pyotp
    PYOTP_AVAILABLE = True
except ImportError:
    PYOTP_AVAILABLE = False
    print("⚠️ pyotp not installed. TOTP MFA will not work.")

try:
    import qrcode
    import io
    QRCODE_AVAILABLE = True
except ImportError:
    QRCODE_AVAILABLE = False
    print("⚠️ qrcode not installed. QR code generation will not work.")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("⚠️ httpx not installed. OAuth will not work.")

try:
    from ldap3 import Server, Connection, ALL, SUBTREE
    LDAP_AVAILABLE = True
except ImportError:
    LDAP_AVAILABLE = False
    print("⚠️ ldap3 not installed. LDAP authentication will not work.")


class PasswordService:
    """Password hashing, validation, and management"""
    
    # Common weak passwords to reject
    COMMON_PASSWORDS = {
        'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
        'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'login',
        'password1', 'password!', 'p@ssword', 'p@ssw0rd', 'Password1', 'Password1!'
    }
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using PBKDF2-SHA256 with random salt"""
        salt = secrets.token_hex(32)
        iterations = 100000
        hash_bytes = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        )
        return f"{salt}${iterations}${hash_bytes.hex()}"
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        try:
            parts = password_hash.split('$')
            if len(parts) == 2:
                # Old format without iterations
                salt, hash_hex = parts
                iterations = 100000
            else:
                salt, iterations, hash_hex = parts
                iterations = int(iterations)
            
            hash_bytes = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode('utf-8'),
                salt.encode('utf-8'),
                iterations
            )
            return hmac.compare_digest(hash_bytes.hex(), hash_hex)
        except Exception:
            return False
    
    @staticmethod
    def validate_password(password: str, settings) -> Tuple[bool, List[str]]:
        """Validate password meets strength requirements based on settings"""
        errors = []
        
        # Length checks
        if len(password) < settings.password_min_length:
            errors.append(f"Password must be at least {settings.password_min_length} characters long")
        if len(password) > settings.password_max_length:
            errors.append(f"Password must not exceed {settings.password_max_length} characters")
        
        # Complexity checks
        if settings.password_require_uppercase and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        if settings.password_require_lowercase and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        if settings.password_require_numbers and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        if settings.password_require_symbols and not re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;\'`~]', password):
            errors.append("Password must contain at least one special character")
        
        # Common password check
        if password.lower() in PasswordService.COMMON_PASSWORDS:
            errors.append("Password is too common. Please choose a stronger password")
        
        # Sequential/repeated character check
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password cannot contain 3 or more repeated characters")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def is_password_in_history(password: str, user) -> bool:
        """Check if password was used before"""
        if not hasattr(user, 'password_history') or not user.password_history:
            return False
        
        for old_hash in user.password_history:
            if PasswordService.verify_password(password, old_hash):
                return True
        return False
    
    @staticmethod
    def generate_temp_password(length: int = 16) -> str:
        """Generate a secure temporary password"""
        chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*"
        password = ''.join(secrets.choice(chars) for _ in range(length))
        
        # Ensure it meets basic requirements
        if not re.search(r'[A-Z]', password):
            password = password[:-1] + secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ')
        if not re.search(r'[a-z]', password):
            password = password[:-2] + secrets.choice('abcdefghijkmnopqrstuvwxyz') + password[-1]
        if not re.search(r'\d', password):
            password = password[:-3] + secrets.choice('23456789') + password[-2:]
        if not re.search(r'[!@#$%^&*]', password):
            password = password[:-4] + secrets.choice('!@#$%^&*') + password[-3:]
        
        return password
    
    @staticmethod
    def get_password_strength(password: str) -> Dict[str, Any]:
        """Calculate password strength score"""
        score = 0
        feedback = []
        
        # Length scoring
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        # Character type scoring
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;\'`~]', password):
            score += 1
        
        # Penalty for patterns
        if re.search(r'(.)\1{2,}', password):
            score -= 1
            feedback.append("Avoid repeated characters")
        if re.search(r'(012|123|234|345|456|567|678|789|abc|bcd|cde)', password.lower()):
            score -= 1
            feedback.append("Avoid sequential characters")
        
        # Determine strength level
        if score <= 2:
            strength = "weak"
        elif score <= 4:
            strength = "fair"
        elif score <= 6:
            strength = "good"
        else:
            strength = "strong"
        
        return {
            "score": max(0, min(score, 7)),
            "max_score": 7,
            "strength": strength,
            "feedback": feedback
        }


class MFAService:
    """Multi-Factor Authentication service"""
    
    ISSUER = os.environ.get("MFA_ISSUER", "AgentForge")
    
    @staticmethod
    def generate_totp_secret() -> str:
        """Generate a new TOTP secret"""
        if not PYOTP_AVAILABLE:
            raise RuntimeError("pyotp is not installed. Run: pip install pyotp")
        return pyotp.random_base32()
    
    @staticmethod
    def get_totp_uri(secret: str, email: str, issuer: str = None) -> str:
        """Get TOTP provisioning URI for QR code"""
        if not PYOTP_AVAILABLE:
            raise RuntimeError("pyotp is not installed")
        issuer = issuer or MFAService.ISSUER
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)
    
    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        """Verify a TOTP code"""
        if not PYOTP_AVAILABLE:
            return False
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(code, valid_window=1)  # Allow 1 step tolerance (30 seconds)
        except Exception:
            return False
    
    @staticmethod
    def generate_qr_code(uri: str) -> Optional[str]:
        """Generate QR code as base64 PNG"""
        if not QRCODE_AVAILABLE:
            return None
        try:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(uri)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            return base64.b64encode(buffer.getvalue()).decode()
        except Exception:
            return None
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> List[str]:
        """Generate backup codes"""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    @staticmethod
    def verify_backup_code(code: str, user) -> bool:
        """Verify and consume a backup code"""
        code_upper = code.upper().replace('-', '').replace(' ', '')
        
        for i, hashed_code in enumerate(user.mfa.backup_codes):
            if PasswordService.verify_password(code_upper, hashed_code):
                # Remove used code
                user.mfa.backup_codes.pop(i)
                return True
        return False
    
    @staticmethod
    def generate_email_code() -> str:
        """Generate a 6-digit email verification code"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    @staticmethod
    def generate_sms_code() -> str:
        """Generate a 6-digit SMS verification code"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    @staticmethod
    def verify_code(user, code: str) -> bool:
        """Verify any MFA code (TOTP, backup, email, SMS)"""
        code_clean = code.strip().replace('-', '').replace(' ', '')
        
        # Try TOTP first
        if user.mfa.totp_secret and user.mfa.totp_verified:
            if MFAService.verify_totp(user.mfa.totp_secret, code_clean):
                return True
        
        # Try backup code
        if user.mfa.backup_codes:
            if MFAService.verify_backup_code(code_clean, user):
                return True
        
        # Try email code
        if user.mfa.email_code:
            if user.mfa.email_code == code_clean:
                if user.mfa.email_code_expires:
                    if datetime.fromisoformat(user.mfa.email_code_expires) > datetime.utcnow():
                        user.mfa.email_code = None
                        return True
        
        # Try SMS code
        if user.mfa.sms_code:
            if user.mfa.sms_code == code_clean:
                if user.mfa.sms_code_expires:
                    if datetime.fromisoformat(user.mfa.sms_code_expires) > datetime.utcnow():
                        user.mfa.sms_code = None
                        return True
        
        return False


class TokenService:
    """JWT-like token service for authentication"""
    
    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", secrets.token_hex(32))
    ACCESS_TOKEN_EXPIRE_HOURS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_HOURS", "24"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    
    @classmethod
    def create_access_token(cls, user_id: str, org_id: str, session_id: str, extra_claims: Dict = None) -> str:
        """Create an access token"""
        payload = {
            "user_id": user_id,
            "org_id": org_id,
            "session_id": session_id,
            "type": "access",
            "iat": int(time.time()),
            "exp": int(time.time()) + (cls.ACCESS_TOKEN_EXPIRE_HOURS * 3600)
        }
        if extra_claims:
            payload.update(extra_claims)
        
        return cls._encode_token(payload)
    
    @classmethod
    def create_refresh_token(cls, user_id: str, session_id: str) -> str:
        """Create a refresh token"""
        payload = {
            "user_id": user_id,
            "session_id": session_id,
            "type": "refresh",
            "iat": int(time.time()),
            "exp": int(time.time()) + (cls.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
        }
        return cls._encode_token(payload)
    
    @classmethod
    def create_api_key(cls, user_id: str, org_id: str, name: str, expiry_days: int = 365) -> str:
        """Create an API key"""
        payload = {
            "user_id": user_id,
            "org_id": org_id,
            "name": name,
            "type": "api_key",
            "iat": int(time.time()),
            "exp": int(time.time()) + (expiry_days * 86400)
        }
        return cls._encode_token(payload)
    
    @classmethod
    def verify_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a token"""
        try:
            parts = token.rsplit('.', 1)
            if len(parts) != 2:
                return None
            
            payload_b64, signature = parts
            expected_signature = hmac.new(
                cls.SECRET_KEY.encode(),
                payload_b64.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return None
            
            # Handle padding
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += '=' * padding
            
            payload_json = base64.urlsafe_b64decode(payload_b64.encode()).decode()
            payload = json.loads(payload_json)
            
            # Check expiration
            if payload.get('exp', 0) < time.time():
                return None
            
            return payload
        except Exception:
            return None
    
    @classmethod
    def _encode_token(cls, payload: Dict) -> str:
        """Encode payload into a token"""
        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
        signature = hmac.new(
            cls.SECRET_KEY.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()
        return f"{payload_b64}.{signature}"
    
    @classmethod
    def get_token_expiry(cls, token_type: str = "access") -> str:
        """Get expiry datetime for a token type"""
        if token_type == "refresh":
            delta = timedelta(days=cls.REFRESH_TOKEN_EXPIRE_DAYS)
        elif token_type == "api_key":
            delta = timedelta(days=365)
        else:
            delta = timedelta(hours=cls.ACCESS_TOKEN_EXPIRE_HOURS)
        return (datetime.utcnow() + delta).isoformat()


class EmailService:
    """Email service for sending security-related emails"""
    
    # Get settings from environment
    SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
    FROM_EMAIL = os.environ.get("EMAIL_FROM", "notifications@agentforge.to")
    FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "AgentForge")
    BASE_URL = os.environ.get("BASE_URL", "http://localhost:8001")
    
    @classmethod
    async def send_email(cls, to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
        """Send an email using SendGrid"""
        if not cls.SENDGRID_API_KEY:
            print(f"⚠️ SendGrid not configured. Email to {to_email} not sent.")
            print(f"   Subject: {subject}")
            return False
        
        if not HTTPX_AVAILABLE:
            print("⚠️ httpx not installed. Cannot send email.")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {cls.SENDGRID_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": cls.FROM_EMAIL, "name": cls.FROM_NAME},
                        "subject": subject,
                        "content": [
                            {"type": "text/plain", "value": text_content or html_content},
                            {"type": "text/html", "value": html_content}
                        ]
                    }
                )
                success = response.status_code in [200, 201, 202]
                if success:
                    print(f"✅ Email sent to {to_email}")
                else:
                    print(f"❌ SendGrid error {response.status_code}: {response.text}")
                return success
        except Exception as e:
            print(f"❌ Error sending email: {e}")
            return False
    
    @classmethod
    async def send_verification_email(cls, user) -> bool:
        """Send email verification"""
        verify_url = f"{cls.BASE_URL}/ui/#verify-email?token={user.verification_token}"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Welcome to AgentForge! 🚀</h2>
            <p>Hi {user.profile.first_name},</p>
            <p>Please verify your email address by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy this link: {verify_url}</p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        return await cls.send_email(user.email, "Verify your AgentForge email", html)
    
    @classmethod
    async def send_password_reset_email(cls, user, token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{cls.BASE_URL}/ui/#reset-password?token={token}"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Reset Your Password 🔐</h2>
            <p>Hi {user.profile.first_name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy this link: {reset_url}</p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        return await cls.send_email(user.email, "Reset your AgentForge password", html)
    
    @classmethod
    async def send_welcome_email(cls, user, temp_password: str) -> bool:
        """Send welcome email with temporary password"""
        login_url = f"{cls.BASE_URL}/ui/#login"
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Welcome to AgentForge! 🎉</h2>
            <p>Hi {user.profile.first_name},</p>
            <p>An account has been created for you. Here are your login credentials:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #e0e0e0; padding: 4px 8px; border-radius: 4px;">{temp_password}</code></p>
            </div>
            <p style="color: #e53e3e; font-weight: bold;">⚠️ You will be required to change your password on first login.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{login_url}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Login to AgentForge
                </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        return await cls.send_email(user.email, "Welcome to AgentForge - Your account is ready!", html)
    
    @classmethod
    async def send_invitation_email(cls, invitation, inviter) -> bool:
        """Send invitation email"""
        accept_url = f"{cls.BASE_URL}/ui/#register?token={invitation.token}"
        inviter_name = inviter if isinstance(inviter, str) else (inviter.get_display_name() if hasattr(inviter, 'get_display_name') else inviter.email)
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">You're Invited to AgentForge! 🚀</h2>
            <p>Hi there,</p>
            <p><strong>{inviter_name}</strong> has invited you to join AgentForge - the AI Agent Builder Platform.</p>
            {f'<p style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-style: italic;">"{invitation.message}"</p>' if invitation.message else ''}
            <p style="text-align: center; margin: 30px 0;">
                <a href="{accept_url}" style="background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Accept Invitation
                </a>
            </p>
            <p style="color: #666; font-size: 14px;">Or copy this link: {accept_url}</p>
            <p style="color: #666; font-size: 14px;">This invitation expires on {invitation.expires_at[:10]}.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        sent = await cls.send_email(invitation.email, f"You're invited to join AgentForge by {inviter_name}", html)
        if sent:
            invitation.email_sent = True
            invitation.email_sent_at = datetime.utcnow().isoformat()
        return sent
    
    @classmethod
    async def send_mfa_code(cls, user, code: str) -> bool:
        """Send MFA verification code"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Your Verification Code 🔐</h2>
            <p>Hi {user.profile.first_name},</p>
            <p>Your verification code is:</p>
            <p style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f5f5f5; padding: 15px 30px; border-radius: 8px;">
                    {code}
                </span>
            </p>
            <p style="color: #666; font-size: 14px; text-align: center;">This code expires in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please secure your account immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        return await cls.send_email(user.email, f"Your AgentForge verification code: {code}", html)
    
    @classmethod
    async def send_login_notification(cls, user, ip_address: str, user_agent: str) -> bool:
        """Send notification of new login"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">New Login Detected 🔔</h2>
            <p>Hi {user.profile.first_name},</p>
            <p>A new login was detected on your AgentForge account:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                <p><strong>IP Address:</strong> {ip_address}</p>
                <p><strong>Device:</strong> {user_agent[:100] if user_agent else 'Unknown'}</p>
            </div>
            <p style="color: #666; font-size: 14px;">If this was you, you can ignore this email.</p>
            <p style="color: #e53e3e; font-size: 14px;">If this wasn't you, please change your password immediately and enable MFA.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">AgentForge - AI Agent Builder Platform</p>
        </div>
        """
        
        return await cls.send_email(user.email, "New login to your AgentForge account", html)


class LDAPService:
    """LDAP/Active Directory authentication and sync service"""
    
    @staticmethod
    async def test_connection(config) -> Tuple[bool, str]:
        """Test LDAP connection"""
        if not LDAP_AVAILABLE:
            return False, "ldap3 library not installed. Run: pip install ldap3"
        
        try:
            server = Server(config.server_url, get_info=ALL, connect_timeout=config.connection_timeout)
            conn = Connection(
                server,
                user=config.bind_dn,
                password=config.bind_password,
                auto_bind=True
            )
            
            if config.use_tls and not config.use_ssl:
                conn.start_tls()
            
            # Test search
            search_base = config.user_search_base or config.base_dn
            conn.search(search_base, '(objectClass=*)', attributes=['cn'], size_limit=1)
            
            conn.unbind()
            return True, "Connection successful"
        except Exception as e:
            return False, str(e)
    
    @staticmethod
    async def authenticate_user(config, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user against LDAP"""
        if not LDAP_AVAILABLE:
            return None
        
        try:
            server = Server(config.server_url, get_info=ALL)
            
            # First bind with service account to find user
            conn = Connection(server, user=config.bind_dn, password=config.bind_password, auto_bind=True)
            
            if config.use_tls and not config.use_ssl:
                conn.start_tls()
            
            # Search for user
            search_base = config.user_search_base or config.base_dn
            search_filter = config.user_search_filter.replace('{username}', username)
            
            conn.search(
                search_base,
                search_filter,
                search_scope=SUBTREE,
                attributes=list(config.attribute_mapping.values())
            )
            
            if not conn.entries:
                conn.unbind()
                return None
            
            user_entry = conn.entries[0]
            user_dn = user_entry.entry_dn
            
            conn.unbind()
            
            # Authenticate with user's credentials
            user_conn = Connection(server, user=user_dn, password=password)
            if not user_conn.bind():
                return None
            
            user_conn.unbind()
            
            # Map attributes
            user_info = {"dn": user_dn}
            for our_field, ldap_attr in config.attribute_mapping.items():
                if hasattr(user_entry, ldap_attr):
                    value = getattr(user_entry, ldap_attr)
                    if value:
                        user_info[our_field] = str(value.value) if hasattr(value, 'value') else str(value)
            
            return user_info
            
        except Exception as e:
            print(f"LDAP auth error: {e}")
            return None
    
    @staticmethod
    async def sync_users(config, security_state) -> Dict[str, Any]:
        """Sync users from LDAP"""
        if not LDAP_AVAILABLE:
            return {"success": False, "error": "ldap3 not installed"}
        
        result = {"synced": 0, "created": 0, "updated": 0, "errors": []}
        
        try:
            server = Server(config.server_url, get_info=ALL)
            conn = Connection(server, user=config.bind_dn, password=config.bind_password, auto_bind=True)
            
            if config.use_tls and not config.use_ssl:
                conn.start_tls()
            
            # Search all users
            search_base = config.user_search_base or config.base_dn
            search_filter = f"(objectClass={config.user_object_class})"
            
            conn.search(
                search_base,
                search_filter,
                search_scope=SUBTREE,
                attributes=list(config.attribute_mapping.values()) + ['memberOf']
            )
            
            from .models import User, UserProfile, UserStatus, AuthProvider
            
            for entry in conn.entries:
                try:
                    # Map attributes
                    user_data = {"dn": entry.entry_dn}
                    for our_field, ldap_attr in config.attribute_mapping.items():
                        if hasattr(entry, ldap_attr):
                            value = getattr(entry, ldap_attr)
                            if value:
                                user_data[our_field] = str(value.value) if hasattr(value, 'value') else str(value)
                    
                    if 'email' not in user_data:
                        continue
                    
                    # Find or create user
                    existing_user = security_state.get_user_by_email(user_data['email'], config.org_id)
                    
                    # Determine roles from group membership
                    role_ids = [config.default_role_id]
                    if hasattr(entry, 'memberOf') and config.group_role_mapping:
                        for group_dn in entry.memberOf:
                            group_str = str(group_dn.value) if hasattr(group_dn, 'value') else str(group_dn)
                            if group_str in config.group_role_mapping:
                                role_id = config.group_role_mapping[group_str]
                                if role_id not in role_ids:
                                    role_ids.append(role_id)
                    
                    if existing_user:
                        if config.sync_update_existing:
                            # Update existing user
                            if user_data.get('first_name'):
                                existing_user.profile.first_name = user_data['first_name']
                            if user_data.get('last_name'):
                                existing_user.profile.last_name = user_data['last_name']
                            if user_data.get('phone'):
                                existing_user.profile.phone = user_data['phone']
                            if user_data.get('job_title'):
                                existing_user.profile.job_title = user_data['job_title']
                            existing_user.role_ids = role_ids
                            existing_user.external_id = entry.entry_dn
                            result['updated'] += 1
                    else:
                        # Create new user
                        new_user = User(
                            org_id=config.org_id,
                            email=user_data['email'].lower(),
                            auth_provider=AuthProvider.LDAP,
                            external_id=entry.entry_dn,
                            profile=UserProfile(
                                first_name=user_data.get('first_name', ''),
                                last_name=user_data.get('last_name', ''),
                                phone=user_data.get('phone'),
                                job_title=user_data.get('job_title')
                            ),
                            role_ids=role_ids,
                            status=UserStatus.ACTIVE,
                            email_verified=True
                        )
                        security_state.users[new_user.id] = new_user
                        result['created'] += 1
                    
                    result['synced'] += 1
                    
                except Exception as e:
                    result['errors'].append(f"Error syncing {entry.entry_dn}: {str(e)}")
            
            conn.unbind()
            
            # Update sync status
            config.last_sync = datetime.utcnow().isoformat()
            config.last_sync_status = "success"
            config.last_sync_users_synced = result['synced']
            
            security_state.save_to_disk()
            
            result['success'] = True
            return result
            
        except Exception as e:
            config.last_sync = datetime.utcnow().isoformat()
            config.last_sync_status = "error"
            config.last_error = str(e)
            return {"success": False, "error": str(e)}


class OAuthService:
    """OAuth 2.0 service for Google and Microsoft"""
    
    # OAuth endpoints
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
    MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/v1.0/me"
    
    @classmethod
    def get_authorization_url(cls, provider, org, redirect_uri: str, state: str = None) -> str:
        """Get OAuth authorization URL"""
        state = state or secrets.token_urlsafe(32)
        
        if provider.value == "google":
            # Use org credentials or fallback to environment variables
            client_id = org.google_client_id or os.environ.get("GOOGLE_CLIENT_ID")
            if not client_id:
                raise ValueError("Google OAuth not configured - missing client_id")
            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "consent"
            }
            return f"{cls.GOOGLE_AUTH_URL}?{urlencode(params)}"
        
        elif provider.value == "microsoft":
            # Use org credentials or fallback to environment variables
            client_id = org.microsoft_client_id or os.environ.get("MICROSOFT_CLIENT_ID")
            tenant = org.microsoft_tenant_id or os.environ.get("MICROSOFT_TENANT_ID", "common")
            if not client_id:
                raise ValueError("Microsoft OAuth not configured - missing client_id")
            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile User.Read",
                "state": state,
                "response_mode": "query"
            }
            auth_url = cls.MICROSOFT_AUTH_URL.replace("{tenant}", tenant)
            return f"{auth_url}?{urlencode(params)}"
        
        raise ValueError(f"Unsupported OAuth provider: {provider}")
    
    @classmethod
    async def exchange_code(cls, provider, org, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens and get user info"""
        if not HTTPX_AVAILABLE:
            raise RuntimeError("httpx not installed")
        
        async with httpx.AsyncClient() as client:
            if provider.value == "google":
                # Use org credentials or fallback to environment variables
                client_id = org.google_client_id or os.environ.get("GOOGLE_CLIENT_ID")
                client_secret = org.google_client_secret or os.environ.get("GOOGLE_CLIENT_SECRET")
                
                # Exchange code for tokens
                token_response = await client.post(
                    cls.GOOGLE_TOKEN_URL,
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code"
                    }
                )
                
                if token_response.status_code != 200:
                    raise Exception(f"Token exchange failed: {token_response.text}")
                
                tokens = token_response.json()
                access_token = tokens["access_token"]
                
                # Get user info
                userinfo_response = await client.get(
                    cls.GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if userinfo_response.status_code != 200:
                    raise Exception(f"Failed to get user info: {userinfo_response.text}")
                
                return userinfo_response.json()
            
            elif provider.value == "microsoft":
                # Use org credentials or fallback to environment variables
                client_id = org.microsoft_client_id or os.environ.get("MICROSOFT_CLIENT_ID")
                client_secret = org.microsoft_client_secret or os.environ.get("MICROSOFT_CLIENT_SECRET")
                tenant = org.microsoft_tenant_id or os.environ.get("MICROSOFT_TENANT_ID", "common")
                token_url = cls.MICROSOFT_TOKEN_URL.replace("{tenant}", tenant)
                
                # Exchange code for tokens
                token_response = await client.post(
                    token_url,
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code",
                        "scope": "openid email profile User.Read"
                    }
                )
                
                if token_response.status_code != 200:
                    raise Exception(f"Token exchange failed: {token_response.text}")
                
                tokens = token_response.json()
                access_token = tokens["access_token"]
                
                # Get user info from Microsoft Graph
                userinfo_response = await client.get(
                    cls.MICROSOFT_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if userinfo_response.status_code != 200:
                    raise Exception(f"Failed to get user info: {userinfo_response.text}")
                
                ms_user = userinfo_response.json()
                
                # Map Microsoft fields to standard format
                return {
                    "id": ms_user.get("id"),
                    "email": ms_user.get("mail") or ms_user.get("userPrincipalName"),
                    "given_name": ms_user.get("givenName"),
                    "family_name": ms_user.get("surname"),
                    "name": ms_user.get("displayName"),
                    "picture": None  # Would need additional Graph API call
                }
        
        raise ValueError(f"Unsupported OAuth provider: {provider}")
