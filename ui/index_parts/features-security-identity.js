// Extracted from ui/index_parts/app-features.js
// Chunk: features-security-identity.js
// Loaded via defer in ui/index.html; do not reorder.

// ============================================================================
// SECURITY CENTER FUNCTIONS
// ============================================================================

// Initialize security page

// Load security statistics
async function loadSecurityStats() {
    // Don't make request if not authenticated (best practice)
    if (!authToken) return;
    
    try {
        const res = await fetch('/api/security/stats', {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const stats = await res.json();
        
        document.getElementById('sec-stat-users').textContent = stats.users?.total || 0;
        document.getElementById('sec-stat-active').textContent = stats.users?.active || 0;
        document.getElementById('sec-stat-roles').textContent = stats.roles || 0;
        document.getElementById('sec-stat-policies').textContent = stats.policies || 0;
        document.getElementById('sec-stat-mfa').textContent = stats.users?.mfa_enabled || 0;
    } catch (e) {
        console.error('Error loading security stats:', e);
    }
}

// Load security users
async function loadSecurityUsers() {
    // Don't make request if not authenticated (best practice)
    if (!authToken) return;
    
    try {
        const res = await fetch('/api/security/users', {
            headers: getAuthHeaders()
        });
        
        if (res.status === 403) {
            document.getElementById('sec-users-table').innerHTML = 
                '<tr><td colspan="6" class="p-8 text-center text-yellow-500">⚠️ Admin permissions required</td></tr>';
            return;
        }
        
        if (!res.ok) return;
        const data = await res.json();
        console.log("Login response:", data);
        securityUsers = data.users || [];
        renderSecurityUsers();
    } catch (e) {
        console.error('Error loading users:', e);
    }
}

// Render security users table
function renderSecurityUsers() {
    const filter = document.getElementById('sec-user-search')?.value?.toLowerCase() || '';
    const status = document.getElementById('sec-user-filter')?.value || '';
    
    let users = securityUsers.filter(u => {
        if (filter && !u.email.toLowerCase().includes(filter) && !(u.name||'').toLowerCase().includes(filter)) return false;
        if (status && u.status !== status) return false;
        return true;
    });
    
    if (!users.length) {
        document.getElementById('sec-users-table').innerHTML = 
            '<tr><td colspan="6" class="p-8 text-center text-gray-500">No users found</td></tr>';
        return;
    }
    
    document.getElementById('sec-users-table').innerHTML = users.map(u => `
        <tr class="border-t border-gray-700 hover:bg-gray-800/50">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
                        ${(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                        <div class="font-medium">${escHtml(u.name || 'No name')}</div>
                        <div class="text-sm text-gray-400">${escHtml(u.email)}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">
                ${(u.roles || []).map(roleName => {
                    // Use role names directly from API response (best practice)
                    return `<span class="px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-400 mr-1">${escHtml(roleName)}</span>`;
                }).join('') || (u.role_ids || []).map(roleId => {
                    // Fallback: if roles array not available, try to find in securityRoles
                    const role = securityRoles.find(r => r.id === roleId);
                    const roleName = role ? role.name : (roleId.replace('role_', '') || roleId);
                    return `<span class="px-2 py-1 rounded text-xs bg-blue-600/30 text-blue-400 mr-1">${escHtml(roleName)}</span>`;
                }).join('')}
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded text-xs ${u.status === 'active' ? 'bg-green-600/30 text-green-400' : u.status === 'pending' ? 'bg-yellow-600/30 text-yellow-400' : 'bg-red-600/30 text-red-400'}">${u.status}</span>
            </td>
            <td class="p-4 text-center">${u.mfa_enabled ? '<span class="text-green-400">✓</span>' : '<span class="text-gray-500">—</span>'}</td>
            <td class="p-4 text-sm text-gray-400">${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
            <td class="p-4 flex gap-2">
                <button data-permission="users:edit" onclick="editSecurityUser('${u.id}')" class="text-blue-400 hover:text-blue-300" title="Edit">✏️</button>
                ${u.status === 'pending' && !u.email_verified ? `<button onclick="resendVerificationEmail('${u.id}', '${u.email}')" class="text-yellow-400 hover:text-yellow-300" title="Resend Verification">📧</button>` : ''}
                ${u.id !== currentUser?.id ? `<button data-permission="users:delete" onclick="deleteSecurityUser('${u.id}')" class="text-red-400 hover:text-red-300" title="Delete">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

// Resend verification email to user
async function resendVerificationEmail(userId, email) {
    if (!(await uiConfirm(`Send a verification email to ${email}?`, { title: 'Send verification email', confirmText: 'Send', cancelText: 'Cancel' }))) return;
    
    try {
        const res = await fetch(`/api/security/users/${userId}/resend-verification`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            showToast(`Verification email sent to ${email}`, 'success');
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to send email', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}


// Delete security user
async function deleteSecurityUser(userId) {
    if (!(await uiConfirm('Remove this user?', { title: 'Remove user', confirmText: 'Remove', cancelText: 'Cancel', danger: true }))) return;
    
    try {
        const res = await fetch('/api/security/users/' + userId, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            showToast('User deleted successfully', 'success');
            loadSecurityUsers();
            loadSecurityStats();
        } else {
            const data = await res.json();
        console.log("Login response:", data);
            showToast(data.detail || 'Failed to delete user', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// Create user (direct creation, not invite-only)
async function showCreateUserModal(preset) {
    preset = preset || {};
    try { await Promise.all([loadOrgDepartments(), loadOrgUsers(), loadGroups(), loadOrgJobTitles()]); } catch (e) { /* silent */ }

    const roles = Array.isArray(securityRoles) ? securityRoles : [];
    const groups = Array.isArray(allGroups) ? allGroups : [];
    const depts = Array.isArray(orgDepartments) ? orgDepartments : [];
    const users = Array.isArray(orgUsersCache) ? orgUsersCache : [];
    const _userOptLabel = (u) => {
        const name = (u?.name || u?.profile?.display_name || '').toString().trim();
        const uname = (u?.username || '').toString().trim();
        const email = (u?.email || '').toString().trim();
        const idShort = (u?.id ? String(u.id).slice(0, 8) : '');
        let left = name || uname || email || 'User';
        if (uname && left !== uname) left += ` — ${uname}`;
        if (email && left !== email && !left.includes(email)) left += ` — ${email}`;
        if (idShort) left += ` — ${idShort}`;
        return left;
    };

    const defaultRoleId = roles.find(r => String(r.id) === 'role_user')?.id || roles.find(r => (r.name || '').toLowerCase() === 'user')?.id || 'role_user';
    const jobTitleOptions = (orgJobTitles || []).map(t => `<option value="${escHtml(t)}"></option>`).join('');

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]';
    modal.id = 'create-user-modal';
    modal.innerHTML = `
        <div class="modal-content-box rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 class="font-bold text-lg">➕ Create User</h3>
                <button onclick="document.getElementById('create-user-modal').remove()" class="p-2 hover:bg-gray-700 rounded-lg">✕</button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto" style="max-height: calc(90vh - 140px);">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">First Name *</label>
                        <input type="text" id="cu-first" class="w-full input-field rounded-lg px-4 py-2" placeholder="First name">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Last Name *</label>
                        <input type="text" id="cu-last" class="w-full input-field rounded-lg px-4 py-2" placeholder="Last name">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Email *</label>
                        <input type="email" id="cu-email" class="w-full input-field rounded-lg px-4 py-2" placeholder="user@company.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Employee ID</label>
                        <input type="text" id="cu-emp" class="w-full input-field rounded-lg px-4 py-2" placeholder="e.g., EMP-001">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Username *</label>
                        <input type="text" id="cu-username" class="w-full input-field rounded-lg px-4 py-2" placeholder="e.g., john.doe">
                        <div class="text-xs text-gray-500 mt-1">Used for sign-in. Do not use an email address.</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Phone (optional)</label>
                        <input type="text" id="cu-phone" class="w-full input-field rounded-lg px-4 py-2" placeholder="+1 555 000 0000">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Job Title</label>
                        <input type="text" id="cu-title" class="w-full input-field rounded-lg px-4 py-2" placeholder="e.g., Senior Analyst" list="cu-job-titles">
                        <datalist id="cu-job-titles">${jobTitleOptions}</datalist>
                    </div>
                    <div></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Department</label>
                        <select id="cu-dept" class="w-full input-field rounded-lg px-4 py-2">
                            <option value="">— No Department —</option>
                            ${depts.map(d => `<option value="${d.id}" ${preset.department_id === d.id ? 'selected' : ''}>${escHtml(d.name || '')}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Direct Manager</label>
                        <select id="cu-mgr" class="w-full input-field rounded-lg px-4 py-2">
                            <option value="">— No Manager —</option>
                            ${users.map(u => `<option value="${u.id}" ${preset.manager_id === u.id ? 'selected' : ''}>${escHtml(_userOptLabel(u))}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Roles</label>
                        <div class="max-h-40 overflow-y-auto rounded-lg border border-gray-700 p-2 space-y-1 bg-gray-900/30">
                            ${roles.map(r => `
                                <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer text-sm">
                                    <input type="checkbox" class="cu-role accent-purple-500" value="${escHtml(r.id)}" ${String(r.id) === String(defaultRoleId) ? 'checked' : ''}>
                                    <span>${escHtml(r.name || r.id)}</span>
                                </label>
                            `).join('') || '<div class="text-sm text-gray-500 p-2">No roles available.</div>'}
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Groups</label>
                        <div class="max-h-40 overflow-y-auto rounded-lg border border-gray-700 p-2 space-y-1 bg-gray-900/30">
                            ${groups.map(g => `
                                <label class="flex items-center gap-2 p-2 rounded hover:bg-gray-800 cursor-pointer text-sm">
                                    <input type="checkbox" class="cu-group accent-purple-500" value="${escHtml(g.id)}">
                                    <span>${escHtml(g.name || g.id)}</span>
                                </label>
                            `).join('') || '<div class="text-sm text-gray-500 p-2">No groups yet.</div>'}
                        </div>
                    </div>
                </div>

                <div class="card rounded-xl p-4 bg-gray-900/30 border border-gray-800/60">
                    <div class="flex items-start gap-3">
                        <input type="checkbox" id="cu-invite" class="accent-purple-500 w-5 h-5 mt-0.5" checked onchange="document.getElementById('cu-pass-wrap').classList.toggle('hidden', this.checked)">
                        <div class="min-w-0">
                            <div class="font-medium">Send sign-in email</div>
                            <div class="text-xs text-gray-500">When enabled, the user gets an email to start. When disabled, you\u2019ll receive a temporary password to share securely.</div>
                        </div>
                    </div>
                    <div id="cu-pass-wrap" class="hidden mt-3">
                        <label class="block text-sm font-medium mb-2">Temporary Password (optional)</label>
                        <input type="text" id="cu-pass" class="w-full input-field rounded-lg px-4 py-2" placeholder="Leave empty to auto-generate">
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-gray-700 flex justify-end gap-3">
                <button onclick="document.getElementById('create-user-modal').remove()" class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
                <button onclick="createUserFromModal()" class="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">Create</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function createUserFromModal() {
    const email = (document.getElementById('cu-email')?.value || '').trim();
    const username = (document.getElementById('cu-username')?.value || '').trim();
    const first_name = (document.getElementById('cu-first')?.value || '').trim();
    const last_name = (document.getElementById('cu-last')?.value || '').trim();
    const employee_id = (document.getElementById('cu-emp')?.value || '').trim() || null;
    const job_title = (document.getElementById('cu-title')?.value || '').trim() || null;
    const phone = (document.getElementById('cu-phone')?.value || '').trim() || null;
    const department_id = document.getElementById('cu-dept')?.value || null;
    const manager_id = document.getElementById('cu-mgr')?.value || null;
    const send_invitation = !!document.getElementById('cu-invite')?.checked;
    const password = !send_invitation ? ((document.getElementById('cu-pass')?.value || '').trim() || null) : null;
    const role_ids = Array.from(document.querySelectorAll('.cu-role:checked')).map(el => el.value).filter(Boolean);
    const group_ids = Array.from(document.querySelectorAll('.cu-group:checked')).map(el => el.value).filter(Boolean);

    if (!email || !username || !first_name || !last_name) {
        showToast('Please fill in name, username, and email', 'error');
        return;
    }
    if (role_ids.length === 0) role_ids.push('role_user');

    try {
        const res = await fetch('/api/security/users', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username, email, first_name, last_name,
                phone, job_title, employee_id, manager_id,
                department_id, role_ids, group_ids,
                send_invitation,
                password
            })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast('User created successfully', 'success');
            document.getElementById('create-user-modal')?.remove();
            try { loadSecurityUsers(); loadSecurityStats(); } catch (e) { /* silent */ }
            try { await loadOrgUsers(); renderOrgPeopleTable(); renderOrgDeptSidebar(); } catch (e) { /* silent */ }
            if (data.temp_password) {
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
        } else {
            showToast(data.detail || 'Failed to create user', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// ============================================================
// GROUP MANAGEMENT
// ============================================================

let allGroups = [];
let groupSelectedMembers = [];

async function loadGroups() {
    try {
        const res = await fetch('/api/security/groups', {
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            const data = await res.json();
            // Handle both {groups: [...]} and [...] response format
            allGroups = Array.isArray(data) ? data : (data.groups || []);
            renderGroups();
        } else {
            // If groups API not available, show empty state
            allGroups = [];
            renderGroups();
        }
    } catch (e) {
        console.log('Groups API not available:', e);
        allGroups = [];
        renderGroups();
    }
}

function renderGroups() {
    const container = document.getElementById('sec-groups-grid');
    
    if (allGroups.length === 0) {
        container.innerHTML = `
            <div class="card rounded-xl p-8 text-center col-span-full">
                <div class="text-4xl mb-3">👥</div>
                <h4 class="font-semibold mb-2">No Groups Yet</h4>
                <p class="text-gray-400 text-sm mb-4">Create groups to organize users and simplify access management</p>
                <button onclick="showAddGroupModal()" class="btn-primary px-4 py-2 rounded-lg">+ Create First Group</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allGroups.map(g => `
        <div class="card rounded-xl p-4">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">👥</div>
                    <div>
                        <h4 class="font-semibold">${g.name}</h4>
                        <p class="text-xs text-gray-400">${(g.member_ids || g.user_ids || []).length} members</p>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button onclick="editGroup('${g.id}')" class="p-1 hover:bg-gray-700 rounded" title="Edit">✏️</button>
                    <button onclick="deleteGroup('${g.id}')" class="p-1 hover:bg-gray-700 rounded text-red-400" title="Delete">🗑️</button>
                </div>
            </div>
            <p class="text-sm text-gray-400 line-clamp-2">${g.description || 'No description'}</p>
        </div>
    `).join('');
}

function showAddGroupModal() {
    ensureModalInBody('add-group-modal');
    groupSelectedMembers = [];
    document.getElementById('group-name').value = '';
    document.getElementById('group-description').value = '';
    document.getElementById('group-selected-members').innerHTML = '';
    document.getElementById('add-group-modal').classList.remove('hidden');
    document.getElementById('add-group-modal').classList.add('flex');
}

function closeAddGroupModal() {
    document.getElementById('add-group-modal').classList.add('hidden');
    document.getElementById('add-group-modal').classList.remove('flex');
}

async function searchGroupMembers(query) {
    const resultsEl = document.getElementById('group-member-results');
    
    if (!query || query.length < 2) {
        resultsEl.classList.add('hidden');
        return;
    }
    
    try {
        const res = await fetch('/api/security/users', { headers: getAuthHeaders() });
        if (!res.ok) {
            console.error('Failed to fetch users:', res.status);
            return;
        }
        
        const data = await res.json();
        // Handle both array and {users: [...]} response formats
        const users = Array.isArray(data) ? data : (data.users || []);
        
        const filtered = users.filter(u => 
            (u.email?.toLowerCase().includes(query.toLowerCase()) ||
             u.first_name?.toLowerCase().includes(query.toLowerCase()) ||
             u.last_name?.toLowerCase().includes(query.toLowerCase())) &&
            !groupSelectedMembers.find(m => m.id === u.id)
        ).slice(0, 5);
        
        if (filtered.length === 0) {
            resultsEl.innerHTML = '<div class="p-3 text-gray-500 text-sm">No users found</div>';
        } else {
            resultsEl.innerHTML = filtered.map(u => `
                <div onclick="addGroupMember('${u.id}', '${(u.first_name || '').replace(/'/g, "\\'")} ${(u.last_name || '').replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')" 
                     class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">👤</span>
                        <div>
                            <div class="font-medium">${u.first_name || ''} ${u.last_name || ''}</div>
                            <div class="text-xs text-gray-400">${u.email}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        resultsEl.classList.remove('hidden');
    } catch (e) {
        console.error('Error searching members:', e);
    }
}

function addGroupMember(id, name, email) {
    if (groupSelectedMembers.find(m => m.id === id)) return;
    
    groupSelectedMembers.push({ id, name: name.trim() || email, email });
    renderGroupSelectedMembers();
    
    document.getElementById('group-member-search').value = '';
    document.getElementById('group-member-results').classList.add('hidden');
}

function removeGroupMember(id) {
    groupSelectedMembers = groupSelectedMembers.filter(m => m.id !== id);
    renderGroupSelectedMembers();
}

function renderGroupSelectedMembers() {
    const container = document.getElementById('group-selected-members');
    
    if (groupSelectedMembers.length === 0) {
        container.innerHTML = '<span class="text-gray-500 text-sm italic">No members added yet</span>';
        return;
    }
    
    container.innerHTML = groupSelectedMembers.map(m => `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-sm">
            👤 ${m.name}
            <button onclick="removeGroupMember('${m.id}')" class="hover:text-red-400">✕</button>
        </span>
    `).join('');
}

async function saveGroup() {
    const name = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-description').value.trim();
    
    if (!name) {
        showToast('Please enter a group name', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/security/groups', {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description,
                member_ids: groupSelectedMembers.map(m => m.id)
            })
        });
        
        if (res.ok) {
            showToast('Group created successfully!', 'success');
            closeAddGroupModal();
            loadGroups();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Failed to create group', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function deleteGroup(id) {
    if (!(await uiConfirm('Remove this group?', { title: 'Remove group', confirmText: 'Remove', cancelText: 'Cancel', danger: true }))) return;
    
    try {
        const res = await fetch('/api/security/groups/' + id, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (res.ok) {
            showToast('Group deleted', 'success');
            loadGroups();
        } else {
            showToast('Failed to delete group', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

let editGroupMembers = [];

async function editGroup(id) {
    const group = allGroups.find(g => g.id === id);
    if (!group) {
        showToast('Group not found', 'error');
        return;
    }
    
    // Get current member details
    editGroupMembers = [];
    const memberIds = group.member_ids || group.user_ids || [];
    
    // Fetch user details for current members
    try {
        const res = await fetch('/api/security/users', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const users = Array.isArray(data) ? data : (data.users || []);
            editGroupMembers = memberIds.map(mid => {
                const user = users.find(u => u.id === mid);
                return user ? {
                    id: user.id,
                    name: `${user.profile?.first_name || ''} ${user.profile?.last_name || ''}`.trim() || user.email,
                    email: user.email
                } : { id: mid, name: 'Unknown User', email: '' };
            });
        }
    } catch (e) {
        console.error('Error loading members:', e);
    }
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.id = 'edit-group-modal';
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="modal-content-box rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 class="font-bold text-lg">✏️ Edit Group: ${group.name}</h3>
                <button onclick="document.getElementById('edit-group-modal').remove()" class="p-2 hover:bg-gray-700 rounded-lg">✕</button>
            </div>
            <div class="p-6 space-y-4 overflow-y-auto" style="max-height: calc(90vh - 140px);">
                <div>
                    <label class="block text-sm font-medium mb-2">Group Name *</label>
                    <input type="text" id="edit-group-name" class="w-full input-field rounded-lg px-4 py-2" value="${group.name || ''}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Description</label>
                    <textarea id="edit-group-description" class="w-full input-field rounded-lg px-4 py-2 h-20">${group.description || ''}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Add Members</label>
                    <input type="text" id="edit-group-member-search" class="w-full input-field rounded-lg px-4 py-2 mb-2" placeholder="🔍 Search users to add..." oninput="searchEditGroupMembers(this.value)">
                    <div id="edit-group-member-results" class="hidden max-h-32 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800"></div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Current Members (${editGroupMembers.length})</label>
                    <div id="edit-group-selected-members" class="flex flex-wrap gap-2">
                        ${renderEditGroupMembers()}
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-gray-700 flex justify-end gap-3">
                <button onclick="document.getElementById('edit-group-modal').remove()" class="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600">Cancel</button>
                <button onclick="updateGroup('${id}')" class="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700">Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function renderEditGroupMembers() {
    if (editGroupMembers.length === 0) {
        return '<span class="text-gray-500 text-sm italic">No members yet</span>';
    }
    return editGroupMembers.map(m => `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-sm">
            👤 ${m.name}
            <button onclick="removeEditGroupMember('${m.id}')" class="hover:text-red-400">✕</button>
        </span>
    `).join('');
}

function updateEditGroupMembersUI() {
    const container = document.getElementById('edit-group-selected-members');
    if (container) {
        container.innerHTML = renderEditGroupMembers();
    }
}

async function searchEditGroupMembers(query) {
    const resultsEl = document.getElementById('edit-group-member-results');
    
    if (!query || query.length < 2) {
        resultsEl.classList.add('hidden');
        return;
    }
    
    try {
        const res = await fetch('/api/security/users', { headers: getAuthHeaders() });
        if (!res.ok) return;
        
        const data = await res.json();
        const users = Array.isArray(data) ? data : (data.users || []);
        
        const filtered = users.filter(u => 
            (u.email?.toLowerCase().includes(query.toLowerCase()) ||
             u.profile?.first_name?.toLowerCase().includes(query.toLowerCase()) ||
             u.profile?.last_name?.toLowerCase().includes(query.toLowerCase())) &&
            !editGroupMembers.find(m => m.id === u.id)
        ).slice(0, 5);
        
        if (filtered.length === 0) {
            resultsEl.innerHTML = '<div class="p-3 text-gray-500 text-sm">No users found</div>';
        } else {
            resultsEl.innerHTML = filtered.map(u => `
                <div onclick="addEditGroupMember('${u.id}', '${(u.profile?.first_name || '').replace(/'/g, "\\'")} ${(u.profile?.last_name || '').replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')" 
                     class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">👤</span>
                        <div>
                            <div class="font-medium">${u.profile?.first_name || ''} ${u.profile?.last_name || ''}</div>
                            <div class="text-xs text-gray-400">${u.email}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        resultsEl.classList.remove('hidden');
    } catch (e) {
        console.error('Error searching members:', e);
    }
}

function addEditGroupMember(id, name, email) {
    if (editGroupMembers.find(m => m.id === id)) return;
    
    editGroupMembers.push({ id, name: name.trim() || email, email });
    updateEditGroupMembersUI();
    
    document.getElementById('edit-group-member-search').value = '';
    document.getElementById('edit-group-member-results').classList.add('hidden');
}

function removeEditGroupMember(id) {
    editGroupMembers = editGroupMembers.filter(m => m.id !== id);
    updateEditGroupMembersUI();
}

async function updateGroup(id) {
    const name = document.getElementById('edit-group-name').value.trim();
    const description = document.getElementById('edit-group-description').value.trim();
    const memberIds = editGroupMembers.map(m => m.id);
    
    if (!name) {
        showToast('Group name is required', 'error');
        return;
    }
    
    try {
        const res = await fetch('/api/security/groups/' + id, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description, member_ids: memberIds })
        });
        
        if (res.ok) {
            showToast('Group updated successfully!', 'success');
            document.getElementById('edit-group-modal').remove();
            loadGroups();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Failed to update group', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// ============================================================
// END GROUP MANAGEMENT
// ============================================================

// ============================================================
// ORGANIZATION TAB (People & Departments, Org Chart, Settings)
// ============================================================
let orgDepartments = [];
let orgUsersCache = [];
let orgJobTitles = [];

async function loadOrgTab() {
    await Promise.all([loadOrgDepartments(), loadOrgUsers(), loadOrgJobTitles()]);
    renderOrgDeptSidebar();
    renderOrgPeopleTable();
}

function switchOrgSubTab(sub) {
    const subs = ['people', 'orgchart', 'settings'];
    subs.forEach(s => {
        const el = document.getElementById('org-content-' + s);
        if (el) el.classList.toggle('hidden', s !== sub);
        const btn = document.getElementById('org-sub-' + s);
        if (btn) {
            btn.classList.toggle('bg-purple-600/20', s === sub);
            btn.classList.toggle('text-purple-400', s === sub);
            btn.classList.toggle('hover:bg-gray-700', s !== sub);
        }
    });
    if (sub === 'people') { renderOrgDeptSidebar(); renderOrgPeopleTable(); }
    if (sub === 'orgchart') renderOrgChart();
    if (sub === 'settings') { loadDirectoryConfig(); loadOrgProfileFieldsSchema(); loadOrgJobTitles(); }
}

// --- Profile Fields (Global Schema) ---
let orgProfileFieldsSchema = [];

async function loadOrgProfileFieldsSchema() {
    const container = document.getElementById('org-profilefields-list');
    if (container) container.innerHTML = '<div class="text-sm text-gray-500">Loading...</div>';
    try {
        const res = await fetch('/api/identity/profile-fields', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            orgProfileFieldsSchema = Array.isArray(data?.fields) ? data.fields : [];
        } else {
            // Don't wipe unsaved edits on transient API errors
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to load profile fields', 'error');
        }
    } catch (e) {
        console.log('Profile fields schema:', e);
        // Don't wipe unsaved edits on transient errors
        showToast('Error loading profile fields: ' + e.message, 'error');
    }
    renderOrgProfileFieldsSchema();
}

function renderOrgProfileFieldsSchema() {
    const container = document.getElementById('org-profilefields-list');
    if (!container) return;
    if (!orgProfileFieldsSchema.length) {
        container.innerHTML = '<div class="text-sm text-gray-500">No global profile fields defined yet.</div>';
        return;
    }
    container.innerHTML = orgProfileFieldsSchema.map((f, idx) => {
        const t = (f.type || 'string');
        const opts = Array.isArray(f.options) ? f.options : [];
        const optsText = opts.join('\n');
        return `
        <div class="org-pf-row border border-gray-800/60 rounded-xl p-3 bg-gray-900/30 space-y-2">
            <div class="flex gap-2 items-center w-full">
                <input class="input-field px-3 py-2 rounded-lg text-sm flex-1 min-w-0 org-pf-key" placeholder="key (snake_case)" value="${escHtml(f.key || '')}">
                <input class="input-field px-3 py-2 rounded-lg text-sm flex-1 min-w-0 org-pf-label" placeholder="Label" value="${escHtml(f.label || '')}">
                <select class="input-field px-3 py-2 rounded-lg text-sm org-pf-type" onchange="toggleOrgProfileFieldOptions(this)">
                    ${['string','number','boolean','array','object','select'].map(tt => `<option value="${tt}" ${((t||'string')===tt)?'selected':''}>${tt}</option>`).join('')}
                </select>
                <label class="text-xs text-gray-400 flex items-center gap-2">
                    <input type="checkbox" class="accent-purple-500 org-pf-required" ${f.required ? 'checked' : ''}>
                    Required
                </label>
                <button onclick="removeOrgProfileFieldRow(${idx})" class="text-red-400 hover:text-red-300 px-2" title="Remove">✕</button>
            </div>
            <div>
                <input class="input-field px-3 py-2 rounded-lg text-sm w-full org-pf-desc" placeholder="Description (optional)" value="${escHtml(f.description || '')}">
            </div>
            <div class="org-pf-options-wrap" style="${t === 'select' ? '' : 'display:none;'}">
                <label class="block text-xs text-gray-400 mb-1">Allowed values (optional)</label>
                <textarea class="input-field px-3 py-2 rounded-lg text-sm w-full org-pf-options" rows="3" placeholder="One value per line">${escHtml(optsText)}</textarea>
                <div class="text-[11px] text-gray-500 mt-1">These values will appear as a pick-list in workflows and decision rules.</div>
            </div>
        </div>
        `;
    }).join('');
}

function toggleOrgProfileFieldOptions(typeSelectEl) {
    try {
        const row = typeSelectEl.closest('.org-pf-row');
        if (!row) return;
        const wrap = row.querySelector('.org-pf-options-wrap');
        if (!wrap) return;
        wrap.style.display = (String(typeSelectEl.value || '').toLowerCase() === 'select') ? '' : 'none';
    } catch (e) { /* silent */ }
}

function addOrgProfileFieldRow() {
    // Preserve any unsaved edits before adding a new row
    orgProfileFieldsSchema = collectOrgProfileFieldsSchemaFromUI();
    orgProfileFieldsSchema.push({ key: '', label: '', type: 'string', description: '', required: false, options: [] });
    renderOrgProfileFieldsSchema();
}

function removeOrgProfileFieldRow(idx) {
    // Preserve any unsaved edits before removing
    orgProfileFieldsSchema = collectOrgProfileFieldsSchemaFromUI();
    orgProfileFieldsSchema = (orgProfileFieldsSchema || []).filter((_, i) => i !== idx);
    renderOrgProfileFieldsSchema();
}

function collectOrgProfileFieldsSchemaFromUI() {
    const container = document.getElementById('org-profilefields-list');
    if (!container) return [];
    const rows = Array.from(container.querySelectorAll('.org-pf-row'));
    const defs = [];
    rows.forEach((row, i) => {
        const keyEl = row.querySelector('.org-pf-key');
        const labelEl = row.querySelector('.org-pf-label');
        const typeEl = row.querySelector('.org-pf-type');
        const reqEl = row.querySelector('.org-pf-required');
        const descEl = row.querySelector('.org-pf-desc');
        const optsEl = row.querySelector('.org-pf-options');
        const key = (keyEl?.value || '').trim().replace(/\s+/g, '_').toLowerCase();
        if (!key) return;
        const type = (typeEl?.value || 'string');
        let options = null;
        if (String(type).toLowerCase() === 'select') {
            const raw = (optsEl?.value || '').trim();
            if (raw) {
                const parts = raw.split(/\r?\n|,/g).map(s => (s || '').trim()).filter(Boolean);
                const seen = new Set();
                const cleaned = [];
                parts.forEach(p => {
                    const k = p.toLowerCase();
                    if (seen.has(k)) return;
                    seen.add(k);
                    cleaned.push(p);
                });
                if (cleaned.length) options = cleaned.slice(0, 200);
            }
        }
        defs.push({
            key,
            label: (labelEl?.value || '').trim() || key.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type,
            description: (descEl?.value || '').trim() || null,
            required: !!reqEl?.checked,
            options
        });
    });
    return defs;
}

async function saveOrgProfileFieldsSchema() {
    const defs = collectOrgProfileFieldsSchemaFromUI();
    try {
        const res = await fetch('/api/identity/profile-fields', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: defs })
        });
        if (res.ok) {
            showToast('Global profile fields saved!', 'success');
            const data = await res.json().catch(() => ({}));
            orgProfileFieldsSchema = Array.isArray(data?.fields) ? data.fields : defs;
            renderOrgProfileFieldsSchema();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// --- Job Titles (Org-scoped suggestion library) ---
async function loadOrgJobTitles() {
    try {
        const res = await fetch('/api/identity/job-titles', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            orgJobTitles = Array.isArray(data?.titles) ? data.titles : [];
        } else {
            orgJobTitles = [];
        }
    } catch (e) {
        orgJobTitles = [];
    }
    // Settings textarea (if present)
    const ta = document.getElementById('org-job-titles');
    if (ta) ta.value = (orgJobTitles || []).join('\n');
    _renderJobTitleDatalists();
}

function _renderJobTitleDatalists() {
    try {
        const list = document.getElementById('mgr-job-title-list');
        if (list) {
            list.innerHTML = (orgJobTitles || []).map(t => `<option value="${escHtml(t)}"></option>`).join('');
        }
    } catch (e) { /* silent */ }
}

async function saveOrgJobTitles() {
    const ta = document.getElementById('org-job-titles');
    const raw = (ta?.value || '').split(/\r?\n/g).map(s => (s || '').trim()).filter(Boolean);
    const cleaned = [];
    const seen = new Set();
    raw.forEach(t => {
        const k = t.toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        cleaned.push(t);
    });
    try {
        const res = await fetch('/api/identity/job-titles', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ titles: cleaned })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            orgJobTitles = Array.isArray(data?.titles) ? data.titles : cleaned;
            if (ta) ta.value = (orgJobTitles || []).join('\n');
            _renderJobTitleDatalists();
            showToast('Job titles saved!', 'success');
        } else {
            showToast(data.detail || 'Failed to save job titles', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

async function applyBulkUserCustomAttributes() {
    const txt = document.getElementById('org-bulk-custom-attrs')?.value || '';
    const mode = document.getElementById('org-bulk-custom-attrs-mode')?.value || 'merge';
    let items = [];
    try {
        items = JSON.parse(txt);
        if (!Array.isArray(items)) throw new Error('JSON must be an array');
    } catch (e) {
        showToast('Invalid JSON: ' + e.message, 'error');
        return;
    }
    try {
        const res = await fetch('/api/identity/users/bulk-custom-attributes', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, mode })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            const errs = data.error_count ? ` (${data.error_count} errors)` : '';
            showToast(`Bulk update applied: ${data.success_count} users${errs}`, data.error_count ? 'warning' : 'success');
        } else {
            showToast(data.detail || 'Bulk update failed', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

// --- Departments ---
async function loadOrgDepartments() {
    try {
        const res = await fetch('/api/identity/departments', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            orgDepartments = Array.isArray(data) ? data : (data.departments || []);
        } else {
            orgDepartments = [];
        }
    } catch (e) {
        console.log('Departments API:', e);
        orgDepartments = [];
    }
    renderOrgDeptSidebar();
    if (_selectedDeptId) selectOrgDept(_selectedDeptId);
}

let _selectedDeptId = null;

function selectOrgDept(deptId) {
    _selectedDeptId = deptId;
    // highlight active sidebar item
    document.querySelectorAll('.org-dept-item').forEach(el => {
        el.classList.toggle('org-dept-item--active', el.dataset.deptId === (deptId || '__all'));
    });
    // show/hide department detail header
    const header = document.getElementById('org-dept-detail-header');
    if (header) {
        if (deptId) {
            header.style.display = '';
            const dept = orgDepartments.find(d => d.id === deptId);
            if (dept) {
                document.getElementById('org-dept-detail-name').textContent = dept.name;
                document.getElementById('org-dept-detail-desc').textContent = dept.description || 'No description';
                const headUser = orgUsersCache.find(u => u.id === dept.manager_id);
                document.getElementById('org-dept-detail-head').textContent = headUser ? (headUser.name || headUser.email) : 'Not assigned';
                const memberCount = orgUsersCache.filter(u => u.department_id === deptId).length;
                document.getElementById('org-dept-detail-count').textContent = memberCount;
            }
        } else {
            header.style.display = 'none';
        }
    }
    renderOrgPeopleTable();
}

function renderOrgDeptSidebar() {
    const container = document.getElementById('org-dept-list');
    if (!container) return;
    if (!orgDepartments.length) {
        container.innerHTML = '<div class="text-xs text-gray-500" style="padding:8px 12px;">No departments yet</div>';
        return;
    }
    container.innerHTML = orgDepartments.map(d => {
        const head = orgUsersCache.find(u => u.id === d.manager_id);
        const mc = orgUsersCache.filter(u => u.department_id === d.id).length;
        const active = _selectedDeptId === d.id;
        return `<div class="org-dept-item${active ? ' org-dept-item--active' : ''}" data-dept-id="${d.id}"
                     style="padding:8px 12px;border-radius:8px;margin-bottom:2px;font-size:13px;cursor:pointer;transition:background .15s;display:flex;align-items:center;justify-content:space-between;"
                     onclick="selectOrgDept('${d.id}')">
            <div style="min-width:0;overflow:hidden;">
                <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(d.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${head ? escHtml(head.name || head.email) : '<span style="opacity:.5">No head</span>'} &middot; ${mc} member${mc !== 1 ? 's' : ''}
                </div>
            </div>
        </div>`;
    }).join('');
}

function showCreateDepartmentModal() {
    ensureModalInBody('create-dept-modal');
    document.getElementById('dept-edit-id').value = '';
    document.getElementById('dept-modal-title').textContent = 'Create Department';
    document.getElementById('dept-save-btn').textContent = 'Create';
    document.getElementById('dept-name').value = '';
    document.getElementById('dept-description').value = '';
    // Populate manager dropdown
    const mgrSelect = document.getElementById('dept-manager');
    mgrSelect.innerHTML = '<option value="">-- Not assigned --</option>' +
        orgUsersCache.map(u => `<option value="${u.id}">${escHtml(u.name || u.email)}</option>`).join('');
    const parentSelect = document.getElementById('dept-parent');
    parentSelect.innerHTML = '<option value="">-- Top Level --</option>' +
        orgDepartments.map(d => `<option value="${d.id}">${escHtml(d.name)}</option>`).join('');
    document.getElementById('create-dept-modal').classList.remove('hidden');
    document.getElementById('create-dept-modal').classList.add('flex');
}

function closeDeptModal() {
    document.getElementById('create-dept-modal').classList.add('hidden');
    document.getElementById('create-dept-modal').classList.remove('flex');
}

async function saveDepartment() {
    const editId = document.getElementById('dept-edit-id').value;
    const name = document.getElementById('dept-name').value.trim();
    const description = document.getElementById('dept-description').value.trim();
    const managerId = document.getElementById('dept-manager').value || null;
    const parentId = document.getElementById('dept-parent').value || null;
    if (!name) { showToast('Department name is required', 'error'); return; }
    try {
        const url = editId ? `/api/identity/departments/${editId}` : '/api/identity/departments';
        const method = editId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method, headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, manager_id: managerId, parent_id: parentId })
        });
        if (res.ok) {
            showToast(editId ? 'Department updated' : 'Department created', 'success');
            closeDeptModal();
            await loadOrgDepartments();
            renderOrgPeopleTable();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save department', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function editDepartment(id) {
    const dept = orgDepartments.find(d => d.id === id);
    if (!dept) return;
    showCreateDepartmentModal();
    document.getElementById('dept-edit-id').value = id;
    document.getElementById('dept-modal-title').textContent = 'Edit Department';
    document.getElementById('dept-save-btn').textContent = 'Save';
    document.getElementById('dept-name').value = dept.name || '';
    document.getElementById('dept-description').value = dept.description || '';
    const mgrSelect = document.getElementById('dept-manager');
    if (dept.manager_id && ![...mgrSelect.options].some(o => o.value === dept.manager_id)) {
        const headUser = orgUsersCache.find(u => u.id === dept.manager_id);
        if (headUser) {
            const opt = document.createElement('option');
            opt.value = dept.manager_id;
            opt.textContent = headUser.name || headUser.email;
            mgrSelect.appendChild(opt);
        }
    }
    mgrSelect.value = dept.manager_id || '';
    document.getElementById('dept-parent').value = dept.parent_id || '';
}

async function deleteDepartment(id) {
    if (!(await uiConfirm('This department will be permanently removed. Members will not be deleted but will no longer belong to a department.', { title: 'Delete Department', confirmText: 'Delete', cancelText: 'Cancel', danger: true }))) return;
    try {
        const res = await fetch(`/api/identity/departments/${id}`, {
            method: 'DELETE', headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('Department deleted', 'success');
            if (_selectedDeptId === id) selectOrgDept(null);
            await loadOrgDepartments();
            renderOrgPeopleTable();
        } else {
            showToast('Failed to delete department', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// --- People Table (Department Members) ---
async function loadOrgUsers() {
    try {
        const res = await fetch('/api/security/users', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const raw = Array.isArray(data) ? data : (data.users || []);
            orgUsersCache = raw.map(u => ({
                id: u.id,
                name: u.name || ((u.profile?.first_name || '') + ' ' + (u.profile?.last_name || '')).trim() || u.email,
                email: u.email,
                manager_id: u.manager_id || null,
                employee_id: u.employee_id || null,
                department_id: u.department_id || null,
                job_title: u.job_title || u.profile?.job_title || ''
            }));
        }
    } catch (e) { console.log('Failed to load users for org:', e); }
}

function renderOrgPeopleTable() {
    const tbody = document.getElementById('org-manager-table');
    if (!tbody) return;
    const filter = (document.getElementById('org-manager-search')?.value || '').toLowerCase();
    let users = orgUsersCache;
    if (_selectedDeptId) {
        users = users.filter(u => u.department_id === _selectedDeptId);
    }
    if (filter) {
        users = users.filter(u =>
            u.name.toLowerCase().includes(filter) ||
            u.email.toLowerCase().includes(filter) ||
            (u.employee_id || '').toLowerCase().includes(filter)
        );
    }
    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500">${_selectedDeptId ? 'No members in this department' : 'No users found'}</td></tr>`;
        return;
    }
    tbody.innerHTML = users.map(u => {
        const mgr = u.manager_id ? orgUsersCache.find(m => m.id === u.manager_id) : null;
        const dept = u.department_id ? orgDepartments.find(d => d.id === u.department_id) : null;
        return `
        <tr class="border-t border-gray-700 hover:bg-gray-800/50">
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-xs">${(u.name || u.email)[0].toUpperCase()}</div>
                    <div>
                        <div class="font-medium text-sm">${escHtml(u.name)}</div>
                        <div class="text-xs text-gray-400">${escHtml(u.email)}</div>
                    </div>
                </div>
            </td>
            <td class="p-3 text-sm">${u.employee_id ? `<span class="px-2 py-0.5 bg-gray-700 rounded text-xs">${escHtml(u.employee_id)}</span>` : '<span class="text-gray-500 text-xs">—</span>'}</td>
            <td class="p-3 text-sm">${u.job_title ? `<span class="text-xs text-gray-200">${escHtml(u.job_title)}</span>` : '<span class="text-gray-500 text-xs">—</span>'}</td>
            <td class="p-3 text-sm">${dept ? `<span class="text-purple-400 text-xs cursor-pointer" onclick="selectOrgDept('${dept.id}')">${escHtml(dept.name)}</span>` : '<span class="text-gray-500 text-xs">—</span>'}</td>
            <td class="p-3 text-sm">${mgr ? `<span class="text-blue-400 text-xs">${escHtml(mgr.name)}</span>` : '<span class="text-gray-500 text-xs">Not assigned</span>'}</td>
            <td class="p-3">
                <button onclick="openManagerModal('${u.id}')" class="text-purple-400 hover:text-purple-300 text-sm">Edit</button>
            </td>
        </tr>`;
    }).join('');
}

function openManagerModal(userId) {
    const user = orgUsersCache.find(u => u.id === userId);
    if (!user) return;
    ensureModalInBody('assign-manager-modal');
    document.getElementById('mgr-user-id').value = userId;
    document.getElementById('mgr-user-name').textContent = user.name || user.email;
    document.getElementById('mgr-employee-id').value = user.employee_id || '';
    const jtEl = document.getElementById('mgr-job-title');
    if (jtEl) jtEl.value = user.job_title || '';
    _renderJobTitleDatalists();
    const deptSelect = document.getElementById('mgr-dept-select');
    if (deptSelect) {
        deptSelect.innerHTML = '<option value="">— No Department —</option>' +
            (orgDepartments || []).map(d =>
                `<option value="${d.id}" ${d.id === user.department_id ? 'selected' : ''}>${escHtml(d.name || d.id)}</option>`
            ).join('');
    }
    const mgrSelect = document.getElementById('mgr-select');
    mgrSelect.innerHTML = '<option value="">— No Manager —</option>' +
        orgUsersCache.filter(u => u.id !== userId).map(u =>
            `<option value="${u.id}" ${u.id === user.manager_id ? 'selected' : ''}>${escHtml(u.name || u.email)}</option>`
        ).join('');
    document.getElementById('assign-manager-modal').classList.remove('hidden');
    document.getElementById('assign-manager-modal').classList.add('flex');
}

function closeManagerModal() {
    document.getElementById('assign-manager-modal').classList.add('hidden');
    document.getElementById('assign-manager-modal').classList.remove('flex');
}

async function saveManagerAssignment() {
    const userId = document.getElementById('mgr-user-id').value;
    const managerId = document.getElementById('mgr-select').value || null;
    const employeeId = document.getElementById('mgr-employee-id').value.trim() || null;
    const departmentId = document.getElementById('mgr-dept-select')?.value || null;
    const jobTitle = (document.getElementById('mgr-job-title')?.value || '').trim() || null;
    try {
        // Save manager
        const mgrRes = await fetch(`/api/identity/users/${userId}/manager`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ manager_id: managerId })
        });
        // Save employee ID
        if (employeeId !== null) {
            await fetch(`/api/identity/users/${userId}/employee-id`, {
                method: 'PUT',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId })
            });
        }
        // Save department
        await fetch(`/api/identity/users/${userId}/department`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ department_id: departmentId })
        });
        // Save job title (security user profile)
        await fetch(`/api/security/users/${userId}`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_title: jobTitle })
        });
        if (mgrRes.ok) {
            showToast('Saved successfully', 'success');
            const idx = orgUsersCache.findIndex(u => u.id === userId);
            if (idx >= 0) {
                orgUsersCache[idx].manager_id = managerId;
                orgUsersCache[idx].employee_id = employeeId;
                orgUsersCache[idx].department_id = departmentId;
                orgUsersCache[idx].job_title = jobTitle || '';
            }
            renderOrgPeopleTable();
            renderOrgDeptSidebar();
            if (_selectedDeptId) selectOrgDept(_selectedDeptId);
            closeManagerModal();
        } else {
            const data = await mgrRes.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// --- Org Chart ---
let _ocView = { panX: 0, panY: 0, scale: 1 };
let _ocDraft = {}; // user_id -> {manager_id, department_id, job_title, employee_id}
let _ocDrag = { active: false, user_id: null, pointerId: null, startX: 0, startY: 0, ghost: null, overEl: null };

function renderOrgChart() {
    const container = document.getElementById('org-chart-tree');
    if (!container) return;

    if (!Array.isArray(orgUsersCache) || orgUsersCache.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <div class="text-5xl mb-3">🏛️</div>
                <p class="text-gray-300 font-medium">No people found yet</p>
                <p class="text-gray-500 text-sm mt-1">Create users and connect reporting lines to build your organization chart.</p>
                <button class="btn-primary px-5 py-2 rounded-lg mt-4" onclick="showCreateUserModal()">+ Create User</button>
            </div>`;
        return;
    }

    const depts = Array.isArray(orgDepartments) ? orgDepartments : [];
    const draftCount = Object.keys(_ocDraft || {}).length;
    const canSave = draftCount > 0;

    container.innerHTML = `
        <div class="oc-shell">
            <div class="oc-toolbar">
                <div class="oc-toolbar-left">
                    <div class="oc-title">Organization Chart Builder</div>
                    <div class="oc-hint">Drag a person onto another to set their manager. Drop onto a department to move them. Double-click a card to edit details.</div>
                </div>
                <div class="oc-toolbar-right">
                    <input id="oc-search" class="input-field oc-search" placeholder="Search people..." oninput="_ocRender()">
                    <button class="btn-secondary oc-btn" onclick="_ocResetView()">Reset view</button>
                    <button class="btn-secondary oc-btn" onclick="_ocDiscardDraft()" ${canSave ? '' : 'disabled'}>Discard</button>
                    <button class="btn-primary oc-btn" onclick="_ocSaveDraft()" ${canSave ? '' : 'disabled'}>Save changes${draftCount ? ` (${draftCount})` : ''}</button>
                </div>
            </div>
            <div class="oc-body">
                <div class="oc-side">
                    <div class="oc-drop-top oc-dropzone" data-drop="top">Drop here to make top-level</div>
                    <div class="oc-side-head">
                        <div class="oc-side-title">Departments</div>
                        <button class="text-purple-400 hover:text-purple-300 text-xs font-medium" onclick="showCreateDepartmentModal()">+ New</button>
                    </div>
                    <div class="oc-dept-list">
                        ${depts.map(d => `
                            <div class="oc-dept-drop" data-dept-id="${escHtml(d.id)}">
                                <div class="oc-dept-name">${escHtml(d.name || 'Department')}</div>
                                <div class="oc-dept-meta">${(orgUsersCache || []).filter(u => u.department_id === d.id).length} member(s)</div>
                            </div>
                        `).join('') || `<div class="text-xs text-gray-500">No departments yet</div>`}
                    </div>
                    <div class="oc-side-footer">
                        <button class="btn-secondary w-full px-3 py-2 rounded-lg" onclick="showCreateUserModal()">+ Create User</button>
                    </div>
                </div>
                <div class="oc-viewport" id="oc-viewport">
                    <div class="oc-world" id="oc-world">
                        <svg class="oc-lines" id="oc-lines"></svg>
                        <div class="oc-nodes" id="oc-nodes"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    _ocBindViewport();
    _ocRender();
}

function _ocEffectiveUser(u) {
    const d = (_ocDraft || {})[u.id];
    if (!d) return u;
    return {
        ...u,
        manager_id: (d.manager_id !== undefined) ? d.manager_id : u.manager_id,
        department_id: (d.department_id !== undefined) ? d.department_id : u.department_id,
        employee_id: (d.employee_id !== undefined) ? d.employee_id : u.employee_id,
        job_title: (d.job_title !== undefined) ? d.job_title : u.job_title,
    };
}

function _ocBuildGraph(users) {
    const byId = {};
    users.forEach(u => { byId[u.id] = u; });
    const children = {};
    users.forEach(u => {
        const mid = u.manager_id || null;
        if (mid) {
            if (!children[mid]) children[mid] = [];
            children[mid].push(u.id);
        }
    });
    const roots = users
        .filter(u => !u.manager_id || !byId[u.manager_id])
        .map(u => u.id);
    return { byId, children, roots };
}

function _ocLayoutTree(graph) {
    const nodeW = 220, gapX = 34, levelH = 120, nodeH = 78;
    const sizes = {};

    function measure(uid, depth, seen) {
        if (seen.has(uid)) return 1;
        seen.add(uid);
        const kids = graph.children[uid] || [];
        if (kids.length === 0 || depth >= 10) { sizes[uid] = 1; return 1; }
        let sum = 0;
        kids.forEach(k => { sum += measure(k, depth + 1, seen); });
        sizes[uid] = Math.max(1, sum);
        return sizes[uid];
    }

    const seen = new Set();
    graph.roots.forEach(r => measure(r, 0, seen));

    const pos = {};
    function place(uid, xStart, depth) {
        const sw = sizes[uid] || 1;
        const kids = graph.children[uid] || [];
        let cur = xStart;
        kids.forEach(k => {
            const kw = sizes[k] || 1;
            place(k, cur, depth + 1);
            cur += kw;
        });
        pos[uid] = {
            x: (xStart + sw / 2),
            y: depth,
            px: Math.round((xStart + sw / 2 - 0.5) * (nodeW + gapX)),
            py: depth * levelH
        };
    }
    let cursor = 0;
    graph.roots.forEach(r => {
        const w = sizes[r] || 1;
        place(r, cursor, 0);
        cursor += w;
    });

    const totalUnits = Math.max(1, cursor);
    const worldW = totalUnits * (nodeW + gapX);
    const maxDepth = Math.max(0, ...Object.values(pos).map(p => p.y || 0));
    const worldH = (maxDepth + 1) * levelH + nodeH + 80;
    return { pos, worldW, worldH, nodeW, nodeH };
}

function _ocRender() {
    const viewport = document.getElementById('oc-viewport');
    const world = document.getElementById('oc-world');
    const nodesEl = document.getElementById('oc-nodes');
    const linesEl = document.getElementById('oc-lines');
    if (!viewport || !world || !nodesEl || !linesEl) return;

    const q = (document.getElementById('oc-search')?.value || '').toLowerCase().trim();
    const effective = (orgUsersCache || []).map(_ocEffectiveUser);
    const filteredIds = q ? new Set(effective.filter(u => (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.job_title || '').toLowerCase().includes(q)).map(u => u.id)) : null;

    const graph = _ocBuildGraph(effective);
    const layout = _ocLayoutTree(graph);

    world.style.width = layout.worldW + 'px';
    world.style.height = layout.worldH + 'px';
    world.style.transform = `translate(${_ocView.panX}px, ${_ocView.panY}px) scale(${_ocView.scale})`;

    // Nodes
    nodesEl.innerHTML = effective.map(u => {
        if (filteredIds && !filteredIds.has(u.id)) return '';
        const p = layout.pos[u.id];
        if (!p) return '';
        const dept = u.department_id ? (orgDepartments || []).find(d => d.id === u.department_id) : null;
        const subtitle = (u.job_title || (dept ? dept.name : '') || '').trim();
        const badge = (_ocDraft && _ocDraft[u.id]) ? `<span class="oc-badge">Edited</span>` : '';
        return `
            <div class="oc-node" data-user-id="${escHtml(u.id)}" style="left:${p.px}px;top:${p.py}px;">
                <div class="oc-node-card card">
                    <div class="oc-node-top">
                        <div class="oc-avatar">${escHtml((u.name || u.email || '?')[0].toUpperCase())}</div>
                        <div class="oc-node-text">
                            <div class="oc-node-name">${escHtml(u.name || u.email)}</div>
                            <div class="oc-node-sub">${subtitle ? escHtml(subtitle) : '<span class="oc-muted">No title</span>'}</div>
                        </div>
                        ${badge}
                    </div>
                    <div class="oc-node-actions">
                        <button class="oc-link" onclick="openManagerModal('${escHtml(u.id)}')">Edit</button>
                        <button class="oc-link" onclick="showCreateUserModal({ manager_id: '${escHtml(u.id)}', department_id: '${escHtml(u.department_id || '')}' })">+ Report</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Lines (only between visible nodes)
    const nodeVisible = (uid) => {
        if (!filteredIds) return true;
        return filteredIds.has(uid);
    };
    let lines = '';
    effective.forEach(u => {
        const kids = graph.children[u.id] || [];
        kids.forEach(cid => {
            if (!nodeVisible(u.id) || !nodeVisible(cid)) return;
            const a = layout.pos[u.id];
            const b = layout.pos[cid];
            if (!a || !b) return;
            const x1 = a.px + layout.nodeW / 2;
            const y1 = a.py + layout.nodeH;
            const x2 = b.px + layout.nodeW / 2;
            const y2 = b.py;
            lines += `<path class="oc-line" d="M ${x1} ${y1} C ${x1} ${y1 + 30}, ${x2} ${y2 - 30}, ${x2} ${y2}" />`;
        });
    });
    linesEl.setAttribute('width', layout.worldW);
    linesEl.setAttribute('height', layout.worldH);
    linesEl.setAttribute('viewBox', `0 0 ${layout.worldW} ${layout.worldH}`);
    linesEl.innerHTML = lines;

    _ocBindNodeDragging();
}

function _ocBindViewport() {
    const vp = document.getElementById('oc-viewport');
    if (!vp) return;
    if (vp.dataset.bound === '1') return;
    vp.dataset.bound = '1';

    // Pan with background drag
    let panning = false;
    let panStartX = 0, panStartY = 0, panBaseX = 0, panBaseY = 0;
    vp.addEventListener('pointerdown', (e) => {
        if (e.target && e.target.closest && e.target.closest('.oc-node')) return;
        panning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        panBaseX = _ocView.panX; panBaseY = _ocView.panY;
        vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
        if (!panning) return;
        _ocView.panX = panBaseX + (e.clientX - panStartX);
        _ocView.panY = panBaseY + (e.clientY - panStartY);
        const world = document.getElementById('oc-world');
        if (world) world.style.transform = `translate(${_ocView.panX}px, ${_ocView.panY}px) scale(${_ocView.scale})`;
    });
    vp.addEventListener('pointerup', () => { panning = false; });
    vp.addEventListener('pointercancel', () => { panning = false; });

    // Zoom
    vp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY);
        const next = Math.max(0.4, Math.min(1.6, _ocView.scale + (delta > 0 ? -0.08 : 0.08)));
        _ocView.scale = next;
        const world = document.getElementById('oc-world');
        if (world) world.style.transform = `translate(${_ocView.panX}px, ${_ocView.panY}px) scale(${_ocView.scale})`;
    }, { passive: false });
}

function _ocBindNodeDragging() {
    const nodesEl = document.getElementById('oc-nodes');
    if (!nodesEl) return;
    if (nodesEl.dataset.bound === '1') return;
    nodesEl.dataset.bound = '1';

    nodesEl.addEventListener('dblclick', (e) => {
        const node = e.target?.closest?.('.oc-node');
        if (!node) return;
        const uid = node.dataset.userId;
        if (uid) openManagerModal(uid);
    });

    nodesEl.addEventListener('pointerdown', (e) => {
        const node = e.target?.closest?.('.oc-node');
        if (!node) return;
        const uid = node.dataset.userId;
        if (!uid) return;
        _ocDrag.active = true;
        _ocDrag.user_id = uid;
        _ocDrag.pointerId = e.pointerId;
        _ocDrag.startX = e.clientX;
        _ocDrag.startY = e.clientY;

        const ghost = document.createElement('div');
        ghost.className = 'oc-ghost';
        ghost.textContent = 'Moving…';
        document.body.appendChild(ghost);
        _ocDrag.ghost = ghost;
        ghost.style.left = (e.clientX + 12) + 'px';
        ghost.style.top = (e.clientY + 12) + 'px';
        try { node.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        e.preventDefault();
    });

    nodesEl.addEventListener('pointermove', (e) => {
        if (!_ocDrag.active) return;
        if (_ocDrag.pointerId !== e.pointerId) return;
        if (_ocDrag.ghost) {
            _ocDrag.ghost.style.left = (e.clientX + 12) + 'px';
            _ocDrag.ghost.style.top = (e.clientY + 12) + 'px';
        }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const overNode = el?.closest?.('.oc-node');
        const overDept = el?.closest?.('.oc-dept-drop');
        const overTop = el?.closest?.('.oc-drop-top');
        const nextOver = overNode || overDept || overTop;
        if (_ocDrag.overEl && _ocDrag.overEl !== nextOver) _ocDrag.overEl.classList.remove('oc-over');
        _ocDrag.overEl = nextOver;
        if (_ocDrag.overEl) _ocDrag.overEl.classList.add('oc-over');
    });

    const finish = async (e) => {
        if (!_ocDrag.active) return;
        const uid = _ocDrag.user_id;
        const over = _ocDrag.overEl;
        if (over) over.classList.remove('oc-over');
        if (_ocDrag.ghost) _ocDrag.ghost.remove();

        _ocDrag.active = false;
        _ocDrag.user_id = null;
        _ocDrag.pointerId = null;
        _ocDrag.ghost = null;
        _ocDrag.overEl = null;

        if (!uid) return;
        if (!over) return;

        if (over.classList.contains('oc-node')) {
            const targetId = over.dataset.userId;
            if (targetId && targetId !== uid) {
                _ocStage(uid, { manager_id: targetId });
                showToast('Reporting line staged', 'success');
            }
        } else if (over.classList.contains('oc-dept-drop')) {
            const deptId = over.dataset.deptId;
            _ocStage(uid, { department_id: deptId || null });
            showToast('Department change staged', 'success');
        } else if (over.classList.contains('oc-drop-top')) {
            _ocStage(uid, { manager_id: null });
            showToast('Set as top-level (staged)', 'success');
        }
    };

    nodesEl.addEventListener('pointerup', finish);
    nodesEl.addEventListener('pointercancel', finish);
}

function _ocStage(userId, patch) {
    if (!_ocDraft) _ocDraft = {};
    if (!_ocDraft[userId]) _ocDraft[userId] = {};
    _ocDraft[userId] = { ..._ocDraft[userId], ...patch };
    // Remove empty patches
    const cur = _ocDraft[userId];
    const isEmpty = cur && Object.keys(cur).every(k => cur[k] === undefined);
    if (isEmpty) delete _ocDraft[userId];
    // Update toolbar buttons by re-rendering shell (simple + safe)
    renderOrgChart();
}

function _ocDiscardDraft() {
    _ocDraft = {};
    renderOrgChart();
}
window._ocDiscardDraft = _ocDiscardDraft;

async function _ocSaveDraft() {
    const updates = Object.entries(_ocDraft || {}).map(([user_id, patch]) => ({ user_id, ...patch }));
    if (updates.length === 0) return;
    try {
        const res = await fetch('/api/identity/org-chart/bulk-update', {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast(`Saved: ${data.success_count || updates.length} change(s)`, 'success');
            // Refresh people cache from API (source of truth for UI tables)
            await loadOrgUsers();
            _ocDraft = {};
            renderOrgChart();
            renderOrgPeopleTable();
            renderOrgDeptSidebar();
        } else {
            showToast(data.detail || 'Failed to save changes', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}
window._ocSaveDraft = _ocSaveDraft;

function _ocResetView() {
    _ocView = { panX: 0, panY: 0, scale: 1 };
    _ocRender();
}
window._ocResetView = _ocResetView;

// --- Directory Config ---
async function loadDirectoryConfig() {
    try {
        const res = await fetch('/api/identity/directory-config', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('org-directory-source').value = data.directory_source || 'internal';
            if (data.hr_api_config) {
                document.getElementById('org-hr-api-url').value = data.hr_api_config.base_url || '';
                document.getElementById('org-hr-api-auth').value = data.hr_api_config.auth_type || 'bearer';
                document.getElementById('org-hr-api-key').value = data.hr_api_config.api_key || '';
            }
            onDirectorySourceChange();
        }
    } catch (e) { console.log('Directory config:', e); }
}

function onDirectorySourceChange() {
    const source = document.getElementById('org-directory-source').value;
    const hrSection = document.getElementById('org-hr-api-config');
    const desc = document.getElementById('org-directory-desc');
    hrSection.classList.toggle('hidden', source !== 'hr_api' && source !== 'hybrid');
    const descs = {
        internal: 'User hierarchy managed within the platform.',
        ldap: 'Users and hierarchy resolved from LDAP / Active Directory.',
        hr_api: 'Users and hierarchy fetched from an external HR system API.',
        hybrid: 'Internal org chart enriched with external HR system data.'
    };
    desc.textContent = descs[source] || '';
}

async function saveDirectoryConfig() {
    const source = document.getElementById('org-directory-source').value;
    const hrApiConfig = (source === 'hr_api' || source === 'hybrid') ? {
        base_url: document.getElementById('org-hr-api-url').value,
        auth_type: document.getElementById('org-hr-api-auth').value,
        api_key: document.getElementById('org-hr-api-key').value
    } : null;
    try {
        const res = await fetch('/api/identity/directory-config', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory_source: source, hr_api_config: hrApiConfig })
        });
        if (res.ok) {
            showToast('Directory configuration saved!', 'success');
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save configuration', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ============================================================
// IDENTITY SETTINGS (Settings Page - prominent config)
// ============================================================
let selectedIdentitySource = 'internal';

function selectIdentitySource(source) {
    selectedIdentitySource = source;
    // Update visual selection
    document.querySelectorAll('.identity-src-btn').forEach(btn => {
        btn.classList.remove('border-purple-500', 'bg-purple-600/10');
        btn.classList.add('border-transparent');
    });
    const activeBtn = document.getElementById('id-src-' + source);
    if (activeBtn) {
        activeBtn.classList.add('border-purple-500', 'bg-purple-600/10');
        activeBtn.classList.remove('border-transparent');
    }
    // Show/hide config panels
    document.getElementById('settings-id-ldap-info').classList.toggle('hidden', source !== 'ldap');
    document.getElementById('settings-id-hr-config').classList.toggle('hidden', source !== 'hr_api' && source !== 'hybrid');
    document.getElementById('settings-id-internal-info').classList.toggle('hidden', source !== 'internal' && source !== 'hybrid');
}

async function loadIdentitySettings() {
    try {
        const res = await fetch('/api/identity/directory-config', { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const source = data.directory_source || 'internal';
            selectIdentitySource(source);
            // Update status badge
            const badge = document.getElementById('settings-identity-status');
            if (badge) {
                badge.textContent = '✅ Configured';
                badge.className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400';
            }
            // Fill HR API config if present
            if (data.hr_api_config) {
                const cfg = typeof data.hr_api_config === 'string' ? JSON.parse(data.hr_api_config) : data.hr_api_config;
                document.getElementById('settings-hr-api-url').value = cfg.base_url || '';
                document.getElementById('settings-hr-api-auth').value = cfg.auth_type || 'bearer';
                document.getElementById('settings-hr-api-key').value = cfg.api_key || '';
            }
        }
    } catch (e) {
        console.log('Identity settings load:', e);
    }
}

async function saveIdentitySettings() {
    const source = selectedIdentitySource;
    const hrApiConfig = (source === 'hr_api' || source === 'hybrid') ? {
        base_url: document.getElementById('settings-hr-api-url').value,
        auth_type: document.getElementById('settings-hr-api-auth').value,
        api_key: document.getElementById('settings-hr-api-key').value
    } : null;
    try {
        const res = await fetch('/api/identity/directory-config', {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ directory_source: source, hr_api_config: hrApiConfig })
        });
        if (res.ok) {
            showToast('Identity settings saved!', 'success');
            const badge = document.getElementById('settings-identity-status');
            if (badge) {
                badge.textContent = '✅ Configured';
                badge.className = 'px-3 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400';
            }
            const savedEl = document.getElementById('settings-identity-saved');
            if (savedEl) { savedEl.classList.remove('hidden'); setTimeout(() => savedEl.classList.add('hidden'), 3000); }
            // Also sync to org tab if loaded
            const orgSelect = document.getElementById('org-directory-source');
            if (orgSelect) orgSelect.value = source;
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save identity settings', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

