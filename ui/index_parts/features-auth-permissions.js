// Extracted from ui/index_parts/app-features.js
// Chunk: features-auth-permissions.js
// Loaded via defer in ui/index.html; do not reorder.

// ============================================================================
// AUTHENTICATION & SECURITY FUNCTIONS
// ============================================================================

// Auth state — check both localStorage (remember-me) and sessionStorage (session-only)
let authToken = localStorage.getItem('agentforge_token') || sessionStorage.getItem('agentforge_token') || null;
let currentUser = JSON.parse(localStorage.getItem('agentforge_user') || sessionStorage.getItem('agentforge_user') || 'null');
let securityUsers = [];
let securityRoles = [];
// ============================================================================
// PERMISSION SYSTEM
// ============================================================================

function hasPermission(permission) {
    const hasPerm = !currentUser || !currentUser.permissions 
        ? false 
        : currentUser.permissions.includes('system:admin') 
            ? true 
            : currentUser.permissions.includes(permission);
    return hasPerm;
}

function hasAnyPermission(permissions) {
    return permissions.some(p => hasPermission(p));
}

function hasAllPermissions(permissions) {
    return permissions.every(p => hasPermission(p));
}

const MENU_PERMISSIONS = {
    "chat": "chat:use",
    "agents": "agents:view",
    "tools": "tools:view",
    "create": "agents:create",
    "demo": "demo:access",
    "settings": "system:settings",
    "security": "users:view",
};

function updateUIByPermissions() {
    if (!currentUser) return;
    
    Object.entries(MENU_PERMISSIONS).forEach(([menu, permission]) => {
        const navItem = document.getElementById('nav-' + menu);
        const mobItem = document.getElementById('mob-' + menu);
        const hasPerm = hasPermission(permission);
        
        if (hasPerm) {
            if (navItem) { navItem.classList.remove('hidden'); navItem.style.display = ''; }
            if (mobItem) { mobItem.classList.remove('hidden'); mobItem.style.display = ''; }
        } else {
            if (navItem) { navItem.classList.add('hidden'); navItem.style.display = 'none'; }
            if (mobItem) { mobItem.classList.add('hidden'); mobItem.style.display = 'none'; }
        }
    });
    
    const secNav = document.getElementById('nav-security');
    if (secNav) {
        const hasSecPerm = hasAnyPermission(['users:view', 'roles:view', 'system:admin']);
        if (hasSecPerm) { secNav.classList.remove('hidden'); secNav.style.display = ''; }
        else { secNav.classList.add('hidden'); secNav.style.display = 'none'; }
    }
    
    document.querySelectorAll('[data-permission]').forEach(el => {
        const perms = el.dataset.permission.split(',').map(p => p.trim());
        const hasPerm = hasAnyPermission(perms);
        el.style.display = hasPerm ? '' : 'none';
    });
}



// Check authentication on page load
function checkAuth() {
    // Check for OAuth token in URL hash
    const hash = window.location.hash;
    if (hash && hash.includes('token=')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const oauthToken = params.get('token');
        if (oauthToken) {
            authToken = oauthToken;
            localStorage.setItem('agentforge_token', authToken);
            window.history.replaceState(null, '', '/ui/');
        }
    }
    
    if (!authToken) {
        showLoginPage();
        return false;
    }
    
    // We have a token - show app immediately while we verify
    // This prevents the login flash
    if (currentUser && currentUser.id) {
        showApp();
        updateUserDisplay();
        updateUIByPermissions();
    }
    
    // Verify token is still valid in background
    fetch('/api/security/auth/me', {
        headers: { 'Authorization': 'Bearer ' + authToken }
    }).then(res => {
        if (!res.ok) {
            clearAuth();
            showLoginPage();
            return null;
        }
        return res.json();
    }).then(data => {
        if (data && data.id) {
            currentUser = data;
            localStorage.setItem('agentforge_user', JSON.stringify(currentUser));
            if (data.must_change_password) {
                showFirstLoginPasswordModal();
                return;
            }
            showApp();
            updateUserDisplay();
            updateUIByPermissions();
            
            // Navigate to hash if present, otherwise go to dashboard
            const pageHash = window.location.hash.slice(1);
            if (pageHash && !pageHash.includes('token') && document.getElementById('page-' + pageHash)) {
                navigate(pageHash, false);
            } else {
                navigate('dashboard', false);
            }
        }
    }).catch((err) => {
        console.error('Auth check failed:', err);
        clearAuth();
        showLoginPage();
    });
    
    return true;
}

// Show login page
function showLoginPage() {
    document.getElementById('loading-screen')?.classList.add('hidden');
    document.getElementById('page-login').classList.add('visible');
    document.getElementById('app').classList.add('hidden');
}

// Show main app
function showApp() {
    document.getElementById('loading-screen')?.classList.add('hidden');
    document.getElementById('page-login').classList.remove('visible');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('app').classList.add('flex');
    // Initialize app data after showing
    if (typeof initAppData === 'function') {
        initAppData();
    }
    // Start polling for pending approvals badge
    if (typeof startApprovalPolling === 'function') {
        startApprovalPolling();
    }
}

