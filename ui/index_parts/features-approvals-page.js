// Extracted from ui/index_parts/app-features.js
// Chunk: features-approvals-page.js
// Loaded via defer in ui/index.html; do not reorder.

// ============================================================
// APPROVALS PAGE
// ============================================================
let approvalsCache = [];
let approvalsFilter = 'pending';

async function loadApprovals() {
    const list = document.getElementById('approvals-list');
    const empty = document.getElementById('approvals-empty');
    if (list) list.innerHTML = '<div class="card rounded-xl p-8 text-center text-gray-500">Loading approvals...</div>';
    if (empty) empty.classList.add('hidden');
    try {
        const res = await fetch('/process/approvals?include_org=true', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            approvalsCache = Array.isArray(data) ? data : (data.items || data.approvals || []);
            renderApprovals();
            updateApprovalsBadge();
        } else {
            approvalsCache = [];
            renderApprovals();
        }
    } catch (e) {
        console.error('Load approvals:', e);
        approvalsCache = [];
        renderApprovals();
    }
}

function filterApprovals(f) {
    approvalsFilter = f;
    ['pending', 'approved', 'rejected', 'all'].forEach(s => {
        const btn = document.getElementById('appr-filter-' + s);
        if (btn) {
            const isActive = s === f;
            btn.classList.toggle('bg-yellow-600/20', isActive && s === 'pending');
            btn.classList.toggle('text-yellow-400', isActive && s === 'pending');
            btn.classList.toggle('bg-green-600/20', isActive && s === 'approved');
            btn.classList.toggle('text-green-400', isActive && s === 'approved');
            btn.classList.toggle('bg-red-600/20', isActive && s === 'rejected');
            btn.classList.toggle('text-red-400', isActive && s === 'rejected');
            btn.classList.toggle('bg-purple-600/20', isActive && s === 'all');
            btn.classList.toggle('text-purple-400', isActive && s === 'all');
            btn.classList.toggle('hover:bg-gray-700', !isActive);
        }
    });
    renderApprovals();
}

