// ============================================================
// EMAIL NOTIFICATION SETTINGS
// ============================================================

let selectedEmailProvider = null;

/**
 * Select email provider and show appropriate configuration
 */
function selectEmailProvider(provider) {
    selectedEmailProvider = provider;
    
    // Update visual selection
    document.querySelectorAll('.email-provider-btn').forEach(btn => {
        btn.classList.remove('border-purple-500');
        btn.classList.add('border-transparent');
    });
    document.getElementById(`email-provider-${provider}`).classList.remove('border-transparent');
    document.getElementById(`email-provider-${provider}`).classList.add('border-purple-500');
    
    // Show/hide configuration sections
    const smtpConfig = document.getElementById('email-smtp-config');
    const sendgridConfig = document.getElementById('email-sendgrid-config');
    
    if (provider === 'smtp') {
        smtpConfig.classList.remove('hidden');
        sendgridConfig.classList.add('hidden');
    } else if (provider === 'sendgrid') {
        smtpConfig.classList.add('hidden');
        sendgridConfig.classList.remove('hidden');
    }
    
    // Enable test button if provider is selected
    document.getElementById('btn-test-email').disabled = false;
}

/**
 * Load email settings from server
 */
async function loadEmailSettings() {
    try {
        const response = await fetch('/api/settings/email', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            console.warn('Failed to load email settings');
            return;
        }
        
        const data = await response.json();
        
        if (!data.configured) {
            // No settings configured yet
            document.getElementById('settings-email-status').textContent = '⚙️ Not Configured';
            document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400';
            return;
        }
        
        // Populate form with existing settings
        selectEmailProvider(data.provider);
        
        if (data.provider === 'smtp') {
            document.getElementById('email-smtp-host').value = data.smtp_host || '';
            document.getElementById('email-smtp-port').value = data.smtp_port || 587;
            document.getElementById('email-smtp-user').value = data.smtp_user || '';
            document.getElementById('email-smtp-tls').checked = data.smtp_use_tls !== false;
        }
        
        document.getElementById('email-from').value = data.from_email || '';
        document.getElementById('email-from-name').value = data.from_name || 'AgentForge';
        
        // Update status badge
        if (data.is_active) {
            if (data.last_test_success) {
                document.getElementById('settings-email-status').textContent = '✅ Active & Verified';
                document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400';
            } else {
                document.getElementById('settings-email-status').textContent = '⚠️ Active (Not Tested)';
                document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400';
            }
        } else {
            document.getElementById('settings-email-status').textContent = '❌ Inactive';
            document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400';
        }
        
        // Show last error if any
        if (data.last_error) {
            showEmailMessage(`Last error: ${data.last_error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error loading email settings:', error);
    }
}

/**
 * Save email settings to server
 */
async function saveEmailSettings() {
    if (!selectedEmailProvider) {
        showEmailMessage('Please select an email provider', 'error');
        return;
    }
    
    const fromEmail = document.getElementById('email-from').value.trim();
    if (!fromEmail) {
        showEmailMessage('From Email is required', 'error');
        return;
    }
    
    const settings = {
        provider: selectedEmailProvider,
        from_email: fromEmail,
        from_name: document.getElementById('email-from-name').value.trim() || 'AgentForge',
        is_active: true
    };
    
    if (selectedEmailProvider === 'smtp') {
        const smtpHost = document.getElementById('email-smtp-host').value.trim();
        const smtpUser = document.getElementById('email-smtp-user').value.trim();
        const smtpPass = document.getElementById('email-smtp-pass').value.trim();
        
        if (!smtpHost || !smtpUser || !smtpPass) {
            showEmailMessage('SMTP Host, Username, and Password are required', 'error');
            return;
        }
        
        settings.smtp_host = smtpHost;
        settings.smtp_port = parseInt(document.getElementById('email-smtp-port').value) || 587;
        settings.smtp_user = smtpUser;
        settings.smtp_password = smtpPass;
        settings.smtp_use_tls = document.getElementById('email-smtp-tls').checked;
    } else if (selectedEmailProvider === 'sendgrid') {
        const apiKey = document.getElementById('email-sendgrid-key').value.trim();
        
        if (!apiKey) {
            showEmailMessage('SendGrid API Key is required', 'error');
            return;
        }
        
        settings.sendgrid_api_key = apiKey;
    }
    
    try {
        showEmailMessage('Saving configuration...', 'info');
        
        const response = await fetch('/api/settings/email', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save settings');
        }
        
        const result = await response.json();
        showEmailMessage('✅ Email settings saved successfully!', 'success');
        
        // Update status badge
        document.getElementById('settings-email-status').textContent = '⚠️ Active (Not Tested)';
        document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400';
        
        // Clear password field for security
        if (selectedEmailProvider === 'smtp') {
            document.getElementById('email-smtp-pass').value = '';
        } else if (selectedEmailProvider === 'sendgrid') {
            document.getElementById('email-sendgrid-key').value = '';
        }
        
        // Enable test button
        document.getElementById('btn-test-email').disabled = false;
        
    } catch (error) {
        console.error('Error saving email settings:', error);
        showEmailMessage(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Send test email
 */
async function testEmailSettings() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const testEmail = currentUser.email || prompt('Enter email address to send test to:');
    
    if (!testEmail) {
        return;
    }
    
    try {
        showEmailMessage('Sending test email...', 'info');
        
        const response = await fetch('/api/settings/email/test', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to_email: testEmail,
                subject: 'Test Email from AgentForge',
                message: 'This is a test email to verify your email notification configuration.'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send test email');
        }
        
        const result = await response.json();
        showEmailMessage(`✅ ${result.message}`, 'success');
        
        // Update status badge
        document.getElementById('settings-email-status').textContent = '✅ Active & Verified';
        document.getElementById('settings-email-status').className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400';
        
    } catch (error) {
        console.error('Error sending test email:', error);
        showEmailMessage(`❌ Error: ${error.message}`, 'error');
    }
}

/**
 * Show message in email settings section
 */
function showEmailMessage(message, type = 'info') {
    const messageEl = document.getElementById('email-settings-message');
    messageEl.textContent = message;
    messageEl.classList.remove('hidden', 'bg-green-600/20', 'text-green-400', 'bg-red-600/20', 'text-red-400', 'bg-blue-600/20', 'text-blue-400');
    
    if (type === 'success') {
        messageEl.classList.add('bg-green-600/20', 'text-green-400');
    } else if (type === 'error') {
        messageEl.classList.add('bg-red-600/20', 'text-red-400');
    } else {
        messageEl.classList.add('bg-blue-600/20', 'text-blue-400');
    }
    
    messageEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds for success/info messages
    if (type !== 'error') {
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }
}

// Load email settings when settings page is shown
if (typeof window !== 'undefined') {
    const originalNavigate = window.navigate;
    window.navigate = function(page) {
        if (originalNavigate) {
            originalNavigate(page);
        }
        if (page === 'settings') {
            setTimeout(() => loadEmailSettings(), 100);
        }
    };
}
