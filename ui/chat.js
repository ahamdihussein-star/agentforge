// State
        let currentUser = null;
        let currentAgent = null;
        let currentConversation = null;
        // Accessible agents split by type
        let allAccessibleAgents = [];
        let agents = []; // conversational agents (chat)
        let workflowAgents = []; // process agents (workflows)
        let conversations = [];
        
        // Portal view state
        let currentView = 'home';
        let workflowCategoryFilter = 'All';
        let workflowTriggerFilter = 'all'; // all | manual | schedule | webhook
        let workflowApprovalFilter = 'all'; // all | approvals | no_approvals
        let currentWorkflowAgent = null;
        let workflowRunInputs = [];
        let myRequests = []; // workflow runs list (UI label: Runs)
        let myApprovals = [];
        let requestsScope = 'mine'; // mine | org
        let requestsWorkflowFilterId = null; // workflow id filter for runs
        let selectedExecutionId = null;
        let selectedApprovalId = null;
        let currentBranding = null; // org branding payload (if available)
        const API = '';

        // Helper function to get auth token from either storage
        // NOTE: The platform standard is `agentforge_token` (admin portal + process builder).
        // We still read legacy `token` for backward compatibility and migrate it forward.
        function getToken() {
            const primary =
                localStorage.getItem('agentforge_token') ||
                sessionStorage.getItem('agentforge_token');
            if (primary) return primary;

            const legacy =
                localStorage.getItem('token') ||
                sessionStorage.getItem('token');

            // Migrate legacy key → standard key (best effort)
            if (legacy) {
                try {
                    if (!localStorage.getItem('agentforge_token')) {
                        localStorage.setItem('agentforge_token', legacy);
                    }
                } catch (_) { /* ignore */ }
            }
            return legacy;
        }
        
        // Helper function to get auth headers
        function getAuthHeaders() {
            const token = getToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = (str == null) ? '' : String(str);
            return div.innerHTML;
        }

        function humanizeFieldLabel(id) {
            const raw = String(id || '').trim();
            if (!raw) return '';
            // Map well-known technical keys to business-friendly labels
            const knownLabels = {
                'trigger_input': 'Submitted Information',
                'requested_by': 'Requested By',
                'requester_email': 'Requester Email',
                'requester_name': 'Requester Name',
                'requester_id': 'Requester',
                'manager_id': 'Manager',
                'manager_name': 'Manager Name',
                'manager_email': 'Manager Email',
                'department_id': 'Department',
                'department_name': 'Department',
                'employee_id': 'Employee ID',
                'job_title': 'Job Title',
                'org_id': 'Organization',
                'user_id': 'User',
                'created_at': 'Submitted On',
                'updated_at': 'Last Updated',
                'start_date': 'Start Date',
                'end_date': 'End Date',
                'due_date': 'Due Date',
                'total_amount': 'Total Amount',
                'is_manager': 'Is Manager',
                'group_ids': 'Groups',
                'role_ids': 'Roles',
                '_user_context': null, // Hide internal context
            };
            const lower = raw.toLowerCase();
            if (lower in knownLabels) {
                return knownLabels[lower] === null ? '' : knownLabels[lower];
            }
            const basic = raw
                .replace(/[_-]+/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\s+/g, ' ')
                .trim()
                .split(' ')
                .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '')
                .join(' ');

            // Heuristic: for legacy keys that are "stuck together" (e.g., "Expensereportname"),
            // split on common business tokens to avoid exposing technical-looking labels.
            // This remains generic and domain-agnostic.
            const looksStuck = basic && !basic.includes(' ') && /^[A-Za-z0-9]+$/.test(raw) && raw.length >= 10;
            if (!looksStuck) return basic;

            const tokens = [
                // identity
                'requester', 'employee', 'manager', 'department', 'user',
                // common fields
                'email', 'phone', 'address', 'title', 'type', 'status', 'code', 'number', 'id', 'name',
                // time
                'start', 'end', 'due', 'date', 'time',
                // money/data
                'amount', 'total', 'currency',
                // common business artifacts
                'report', 'request', 'approval',
            ].sort((a, b) => b.length - a.length);

            let s = raw.toLowerCase();
            for (const t of tokens) {
                // word-ish replacement (not regex word boundary since the string has no separators)
                s = s.replaceAll(t, ` ${t} `);
            }
            const cleaned = s.replace(/\s+/g, ' ').trim();
            if (!cleaned || cleaned.replace(/\s/g, '').length < 4) return basic;
            return cleaned
                .split(' ')
                .filter(Boolean)
                .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '')
                .join(' ');
        }

        /** Map technical node/step types to business-friendly labels */
        function humanizeNodeType(type) {
            const map = {
                'human_task': 'Task',
                'approval': 'Approval',
                'condition': 'Decision',
                'notification': 'Notification',
                'email': 'Email',
                'trigger': 'Start',
                'form': 'Form',
                'start': 'Start',
                'end': 'Complete',
                'tool': 'Automated Action',
                'script': 'Automated Action',
                'api_call': 'Integration',
                'webhook': 'Integration',
                'delay': 'Wait',
                'timer': 'Scheduled',
                'parallel': 'Parallel Steps',
                'loop': 'Repeated Step',
                'subprocess': 'Sub-Process',
            };
            const key = String(type || '').toLowerCase().trim();
            return map[key] || humanizeFieldLabel(key) || 'Step';
        }

        /** Map technical urgency values to business-friendly labels */
        function humanizeUrgency(urgency) {
            const map = {
                'high': 'Urgent',
                'critical': 'Critical',
                'normal': 'Normal',
                'medium': 'Normal',
                'low': 'Low Priority',
            };
            const key = String(urgency || '').toLowerCase().trim();
            return map[key] || urgency || 'Normal';
        }

        /** Sanitize error messages — hide technical details from business users */
        function friendlyErrorMessage(rawMsg, fallback) {
            const msg = String(rawMsg || '').trim();
            const fb = fallback || 'Something went wrong. Please try again.';
            if (!msg) return fb;
            // Hide internal/technical error patterns
            if (/traceback|stack trace|internal server/i.test(msg)) return fb;
            if (/sqlalchemy|database|sql|connection refused|errno/i.test(msg)) return 'A system error occurred. Please try again or contact support.';
            if (/500|502|503|504/.test(msg) && msg.length < 20) return fb;
            if (/keyerror|typeerror|attributeerror|valueerror|importerror/i.test(msg)) return fb;
            if (/null|undefined|NoneType/i.test(msg) && msg.length < 50) return fb;
            // Let through business-friendly messages
            return msg;
        }

        // Check authentication on load
        document.addEventListener('DOMContentLoaded', () => {
            const token = getToken();
            if (token) {
                validateToken(token);
            } else {
                // Stay on this page and show the built-in login screen (do NOT redirect to admin portal)
                showLoginScreen();
            }
            setupMobileMenu();
        });

        async function validateToken(token) {
            try {
                const response = await fetch(`${API}/api/security/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    currentUser = await response.json();
                    showChatInterface();
                    loadAgents();
                    refreshInboxBadge();
                    return;
                }
                
                // Invalid/expired token → clear and show login screen (no redirects)
                try {
                    localStorage.removeItem('agentforge_token');
                    sessionStorage.removeItem('agentforge_token');
                    localStorage.removeItem('token'); // legacy
                    sessionStorage.removeItem('token'); // legacy
                } catch (_) { /* ignore */ }
                currentUser = null;
                showLoginScreen();
            } catch (e) {
                console.error('Token validation failed:', e);
                // If we cannot validate, keep the login screen visible
                try { showLoginScreen(); } catch (_) {}
            }
        }

        // MFA Login State (same pattern as admin portal)
        window.pendingLoginEmail = null;
        window.pendingLoginPassword = null;
        window.pendingMfaMethods = [];

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('login-btn');
            
            btn.disabled = true;
            btn.textContent = 'Signing in...';
            
            try {
                const response = await fetch(`${API}/api/security/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (!response.ok && !data.requires_mfa && !data.mfa_required) {
                    showToast(data.detail || 'Login failed', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                    return;
                }
                
                // Check if MFA is required (same robust check as admin portal)
                const isMfaRequired = data.requires_mfa === true || 
                                     data.mfa_required === true || 
                                     data.requires_mfa === "true" || 
                                     data.mfa_required === "true" ||
                                     String(data.requires_mfa).toLowerCase() === "true" ||
                                     String(data.mfa_required).toLowerCase() === "true";
                
                if (isMfaRequired) {
                    btn.disabled = false;
                    btn.textContent = 'Sign In';
                    
                    // Store credentials temporarily for MFA verification
                    window.pendingLoginEmail = email;
                    window.pendingLoginPassword = password;
                    window.pendingMfaMethods = data.mfa_methods || [];
                    
                    showLoginMfaModal(window.pendingMfaMethods);
                    return;
                }
                
                // Success - complete login
                try {
                    localStorage.setItem('agentforge_token', data.access_token);
                    sessionStorage.setItem('agentforge_token', data.access_token);
                    // Remove legacy key to avoid confusion
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                } catch (_) { /* ignore */ }
                currentUser = data.user;
                showChatInterface();
                loadAgents();
                showToast('Welcome back!', 'success');
                
            } catch (e) {
                showToast('Connection error. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        }

        function showLoginMfaModal(methods) {
            // Remove existing modal if present (same as admin portal)
            const existingModal = document.getElementById('login-mfa-modal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Mask email for privacy (same as admin portal)
            const email = window.pendingLoginEmail || 'your email';
            const maskEmail = (email) => {
                if (!email || email === 'your email') return email;
                const [local, domain] = email.split('@');
                if (local.length <= 2) return email;
                const visible = local.substring(0, 2);
                const masked = '*'.repeat(Math.min(local.length - 2, 4));
                return `${visible}${masked}@${domain}`;
            };
            const displayEmail = maskEmail(email);
            
            const modal = document.createElement('div');
            modal.id = 'login-mfa-modal';
            modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;';
            modal.onclick = (e) => { if (e.target === modal) closeLoginMfaModal(); };
            
            // Same HTML structure as admin portal
            modal.innerHTML = `
                <div style="background: var(--bg-card); border-radius: 16px; padding: 24px; width: 100%; max-width: 400px; margin: 16px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 3rem; margin-bottom: 12px;">🔐</div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Two-Factor Authentication</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Enter the 6-digit code sent to</p>
                        <p style="color: var(--accent); font-weight: 600; font-size: 0.875rem; margin-top: 4px;" title="${email}">${displayEmail}</p>
                    </div>
                    
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background: rgba(34, 197, 94, 0.2); display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 1.25rem; color: #22c55e;">✓</span>
                            </div>
                            <div style="flex: 1;">
                                <p style="color: #22c55e; font-weight: 500; font-size: 0.875rem;">Code sent successfully!</p>
                                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Please check your email inbox</p>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px;">Verification Code</label>
                        <input 
                            type="text" 
                            id="login-mfa-code" 
                            style="width: 100%; padding: 16px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; text-align: center; font-size: 1.875rem; letter-spacing: 0.5em; font-family: monospace; font-weight: 600; color: var(--text-primary); outline: none; transition: all 0.2s;"
                            placeholder="000000" 
                            maxlength="6" 
                            pattern="[0-9]{6}"
                            inputmode="numeric"
                            autocomplete="one-time-code"
                            onfocus="this.style.borderColor='var(--accent)'; this.style.boxShadow='0 0 0 3px rgba(139, 92, 246, 0.2)';"
                            onblur="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none';"
                            onkeydown="if(event.key==='Enter')verifyLoginMfa()"
                        >
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px; text-align: center;">Enter the 6-digit code from your email</p>
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button onclick="closeLoginMfaModal()" style="flex: 1; padding: 12px; background: var(--bg-hover); border: none; border-radius: 8px; color: var(--text-primary); font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--bg-active)'" onmouseout="this.style.background='var(--bg-hover)'">Cancel</button>
                        <button onclick="verifyLoginMfa()" id="login-mfa-verify-btn" style="flex: 1; padding: 12px; background: var(--accent); border: none; border-radius: 8px; color: white; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                            <span id="verify-btn-text">Verify</span>
                        </button>
                    </div>
                    
                    <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">Didn't receive the code?</p>
                        <button onclick="resendMfaCode()" id="resend-mfa-btn" style="font-size: 0.875rem; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 8px 16px; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.color='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseout="this.style.color='var(--text-muted)'; this.style.background='none'">
                            <span id="resend-text">Resend code</span>
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Focus input after a short delay
            setTimeout(() => {
                const input = document.getElementById('login-mfa-code');
                if (input) input.focus();
            }, 100);
        }

        function closeLoginMfaModal() {
            const modal = document.getElementById('login-mfa-modal');
            if (modal) modal.remove();
            window.pendingLoginEmail = null;
            window.pendingLoginPassword = null;
            window.pendingMfaMethods = [];
        }

        async function resendMfaCode() {
            if (!window.pendingLoginEmail || !window.pendingLoginPassword) {
                showToast('Session expired. Please login again.', 'error');
                closeLoginMfaModal();
                return;
            }
            
            try {
                const response = await fetch(`${API}/api/security/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: window.pendingLoginEmail, 
                        password: window.pendingLoginPassword 
                    })
                });
                
                if (response.ok) {
                    showToast('New code sent to your email', 'success');
                } else {
                    showToast('Failed to resend code', 'error');
                }
            } catch (e) {
                showToast('Failed to resend code', 'error');
            }
        }

        async function verifyLoginMfa() {
            const codeInput = document.getElementById('login-mfa-code');
            const code = codeInput?.value?.replace(/\D/g, '') || '';
            
            if (!code || code.length !== 6) {
                showToast('Please enter a valid 6-digit code', 'error');
                if (codeInput) {
                    codeInput.focus();
                    codeInput.select();
                }
                return;
            }
            
            const btn = document.getElementById('login-mfa-verify-btn');
            const btnText = document.getElementById('verify-btn-text');
            if (btn) {
                btn.disabled = true;
                if (btnText) btnText.textContent = 'Verifying...';
            }
            
            try {
                const response = await fetch(`${API}/api/security/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: window.pendingLoginEmail, 
                        password: window.pendingLoginPassword,
                        mfa_code: code
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    showToast(data.detail || 'Invalid code', 'error');
                    if (btn) {
                        btn.disabled = false;
                        if (btnText) btnText.textContent = 'Verify';
                    }
                    if (codeInput) {
                        codeInput.value = '';
                        codeInput.focus();
                    }
                    return;
                }
                
                // Success
                closeLoginMfaModal();
                try {
                    localStorage.setItem('agentforge_token', data.access_token);
                    sessionStorage.setItem('agentforge_token', data.access_token);
                    // Remove legacy key to avoid confusion
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                } catch (_) { /* ignore */ }
                currentUser = data.user;
                showChatInterface();
                loadAgents();
                showToast('Welcome back!', 'success');
                
            } catch (e) {
                showToast('Verification failed. Please try again.', 'error');
                if (btn) {
                    btn.disabled = false;
                    if (btnText) btnText.textContent = 'Verify';
                }
            }
        }
        
        // ========== MODERN NOTIFICATION SYSTEM ==========
        const NotificationSystem = {
            container: null,
            notifications: [],
            maxVisible: 5,
            
            init() {
                if (this.container) return;
                this.container = document.createElement('div');
                this.container.id = 'notification-container';
                Object.assign(this.container.style, {
                    position: 'fixed', top: '16px', right: '16px', zIndex: '99999',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    maxWidth: '400px', width: '100%', pointerEvents: 'none',
                    maxHeight: 'calc(100vh - 2rem)', overflow: 'hidden'
                });
                document.body.appendChild(this.container);
            },
            
            getConfig(type) {
                const configs = {
                    success: {
                        icon: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
                        bg: 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))',
                        border: 'rgba(52,211,153,0.3)',
                        iconBg: 'rgba(52,211,153,0.2)',
                        title: 'Success',
                        duration: 4000
                    },
                    error: {
                        icon: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
                        bg: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(225,29,72,0.95))',
                        border: 'rgba(252,165,165,0.3)',
                        iconBg: 'rgba(252,165,165,0.2)',
                        title: 'Error',
                        duration: 8000
                    },
                    warning: {
                        icon: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
                        bg: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(234,88,12,0.95))',
                        border: 'rgba(252,211,77,0.3)',
                        iconBg: 'rgba(252,211,77,0.2)',
                        title: 'Warning',
                        duration: 6000
                    },
                    info: {
                        icon: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
                        bg: 'linear-gradient(135deg, rgba(59,130,246,0.95), rgba(79,70,229,0.95))',
                        border: 'rgba(147,197,253,0.3)',
                        iconBg: 'rgba(147,197,253,0.2)',
                        title: 'Info',
                        duration: 4000
                    }
                };
                return configs[type] || configs.info;
            },
            
            show(message, type = 'info', options = {}) {
                this.init();
                const config = this.getConfig(type);
                const id = 'notif-' + Date.now() + Math.random().toString(36).substr(2, 9);
                const duration = options.duration || config.duration;
                const showProgress = options.showProgress !== false;
                
                const cleanMessage = message.replace(/^[✅❌⚠️ℹ️✨🎉💡🔔]\s*/, '');
                
                const notification = document.createElement('div');
                notification.id = id;
                Object.assign(notification.style, {
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    backdropFilter: 'blur(12px)',
                    borderRadius: '14px',
                    boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)',
                    transform: 'translateX(110%)',
                    opacity: '0',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                    color: '#fff'
                });
                
                notification.innerHTML = `
                    <div style="padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px;">
                        <div style="background: ${config.iconBg}; border-radius: 50%; padding: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                            ${config.icon}
                        </div>
                        <div style="flex: 1; min-width: 0; padding-top: 2px;">
                            <div style="font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.95);">${config.title}</div>
                            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.82); margin-top: 2px; word-break: break-word;">${this.escapeHtml(cleanMessage)}</div>
                        </div>
                        <button onclick="NotificationSystem.dismiss('${id}')" style="flex-shrink: 0; padding: 4px; border-radius: 8px; border: none; background: transparent; color: rgba(255,255,255,0.5); cursor: pointer; transition: color 0.15s;">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    ${showProgress ? `<div style="height: 3px; background: rgba(255,255,255,0.15);"><div class="notif-progress" style="height: 100%; background: rgba(255,255,255,0.35); border-radius: 99px; width: 100%; transition: width ${duration}ms linear;"></div></div>` : ''}
                `;
                
                this.container.insertBefore(notification, this.container.firstChild);
                this.notifications.push({ id, element: notification, timeout: null });
                
                requestAnimationFrame(() => {
                    notification.style.transform = 'translateX(0)';
                    notification.style.opacity = '1';
                    
                    if (showProgress) {
                        const progressBar = notification.querySelector('.notif-progress');
                        if (progressBar) {
                            requestAnimationFrame(() => { progressBar.style.width = '0%'; });
                        }
                    }
                });
                
                const timeout = setTimeout(() => this.dismiss(id), duration);
                const notifRecord = this.notifications.find(n => n.id === id);
                if (notifRecord) notifRecord.timeout = timeout;
                
                this.enforceLimit();
                return id;
            },
            
            dismiss(id) {
                const index = this.notifications.findIndex(n => n.id === id);
                if (index === -1) return;
                
                const { element, timeout } = this.notifications[index];
                if (timeout) clearTimeout(timeout);
                
                element.style.transform = 'translateX(110%)';
                element.style.opacity = '0';
                element.style.marginTop = `-${element.offsetHeight + 10}px`;
                
                setTimeout(() => {
                    element.remove();
                    this.notifications.splice(index, 1);
                }, 300);
            },
            
            dismissAll() {
                [...this.notifications].forEach(n => this.dismiss(n.id));
            },
            
            enforceLimit() {
                while (this.notifications.length > this.maxVisible) {
                    const oldest = this.notifications[this.notifications.length - 1];
                    this.dismiss(oldest.id);
                }
            },
            
            escapeHtml(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            },
            
            success(message, options = {}) { return this.show(message, 'success', options); },
            error(message, options = {}) { return this.show(message, 'error', options); },
            warning(message, options = {}) { return this.show(message, 'warning', options); },
            info(message, options = {}) { return this.show(message, 'info', options); }
        };
        
        // Global notify shorthand
        const notify = {
            success: (msg, opts) => NotificationSystem.success(msg, opts),
            error: (msg, opts) => NotificationSystem.error(msg, opts),
            warning: (msg, opts) => NotificationSystem.warning(msg, opts),
            info: (msg, opts) => NotificationSystem.info(msg, opts),
            dismiss: (id) => NotificationSystem.dismiss(id),
            dismissAll: () => NotificationSystem.dismissAll()
        };
        
        // Backward compatible showToast
        function showToast(message, type = 'info', options = {}) {
            return NotificationSystem.show(message, type, options);
        }

        // OAuth Login - same as admin portal
        async function handleGoogleLogin() {
            try {
                showToast('Redirecting to Google...', 'info');
                const response = await fetch(`${API}/api/security/oauth/google/login`);
                const data = await response.json();
                
                if (data.auth_url) {
                    window.location.href = data.auth_url;
                } else {
                    showToast(data.detail || 'Google OAuth not configured', 'error');
                }
            } catch (e) {
                showToast('OAuth error: ' + e.message, 'error');
            }
        }

        async function handleMicrosoftLogin() {
            try {
                showToast('Redirecting to Microsoft...', 'info');
                const response = await fetch(`${API}/api/security/oauth/microsoft/login`);
                const data = await response.json();
                
                if (data.auth_url) {
                    window.location.href = data.auth_url;
                } else {
                    showToast(data.detail || 'Microsoft OAuth not configured', 'error');
                }
            } catch (e) {
                showToast('OAuth error: ' + e.message, 'error');
            }
        }

        function showLoginScreen() {
            const login = document.getElementById('login-screen');
            const chat = document.getElementById('chat-interface');
            if (login) login.classList.remove('hidden');
            if (chat) {
                chat.classList.add('hidden');
                chat.style.display = 'none';
            }
        }

        function showChatInterface() {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('chat-interface').classList.remove('hidden');
            document.getElementById('chat-interface').style.display = 'flex';
            
            // Update user info
            if (currentUser) {
                document.getElementById('user-name').textContent = currentUser.full_name || currentUser.email;
                document.getElementById('user-email').textContent = currentUser.email;
                document.getElementById('user-avatar').textContent = (currentUser.full_name || currentUser.email)[0].toUpperCase();
            }

            // Default landing is Home (better first impression than chat)
            try {
                const u = currentUser || {};
                const firstName = u.first_name || u.profile?.first_name || '';
                const lastName = u.last_name || u.profile?.last_name || '';
                const fullName = u.full_name || `${firstName} ${lastName}`.trim() || u.name || u.display_name || '';
                const displayName = fullName || (u.email ? u.email.split('@')[0] : '');
                const greeting = displayName ? `Welcome back, ${displayName.split(' ')[0]}` : 'Welcome';
                const el = document.getElementById('home-greeting');
                if (el) el.textContent = greeting;
            } catch (_) { /* ignore */ }
            switchView('home');
        }

        function _getAgentType(agent) {
            if (!agent || typeof agent !== 'object') return 'conversational';
            const raw = (agent.agent_type || agent.type || agent.kind || '').toString().trim().toLowerCase();
            if (raw) {
                if (raw === 'process' || raw === 'workflow' || raw === 'process_agent' || raw === 'process-agent') return 'process';
                if (raw === 'conversational' || raw === 'chat' || raw === 'assistant') return 'conversational';
            }
            // Reliable fallback: process agents carry a process definition (string or object)
            if (agent.process_definition) return 'process';
            // Additional heuristic: some backends might embed process metadata
            if (agent.extra_metadata && typeof agent.extra_metadata === 'object' && (agent.extra_metadata.process || agent.extra_metadata.workflow)) return 'process';
            return 'conversational';
        }

        function isPortalAdmin() {
            const perms = (currentUser && Array.isArray(currentUser.permissions)) ? currentUser.permissions : [];
            const set = new Set(perms.map(p => String(p || '').trim().toLowerCase()).filter(Boolean));
            return set.has('system:admin') || set.has('users:view') || set.has('users:edit');
        }

        function _fmtBadge(n) {
            const x = Number(n || 0);
            if (!isFinite(x) || x <= 0) return '';
            if (x >= 100) return '99+';
            return String(Math.floor(x));
        }

        function _setWorkTabBadges() {
            try {
                const counts = {
                    workflows: Array.isArray(workflowAgents) ? workflowAgents.length : 0,
                    requests: Array.isArray(myRequests) ? myRequests.length : 0,
                    inbox: Array.isArray(myApprovals) ? myApprovals.length : 0,
                };
                document.querySelectorAll('.work-tab-badge[data-badge]').forEach(el => {
                    const k = String(el.getAttribute('data-badge') || '').trim().toLowerCase();
                    const v = _fmtBadge(counts[k] || 0);
                    el.textContent = v;
                    el.classList.toggle('show', !!v);
                });
            } catch (_) { /* ignore */ }
        }

        function _setInboxBadge(count) {
            // Sidebar inbox badge has been removed. Keep function as a safe no-op
            // because other code paths may still call it.
            return;
        }

        function toggleNavGroup(groupId) {
            const id = String(groupId || '').trim().toLowerCase();
            if (!id) return;
            const sub = document.getElementById(`nav-subitems-${id}`);
            const chev = document.getElementById(`nav-chevron-${id}`);
            if (!sub) return;
            const isOpen = sub.classList.toggle('open');
            if (chev) chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
        }

        function openNavGroup(groupId) {
            const id = String(groupId || '').trim().toLowerCase();
            if (!id) return;
            const sub = document.getElementById(`nav-subitems-${id}`);
            const chev = document.getElementById(`nav-chevron-${id}`);
            if (!sub) return;
            sub.classList.add('open');
            if (chev) chev.style.transform = 'rotate(0deg)';
        }

        function switchView(view) {
            const v = String(view || 'home').trim().toLowerCase();
            currentView = v;

            // Nav active state
            document.querySelectorAll('.nav-item').forEach(item => {
                const key = String(item.dataset.view || '');
                item.classList.toggle('active', key === v);
            });

            // Show/hide view containers
            ['home', 'chat', 'workflows', 'requests', 'inbox'].forEach(name => {
                const el = document.getElementById(`view-${name}`);
                if (!el) return;
                el.classList.toggle('hidden', name !== v);
            });

            // Sidebar panels are always visible; only the New Chat button is chat-only
            const panels = document.getElementById('chat-sidebar-panels');
            if (panels) panels.classList.remove('hidden');
            const newChatBtn = document.getElementById('new-chat-btn');
            if (newChatBtn) newChatBtn.classList.toggle('hidden', v !== 'chat');

            // Close sidebar on mobile when navigating
            try { closeSidebar(); } catch (_) { /* ignore */ }

            // Work tabs active state (Process AI Agents area)
            try {
                document.querySelectorAll('.work-tabs .portal-tab').forEach(btn => {
                    btn.classList.toggle('active', String(btn.dataset.target || '') === v);
                });
            } catch (_) { /* ignore */ }

            // Lazy load data
            if (v === 'home') {
                renderHomeDashboard();
            } else if (v === 'workflows') {
                renderWorkflows();
            } else if (v === 'requests') {
                renderRequestsScopeAndFilterChips();
                refreshRequests();
            } else if (v === 'inbox') {
                refreshInbox();
            } else if (v === 'chat') {
                renderConversationalDirectory();
            }
        }

        // =============================================================================
        // DIRECTORY UX (Virtual list + filters)
        // =============================================================================

        const processSummaryCache = new Map(); // agent_id -> summary string

        async function _fetchProcessSummary(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return '';
            if (processSummaryCache.has(id)) return processSummaryCache.get(id) || '';
            try {
                const res = await fetch(`${API}/process/summarize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ agent_id: id })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) return '';
                const summary = String(data?.summary || '').trim();
                if (summary) processSummaryCache.set(id, summary);
                return summary;
            } catch (_) {
                return '';
            }
        }

        function _canEditSchedules() {
            const perms = (currentUser && Array.isArray(currentUser.permissions)) ? currentUser.permissions : [];
            const set = new Set(perms.map(p => String(p || '').trim().toLowerCase()).filter(Boolean));
            // Delegated admins or platform admins
            return set.has('agents:edit') || set.has('system:admin') || set.has('users:edit');
        }

        function _debounce(fn, delayMs = 160) {
            let t = null;
            return (...args) => {
                try { if (t) clearTimeout(t); } catch (_) {}
                t = setTimeout(() => fn(...args), delayMs);
            };
        }

        function _ensureVirtualScaffold(containerEl) {
            if (!containerEl) return null;
            if (containerEl.querySelector('.virtual-spacer') && containerEl.querySelector('.virtual-inner')) return containerEl;
            containerEl.innerHTML = `
                <div class="virtual-spacer"></div>
                <div class="virtual-inner"></div>
            `;
            return containerEl;
        }

        function renderVirtualList(containerEl, items, rowHeightPx, renderRowHtml, onAfterRender) {
            const root = _ensureVirtualScaffold(containerEl);
            if (!root) return;
            const spacer = root.querySelector('.virtual-spacer');
            const inner = root.querySelector('.virtual-inner');
            if (!spacer || !inner) return;

            const total = Array.isArray(items) ? items.length : 0;
            spacer.style.height = `${Math.max(0, total * rowHeightPx)}px`;

            const viewportH = root.clientHeight || 1;
            const scrollTop = root.scrollTop || 0;
            const start = Math.max(0, Math.floor(scrollTop / rowHeightPx) - 6);
            const visibleCount = Math.ceil(viewportH / rowHeightPx) + 12;
            const end = Math.min(total, start + visibleCount);

            inner.style.transform = `translateY(${start * rowHeightPx}px)`;
            inner.innerHTML = items.slice(start, end).map(renderRowHtml).join('');
            if (typeof onAfterRender === 'function') onAfterRender();

            if (!root._vfAttached) {
                root._vfAttached = true;
                let raf = null;
                root.addEventListener('scroll', () => {
                    if (raf) return;
                    raf = requestAnimationFrame(() => {
                        raf = null;
                        renderVirtualList(containerEl, items, rowHeightPx, renderRowHtml, onAfterRender);
                    });
                }, { passive: true });
                window.addEventListener('resize', () => {
                    renderVirtualList(containerEl, items, rowHeightPx, renderRowHtml, onAfterRender);
                });
            }
        }

        // =============================================================================
        // CONVERSATIONAL AI AGENTS DIRECTORY (split view)
        // =============================================================================

        let convCategoryFilter = 'All';
        let convTab = 'agents'; // agents | history

        const renderConversationalDirectory = _debounce(_renderConversationalDirectory, 120);

        function setConversationalTab(tab) {
            convTab = (tab === 'history') ? 'history' : 'agents';
            const aBtn = document.getElementById('conv-tab-agents');
            const hBtn = document.getElementById('conv-tab-history');
            if (aBtn) aBtn.classList.toggle('active', convTab === 'agents');
            if (hBtn) hBtn.classList.toggle('active', convTab === 'history');
            const aPanel = document.getElementById('conv-agents-panel');
            const hPanel = document.getElementById('conv-history-panel');
            if (aPanel) aPanel.classList.toggle('hidden', convTab !== 'agents');
            if (hPanel) hPanel.classList.toggle('hidden', convTab !== 'history');
            if (convTab === 'history') {
                try { loadConversations(); } catch (_) {}
            } else {
                renderConversationalDirectory();
            }
        }

        function _getConvCategory(agent) {
            const meta = (agent && agent.extra_metadata && typeof agent.extra_metadata === 'object') ? agent.extra_metadata : {};
            const raw = meta.category || meta.department || meta.domain || meta.team;
            const c = raw ? String(raw).trim() : '';
            return c || 'General';
        }

        function _renderConversationalDirectory() {
            const listEl = document.getElementById('agent-list');
            if (!listEl) return;

            const q = String(document.getElementById('conv-search')?.value || '').trim().toLowerCase();
            const items = Array.isArray(agents) ? agents.slice() : [];

            // Categories
            const catSet = new Set();
            items.forEach(a => catSet.add(_getConvCategory(a)));
            const cats = Array.from(catSet).sort((a, b) => a.localeCompare(b));
            const showCategoryChips = cats.length >= 2;
            const allCats = showCategoryChips ? ['All', ...cats] : cats;
            if (!allCats.includes(convCategoryFilter)) convCategoryFilter = allCats.includes('All') ? 'All' : (cats[0] || 'All');

            const chipsEl = document.getElementById('conv-category-chips');
            if (chipsEl) {
                chipsEl.innerHTML = '';
                if (!showCategoryChips) {
                    chipsEl.style.display = 'none';
                } else {
                    chipsEl.style.display = '';
                    allCats.slice(0, 18).forEach(cat => {
                        const chip = document.createElement('div');
                        chip.className = 'chip' + (cat === convCategoryFilter ? ' active' : '');
                        chip.textContent = cat;
                        chip.onclick = () => { convCategoryFilter = cat; renderConversationalDirectory(); };
                        chipsEl.appendChild(chip);
                    });
                }
            }

            const filtered = items
                .filter(a => {
                    const cat = _getConvCategory(a);
                    if (convCategoryFilter !== 'All' && cat !== convCategoryFilter) return false;
                    if (!q) return true;
                    const hay = `${a.name || ''} ${a.description || ''} ${cat}`.toLowerCase();
                    return hay.includes(q);
                })
                .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

            const countEl = document.getElementById('conv-count');
            if (countEl) countEl.textContent = filtered.length ? `${filtered.length}` : '';

            if (!filtered.length) {
                listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">No agents found.</div>`;
                return;
            }

            // Ensure list has height for virtualization
            listEl.style.height = 'calc(100vh - 360px)';
            const rowH = 64;
            renderVirtualList(
                listEl,
                filtered,
                rowH,
                (agent) => {
                    const id = String(agent?.id || '');
                    const icon = escapeHtml(agent?.icon || '💬');
                    const name = escapeHtml(agent?.name || 'Conversational AI Agent');
                    const desc = escapeHtml(agent?.description || '');
                    const cat = escapeHtml(_getConvCategory(agent));
                    const isActive = (currentAgent && String(currentAgent.id) === id);
                    return `
                        <div class="dir-row ${isActive ? 'active' : ''}" onclick="selectAgent('${id}')">
                            <div class="dir-icon">${icon}</div>
                            <div class="dir-main">
                                <div class="dir-title">${name}</div>
                                <div class="dir-sub">${desc || cat}</div>
                            </div>
                            <div class="dir-meta">
                                <span class="dir-chip">${cat}</span>
                            </div>
                        </div>
                    `;
                }
            );
        }

        async function _loadInboxForHome() {
            try {
                const res = await fetch(`${API}/process/approvals`, { headers: { ...getAuthHeaders() } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) return [];
                myApprovals = Array.isArray(data) ? data : (data.items || []);
                _setInboxBadge(myApprovals.length);
                return myApprovals;
            } catch (_) {
                return [];
            }
        }

        function renderHomeDashboard() {
            // Stats
            const aCount = Array.isArray(agents) ? agents.length : 0;
            const pCount = Array.isArray(workflowAgents) ? workflowAgents.length : 0;
            const iCount = Array.isArray(myApprovals) ? myApprovals.length : 0;
            const sA = document.getElementById('home-stat-assistants');
            const sP = document.getElementById('home-stat-processes');
            const sI = document.getElementById('home-stat-inbox');
            if (sA) sA.textContent = String(aCount);
            if (sP) sP.textContent = String(pCount);
            if (sI) sI.textContent = String(iCount);

            const aLabel = document.getElementById('home-assistants-label');
            const pLabel = document.getElementById('home-processes-label');
            if (aLabel) aLabel.textContent = aCount ? `${aCount} agent${aCount > 1 ? 's' : ''} available` : 'Conversational AI';
            if (pLabel) pLabel.textContent = pCount ? `${pCount} agent${pCount > 1 ? 's' : ''} available` : 'Requests & Approvals';
            const iLabel = document.getElementById('home-inbox-label');
            if (iLabel) iLabel.textContent = iCount ? `${iCount} item${iCount > 1 ? 's' : ''} waiting` : 'Approvals & Action Items';

            // Inbox preview (innovation: action cards)
            const inboxEl = document.getElementById('home-inbox');
            if (inboxEl) {
                const draw = (items) => {
                    const arr = Array.isArray(items) ? items.slice() : [];
                    const top = arr.slice(0, 4);
                    if (!top.length) {
                        inboxEl.innerHTML = `<div class="home-empty">No approvals waiting right now.</div>`;
                        return;
                    }
                    inboxEl.innerHTML = top.map(a => {
                        const id = String(a?.id || '');
                        const title = escapeHtml(a?.title || 'Approval');
                        const desc = escapeHtml(a?.description || '');
                        const rawUrgency = String(a?.urgency || '').toLowerCase();
                        const urgCls = (rawUrgency === 'high' || rawUrgency === 'critical') ? 'danger' : (rawUrgency ? 'warning' : 'muted');
                        const urgencyLabel = escapeHtml(humanizeUrgency(a?.urgency));
                        const dueRelative = _formatRelativeTime(a?.due_by || a?.deadline_at);
                        const dueText = dueRelative ? `Due ${escapeHtml(dueRelative)}` : 'Review required';
                        return `
                            <div class="home-inbox-card" onclick="switchView('inbox'); setTimeout(() => selectApproval('${id}'), 120);">
                                <div class="home-inbox-top">
                                    <div class="home-inbox-title" title="${title}">${title}</div>
                                    <span class="home-inbox-pill ${urgCls}">${urgencyLabel}</span>
                                </div>
                                <div class="home-inbox-desc">${desc || 'Review details and take action.'}</div>
                                <div class="home-inbox-cta">
                                    <span>${dueText}</span>
                                    <span class="arrow">→</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                };

                if (!Array.isArray(myApprovals) || myApprovals.length === 0) {
                    inboxEl.innerHTML = `<div class="home-empty">Loading your inbox…</div>`;
                    _loadInboxForHome().then(draw).catch(() => draw([]));
                } else {
                    draw(myApprovals);
                }
            }

            // Quick access: show recent conversational agents + process agents
            const container = document.getElementById('home-recent');
            if (!container) return;
            const items = [];
            // Recent conversational agents (up to 3)
            (agents || []).slice(0, 3).forEach(a => {
                items.push(`
                    <div class="home-recent-item" onclick="switchView('chat'); setTimeout(() => selectAgent('${a.id}'), 120);">
                        <div class="home-recent-icon chat-type">${a.icon || '💬'}</div>
                        <div class="home-recent-info">
                            <div class="home-recent-name">${escapeHtml(a.name)}</div>
                            <div class="home-recent-meta">Conversational AI Agent</div>
                        </div>
                    </div>
                `);
            });
            // Recent processes (up to 3)
            (workflowAgents || []).slice(0, 3).forEach(a => {
                items.push(`
                    <div class="home-recent-item" onclick="selectProcessAgent('${a.id}')">
                        <div class="home-recent-icon process-type">${a.icon || '🧩'}</div>
                        <div class="home-recent-info">
                            <div class="home-recent-name">${escapeHtml(a.name)}</div>
                            <div class="home-recent-meta">Process AI Agent</div>
                        </div>
                    </div>
                `);
            });
            if (items.length === 0) {
                container.innerHTML = '<div class="home-empty">Your recent activity will appear here once you start chatting or submitting requests.</div>';
            } else {
                container.innerHTML = items.join('');
            }
        }

        async function loadAgents() {
            
            try {
                // Use the accessible agents endpoint - returns only agents the user has access to
                const response = await fetch(`${API}/api/agents/accessible`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Failed to load agents:', response.status, errorText);
                    throw new Error('Failed to load agents');
                }
                
                const data = await response.json();
                console.log('📦 Raw agents data:', data);
                
                // Handle both array response and object with agents key
                allAccessibleAgents = Array.isArray(data) ? data : (data.agents || data.items || []);
                workflowAgents = (allAccessibleAgents || []).filter(a => _getAgentType(a) === 'process');
                agents = (allAccessibleAgents || []).filter(a => _getAgentType(a) !== 'process');
                renderAgents();
                renderWorkflows();
                renderHomeDashboard();
            } catch (e) {
                console.error('Failed to load agents:', e);
                allAccessibleAgents = [];
                workflowAgents = [];
                agents = [];
                renderAgents();
                renderWorkflows();
                renderHomeDashboard();
            }
        }

        function renderAgents() {
            // Sidebar agent cards were removed for scalability.
            // Render the in-page directory instead.
            try { renderConversationalDirectory(); } catch (_) {}
        }

        /* switchAssistantTab and renderProcessAgents removed — processes live in their own Processes section now */

        function selectWorkflowDirectoryItem(agentId) {
            const id = String(agentId || '').trim();
            const agent = (workflowAgents || []).find(a => String(a.id) === id);
            if (!agent) return;
            currentWorkflowAgent = agent;
            const titleEl = document.getElementById('workflow-detail-title');
            const subEl = document.getElementById('workflow-detail-subtitle');
            const bodyEl = document.getElementById('workflow-detail-body');
            if (titleEl) titleEl.textContent = agent.name || 'Process AI Agent';
            if (subEl) subEl.textContent = 'Review details, then submit a request.';
            if (bodyEl) {
                const icon = escapeHtml(agent.icon || '🧩');
                const baseDesc = escapeHtml(_buildWorkflowSubtitle(agent));
                const category = escapeHtml(_getWorkflowCategory(agent));
                const trig = _getWorkflowTriggerInfo(agent);
                const appr = _getWorkflowApprovalInfo(agent);
                const canRunNow = (trig.triggerType === 'manual') || isPortalAdmin();
                const cta = canRunNow ? _serviceCtaLabel(agent) : 'View';
                const triggerLabel = escapeHtml(trig.label || '');
                const triggerDetail = escapeHtml(trig.detail || '');
                const isSchedule = trig.triggerType === 'schedule';
                const scheduleEditor = (isSchedule && _canEditSchedules()) ? `
                    <div style="margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:12px; background: color-mix(in srgb, var(--bg-card) 92%, var(--bg-primary));">
                        <div style="font-weight:850; font-size:0.9rem; margin-bottom:6px;">Schedule</div>
                        <div style="color: var(--text-muted); font-size:0.85rem; line-height:1.4;">
                            ${triggerDetail ? `Current schedule: <strong>${triggerDetail}</strong>` : 'Current schedule is configured.'}
                        </div>
                        <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                            <button class="portal-btn" onclick="openScheduleModal('${id}')">Edit schedule</button>
                        </div>
                    </div>
                ` : '';
                bodyEl.innerHTML = `
                    <div class="request-hero ${canRunNow ? 'success' : 'muted'}">
                        <div class="request-hero-icon">${icon}</div>
                        <div class="request-hero-info">
                            <div style="font-weight:850; font-size:1.05rem; line-height:1.2;">${escapeHtml(agent.name || 'Process AI Agent')}</div>
                            <div class="request-hero-meta">
                                <span>${category}</span>
                                <span>•</span>
                                <span>${triggerLabel}${triggerDetail ? ` — ${triggerDetail}` : ''}</span>
                                ${appr.hasApproval ? `<span>•</span><span>${escapeHtml(appr.label)}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
                        ${canRunNow ? `<button class="portal-btn portal-btn-primary" type="button" onclick="openWorkflowRunModal('${id}')">${escapeHtml(cta)}</button>` : ''}
                        ${(isSchedule && _canEditSchedules()) ? `<button class="portal-btn" type="button" onclick="openScheduleModal('${id}')">Edit schedule</button>` : ''}
                    </div>

                    <div class="detail-section">
                        <div class="detail-section-header">Overview</div>
                        <div class="detail-section-body">
                            <div id="workflow-overview-text" style="color:var(--text-secondary); line-height:1.55;">${baseDesc}</div>
                        </div>
                    </div>

                    ${scheduleEditor}
                `;

                // Replace overview with LLM summary (cached), without exposing generation prompt text
                _fetchProcessSummary(id).then(summary => {
                    const el = document.getElementById('workflow-overview-text');
                    if (el && summary) el.textContent = summary;
                }).catch(() => {});
            }
            renderWorkflows();
        }

        function selectProcessAgent(agentId) {
            const agent = (workflowAgents || []).find(a => a.id === agentId);
            if (!agent) {
                showToast('Process not found', 'error');
                return;
            }
            const trig = _getWorkflowTriggerInfo(agent);
            // Manual (form) → open modal with inputs
            if (trig.triggerType === 'manual') {
                openWorkflowRunModal(agentId);
                return;
            }
            // Schedule/webhook (automation) → admins can run now; others go to Workflows/Runs
            if (trig.triggerType === 'schedule' || trig.triggerType === 'webhook') {
                if (isPortalAdmin()) {
                    runWorkflowDirectly(agentId);
                } else {
                    showToast('This process runs on a schedule. Use the Runs tab to view progress.', 'info');
                    switchView('workflows');
                }
                return;
            }
            openWorkflowRunModal(agentId);
        }

        async function runWorkflowDirectly(agentId) {
            const agent = (workflowAgents || []).find(a => a.id === agentId);
            if (!agent) {
                showToast('Process not found', 'error');
                return;
            }
            try {
                showToast('Submitting…', 'info', { duration: 1200 });
                const response = await fetch(`${API}/process/execute-fast`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        agent_id: agent.id,
                        trigger_input: {},
                        trigger_type: 'manual'
                    })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const rawMsg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : '';
                    throw new Error(friendlyErrorMessage(rawMsg, 'Failed to start this process. Please try again.'));
                }
                const executionId = data?.id || data?.execution_id || data?.executionId;
                showToast('Process started successfully', 'success');
                if (executionId) {
                    selectedExecutionId = String(executionId);
                    switchView('requests');
                }
            } catch (e) {
                console.error('runWorkflowDirectly error:', e);
                showToast(e?.message || 'Failed to start this process. Please try again.', 'error');
            }
        }

        // =============================================================================
        // PORTAL: WORKFLOWS (PROCESS AGENTS)
        // =============================================================================

        function _serviceCtaLabel(agent) {
            const name = String(agent?.name || '').toLowerCase();
            if (/request|leave|absence|time.?off|vacation/i.test(name)) return 'Submit Request';
            if (/report|incident|complaint|issue|ticket/i.test(name)) return 'Report';
            if (/apply|application|enroll/i.test(name)) return 'Apply';
            if (/register|registration|sign.?up/i.test(name)) return 'Register';
            if (/survey|feedback|evaluation|review/i.test(name)) return 'Start';
            if (/order|purchase|procurement/i.test(name)) return 'Place Order';
            if (/booking|reservation|schedule/i.test(name)) return 'Book';
            const appr = _getWorkflowApprovalInfo(agent);
            if (appr.hasApproval) return 'Submit Request';
            return 'Get Started';
        }

        function _getWorkflowCategory(agent) {
            const meta = (agent && agent.extra_metadata && typeof agent.extra_metadata === 'object') ? agent.extra_metadata : {};
            const raw = meta.category || meta.department || meta.domain || meta.team;
            const c = raw ? String(raw).trim() : '';
            return c || 'General';
        }

        function _parseProcessDefinition(agent) {
            let def = agent?.process_definition;
            if (typeof def === 'string') {
                try { def = def ? JSON.parse(def) : null; } catch (_) { def = null; }
            }
            if (!def || typeof def !== 'object') def = {};
            return def;
        }

        function _getWorkflowTriggerInfo(agent) {
            const def = _parseProcessDefinition(agent);
            const nodes = Array.isArray(def.nodes) ? def.nodes : [];
            const triggerNode =
                nodes.find(n => n && (n.type === 'trigger' || n.type === 'form' || n.type === 'start')) ||
                nodes.find(n => n && (n.type === 'schedule' || n.type === 'webhook'));

            let triggerType = 'manual';
            let cfg = {};
            if (triggerNode) {
                cfg = triggerNode.config || {};
                const typeCfg = cfg.type_config || cfg;
                if (triggerNode.type === 'schedule') triggerType = 'schedule';
                else if (triggerNode.type === 'webhook') triggerType = 'webhook';
                else triggerType = String(typeCfg.triggerType || cfg.triggerType || 'manual').trim().toLowerCase();
                cfg = { ...cfg, ...typeCfg };
            }
            if (!['manual', 'schedule', 'webhook'].includes(triggerType)) triggerType = 'manual';

            let label = 'Manual (Form)';
            let detail = '';
            if (triggerType === 'schedule') {
                label = 'Scheduled';
                const cron = String(cfg.cron || cfg.cron_expression || cfg.cronExpression || '').trim();
                const tz = String(cfg.timezone || 'UTC').trim() || 'UTC';
                // Business-friendly schedule text (avoid exposing cron)
                const m = cron.match(/^(\d+)\s+(\d+)\s+(\*|\d+)\s+(\*|\d+)\s+(\*|\d+)$/);
                if (m) {
                    const mm = String(m[1]).padStart(2, '0');
                    const hh = String(m[2]).padStart(2, '0');
                    const domPart = m[3];
                    const dowPart = m[5];
                    const time = `${hh}:${mm}`;
                    const dowNames = { '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday' };
                    if (domPart !== '*' && dowPart === '*') {
                        detail = `Every month on day ${domPart} at ${time} (${tz})`;
                    } else if (domPart === '*' && dowPart !== '*') {
                        detail = `Every ${dowNames[String(dowPart)] || 'week'} at ${time} (${tz})`;
                    } else {
                        detail = `Every day at ${time} (${tz})`;
                    }
                } else if (tz) {
                    detail = `Scheduled (${tz})`;
                }
            } else if (triggerType === 'webhook') {
                label = 'Integration (Webhook)';
                const method = String(cfg.method || 'POST').toUpperCase();
                const path = cfg.path || '/trigger';
                detail = `${method} ${path}`;
            }
            return { triggerType, label, detail, raw: cfg };
        }

        // =============================================================================
        // SCHEDULE EDIT (Process AI Agents)
        // =============================================================================

        let _scheduleEditingAgentId = null;

        function _ensureScheduleDomOptions() {
            const domEl = document.getElementById('schedule-dom');
            if (!domEl || domEl.options.length > 0) return;
            for (let d = 1; d <= 28; d++) {
                const opt = document.createElement('option');
                opt.value = String(d);
                opt.textContent = String(d);
                domEl.appendChild(opt);
            }
            domEl.value = '1';
        }

        function openScheduleModal(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return;
            const agent = (workflowAgents || []).find(a => String(a.id) === id);
            if (!agent) return;
            const trig = _getWorkflowTriggerInfo(agent);
            if (trig.triggerType !== 'schedule') {
                showToast('This agent is not scheduled.', 'info');
                return;
            }
            if (!_canEditSchedules()) {
                showToast('You do not have permission to edit schedules.', 'error');
                return;
            }
            _scheduleEditingAgentId = id;
            _ensureScheduleDomOptions();

            const modal = document.getElementById('schedule-modal');
            const enabledToggle = document.getElementById('schedule-enabled-toggle');
            const freqEl = document.getElementById('schedule-frequency');
            const timeEl = document.getElementById('schedule-time');
            const dowEl = document.getElementById('schedule-dow');
            const domEl = document.getElementById('schedule-dom');
            const tzEl = document.getElementById('schedule-timezone');
            const statusEl = document.getElementById('schedule-status');

            const cfg = (trig.raw && typeof trig.raw === 'object') ? trig.raw : {};
            const cron = String(cfg.cron || cfg.cron_expression || cfg.cronExpression || '').trim();
            const tz = String(cfg.timezone || 'UTC').trim() || 'UTC';
            const enabled = (cfg.enabled === undefined) ? true : !!cfg.enabled;
            if (enabledToggle) enabledToggle.classList.toggle('active', enabled);
            if (tzEl) tzEl.value = tz;
            if (statusEl) statusEl.textContent = '';

            // Parse simple cron patterns: "M H * * *" daily, "M H * * D" weekly, "M H DOM * *" monthly
            let freq = 'daily';
            let hhmm = '09:00';
            let dow = '1';
            let dom = '1';
            const m = cron.match(/^(\d+)\s+(\d+)\s+(\*|\d+)\s+(\*|\d+)\s+(\*|\d+)$/);
            if (m) {
                const mm = String(m[1]).padStart(2, '0');
                const hh = String(m[2]).padStart(2, '0');
                hhmm = `${hh}:${mm}`;
                const domPart = m[3];
                const dowPart = m[5];
                if (domPart !== '*' && dowPart === '*') {
                    freq = 'monthly';
                    dom = String(domPart);
                } else if (domPart === '*' && dowPart !== '*') {
                    freq = 'weekly';
                    dow = String(dowPart);
                } else {
                    freq = 'daily';
                }
            }
            if (freqEl) freqEl.value = freq;
            if (timeEl) timeEl.value = hhmm;
            if (dowEl) dowEl.value = dow;
            if (domEl) domEl.value = dom;

            if (modal) modal.classList.add('open');
        }

        function closeScheduleModal() {
            const modal = document.getElementById('schedule-modal');
            if (modal) modal.classList.remove('open');
            _scheduleEditingAgentId = null;
        }

        async function saveSchedule() {
            const id = String(_scheduleEditingAgentId || '').trim();
            if (!id) return;
            const enabledToggle = document.getElementById('schedule-enabled-toggle');
            const freqEl = document.getElementById('schedule-frequency');
            const timeEl = document.getElementById('schedule-time');
            const dowEl = document.getElementById('schedule-dow');
            const domEl = document.getElementById('schedule-dom');
            const tzEl = document.getElementById('schedule-timezone');
            const statusEl = document.getElementById('schedule-status');
            const btn = document.getElementById('schedule-save-btn');

            const enabled = enabledToggle ? enabledToggle.classList.contains('active') : true;
            const freq = String(freqEl?.value || 'daily');
            const hhmm = String(timeEl?.value || '09:00');
            const tz = String(tzEl?.value || 'UTC').trim() || 'UTC';
            const [hh, mm] = hhmm.split(':').map(x => parseInt(x, 10));
            const safeH = Number.isFinite(hh) ? hh : 9;
            const safeM = Number.isFinite(mm) ? mm : 0;

            let cron = `${safeM} ${safeH} * * *`; // daily default
            if (freq === 'weekly') {
                const dow = String(dowEl?.value || '1');
                cron = `${safeM} ${safeH} * * ${dow}`;
            } else if (freq === 'monthly') {
                const dom = String(domEl?.value || '1');
                cron = `${safeM} ${safeH} ${dom} * *`;
            }

            try {
                if (btn) btn.disabled = true;
                if (statusEl) statusEl.textContent = 'Saving…';
                const res = await fetch(`${API}/process/agents/${id}/schedule`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ cron, timezone: tz, enabled })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = (data && (data.detail || data.message)) ? (data.detail || data.message) : 'Failed to update schedule';
                    throw new Error(friendlyErrorMessage(msg, 'Unable to update schedule. Please try again.'));
                }
                if (statusEl) statusEl.textContent = 'Saved successfully.';
                showToast('Schedule updated', 'success');
                closeScheduleModal();
                await loadAgents();
                selectWorkflowDirectoryItem(id);
            } catch (e) {
                console.error('saveSchedule error:', e);
                showToast(e?.message || 'Unable to update schedule', 'error');
                if (statusEl) statusEl.textContent = '';
            } finally {
                if (btn) btn.disabled = false;
            }
        }

        function _getWorkflowApprovalInfo(agent) {
            const def = _parseProcessDefinition(agent);
            const nodes = Array.isArray(def.nodes) ? def.nodes : [];
            const types = nodes.map(n => String(n?.type || '').trim().toLowerCase()).filter(Boolean);
            const hasApproval = types.includes('approval');
            const hasHumanTask = types.includes('human_task') || types.includes('human-task') || types.includes('human');
            const label = hasApproval ? 'Approvals' : (hasHumanTask ? 'Human step' : 'No approvals');
            return { hasApproval, hasHumanTask, label };
        }

        function viewWorkflowRuns(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return;
            requestsWorkflowFilterId = id;
            selectedExecutionId = null;

            const t = _getWorkflowTriggerInfo((workflowAgents || []).find(a => a.id === id));
            const isTruePortalAdmin = !!(currentUser && (currentUser.portal_access === 'admin' || currentUser.is_admin === true));
            if (isTruePortalAdmin && t && t.triggerType !== 'manual') {
                // Automations often run under system/service context → default to org runs for admins.
                requestsScope = 'org';
            }

            try {
                const s = document.getElementById('requests-search');
                if (s) s.value = '';
            } catch (_) { /* ignore */ }
            switchView('requests');
        }

        function clearRequestsWorkflowFilter() {
            requestsWorkflowFilterId = null;
            selectedExecutionId = null;
            refreshRequests();
        }

        function setWorkflowCategoryFilter(category) {
            // If category chips are hidden (single category), avoid forcing 'All'
            workflowCategoryFilter = category || workflowCategoryFilter || 'All';
            renderWorkflows();
        }

        function refreshWorkflows() {
            showToast('Refreshing…', 'info', { duration: 1000 });
            loadAgents();
        }

        function renderWorkflows() {
            const chipsEl = document.getElementById('workflow-category-chips');
            const listEl = document.getElementById('workflow-list');
            const detailBody = document.getElementById('workflow-detail-body');
            const detailTitle = document.getElementById('workflow-detail-title');
            const detailSub = document.getElementById('workflow-detail-subtitle');
            const countEl = document.getElementById('workflow-count');
            const quickEl = document.getElementById('workflow-quick-filters');
            if (!chipsEl || !listEl) return;

            const q = String(document.getElementById('workflow-search')?.value || '').trim().toLowerCase();
            const items = Array.isArray(workflowAgents) ? workflowAgents.slice() : [];
            _setWorkTabBadges();

            const catSet = new Set();
            items.forEach(a => catSet.add(_getWorkflowCategory(a)));
            const cats = Array.from(catSet).sort((a, b) => a.localeCompare(b));
            const showCategoryChips = cats.length >= 2;
            const allCats = showCategoryChips ? ['All', ...cats] : cats;
            if (!allCats.includes(workflowCategoryFilter)) workflowCategoryFilter = allCats.includes('All') ? 'All' : (cats[0] || 'All');

            // Chips
            chipsEl.innerHTML = '';
            if (!showCategoryChips) {
                // If there is only one category (often "General"), chips add no value.
                chipsEl.style.display = 'none';
            } else {
                chipsEl.style.display = '';
                allCats.forEach(cat => {
                    const chip = document.createElement('div');
                    chip.className = 'chip' + (cat === workflowCategoryFilter ? ' active' : '');
                    chip.textContent = cat;
                    chip.onclick = () => setWorkflowCategoryFilter(cat);
                    chipsEl.appendChild(chip);
                });
            }

            // Quick filters (trigger + approvals)
            if (quickEl) {
                const mk = (id, label, active, onClick) => {
                    const chip = document.createElement('div');
                    chip.className = 'chip' + (active ? ' active' : '');
                    chip.textContent = label;
                    chip.onclick = onClick;
                    return chip;
                };
                quickEl.innerHTML = '';
                quickEl.appendChild(mk('all', 'All', workflowTriggerFilter === 'all', () => { workflowTriggerFilter = 'all'; renderWorkflows(); }));
                quickEl.appendChild(mk('manual', 'Request-based', workflowTriggerFilter === 'manual', () => { workflowTriggerFilter = 'manual'; renderWorkflows(); }));
                quickEl.appendChild(mk('schedule', 'Scheduled', workflowTriggerFilter === 'schedule', () => { workflowTriggerFilter = 'schedule'; renderWorkflows(); }));
                quickEl.appendChild(mk('webhook', 'Integration', workflowTriggerFilter === 'webhook', () => { workflowTriggerFilter = 'webhook'; renderWorkflows(); }));
                quickEl.appendChild(mk('ap_all', 'Approvals: Any', workflowApprovalFilter === 'all', () => { workflowApprovalFilter = 'all'; renderWorkflows(); }));
                quickEl.appendChild(mk('ap_yes', 'Approvals: Required', workflowApprovalFilter === 'approvals', () => { workflowApprovalFilter = 'approvals'; renderWorkflows(); }));
                quickEl.appendChild(mk('ap_no', 'Approvals: None', workflowApprovalFilter === 'no_approvals', () => { workflowApprovalFilter = 'no_approvals'; renderWorkflows(); }));
            }

            const filtered = items.filter(a => {
                const cat = _getWorkflowCategory(a);
                if (workflowCategoryFilter !== 'All' && cat !== workflowCategoryFilter) return false;
                const trig = _getWorkflowTriggerInfo(a);
                const appr = _getWorkflowApprovalInfo(a);
                const isManual = trig.triggerType === 'manual';
                const isSchedule = trig.triggerType === 'schedule';
                const isWebhook = trig.triggerType === 'webhook';
                if (workflowTriggerFilter === 'manual' && !isManual) return false;
                if (workflowTriggerFilter === 'schedule' && !isSchedule) return false;
                if (workflowTriggerFilter === 'webhook' && !isWebhook) return false;
                if (workflowApprovalFilter === 'approvals' && !appr.hasApproval) return false;
                if (workflowApprovalFilter === 'no_approvals' && appr.hasApproval) return false;
                if (!q) return true;
                const hay = `${a.name || ''} ${a.description || ''} ${cat}`.toLowerCase();
                return hay.includes(q);
            }).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

            if (!filtered.length) {
                if (countEl) countEl.textContent = '';
                listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">No Process AI Agents found.</div>`;
                if (detailTitle) detailTitle.textContent = 'Select a Process AI Agent';
                if (detailSub) detailSub.textContent = 'Review details, then submit a request.';
                if (detailBody) detailBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🧩</div>
                        <div class="empty-state-title">No Process AI Agents found</div>
                        <div class="empty-state-desc">Try adjusting filters, or contact your administrator if you expect agents here.</div>
                    </div>
                `;
                return;
            }

            if (countEl) countEl.textContent = `${filtered.length}`;

            const rowH = 68;
            listEl.style.height = 'calc(100vh - 360px)';
            renderVirtualList(
                listEl,
                filtered,
                rowH,
                (a) => {
                    const id = String(a?.id || '');
                    const icon = escapeHtml(a?.icon || '🧩');
                    const name = escapeHtml(a?.name || 'Process AI Agent');
                    // Never show internal generation prompts/descriptions in the end-user portal.
                    const desc = escapeHtml(_buildWorkflowSubtitle(a));
                    const category = escapeHtml(_getWorkflowCategory(a));
                    const trig = _getWorkflowTriggerInfo(a);
                    const appr = _getWorkflowApprovalInfo(a);
                    const isManual = trig.triggerType === 'manual';
                    const canRunNow = isManual || isPortalAdmin();
                    const chip = isManual ? `<span class="dir-chip success">Request</span>` : (trig.triggerType === 'schedule' ? `<span class="dir-chip warning">Scheduled</span>` : `<span class="dir-chip warning">Integration</span>`);
                    const chip2 = appr.hasApproval ? `<span class="dir-chip">Approvals</span>` : '';
                    const active = (currentWorkflowAgent && String(currentWorkflowAgent.id) === id);
                    return `
                        <div class="dir-row ${active ? 'active' : ''}" onclick="selectWorkflowDirectoryItem('${id}')">
                            <div class="dir-icon">${icon}</div>
                            <div class="dir-main">
                                <div class="dir-title">${name}</div>
                                <div class="dir-sub">${desc}</div>
                            </div>
                            <div class="dir-meta">
                                <span class="dir-chip">${category}</span>
                                ${chip}
                                ${chip2}
                            </div>
                        </div>
                    `;
                }
            );

            // Auto-select first item if none selected
            if (!currentWorkflowAgent || !filtered.some(x => String(x.id) === String(currentWorkflowAgent.id))) {
                selectWorkflowDirectoryItem(String(filtered[0].id));
            }
        }

        // =============================================================================
        // PORTAL: WORKFLOW RUN MODAL (INPUTS + PREFILL + DERIVED)
        // =============================================================================

        function _wfElId(fieldId) {
            return 'wf-' + String(fieldId || '').trim().replace(/[^A-Za-z0-9_-]/g, '-');
        }

        function _buildWorkflowSubtitle(agent) {
            const desc = (agent && agent.description) ? String(agent.description).trim() : '';
            if (desc && desc.length <= 220) return desc;
            try {
                const name = (agent && agent.name) ? String(agent.name) : 'This process';
                let def = agent ? agent.process_definition : null;
                if (typeof def === 'string') { try { def = def ? JSON.parse(def) : {}; } catch (_) { def = {}; } }
                if (!def || typeof def !== 'object') def = {};
                const nodes = Array.isArray(def.nodes) ? def.nodes : [];
                const types = new Set(nodes.map(n => String(n?.type || '').toLowerCase().trim()).filter(Boolean));
                let fields = [];
                try {
                    const nodeType = (n) => String(n?.type || '').toLowerCase().trim();
                    const startLike = nodes.find(n => nodeType(n) === 'form') || nodes.find(n => ['trigger', 'start'].includes(nodeType(n)));
                    const cfg = startLike ? (startLike.config || {}) : {};
                    const typeCfg = cfg.type_config || cfg.typeConfig || cfg;
                    fields = (typeCfg.fields || cfg.fields || typeCfg.input_fields || cfg.input_fields || typeCfg.inputFields || cfg.inputFields || []) || [];
                } catch (_) { fields = []; }
                const labels = (Array.isArray(fields) ? fields : [])
                    .map(f => f && (f.label || f.name || f.id) ? String(f.label || f.name || f.id) : '')
                    .filter(Boolean)
                    .slice(0, 3);
                const inputPart = labels.length
                    ? (labels.length === 1 ? `collects ${labels[0]}` : `collects ${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`)
                    : 'collects the required information';
                const parts = [inputPart];
                if (types.has('ai') || types.has('ai_task') || types.has('extract_file')) parts.push('uses AI to process the information');
                if (types.has('condition') || types.has('decision')) parts.push('routes the request based on the rules');
                if (types.has('approval')) parts.push('requests approval when needed');
                if (types.has('notification')) parts.push('sends notifications to keep you informed');
                const txt = `${name} ${parts.join(', then ')}.`;
                return txt.length > 220 ? (txt.slice(0, 217).trimEnd() + '…') : txt;
            } catch (_) {
                return 'Fill in the form below to start this process.';
            }
        }

        async function openWorkflowRunModal(agentId) {
            const agent = (workflowAgents || []).find(a => a.id === agentId);
            if (!agent) {
                showToast('Process not found', 'error');
                return;
            }

            currentWorkflowAgent = agent;
            workflowRunInputs = [];

            const modal = document.getElementById('workflow-run-modal');
            const titleEl = document.getElementById('workflow-run-title');
            const descEl = document.getElementById('workflow-run-desc');
            const statusEl = document.getElementById('workflow-run-status');
            const btn = document.getElementById('workflow-run-btn');

            if (titleEl) titleEl.textContent = agent.name || 'New Request';
            if (descEl) {
                descEl.textContent = 'Loading…';
                _fetchProcessSummary(String(agentId || '').trim()).then(summary => {
                    if (!descEl) return;
                    descEl.textContent = String(summary || '').trim() || _buildWorkflowSubtitle(agent);
                }).catch(() => {
                    if (!descEl) return;
                    descEl.textContent = _buildWorkflowSubtitle(agent);
                });
            }
            if (statusEl) statusEl.textContent = '';
            if (btn) { btn.style.display = ''; btn.disabled = false; btn.textContent = _serviceCtaLabel(agent); }

            await buildWorkflowRunForm(agent);
            if (modal) modal.classList.add('open');
        }

        function closeWorkflowRunModal() {
            const modal = document.getElementById('workflow-run-modal');
            if (modal) modal.classList.remove('open');
            currentWorkflowAgent = null;
            workflowRunInputs = [];
            const form = document.getElementById('workflow-form-fields');
            if (form) form.innerHTML = '';
            const statusEl = document.getElementById('workflow-run-status');
            if (statusEl) statusEl.textContent = '';
            const btn = document.getElementById('workflow-run-btn');
            if (btn) { btn.style.display = ''; btn.disabled = false; }
        }

        function _splitArgs(argString) {
            const s = String(argString || '');
            const out = [];
            let cur = '';
            let q = '';
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (q) {
                    if (ch === q) q = '';
                    cur += ch;
                    continue;
                }
                if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
                if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
                cur += ch;
            }
            if (cur.trim()) out.push(cur.trim());
            return out;
        }

        function _resolveArgToken(token, values) {
            const t = String(token || '').trim();
            if (!t) return '';
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
            if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
            const key = t.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
            return (values && key in values) ? values[key] : '';
        }

        function evaluateDerivedExpression(expression, values) {
            const expr = String(expression || '').trim();
            if (!expr) return '';
            if (/^[A-Za-z][A-Za-z0-9_]*$/.test(expr)) return (values && expr in values) ? values[expr] : '';
            const m = expr.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\((.*)\)\s*$/);
            if (!m) return '';
            const fn = m[1];
            const args = _splitArgs(m[2]).map(a => _resolveArgToken(a, values));
            const toNum = (v) => {
                if (typeof v === 'number') return v;
                const n = parseFloat(String(v || '').trim());
                return Number.isFinite(n) ? n : 0;
            };
            const toStr = (v) => (v == null ? '' : String(v));
            const toDate = (v) => {
                const s = String(v || '').trim();
                if (!s) return null;
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d;
            };
            switch (fn) {
                case 'daysBetween': {
                    const d1 = toDate(args[0]);
                    const d2 = toDate(args[1]);
                    if (!d1 || !d2) return '';
                    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
                    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
                    return Math.floor((utc2 - utc1) / 86400000) + 1;
                }
                case 'concat':
                    return args.map(toStr).join('');
                case 'sum':
                    return args.reduce((acc, v) => acc + toNum(v), 0);
                case 'round': {
                    const n = toNum(args[0]);
                    const p = Math.max(0, Math.min(8, Math.floor(toNum(args[1] ?? 0))));
                    const f = Math.pow(10, p);
                    return Math.round(n * f) / f;
                }
                case 'toNumber':
                    return toNum(args[0]);
                default:
                    return '';
            }
        }

        function collectWorkflowFormValues(inputs) {
            const values = {};
            (inputs || []).forEach(input => {
                const el = document.getElementById(_wfElId(input.id));
                values[input.id] = el ? el.value : '';
            });
            return values;
        }

        function recomputeWorkflowDerivedFields(inputs) {
            const derivedInputs = (inputs || []).filter(i => i && i.derived && i.derived.expression);
            if (!derivedInputs.length) return;
            const values = collectWorkflowFormValues(inputs);
            derivedInputs.forEach(di => {
                const el = document.getElementById(_wfElId(di.id));
                if (!el) return;
                const v = evaluateDerivedExpression(di.derived.expression, values);
                const text = (v == null) ? '' : String(v);
                el.value = text;
                values[di.id] = text;
            });
        }

        /**
         * DYNAMIC user prefill resolver — works with ANY attribute.
         * Instead of a hardcoded list, this searches through:
         *   1. Direct properties on currentUser (from /auth/me)
         *   2. currentUser.profile (nested profile data)
         *   3. currentUser.custom_attributes (HR/LDAP custom fields)
         *   4. currentUser.department (nested department object)
         * Supports camelCase keys (from AI) mapped to snake_case data.
         * Arrays are auto-joined as comma-separated strings for display.
         */
        function getCurrentUserPrefillValue(key) {
            const k = String(key || '').trim();
            if (!currentUser) return '';

            // --- Convenience aliases for common keys ---
            const aliases = {
                'name': ['full_name', 'name', 'display_name'],
                'firstName': ['first_name'],
                'lastName': ['last_name'],
                'orgId': ['org_id'],
                'managerId': ['manager_id'],
                'managerName': ['manager_name'],
                'managerEmail': ['manager_email'],
                'departmentId': ['department_id'],
                'departmentName': ['department_name'],
                'jobTitle': ['job_title'],
                'employeeId': ['employee_id'],
                'isManager': ['is_manager'],
                'roleNames': ['role_names'],
                'groupNames': ['group_names'],
                'groupIds': ['group_ids'],
                'roleIds': ['role_ids'],
                'directReportCount': ['direct_report_count'],
                'hireDate': ['hire_date'],
                'officeLocation': ['office_location'],
                'costCenter': ['cost_center'],
                'nationalId': ['national_id'],
                'badgeNumber': ['badge_number'],
            };

            // Convert camelCase key to snake_case for data lookup
            const toSnake = s => s.replace(/([A-Z])/g, '_$1').toLowerCase();
            const snakeKey = toSnake(k);

            // Build a list of candidate keys to try
            const candidates = [k, snakeKey, ...(aliases[k] || [])];

            // --- Search layers (ordered by priority) ---
            const layers = [
                currentUser,                        // Direct props (email, manager_id, etc.)
                currentUser.profile || {},           // Nested profile
                currentUser.custom_attributes || {}, // HR/LDAP custom attributes
                currentUser.department || {},        // Department object
            ];

            for (const candidate of candidates) {
                for (const layer of layers) {
                    const val = layer[candidate];
                    if (val !== undefined && val !== null && val !== '') {
                        return _formatPrefillValue(val);
                    }
                }
            }

            // Special: for 'roles' / 'groups', handle the complex array-of-objects case
            if (k === 'roles' || k === 'roleNames') {
                const arr = currentUser.role_names || currentUser.roles;
                if (Array.isArray(arr)) return arr.map(r => r?.name || r?.id || r).filter(Boolean).join(', ');
            }
            if (k === 'groups' || k === 'groupNames') {
                const arr = currentUser.group_names || currentUser.groups;
                if (Array.isArray(arr)) return arr.map(g => g?.name || g?.id || g).filter(Boolean).join(', ');
            }

            return '';
        }

        /** Format a value for display in a form field */
        function _formatPrefillValue(val) {
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return String(val);
            if (typeof val === 'number') return String(val);
            if (Array.isArray(val)) return val.map(v => (typeof v === 'object' && v !== null) ? (v.name || v.label || v.id || JSON.stringify(v)) : String(v)).filter(Boolean).join(', ');
            if (typeof val === 'object') return val.name || val.label || val.id || JSON.stringify(val);
            return String(val);
        }

        function applyWorkflowPrefill(inputs) {
            (inputs || []).forEach(input => {
                if (!input || !input.prefill || input.prefill.source !== 'currentUser') return;
                const el = document.getElementById(_wfElId(input.id));
                if (!el) return;
                const v = getCurrentUserPrefillValue(input.prefill.key);
                if (v !== '') el.value = v;
            });
        }

        function setupWorkflowDerivedFields(inputs) {
            const derivedInputs = (inputs || []).filter(i => i && i.derived && i.derived.expression);
            if (!derivedInputs.length) return;

            const recompute = () => recomputeWorkflowDerivedFields(inputs);

            (inputs || []).forEach(input => {
                if (!input || (input.derived && input.derived.expression) || input.readOnly) return;
                const el = document.getElementById(_wfElId(input.id));
                if (!el) return;
                if (el.dataset && el.dataset.pbDerivedWired === '1') return;
                el.addEventListener('input', recompute);
                el.addEventListener('change', recompute);
                if (el.dataset) el.dataset.pbDerivedWired = '1';
            });

            recompute();
        }

        async function buildWorkflowRunForm(agent) {
            const formContainer = document.getElementById('workflow-form-fields');
            if (!formContainer) return;

            let triggerInputs = [];
            let enrichedFields = [];
            let processDef = agent?.process_definition;
            if (typeof processDef === 'string') {
                try { processDef = processDef ? JSON.parse(processDef) : null; } catch (_) { processDef = null; }
            }
            if (!processDef || typeof processDef !== 'object') processDef = {};

            if (processDef.nodes && Array.isArray(processDef.nodes)) {
                const nodes = processDef.nodes;
                const nodeType = (n) => String(n?.type || '').toLowerCase().trim();
                const pickNodeWithFields = (preferredTypes) => {
                    for (const t of preferredTypes) {
                        const found = nodes.find(n => nodeType(n) === t);
                        if (!found) continue;
                        const cfg = found.config || {};
                        const typeCfg = cfg.type_config || cfg.typeConfig || cfg;
                        const fields =
                            typeCfg.fields || cfg.fields ||
                            typeCfg.input_fields || cfg.input_fields ||
                            typeCfg.inputFields || cfg.inputFields ||
                            typeCfg.form_fields || cfg.form_fields ||
                            typeCfg.formFields || cfg.formFields ||
                            typeCfg.inputs || cfg.inputs ||
                            [];
                        if (Array.isArray(fields) && fields.length) return { node: found, fields };
                    }
                    return null;
                };

                const picked = pickNodeWithFields(['form', 'trigger', 'start']);
                if (picked && Array.isArray(picked.fields) && picked.fields.length) {
                    triggerInputs = picked.fields
                        .filter(f => f && (f.name || f.id))
                        .map(f => {
                            const id = f.name || f.id;
                            const label = f.label || humanizeFieldLabel(id) || id;
                            const derived = (f.derived && f.derived.expression) ? { expression: String(f.derived.expression).trim() } : null;
                            const prefill = (f.prefill && f.prefill.source === 'currentUser' && f.prefill.key)
                                ? { source: 'currentUser', key: String(f.prefill.key).trim() }
                                : null;
                            const readOnly = !!f.readOnly || !!derived || !!prefill;
                            const required = !!f.required && !readOnly;
                            const options = Array.isArray(f.options) ? f.options : undefined;
                            const placeholder = f.placeholder || (label ? `Enter ${label}…` : '');
                            return {
                                id,
                                label,
                                type: f.type || 'text',
                                required,
                                placeholder,
                                options,
                                description: f.description,
                                derived,
                                prefill,
                                readOnly,
                                multiple: !!f.multiple
                            };
                        });
                }
            }

            if (!triggerInputs.length && processDef && processDef.trigger && processDef.trigger.inputs) {
                triggerInputs = processDef.trigger.inputs;
            }

            // Fallback: use LLM-enriched fields when the definition doesn't expose fields cleanly
            if (!triggerInputs.length) {
                try {
                    const res = await fetch(`${API}/process/enrich-form-fields`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                        body: JSON.stringify({ agent_id: String(agent?.id || '') })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        enrichedFields = Array.isArray(data) ? data : (data.fields || []);
                    }
                } catch (_) {}
                if (enrichedFields && enrichedFields.length) {
                    triggerInputs = enrichedFields.map(f => ({
                        id: f.id,
                        label: f.label || humanizeFieldLabel(f.id) || f.id,
                        type: f.type || 'text',
                        required: !!f.required,
                        placeholder: f.placeholder || '',
                        options: f.options,
                        description: f.description
                    }));
                }
            }

            if (!triggerInputs.length) {
                triggerInputs = [
                    { id: 'details', label: 'Details', type: 'textarea', required: true, placeholder: 'Enter details…' }
                ];
            }

            workflowRunInputs = triggerInputs;

            formContainer.innerHTML = triggerInputs.map(input => {
                const required = input.required ? '<span style="color: var(--error);">*</span>' : '';
                const fieldId = _wfElId(input.id);
                const descHtml = input.description ? `<p class="text-xs mt-0.5 mb-1" style="color: var(--text-muted);">${escapeHtml(input.description)}</p>` : '';
                const readOnly = !!input.readOnly || (input.derived && input.derived.expression);
                const isPrefilled = !!input.prefill;
                const isDerived = !!(input.derived && input.derived.expression);
                const readOnlyStyle = readOnly ? 'style="opacity: 0.7; cursor: not-allowed; background: rgba(255,255,255,0.03);"' : '';

                let fieldHtml = '';
                switch (input.type) {
                    case 'textarea':
                        fieldHtml = `<textarea id="${fieldId}" class="modal-form-input" rows="3" placeholder="${escapeHtml(input.placeholder || '')}" ${input.required ? 'required' : ''} ${readOnly ? 'readonly' : ''} ${readOnlyStyle}></textarea>`;
                        break;
                    case 'select':
                        fieldHtml = `<select id="${fieldId}" class="modal-form-input" ${input.required ? 'required' : ''} ${readOnly ? 'disabled' : ''} ${readOnlyStyle}>
                            <option value="">Select…</option>
                            ${(input.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                        </select>`;
                        break;
                    case 'file': {
                        const multiFile = input.multiple ? 'multiple' : '';
                        fieldHtml = `<input type="file" id="${fieldId}" class="modal-form-input" ${input.required ? 'required' : ''} ${multiFile}>`;
                        break;
                    }
                    case 'number':
                        fieldHtml = `<input type="number" id="${fieldId}" class="modal-form-input" placeholder="${escapeHtml(input.placeholder || '')}" ${input.required ? 'required' : ''} ${readOnly ? 'readonly' : ''} ${readOnlyStyle}>`;
                        break;
                    case 'date':
                        fieldHtml = `<input type="date" id="${fieldId}" class="modal-form-input" ${input.required ? 'required' : ''} ${readOnly ? 'readonly' : ''} ${readOnlyStyle}>`;
                        break;
                    case 'email':
                        fieldHtml = `<input type="email" id="${fieldId}" class="modal-form-input" placeholder="${escapeHtml(input.placeholder || '')}" ${input.required ? 'required' : ''} ${readOnly ? 'readonly' : ''} ${readOnlyStyle}>`;
                        break;
                    default:
                        fieldHtml = `<input type="text" id="${fieldId}" class="modal-form-input" placeholder="${escapeHtml(input.placeholder || '')}" ${input.required ? 'required' : ''} ${readOnly ? 'readonly' : ''} ${readOnlyStyle}>`;
                }

                // Helper text for read-only fields
                let readOnlyHint = '';
                if (isPrefilled) {
                    readOnlyHint = `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:var(--text-muted); margin-top:3px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Auto-filled from your profile</span>`;
                } else if (isDerived) {
                    readOnlyHint = `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:var(--text-muted); margin-top:3px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Automatically calculated</span>`;
                }

                return `
                    <div class="modal-form-group" style="margin-bottom: 0;">
                        <label class="modal-form-label">${escapeHtml(input.label || input.id)} ${required}</label>
                        ${descHtml}
                        ${fieldHtml}
                        ${readOnlyHint}
                    </div>
                `;
            }).join('');

            applyWorkflowPrefill(triggerInputs);
            setupWorkflowDerivedFields(triggerInputs);
        }

        async function executeWorkflow() {
            if (!currentWorkflowAgent) {
                showToast('No process selected', 'error');
                return;
            }
            const btn = document.getElementById('workflow-run-btn');
            const statusEl = document.getElementById('workflow-run-status');

            try {
                if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
                if (statusEl) statusEl.textContent = 'Submitting…';

                // Ensure derived fields are up to date before collecting values
                recomputeWorkflowDerivedFields(workflowRunInputs);

                const triggerData = {};
                const pendingUploads = []; // { fieldId, inputLabel, fileObj }
                for (const input of (workflowRunInputs || [])) {
                    const field = document.getElementById(_wfElId(input.id));
                    if (!field) continue;

                    if (input.type === 'file') {
                        const allFiles = field.files ? Array.from(field.files) : [];
                        if (input.required && allFiles.length === 0) {
                            showToast(`Please upload: ${input.label}`, 'error');
                            if (btn) { btn.disabled = false; btn.textContent = _serviceCtaLabel(currentWorkflowAgent); }
                            field.focus();
                            return;
                        }
                        if (allFiles.length > 1) {
                            triggerData[input.id] = allFiles.map(f => ({
                                kind: 'pendingUpload',
                                name: f.name,
                                size: f.size,
                                content_type: f.type || ''
                            }));
                            allFiles.forEach(f => {
                                pendingUploads.push({ fieldId: input.id, inputLabel: input.label || input.id, fileObj: f });
                            });
                        } else if (allFiles.length === 1) {
                            const fileObj = allFiles[0];
                            triggerData[input.id] = {
                                kind: 'pendingUpload',
                                name: fileObj.name,
                                size: fileObj.size,
                                content_type: fileObj.type || ''
                            };
                            pendingUploads.push({ fieldId: input.id, inputLabel: input.label || input.id, fileObj });
                        } else {
                            triggerData[input.id] = null;
                        }
                        continue;
                    }

                    const value = (field.value || '').trim();
                    if (input.required && !value) {
                        showToast(`Please fill in: ${input.label}`, 'error');
                        if (btn) { btn.disabled = false; btn.textContent = _serviceCtaLabel(currentWorkflowAgent); }
                        field.focus();
                        return;
                    }
                    triggerData[input.id] = input.type === 'number' ? (parseFloat(value) || 0) : value;
                }

                const response = await fetch(`${API}/process/execute-fast`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        agent_id: currentWorkflowAgent.id,
                        trigger_input: triggerData,
                        trigger_type: 'manual'
                    })
                });

                let data = null;
                try { data = await response.json(); } catch (_) { data = null; }

                if (!response.ok) {
                    const rawMsg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : '';
                    throw new Error(friendlyErrorMessage(rawMsg, 'Failed to start this process. Please try again.'));
                }

                const executionId = data?.id || data?.execution_id || data?.executionId;
                const refNum = data?.execution_number || data?.run_number || data?.reference_id || (executionId ? executionId.slice(0, 8).toUpperCase() : '');
                const wfName = currentWorkflowAgent?.name || 'Your request';

                _showSubmissionConfirmation(wfName, refNum, executionId, pendingUploads.length ? 'Uploading attachments…' : '');

                // Upload files and finalize (non-blocking for the reference screen)
                if (executionId && pendingUploads.length) {
                    (async () => {
                        try {
                            const filesMap = {};
                            const _multiFields = new Set();
                            pendingUploads.forEach(u => {
                                if (pendingUploads.filter(p => p.fieldId === u.fieldId).length > 1) _multiFields.add(u.fieldId);
                            });
                            for (let i = 0; i < pendingUploads.length; i++) {
                                const u = pendingUploads[i];
                                _setSubmissionProgress(`Uploading attachments… (${i + 1}/${pendingUploads.length})`);
                                const uploaded = await uploadWorkflowRunFile(u.fileObj);
                                if (_multiFields.has(u.fieldId)) {
                                    if (!Array.isArray(filesMap[u.fieldId])) filesMap[u.fieldId] = [];
                                    filesMap[u.fieldId].push(uploaded);
                                } else {
                                    filesMap[u.fieldId] = uploaded;
                                }
                            }
                            _setSubmissionProgress('Finalizing…');
                            const res2 = await fetch(`${API}/process/executions/${executionId}/finalize-uploads`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                                body: JSON.stringify({ files: filesMap })
                            });
                            if (!res2.ok) {
                                const err = await res2.json().catch(() => ({}));
                                throw new Error((err && (err.detail || err.message)) ? (err.detail || err.message) : 'Unable to finalize attachments');
                            }
                            _setSubmissionProgress('Your request is now being processed.');
                        } catch (e) {
                            console.error('finalize uploads error:', e);
                            _setSubmissionProgress('Attachments could not be uploaded. Please keep this page open and try again.');
                            showToast('Some attachments failed to upload. Please try again.', 'error');
                        }
                    })();
                }

            } catch (e) {
                console.error('executeWorkflow error:', e);
                showToast(e?.message || 'Failed to submit your request. Please try again.', 'error');
                if (statusEl) statusEl.textContent = '';
                if (btn) { btn.disabled = false; btn.textContent = _serviceCtaLabel(currentWorkflowAgent); }
            }
        }

        function _setSubmissionProgress(text) {
            const el = document.getElementById('submission-progress');
            if (!el) return;
            const t = String(text || '').trim();
            el.textContent = t;
            el.style.display = t ? '' : 'none';
        }

        function _showSubmissionConfirmation(serviceName, refNumber, executionId, progressText) {
            const formContainer = document.getElementById('workflow-form-fields');
            const btn = document.getElementById('workflow-run-btn');
            const statusEl = document.getElementById('workflow-run-status');
            const titleEl = document.getElementById('workflow-run-title');
            const descEl = document.getElementById('workflow-run-desc');

            if (titleEl) titleEl.textContent = 'Request Submitted';
            if (descEl) descEl.textContent = '';
            if (statusEl) statusEl.textContent = '';
            if (btn) btn.style.display = 'none';

            const refDisplay = refNumber ? `<div style="margin-top:12px; padding:12px 16px; background:color-mix(in srgb, var(--primary) 8%, transparent); border:1px solid color-mix(in srgb, var(--primary) 25%, var(--border)); border-radius:12px; text-align:center;">
                <div style="font-size:0.78rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; font-weight:700;">Reference Number</div>
                <div style="font-size:1.2rem; font-weight:800; margin-top:4px; letter-spacing:0.05em; color:var(--text-primary);">${escapeHtml(String(refNumber))}</div>
            </div>` : '';

            if (formContainer) {
                formContainer.innerHTML = `
                    <div style="text-align:center; padding:20px 0;">
                        <div style="font-size:3rem; margin-bottom:12px;">✅</div>
                        <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${escapeHtml(serviceName)}</div>
                        <div style="color:var(--text-muted); margin-top:6px; line-height:1.5;">Your request has been submitted successfully.<br>You will be notified when there are updates.</div>
                        <div id="submission-progress" style="margin-top:10px; color:var(--text-muted); font-size:0.85rem; display:none;"></div>
                        ${refDisplay}
                        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
                            <button class="portal-btn" onclick="closeWorkflowRunModal();${executionId ? `selectedExecutionId='${executionId}';switchView('requests');` : ''}">Track My Request</button>
                            <button class="portal-btn portal-btn-primary" onclick="closeWorkflowRunModal()">Done</button>
                        </div>
                    </div>
                `;
            }
            _setSubmissionProgress(progressText || '');
        }

        async function uploadWorkflowRunFile(fileObj) {
            const tokenHeaders = getAuthHeaders();
            if (!tokenHeaders || !tokenHeaders.Authorization) {
                throw new Error('You are not signed in.');
            }
            const fd = new FormData();
            fd.append('file', fileObj);
            const res = await fetch(`${API}/process/uploads`, {
                method: 'POST',
                headers: {
                    ...tokenHeaders
                },
                body: fd
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) {
                const rawMsg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : '';
                throw new Error(friendlyErrorMessage(rawMsg, 'Failed to upload file. Please try again.'));
            }
            const f = (data && data.file) ? data.file : data;
            if (!f || !f.id) throw new Error('File upload failed.');
            return f;
        }

        // =============================================================================
        // PORTAL: MY REQUESTS (EXECUTION HISTORY)
        // =============================================================================

        function _executionAgentId(ex) {
            return ex?.agent_id || ex?.workflow_id || ex?.workflowId || ex?.workflow_id;
        }

        function _executionRunNumber(ex) {
            return ex?.execution_number ?? ex?.run_number ?? ex?.run_number ?? ex?.runNumber ?? ex?.run_number;
        }

        function _executionInputData(ex) {
            return ex?.input_data || ex?.trigger_input || ex?.inputData || {};
        }

        function _executionResult(ex) {
            return ex?.result ?? ex?.output ?? ex?.result_data ?? ex?.output_data;
        }

        function _formatDateTime(val) {
            if (!val) return '';
            try {
                const d = (val instanceof Date) ? val : new Date(val);
                if (isNaN(d.getTime())) return String(val);
                return d.toLocaleString();
            } catch (_) {
                return String(val);
            }
        }

        function _formatRelativeTime(val) {
            if (!val) return '';
            try {
                const d = (val instanceof Date) ? val : new Date(val);
                if (isNaN(d.getTime())) return '';
                const now = new Date();
                const diffMs = now - d;
                const diffMin = Math.floor(diffMs / 60000);
                if (diffMin < 1) return 'Just now';
                if (diffMin < 60) return `${diffMin} min ago`;
                const diffHrs = Math.floor(diffMin / 60);
                if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
                const diffDays = Math.floor(diffHrs / 24);
                if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                return d.toLocaleDateString();
            } catch (_) {
                return '';
            }
        }

        function _statusPillClass(status) {
            const s = String(status || '').toLowerCase();
            if (s === 'success' || s === 'completed') return 'success';
            if (s === 'failed' || s === 'cancelled' || s === 'timed_out' || s === 'error' || s === 'danger') return 'danger';
            if (s === 'waiting' || s === 'paused' || s === 'running' || s === 'pending' || s === 'warning') return 'warning';
            return 'muted';
        }

        function _businessStatusLabel(status) {
            const s = String(status || '').toLowerCase();
            const map = {
                'pending': 'Submitted',
                'running': 'In Progress',
                'completed': 'Completed',
                'success': 'Completed',
                'failed': 'Unsuccessful',
                'cancelled': 'Cancelled',
                'timed_out': 'Timed Out',
                'waiting': 'Awaiting Action',
                'paused': 'On Hold',
                'error': 'Unsuccessful',
                'approved': 'Approved',
                'rejected': 'Declined',
            };
            return map[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Submitted');
        }

        function _getWorkflowNameById(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return 'Request';
            const a = (workflowAgents || []).find(x => x.id === id) || (allAccessibleAgents || []).find(x => x.id === id);
            return a?.name || 'Request';
        }

        async function refreshRequests() {
            const listEl = document.getElementById('requests-list');
            if (listEl) listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">Loading…</div>`;
            try {
                // Hard safety: non-admin users can only see their own requests.
                const isTruePortalAdmin = !!(currentUser && (currentUser.portal_access === 'admin' || currentUser.is_admin === true));
                if (!isTruePortalAdmin) requestsScope = 'mine';

                const params = new URLSearchParams();
                params.set('scope', requestsScope || 'mine');
                params.set('limit', '100');
                params.set('offset', '0');
                if (requestsWorkflowFilterId) params.set('agent_id', String(requestsWorkflowFilterId));

                const res = await fetch(`${API}/process/executions?${params.toString()}`, {
                    headers: { ...getAuthHeaders() }
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((data && (data.detail || data.message)) ? (data.detail || data.message) : 'Failed to load requests');
                myRequests = Array.isArray(data) ? data : (data.items || []);
                renderRequestsScopeAndFilterChips();
                renderRequests();
                _setWorkTabBadges();
                if (selectedExecutionId) {
                    // Keep the detail pane in sync (e.g., after starting a workflow)
                    refreshSelectedRequest();
                }
                return myRequests;
            } catch (e) {
                console.error('refreshRequests error:', e);
                myRequests = [];
                renderRequestsScopeAndFilterChips();
                renderRequests();
                _setWorkTabBadges();
                showToast(e?.message || 'Failed to load requests', 'error');
                return [];
            }
        }

        function renderRequestsScopeAndFilterChips() {
            // Scope chips
            const scopeEl = document.getElementById('requests-scope-chips');
            if (scopeEl) {
                // End-user default: users can only track what they submitted.
                // Org-wide visibility is only for true portal admins (explicit flag).
                const isTruePortalAdmin = !!(currentUser && (currentUser.portal_access === 'admin' || currentUser.is_admin === true));
                if (!isTruePortalAdmin && (requestsScope || 'mine') !== 'mine') {
                    requestsScope = 'mine';
                }
                const scopes = isTruePortalAdmin ? [
                    { id: 'mine', label: 'My Requests', hint: 'Requests you submitted' },
                    { id: 'org', label: 'Organization Requests', hint: 'All requests in your organization (admin only)' }
                ] : [
                    { id: 'mine', label: 'My Requests', hint: 'Requests you submitted' }
                ];
                scopeEl.innerHTML = '';
                scopes.forEach(s => {
                    const chip = document.createElement('div');
                    chip.className = 'chip' + ((requestsScope || 'mine') === s.id ? ' active' : '');
                    chip.textContent = s.label;
                    chip.title = s.hint || '';
                    chip.onclick = () => {
                        requestsScope = s.id;
                        selectedExecutionId = null;
                        refreshRequests();
                    };
                    scopeEl.appendChild(chip);
                });
            }

            // Filter chips
            const filterEl = document.getElementById('requests-filter-chips');
            if (filterEl) {
                filterEl.innerHTML = '';
                if (requestsWorkflowFilterId) {
                    const wfName = _getWorkflowNameById(requestsWorkflowFilterId);
                    const chip = document.createElement('div');
                    chip.className = 'chip active';
                    chip.textContent = `Filtered: ${wfName} ✕`;
                    chip.title = 'Click to clear filter';
                    chip.onclick = () => clearRequestsWorkflowFilter();
                    filterEl.appendChild(chip);
                }
            }
        }

        function renderRequests() {
            const listEl = document.getElementById('requests-list');
            const countEl = document.getElementById('requests-count');
            if (!listEl) return;
            _setWorkTabBadges();

            const q = String(document.getElementById('requests-search')?.value || '').trim().toLowerCase();
            const items = Array.isArray(myRequests) ? myRequests.slice() : [];

            const filtered = items.filter(ex => {
                if (requestsWorkflowFilterId) {
                    const aid = String(_executionAgentId(ex) || '').trim();
                    if (aid && aid !== String(requestsWorkflowFilterId)) return false;
                }
                const name = _getWorkflowNameById(_executionAgentId(ex));
                const statusLabel = ex?.status_info?.label || ex?.status || '';
                const runNo = ex?.execution_number || ex?.run_number || ex?.executionNumber || '';
                const ref = ex?.reference_id || ex?.correlation_id || ex?.referenceId || ex?.correlationId || '';
                const hay = `${name} ${statusLabel} ${runNo} ${ref} ${ex?.id || ''}`.toLowerCase();
                return !q || hay.includes(q);
            });

            if (countEl) countEl.textContent = filtered.length ? `${filtered.length}` : '';

            if (!filtered.length) {
                listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">No requests yet.</div>`;
                // Clear detail if nothing selected
                if (!items.length) {
                    selectedExecutionId = null;
                    const btn = document.getElementById('request-refresh-btn');
                    if (btn) btn.disabled = true;
                    const titleEl = document.getElementById('request-detail-title');
                    const subEl = document.getElementById('request-detail-subtitle');
                    const bodyEl = document.getElementById('request-detail-body');
                    if (titleEl) titleEl.textContent = 'Select a request';
                    if (subEl) subEl.textContent = 'Choose a request to view its details and current status.';
                    if (bodyEl) bodyEl.innerHTML = '';
                }
                return;
            }

            listEl.innerHTML = filtered.map(ex => {
                const id = String(ex.id || '');
                const agentId = _executionAgentId(ex);
                const name = escapeHtml(_getWorkflowNameById(agentId));
                const status = String(ex.status || '').toLowerCase();
                const pillCls = _statusPillClass(status);
                const label = escapeHtml(ex?.status_info?.label || _businessStatusLabel(status));
                const timeAgo = _formatRelativeTime(ex.created_at);
                return `
                    <div class="list-item ${selectedExecutionId === id ? 'active' : ''}" onclick="selectRequest('${id}')">
                        <div class="list-item-title">
                            <span style="min-width:0; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                            <span class="status-pill ${pillCls}"><span class="dot"></span>${label}</span>
                        </div>
                        <div class="list-item-meta">
                            ${timeAgo ? `<span>${escapeHtml(timeAgo)}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Auto-select if we have a target execution id (e.g., after starting a workflow)
            if (selectedExecutionId && !filtered.some(x => String(x.id) === String(selectedExecutionId))) {
                // keep selection; detail refresh will handle not-found
            } else if (!selectedExecutionId && filtered.length) {
                // Do not auto-select unless user already picked (keep calm UX)
            }
        }

        async function selectRequest(executionId) {
            const id = String(executionId || '').trim();
            if (!id) return;
            selectedExecutionId = id;
            const btn = document.getElementById('request-refresh-btn');
            if (btn) btn.disabled = false;
            renderRequests();

            const titleEl = document.getElementById('request-detail-title');
            const subEl = document.getElementById('request-detail-subtitle');
            const bodyEl = document.getElementById('request-detail-body');
            if (titleEl) titleEl.textContent = 'Loading…';
            if (subEl) subEl.textContent = 'Retrieving your request details…';
            if (bodyEl) bodyEl.innerHTML = '';

            await refreshSelectedRequest();
        }

        async function refreshSelectedRequest() {
            const id = String(selectedExecutionId || '').trim();
            if (!id) return;

            try {
                const [exRes, stepsRes] = await Promise.all([
                    fetch(`${API}/process/executions/${id}`, { headers: { ...getAuthHeaders() } }),
                    fetch(`${API}/process/executions/${id}/steps`, { headers: { ...getAuthHeaders() } })
                ]);

                const exData = await exRes.json().catch(() => ({}));
                const stepsData = await stepsRes.json().catch(() => ([]));

                if (!exRes.ok) {
                    const msg = (exData && (exData.detail || exData.message)) ? (exData.detail || exData.message) : 'Failed to load request';
                    throw new Error(String(msg));
                }

                // Update local cache
                const idx = (myRequests || []).findIndex(x => String(x.id) === id);
                if (idx >= 0) myRequests[idx] = exData;
                else myRequests = [exData].concat(myRequests || []);

                const steps = Array.isArray(stepsData) ? stepsData : (stepsData.items || stepsData.steps || []);
                await _renderRequestDetail(exData, steps);
                renderRequests();
            } catch (e) {
                console.error('refreshSelectedRequest error:', e);
                const titleEl = document.getElementById('request-detail-title');
                const subEl = document.getElementById('request-detail-subtitle');
                const bodyEl = document.getElementById('request-detail-body');
                if (titleEl) titleEl.textContent = 'Unable to load request';
                if (subEl) subEl.textContent = e?.message || 'Please try again.';
                if (bodyEl) bodyEl.innerHTML = '';
                showToast(e?.message || 'Failed to load request', 'error');
            }
        }

        async function downloadUploadedProcessFile(fileId, filename) {
            const id = String(fileId || '').trim();
            if (!id) return;
            const name = String(filename || '').trim() || `upload-${id}`;
            try {
                const res = await fetch(`${API}/process/uploads/${encodeURIComponent(id)}/download`, {
                    headers: { ...getAuthHeaders() }
                });
                if (!res.ok) {
                    let rawMsg = '';
                    try {
                        const data = await res.json().catch(() => null);
                        if (data && (data.detail || data.message || data.error)) rawMsg = data.detail || data.message || data.error;
                    } catch (_) {}
                    showToast(friendlyErrorMessage(rawMsg, 'Failed to download file. Please try again.'), 'error');
                    return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1500);
            } catch (e) {
                showToast('Unable to download file', 'error');
            }
        }

        const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const _TECHNICAL_KEYS = new Set([
            '_user_context', 'org_id', 'user_id', 'correlation_id', 'reference_id',
            'trigger_type', 'trigger_input', 'execution_id', 'agent_id', 'workflow_id',
            'process_definition', 'config', 'type_config', 'node_id', 'step_id',
            'custom_attributes', 'cost_center', 'identity_source', 'internal',
            'role_ids', 'group_ids', 'is_manager', 'employee_id',
        ]);

        const _agentFieldLabelCache = new Map(); // agent_id -> { fieldId: label }

        function _normInputKey(key) {
            return String(key || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '');
        }

        function _localFieldLabelsFromDefinition(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return {};
            const agent = (workflowAgents || []).find(a => String(a?.id || '') === id);
            if (!agent) return {};
            const def = _parseProcessDefinition(agent);
            const nodes = Array.isArray(def?.nodes) ? def.nodes : [];
            const triggerNode = nodes.find(n => ['trigger', 'form', 'start'].includes(String(n?.type || '').trim().toLowerCase()));
            if (!triggerNode) return {};
            const cfg = (triggerNode && typeof triggerNode === 'object') ? (triggerNode.config || {}) : {};
            const tc = (cfg && typeof cfg === 'object') ? (cfg.type_config || cfg.typeConfig || cfg) : {};
            const fields = (tc.fields || cfg.fields || tc.input_fields || cfg.input_fields || tc.inputFields || cfg.inputFields || tc.form_fields || cfg.form_fields || tc.formFields || cfg.formFields || tc.inputs || cfg.inputs || []);
            if (!Array.isArray(fields)) return {};
            const map = {};
            fields.forEach(f => {
                const key = String(f?.name || f?.id || '').trim();
                const label = String(f?.label || '').trim();
                if (key && label) map[key] = label;
            });
            return map;
        }

        async function _getAgentFieldLabelMap(agentId) {
            const id = String(agentId || '').trim();
            if (!id) return {};
            if (_agentFieldLabelCache.has(id)) return _agentFieldLabelCache.get(id) || {};
            try {
                const res = await fetch(`${API}/process/enrich-form-fields`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ agent_id: id })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error('enrich failed');
                const fields = Array.isArray(data) ? data : (data.fields || []);
                const map = {};
                (fields || []).forEach(f => {
                    const key = String(f?.id || '').trim();
                    const label = String(f?.label || '').trim();
                    if (key && label) map[key] = label;
                });
                // Fallback: ensure we still match the run form labels even if enrichment is partial.
                const local = _localFieldLabelsFromDefinition(id);
                Object.entries(local).forEach(([k, v]) => {
                    if (!map[k] && v) map[k] = v;
                });
                // Also add lowercase aliases to survive casing differences.
                Object.entries(map).forEach(([k, v]) => {
                    const lk = String(k || '').toLowerCase();
                    if (lk && !map[lk]) map[lk] = v;
                    const nk = _normInputKey(k);
                    if (nk && !map[nk]) map[nk] = v;
                });
                _agentFieldLabelCache.set(id, map);
                return map;
            } catch (_) {
                const local = _localFieldLabelsFromDefinition(id);
                const map = {};
                Object.entries(local || {}).forEach(([k, v]) => {
                    if (k && v) map[String(k)] = String(v);
                });
                Object.entries(map).forEach(([k, v]) => {
                    const lk = String(k || '').toLowerCase();
                    if (lk && !map[lk]) map[lk] = v;
                    const nk = _normInputKey(k);
                    if (nk && !map[nk]) map[nk] = v;
                });
                _agentFieldLabelCache.set(id, map);
                return map;
            }
        }

        function _labelForInputKey(key, labelMap) {
            const k = String(key || '').trim();
            if (!k) return '';
            if (labelMap && typeof labelMap === 'object') {
                if (labelMap[k]) return String(labelMap[k]);
                const lk = k.toLowerCase();
                if (labelMap[lk]) return String(labelMap[lk]);
                const nk = _normInputKey(k);
                if (labelMap[nk]) return String(labelMap[nk]);
            }
            return humanizeFieldLabel(k) || k;
        }

        function _isHiddenField(key, allKeys) {
            const k = String(key || '').toLowerCase();
            if (_TECHNICAL_KEYS.has(k)) return true;
            if (k.startsWith('_')) return true;
            if (k.endsWith('_id') && allKeys.has(k.replace(/_id$/, '_name'))) return true;
            if (k === 'manager_id' && allKeys.has('manager_name')) return true;
            if (k === 'department_id' && allKeys.has('department_name')) return true;
            return false;
        }

        function _renderPortalValue(v, key) {
            if (v == null) return `<span class="detail-empty">—</span>`;
            if (typeof v === 'string') {
                const s = v.trim();
                if (!s) return `<span class="detail-empty">—</span>`;
                if (_UUID_RE.test(s)) return `<span class="detail-empty">—</span>`;
                return escapeHtml(s);
            }
            if (typeof v === 'number') return escapeHtml(String(v));
            if (typeof v === 'boolean') return v ? 'Yes' : 'No';
            if (Array.isArray(v)) {
                const items = v.filter(x => x != null && x !== '');
                if (!items.length) return `<span class="detail-empty">—</span>`;
                if (items.every(x => typeof x === 'string' || typeof x === 'number')) {
                    return items.map(x => `<span class="detail-tag">${escapeHtml(String(x))}</span>`).join(' ');
                }
            }
            if (typeof v === 'object' && !Array.isArray(v)) {
                try {
                    if (v.kind === 'uploadedFile' && (v.id || v.name)) {
                        const name = v.name || 'Uploaded file';
                        const typ = v.file_type ? String(v.file_type).toUpperCase() : '';
                        const size = (typeof v.size === 'number') ? `${Math.round(v.size / 1024)} KB` : '';
                        const meta = [typ, size].filter(Boolean).join(' · ');
                        const btn = v.id ? `<button type="button" class="detail-download-btn" data-upload-file-id="${escapeHtml(String(v.id))}" data-upload-file-name="${escapeHtml(String(name))}">Download</button>` : '';
                        return `<div class="detail-file-chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div><div style="font-weight:700;">${escapeHtml(name)}</div>${meta ? `<div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(meta)}</div>` : ''}</div>${btn}</div>`;
                    }
                } catch (_) {}
            }
            return `<span class="detail-empty">—</span>`;
        }

        function _flattenResultForDisplay(obj) {
            if (obj == null) return [];
            if (typeof obj === 'string') {
                const s = obj.trim();
                if (!s) return [];
                try {
                    const parsed = JSON.parse(s);
                    if (typeof parsed === 'object') return _flattenResultForDisplay(parsed);
                } catch (_) {}
                return [{ key: 'Result', value: s }];
            }
            if (typeof obj === 'number' || typeof obj === 'boolean') return [{ key: 'Result', value: String(obj) }];
            if (Array.isArray(obj)) {
                if (obj.length === 0) return [];
                if (obj.length === 1 && typeof obj[0] === 'object') return _flattenResultForDisplay(obj[0]);
                return [{ key: 'Result', value: obj.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(', ') }];
            }
            if (typeof obj !== 'object') return [];
            const entries = [];
            const allKeys = new Set(Object.keys(obj).map(k => k.toLowerCase()));
            for (const [rawKey, rawVal] of Object.entries(obj)) {
                const k = rawKey.toLowerCase();
                if (_TECHNICAL_KEYS.has(k) || k.startsWith('_')) continue;
                if (_UUID_RE.test(String(rawVal || ''))) continue;
                if (k.endsWith('_id') && allKeys.has(k.replace(/_id$/, '_name'))) continue;
                if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal) && !(rawVal.kind === 'uploadedFile')) {
                    const nested = _flattenResultForDisplay(rawVal);
                    nested.forEach(n => entries.push(n));
                    continue;
                }
                const label = humanizeFieldLabel(rawKey) || rawKey;
                const rendered = _renderPortalValue(rawVal, rawKey);
                if (rendered.includes('detail-empty')) continue;
                entries.push({ key: label, value: rendered, isHtml: true });
            }
            return entries;
        }

        function _businessStatusDescription(status) {
            const s = String(status || '').toLowerCase();
            const map = {
                'pending': 'Your request has been submitted and is being processed.',
                'running': 'Your request is currently being processed.',
                'completed': 'Your request has been completed.',
                'success': 'Your request has been completed successfully.',
                'failed': 'There was an issue processing your request.',
                'cancelled': 'This request has been cancelled.',
                'timed_out': 'This request timed out. Please try again or contact support.',
                'waiting': 'Your request is awaiting action from an approver.',
                'paused': 'Your request is currently on hold.',
                'approved': 'Your request has been approved.',
                'rejected': 'Your request was not approved.',
            };
            return map[s] || 'Request details';
        }

        function _buildProgressTimeline(stepsArr, overallStatus) {
            if (!stepsArr || !stepsArr.length) {
                if (overallStatus === 'pending' || overallStatus === 'running') {
                    return `<div class="progress-timeline">
                        <div class="timeline-step completed"><div class="timeline-dot"></div><div class="timeline-label">Submitted</div></div>
                        <div class="timeline-step active"><div class="timeline-dot"></div><div class="timeline-label">Processing</div></div>
                        <div class="timeline-step"><div class="timeline-dot"></div><div class="timeline-label">Complete</div></div>
                    </div>`;
                }
                if (overallStatus === 'completed' || overallStatus === 'success') {
                    return `<div class="progress-timeline">
                        <div class="timeline-step completed"><div class="timeline-dot"></div><div class="timeline-label">Submitted</div></div>
                        <div class="timeline-step completed"><div class="timeline-dot"></div><div class="timeline-label">Processed</div></div>
                        <div class="timeline-step completed"><div class="timeline-dot"></div><div class="timeline-label">Completed</div></div>
                    </div>`;
                }
                return '';
            }

            const humanSteps = stepsArr.map(s => {
                const sStatus = String(s?.status?.label || s?.status || '').toLowerCase();
                const isDone = ['completed', 'success', 'approved'].includes(sStatus);
                const isActive = ['running', 'pending', 'waiting', 'in_progress'].includes(sStatus);
                const isFailed = ['failed', 'error', 'rejected'].includes(sStatus);
                const rawName = s.step_name || s.node_name || humanizeNodeType(s.step_type || s.node_type);
                const stepName = humanizeFieldLabel(rawName) || String(rawName || '').trim() || 'Step';
                let cls = '';
                if (isDone) cls = 'completed';
                else if (isActive) cls = 'active';
                else if (isFailed) cls = 'failed';
                return `<div class="timeline-step ${cls}"><div class="timeline-dot"></div><div class="timeline-label">${escapeHtml(stepName)}</div>${isFailed && s.error ? `<div class="timeline-error">${escapeHtml(friendlyErrorMessage(String(s.error), 'An issue occurred.'))}</div>` : ''}</div>`;
            }).join('');

            return `<div class="progress-timeline">${humanSteps}</div>`;
        }

        async function _renderRequestDetail(ex, steps) {
            const titleEl = document.getElementById('request-detail-title');
            const subEl = document.getElementById('request-detail-subtitle');
            const bodyEl = document.getElementById('request-detail-body');
            if (!bodyEl) return;

            const agentId = _executionAgentId(ex);
            const wfName = _getWorkflowNameById(agentId);
            const status = String(ex?.status || '').toLowerCase();
            const pillCls = _statusPillClass(status);
            const label = ex?.status_info?.label || _businessStatusLabel(status);
            const createdAt = _formatDateTime(ex?.created_at);
            const completedAt = _formatDateTime(ex?.completed_at);
            const refId = ex?.reference_id || ex?.correlation_id || '';
            const runNum = _executionRunNumber(ex);
            const timeAgo = _formatRelativeTime(ex?.created_at);

            if (titleEl) titleEl.textContent = wfName;
            if (subEl) subEl.textContent = _businessStatusDescription(status);

            const inputData = _executionInputData(ex) || {};
            const result = _executionResult(ex);
            const allInputKeys = new Set(Object.keys(inputData || {}).map(k => k.toLowerCase()));
            const inputsEntries = (inputData && typeof inputData === 'object')
                ? Object.entries(inputData).filter(([k]) => !_isHiddenField(k, allInputKeys))
                : [];
            const labelMap = await _getAgentFieldLabelMap(agentId);

            const stepsArr = Array.isArray(steps) ? steps : [];
            const progressSteps = _buildProgressTimeline(stepsArr, status);

            // Waiting with (pending approvals)
            let waitingHtml = '';
            if (status === 'waiting' || status === 'paused') {
                try {
                    const exId = String(ex?.id || '').trim();
                    if (exId) {
                        const res = await fetch(`${API}/process/executions/${exId}/pending-approvals`, { headers: { ...getAuthHeaders() } });
                        const data = await res.json().catch(() => ({}));
                        const items = Array.isArray(data) ? data : (data.items || []);
                        const rows = (items || []).flatMap(it => {
                            const ass = Array.isArray(it?.assignees) ? it.assignees : [];
                            return ass.map(a => {
                                const role = escapeHtml(String(a?.label || 'Approver'));
                                const name = escapeHtml(String(a?.name || ''));
                                const email = escapeHtml(String(a?.email || ''));
                                const displayName = (name || '').trim() || 'Approver';
                                const emailHtml = email ? `<div class="approver-email">${email}</div>` : '';
                                const step = escapeHtml(String(it?.step_name || 'Approval'));
                                return `
                                    <div class="detail-row">
                                        <div class="detail-label">${step}</div>
                                        <div class="detail-value">
                                            <div class="approver-card">
                                                <div class="approver-main">
                                                    <div class="approver-name">${displayName}</div>
                                                    ${emailHtml}
                                                </div>
                                                <span class="approver-role">${role}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            });
                        });
                        if (rows.length) {
                            waitingHtml = `
                                <div class="detail-section">
                                    <div class="detail-section-header">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>
                                        Waiting with
                                    </div>
                                    <div class="detail-section-body">${rows.join('')}</div>
                                </div>
                            `;
                        }
                    }
                } catch (_) {
                    // non-blocking
                }
            }

            const inputsHtml = inputsEntries.length ? inputsEntries.map(([k, v]) => {
                const rendered = _renderPortalValue(v, k);
                if (rendered.includes('detail-empty')) return '';
                return `<div class="detail-row"><div class="detail-label">${escapeHtml(_labelForInputKey(k, labelMap))}</div><div class="detail-value">${rendered}</div></div>`;
            }).filter(Boolean).join('') : '';

            let outcomeHtml = '';
            if (result != null) {
                const entries = _flattenResultForDisplay(result);
                if (entries.length) {
                    outcomeHtml = `
                        <div class="detail-section">
                            <div class="detail-section-header">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                Outcome
                            </div>
                            <div class="detail-section-body">
                                ${entries.map(e => `<div class="detail-row"><div class="detail-label">${escapeHtml(e.key)}</div><div class="detail-value">${e.isHtml ? e.value : escapeHtml(String(e.value))}</div></div>`).join('')}
                            </div>
                        </div>`;
                }
            }

            const statusIcon = status === 'completed' || status === 'success'
                ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                : status === 'failed' || status === 'error'
                ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                : status === 'waiting' || status === 'paused'
                ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
                : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

            bodyEl.innerHTML = `
                <div class="request-hero ${pillCls}">
                    <div class="request-hero-icon">${statusIcon}</div>
                    <div class="request-hero-info">
                        <span class="status-pill ${pillCls}" style="font-size:0.82rem;"><span class="dot"></span>${escapeHtml(label)}</span>
                        <div class="request-hero-meta">
                            ${timeAgo ? `<span>${escapeHtml(timeAgo)}</span>` : ''}
                            ${runNum != null ? `<span>Request #${escapeHtml(runNum)}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div class="detail-meta-row">
                    ${createdAt ? `<div class="detail-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${escapeHtml(createdAt)}</div>` : ''}
                    ${refId ? `<div class="detail-meta-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3L8 21"/><path d="M16 3l-2 18"/></svg>${escapeHtml(refId)}</div>` : ''}
                </div>

                ${waitingHtml}

                ${progressSteps ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            Progress
                        </div>
                        <div class="detail-section-body">${progressSteps}</div>
                    </div>
                ` : ''}

                ${inputsHtml ? `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Submitted Information
                        </div>
                        <div class="detail-section-body">${inputsHtml}</div>
                    </div>
                ` : ''}

                ${outcomeHtml}
            `;

            // Wire up authenticated downloads for uploaded file buttons
            try {
                bodyEl.querySelectorAll('button[data-upload-file-id]').forEach(btn => {
                    btn.addEventListener('click', async (ev) => {
                        try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
                        const id = btn.getAttribute('data-upload-file-id') || '';
                        const name = btn.getAttribute('data-upload-file-name') || '';
                        await downloadUploadedProcessFile(id, name);
                    });
                });
            } catch (_) {}
        }

        // =============================================================================
        // PORTAL: INBOX (APPROVALS)
        // =============================================================================

        async function refreshInboxBadge() {
            try {
                const res = await fetch(`${API}/process/approvals`, { headers: { ...getAuthHeaders() } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) return;
                const items = Array.isArray(data) ? data : (data.items || []);
                // Sidebar inbox badge removed; keep in-memory cache updated for Home "Action Required"
                myApprovals = items;
            } catch (_) {
                // ignore
            }
        }

        async function refreshInbox() {
            const listEl = document.getElementById('inbox-list');
            if (listEl) listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">Loading…</div>`;
            try {
                const res = await fetch(`${API}/process/approvals`, { headers: { ...getAuthHeaders() } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((data && (data.detail || data.message)) ? (data.detail || data.message) : 'Failed to load inbox');
                myApprovals = Array.isArray(data) ? data : (data.items || []);
                _setInboxBadge(myApprovals.length);
                renderInbox();
                _setWorkTabBadges();
                if (selectedApprovalId) {
                    refreshSelectedApproval();
                }
                return myApprovals;
            } catch (e) {
                console.error('refreshInbox error:', e);
                myApprovals = [];
                _setInboxBadge(0);
                renderInbox();
                _setWorkTabBadges();
                showToast(e?.message || 'Failed to load inbox', 'error');
                return [];
            }
        }

        function renderInbox() {
            const listEl = document.getElementById('inbox-list');
            const countEl = document.getElementById('inbox-count');
            if (!listEl) return;
            _setWorkTabBadges();

            const q = String(document.getElementById('inbox-search')?.value || '').trim().toLowerCase();
            const items = Array.isArray(myApprovals) ? myApprovals.slice() : [];

            const filtered = items.filter(a => {
                const title = a?.title || '';
                const desc = a?.description || '';
                const hay = `${title} ${desc} ${a?.id || ''}`.toLowerCase();
                return !q || hay.includes(q);
            });

            if (countEl) countEl.textContent = filtered.length ? `${filtered.length}` : '';

            if (!filtered.length) {
                listEl.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">No pending approvals.</div>`;
                if (!items.length) {
                    selectedApprovalId = null;
                    const btn = document.getElementById('inbox-refresh-btn');
                    if (btn) btn.disabled = true;
                    const titleEl = document.getElementById('inbox-detail-title');
                    const subEl = document.getElementById('inbox-detail-subtitle');
                    const bodyEl = document.getElementById('inbox-detail-body');
                    if (titleEl) titleEl.textContent = 'Select an item';
                    if (subEl) subEl.textContent = 'Select an item to review details and take action.';
                    if (bodyEl) bodyEl.innerHTML = '';
                }
                return;
            }

            listEl.innerHTML = filtered.map(a => {
                const id = String(a.id || '');
                const title = escapeHtml(a.title || 'Approval');
                const rawUrgency = String(a.urgency || a.priority || 'normal').toLowerCase();
                const urgencyLabel = escapeHtml(humanizeUrgency(rawUrgency));
                const urgCls = (rawUrgency === 'high' || rawUrgency === 'critical') ? 'danger' : 'warning';
                const dueRelative = _formatRelativeTime(a.due_by || a.deadline_at);
                return `
                    <div class="list-item ${selectedApprovalId === id ? 'active' : ''}" onclick="selectApproval('${id}')">
                        <div class="list-item-title">
                            <span style="min-width:0; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;">${title}</span>
                            <span class="status-pill ${urgCls}"><span class="dot"></span>${urgencyLabel}</span>
                        </div>
                        <div class="list-item-meta">
                            ${dueRelative ? `<span>Due ${escapeHtml(dueRelative)}</span>` : `<span>Pending review</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function selectApproval(approvalId) {
            const id = String(approvalId || '').trim();
            if (!id) return;
            selectedApprovalId = id;
            const btn = document.getElementById('inbox-refresh-btn');
            if (btn) btn.disabled = false;
            renderInbox();

            const titleEl = document.getElementById('inbox-detail-title');
            const subEl = document.getElementById('inbox-detail-subtitle');
            const bodyEl = document.getElementById('inbox-detail-body');
            if (titleEl) titleEl.textContent = 'Loading…';
            if (subEl) subEl.textContent = 'Fetching approval details…';
            if (bodyEl) bodyEl.innerHTML = '';

            await refreshSelectedApproval();
        }

        async function refreshSelectedApproval() {
            const id = String(selectedApprovalId || '').trim();
            if (!id) return;
            try {
                const res = await fetch(`${API}/process/approvals/${id}`, { headers: { ...getAuthHeaders() } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((data && (data.detail || data.message)) ? (data.detail || data.message) : 'Failed to load approval');

                // Update cache
                const idx = (myApprovals || []).findIndex(x => String(x.id) === id);
                if (idx >= 0) myApprovals[idx] = data;
                else myApprovals = [data].concat(myApprovals || []);

                _renderApprovalDetail(data);
                renderInbox();
            } catch (e) {
                console.error('refreshSelectedApproval error:', e);
                const titleEl = document.getElementById('inbox-detail-title');
                const subEl = document.getElementById('inbox-detail-subtitle');
                const bodyEl = document.getElementById('inbox-detail-body');
                if (titleEl) titleEl.textContent = 'Unable to load approval';
                if (subEl) subEl.textContent = e?.message || 'Please try again.';
                if (bodyEl) bodyEl.innerHTML = '';
                showToast(e?.message || 'Failed to load approval', 'error');
            }
        }

        function _renderApprovalReviewRows(data) {
            if (!data || typeof data !== 'object') return '';
            const allKeys = new Set(Object.keys(data).map(k => k.toLowerCase()));
            const rows = [];
            for (const [rawKey, rawVal] of Object.entries(data)) {
                if (_isHiddenField(rawKey, allKeys)) continue;
                if (rawVal == null) continue;
                if (typeof rawVal === 'object' && !Array.isArray(rawVal)) {
                    if (rawVal.kind === 'uploadedFile') {
                        const rendered = _renderPortalValue(rawVal, rawKey);
                        if (!rendered.includes('detail-empty')) {
                            rows.push({ label: humanizeFieldLabel(rawKey) || rawKey, html: rendered });
                        }
                        continue;
                    }
                    const nested = _flattenResultForDisplay(rawVal);
                    nested.forEach(n => {
                        if (!n.value || (typeof n.value === 'string' && n.value.includes('detail-empty'))) return;
                        rows.push({ label: n.key, html: n.isHtml ? n.value : escapeHtml(String(n.value)) });
                    });
                    continue;
                }
                const rendered = _renderPortalValue(rawVal, rawKey);
                if (rendered.includes('detail-empty')) continue;
                rows.push({ label: humanizeFieldLabel(rawKey) || rawKey, html: rendered });
            }
            return rows;
        }

        function _renderApprovalDetail(a) {
            const titleEl = document.getElementById('inbox-detail-title');
            const subEl = document.getElementById('inbox-detail-subtitle');
            const bodyEl = document.getElementById('inbox-detail-body');
            if (!bodyEl) return;

            const title = a?.title || 'Approval';
            const desc = a?.description || '';
            const urgency = a?.urgency || a?.priority || 'normal';
            const urgencyLabel = humanizeUrgency(urgency);
            const urgencyCls = (urgency === 'high' || urgency === 'critical') ? 'danger' : 'warning';
            const dueBy = _formatDateTime(a?.due_by || a?.deadline_at);
            const dueRelative = _formatRelativeTime(a?.due_by || a?.deadline_at);
            const details = a?.details_to_review || a?.review_data || {};

            if (titleEl) titleEl.textContent = title;
            if (subEl) subEl.textContent = desc || 'Review the details below and make your decision.';

            const reviewRows = _renderApprovalReviewRows(details);
            const reviewHtml = reviewRows.length
                ? reviewRows.map(r => `<div class="detail-row"><div class="detail-label">${escapeHtml(r.label)}</div><div class="detail-value">${r.html}</div></div>`).join('')
                : `<div style="color: var(--text-muted); padding: 8px 0;">No additional details provided.</div>`;

            bodyEl.innerHTML = `
                <div class="request-hero ${urgencyCls}">
                    <div class="request-hero-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${urgency === 'high' || urgency === 'critical' ? 'var(--error)' : 'var(--warning)'}" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="request-hero-info">
                        <span class="status-pill ${urgencyCls}" style="font-size:0.82rem;"><span class="dot"></span>${escapeHtml(urgencyLabel)}</span>
                        <div class="request-hero-meta">
                            ${dueBy ? `<span>Due ${escapeHtml(dueRelative || dueBy)}</span>` : '<span>Pending review</span>'}
                        </div>
                    </div>
                </div>

                ${desc ? `<div style="margin-top: 14px; color: var(--text-secondary); line-height: 1.5; font-size: 0.92rem;">${escapeHtml(desc)}</div>` : ''}

                <div class="detail-section" style="margin-top: 16px;">
                    <div class="detail-section-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Details to Review
                    </div>
                    <div class="detail-section-body">${reviewHtml}</div>
                </div>

                <div class="detail-section" style="margin-top: 16px;">
                    <div class="detail-section-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        Your Decision
                    </div>
                    <div class="detail-section-body">
                        <div style="margin-bottom: 12px;">
                            <label style="font-size: 0.82rem; color: var(--text-muted); font-weight: 650; display: block; margin-bottom: 6px;">Comments (optional)</label>
                            <textarea id="approval-comments" class="modal-form-input" rows="3" placeholder="Add a note to explain your decision…" style="width:100%; box-sizing:border-box;"></textarea>
                        </div>
                        <div class="approval-actions">
                            <button class="approval-btn approve" onclick="decideApproval('approved')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                Approve
                            </button>
                            <button class="approval-btn reject" onclick="decideApproval('rejected')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Decline
                            </button>
                        </div>
                        <div id="approval-action-status" style="margin-top: 10px; color: var(--text-muted); font-size: 0.85rem;"></div>
                    </div>
                </div>
            `;
        }

        async function decideApproval(decision) {
            const id = String(selectedApprovalId || '').trim();
            if (!id) return;
            const d = String(decision || '').trim().toLowerCase();
            if (d !== 'approved' && d !== 'rejected') return;

            const statusEl = document.getElementById('approval-action-status');
            const commentsEl = document.getElementById('approval-comments');
            const comments = commentsEl ? String(commentsEl.value || '').trim() : '';
            const btns = document.querySelectorAll('.approval-btn');
            btns.forEach(b => { b.disabled = true; b.style.opacity = '0.6'; });

            try {
                if (statusEl) statusEl.textContent = (d === 'approved') ? 'Submitting your approval…' : 'Submitting your decision…';
                const res = await fetch(`${API}/process/approvals/${id}/decide`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({ decision: d, comments })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const rawMsg = (data && (data.detail || data.message)) ? (data.detail || data.message) : '';
                    throw new Error(friendlyErrorMessage(rawMsg, 'Unable to submit your decision. Please try again.'));
                }
                const label = (d === 'approved') ? 'Request approved successfully' : 'Request declined';
                showToast(label, 'success');
                if (statusEl) statusEl.textContent = '';
                selectedApprovalId = null;
                await refreshInbox();
                await refreshRequests();
            } catch (e) {
                console.error('decideApproval error:', e);
                showToast(e?.message || 'Unable to submit your decision. Please try again.', 'error');
                if (statusEl) statusEl.textContent = '';
                btns.forEach(b => { b.disabled = false; b.style.opacity = ''; });
            }
        }

        async function selectAgent(agentId) {
            currentAgent = agents.find(a => a.id === agentId);
            currentConversation = null;
            
            document.getElementById('current-agent-icon').textContent = currentAgent.icon || '🤖';
            document.getElementById('current-agent-name').textContent = currentAgent.name;
            
            renderAgents();
            await loadConversations();
            
            // If there are existing conversations, load the most recent one
            // Otherwise, start a new chat
            if (conversations.length > 0) {
                await loadConversation(conversations[0].id);
            } else {
                startNewChat();
            }
        }

        async function loadConversations() {
            if (!currentAgent) return;
            
            try {
                const response = await fetch(`${API}/api/agents/${currentAgent.id}/conversations`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const data = await response.json();
                conversations = data.conversations || [];
                renderHistory();
            } catch (e) {
                console.error('Failed to load conversations:', e);
            }
        }

        let selectionMode = false;
        let selectedChats = new Set();
        
        function renderHistory() {
            const container = document.getElementById('history-list');
            if (conversations.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No recent chats</p>';
                document.getElementById('history-actions').classList.add('hidden');
                document.getElementById('edit-chats-btn').style.display = 'none';
                return;
            }
            
            document.getElementById('edit-chats-btn').style.display = 'inline';
            
            container.innerHTML = conversations.slice(0, 20).map(conv => `
                <div class="history-item ${currentConversation?.id === conv.id ? 'active' : ''} ${selectedChats.has(conv.id) ? 'selected' : ''}" 
                     onclick="${selectionMode ? `toggleChatSelection('${conv.id}')` : `loadConversation('${conv.id}')`}">
                    ${selectionMode ? `<div class="history-checkbox ${selectedChats.has(conv.id) ? 'checked' : ''}" onclick="event.stopPropagation(); toggleChatSelection('${conv.id}')"></div>` : ''}
                    <span class="history-icon">💬</span>
                    <span class="history-title">${conv.title || 'Untitled'}</span>
                </div>
            `).join('');
            
            updateDeleteButton();
        }
        
        function toggleSelectionMode() {
            selectionMode = !selectionMode;
            selectedChats.clear();
            
            const editBtn = document.getElementById('edit-chats-btn');
            const actionsBar = document.getElementById('history-actions');
            
            if (selectionMode) {
                editBtn.textContent = 'Done';
                editBtn.style.color = 'var(--success)';
                actionsBar.classList.remove('hidden');
            } else {
                editBtn.textContent = 'Edit';
                editBtn.style.color = 'var(--primary)';
                actionsBar.classList.add('hidden');
            }
            
            renderHistory();
        }
        
        function toggleChatSelection(convId) {
            if (selectedChats.has(convId)) {
                selectedChats.delete(convId);
            } else {
                selectedChats.add(convId);
            }
            renderHistory();
        }
        
        function toggleSelectAll() {
            const allIds = conversations.slice(0, 20).map(c => c.id);
            
            if (selectedChats.size === allIds.length) {
                // Deselect all
                selectedChats.clear();
                document.getElementById('select-all-text').textContent = 'Select All';
            } else {
                // Select all
                allIds.forEach(id => selectedChats.add(id));
                document.getElementById('select-all-text').textContent = 'Deselect All';
            }
            
            renderHistory();
        }
        
        function updateDeleteButton() {
            const btn = document.getElementById('delete-selected-btn');
            const count = selectedChats.size;
            btn.textContent = `Delete (${count})`;
            btn.disabled = count === 0;
        }
        
        async function deleteSelectedChats() {
            if (selectedChats.size === 0) return;
            
            const count = selectedChats.size;
            if (!confirm(`Are you sure you want to delete ${count} conversation${count > 1 ? 's' : ''}? This cannot be undone.`)) {
                return;
            }
            
            const btn = document.getElementById('delete-selected-btn');
            btn.textContent = 'Deleting...';
            btn.disabled = true;
            
            try {
                // Use bulk delete API
                const response = await fetch(`${API}/api/conversations/bulk`, {
                    method: 'DELETE',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}` 
                    },
                    body: JSON.stringify({
                        conversation_ids: Array.from(selectedChats)
                    })
                });
                
                const result = await response.json();
                
                // Check if current conversation was deleted
                if (currentConversation && selectedChats.has(currentConversation.id)) {
                    currentConversation = null;
                    startNewChat();
                }
                
                // Clear selection
                selectedChats.clear();
                
                // Reload conversations
                await loadConversations();
                
                // Exit selection mode
                toggleSelectionMode();
                
                // Show result
                if (result.deleted > 0) {
                    console.log(`✅ Deleted ${result.deleted} conversation(s)`);
                }
                if (result.failed > 0) {
                    alert(`Failed to delete ${result.failed} conversation(s)`);
                }
                
            } catch (e) {
                console.error('Failed to delete conversations:', e);
                alert('Failed to delete conversations. Please try again.');
                updateDeleteButton();
            }
        }

        async function loadConversation(convId) {
            try {
                const response = await fetch(`${API}/api/conversations/${convId}`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                const conv = await response.json();
                currentConversation = conv;

                const container = document.getElementById('messages-container');
                const welcome = document.getElementById('welcome-screen');
                if (welcome) welcome.style.display = 'none';

                container.innerHTML = (conv.messages || []).map(msg => createMessageHTML(msg.role, msg.content)).join('');
                container.scrollTop = container.scrollHeight;

                renderHistory();
            } catch (e) {
                console.error('Failed to load conversation:', e);
            }
        }

        async function startNewChat() {
            currentConversation = null;
            const container = document.getElementById('messages-container');
            
            // Show loading state
            container.innerHTML = `
                <div class="welcome-screen" id="welcome-screen">
                    <div class="welcome-icon">${currentAgent?.icon || '⏳'}</div>
                    <h1 class="welcome-title">Loading...</h1>
                </div>
            `;
            
            // Call start-chat to get personalized session
            
            try {
                const response = await fetch(`/api/agents/${currentAgent.id}/start-chat`, {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const session = await response.json();
                    
                    // Store conversation ID for later use
                    currentConversation = { id: session.conversation_id, messages: [] };
                    
                    // Build personalized welcome
                    const userName = session.user_name || 'there';
                    const hasRestrictions = session.denied_tasks && session.denied_tasks.length > 0;
                    
                    
                    let welcomeTitle = `Hi ${userName}! 👋`;
                    let welcomeSubtitle = session.message || `I'm ${currentAgent.name}. How can I help you today?`;
                    
                    // Show available tasks if user has restrictions
                    let tasksInfo = '';
                    if (hasRestrictions && session.accessible_tasks) {
                        tasksInfo = `
                            <div class="available-tasks" style="margin-top: 1rem; padding: 0.75rem; background: rgba(76,175,80,0.1); border-radius: 8px; text-align: left;">
                                <strong style="color: #4CAF50;">✅ Available for you:</strong>
                                <div style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                                    ${session.accessible_tasks.map(t => `• ${t}`).join('<br>')}
                                </div>
                            </div>
                        `;
                    }
                    
                    container.innerHTML = `
                        <div class="welcome-screen" id="welcome-screen">
                            <div class="welcome-icon">${currentAgent?.icon || '👋'}</div>
                            <h1 class="welcome-title">${welcomeTitle}</h1>
                            <p class="welcome-subtitle">${welcomeSubtitle}</p>
                            ${tasksInfo}
                            <div class="suggestions">
                                <div class="suggestion-chip" onclick="sendSuggestion(this)">What can you help me with?</div>
                                <div class="suggestion-chip" onclick="sendSuggestion(this)">Tell me about your capabilities</div>
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback to generic welcome
                    const errorText = await response.text();
                    container.innerHTML = `
                        <div class="welcome-screen" id="welcome-screen">
                            <div class="welcome-icon">${currentAgent?.icon || '👋'}</div>
                            <h1 class="welcome-title">How can I help you today?</h1>
                            <p class="welcome-subtitle">${currentAgent?.description || 'Start a conversation with me!'}</p>
                            <div class="suggestions">
                                <div class="suggestion-chip" onclick="sendSuggestion(this)">What can you help me with?</div>
                                <div class="suggestion-chip" onclick="sendSuggestion(this)">Tell me about your capabilities</div>
                            </div>
                        </div>
                    `;
                }
            } catch (e) {
                // Fallback to generic welcome
                container.innerHTML = `
                    <div class="welcome-screen" id="welcome-screen">
                        <div class="welcome-icon">${currentAgent?.icon || '👋'}</div>
                        <h1 class="welcome-title">How can I help you today?</h1>
                        <p class="welcome-subtitle">${currentAgent?.goal || 'Start a conversation with me!'}</p>
                        <div class="suggestions">
                            <div class="suggestion-chip" onclick="sendSuggestion(this)">What can you help me with?</div>
                            <div class="suggestion-chip" onclick="sendSuggestion(this)">Tell me about your capabilities</div>
                        </div>
                    </div>
                `;
            }
            
            renderHistory();
        }

        function createMessageHTML(role, content) {
            const isUser = role === 'user';
            const avatar = isUser ? (currentUser?.full_name?.[0] || 'U') : (currentAgent?.icon || '🤖');
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="message ${role}">
                    <div class="message-avatar">${avatar}</div>
                    <div>
                        <div class="message-content">${formatMessage(content)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        }

        function formatMessage(content) {
            // Full markdown formatting with table support (same as index.html)
            if (!content || typeof content !== 'string') return '';
            let text = String(content);
            
            // Convert LaTeX math symbols to readable format
            text = text.replace(/\\times/g, '×');
            text = text.replace(/\\div/g, '÷');
            text = text.replace(/\\pm/g, '±');
            text = text.replace(/\\leq/g, '≤');
            text = text.replace(/\\geq/g, '≥');
            text = text.replace(/\\neq/g, '≠');
            text = text.replace(/\\approx/g, '≈');
            text = text.replace(/\\cdot/g, '·');
            text = text.replace(/\\text\{([^}]+)\}/g, '$1');
            text = text.replace(/\\\[/g, '');
            text = text.replace(/\\\]/g, '');
            text = text.replace(/\\\(/g, '');
            text = text.replace(/\\\)/g, '');
            
            if (typeof marked !== 'undefined') {
                marked.setOptions({ breaks: true, gfm: true });
                let html = marked.parse(text);
                // Wrap tables in responsive container
                html = html.replace(/<table>/g, '<div class="table-container"><table>');
                html = html.replace(/<\/table>/g, '</table></div>');
                return html;
            }
            
            // Fallback
            return content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }

        function sendSuggestion(el) {
            document.getElementById('message-input').value = el.textContent;
            sendMessage();
        }

        async function sendMessage() {
            // Use the file-aware version
            return sendMessageWithFiles();
        }
        
        async function sendMessageOriginal() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            if (!message || !currentAgent) return;
            
            input.value = '';
            autoResize(input);
            
            // Hide welcome screen
            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.style.display = 'none';
            
            // Add user message
            const container = document.getElementById('messages-container');
            container.innerHTML += createMessageHTML('user', message);
            
            // Add typing indicator
            container.innerHTML += `
                <div class="message assistant" id="typing-msg">
                    <div class="message-avatar">${currentAgent.icon || '🤖'}</div>
                    <div class="message-content">
                        <div class="typing-indicator">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
            `;
            container.scrollTop = container.scrollHeight;
            
            try {
                const response = await fetch(`${API}/api/agents/${currentAgent.id}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        message,
                        conversation_id: currentConversation?.id
                    })
                });
                
                const data = await response.json();
                
                // Remove typing indicator
                document.getElementById('typing-msg')?.remove();
                
                // Update conversation ID
                if (data.conversation_id) {
                    currentConversation = { id: data.conversation_id };
                }
                
                // Add assistant response
                container.innerHTML += createMessageHTML('assistant', data.response || data.content || 'I apologize, but I was unable to generate a response.');
                container.scrollTop = container.scrollHeight;
                playNotificationSound();
                
                // Reload conversations list
                loadConversations();
                
            } catch (e) {
                document.getElementById('typing-msg')?.remove();
                container.innerHTML += createMessageHTML('assistant', 'Sorry, something went wrong. Please try again.');
                container.scrollTop = container.scrollHeight;
            }
        }

        function handleKeyDown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        }

        function autoResize(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }

        function toggleUserMenu(event) {
            if (event) event.stopPropagation();
            document.getElementById('user-menu').classList.toggle('open');
        }

        function handleLogout() {
            try {
                localStorage.removeItem('agentforge_token');
                sessionStorage.removeItem('agentforge_token');
                localStorage.removeItem('token'); // legacy
                sessionStorage.removeItem('token'); // legacy
            } catch (_) { /* ignore */ }
            currentUser = null;
            location.reload();
        }

        async function clearCurrentChat() {
            if (currentConversation && confirm('Clear this conversation?')) {
                try {
                    await fetch(`${API}/api/conversations/${currentConversation.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${getToken()}` }
                    });
                    startNewChat();
                    loadConversations();
                } catch (e) {
                    console.error('Failed to clear chat:', e);
                }
            }
        }

        let selectedFiles = [];
        
        function attachFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.pdf,.doc,.docx,.txt,.csv,.json,.md';
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                selectedFiles = [...selectedFiles, ...files];
                showSelectedFiles();
            };
            input.click();
        }
        
        function showSelectedFiles() {
            let container = document.getElementById('selected-files');
            if (!container) {
                const inputArea = document.querySelector('.input-area');
                container = document.createElement('div');
                container.id = 'selected-files';
                container.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; padding: 8px 16px; border-bottom: 1px solid var(--border);';
                inputArea.insertBefore(container, inputArea.firstChild);
            }
            
            container.innerHTML = selectedFiles.map((file, idx) => `
                <div style="background: var(--bg-hover); padding: 6px 10px; border-radius: 8px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
                    <span>📎 ${file.name}</span>
                    <button onclick="removeFile(${idx})" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">✕</button>
                </div>
            `).join('');
            
            if (selectedFiles.length === 0) {
                container.remove();
            }
        }
        
        function removeFile(idx) {
            selectedFiles.splice(idx, 1);
            showSelectedFiles();
        }
        
        // ============================================================================
        // STREAMING CHAT - Real-time thinking/reasoning display (like ChatGPT/Cursor)
        // ============================================================================
        
        function createThinkingContainer() {
            return `
                <div class="thinking-inline" id="thinking-container" style="padding: 8px 0;">
                    <span style="display: inline-block; width: 8px; height: 8px; background: #a855f7; border-radius: 50%; animation: pulse 1s infinite; margin-right: 8px;"></span>
                    <span id="thinking-text" style="color: #a1a1aa; font-style: italic;">...</span>
                </div>
            `;
        }
        
        function addThinkingStep(type, content, extra = {}) {
            const textEl = document.getElementById('thinking-text');
            if (!textEl) return;
            
            // Just update the text - simple inline display
            textEl.textContent = content;
            
            // Keep for compatibility but simplified
            let icon = '💭';
            let iconClass = 'thinking';
            
            switch(type) {
                case 'thinking':
                    icon = '💭';
                    iconClass = 'thinking';
                    break;
                case 'tool_call':
                    icon = '🔧';
                    iconClass = 'tool';
                    break;
                case 'tool_result':
                    icon = extra.success ? '✅' : '❌';
                    iconClass = extra.success ? 'success' : 'error';
                    break;
                case 'source':
                    icon = '📚';
                    iconClass = 'source';
                    break;
                case 'error':
                    icon = '⚠️';
                    iconClass = 'error';
                    break;
            }
            
            const stepHTML = `
                <div class="thinking-step">
                    <span class="step-icon ${iconClass}">${icon}</span>
                    <span class="step-content">${content}${extra.tool ? `<span class="tool-badge">🔧 ${extra.tool}</span>` : ''}</span>
                </div>
            `;
            
            stepsContainer.innerHTML += stepHTML;
            stepsContainer.scrollTop = stepsContainer.scrollHeight;
            
            // Scroll main container too
            const container = document.getElementById('messages-container');
            container.scrollTop = container.scrollHeight;
        }
        
        function toggleThinkingSteps() {
            const steps = document.getElementById('thinking-steps');
            const toggle = document.getElementById('thinking-toggle');
            if (steps && toggle) {
                steps.classList.toggle('collapsed');
                toggle.classList.toggle('collapsed');
            }
        }
        
        function finishThinking(success = true) {
            const container = document.getElementById('thinking-container');
            if (container) {
                container.style.display = 'none';
            }
        }
        
        function clearStreamingIds() {
            ['streaming-msg', 'streaming-content', 'thinking-container', 'thinking-text'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.removeAttribute('id');
            });
        }
        
        async function sendMessageStreaming(message) {
            const container = document.getElementById('messages-container');
            
            // Add thinking container
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message assistant';
            thinkingDiv.id = 'streaming-msg';
            thinkingDiv.innerHTML = `
                <div class="message-avatar">${currentAgent.icon || '🤖'}</div>
                <div style="flex: 1;">
                    ${createThinkingContainer()}
                    <div class="message-content" id="streaming-content" style="display: none;"></div>
                </div>
            `;
            container.appendChild(thinkingDiv);
            container.scrollTop = container.scrollHeight;
            
            let fullContent = '';
            let sources = [];
            let buffer = ''; // Buffer for incomplete SSE data
            
            try {
                const response = await fetch(`${API}/api/agents/${currentAgent.id}/chat/stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        message,
                        conversation_id: currentConversation?.id,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })
                });
                
                if (!response.ok) {
                    if (response.status === 403) {
                        const data = await response.json();
                        const errorMessage = data.detail?.message || 'Access denied';
                        addThinkingStep('error', errorMessage);
                        finishThinking(false);
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // Add to buffer and process complete lines
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;
                                const data = JSON.parse(jsonStr);
                                
                                switch (data.type) {
                                    case 'thinking':
                                        addThinkingStep('thinking', data.content);
                                        break;
                                        
                                    case 'tool_call':
                                        addThinkingStep('tool_call', data.content, { tool: data.tool });
                                        break;
                                        
                                    case 'tool_result':
                                        addThinkingStep('tool_result', data.content, { 
                                            tool: data.tool, 
                                            success: data.success 
                                        });
                                        break;
                                        
                                    case 'conversation_id':
                                        currentConversation = { id: data.content };
                                        break;
                                        
                                    case 'content':
                                        fullContent += data.content;
                                        const contentDiv = document.getElementById('streaming-content');
                                        if (contentDiv) {
                                            contentDiv.style.display = 'block';
                                            contentDiv.innerHTML = formatMessage(fullContent);
                                        }
                                        container.scrollTop = container.scrollHeight;
                                        break;
                                        
                                    case 'sources':
                                        sources = data.content;
                                        break;
                                        
                                    case 'done':
                                        finishThinking(true);
                                        playNotificationSound();
                                        
                                        // Add sources if any are relevant
                                        const meaningfulSources = (sources || []).filter(s => (s.relevance || 0) >= 30);
                                        if (meaningfulSources.length > 0) {
                                            const contentDiv = document.getElementById('streaming-content');
                                            if (contentDiv) {
                                                const seen = new Set();
                                                const unique = meaningfulSources.filter(s => {
                                                    const k = s.source;
                                                    if (seen.has(k)) return false;
                                                    seen.add(k);
                                                    return true;
                                                });
                                                let sourcesHTML = `<div class="sources-section"><div class="sources-title">Based on</div><div class="sources-list">`;
                                                unique.forEach(s => {
                                                    const name = s.source.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
                                                    sourcesHTML += `<span class="source-chip">${name}</span>`;
                                                });
                                                sourcesHTML += '</div></div>';
                                                contentDiv.innerHTML += sourcesHTML;
                                            }
                                        }
                                        
                                        clearStreamingIds();
                                        
                                        // Reload conversations
                                        loadConversations();
                                        break;
                                        
                                    case 'error':
                                        addThinkingStep('error', data.content);
                                        finishThinking(false);
                                        clearStreamingIds();
                                        break;
                                }
                            } catch (e) {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
                
            } catch (e) {
                console.error('Streaming error:', e);
                addThinkingStep('error', `Connection error: ${e?.message || 'Unknown error'}. Please try again.`);
                finishThinking(false);
                // If streaming-content has no content, show error as a message
                const contentDiv = document.getElementById('streaming-content');
                if (contentDiv && !fullContent) {
                    contentDiv.style.display = 'block';
                    contentDiv.innerHTML = `<p style="color: var(--error);">Failed to get a response. Please try again.</p>`;
                }
                clearStreamingIds();
            }
        }
        
        async function sendMessageWithFiles() {
            const input = document.getElementById('message-input');
            const message = input.value.trim();
            if ((!message && selectedFiles.length === 0) || !currentAgent) return;
            
            input.value = '';
            autoResize(input);
            
            // Hide welcome screen
            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.style.display = 'none';
            
            // Show user message with file indicators
            const container = document.getElementById('messages-container');
            let fileIndicators = selectedFiles.map(f => `📎 ${f.name}`).join(', ');
            container.innerHTML += createMessageHTML('user', message + (fileIndicators ? `\n\n${fileIndicators}` : ''));
            
            // If files are attached, use the non-streaming endpoint
            if (selectedFiles.length > 0) {
                // Add typing indicator for file uploads
                container.innerHTML += `
                    <div class="message assistant" id="typing-msg">
                        <div class="message-avatar">${currentAgent.icon || '🤖'}</div>
                        <div class="message-content">
                            <div class="typing-indicator">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        </div>
                    </div>
                `;
                container.scrollTop = container.scrollHeight;
                
                try {
                    const formData = new FormData();
                    formData.append('message', message);
                    if (currentConversation?.id) {
                        formData.append('conversation_id', currentConversation.id);
                    }
                    selectedFiles.forEach(file => formData.append('files', file));
                    
                    const response = await fetch(`${API}/api/agents/${currentAgent.id}/chat-with-files`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${getToken()}`
                        },
                        body: formData
                    });
                    
                    // Clear selected files
                    selectedFiles = [];
                    showSelectedFiles();
                    
                    const data = await response.json();
                    document.getElementById('typing-msg')?.remove();
                    
                    if (response.status === 403) {
                        const errorMessage = data.detail?.message || data.message || 
                            'This assistant is not available for your account.';
                        container.innerHTML += createMessageHTML('assistant', `⚠️ ${errorMessage}`);
                        container.scrollTop = container.scrollHeight;
                        return;
                    }
                    
                    if (!response.ok) {
                        const errorMessage = data.detail?.message || data.message || 
                            'Sorry, I could not process that request.';
                        container.innerHTML += createMessageHTML('assistant', `Sorry, ${errorMessage}`);
                        container.scrollTop = container.scrollHeight;
                        return;
                    }
                    
                    if (data.conversation_id) {
                        currentConversation = { id: data.conversation_id };
                    }
                    
                    container.innerHTML += createMessageHTML('assistant', data.response || data.content || 'Sorry, I could not process that request.');
                    container.scrollTop = container.scrollHeight;
                    
                } catch (e) {
                    console.error('Failed to send message with files:', e);
                    document.getElementById('typing-msg')?.remove();
                    container.innerHTML += createMessageHTML('assistant', 'Sorry, we encountered an unexpected issue.');
                    container.scrollTop = container.scrollHeight;
                }
            } else {
                // Use streaming for regular messages (no files)
                await sendMessageStreaming(message);
            }
        }

        // Mobile menu
        function setupMobileMenu() {
            if (window.innerWidth <= 768) {
                document.getElementById('mobile-menu-btn').style.display = 'flex';
            }
            window.addEventListener('resize', () => {
                document.getElementById('mobile-menu-btn').style.display = window.innerWidth <= 768 ? 'flex' : 'none';
            });
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('sidebar-overlay').classList.toggle('open');
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-overlay').classList.remove('open');
        }

        // Close user menu on outside click
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('user-menu');
            const trigger = e.target.closest('.user-profile-trigger');
            if (!trigger && !e.target.closest('.user-menu')) {
                menu.classList.remove('open');
            }
        });

        // =============================================
        // PROFILE & SETTINGS MODALS
        // =============================================
        
        function showProfile() {
            toggleUserMenu();
            document.getElementById('profile-modal').classList.add('open');
            loadProfileData();
        }

        function hideProfile() {
            document.getElementById('profile-modal').classList.remove('open');
        }

        async function loadProfileData() {
            if (!currentUser) return;
            
            // Fetch fresh user data
            try {
                const response = await fetch(`${API}/api/security/auth/me`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (response.ok) {
                    const userData = await response.json();
                    currentUser = { ...currentUser, ...userData };
                }
            } catch (e) {
                console.log('Using cached user data');
            }
            
            const firstName = currentUser.profile?.first_name || currentUser.first_name || '';
            const lastName = currentUser.profile?.last_name || currentUser.last_name || '';
            const fullName = currentUser.full_name || `${firstName} ${lastName}`.trim() || currentUser.email;
            
            document.getElementById('profile-name-display').textContent = fullName;
            document.getElementById('profile-email-display').textContent = currentUser.email;
            document.getElementById('profile-avatar-display').textContent = fullName[0].toUpperCase();
            
            // Fill name fields
            document.getElementById('profile-first-name').value = firstName;
            document.getElementById('profile-last-name').value = lastName;
            
            // Load MFA status
            const mfaBadge = document.getElementById('mfa-status-badge');
            const mfaToggle = document.getElementById('mfa-toggle');
            const mfaInfo = currentUser.mfa || {};
            const isMfaEnabled = mfaInfo.enabled || currentUser.mfa_enabled || (currentUser.mfa_method && currentUser.mfa_method !== 'none');
            
            if (isMfaEnabled) {
                mfaBadge.textContent = '✓ Enabled';
                mfaBadge.className = 'mfa-badge enabled';
                mfaToggle.classList.add('active');
            } else {
                mfaBadge.textContent = '✗ Disabled';
                mfaBadge.className = 'mfa-badge disabled';
                mfaToggle.classList.remove('active');
            }
        }

        async function updateProfile() {
            const firstName = document.getElementById('profile-first-name').value.trim();
            const lastName = document.getElementById('profile-last-name').value.trim();
            
            if (!currentUser || !currentUser.id) {
                alert('Please login again');
                return;
            }
            
            try {
                const response = await fetch(`${API}/api/security/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName
                    })
                });
                
                if (response.ok) {
                    // Update local state
                    currentUser.profile = { first_name: firstName, last_name: lastName };
                    currentUser.full_name = `${firstName} ${lastName}`.trim();
                    
                    // Update UI
                    document.getElementById('profile-name-display').textContent = currentUser.full_name || currentUser.email;
                    document.getElementById('profile-avatar-display').textContent = (currentUser.full_name || currentUser.email)[0].toUpperCase();
                    document.getElementById('user-name').textContent = currentUser.full_name || currentUser.email;
                    document.getElementById('user-avatar').textContent = (currentUser.full_name || currentUser.email)[0].toUpperCase();
                    
                    alert('Profile updated successfully!');
                } else {
                    const data = await response.json();
                    alert(data.detail || 'Failed to update profile');
                }
            } catch (e) {
                console.error('Profile update error:', e);
                alert('Failed to update profile. Please try again.');
            }
        }

        function showSettings() {
            toggleUserMenu();
            document.getElementById('settings-modal').classList.add('open');
            loadThemeSettings();
            loadSoundSetting();
            loadBrandingSettingsUI();
        }

        function hideSettings() {
            document.getElementById('settings-modal').classList.remove('open');
        }

        function _getSavedTheme() {
            // Shared key across the platform
            const t = localStorage.getItem('agentforge-theme');
            if (t) return t;
            // Migrate legacy portal key (backward compatibility)
            const legacy = localStorage.getItem('enduser-theme');
            if (legacy) {
                const mapped = (legacy === 'system') ? 'dark' : legacy;
                localStorage.setItem('agentforge-theme', mapped);
                try { localStorage.removeItem('enduser-theme'); } catch (_) { /* ignore */ }
                return mapped;
            }
            return 'dark';
        }

        function loadThemeSettings() {
            const theme = _getSavedTheme();
            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.theme === theme);
            });
        }

        function setTheme(theme) {
            const t = String(theme || 'dark').trim().toLowerCase();
            localStorage.setItem('agentforge-theme', t);
            applyTheme(t);
            loadThemeSettings();
        }

        function applyTheme(theme) {
            const t = String(theme || 'dark').trim().toLowerCase();
            if (!t || t === 'dark') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', t);
        }

        // =========== SOUND EFFECTS ===========
        let soundEnabled = localStorage.getItem('agentforge-sound') !== 'off';
        const _notifSoundCtx = { ctx: null, ready: false };

        function _ensureAudioCtx() {
            if (_notifSoundCtx.ctx) return _notifSoundCtx.ctx;
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                _notifSoundCtx.ctx = new AC();
                _notifSoundCtx.ready = true;
            } catch (_) { _notifSoundCtx.ready = false; }
            return _notifSoundCtx.ctx;
        }

        function playNotificationSound() {
            if (!soundEnabled) return;
            try {
                const ctx = _ensureAudioCtx();
                if (!ctx) return;
                // Simple pleasant two-tone chime
                const now = ctx.currentTime;
                [523.25, 659.25].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, now + i * 0.12);
                    gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + i * 0.12);
                    osc.stop(now + i * 0.12 + 0.4);
                });
            } catch (_) { /* ignore */ }
        }

        function toggleSoundEffects() {
            soundEnabled = !soundEnabled;
            localStorage.setItem('agentforge-sound', soundEnabled ? 'on' : 'off');
            const toggle = document.getElementById('sound-toggle');
            if (toggle) toggle.classList.toggle('active', soundEnabled);
            if (soundEnabled) playNotificationSound(); // Demo
        }

        function loadSoundSetting() {
            soundEnabled = localStorage.getItem('agentforge-sound') !== 'off';
            const toggle = document.getElementById('sound-toggle');
            if (toggle) toggle.classList.toggle('active', soundEnabled);
        }

        // Sync UI state on load (theme is applied early by theme.js)
        document.addEventListener('DOMContentLoaded', () => {
            loadThemeSettings();
            loadSoundSetting();
        });

        function _roleNames(u) {
            const roles = (u && Array.isArray(u.roles)) ? u.roles : [];
            return roles.map(r => {
                if (!r) return '';
                if (typeof r === 'string') return r;
                if (typeof r === 'object') return r.name || r.id || r.role || '';
                return String(r);
            }).map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
        }

        function isOrgBrandingAdmin() {
            // Backend enforcement exists; this only controls UI visibility.
            if (!currentUser) return false;
            const roles = _roleNames(currentUser);
            if (roles.includes('super_admin') || roles.includes('admin') || roles.includes('org_admin')) return true;
            // Also check portal_access or is_admin flags from backend
            if (currentUser.portal_access === 'admin' || currentUser.is_admin === true) return true;
            return isPortalAdmin();
        }

        function _setValue(id, value) {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = (value == null) ? '' : String(value);
        }

        function loadBrandingSettingsUI() {
            const section = document.getElementById('branding-settings-section');
            if (!section) return;
            if (!isOrgBrandingAdmin()) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';

            const b = (currentBranding && typeof currentBranding === 'object') ? currentBranding : {};
            _setValue('brand-org-name', b.name || '');
            _setValue('brand-logo-url', b.logo_url || '');
            _setValue('brand-favicon-url', b.favicon_url || '');
            _setValue('brand-primary', b.primary_color || '');
            _setValue('brand-secondary', b.secondary_color || '');
            _setValue('brand-banner-text', b.banner_text || '');
            _setValue('brand-banner-bg', b.banner_bg_color || '');
            _setValue('brand-banner-text-color', b.banner_text_color || '');
            _setValue('brand-chat-title', b.chat_welcome_title || '');
            _setValue('brand-chat-message', b.chat_welcome_message || '');
            _setValue('brand-custom-css', b.custom_css || '');

            // Sync color pickers with text inputs
            try {
                const pc = (b.primary_color || '').trim();
                const sc = (b.secondary_color || '').trim();
                if (pc && pc.startsWith('#')) document.getElementById('brand-primary-picker').value = pc;
                if (sc && sc.startsWith('#')) document.getElementById('brand-secondary-picker').value = sc;
                const bbg = (b.banner_bg_color || '').trim();
                const btc = (b.banner_text_color || '').trim();
                if (bbg && bbg.startsWith('#')) document.getElementById('brand-banner-bg-picker').value = bbg;
                if (btc && btc.startsWith('#')) document.getElementById('brand-banner-tc-picker').value = btc;
            } catch (_) { /* ignore */ }

            // Friendly defaults for banner colors
            try {
                const bannerEnabled = !!b.banner_enabled;
                const tcEl = document.getElementById('brand-banner-text-color');
                if (bannerEnabled && tcEl && !(tcEl.value || '').trim()) {
                    tcEl.value = '#FFFFFF';
                    const pick = document.getElementById('brand-banner-tc-picker');
                    if (pick) pick.value = '#FFFFFF';
                }
            } catch (_) { /* ignore */ }

            // Show logo/favicon previews
            _showBrandPreview('logo', b.logo_url || '');
            _showBrandPreview('favicon', b.favicon_url || '');

            const bannerToggle = document.getElementById('brand-banner-enabled');
            if (bannerToggle) bannerToggle.classList.toggle('active', !!b.banner_enabled);

            const status = document.getElementById('brand-save-status');
            if (status) status.textContent = '';
        }

        function _showBrandPreview(type, url) {
            const preview = document.getElementById(`brand-${type}-preview`);
            const label = document.getElementById(`brand-${type}-label`);
            if (!preview) return;
            if (url) {
                preview.src = url;
                preview.style.display = 'inline-block';
                if (label) label.innerHTML = '<strong>Uploaded</strong> — click to replace';
            } else {
                preview.style.display = 'none';
                if (label) label.innerHTML = `<strong>Click or drop</strong> to upload ${type}`;
            }
        }

        function handleBrandFileUpload(event, type) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                showToast('File too large (max 2 MB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                const hiddenInput = document.getElementById(`brand-${type}-url`);
                if (hiddenInput) hiddenInput.value = dataUrl;
                _showBrandPreview(type, dataUrl);
            };
            reader.readAsDataURL(file);
        }

        function handleBrandCSSUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            if (file.size > 500 * 1024) {
                showToast('CSS file too large (max 500 KB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const cssText = e.target.result;
                const el = document.getElementById('brand-custom-css');
                if (el) el.value = cssText;
                showToast('CSS file loaded', 'success');
            };
            reader.readAsText(file);
        }

        async function saveBrandingSettings() {
            if (!isOrgBrandingAdmin()) {
                showToast('Admin access required to update branding', 'error');
                return;
            }
            const status = document.getElementById('brand-save-status');
            if (status) status.textContent = 'Saving…';

            const payload = {
                name: (document.getElementById('brand-org-name')?.value || '').trim(),
                logo_url: (document.getElementById('brand-logo-url')?.value || '').trim(),
                favicon_url: (document.getElementById('brand-favicon-url')?.value || '').trim(),
                primary_color: (document.getElementById('brand-primary')?.value || '').trim(),
                secondary_color: (document.getElementById('brand-secondary')?.value || '').trim(),
                banner_enabled: document.getElementById('brand-banner-enabled')?.classList.contains('active') || false,
                banner_text: (document.getElementById('brand-banner-text')?.value || '').trim(),
                banner_bg_color: (document.getElementById('brand-banner-bg')?.value || '').trim(),
                banner_text_color: (document.getElementById('brand-banner-text-color')?.value || '').trim(),
                chat_welcome_title: (document.getElementById('brand-chat-title')?.value || '').trim(),
                chat_welcome_message: (document.getElementById('brand-chat-message')?.value || '').trim(),
                custom_css: (document.getElementById('brand-custom-css')?.value || '').trim()
            };

            // Normalize empty strings to null (backend stores only provided values)
            // Keep booleans as-is
            Object.keys(payload).forEach(k => {
                if (typeof payload[k] === 'boolean') return;
                if (payload[k] === '') payload[k] = null;
            });
            // If banner is enabled but text color is missing, default to white
            if (payload.banner_enabled && !payload.banner_text_color) payload.banner_text_color = '#FFFFFF';
            console.log('📦 Saving branding payload:', JSON.stringify(payload).substring(0, 500));

            try {
                const res = await fetch(`${API}/api/organization/branding`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = data?.detail || data?.message || 'Failed to update branding';
                    throw new Error(String(msg));
                }
                showToast('Branding updated', 'success');
                if (status) status.textContent = 'Saved.';
                await loadBranding();
                loadBrandingSettingsUI();
            } catch (e) {
                console.error('saveBrandingSettings error:', e);
                showToast(e?.message || 'Failed to update branding', 'error');
                if (status) status.textContent = '';
            }
        }

        async function resetBrandingSettings() {
            if (!isOrgBrandingAdmin()) return;
            try {
                if (!confirm('Reset branding to defaults for this organization?')) return;
            } catch (_) { /* ignore */ }
            const status = document.getElementById('brand-save-status');
            if (status) status.textContent = 'Resetting…';
            try {
                const res = await fetch(`${API}/api/organization/branding`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        logo_url: null,
                        favicon_url: null,
                        primary_color: null,
                        secondary_color: null,
                        banner_enabled: false,
                        banner_text: null,
                        banner_bg_color: null,
                        banner_text_color: null,
                        chat_welcome_title: null,
                        chat_welcome_message: null,
                        theme: null,
                        custom_css: null
                    })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = data?.detail || data?.message || 'Failed to reset branding';
                    throw new Error(String(msg));
                }
                showToast('Branding reset', 'success');
                if (status) status.textContent = '';
                await loadBranding();
                loadBrandingSettingsUI();
            } catch (e) {
                console.error('resetBrandingSettings error:', e);
                showToast(e?.message || 'Failed to reset branding', 'error');
                if (status) status.textContent = '';
            }
        }

        function showChangePassword() {
            document.getElementById('change-password-section').classList.remove('hidden');
        }

        function togglePasswordVisibility(inputId, btn) {
            const input = document.getElementById(inputId);
            const eyeIcon = btn.querySelector('.eye-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.classList.add('active');
                // Eye with slash (password visible)
                eyeIcon.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                input.type = 'password';
                btn.classList.remove('active');
                // Eye open (password hidden)
                eyeIcon.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        }

        async function changePassword() {
            const currentPwd = document.getElementById('current-password').value;
            const newPwd = document.getElementById('new-password').value;
            const confirmPwd = document.getElementById('confirm-password').value;
            
            if (newPwd !== confirmPwd) {
                alert('New passwords do not match!');
                return;
            }
            
            if (newPwd.length < 8) {
                alert('Password must be at least 8 characters!');
                return;
            }
            
            try {
                const response = await fetch(`${API}/api/security/auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        current_password: currentPwd,
                        new_password: newPwd
                    })
                });
                
                if (response.ok) {
                    alert('Password changed successfully!');
                    document.getElementById('change-password-section').classList.add('hidden');
                    document.getElementById('current-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';
                } else {
                    const data = await response.json();
                    alert(data.detail || 'Failed to change password');
                }
            } catch (e) {
                alert('Failed to change password. Please try again.');
            }
        }

        async function toggleMFA() {
            const toggle = document.getElementById('mfa-toggle');
            const isEnabled = toggle.classList.contains('active');
            
            if (isEnabled) {
                // Disable MFA - need password and current MFA code
                showMFADisableModal();
            } else {
                // Enable MFA - show setup
                showMFASetup();
            }
        }

        function showMFADisableModal() {
            const content = document.getElementById('mfa-setup-content');
            document.getElementById('mfa-setup-modal').classList.add('open');
            content.innerHTML = `
                <p style="color: var(--text-secondary); margin-bottom: 16px;">
                    To disable MFA, please enter your password and current MFA code.
                </p>
                <div class="modal-form-group">
                    <label class="modal-form-label">Password</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="mfa-disable-password" class="modal-form-input" placeholder="Enter your password">
                        <button type="button" class="password-toggle" onclick="togglePasswordVisibility('mfa-disable-password', this)">
                            <svg class="eye-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="modal-form-group">
                    <label class="modal-form-label">Current MFA Code</label>
                    <input type="text" id="mfa-disable-code" class="modal-form-input" placeholder="Enter 6-digit code" maxlength="6">
                </div>
                <button class="modal-btn modal-btn-danger" onclick="disableMFA()">Disable MFA</button>
            `;
        }

        async function disableMFA() {
            const password = document.getElementById('mfa-disable-password').value;
            const code = document.getElementById('mfa-disable-code').value;
            
            if (!password || !code) {
                alert('Please enter both password and MFA code');
                return;
            }
            
            try {
                const response = await fetch(`${API}/api/security/mfa/disable`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ password, code })
                });
                
                if (response.ok) {
                    alert('MFA disabled successfully');
                    hideMFASetup();
                    document.getElementById('mfa-toggle').classList.remove('active');
                    document.getElementById('mfa-status-badge').textContent = '✗ Disabled';
                    document.getElementById('mfa-status-badge').className = 'mfa-badge disabled';
                    currentUser.mfa_enabled = false;
                } else {
                    const data = await response.json();
                    alert(data.detail || 'Failed to disable MFA. Check your password and code.');
                }
            } catch (e) {
                alert('Failed to disable MFA. Please try again.');
            }
        }

        function showMFASetup() {
            document.getElementById('mfa-setup-modal').classList.add('open');
            // Reset to method selection
            const content = document.getElementById('mfa-setup-content');
            content.innerHTML = `
                <p style="color: var(--text-secondary); margin-bottom: 16px;">
                    Select a method and click "Setup" to begin.
                </p>
                <button class="modal-btn modal-btn-primary" onclick="requestMFASetup()">Setup MFA</button>
            `;
        }

        function hideMFASetup() {
            document.getElementById('mfa-setup-modal').classList.remove('open');
        }

        async function requestMFASetup() {
            const method = document.getElementById('mfa-method-select').value;
            const setupContent = document.getElementById('mfa-setup-content');
            
            setupContent.innerHTML = '<p style="color: var(--text-muted);">Setting up MFA...</p>';
            
            try {
                const response = await fetch(`${API}/api/security/mfa/enable`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ method })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    setupContent.innerHTML = `<p style="color: var(--error);">${data.detail || 'Failed to setup MFA'}</p>`;
                    return;
                }
                
                if (method === 'email') {
                    setupContent.innerHTML = `
                        <p style="color: var(--text-secondary); margin-bottom: 16px;">
                            A verification code has been sent to your email: <strong>${currentUser.email}</strong>
                        </p>
                        <div class="modal-form-group">
                            <label class="modal-form-label">Enter Code</label>
                            <input type="text" id="mfa-verify-code" class="modal-form-input" placeholder="Enter 6-digit code" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 8px;">
                        </div>
                        <button class="modal-btn modal-btn-primary" onclick="verifyMFA()">Verify & Enable</button>
                    `;
                } else if (method === 'totp') {
                    const qrCode = data.qr_code || data.qr_uri;
                    if (qrCode) {
                        setupContent.innerHTML = `
                            <p style="color: var(--text-secondary); margin-bottom: 16px;">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                            </p>
                            <div style="background: white; padding: 16px; border-radius: 12px; width: fit-content; margin: 16px auto;">
                                <img src="${qrCode}" style="width: 180px; height: 180px; display: block;">
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 16px; text-align: center;">
                                Or enter this code manually: <code style="background: var(--bg-hover); padding: 4px 8px; border-radius: 4px;">${data.secret || ''}</code>
                            </p>
                            <div class="modal-form-group">
                                <label class="modal-form-label">Enter Code from App</label>
                                <input type="text" id="mfa-verify-code" class="modal-form-input" placeholder="Enter 6-digit code" maxlength="6" style="text-align: center; font-size: 1.5rem; letter-spacing: 8px;">
                            </div>
                            <button class="modal-btn modal-btn-primary" onclick="verifyMFA()">Verify & Enable</button>
                        `;
                    } else {
                        setupContent.innerHTML = `<p style="color: var(--error);">Failed to generate QR code. Please try again.</p>`;
                    }
                }
            } catch (e) {
                console.error('MFA setup error:', e);
                setupContent.innerHTML = '<p style="color: var(--error);">Failed to setup MFA. Please try again.</p>';
            }
        }

        async function verifyMFA() {
            const code = document.getElementById('mfa-verify-code').value.trim();
            
            if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                alert('Please enter a valid 6-digit code');
                return;
            }
            
            try {
                const response = await fetch(`${API}/api/security/mfa/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ code })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Show backup codes if provided
                    if (data.backup_codes && data.backup_codes.length > 0) {
                        const codesHtml = data.backup_codes.map(c => `<code style="display: block; padding: 4px; margin: 2px 0;">${c}</code>`).join('');
                        document.getElementById('mfa-setup-content').innerHTML = `
                            <div style="text-align: center; color: var(--success); margin-bottom: 16px;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 8px;">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <h3>MFA Enabled Successfully!</h3>
                            </div>
                            <div style="background: var(--bg-dark); padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                                <p style="color: var(--warning); font-weight: 600; margin-bottom: 8px;">⚠️ Save these backup codes!</p>
                                <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;">
                                    Store these in a safe place. You can use them to access your account if you lose your authenticator.
                                </p>
                                <div style="font-family: monospace; font-size: 0.9rem;">${codesHtml}</div>
                            </div>
                            <button class="modal-btn modal-btn-primary" onclick="hideMFASetup()">Done</button>
                        `;
                    } else {
                        alert('MFA enabled successfully!');
                        hideMFASetup();
                    }
                    
                    document.getElementById('mfa-toggle').classList.add('active');
                    document.getElementById('mfa-status-badge').textContent = '✓ Enabled';
                    document.getElementById('mfa-status-badge').className = 'mfa-badge enabled';
                    currentUser.mfa_enabled = true;
                } else {
                    alert(data.detail || 'Invalid code. Please try again.');
                }
            } catch (e) {
                console.error('MFA verification error:', e);
                alert('Verification failed. Please try again.');
            }
        }

        // Load organization branding
        async function loadBranding() {
            try {
                const response = await fetch(`${API}/api/organization/branding`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                
                if (response.ok) {
                    const branding = await response.json();
                    currentBranding = branding;
                    applyBranding(branding);
                }
            } catch (e) {
                console.log('No custom branding');
            }
        }

        function applyBranding(branding) {
            if (!branding || typeof branding !== 'object') return;

            const brandName = branding.name ? String(branding.name).trim() : '';
            const logoUrl = branding.logo_url ? String(branding.logo_url).trim() : '';
            const faviconUrl = branding.favicon_url ? String(branding.favicon_url).trim() : '';
            const theme = branding.theme ? String(branding.theme).trim().toLowerCase() : '';
            const primary = branding.primary_color ? String(branding.primary_color).trim() : '';
            const secondary = branding.secondary_color ? String(branding.secondary_color).trim() : '';
            const customCss = branding.custom_css ? String(branding.custom_css) : '';

            // Apply org name
            if (brandName) {
                const nameEl = document.querySelector('.logo span');
                if (nameEl) nameEl.textContent = brandName;
                try { document.title = `${brandName} - Portal`; } catch (_) { /* ignore */ }
            }

            // Apply favicon
            if (faviconUrl) {
                let iconLink = document.querySelector('link[rel="icon"]');
                if (!iconLink) {
                    iconLink = document.createElement('link');
                    iconLink.rel = 'icon';
                    document.head.appendChild(iconLink);
                }
                iconLink.href = faviconUrl;
            }

            // Apply logo (sidebar)
            if (logoUrl) {
                const logoIcon = document.querySelector('.logo-icon');
                if (logoIcon) {
                    logoIcon.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;">`;
                }
            }

            // Apply theme (org-configurable)
            if (theme) {
                localStorage.setItem('agentforge-theme', theme);
                applyTheme(theme);
                loadThemeSettings();
            }

            // Apply colors (org-configurable)
            if (primary) {
                document.documentElement.style.setProperty('--accent-primary', primary);
                document.documentElement.style.setProperty('--primary', primary);
                document.documentElement.style.setProperty('--input-border-focus', primary);
            }
            if (secondary) {
                document.documentElement.style.setProperty('--accent-secondary', secondary);
            }
            if (primary || secondary) {
                const a = primary || getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim();
                const b = secondary || getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || a;
                if (a && b) document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${a} 0%, ${b} 100%)`);
            }

            // Apply banner (thin top bar)
            // Remove existing banners to avoid duplicates when re-applying branding
            document.querySelectorAll('.org-banner').forEach(el => {
                try { el.remove(); } catch (_) { /* ignore */ }
            });
            // Default to no offset; enable only if banner is enabled
            try { document.documentElement.style.setProperty('--org-banner-height', '0px'); } catch (_) { /* ignore */ }

            if (branding.banner_enabled && branding.banner_text) {
                const banner = document.createElement('div');
                banner.className = 'org-banner';
                banner.style.background = branding.banner_bg_color || 'var(--gradient-1)';
                // Default text color to white if not provided
                banner.style.color = branding.banner_text_color || '#FFFFFF';
                banner.innerHTML = branding.banner_text;
                document.body.appendChild(banner);
                try { document.documentElement.style.setProperty('--org-banner-height', '34px'); } catch (_) { /* ignore */ }
            }

            // Apply custom CSS (org-configurable)
            if (customCss) {
                let styleEl = document.getElementById('org-custom-css');
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'org-custom-css';
                    document.head.appendChild(styleEl);
                }
                styleEl.textContent = customCss;
            }

            // Apply chat welcome copy (optional)
            if (branding.chat_welcome_title) {
                const titleEl = document.querySelector('.welcome-title');
                if (titleEl) titleEl.textContent = String(branding.chat_welcome_title);
            }
            if (branding.chat_welcome_message) {
                const subEl = document.querySelector('.welcome-subtitle');
                if (subEl) subEl.textContent = String(branding.chat_welcome_message);
            }

            // Apply Home dashboard branding
            if (brandName) {
                const homeTagline = document.getElementById('home-tagline');
                if (homeTagline) homeTagline.textContent = `Your ${brandName} AI workspace — use Conversational and Process AI Agents to get work done.`;
            }
        }

        // Load branding after login
        const originalShowChatInterface = showChatInterface;
        showChatInterface = function() {
            originalShowChatInterface();
            loadBranding();
        };