function renderApprovals() {
    const list = document.getElementById('approvals-list');
    const empty = document.getElementById('approvals-empty');
    if (!list) return;
    let items = approvalsCache;
    if (approvalsFilter !== 'all') {
        items = items.filter(a => (a.status || 'pending') === approvalsFilter);
    }
    if (!items.length) {
        list.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = items.map(a => {
        const status = a.status || 'pending';
        const statusIcon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
        const statusClass = status === 'approved' ? 'bg-green-600/20 text-green-400' : status === 'rejected' ? 'bg-red-600/20 text-red-400' : 'bg-yellow-600/20 text-yellow-400';
        const createdAt = a.created_at ? new Date(a.created_at).toLocaleString() : '';
        const title = a.title || a.question || 'Approval Request';
        const processName = a.process_name || a.agent_name || '';
        const requestedBy = a.requested_by_name || a.requested_by || '';
        return `
        <div class="card rounded-xl p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">${statusIcon}</span>
                        <h4 class="font-semibold">${escHtml(title)}</h4>
                        <span class="px-2 py-0.5 rounded text-xs ${statusClass}">${status}</span>
                    </div>
                    ${processName ? `<p class="text-sm text-purple-400 mb-1">📋 ${escHtml(processName)}</p>` : ''}
                    ${requestedBy ? `<p class="text-sm text-gray-400">Requested by: ${escHtml(requestedBy)}</p>` : ''}
                    ${a.message ? `<p class="text-sm text-gray-300 mt-2">${escHtml(a.message)}</p>` : ''}
                    <p class="text-xs text-gray-500 mt-1">${createdAt}</p>
                </div>
                ${status === 'pending' ? `
                <div class="flex gap-2 ml-4">
                    <button onclick="handleApproval('${a.id}', 'approved')" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">✅ Approve</button>
                    <button onclick="handleApproval('${a.id}', 'rejected')" class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium">❌ Reject</button>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');
}

async function handleApproval(approvalId, decision) {
    const comment = await uiPrompt(
        decision === 'approved' ? 'Add a comment (optional).' : 'Add a reason for rejection (optional).',
        {
            title: decision === 'approved' ? 'Approval comment' : 'Rejection reason',
            confirmText: decision === 'approved' ? 'Approve' : 'Reject',
            cancelText: 'Cancel',
            multiline: true,
            defaultValue: '',
            placeholder: 'Optional…'
        }
    );
    if (comment === null) return;
    try {
        const res = await fetch(`/process/approvals/${approvalId}/decide`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, comment: comment || '' })
        });
        if (res.ok) {
            showToast(`Request ${decision}!`, 'success');
            await loadApprovals();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to submit decision', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function updateApprovalsBadge() {
    const pendingCount = approvalsCache.filter(a => (a.status || 'pending') === 'pending').length;
    const badge = document.getElementById('nav-approvals-badge');
    if (badge) {
        badge.textContent = pendingCount;
        badge.classList.toggle('hidden', pendingCount === 0);
    }
}

// Poll approvals badge on login
function startApprovalPolling() {
    // Initial load for badge
    (async () => {
        try {
            const res = await fetch('/process/approvals?include_org=true', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                approvalsCache = Array.isArray(data) ? data : (data.items || data.approvals || []);
                updateApprovalsBadge();
            }
        } catch (e) { /* silent */ }
    })();
    // Poll every 60 seconds
    setInterval(async () => {
        if (!authToken) return;
        try {
            const res = await fetch('/process/approvals?include_org=true', { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                approvalsCache = Array.isArray(data) ? data : (data.items || data.approvals || []);
                updateApprovalsBadge();
            }
        } catch (e) { /* silent */ }
    }, 60000);
}

// ============================================================
// END APPROVALS + ORGANIZATION
// ============================================================

// ============================================================================
// ORG PROFILE FIELDS (GLOBAL SCHEMA) — used by Edit User modal
// ============================================================================
let _orgProfileFieldsSchemaCache = null;
let _orgProfileFieldsSchemaCacheAt = 0;

async function getOrgProfileFieldsSchemaForUserEdit(forceReload = false) {
    const ttlMs = 60 * 1000;
    if (!forceReload && _orgProfileFieldsSchemaCache && (Date.now() - _orgProfileFieldsSchemaCacheAt) < ttlMs) {
        return _orgProfileFieldsSchemaCache;
    }
    try {
        const res = await fetch('/api/identity/profile-fields', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            _orgProfileFieldsSchemaCache = data;
            _orgProfileFieldsSchemaCacheAt = Date.now();
            return data;
        }
    } catch (e) {
        // Silent: Edit User should still work without schema
        console.warn('Failed to load org profile fields schema:', e);
    }
    _orgProfileFieldsSchemaCache = { fields: [] };
    _orgProfileFieldsSchemaCacheAt = Date.now();
    return _orgProfileFieldsSchemaCache;
}

function collectSchemaFieldValues(schemaDefs) {
    const out = {};
    (schemaDefs || []).forEach(def => {
        const key = (def?.key || '').trim();
        if (!key) return;
        const type = (def?.type || 'string').toLowerCase();
        const el = document.querySelector(`.schema-field-input[data-schema-key="${key}"]`);
        if (!el) return;

        if (type === 'boolean') {
            if (el.checked) out[key] = true;
            else if (def?.required) out[key] = false;
            return;
        }

        const raw = (el.value || '').trim();
        if (!raw) return;

        if (type === 'number') {
            const n = Number(raw);
            if (!Number.isNaN(n)) out[key] = n;
            return;
        }

        // array/object stored as text (often JSON) — keep as string unless user explicitly types JSON-like values
        out[key] = raw;
    });
    return out;
}

// Edit security user
async function editSecurityUser(userId) {
    const user = securityUsers.find(u => u.id === userId);
    if (!user) return;

    const schemaResp = await getOrgProfileFieldsSchemaForUserEdit();
    const schemaDefs = Array.isArray(schemaResp?.fields) ? schemaResp.fields : [];
    const schemaKeys = new Set(schemaDefs.map(d => (d?.key || '').trim()).filter(Boolean));
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'edit-user-modal';
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 class="text-xl font-bold mb-4">Edit User</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Email</label>
                    <input type="email" id="edit-user-email" value="${user.email}" class="input-field w-full px-4 py-2 rounded-lg" placeholder="user@company.com">
                    <p class="text-xs text-gray-500 mt-2">This is where login codes and notifications are sent.</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">First Name</label>
                        <input type="text" id="edit-user-firstname" value="${user.profile?.first_name || ''}" class="input-field w-full px-4 py-2 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Last Name</label>
                        <input type="text" id="edit-user-lastname" value="${user.profile?.last_name || ''}" class="input-field w-full px-4 py-2 rounded-lg">
                    </div>
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Status</label>
                    <select id="edit-user-status" class="input-field w-full px-4 py-2 rounded-lg">
                        <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="pending" ${user.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="locked" ${user.status === 'locked' ? 'selected' : ''}>Locked</option>
                        <option value="disabled" ${user.status === 'disabled' ? 'selected' : ''}>Disabled</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Roles</label>
                    <div id="edit-user-roles" class="space-y-2">
                        ${securityRoles.map(r => `
                            <label class="flex items-center gap-2">
                                <input type="checkbox" value="${r.id}" ${(user.role_ids || []).includes(r.id) ? 'checked' : ''} class="rounded">
                                <span>${r.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="rounded-lg border border-gray-700 p-3 bg-gray-900/30">
                    <label class="block text-sm text-gray-400 mb-2">Password</label>
                    <div class="text-xs text-gray-500 mb-3">Resetting a password will sign the user out from all sessions and require a new password on next sign-in.</div>
                    <div class="flex items-center gap-2">
                        <button class="btn-secondary px-3 py-2 rounded-lg" onclick="toggleEditUserSetPassword()">Set New Password</button>
                        <button class="btn-primary px-3 py-2 rounded-lg" onclick="adminResetUserPassword('${userId}', false)">Generate Temporary Password</button>
                    </div>
                    <div id="edit-user-pass-wrap" class="hidden mt-3">
                        <div class="grid grid-cols-1 gap-3">
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">New Password</label>
                                <input type="password" id="edit-user-newpass" class="input-field w-full px-3 py-2 rounded-lg" placeholder="At least 8 characters">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Confirm Password</label>
                                <input type="password" id="edit-user-newpass2" class="input-field w-full px-3 py-2 rounded-lg" placeholder="Re-type password">
                            </div>
                        </div>
                        <div class="flex justify-end mt-3">
                            <button class="btn-primary px-3 py-2 rounded-lg" onclick="adminResetUserPassword('${userId}', true)">Update Password</button>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Organization Profile Fields</label>
                    <p class="text-xs text-gray-500 mb-2">These fields are defined globally in <strong>Security → Organization → Profile Fields</strong> and appear for every user.</p>
                    <div id="edit-user-org-schema-fields" class="space-y-3">
                        ${(() => {
                            if (!schemaDefs.length) {
                                return '<div class="text-xs text-gray-500 italic">No global profile fields configured yet.</div>';
                            }
                            const meta =
                                user.custom_attributes ||
                                user.profile?.custom_attributes ||
                                user.profile?.user_metadata ||
                                user.user_metadata ||
                                {};

                            return schemaDefs.map(def => {
                                const key = (def?.key || '').trim();
                                if (!key) return '';
                                const label = (def?.label || '').trim() || key.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                const type = (def?.type || 'string').toLowerCase();
                                const desc = (def?.description || '').trim();
                                const required = !!def?.required;
                                const val = meta && (key in meta) ? meta[key] : '';
                                const optList = Array.isArray(def?.options) ? def.options.filter(Boolean) : [];

                                const common = `class="schema-field-input input-field w-full px-3 py-2 rounded-lg text-sm" data-schema-key="${escHtml(key)}"`;
                                let inputHtml = '';
                                if (type === 'boolean') {
                                    inputHtml = `<label class="flex items-center gap-2">
                                        <input type="checkbox" class="schema-field-input accent-purple-500 w-5 h-5" data-schema-key="${escHtml(key)}" ${val === true ? 'checked' : ''}>
                                        <span class="text-sm text-gray-300">${escHtml(label)}${required ? ' *' : ''}</span>
                                    </label>`;
                                } else if (type === 'number') {
                                    inputHtml = `<input type="number" ${common} value="${escHtml(val === null || val === undefined ? '' : String(val))}" placeholder="${escHtml(label)}${required ? ' *' : ''}">`;
                                } else if (type === 'select' || optList.length) {
                                    inputHtml = `
                                        <select ${common}>
                                            <option value="">Select…</option>
                                            ${optList.map(o => `<option value="${escHtml(o)}" ${String(val) === String(o) ? 'selected' : ''}>${escHtml(o)}</option>`).join('')}
                                        </select>
                                    `;
                                } else if (type === 'array' || type === 'object') {
                                    inputHtml = `<textarea ${common} rows="2" placeholder="${escHtml(label)}${required ? ' *' : ''}">${escHtml(val === null || val === undefined ? '' : String(val))}</textarea>`;
                                } else {
                                    inputHtml = `<input type="text" ${common} value="${escHtml(val === null || val === undefined ? '' : String(val))}" placeholder="${escHtml(label)}${required ? ' *' : ''}">`;
                                }

                                return `
                                    <div class="space-y-1">
                                        ${type === 'boolean' ? inputHtml : `
                                            <div class="flex items-center justify-between">
                                                <div class="text-xs text-gray-400">${escHtml(label)}${required ? ' *' : ''}</div>
                                                <div class="text-[10px] text-gray-500 font-mono">${escHtml(key)}</div>
                                            </div>
                                            ${inputHtml}
                                        `}
                                        ${desc ? `<div class="text-[11px] text-gray-500">${escHtml(desc)}</div>` : ''}
                                    </div>
                                `;
                            }).join('');
                        })()}
                    </div>
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Advanced Custom Fields (per-user)</label>
                    <p class="text-xs text-gray-500 mb-2">Use this only for one-off fields not part of the global schema. These are still available to processes and AI workflows.</p>
                    <div id="edit-user-custom-fields" class="space-y-2">
                        ${(() => {
                            // Custom fields are stored under profile.custom_attributes in the backend.
                            // Keep backward-compatible fallbacks for older payload shapes.
                            const meta =
                                user.custom_attributes ||
                                user.profile?.custom_attributes ||
                                user.profile?.user_metadata ||
                                user.user_metadata ||
                                {};
                            const entries = Object.entries(meta).filter(([k,v]) =>
                                v !== null &&
                                v !== undefined &&
                                !schemaKeys.has(k)
                            );
                            if (!entries.length) return '<div class="text-xs text-gray-500 italic" id="no-custom-fields-msg">No custom fields yet.</div>';
                            return entries.map(([k, v], i) => `
                                <div class="flex gap-2 items-center w-full" data-custom-row="${i}">
                                    <input type="text" value="${escHtml(k)}" placeholder="Field name" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 min-w-0 custom-field-key">
                                    <input type="text" value="${escHtml(String(v))}" placeholder="Value" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 min-w-0 custom-field-val">
                                    <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300 text-lg px-1" title="Remove">&times;</button>
                                </div>
                            `).join('');
                        })()}
                    </div>
                    <button onclick="addCustomFieldRow()" class="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Custom Field
                    </button>
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="document.getElementById('edit-user-modal').remove()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                    <button onclick="saveUserEdit('${userId}')" class="btn-primary flex-1 py-2 rounded-lg">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleEditUserSetPassword() {
    const wrap = document.getElementById('edit-user-pass-wrap');
    if (wrap) wrap.classList.toggle('hidden');
}

async function adminResetUserPassword(userId, useCustom) {
    try {
        if (!(await uiConfirm("Reset this user's password?", { title: 'Reset password', confirmText: 'Reset', cancelText: 'Cancel', danger: true }))) return;

        let body = {};
        if (useCustom) {
            const p1 = (document.getElementById('edit-user-newpass')?.value || '').trim();
            const p2 = (document.getElementById('edit-user-newpass2')?.value || '').trim();
            if (!p1 || p1.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            if (p1 !== p2) {
                showToast('Passwords do not match', 'error');
                return;
            }
            body.password = p1;
        }

        const res = await fetch('/api/security/users/' + userId + '/reset-password', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showToast((data?.detail?.message || data?.detail || 'Failed to reset password'), 'error');
            return;
        }

        showToast('Password updated successfully', 'success');

        if (data && data.temp_password) {
            const pwModal = document.createElement('div');
            pwModal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]';
            pwModal.id = 'temp-password-modal';
            pwModal.innerHTML = `
                <div class="card rounded-xl p-6 w-full max-w-md">
                    <h3 class="text-lg font-bold mb-2">Temporary Password</h3>
                    <p class="text-sm text-gray-400 mb-3">Share this password securely with the user. They will be asked to change it on first sign-in.</p>
                    <div class="flex gap-2 items-center">
                        <input id="temp-password-value" class="flex-1 input-field rounded-lg px-3 py-2" readonly value="${escHtml(data.temp_password)}">
                        <button class="btn-secondary px-4 py-2 rounded-lg" onclick="navigator.clipboard.writeText(document.getElementById('temp-password-value').value); showToast('Copied', 'success');">Copy</button>
                    </div>
                    <div class="flex justify-end mt-4">
                        <button class="btn-primary px-5 py-2 rounded-lg" onclick="document.getElementById('temp-password-modal').remove()">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(pwModal);
        }

        // Refresh list so status/fields are current
        try { loadSecurityUsers(); } catch (e) { /* silent */ }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Add a new custom field row in the edit user modal
function addCustomFieldRow() {
    const container = document.getElementById('edit-user-custom-fields');
    if (!container) return;
    const noMsg = document.getElementById('no-custom-fields-msg');
    if (noMsg) noMsg.remove();
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center w-full';
    row.innerHTML = `
        <input type="text" placeholder="Field name (e.g., national_id)" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 min-w-0 custom-field-key">
        <input type="text" placeholder="Value" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 min-w-0 custom-field-val">
        <button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300 text-lg px-1" title="Remove">&times;</button>
    `;
    container.appendChild(row);
    row.querySelector('.custom-field-key').focus();
}

// Collect custom fields from the edit user modal
function collectCustomFields() {
    const container = document.getElementById('edit-user-custom-fields');
    if (!container) return {};
    const rows = container.querySelectorAll('.flex.gap-2');
    const result = {};
    rows.forEach(row => {
        const keyEl = row.querySelector('.custom-field-key');
        const valEl = row.querySelector('.custom-field-val');
        if (!keyEl || !valEl) return;
        const k = (keyEl.value || '').trim().replace(/\s+/g, '_').toLowerCase();
        const v = (valEl.value || '').trim();
        if (k && v) {
            // Auto-detect types for common patterns
            if (v === 'true') result[k] = true;
            else if (v === 'false') result[k] = false;
            else if (/^\d+$/.test(v)) result[k] = parseInt(v, 10);
            else if (/^\d+\.\d+$/.test(v)) result[k] = parseFloat(v);
            else result[k] = v;
        }
    });
    return result;
}

// Save user edit
async function saveUserEdit(userId) {
    const email = document.getElementById('edit-user-email')?.value?.trim() || '';
    const firstName = document.getElementById('edit-user-firstname').value?.trim() || '';
    const lastName = document.getElementById('edit-user-lastname').value?.trim() || '';
    const status = document.getElementById('edit-user-status').value;
    const roleCheckboxes = document.querySelectorAll('#edit-user-roles input[type="checkbox"]:checked');
    const roleIds = Array.from(roleCheckboxes).map(cb => cb.value);
    
    const schemaResp = await getOrgProfileFieldsSchemaForUserEdit();
    const schemaDefs = Array.isArray(schemaResp?.fields) ? schemaResp.fields : [];
    const schemaValues = collectSchemaFieldValues(schemaDefs);
    const customFields = { ...collectCustomFields(), ...schemaValues };
    console.log('📝 Saving user edit:', { email, firstName, lastName, status, roleIds, customFields });
    
    try {
        if (!email) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        const res = await fetch('/api/security/users/' + userId, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                first_name: firstName,
                last_name: lastName,
                status: status,
                role_ids: roleIds,
                user_metadata: customFields
            })
        });
        
        if (res.ok) {
            showToast('User updated successfully', 'success');
            document.getElementById('edit-user-modal').remove();
            loadSecurityUsers();
        } else {
            const data = await res.json();
            console.error('Failed to update user:', data);
            showToast(data.detail || 'Failed to update user', 'error');
        }
    } catch (e) {
        console.error('Error saving user:', e);
        showToast('Error: ' + e.message, 'error');
    }
}

// Filter security users
function filterSecurityUsers() {
    renderSecurityUsers();
}

// Load security roles

// Load invitations
let securityInvitations = [];

async function loadSecurityInvitations() {
    // Don't make request if not authenticated (best practice)
    if (!authToken) return;
    
    try {
        const res = await fetch('/api/security/invitations', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
        console.log("Login response:", data);
            securityInvitations = data.invitations || [];
            renderSecurityInvitations();
        }
    } catch (e) {
        console.error('Error loading invitations:', e);
    }
}

function renderSecurityInvitations() {
    const container = document.getElementById('sec-invitations-list');
    if (!container) return;
    
    if (!securityInvitations.length) {
        container.innerHTML = '<p class="text-gray-500 text-sm p-4">No pending invitations</p>';
        return;
    }
    
    container.innerHTML = securityInvitations.map(inv => `
        <div class="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-400">📧</div>
                <div>
                    <p class="font-medium">${escHtml(inv.email)}</p>
                    <p class="text-xs text-gray-400">Invited ${new Date(inv.created_at).toLocaleDateString()} · ${inv.roles.join(', ')}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs px-2 py-1 rounded ${inv.status === 'expired' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}">${inv.status}</span>
                <button onclick="resendInvitation('${inv.id}')" class="text-blue-400 hover:text-blue-300 p-1" title="Resend">🔄</button>
                <button onclick="deleteInvitation('${inv.id}')" class="text-red-400 hover:text-red-300 p-1" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function resendInvitation(invId) {
    try {
        const res = await fetch('/api/security/invitations/' + invId + '/resend', {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('Invitation resent successfully', 'success');
            loadSecurityInvitations();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to resend', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function deleteInvitation(invId) {
    if (!(await uiConfirm('Remove this invitation?', { title: 'Remove invitation', confirmText: 'Remove', cancelText: 'Cancel', danger: true }))) return;
    try {
        const res = await fetch('/api/security/invitations/' + invId, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('Invitation deleted', 'success');
            loadSecurityInvitations();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to delete', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function loadSecurityRoles() {
    // Don't make request if not authenticated (best practice)
    if (!authToken) return;
    
    try {
        const res = await fetch('/api/security/roles', {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        console.log("Login response:", data);
        securityRoles = data.roles || [];
        renderSecurityRoles();
    } catch (e) {
        console.error('Error loading roles:', e);
    }
}

// Render security roles


// Toggle all permissions
function toggleAllPermissions(checked) {
    document.querySelectorAll('.role-perm').forEach(cb => cb.checked = checked);
    document.querySelectorAll('.select-cat').forEach(cb => cb.checked = checked);
}

// Toggle category permissions
function toggleCategoryPermissions(catIdx, checked) {
    document.querySelectorAll('.cat-' + catIdx).forEach(cb => cb.checked = checked);
    updateSelectAllState();
}

// Update select all checkbox state
function updateSelectAllState() {
    const allPerms = document.querySelectorAll('.role-perm');
    const checkedPerms = document.querySelectorAll('.role-perm:checked');
    const selectAll = document.getElementById('select-all-perms');
    if (selectAll) {
        selectAll.checked = allPerms.length === checkedPerms.length;
        selectAll.indeterminate = checkedPerms.length > 0 && checkedPerms.length < allPerms.length;
    }
}

// Show Add Role Modal
function showAddRoleModal() {
    const allPermissions = [
        // Security - User Management
        { category: '🔐 User Management', permissions: [
            { id: 'users:view', name: 'View Users' },
            { id: 'users:edit', name: 'Edit Users' },
            { id: 'users:delete', name: 'Delete Users' },
            { id: 'users:invite', name: 'Invite Users' },
        ]},
        // Security - Role Management
        { category: '🔐 Role Management', permissions: [
            { id: 'roles:view', name: 'View Roles' },
            { id: 'roles:create', name: 'Create Roles' },
            { id: 'roles:edit', name: 'Edit Roles' },
            { id: 'roles:delete', name: 'Delete Roles' },
        ]},
        // Security - Security & MFA
        { category: '🔐 Security & MFA', permissions: [
            { id: 'security:settings', name: 'Security Settings' },
            { id: 'mfa:manage', name: 'Manage MFA' },
        ]},
        // AI Agent - Agents
        { category: '🤖 AI Agents', permissions: [
            { id: 'agents:view', name: 'View Agents' },
            { id: 'agents:create', name: 'Create Agents' },
            { id: 'agents:edit', name: 'Edit Agents' },
            { id: 'agents:delete', name: 'Delete Agents' },
            { id: 'agents:publish', name: 'Publish Agents' },
        ]},
        // AI Agent - Tools
        { category: '🤖 Tools & Integrations', permissions: [
            { id: 'tools:view', name: 'View Tools' },
            { id: 'tools:create', name: 'Create Tools' },
            { id: 'tools:edit', name: 'Edit Tools' },
            { id: 'tools:delete', name: 'Delete Tools' },
            { id: 'tools:execute', name: 'Execute Tools' },
        ]},
        // AI Agent - Chat
        { category: '🤖 Chat', permissions: [
            { id: 'chat:use', name: 'Use Chat' },
            { id: 'chat:view_all', name: 'View All Chats' },
            { id: 'chat:delete', name: 'Delete Chats' },
        ]},
        // Analytics & Audit
        { category: '📊 Analytics & Audit', permissions: [
            { id: 'audit:view', name: 'View Audit Logs' },
            { id: 'audit:export', name: 'Export Audit Logs' },
            { id: 'analytics:view', name: 'View Analytics' },
            { id: 'reports:generate', name: 'Generate Reports' },
        ]},
        // Demo Lab
        { category: '🧪 Demo Lab', permissions: [
            { id: 'demo:access', name: 'Access Demo Lab' },
            { id: 'demo:create', name: 'Create Demos' },
            { id: 'demo:share', name: 'Share Demos' },
        ]},
        // System
        { category: '⚙️ System', permissions: [
            { id: 'system:admin', name: 'Full System Admin' },
            { id: 'system:settings', name: 'System Settings' },
        ]},
    ];
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'role-modal';
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4">Create New Role</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Role Name *</label>
                    <input type="text" id="role-name" class="input-field w-full px-4 py-2 rounded-lg" placeholder="e.g. Marketing Team">
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea id="role-description" class="input-field w-full px-4 py-2 rounded-lg" rows="2" placeholder="Role description..."></textarea>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm text-gray-400">Permissions</label>
                        <label class="flex items-center gap-2 text-sm text-green-400 cursor-pointer">
                            <input type="checkbox" id="select-all-add" onchange="document.querySelectorAll('#role-modal .role-perm').forEach(c=>c.checked=this.checked)" class="rounded">
                            <span>Select All</span>
                        </label>
                    </div>
                    ${allPermissions.map((cat, i) => `
                        <div class="mb-4 p-3 rounded-lg" style="background:rgba(139,92,246,0.1)">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="text-sm font-semibold text-purple-400">${cat.category}</h5>
                                <label class="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                    <input type="checkbox" onchange="document.querySelectorAll('#role-modal .cat-${i}').forEach(c=>c.checked=this.checked)" class="rounded">
                                    <span>All</span>
                                </label>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${cat.permissions.map(p => `
                                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" class="role-perm cat-${i} rounded" value="${p.id}">
                                        <span>${p.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="document.getElementById('role-modal').remove()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                    <button onclick="saveNewRole()" class="btn-primary flex-1 py-2 rounded-lg">Create Role</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Show Edit Role Modal
function showEditRoleModal(roleId) {
    const role = securityRoles.find(r => r.id === roleId);
    if (!role) return;
    
    const allPermissions = [
        // Security - User Management
        { category: '🔐 User Management', permissions: [
            { id: 'users:view', name: 'View Users' },
            { id: 'users:edit', name: 'Edit Users' },
            { id: 'users:delete', name: 'Delete Users' },
            { id: 'users:invite', name: 'Invite Users' },
        ]},
        // Security - Role Management
        { category: '🔐 Role Management', permissions: [
            { id: 'roles:view', name: 'View Roles' },
            { id: 'roles:create', name: 'Create Roles' },
            { id: 'roles:edit', name: 'Edit Roles' },
            { id: 'roles:delete', name: 'Delete Roles' },
        ]},
        // Security - Security & MFA
        { category: '🔐 Security & MFA', permissions: [
            { id: 'security:settings', name: 'Security Settings' },
            { id: 'mfa:manage', name: 'Manage MFA' },
        ]},
        // AI Agent - Agents
        { category: '🤖 AI Agents', permissions: [
            { id: 'agents:view', name: 'View Agents' },
            { id: 'agents:create', name: 'Create Agents' },
            { id: 'agents:edit', name: 'Edit Agents' },
            { id: 'agents:delete', name: 'Delete Agents' },
            { id: 'agents:publish', name: 'Publish Agents' },
        ]},
        // AI Agent - Tools
        { category: '🤖 Tools & Integrations', permissions: [
            { id: 'tools:view', name: 'View Tools' },
            { id: 'tools:create', name: 'Create Tools' },
            { id: 'tools:edit', name: 'Edit Tools' },
            { id: 'tools:delete', name: 'Delete Tools' },
            { id: 'tools:execute', name: 'Execute Tools' },
        ]},
        // AI Agent - Chat
        { category: '🤖 Chat', permissions: [
            { id: 'chat:use', name: 'Use Chat' },
            { id: 'chat:view_all', name: 'View All Chats' },
            { id: 'chat:delete', name: 'Delete Chats' },
        ]},
        // Analytics & Audit
        { category: '📊 Analytics & Audit', permissions: [
            { id: 'audit:view', name: 'View Audit Logs' },
            { id: 'audit:export', name: 'Export Audit Logs' },
            { id: 'analytics:view', name: 'View Analytics' },
            { id: 'reports:generate', name: 'Generate Reports' },
        ]},
        // Demo Lab
        { category: '🧪 Demo Lab', permissions: [
            { id: 'demo:access', name: 'Access Demo Lab' },
            { id: 'demo:create', name: 'Create Demos' },
            { id: 'demo:share', name: 'Share Demos' },
        ]},
        // System
        { category: '⚙️ System', permissions: [
            { id: 'system:admin', name: 'Full System Admin' },
            { id: 'system:settings', name: 'System Settings' },
        ]},
    ];
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'role-modal';
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4">Edit Role: ${escHtml(role.name)}</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Role Name *</label>
                    <input type="text" id="role-name" value="${escHtml(role.name)}" class="input-field w-full px-4 py-2 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea id="role-description" class="input-field w-full px-4 py-2 rounded-lg" rows="2">${escHtml(role.description || '')}</textarea>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm text-gray-400">Permissions</label>
                        <label class="flex items-center gap-2 text-sm text-green-400 cursor-pointer">
                            <input type="checkbox" id="select-all-edit" onchange="document.querySelectorAll('#role-modal .role-perm').forEach(c=>c.checked=this.checked)" class="rounded">
                            <span>Select All</span>
                        </label>
                    </div>
                    ${allPermissions.map((cat, i) => `
                        <div class="mb-4 p-3 rounded-lg" style="background:rgba(139,92,246,0.1)">
                            <div class="flex items-center justify-between mb-2">
                                <h5 class="text-sm font-semibold text-purple-400">${cat.category}</h5>
                                <label class="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                                    <input type="checkbox" onchange="document.querySelectorAll('#role-modal .cat-${i}').forEach(c=>c.checked=this.checked)" class="rounded">
                                    <span>All</span>
                                </label>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                ${cat.permissions.map(p => `
                                    <label class="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" class="role-perm cat-${i} rounded" value="${p.id}" ${(role.permissions || []).includes(p.id) ? 'checked' : ''}>
                                        <span>${p.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex gap-3 mt-6">
                    <button onclick="document.getElementById('role-modal').remove()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                    <button onclick="updateRole('${roleId}')" class="btn-primary flex-1 py-2 rounded-lg">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Save new role
async function saveNewRole() {
    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-description').value.trim();
    const permissions = Array.from(document.querySelectorAll('.role-perm:checked')).map(cb => cb.value);
    
    if (!name) {
        showToast('Role name is required', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/security/roles', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, permissions })
        });
        
        if (res.ok) {
            showToast('Role created successfully', 'success');
            document.getElementById('role-modal').remove();
            loadSecurityRoles();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to create role', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Update existing role
async function updateRole(roleId) {
    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-description').value.trim();
    const permissions = Array.from(document.querySelectorAll('.role-perm:checked')).map(cb => cb.value);
    
    if (!name) {
        showToast('Role name is required', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/security/roles/' + roleId, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, permissions })
        });
        
        if (res.ok) {
            showToast('Role updated successfully', 'success');
            document.getElementById('role-modal').remove();
            loadSecurityRoles();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to update role', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Delete role
async function deleteRole(roleId) {
    const role = securityRoles.find(r => r.id === roleId);
    if (!role) return;
    
    if (role.is_system) {
        showToast('Cannot delete system roles', 'error');
        return;
    }
    
    if (!(await uiConfirm('Remove the role "' + role.name + '"?', { title: 'Remove role', confirmText: 'Remove', cancelText: 'Cancel', danger: true }))) return;
    
    try {
        const res = await fetch('/api/security/roles/' + roleId, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            showToast('Role deleted successfully', 'success');
            loadSecurityRoles();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to delete role', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function renderSecurityRoles() {
    const icons = { 'role_super_admin': '👑', 'role_admin': '🛡️', 'role_manager': '📊', 'role_user': '👤', 'role_viewer': '👁️' };
    
    document.getElementById('sec-roles-grid').innerHTML = securityRoles.map(r => `
        <div class="card rounded-xl p-4 hover:border-purple-500/50 transition-colors">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${icons[r.id] || '🎭'}</span>
                    <h4 class="font-bold">${escHtml(r.name)}</h4>
                    ${r.is_system ? '<span class="text-xs bg-gray-600 px-2 py-1 rounded ml-2">System</span>' : ''}
                </div>
                <div class="flex items-center gap-2">
                    <button data-permission="roles:edit" onclick="showEditRoleModal('${r.id}')" class="text-blue-400 hover:text-blue-300" title="Edit Permissions">✏️</button>
                    ${!r.is_system ? `<button data-permission="roles:delete" onclick="deleteRole('${r.id}')" class="text-red-400 hover:text-red-300" title="Delete">🗑️</button>` : ''}
                </div>
            </div>
            <p class="text-sm text-gray-400 mb-3">${escHtml(r.description || 'No description')}</p>
            <div class="flex items-center justify-between text-sm">
                <span class="text-purple-400">${(r.permissions || []).length} permissions</span>
                <span class="text-gray-500">${r.user_count || 0} users</span>
            </div>
        </div>
    `).join('');
}

// Switch security tab
function switchSecurityTab(tab) {
    const tabs = ['users', 'roles', 'groups', 'org', 'audit', 'mfa', 'settings'];
    
    // Check if requested tab is visible (has permission)
    const requestedTabBtn = document.getElementById('sec-tab-' + tab);
    if (requestedTabBtn && requestedTabBtn.style.display === 'none') {
        // Find first visible tab
        for (const t of tabs) {
            const btn = document.getElementById('sec-tab-' + t);
            if (btn && btn.style.display !== 'none') {
                tab = t;
                break;
            }
        }
    }
    
    // Hide all tabs
    tabs.forEach(t => {
        document.getElementById('sec-content-' + t)?.classList.add('hidden');
        const tabBtn = document.getElementById('sec-tab-' + t);
        if (tabBtn) {
            tabBtn.classList.remove('bg-purple-600', 'text-white');
            tabBtn.classList.add('hover:bg-gray-700');
        }
    });
    
    // Show selected tab
    document.getElementById('sec-content-' + tab)?.classList.remove('hidden');
    const activeBtn = document.getElementById('sec-tab-' + tab);
    if (activeBtn) {
        activeBtn.classList.add('bg-purple-600', 'text-white');
        activeBtn.classList.remove('hover:bg-gray-700');
    }
    
    // Load tab data
    if (tab === 'audit') loadAuditLogs();
    if (tab === 'mfa') checkMfaStatus();
    if (tab === 'settings') loadSecuritySettings();
    if (tab === 'groups') loadGroups();
    if (tab === 'org') loadOrgTab();
}

// Initialize security page
async function initSecurityPage() {
    // Load data first - roles must be loaded before users to display role names
    await loadSecurityStats();
    await loadSecurityRoles(); // Load roles first
    await loadSecurityUsers(); // Then load users (so role names can be displayed)
    await loadSecurityInvitations();
    
    // Find first visible tab and switch to it
    const tabs = ['users', 'roles', 'audit', 'mfa', 'settings'];
    let foundTab = 'mfa'; // Default fallback
    
    for (const t of tabs) {
        const btn = document.getElementById('sec-tab-' + t);
        if (btn && btn.style.display !== 'none') {
            foundTab = t;
            break;
        }
    }
    
    switchSecurityTab(foundTab);
}

// Load audit logs
async function loadAuditLogs() {
    const action = document.getElementById('sec-audit-action')?.value || '';
    
    try {
        let url = '/api/security/audit-logs?limit=100';
        if (action) url += '&action=' + action;
        
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return;
        
        const data = await res.json();
        console.log("Login response:", data);
        const logs = data.logs || [];
        
        if (!logs.length) {
            document.getElementById('sec-audit-table').innerHTML = 
                '<tr><td colspan="6" class="p-8 text-center text-gray-500">No audit logs found</td></tr>';
            return;
        }
        
        document.getElementById('sec-audit-table').innerHTML = logs.map(l => `
            <tr class="border-t border-gray-700">
                <td class="p-4 text-sm">${new Date(l.timestamp).toLocaleString()}</td>
                <td class="p-4">${escHtml(l.user_email || 'System')}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-400">${l.action}</span></td>
                <td class="p-4 text-sm">${escHtml(l.resource_type || '-')}</td>
                <td class="p-4 text-sm text-gray-400">${l.ip_address || '-'}</td>
                <td class="p-4 text-center">${l.success ? '<span class="text-green-400">✓</span>' : '<span class="text-red-400">✗</span>'}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading audit logs:', e);
    }
}

// Export audit logs
async function exportAuditLogs() {
    showToast('Exporting audit logs...', 'info');
    try {
        const res = await fetch('/api/security/audit-logs/export', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Export failed');
        
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs-' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Audit logs exported', 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
    }
}

// Check MFA status



function selectMfaMode(mode) {
    document.querySelector(`input[name="mfa-mode"][value="${mode}"]`).checked = true;
    saveMfaSettings();
}

async function saveMfaSettings() {
    const mode = document.querySelector('input[name="mfa-mode"]:checked')?.value || 'off';
    
    try {
        const res = await fetch('/api/security/settings', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ mfa_enforcement: mode })
        });
        
        if (res.ok) {
            const status = document.getElementById('mfa-save-status');
            status.classList.remove('hidden');
            setTimeout(() => status.classList.add('hidden'), 2000);
            checkMfaStatus();
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function loadMfaAdminSettings() {
    try {
        const res = await fetch('/api/security/settings', { headers: getAuthHeaders() });
        if (!res.ok) return;
        
        const settings = await res.json();
        const mode = settings.mfa_enforcement || 'off';
        
        // Set radio button
        const radio = document.querySelector(`input[name="mfa-mode"][value="${mode}"]`);
        if (radio) radio.checked = true;
    } catch (e) {
        console.error('Error loading MFA settings:', e);
    }
}

async function checkMfaStatus() {
    // Load admin settings if admin
    loadMfaAdminSettings();
    
    try {
        // Get user info
        const userRes = await fetch('/api/security/auth/me', { headers: getAuthHeaders() });
        if (!userRes.ok) return;
        const userData = await userRes.json();
        
        // Get security settings
        const settingsRes = await fetch('/api/security/settings', { headers: getAuthHeaders() });
        const settings = settingsRes.ok ? await settingsRes.json() : {};
        
        const userMfaEnabled = userData.user?.mfa_enabled || false;
        const enforcement = settings.mfa_enforcement || 'off';
        
        // Update status badge
        const badge = document.getElementById('mfa-status-badge');
        const statusText = document.getElementById('mfa-status-text');
        
        if (badge && statusText) {
            if (enforcement === 'off') {
                badge.innerHTML = '<span class="px-3 py-1 rounded-full text-sm bg-gray-600 text-gray-300">Disabled</span>';
                statusText.textContent = 'MFA is turned off for your organization';
            } else if (enforcement === 'optional') {
                badge.innerHTML = userMfaEnabled 
                    ? '<span class="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">✓ Active</span>'
                    : '<span class="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400">Optional</span>';
                statusText.textContent = userMfaEnabled ? 'MFA is active on your account' : 'MFA is optional - you can enable it below';
            } else if (enforcement === 'admins') {
                badge.innerHTML = '<span class="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">Admins Only</span>';
                statusText.textContent = 'MFA is required for administrators';
            } else {
                badge.innerHTML = '<span class="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400">✓ Required</span>';
                statusText.textContent = 'MFA is required for all users';
            }
        }
        
        // Show user toggle only for Optional mode
        const userToggleSection = document.getElementById('mfa-user-toggle-section');
        if (userToggleSection) {
            if (enforcement === 'optional') {
                userToggleSection.classList.remove('hidden');
                const userEnabledCheckbox = document.getElementById('mfa-user-enabled');
                if (userEnabledCheckbox) userEnabledCheckbox.checked = userMfaEnabled;
            } else {
                userToggleSection.classList.add('hidden');
            }
        }
        
    } catch (e) {
        console.error('Error checking MFA status:', e);
    }
}

async function toggleUserMFA() {
    const checkbox = document.getElementById('mfa-user-enabled');
    const newState = checkbox.checked;
    
    try {
        const res = await fetch('/api/security/mfa/user-toggle', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: newState })
        });
        
        if (res.ok) {
            showToast(newState ? 'MFA enabled for your account' : 'MFA disabled for your account', 'success');
            checkMfaStatus();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Failed to update MFA', 'error');
            checkbox.checked = !newState;
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
        checkbox.checked = !newState;
    }
}

function showInviteModal() {
    // Load groups for selection
    const groupsHtml = allGroups.map(g => `
        <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 cursor-pointer">
            <input type="checkbox" class="invite-group accent-purple-500" value="${g.id}">
            <span>👥 ${g.name}</span>
        </label>
    `).join('') || '<p class="text-gray-500 text-sm p-2">No groups yet. Create groups in the Groups tab.</p>';
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]';
    modal.id = 'invite-modal';
    modal.innerHTML = `
        <div class="card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4">📨 Invite User</h3>
            <div class="space-y-4">
                <!-- Email -->
                <div>
                    <label class="block text-sm text-gray-400 mb-1">Email Address *</label>
                    <input type="email" id="invite-email" placeholder="user@company.com" class="input-field w-full px-4 py-2 rounded-lg">
                </div>
                
                <!-- Portal Access -->
                <div>
                    <label class="block text-sm text-gray-400 mb-2">🎫 Portal Access</label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-purple-500 cursor-pointer transition" onclick="togglePortalAccess('admin')">
                            <input type="checkbox" id="invite-admin-access" class="accent-purple-500 w-5 h-5" onchange="updateInviteUI()">
                            <div>
                                <div class="font-medium">🖥️ Admin Portal</div>
                                <div class="text-xs text-gray-400">Manage platform</div>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-purple-500 cursor-pointer transition" onclick="togglePortalAccess('enduser')">
                            <input type="checkbox" id="invite-enduser-access" class="accent-purple-500 w-5 h-5" onchange="updateInviteUI()" checked>
                            <div>
                                <div class="font-medium">💬 End User Portal</div>
                                <div class="text-xs text-gray-400">Use AI agents</div>
                            </div>
                        </label>
                    </div>
                </div>
                
                <!-- Admin Role (shown when admin portal selected) -->
                <div id="invite-admin-section" class="hidden">
                    <label class="block text-sm text-gray-400 mb-1">🎭 Admin Role</label>
                    <select id="invite-role" class="input-field w-full px-4 py-2 rounded-lg">
                        ${securityRoles.filter(r => !r.name.toLowerCase().includes('end user')).map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                    </select>
                </div>
                
                <!-- User Groups (shown when end user portal selected) -->
                <div id="invite-groups-section">
                    <label class="block text-sm text-gray-400 mb-2">👥 User Groups</label>
                    <p class="text-xs text-gray-500 mb-2">Groups determine which AI agents this user can access</p>
                    <div class="max-h-40 overflow-y-auto rounded-lg border border-gray-700 p-2 space-y-1">
                        ${groupsHtml}
                    </div>
                </div>
                
                <div class="flex gap-2 pt-4">
                    <button onclick="document.getElementById('invite-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg flex-1">Cancel</button>
                    <button onclick="sendInvite()" class="btn-primary px-4 py-2 rounded-lg flex-1">📧 Send Invite</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Initialize UI state
    updateInviteUI();
}

function togglePortalAccess(type) {
    // Allow the checkbox to toggle naturally
}

function updateInviteUI() {
    const adminAccess = document.getElementById('invite-admin-access')?.checked;
    const endUserAccess = document.getElementById('invite-enduser-access')?.checked;
    
    const adminSection = document.getElementById('invite-admin-section');
    const groupsSection = document.getElementById('invite-groups-section');
    
    if (adminSection) {
        adminSection.classList.toggle('hidden', !adminAccess);
    }
    if (groupsSection) {
        groupsSection.classList.toggle('hidden', !endUserAccess);
    }
}

// Send invite
async function sendInvite() {
    const email = document.getElementById('invite-email')?.value;
    const adminAccess = document.getElementById('invite-admin-access')?.checked;
    const endUserAccess = document.getElementById('invite-enduser-access')?.checked;
    const role = document.getElementById('invite-role')?.value;
    const selectedGroups = Array.from(document.querySelectorAll('.invite-group:checked')).map(cb => cb.value);
    
    if (!email) {
        showToast('Please enter an email', 'error');
        return;
    }
    
    if (!adminAccess && !endUserAccess) {
        showToast('Please select at least one portal access', 'error');
        return;
    }
    
    try {
        const inviteData = { 
            email, 
            role_ids: adminAccess && role ? [role] : [],
            group_ids: selectedGroups,
            has_admin_access: adminAccess,
            has_enduser_access: endUserAccess
        };
        
        const res = await fetch('/api/security/users/invite', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(inviteData)
        });
        
        if (res.ok) {
            showToast('Invitation sent!', 'success');
            document.getElementById('invite-modal')?.remove();
            loadSecurityUsers();
            loadSecurityStats();
        } else {
            const data = await res.json();
            console.log("Invite response:", data);
            showToast(data.detail || 'Failed to send invite', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}


// Load security settings into form
async function loadSecuritySettings() {
    try {
        const res = await fetch('/api/security/settings', { headers: getAuthHeaders() });
        if (!res.ok) return;
        
        const settings = await res.json();
        
        // Populate select fields
        const mfaEnforcement = document.getElementById('sec-setting-mfa_enforcement');
        if (mfaEnforcement) mfaEnforcement.value = settings.mfa_enforcement || 'off';
        
        const lockoutAttempts = document.getElementById('sec-setting-lockout_attempts');
        if (lockoutAttempts) lockoutAttempts.value = settings.account_lockout_attempts || 5;
        
        const lockoutDuration = document.getElementById('sec-setting-lockout_duration');
        if (lockoutDuration) lockoutDuration.value = settings.account_lockout_duration_minutes || 30;
        
        // Populate checkboxes
        const mfaOptout = document.getElementById('sec-setting-mfa_allow_user_optout');
        if (mfaOptout) mfaOptout.checked = settings.mfa_allow_user_optout || false;

        const sharedEmails = document.getElementById('sec-setting-allow_shared_emails');
        if (sharedEmails) sharedEmails.checked = settings.allow_shared_emails || false;
        
    } catch (e) {
        console.error('Error loading security settings:', e);
    }
}

// Save security settings
async function saveSecuritySettings() {
    const form = document.getElementById('security-settings-form');
    const formData = new FormData(form);
    const settings = {};
    
    for (const [key, value] of formData.entries()) {
        settings[key] = value;
    }
    
    // Handle checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        settings[cb.name] = cb.checked;
    });
    
    try {
        const res = await fetch('/api/security/settings', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        
        if (res.ok) {
            showToast('Settings saved!', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Toast notification - uses global NotificationSystem (defined earlier)
// showToast function is already defined in the NotificationSystem section

// Update navigate function to include security
const originalNavigate = navigate;
navigate = function(p, updateHash = true) {
    // DEBUG: Log only create navigation
    if (p === 'create') {
        console.log('🎯 [CREATE] navigate override called', { hasAuth: !!authToken, hasPerm: hasPermission('agents:create') });
    }
    
    // Check auth for protected pages
    if (!authToken && p !== 'login') {
        showLoginPage();
        return;
    }
    
    // Hide login if showing app
    if (authToken && p !== 'login') {
        document.getElementById('page-login')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');
    }
    
    // Check permissions for protected pages
    const requiredPerm = MENU_PERMISSIONS[p];
    if (requiredPerm && !hasPermission(requiredPerm)) {
        if (p === 'create') console.log('🎯 [CREATE] Permission denied!');
        showToast(`You don't have permission to access ${p}`, 'error');
        return;
    }
    
    // Call original navigate
    originalNavigate(p, updateHash);
    
    // Initialize security page
    if (p === 'security') initSecurityPage();
};

// Handle reset password page
function showSpecialPage() {
    document.getElementById('loading-screen')?.classList.add('hidden');
    document.getElementById('page-login').classList.add('visible');
    document.getElementById('app').classList.add('hidden');
}

function showResetPasswordPage(token) {
    showSpecialPage();
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
            <p class="text-gray-400">Create new password</p>
        </div>
        <div class="card rounded-2xl p-8">
            <h2 class="text-xl font-bold mb-6">Reset Password</h2>
            
            <form onsubmit="handleResetPassword(event, '${token}')">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">New Password</label>
                        <div class="relative">
                            <input type="password" id="reset-password" required minlength="8"
                                   class="input-field w-full px-4 py-3 pr-12 rounded-lg"
                                   placeholder="Min 8 characters"
                                   oninput="checkPasswordStrength(this.value)">
                            <button type="button" onclick="togglePassword('reset-password', this)" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                                <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg></span>
                            </button>
                        </div>
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
                            <input type="password" id="reset-password2" required
                                   class="input-field w-full px-4 py-3 pr-12 rounded-lg"
                                   placeholder="Repeat password">
                            <button type="button" onclick="togglePassword('reset-password2', this)" 
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1">
                                <span class="eye-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg></span>
                            </button>
                        </div>
                    </div>
                    
                    <button type="submit" id="reset-btn"
                            class="btn-primary w-full py-3 rounded-lg font-semibold">
                        Reset Password
                    </button>
                </div>
            </form>
        </div>
    `;
}

// Handle reset password submit
async function handleResetPassword(event, token) {
    event.preventDefault();
    
    const password = document.getElementById('reset-password').value;
    const password2 = document.getElementById('reset-password2').value;
    
    if (password !== password2) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
    }
    
    const btn = document.getElementById('reset-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block">⏳</span> Resetting...';
    
    try {
        const res = await fetch('/api/security/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, new_password: password })
        });
        
        const data = await res.json();
        console.log("Login response:", data);
        
        if (res.ok) {
            showResetPasswordSuccess();
        } else {
            showToast(data.detail || 'Reset failed. Link may have expired.', 'error');
            btn.disabled = false;
            btn.textContent = 'Reset Password';
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Reset Password';
    }
}

// Show reset password success
function showResetPasswordSuccess() {
    document.getElementById('auth-container').innerHTML = `
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
            <h2 class="text-xl font-bold mb-2">Password Reset!</h2>
            <p class="text-gray-400 mb-6">
                Your password has been reset successfully.<br>
                You can now sign in with your new password.
            </p>
            <button onclick="window.location.href='/ui/'" class="btn-primary w-full py-3 rounded-lg font-semibold">
                Sign In Now
            </button>
        </div>
    `;
}

// Handle email verification page
function showVerifyEmailPage(token) {
    showSpecialPage();
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
        </div>
        <div class="card rounded-2xl p-8 text-center">
            <div class="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="animate-spin text-2xl">⏳</span>
            </div>
            <h2 class="text-xl font-bold mb-2">Verifying Email...</h2>
            <p class="text-gray-400">Please wait while we verify your email.</p>
        </div>
    `;
    
    // Call verify API
    verifyEmail(token);
}

// Verify email API call
async function verifyEmail(token) {
    try {
        const res = await fetch('/api/security/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });
        
        if (res.ok) {
            showVerifyEmailSuccess();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showVerifyEmailError(data.detail || 'Verification failed');
        }
    } catch (e) {
        showVerifyEmailError('Error verifying email');
    }
}

// Show verification success
function showVerifyEmailSuccess() {
    document.getElementById('auth-container').innerHTML = `
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
            <h2 class="text-xl font-bold mb-2">Email Verified!</h2>
            <p class="text-gray-400 mb-6">
                Your email has been verified successfully.<br>
                You can now sign in to your account.
            </p>
            <button onclick="window.location.href='/ui/'" class="btn-primary w-full py-3 rounded-lg font-semibold">
                Sign In Now
            </button>
        </div>
    `;
}

// Show verification error
function showVerifyEmailError(message) {
    document.getElementById('auth-container').innerHTML = `
        <div class="text-center mb-8">
            <div class="inline-flex items-center gap-3 mb-4">
                <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">
                <h1 class="text-3xl font-bold gradient-text">AgentForge</h1>
            </div>
        </div>
        <div class="card rounded-2xl p-8 text-center">
            <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <h2 class="text-xl font-bold mb-2">Verification Failed</h2>
            <p class="text-gray-400 mb-6">${message}</p>
            <button onclick="location.reload()" class="btn-primary w-full py-3 rounded-lg font-semibold">
                Back to Sign In
            </button>
        </div>
    `;
}


// Show invitation register form
function showInvitationRegister(token) {
    showSpecialPage();
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    
    var eyeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>';
    
    document.getElementById('auth-container').innerHTML = 
        '<div class="text-center mb-8">' +
            '<div class="inline-flex items-center gap-3 mb-4">' +
                '<img src="/AgentForge_Logo.png" alt="AgentForge" class="w-16 h-16 rounded-xl">' +
                '<h1 class="text-3xl font-bold gradient-text">AgentForge</h1>' +
            '</div>' +
            '<p class="text-gray-400">Complete your registration</p>' +
        '</div>' +
        '<div class="card rounded-2xl p-8">' +
            '<h2 class="text-xl font-bold mb-6">Accept Invitation</h2>' +
            '<form onsubmit="handleInvitationRegister(event, \'' + token + '\')">' +
                '<div class="space-y-4">' +
                    '<div class="grid grid-cols-2 gap-4">' +
                        '<div><label class="block text-sm text-gray-400 mb-2">First Name</label>' +
                        '<input type="text" id="inv-firstname" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="John"></div>' +
                        '<div><label class="block text-sm text-gray-400 mb-2">Last Name</label>' +
                        '<input type="text" id="inv-lastname" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="Doe"></div>' +
                    '</div>' +
                    '<div>' +
                        '<label class="block text-sm text-gray-400 mb-2">Username</label>' +
                        '<input type="text" id="inv-username" required class="input-field w-full px-4 py-3 rounded-lg" placeholder="e.g., john.doe">' +
                        '<div class="text-xs text-gray-500 mt-1">Use a short name. Do not use an email address.</div>' +
                    '</div>' +
                    '<div>' +
                        '<label class="block text-sm text-gray-400 mb-2">Password</label>' +
                        '<div class="relative">' +
                            '<input type="password" id="inv-password" required minlength="8" class="input-field w-full px-4 py-3 pr-12 rounded-lg" placeholder="Min 8 characters" oninput="checkPasswordStrength(this.value)">' +
                            '<button type="button" onclick="togglePassword(\'inv-password\', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"><span class="eye-icon">' + eyeIcon + '</span></button>' +
                        '</div>' +
                        '<div class="mt-2"><div class="flex gap-1 mb-1"><div id="str-1" class="h-1 flex-1 rounded bg-gray-600"></div><div id="str-2" class="h-1 flex-1 rounded bg-gray-600"></div><div id="str-3" class="h-1 flex-1 rounded bg-gray-600"></div><div id="str-4" class="h-1 flex-1 rounded bg-gray-600"></div></div><p id="str-text" class="text-xs text-gray-500"></p></div>' +
                    '</div>' +
                    '<div>' +
                        '<label class="block text-sm text-gray-400 mb-2">Confirm Password</label>' +
                        '<div class="relative">' +
                            '<input type="password" id="inv-confirm-password" required minlength="8" class="input-field w-full px-4 py-3 pr-12 rounded-lg" placeholder="Confirm password">' +
                            '<button type="button" onclick="togglePassword(\'inv-confirm-password\', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"><span class="eye-icon">' + eyeIcon + '</span></button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="inv-error" class="hidden bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm"></div>' +
                    '<button type="submit" id="inv-submit-btn" class="w-full py-3 rounded-lg font-semibold text-white" style="background: var(--accent-gradient);">Create Account</button>' +
                '</div>' +
            '</form>' +
        '</div>';
}

// Handle invitation register
async function handleInvitationRegister(event, token) {
    event.preventDefault();
    var firstName = document.getElementById('inv-firstname').value;
    var lastName = document.getElementById('inv-lastname').value;
    var username = document.getElementById('inv-username').value;
    var password = document.getElementById('inv-password').value;
    var confirmPassword = document.getElementById('inv-confirm-password').value;
    var errorDiv = document.getElementById('inv-error');
    var btn = document.getElementById('inv-submit-btn');
    errorDiv.classList.add('hidden');
    if (password !== confirmPassword) { 
        errorDiv.textContent = 'Passwords do not match'; 
        errorDiv.classList.remove('hidden'); 
        return; 
    }
    btn.disabled = true; 
    btn.textContent = 'Creating account...';
    try {
        var res = await fetch('/api/security/auth/accept-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                token: token,
                username: username,
                first_name: firstName, 
                last_name: lastName, 
                password: password 
            })
        });
        var data = await res.json();
        if (!res.ok) { 
            errorDiv.textContent = data.detail || 'Registration failed'; 
            errorDiv.classList.remove('hidden'); 
            btn.disabled = false; 
            btn.textContent = 'Create Account'; 
            return; 
        }
        showToast('Account created! Please sign in.', 'success');
        window.location.hash = '';
        location.reload();
    } catch (e) { 
        errorDiv.textContent = 'Error: ' + e.message; 
        errorDiv.classList.remove('hidden'); 
    }
    btn.disabled = false; 
    btn.textContent = 'Create Account';
}

// ============================================================================
// Profile Page Functions
// ============================================================================

let currentUserProfile = null;

async function loadProfileInfo() {
    try {
        const res = await fetch(API + '/api/security/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!res.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await res.json();
        currentUserProfile = data;
        
        // Update profile info display
        const emailEl = document.getElementById('profile-email');
        if (emailEl) emailEl.value = data.email || '';
        
        const roleEl = document.getElementById('profile-role');
        if (roleEl) roleEl.textContent = data.roles?.map(r => r.name).join(', ') || 'User';
        
        // Format created date
        const createdEl = document.getElementById('profile-created');
        if (createdEl) {
            if (data.profile?.created_at) {
                const date = new Date(data.profile.created_at);
                createdEl.textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            } else {
                createdEl.textContent = 'N/A';
            }
        }
        
        // Populate edit form
        document.getElementById('update-first-name').value = data.profile?.first_name || '';
        document.getElementById('update-last-name').value = data.profile?.last_name || '';
        document.getElementById('update-display-name').value = data.profile?.display_name || '';
        
        // Update MFA status
        updateMFAStatus(data);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile information', 'error');
    }
}

function updateMFAStatus(userData) {
    // Support both formats: mfa.method (singular) and mfa_methods (array) for backward compatibility
    const mfaEnabled = userData.mfa?.enabled || userData.mfa_enabled || false;
    let mfaMethod = userData.mfa?.method || 'none';
    
    // If mfa.method is not available, try to get from mfa_methods array
    if (mfaMethod === 'none' && userData.mfa_methods && userData.mfa_methods.length > 0) {
        mfaMethod = userData.mfa_methods[0];
    }
    // Also check mfa.methods array (nested)
    if (mfaMethod === 'none' && userData.mfa?.methods && userData.mfa.methods.length > 0) {
        mfaMethod = userData.mfa.methods[0];
    }
    
    const statusText = document.getElementById('mfa-status-text');
    const toggle = document.getElementById('mfa-toggle');
    const toggleDot = document.getElementById('mfa-toggle-dot');
    
    if (mfaEnabled) {
        statusText.textContent = `Enabled (${mfaMethod.toUpperCase()})`;
        // Toggle ON - green background, dot to the right
        if (toggle) {
            toggle.classList.remove('bg-red-500');
            toggle.classList.add('bg-green-500');
            toggle.dataset.enabled = 'true';
        }
        if (toggleDot) {
            toggleDot.classList.remove('translate-x-1');
            toggleDot.classList.add('translate-x-8');
        }
    } else {
        statusText.textContent = 'Disabled';
        // Toggle OFF - red background, dot to the left
        if (toggle) {
            toggle.classList.remove('bg-green-500');
            toggle.classList.add('bg-red-500');
            toggle.dataset.enabled = 'false';
        }
        if (toggleDot) {
            toggleDot.classList.remove('translate-x-8');
            toggleDot.classList.add('translate-x-1');
        }
    }
}

function toggleMFA() {
    const toggle = document.getElementById('mfa-toggle');
    const isEnabled = toggle?.dataset.enabled === 'true';
    
    if (isEnabled) {
        // Currently enabled, user wants to disable
        showDisableMFAModal();
    } else {
        // Currently disabled, user wants to enable
        showMFASetupModal();
    }
}

// Update Profile Form Handler - Wrapped for safety
function initProfileFormHandler() {
    const form = document.getElementById('update-profile-form');
    console.log('🔧 Profile form element:', form);
    
    if (!form) {
        console.error('❌ Profile form not found!');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('profile-email');
        const firstNameInput = document.getElementById('update-first-name');
        const lastNameInput = document.getElementById('update-last-name');
        const displayNameInput = document.getElementById('update-display-name');
        
        console.log('📝 Profile Update Debug:');
        console.log('   First Name Input:', firstNameInput, '=', firstNameInput?.value);
        console.log('   Last Name Input:', lastNameInput, '=', lastNameInput?.value);
        console.log('   Display Name Input:', displayNameInput, '=', displayNameInput?.value);
        
        const email = emailInput?.value?.trim() || '';
        const firstName = firstNameInput?.value?.trim() || '';
        const lastName = lastNameInput?.value?.trim() || '';
        const displayName = displayNameInput?.value?.trim() || '';
        
        // IMPORTANT: Send empty string as is, not null, so it can update to empty
        const requestBody = {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName || null
        };

        if (email && email !== (currentUserProfile?.email || '')) {
            requestBody.email = email;
        }
        
        console.log('   Request Body:', JSON.stringify(requestBody));
        console.log('   User ID:', currentUserProfile?.id);
        
        try {
            const res = await fetch(API + `/api/security/users/${currentUserProfile.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(requestBody)
            });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to update profile');
        }
        
            showToast('Profile updated successfully', 'success');
            await loadProfileInfo();
            await fetchCurrentUser(); // Refresh user info in sidebar
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast(error.message || 'Failed to update profile', 'error');
        }
    });
}

// Initialize profile form on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileFormHandler);
} else {
    initProfileFormHandler();
}

// Change Password Form Handler
document.getElementById('change-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    const errorDiv = document.getElementById('password-error');
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        if (errorDiv) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.classList.remove('hidden');
        }
        return;
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
        if (errorDiv) {
            errorDiv.textContent = 'Password must be at least 8 characters long';
            errorDiv.classList.remove('hidden');
        }
        return;
    }
    
    try {
        const res = await fetch(API + '/api/security/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to change password');
        }
        
        showToast('Password changed successfully', 'success');
        
        // Clear form and close modal
        document.getElementById('change-password-form').reset();
        hideChangePasswordModal();
        
    } catch (error) {
        console.error('Error changing password:', error);
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to change password';
            errorDiv.classList.remove('hidden');
        }
    }
});

// MFA Functions
async function startMFASetup() {
    const selectedType = document.querySelector('input[name="mfa-type"]:checked').value;
    
    try {
        const res = await fetch(API + '/api/security/mfa/enable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                method: selectedType
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to start MFA setup');
        }
        
        const data = await res.json();
        
        if (selectedType === 'totp') {
            showTOTPSetup(data);
        } else if (selectedType === 'email') {
            showEmailSetup();
        }
        
    } catch (error) {
        console.error('Error starting MFA setup:', error);
        showToast(error.message || 'Failed to start MFA setup', 'error');
    }
}

function showTOTPSetup(data) {
    // Show modal with TOTP setup
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">Setup Authenticator App</h3>
            <div class="text-center mb-4">
                <p class="text-sm text-gray-400 mb-4">Scan this QR code with your authenticator app</p>
                <div id="modal-qr-code" class="flex justify-center mb-4 bg-white p-4 rounded-lg"></div>
                <p class="text-xs text-gray-500 mb-2">Or enter this key manually:</p>
                <code class="bg-gray-700 px-3 py-1 rounded text-sm block">${data.secret}</code>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                <input type="text" id="modal-totp-code" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-center text-lg tracking-wider" placeholder="000000" maxlength="6" pattern="[0-9]{6}">
            </div>
            <div class="flex gap-3">
                <button onclick="closeMFAModal()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                <button onclick="verifyTOTPSetupModal('${data.secret}')" class="btn-primary flex-1 py-2 rounded-lg">Verify & Enable</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.id = 'mfa-setup-modal';
    
    // Generate QR code
    if (data.qr_code) {
        document.getElementById('modal-qr-code').innerHTML = `<img src="${data.qr_code}" alt="QR Code" class="w-48 h-48">`;
    }
}

function showEmailSetup() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-xl font-bold mb-4">Verify Email MFA</h3>
            <div class="text-center mb-4">
                <p class="text-sm text-gray-400 mb-4">A verification code has been sent to your email</p>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                <input type="text" id="modal-email-code" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-center text-lg tracking-wider" placeholder="000000" maxlength="6" pattern="[0-9]{6}">
            </div>
            <div class="flex gap-3">
                <button onclick="closeMFAModal()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                <button onclick="verifyEmailSetupModal()" class="btn-primary flex-1 py-2 rounded-lg">Verify & Enable</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.id = 'mfa-setup-modal';
}

function closeMFAModal() {
    const modal = document.getElementById('mfa-setup-modal');
    if (modal) {
        modal.remove();
    }
}

async function verifyTOTPSetupModal(secret) {
    const code = document.getElementById('modal-totp-code').value;
    
    if (!code || code.length !== 6) {
        showToast('Please enter a 6-digit code', 'error');
        return;
    }
    
    try {
        const res = await fetch(API + '/api/security/mfa/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                code: code,
                method: 'totp'
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Invalid verification code');
        }
        
        showToast('MFA enabled successfully!', 'success');
        closeMFAModal();
        await loadProfileInfo();
        
    } catch (error) {
        console.error('Error verifying TOTP:', error);
        showToast(error.message || 'Failed to verify code', 'error');
    }
}

async function verifyEmailSetupModal() {
    const code = document.getElementById('modal-email-code').value;
    
    if (!code || code.length !== 6) {
        showToast('Please enter a 6-digit code', 'error');
        return;
    }
    
    try {
        const res = await fetch(API + '/api/security/mfa/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                code: code,
                method: 'email'
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Invalid verification code');
        }
        
        showToast('Email MFA enabled successfully!', 'success');
        closeMFAModal();
        await loadProfileInfo();
        
    } catch (error) {
        console.error('Error verifying email code:', error);
        showToast(error.message || 'Failed to verify code', 'error');
    }
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        // Eye open icon (showing password)
        icon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>`;
    } else {
        input.type = 'password';
        // Eye closed icon (hiding password)
        icon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
        </svg>`;
    }
}

function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        ensureModalInBody('change-password-modal');
        modal.classList.remove('hidden');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-error')?.classList.add('hidden');
        document.getElementById('current-password').focus();
    }
}

function hideChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.classList.add('hidden');
}

function showMFASetupModal() {
    // Show the MFA setup options in a modal-like way
    startMFASetup();
}

function showDisableMFAModal() {
    ensureModalInBody('disable-mfa-modal');
    const modal = document.getElementById('disable-mfa-modal');
    const input = document.getElementById('disable-mfa-password');
    const errorDiv = document.getElementById('disable-mfa-error');
    
    // Reset
    input.value = '';
    input.type = 'password';
    errorDiv.classList.add('hidden');
    
    modal.classList.remove('hidden');
    input.focus();
}

function hideDisableMFAModal() {
    document.getElementById('disable-mfa-modal').classList.add('hidden');
}

async function confirmDisableMFA() {
    const password = document.getElementById('disable-mfa-password').value;
    const errorDiv = document.getElementById('disable-mfa-error');
    
    if (!password) {
        errorDiv.textContent = 'Please enter your password';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    try {
        const res = await fetch(API + '/api/security/mfa/disable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                password: password
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.detail || 'Failed to disable MFA');
        }
        
        hideDisableMFAModal();
        showToast('MFA disabled successfully', 'success');
        await loadProfileInfo();
        
    } catch (error) {
        console.error('Error disabling MFA:', error);
        errorDiv.textContent = error.message || 'Failed to disable MFA';
        errorDiv.classList.remove('hidden');
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    
    // Get token from localStorage FIRST
    authToken = localStorage.getItem('agentforge_token');
    const savedUser = localStorage.getItem('agentforge_user');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch(e) {}
    }
    
    // Fallback to sessionStorage
    if (!authToken) {
        authToken = sessionStorage.getItem('agentforge_token');
        const sessionUser = sessionStorage.getItem('agentforge_user');
        if (sessionUser) {
            try { currentUser = JSON.parse(sessionUser); } catch(e) {}
        }
    }
    
    // Handle special PUBLIC pages (no auth required)
    if (hash) {
        // Reset password page
        if (hash.includes('reset-password')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const token = params.get('token');
            if (token) {
                showResetPasswordPage(token);
                return;
            }
        }
        
        // Invitation register page
        if (hash.includes('register')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const token = params.get('token');
            if (token) {
                showInvitationRegister(token);
                return;
            }
        }
        
        // Verify email page
        if (hash.includes('verify-email')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const token = params.get('token');
            if (token) {
                showVerifyEmailPage(token);
                return;
            }
        }
        
        // MFA verification page (from OAuth callback)
        if (hash.includes('mfa-verify')) {
            console.log("🔍 [FRONTEND] Detected #mfa-verify in URL hash");
            const params = new URLSearchParams(hash.split('?')[1]);
            const sessionId = params.get('session_id');
            const email = params.get('email');
            const provider = params.get('provider');
            
            console.log("   Session ID:", sessionId);
            console.log("   Email:", email);
            console.log("   Provider:", provider);
            
            if (sessionId && email) {
                console.log("✅ [FRONTEND] Showing MFA verification modal for OAuth login");
                // Store session info for MFA verification
                window.pendingMfaSessionId = sessionId;
                window.pendingMfaEmail = email;
                window.pendingMfaProvider = provider || 'google';
                
                // Show MFA modal with email method (default for OAuth)
                showLoginMfaModal(['email']);
                return;
            } else {
                console.error("❌ [FRONTEND] Missing session_id or email in mfa-verify hash");
            }
        }
    }
    
    // Initialize wizard access control
    initWizardAccessControl();
    
    // Normal auth flow
    checkAuth();
});
