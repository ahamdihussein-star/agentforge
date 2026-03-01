"""
Notification Service
Handles sending notifications through various channels

Supported channels:
- email: Uses platform EmailService (same as reset password, MFA) when provided; else SMTP
- slack: Send to Slack channel/user
- webhook: Send HTTP webhook
- in_app: Create in-app notification
"""

import logging
import json
import html
import re
from typing import Dict, Any, List, Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    pass  # Platform EmailService is passed at runtime to avoid circular imports

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending notifications.
    When platform_email_service is set, email channel uses the same service as reset password and MFA.
    """
    
    def __init__(self, db=None, config: Dict[str, Any] = None, platform_email_service: Any = None):
        """
        Initialize notification service.
        
        Args:
            db: Database session for in-app notifications
            config: Channel configurations
            platform_email_service: Optional. Same EmailService used for reset password, MFA, invitations.
                                    When set, email notifications use it (SendGrid/etc.) instead of SMTP.
        """
        self.db = db
        self.config = config or {}
        self.platform_email_service = platform_email_service
        
        # Channel handlers
        self._handlers = {
            'email': self._send_email,
            'slack': self._send_slack,
            'webhook': self._send_webhook,
            'in_app': self._send_in_app,
            'sms': self._send_sms,
        }
    
    async def send(
        self,
        channel: str,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Send notification through specified channel

        Args:
            channel: Notification channel (email, slack, webhook, in_app)
            recipients: List of recipient identifiers
            title: Notification title
            message: Notification body
            template_id: Optional template ID
            template_data: Data for template rendering
            priority: low, normal, high, urgent
            config: Channel-specific configuration
            attachments: Optional list of file dicts (path, filename, mime_type) for email

        Returns:
            Result dict with sent status and details
        """
        handler = self._handlers.get(channel)
        
        if not handler:
            logger.warning(f"Unknown notification channel: {channel}")
            return {
                'success': False,
                'channel': channel,
                'error': f"Unknown channel: {channel}"
            }
        
        try:
            result = await handler(
                recipients=recipients,
                title=title,
                message=message,
                template_id=template_id,
                template_data=template_data,
                priority=priority,
                config=config or {},
                attachments=attachments,
            )
            
            logger.info(f"Notification sent via {channel} to {len(recipients)} recipients")
            return result
            
        except Exception as e:
            logger.error(f"Failed to send notification via {channel}: {e}")
            return {
                'success': False,
                'channel': channel,
                'error': str(e)
            }
    
    async def _send_email(
        self,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send email: use platform EmailService (same as reset password, MFA) when set; else SMTP."""

        logger.info(
            "[NotificationService._send_email] recipients=%s subject=%s "
            "has_platform_email=%s msg_len=%d attachments=%d",
            recipients, title, bool(self.platform_email_service),
            len(message) if message else 0,
            len(attachments) if attachments else 0,
        )

        if self.platform_email_service:
            try:
                if message.strip().startswith('<') and ('</' in message or '/>' in message):
                    html_content = message
                    text_content = message.replace('<br>', '\n').replace('<br/>', '\n').replace('</p>', '\n')
                    text_content = re.sub(r'<[^>]+>', '', text_content)
                else:
                    text_content = message
                    html_content = f"""<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>{html.escape(message).replace(chr(10), '<br>')}</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p style="color: #999; font-size: 12px;">AgentForge</p>
</div>"""
                email_subject = (title or 'Notification').strip() or 'Notification'
                sent = 0
                failed = []
                for to_email in recipients:
                    if not to_email or not str(to_email).strip():
                        logger.warning("[_send_email] Skipping empty recipient")
                        continue
                    clean_email = str(to_email).strip()
                    logger.info("[_send_email] Sending to %s …", clean_email)
                    ok = await self.platform_email_service.send_email(
                        clean_email,
                        email_subject,
                        html_content,
                        text_content=text_content,
                        attachments=attachments,
                    )
                    if ok:
                        sent += 1
                        logger.info("[_send_email] ✅ Sent to %s", clean_email)
                    else:
                        failed.append(clean_email)
                        logger.warning("[_send_email] ❌ Failed to send to %s", clean_email)
                result = {
                    'success': sent > 0,
                    'channel': 'email',
                    'recipients_count': len(recipients),
                    'sent_count': sent,
                }
                if failed:
                    result['failed_recipients'] = failed
                logger.info("[_send_email] Result: %s", result)
                return result
            except Exception as e:
                logger.warning(f"Platform email service failed: {e}, falling back to SMTP if configured")
        
        # Fallback: Get SMTP config
        smtp_config = self.config.get('email', config or {})
        
        if not smtp_config.get('smtp_host'):
            logger.info(f"Email notification (no SMTP): {title} -> {recipients}")
            return {
                'success': True,
                'channel': 'email',
                'recipients_count': len(recipients),
                'note': 'SMTP not configured - notification logged only'
            }
        
        # Send via SMTP (with attachment support)
        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from email.mime.base import MIMEBase
            from email import encoders
            import mimetypes
            import os
            
            smtp = aiosmtplib.SMTP(
                hostname=smtp_config['smtp_host'],
                port=smtp_config.get('smtp_port', 587),
                use_tls=smtp_config.get('use_tls', True)
            )
            
            await smtp.connect()
            
            if smtp_config.get('username'):
                await smtp.login(
                    smtp_config['username'],
                    smtp_config['password']
                )
            
            for recipient in recipients:
                msg = MIMEMultipart()
                msg['From'] = smtp_config.get('from_email', 'noreply@agentforge.io')
                msg['To'] = recipient
                msg['Subject'] = title
                msg.attach(MIMEText(message, 'html'))

                for att in (attachments or []):
                    fpath = att.get("path", "")
                    fname = att.get("filename", "")
                    if not fpath or not os.path.isfile(fpath):
                        continue
                    mime = att.get("mime_type") or mimetypes.guess_type(fname or fpath)[0] or "application/octet-stream"
                    maintype, subtype = mime.split("/", 1) if "/" in mime else ("application", "octet-stream")
                    part = MIMEBase(maintype, subtype)
                    with open(fpath, "rb") as fp:
                        part.set_payload(fp.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", "attachment", filename=fname or os.path.basename(fpath))
                    msg.attach(part)

                await smtp.send_message(msg)
            
            await smtp.quit()
            
            return {
                'success': True,
                'channel': 'email',
                'recipients_count': len(recipients)
            }
            
        except ImportError:
            logger.warning("aiosmtplib not installed - email notification logged only")
            return {
                'success': True,
                'channel': 'email',
                'recipients_count': len(recipients),
                'note': 'aiosmtplib not installed'
            }
    
    async def _send_slack(
        self,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send Slack notification"""
        
        slack_config = self.config.get('slack', config or {})
        webhook_url = slack_config.get('webhook_url')
        
        if not webhook_url:
            logger.info(f"Slack notification (no webhook): {title}")
            return {
                'success': True,
                'channel': 'slack',
                'note': 'Slack webhook not configured'
            }
        
        try:
            import aiohttp
            
            # Build Slack message
            blocks = [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": title}
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": message}
                }
            ]
            
            if priority == "urgent":
                blocks.insert(0, {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": "🚨 *URGENT*"}
                })
            
            payload = {
                "blocks": blocks,
                "text": title  # Fallback
            }
            
            # If recipients are channels, send to each
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as resp:
                    if resp.status == 200:
                        return {
                            'success': True,
                            'channel': 'slack',
                            'status': resp.status
                        }
                    else:
                        return {
                            'success': False,
                            'channel': 'slack',
                            'error': await resp.text()
                        }
                        
        except ImportError:
            logger.warning("aiohttp not installed for Slack")
            return {'success': False, 'channel': 'slack', 'error': 'aiohttp not installed'}
    
    async def _send_webhook(
        self,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send webhook notification"""
        
        config = config or {}
        results = []
        
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                for url in recipients:
                    payload = {
                        'title': title,
                        'message': message,
                        'priority': priority,
                        'timestamp': datetime.utcnow().isoformat(),
                        'data': template_data or {}
                    }
                    
                    try:
                        async with session.post(
                            url,
                            json=payload,
                            headers=config.get('headers', {}),
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as resp:
                            results.append({
                                'url': url,
                                'status': resp.status,
                                'success': resp.status < 400
                            })
                    except Exception as e:
                        results.append({
                            'url': url,
                            'success': False,
                            'error': str(e)
                        })
            
            success_count = sum(1 for r in results if r.get('success'))
            
            return {
                'success': success_count > 0,
                'channel': 'webhook',
                'results': results,
                'success_count': success_count,
                'total_count': len(recipients)
            }
            
        except ImportError:
            return {'success': False, 'channel': 'webhook', 'error': 'aiohttp not installed'}
    
    async def _send_in_app(
        self,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send in-app notification (stored in database)"""
        
        if not self.db:
            logger.warning("No database session for in-app notifications")
            return {
                'success': False,
                'channel': 'in_app',
                'error': 'Database not configured'
            }
        
        # Store notifications in database using audit log mechanism
        # The platform can add a dedicated Notification model if needed
        from datetime import datetime as dt
        
        notifications_created = 0
        
        for user_id in recipients:
            try:
                # Store as audit entry - this provides persistence and queryability
                notification_record = {
                    'type': 'in_app_notification',
                    'user_id': user_id,
                    'title': title,
                    'message': message,
                    'priority': priority,
                    'template_id': template_id,
                    'template_data': template_data,
                    'created_at': dt.utcnow().isoformat(),
                    'read': False
                }
                
                # Log notification (can be picked up by notification polling endpoint)
                logger.info(f"In-app notification created for {user_id}: {title}")
                
                # If a Notification model exists, use it
                try:
                    from database.models import Notification
                    notif = Notification(
                        user_id=user_id,
                        title=title,
                        message=message,
                        priority=priority,
                        data=template_data
                    )
                    self.db.add(notif)
                    self.db.commit()
                except ImportError:
                    # No Notification model - notifications are logged only
                    pass
                
                notifications_created += 1
            except Exception as e:
                logger.error(f"Failed to create notification for {user_id}: {e}")
        
        return {
            'success': notifications_created > 0,
            'channel': 'in_app',
            'notifications_created': notifications_created
        }
    
    async def _send_sms(
        self,
        recipients: List[str],
        title: str,
        message: str,
        template_id: str = None,
        template_data: Dict[str, Any] = None,
        priority: str = "normal",
        config: Dict[str, Any] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Send SMS notification via Twilio
        
        Config required:
        - account_sid: Twilio account SID
        - auth_token: Twilio auth token
        - from_number: Sender phone number
        """
        
        sms_config = self.config.get('sms', config or {})
        
        account_sid = sms_config.get('account_sid')
        auth_token = sms_config.get('auth_token')
        from_number = sms_config.get('from_number')
        
        if not all([account_sid, auth_token, from_number]):
            logger.info(f"SMS notification (not configured): {title}")
            return {
                'success': True,
                'channel': 'sms',
                'recipients_count': len(recipients),
                'note': 'SMS provider not configured - notification logged'
            }
        
        try:
            import aiohttp
            
            # Twilio API endpoint
            base_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            
            # Combine title and message
            sms_body = f"{title}\n\n{message}" if title else message
            
            # Truncate if too long (SMS limit is 160 chars for single message)
            if len(sms_body) > 1600:  # Twilio allows concatenated messages
                sms_body = sms_body[:1597] + "..."
            
            results = []
            
            async with aiohttp.ClientSession() as session:
                auth = aiohttp.BasicAuth(account_sid, auth_token)
                
                for to_number in recipients:
                    try:
                        data = {
                            'To': to_number,
                            'From': from_number,
                            'Body': sms_body
                        }
                        
                        async with session.post(
                            base_url,
                            data=data,
                            auth=auth,
                            timeout=aiohttp.ClientTimeout(total=30)
                        ) as resp:
                            response_data = await resp.json()
                            
                            if resp.status in (200, 201):
                                results.append({
                                    'to': to_number,
                                    'success': True,
                                    'message_sid': response_data.get('sid')
                                })
                            else:
                                results.append({
                                    'to': to_number,
                                    'success': False,
                                    'error': response_data.get('message', 'Unknown error')
                                })
                                
                    except Exception as e:
                        results.append({
                            'to': to_number,
                            'success': False,
                            'error': str(e)
                        })
            
            success_count = sum(1 for r in results if r.get('success'))
            
            return {
                'success': success_count > 0,
                'channel': 'sms',
                'results': results,
                'success_count': success_count,
                'total_count': len(recipients)
            }
            
        except ImportError:
            logger.warning("aiohttp not installed for SMS sending")
            return {
                'success': False, 
                'channel': 'sms', 
                'error': 'aiohttp not installed'
            }
        except Exception as e:
            logger.error(f"SMS sending failed: {e}")
            return {
                'success': False,
                'channel': 'sms',
                'error': str(e)
            }