// Handle login
// Check password strength
function checkPasswordStrength(password) {
    let strength = 0;
    const str1 = document.getElementById('str-1');
    const str2 = document.getElementById('str-2');
    const str3 = document.getElementById('str-3');
    const str4 = document.getElementById('str-4');
    const strText = document.getElementById('str-text');
    
    if (!str1) return; // Elements not found
    
    // Reset
    [str1, str2, str3, str4].forEach(el => el.className = 'h-1 flex-1 rounded bg-gray-600');
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    
    if (strength >= 1) str1.className = 'h-1 flex-1 rounded ' + colors[strength-1];
    if (strength >= 2) str2.className = 'h-1 flex-1 rounded ' + colors[strength-1];
    if (strength >= 3) str3.className = 'h-1 flex-1 rounded ' + colors[strength-1];
    if (strength >= 4) str4.className = 'h-1 flex-1 rounded ' + colors[strength-1];
    
    strText.textContent = strength > 0 ? texts[strength-1] : '';
    strText.className = 'text-xs ' + (strength > 0 ? colors[strength-1].replace('bg-', 'text-') : 'text-gray-500');
}

// OAuth login
async function oauthLogin(provider) {
    try {
        showToast('Redirecting to ' + provider + '...', 'info');
        const res = await fetch('/api/security/oauth/' + provider + '/login');
        const data = await res.json();
        console.log("Login response:", data);
        
        if (data.auth_url) {
            window.location.href = data.auth_url;
        } else {
            showToast(data.detail || 'OAuth not configured', 'error');
        }
    } catch (e) {
        showToast('OAuth error: ' + e.message, 'error');
    }
}

// Toggle password visibility
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('.eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember')?.checked || false;
    const mfaCode = document.getElementById('login-mfa-code')?.value || '';
    
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block">⏳</span> Signing in...';
    
    try {
        console.log("🚀 [FRONTEND] Starting login request...");
        const res = await fetch('/api/security/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, remember_me: remember, mfa_code: mfaCode || undefined })
        });
        
        console.log("📡 [FRONTEND] Login response received, status:", res.status, res.statusText);
        
        const data = await res.json();
        console.log("📦 [FRONTEND] Login response data:", JSON.stringify(data, null, 2));
        console.log("   requires_mfa:", data.requires_mfa, "(type:", typeof data.requires_mfa, ")");
        console.log("   mfa_required:", data.mfa_required, "(type:", typeof data.mfa_required, ")");
        console.log("   mfa_methods:", data.mfa_methods);
        console.log("   access_token:", data.access_token ? "present" : "missing");
        
        if (!res.ok) {
            console.error("❌ [FRONTEND] Login failed:", data);
            showToast(typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || 'Login failed'), 'error');
            btn.disabled = false;
            btn.textContent = 'Sign In';
            return;
        }
        
        // Check if MFA is required (check both requires_mfa and mfa_required for backward compatibility)
        console.log("🔍 [FRONTEND] Checking MFA requirement...");
        console.log("   requires_mfa === true:", data.requires_mfa === true);
        console.log("   requires_mfa === 'true':", data.requires_mfa === "true");
        console.log("   mfa_required === true:", data.mfa_required === true);
        console.log("   mfa_required === 'true':", data.mfa_required === "true");
        
        const isMfaRequired = data.requires_mfa === true || 
                             data.mfa_required === true || 
                             data.requires_mfa === "true" || 
                             data.mfa_required === "true" ||
                             String(data.requires_mfa).toLowerCase() === "true" ||
                             String(data.mfa_required).toLowerCase() === "true";
        
        console.log("   isMfaRequired:", isMfaRequired);
        
        if (isMfaRequired) {
            console.log("✅ [FRONTEND] MFA is required, showing modal...");
            btn.disabled = false;
            btn.textContent = 'Sign In';
            
            // Store credentials temporarily for MFA verification
            window.pendingLoginUsername = username;
            window.pendingLoginPassword = password;
            window.pendingLoginRemember = remember;
            window.pendingMfaMethods = data.mfa_methods || data.mfa_methods || [];
            
            console.log("📋 [FRONTEND] Stored pending login data:");
            console.log("   Username:", window.pendingLoginUsername);
            console.log("   MFA Methods:", window.pendingMfaMethods);
            console.log("📱 [FRONTEND] Calling showLoginMfaModal...");
            try {
                showLoginMfaModal(window.pendingMfaMethods);
                console.log("✅ [FRONTEND] showLoginMfaModal called successfully");
                
                // Verify modal was created after a short delay
                setTimeout(() => {
                    console.log("🔍 [FRONTEND] Verifying modal after 200ms...");
                    const modalCheck = document.getElementById('login-mfa-modal');
                    if (modalCheck) {
                        console.log("✅ [FRONTEND] ✅✅✅ MODAL VERIFICATION: SUCCESS ✅✅✅");
                        console.log("   Modal is in DOM");
                        console.log("   Modal is visible:", modalCheck.offsetParent !== null);
                        const inputCheck = document.getElementById('login-mfa-code');
                        if (inputCheck) {
                            console.log("   Input field is present");
                        } else {
                            console.error("   ❌ Input field is missing!");
                        }
                    } else {
                        console.error("❌ [FRONTEND] ❌❌❌ MODAL VERIFICATION: FAILED ❌❌❌");
                        console.error("   Modal is NOT in DOM after 200ms!");
                        console.error("   This indicates a serious problem with modal creation!");
                    }
                }, 200);
            } catch (error) {
                console.error("❌ [FRONTEND] ❌❌❌ ERROR CALLING showLoginMfaModal ❌❌❌");
                console.error("   Error:", error);
                console.error("   Error message:", error.message);
                console.error("   Error stack:", error.stack);
                showToast("Error showing MFA modal: " + error.message, 'error');
            }
            return;
        } else {
            console.log("✅ [FRONTEND] MFA not required, continuing with normal login...");
            console.log("   Full response keys:", Object.keys(data));
        }
        
        // Store auth data
        authToken = data.access_token;
        currentUser = data.user;
        
        if (remember) {
            localStorage.setItem('agentforge_token', authToken);
            localStorage.setItem('agentforge_user', JSON.stringify(currentUser));
        } else {
            sessionStorage.setItem('agentforge_token', authToken);
            sessionStorage.setItem('agentforge_user', JSON.stringify(currentUser));
        }
        
        if (data.must_change_password) { btn.disabled = false; btn.textContent = 'Sign In'; showFirstLoginPasswordModal(); return; }
        showApp();
        updateUserDisplay();
        updateUIByPermissions();
        navigate('dashboard');
        showToast('Welcome back, ' + (currentUser.name || currentUser.email) + '!', 'success');
        
    } catch (e) {
        showToast('Connection error: ' + e.message, 'error');
    }
    
    btn.disabled = false;
    btn.textContent = 'Sign In';
}

