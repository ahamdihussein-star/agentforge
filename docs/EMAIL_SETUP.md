# Email Notification Setup Guide

## Overview

AgentForge now has a **centralized email notification system** that allows you to configure email sending from one place and use it across all platform features (Security, Process notifications, Tools, etc.).

## Supported Providers

- **SMTP** - Any SMTP server (Gmail, Outlook, Namecheap Private Email, etc.)
- **SendGrid** - API-based email service
- **AWS SES** - Amazon Simple Email Service (future support)

## Configuration Steps

### 1. Access Settings

1. Log in to AgentForge
2. Navigate to **Settings** (⚙️ in sidebar)
3. Scroll to **Email Notifications** section

### 2. Choose Provider

#### Option A: SMTP (Recommended for Namecheap Private Email)

**For Namecheap Private Email:**
- **Provider**: SMTP
- **SMTP Host**: `mail.privateemail.com`
- **SMTP Port**: `587`
- **SMTP Username**: `noreply@agentforge.to`
- **SMTP Password**: Your email password
- **Use TLS**: ✓ (checked)
- **From Email**: `noreply@agentforge.to`
- **From Name**: `AgentForge`

**For Gmail:**
- **SMTP Host**: `smtp.gmail.com`
- **SMTP Port**: `587`
- **SMTP Username**: Your Gmail address
- **SMTP Password**: App-specific password (not your regular password)
- **Use TLS**: ✓ (checked)

**For Outlook/Microsoft 365:**
- **SMTP Host**: `smtp.office365.com`
- **SMTP Port**: `587`
- **SMTP Username**: Your Outlook email
- **SMTP Password**: Your password
- **Use TLS**: ✓ (checked)

#### Option B: SendGrid

- **Provider**: SendGrid
- **SendGrid API Key**: Your SendGrid API key (starts with `SG.`)
- **From Email**: Verified sender email in SendGrid
- **From Name**: Your organization name

### 3. Save Configuration

Click **Save Configuration** button.

### 4. Test Email

Click **Send Test Email** to verify everything works correctly.

## Where Email Notifications Are Used

Once configured, emails will be sent automatically for:

### Security Features
- ✉️ **Email Verification** - When new users register
- 🔐 **MFA Codes** - Two-factor authentication codes
- 🔑 **Password Reset** - Password reset links
- 👋 **Welcome Emails** - New user onboarding
- 📨 **User Invitations** - Invite team members
- 🔔 **Login Notifications** - Security alerts for new logins

### Process Features
- 📬 **Process Notifications** - Workflow completion alerts
- ⚠️ **Error Alerts** - Process failure notifications
- ✅ **Approval Requests** - Workflow approval notifications

### Future Features
- 📊 **Reports** - Scheduled report delivery
- 🔔 **Custom Alerts** - User-defined notifications

## Troubleshooting

### Test Email Fails

1. **Check credentials** - Verify username and password are correct
2. **Check firewall** - Ensure outbound port 587 is open
3. **Check provider settings** - Some providers require "less secure apps" or app-specific passwords
4. **Check from email** - Must match your SMTP username for most providers

### Emails Not Sending in Production

1. **Check Railway environment** - Ensure no conflicting `SMTP_*` environment variables
2. **Check database settings** - Settings in database take priority over environment variables
3. **Check logs** - Look for email sending errors in Railway logs

### Gmail-Specific Issues

- Enable "Less secure app access" OR
- Use App-Specific Password (recommended):
  1. Go to Google Account settings
  2. Security → 2-Step Verification
  3. App passwords → Generate new password
  4. Use generated password in SMTP settings

## Environment Variables (Fallback)

If database settings are not configured, the system falls back to environment variables:

```bash
# SMTP Settings
SMTP_HOST=mail.privateemail.com
SMTP_PORT=587
SMTP_USER=noreply@agentforge.to
SMTP_PASS=your_password
SMTP_USE_TLS=true

# SendGrid Settings (alternative)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Common Settings
EMAIL_FROM=noreply@agentforge.to
EMAIL_FROM_NAME=AgentForge
```

**Note:** Database settings (configured via UI) take priority over environment variables.

## Security Best Practices

1. ✅ **Use TLS** - Always enable TLS for SMTP connections
2. ✅ **App-Specific Passwords** - Use app-specific passwords instead of main account passwords
3. ✅ **Rotate Credentials** - Change passwords regularly
4. ✅ **Monitor Usage** - Check email logs for suspicious activity
5. ✅ **Verified Senders** - Use verified sender addresses for SendGrid

## Migration from Old System

If you were using environment variables before:

1. **Configure via UI** - Settings page will now be the source of truth
2. **Test thoroughly** - Send test emails to verify
3. **Remove old env vars** - Optional, but recommended for clarity

Database settings will automatically override environment variables.

## API Reference

For developers integrating email notifications:

```python
from core.security import EmailService

# Send email (automatically uses configured settings)
await EmailService.send_email(
    to_email="user@example.com",
    subject="Welcome!",
    html_content="<h1>Welcome to AgentForge</h1>",
    org_id=user.org_id  # Optional: loads org-specific settings
)
```

## Support

For issues or questions:
- Check Railway logs for detailed error messages
- Verify SMTP credentials with your email provider
- Test with a simple SMTP client first to isolate issues