function showLoginMfaModal(methods) {
    console.log("🎭 [FRONTEND] ========================================");
    console.log("🎭 [FRONTEND] showLoginMfaModal called");
    console.log("🎭 [FRONTEND] Methods:", methods);
    console.log("🎭 [FRONTEND] ========================================");
    
    // Remove existing modal if present
    const existingModal = document.getElementById('login-mfa-modal');
    if (existingModal) {
        console.log("🗑️  [FRONTEND] Removing existing MFA modal");
        existingModal.remove();
    } else {
        console.log("✅ [FRONTEND] No existing modal found (good)");
    }
    
    console.log("📝 [FRONTEND] Creating modal element...");
    const modal = document.createElement('div');
    modal.id = 'login-mfa-modal';
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]';
    console.log("✅ [FRONTEND] Modal element created, ID:", modal.id);
    console.log("✅ [FRONTEND] Modal classes:", modal.className);
    
    // For username-based login we avoid showing the email address here.
    const displayEmail = 'your email inbox';
    
    console.log("📝 [FRONTEND] Setting modal innerHTML...");
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-md mx-4">
            <div class="text-center mb-6">
                <div class="text-5xl mb-3">🔐</div>
                <h3 class="text-xl font-bold mb-2">Two-Factor Authentication</h3>
                <p class="text-gray-400 text-sm">Enter the 6-digit code sent to</p>
                <p class="text-purple-400 font-semibold text-sm mt-1" id="mfa-email-display">${displayEmail}</p>
            </div>
            
            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <div class="flex items-center gap-3">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span class="text-xl">✓</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-green-400 font-medium text-sm">Code sent successfully!</p>
                        <p class="text-xs text-gray-400 mt-0.5">Please check your email inbox</p>
                    </div>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                <input 
                    type="text" 
                    id="login-mfa-code" 
                    class="input-field w-full px-4 py-4 rounded-lg text-center text-3xl tracking-[0.5em] font-mono font-semibold focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                    placeholder="000000" 
                    maxlength="6" 
                    pattern="[0-9]{6}"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    autofocus
                >
                <p class="text-xs text-gray-500 mt-2 text-center">Enter the 6-digit code from your email</p>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick="closeLoginMfaModal()" class="btn-secondary flex-1 py-3 rounded-lg font-medium transition-all hover:bg-gray-700">Cancel</button>
                <button onclick="verifyLoginMfa()" id="verify-mfa-btn" class="btn-primary flex-1 py-3 rounded-lg font-medium transition-all hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span id="verify-btn-text">Verify</span>
                </button>
            </div>
            
            <div class="text-center mt-4 pt-4 border-t border-gray-700">
                <p class="text-xs text-gray-500 mb-2">Didn't receive the code?</p>
                <button onclick="resendLoginMfaCode()" id="resend-mfa-btn" class="text-sm text-gray-400 hover:text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-800/50" disabled>
                    <span id="resend-text">
                        <span class="inline-flex items-center gap-1">
                            <span>Resend code in</span>
                            <span id="resend-timer" class="font-mono font-semibold text-purple-400 min-w-[3ch]">10:00</span>
                        </span>
                    </span>
                </button>
            </div>
        </div>
    `;
    console.log("📝 [FRONTEND] Appending modal to document.body...");
    console.log("   Body children before:", document.body.children.length);
    document.body.appendChild(modal);
    console.log("✅ [FRONTEND] Modal appended to DOM");
    console.log("   Body children after:", document.body.children.length);
    
    // Verify modal is in DOM
    const modalInDom = document.getElementById('login-mfa-modal');
    if (modalInDom) {
        console.log("✅ [FRONTEND] Modal found in DOM by ID");
        console.log("   Modal element:", modalInDom);
        console.log("   Modal parent:", modalInDom.parentElement);
        console.log("   Modal offsetParent:", modalInDom.offsetParent);
        console.log("   Modal display:", window.getComputedStyle(modalInDom).display);
        console.log("   Modal visibility:", window.getComputedStyle(modalInDom).visibility);
        console.log("   Modal z-index:", window.getComputedStyle(modalInDom).zIndex);
        console.log("   Modal opacity:", window.getComputedStyle(modalInDom).opacity);
        
        if (modalInDom.offsetParent !== null) {
            console.log("✅ [FRONTEND] ✅✅✅ MFA MODAL IS VISIBLE! ✅✅✅");
        } else {
            console.error("❌ [FRONTEND] ❌❌❌ MFA MODAL IS NOT VISIBLE! ❌❌❌");
            console.error("   Possible reasons:");
            console.error("   1. Modal has display: none");
            console.error("   2. Modal has visibility: hidden");
            console.error("   3. Modal has opacity: 0");
            console.error("   4. Modal is positioned outside viewport");
            console.error("   5. Parent element is hidden");
        }
    } else {
        console.error("❌ [FRONTEND] ❌❌❌ MODAL NOT FOUND IN DOM! ❌❌❌");
        console.error("   This means the modal was not added successfully!");
    }
    
    // Start resend timer (10 minutes = 600 seconds)
    let resendTimer = 600; // 10 minutes in seconds
    const resendBtn = document.getElementById('resend-mfa-btn');
    const resendTimerSpan = document.getElementById('resend-timer');
    
    function updateResendTimer() {
        if (resendTimer > 0) {
            const minutes = Math.floor(resendTimer / 60);
            const seconds = resendTimer % 60;
            resendTimerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            resendTimer--;
        } else {
            if (resendTimerSpan) {
                resendTimerSpan.textContent = '0:00';
            }
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code</span><span class="text-purple-400">→</span></span></span>';
            }
            clearInterval(window.mfaResendInterval);
        }
    }
    
    // Start timer
    if (window.mfaResendInterval) {
        clearInterval(window.mfaResendInterval);
    }
    window.mfaResendInterval = setInterval(updateResendTimer, 1000);
    updateResendTimer(); // Initial update
    
    // Focus on input and add auto-submit
    setTimeout(() => {
        console.log("📝 [FRONTEND] Attempting to focus on MFA code input...");
        const input = document.getElementById('login-mfa-code');
        if (input) {
            console.log("✅ [FRONTEND] MFA code input found");
            input.focus();
            console.log("✅ [FRONTEND] Focused on MFA code input");
            
            // Auto-submit when 6 digits are entered
            input.addEventListener('input', function(e) {
                const value = e.target.value.replace(/\D/g, ''); // Only numbers
                e.target.value = value;
                
                // Auto-submit when 6 digits entered
                if (value.length === 6) {
                    const verifyBtn = document.getElementById('verify-mfa-btn');
                    if (verifyBtn && !verifyBtn.disabled) {
                        setTimeout(() => verifyLoginMfa(), 100); // Small delay for UX
                    }
                }
            });
            
            // Prevent non-numeric input
            input.addEventListener('keypress', function(e) {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }
            });
            
            // Paste handler
            input.addEventListener('paste', function(e) {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text');
                const numbers = pasted.replace(/\D/g, '').substring(0, 6);
                e.target.value = numbers;
                if (numbers.length === 6) {
                    setTimeout(() => verifyLoginMfa(), 100);
                }
            });
        } else {
            console.error("❌ [FRONTEND] ❌❌❌ MFA CODE INPUT NOT FOUND! ❌❌❌");
        }
    }, 100);
    
    console.log("🎭 [FRONTEND] ========================================");
    console.log("🎭 [FRONTEND] showLoginMfaModal completed");
    console.log("🎭 [FRONTEND] ========================================");
}

function closeLoginMfaModal() {
    // Clear timer
    if (window.mfaResendInterval) {
        clearInterval(window.mfaResendInterval);
        window.mfaResendInterval = null;
    }
    document.getElementById('login-mfa-modal')?.remove();
    window.pendingLoginUsername = null;
    window.pendingLoginPassword = null;
    window.pendingLoginRemember = null;
    window.pendingMfaSessionId = null;
    window.pendingMfaEmail = null;
    window.pendingMfaProvider = null;
}

async function resendLoginMfaCode() {
    const btn = document.getElementById('resend-mfa-btn');
    if (btn.disabled) {
        return; // Timer not expired yet
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span id="resend-text">Sending...</span>';
    
    try {
        // Check if this is OAuth MFA (has session_id) or regular login MFA
        if (window.pendingMfaSessionId && window.pendingMfaEmail) {
            console.log("📧 [FRONTEND] Resending OAuth MFA code for session:", window.pendingMfaSessionId);
            // OAuth MFA resend
            const res = await fetch('/api/security/oauth/mfa/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: window.pendingMfaSessionId,
                    email: window.pendingMfaEmail
                })
            });
            
            if (res.ok) {
                showToast('✅ New code sent to your email', 'success');
                
                // Reset timer (10 minutes = 600 seconds)
                let resendTimer = 600;
                const resendTimerSpan = document.getElementById('resend-timer');
                
                function updateResendTimer() {
                    if (resendTimer > 0) {
                        const minutes = Math.floor(resendTimer / 60);
                        const seconds = resendTimer % 60;
                        if (resendTimerSpan) {
                            resendTimerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                        resendTimer--;
                    } else {
                        if (resendTimerSpan) {
                            resendTimerSpan.textContent = '0:00';
                        }
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code</span><span class="text-purple-400">→</span></span></span>';
                        }
                        clearInterval(window.mfaResendInterval);
                    }
                }
                
                // Clear old timer and start new one
                if (window.mfaResendInterval) {
                    clearInterval(window.mfaResendInterval);
                }
                window.mfaResendInterval = setInterval(updateResendTimer, 1000);
                updateResendTimer(); // Initial update
                
                btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code in</span><span id="resend-timer" class="font-mono font-semibold text-purple-400 min-w-[3ch]">10:00</span></span></span>';
            } else {
                const data = await res.json();
                console.log("📧 [FRONTEND] OAuth MFA resend response:", data);
                showToast(data.detail || 'Failed to send code', 'error');
                btn.disabled = false;
                btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code</span><span class="text-purple-400">→</span></span></span>';
            }
        } else {
            console.log("📧 [FRONTEND] Resending regular login MFA code");
            // Regular login MFA resend
            const res = await fetch('/api/security/mfa/send-login-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: window.pendingLoginUsername,
                    password: window.pendingLoginPassword
                })
            });
            
            if (res.ok) {
                showToast('✅ New code sent to your email', 'success');
                
                // Reset timer (10 minutes = 600 seconds)
                let resendTimer = 600;
                const resendTimerSpan = document.getElementById('resend-timer');
                
                function updateResendTimer() {
                    if (resendTimer > 0) {
                        const minutes = Math.floor(resendTimer / 60);
                        const seconds = resendTimer % 60;
                        if (resendTimerSpan) {
                            resendTimerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        }
                        resendTimer--;
                    } else {
                        if (resendTimerSpan) {
                            resendTimerSpan.textContent = '0:00';
                        }
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code</span><span class="text-purple-400">→</span></span></span>';
                        }
                        clearInterval(window.mfaResendInterval);
                    }
                }
                
                // Clear old timer and start new one
                if (window.mfaResendInterval) {
                    clearInterval(window.mfaResendInterval);
                }
                window.mfaResendInterval = setInterval(updateResendTimer, 1000);
                updateResendTimer(); // Initial update
                
                btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code in</span><span id="resend-timer" class="font-mono font-semibold text-purple-400 min-w-[3ch]">10:00</span></span></span>';
            } else {
                const data = await res.json();
                console.log("📧 [FRONTEND] Regular login MFA resend response:", data);
                showToast(data.detail || 'Failed to send code', 'error');
                btn.disabled = false;
                btn.innerHTML = '<span id="resend-text"><span class="inline-flex items-center gap-1"><span>Resend code</span><span class="text-purple-400">→</span></span></span>';
            }
        }
    } catch (e) {
        console.error("❌ [FRONTEND] MFA resend error:", e);
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '<span id="resend-text">Didn\'t receive the code? <span class="text-purple-400">Resend</span></span>';
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
    
    const btn = document.getElementById('verify-mfa-btn');
    const btnText = document.getElementById('verify-btn-text');
    if (btn) {
        btn.disabled = true;
        if (btnText) {
            btnText.textContent = 'Verifying...';
        } else {
            btn.textContent = 'Verifying...';
        }
    }
    
    try {
        // Check if this is OAuth MFA (has session_id) or regular login MFA
        if (window.pendingMfaSessionId) {
            console.log("🔐 [FRONTEND] Verifying OAuth MFA with session_id:", window.pendingMfaSessionId);
            // OAuth MFA verification
            const res = await fetch('/api/security/oauth/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: window.pendingMfaSessionId,
                    mfa_code: code
                })
            });
            
            const data = await res.json();
            console.log("🔐 [FRONTEND] OAuth MFA verification response:", data);
            
            if (!res.ok) {
                showToast(data.detail || 'Invalid code', 'error');
                const btnText = document.getElementById('verify-btn-text');
                if (btn) {
                    btn.disabled = false;
                    if (btnText) {
                        btnText.textContent = 'Verify';
                    } else {
                        btn.textContent = 'Verify';
                    }
                }
                // Clear and refocus input
                const codeInput = document.getElementById('login-mfa-code');
                if (codeInput) {
                    codeInput.value = '';
                    codeInput.focus();
                }
                return;
            }
            
            // Success - close modal and complete login
            closeLoginMfaModal();
            
            authToken = data.access_token;
            currentUser = data.user;
            
            // Clear OAuth MFA session info
            window.pendingMfaSessionId = null;
            window.pendingMfaEmail = null;
            window.pendingMfaProvider = null;
            
            // Store auth (use remember_me from OAuth if available, default to true)
            localStorage.setItem('agentforge_token', authToken);
            localStorage.setItem('agentforge_user', JSON.stringify(currentUser));
            
            if (data.must_change_password) { showFirstLoginPasswordModal(); return; }
            showApp();
            updateUserDisplay();
            updateUIByPermissions();
            navigate('dashboard');
            showToast('Welcome back, ' + (currentUser.name || currentUser.email) + '!', 'success');
        } else {
            console.log("🔐 [FRONTEND] Verifying regular login MFA");
            // Regular login MFA verification
            const res = await fetch('/api/security/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: window.pendingLoginUsername,
                    password: window.pendingLoginPassword,
                    remember_me: window.pendingLoginRemember,
                    mfa_code: code
                })
            });
            
            const data = await res.json();
            console.log("🔐 [FRONTEND] Regular login MFA verification response:", data);
            
            if (!res.ok) {
                showToast(data.detail || 'Invalid code', 'error');
                const btnText = document.getElementById('verify-btn-text');
                if (btn) {
                    btn.disabled = false;
                    if (btnText) {
                        btnText.textContent = 'Verify';
                    } else {
                        btn.textContent = 'Verify';
                    }
                }
                // Clear and refocus input
                const codeInput = document.getElementById('login-mfa-code');
                if (codeInput) {
                    codeInput.value = '';
                    codeInput.focus();
                }
                return;
            }
            
            // Success - close modal and complete login
            closeLoginMfaModal();
            
            authToken = data.access_token;
            currentUser = data.user;
            
            if (window.pendingLoginRemember) {
                localStorage.setItem('agentforge_token', authToken);
                localStorage.setItem('agentforge_user', JSON.stringify(currentUser));
            } else {
                sessionStorage.setItem('agentforge_token', authToken);
                sessionStorage.setItem('agentforge_user', JSON.stringify(currentUser));
            }
            
            if (data.must_change_password) { showFirstLoginPasswordModal(); return; }
            showApp();
            updateUserDisplay();
            updateUIByPermissions();
            navigate('dashboard');
            showToast('Welcome back, ' + (currentUser.name || currentUser.email) + '!', 'success');
        }
        
    } catch (e) {
        console.error("❌ [FRONTEND] MFA verification error:", e);
        showToast('Error: ' + e.message, 'error');
        const btnText = document.getElementById('verify-btn-text');
        if (btn) {
            btn.disabled = false;
            if (btnText) {
                btnText.textContent = 'Verify';
            } else {
                btn.textContent = 'Verify';
            }
        }
        // Clear and refocus input
        const codeInput = document.getElementById('login-mfa-code');
        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    }
}



// Handle First Login Password Change
async function handleFirstLoginPasswordChange(event) {
    event.preventDefault();
    var newPass = document.getElementById('flp-new-password').value;
    var confirmPass = document.getElementById('flp-confirm-password').value;
    var errorDiv = document.getElementById('flp-error');
    var btn = document.getElementById('flp-submit-btn');
    errorDiv.classList.add('hidden');
    if (newPass !== confirmPass) { errorDiv.textContent = 'Passwords do not match'; errorDiv.classList.remove('hidden'); return; }
    btn.disabled = true; btn.textContent = 'Changing...';
    try {
        var res = await fetch('/api/security/auth/first-login-password-change', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken }, body: JSON.stringify({ new_password: newPass, confirm_password: confirmPass }) });
        var data = await res.json();
        if (!res.ok) { errorDiv.textContent = data.detail.message || data.detail; errorDiv.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Change Password'; return; }
        document.getElementById('first-login-password-modal').remove();
        currentUser.must_change_password = false;
        showApp(); updateUserDisplay(); navigate('dashboard'); showToast('Password changed successfully!', 'success');
    } catch (e) { errorDiv.textContent = 'Error: ' + e.message; errorDiv.classList.remove('hidden'); }
    btn.disabled = false; btn.textContent = 'Change Password';
}

// First Login Password Modal
function showFirstLoginPasswordModal() {
    var modal = document.createElement('div');
    modal.id = 'first-login-password-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center';
    modal.innerHTML = '<div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div><div class="relative card rounded-2xl p-8 w-full max-w-md mx-4"><div class="text-center mb-6"><h2 class="text-2xl font-bold mb-2">Change Your Password</h2><p class="text-gray-400">For security, you must change your temporary password.</p></div><form onsubmit="handleFirstLoginPasswordChange(event)"><div class="space-y-4"><div><label class="block text-sm text-gray-400 mb-2">New Password</label><input type="password" id="flp-new-password" required minlength="8" class="input-field w-full px-4 py-3 rounded-lg" placeholder="Enter new password"></div><div><label class="block text-sm text-gray-400 mb-2">Confirm Password</label><input type="password" id="flp-confirm-password" required minlength="8" class="input-field w-full px-4 py-3 rounded-lg" placeholder="Confirm password"></div><div id="flp-error" class="hidden bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm"></div><button type="submit" id="flp-submit-btn" class="w-full py-3 rounded-lg font-semibold text-white" style="background: var(--accent-gradient);">Change Password</button></div></form></div>';
    document.body.appendChild(modal);
}

// Show register form
function showRegister() {
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
            <p class="text-gray-400">Create your account</p>
        </div>
        <div class="card rounded-2xl p-8">
            <h2 class="text-xl font-bold mb-6">Get Started</h2>
            
            <!-- OAuth Buttons -->
            <div class="space-y-3 mb-6">
                <button onclick="oauthLogin('google')" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span>Continue with Google</span>
                </button>
                <button onclick="oauthLogin('microsoft')" class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
                    <svg width="20" height="20" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                    <span>Continue with Microsoft</span>
                </button>
            </div>
            
            <!-- Divider -->
            <div class="flex items-center gap-4 mb-6">
                <div class="flex-1 h-px bg-gray-600"></div>
                <span class="text-sm text-gray-400">or register with email</span>
                <div class="flex-1 h-px bg-gray-600"></div>
            </div>
            
            <form onsubmit="handleRegister(event)">
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">First Name</label>
                            <input type="text" id="reg-firstname" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="John">
                        </div>
                        <div>
                            <label class="block text-sm text-gray-400 mb-2">Last Name</label>
                            <input type="text" id="reg-lastname" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="Doe">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Work Email</label>
                        <input type="email" id="reg-email" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="you@company.com">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Password</label>
                        <div class="relative">
                            <input type="password" id="reg-password" required minlength="8" 
                                   class="input-field w-full px-4 py-3 pr-12 rounded-lg" 
                                   placeholder="Min 8 characters"
                                   oninput="checkPasswordStrength(this.value)">
                            <button type="button" onclick="togglePassword('reg-password', this)" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                                <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg></span>
                            </button>
                        </div>
                        <!-- Password Strength Indicator -->
                        <div class="mt-2">
                            <div class="flex gap-1 mb-1">
                                <div id="str-1" class="h-1 flex-1 rounded bg-gray-600"></div>
                                <div id="str-2" class="h-1 flex-1 rounded bg-gray-600"></div>
                                <div id="str-3" class="h-1 flex-1 rounded bg-gray-600"></div>
                                <div id="str-4" class="h-1 flex-1 rounded bg-gray-600"></div>
                            </div>
                            <p id="str-text" class="text-xs text-gray-500"></p>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Confirm Password</label>
                        <div class="relative">
                            <input type="password" id="reg-password2" required class="input-field w-full px-4 py-3 pr-12 rounded-lg" placeholder="Repeat password">
                            <button type="button" onclick="togglePassword('reg-password2', this)" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                                <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg></span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Terms of Service -->
                    <div class="flex items-start gap-3">
                        <input type="checkbox" id="reg-terms" required class="mt-1 rounded">
                        <label for="reg-terms" class="text-sm text-gray-400">
                            I agree to the <a href="#" class="text-purple-400 hover:text-purple-300">Terms of Service</a> 
                            and <a href="#" class="text-purple-400 hover:text-purple-300">Privacy Policy</a>
                        </label>
                    </div>
                    
                    <button type="submit" id="reg-btn" class="btn-primary w-full py-3 rounded-lg font-semibold">Create Account</button>
                </div>
            </form>
            <p class="text-center text-gray-400 text-sm mt-6">
                Already have an account? <button onclick="location.reload()" class="text-purple-400 hover:text-purple-300">Sign in</button>
            </p>
        </div>
    `;
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();
    
    const password = document.getElementById('reg-password').value;
    const password2 = document.getElementById('reg-password2').value;
    const passInput1 = document.getElementById('reg-password');
    const passInput2 = document.getElementById('reg-password2');
    
    // Reset any previous error styling
    passInput1.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
    passInput2.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
    
    // Validate passwords match
    if (password !== password2) {
        passInput1.classList.add('border-red-500', 'ring-2', 'ring-red-500');
        passInput2.classList.add('border-red-500', 'ring-2', 'ring-red-500');
        passInput2.focus();
        showToast('Passwords do not match. Please check and try again.', 'error');
        return;
    }
    
    // Validate password strength
    if (password.length < 8) {
        passInput1.classList.add('border-red-500', 'ring-2', 'ring-red-500');
        passInput1.focus();
        showToast('Password must be at least 8 characters long.', 'error');
        return;
    }
    
    // Validate terms accepted
    const termsCheckbox = document.getElementById('reg-terms');
    if (termsCheckbox && !termsCheckbox.checked) {
        showToast('Please accept the Terms of Service and Privacy Policy.', 'error');
        return;
    }
    
    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block">⏳</span> Creating account...';
    
    try {
        const res = await fetch('/api/security/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('reg-email').value,
                password: password,
                first_name: document.getElementById('reg-firstname').value,
                last_name: document.getElementById('reg-lastname').value
            })
        });
        
        const data = await res.json();
        console.log("Login response:", data);
        
        if (!res.ok) {
            let errorMsg = 'Registration failed. Please try again.';
            if (data.detail) {
                if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                } else if (data.detail.message) {
                    errorMsg = data.detail.message;
                }
            }
            showToast(errorMsg, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
            return;
        }
        
        // Show success message with email verification info
        showRegistrationSuccess(document.getElementById('reg-email').value, data.email_verification_required);
        
    } catch (e) {
        showToast('Connection error. Please check your internet and try again.', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// Show registration success with clear instructions
function showRegistrationSuccess(email, verificationRequired) {
    const container = document.getElementById('auth-container');
    
    if (verificationRequired) {
        container.innerHTML = `
            <div class="text-center mb-8">
                <div class="inline-flex items-center gap-3 mb-4">
                    <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                    <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
                </div>
            </div>
            <div class="card rounded-2xl p-8 text-center">
                <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h2 class="text-xl font-bold mb-2">Check your email</h2>
                <p class="text-gray-400 mb-4">
                    We sent a verification link to<br>
                    <strong class="text-white">${email}</strong>
                </p>
                <p class="text-sm text-gray-500 mb-6">
                    Click the link in the email to verify your account.<br>
                    If you don't see it, check your spam folder.
                </p>
                <button onclick="location.reload()" class="btn-primary w-full py-3 rounded-lg font-semibold">
                    Back to Sign In
                </button>
                <p class="text-sm text-gray-500 mt-4">
                    Didn't receive the email? 
                    <button onclick="resendVerification('${email}')" class="text-purple-400 hover:text-purple-300">Resend</button>
                </p>
            </div>
        `;
    } else {
        // No verification required - direct to login
        container.innerHTML = `
            <div class="text-center mb-8">
                <div class="inline-flex items-center gap-3 mb-4">
                    <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                    <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
                </div>
            </div>
            <div class="card rounded-2xl p-8 text-center">
                <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <h2 class="text-xl font-bold mb-2">Account Created!</h2>
                <p class="text-gray-400 mb-6">
                    Your account has been created successfully.<br>
                    You can now sign in with your credentials.
                </p>
                <button onclick="location.reload()" class="btn-primary w-full py-3 rounded-lg font-semibold">
                    Sign In Now
                </button>
            </div>
        `;
    }
}

// Resend verification email
async function resendVerification(email) {
    showToast('Sending verification email...', 'info');
    try {
        const res = await fetch('/api/security/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            showToast('Verification email sent! Check your inbox.', 'success');
        } else {
            showToast('Could not send email. Please try again later.', 'error');
        }
    } catch (e) {
        showToast('Connection error. Please try again.', 'error');
    }
}

// Show forgot password
function showForgotPassword() {
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
            <p class="text-gray-400">Reset your password</p>
        </div>
        <div class="card rounded-2xl p-8">
            <h2 class="text-xl font-bold mb-2">Forgot Password?</h2>
            <p class="text-gray-400 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
            
            <form onsubmit="handleForgotPassword(event)">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email</label>
                        <input type="email" id="forgot-email" required 
                               class="input-field w-full px-4 py-3 rounded-lg"
                               placeholder="you@company.com">
                    </div>
                    
                    <button type="submit" id="forgot-btn"
                            class="btn-primary w-full py-3 rounded-lg font-semibold">
                        Send Reset Link
                    </button>
                </div>
            </form>
            
            <p class="text-center text-gray-400 text-sm mt-6">
                Remember your password? 
                <button onclick="location.reload()" class="text-purple-400 hover:text-purple-300">Sign in</button>
            </p>
        </div>
    `;
}

// Handle forgot password
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    const btn = document.getElementById('forgot-btn');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block">⏳</span> Sending...';
    
    try {
        const res = await fetch('/api/security/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        // Always show success (don't reveal if email exists)
        showForgotPasswordSuccess(email);
        
    } catch (e) {
        showForgotPasswordSuccess(email);
    }
}

// Show forgot password success
function showForgotPasswordSuccess(email) {
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
        </div>
        <div class="card rounded-2xl p-8 text-center">
            <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            </div>
            <h2 class="text-xl font-bold mb-2">Check your email</h2>
            <p class="text-gray-400 mb-4">
                If an account exists for<br>
                <strong class="text-white">${email}</strong><br>
                you will receive a password reset link.
            </p>
            <p class="text-sm text-gray-500 mb-6">
                Check your spam folder if you don't see it.
            </p>
            <button onclick="location.reload()" class="btn-primary w-full py-3 rounded-lg font-semibold">
                Back to Sign In
            </button>
        </div>
    `;
}

// Logout
function logout() {
    clearAuth();
    location.reload();
}

// Clear auth data
function clearAuth() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('agentforge_token');
    localStorage.removeItem('agentforge_user');
    sessionStorage.removeItem('agentforge_token');
    sessionStorage.removeItem('agentforge_user');
}

// Update user display
function updateUserDisplay() {
    if (!currentUser) return;
    
    const name = currentUser.name || currentUser.email?.split('@')[0] || 'User';
    document.getElementById('user-avatar').textContent = name[0].toUpperCase();
    document.getElementById('user-name').textContent = name;
    const emailEl = document.getElementById('user-email');
    if (emailEl) {
        emailEl.textContent = currentUser.email || 'Click to view profile';
    }
}

// Alias for profile page compatibility
async function fetchCurrentUser() {
    try {
        const res = await fetch(API + '/api/security/auth/me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('agentforge_user', JSON.stringify(currentUser));
            updateUserDisplay();
        }
    } catch (e) {
        console.error('Error fetching current user:', e);
    }
}

// Get auth headers
function getAuthHeaders() {
    const headers = authToken ? { 'Authorization': 'Bearer ' + authToken } : {};
    if (!authToken) {
        console.warn('⚠️ [getAuthHeaders] No authToken available. Checking storage...');
        const storedToken = localStorage.getItem('agentforge_token') || sessionStorage.getItem('agentforge_token');
        if (storedToken) {
            console.log('✅ [getAuthHeaders] Found token in storage, updating authToken');
            authToken = storedToken;
            return { 'Authorization': 'Bearer ' + authToken };
        } else {
            console.warn('⚠️ [getAuthHeaders] No token found in any storage');
        }
    }
    return headers;
}

