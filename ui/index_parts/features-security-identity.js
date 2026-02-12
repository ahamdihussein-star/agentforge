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
    if (!confirm(`Send verification email to ${email}?`)) return;
    
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
    if (!confirm('Are you sure you want to delete this user?')) return;
    
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
    if (!confirm('Are you sure you want to delete this group?')) return;
    
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
// ORGANIZATION TAB (Departments, Manager Assignment, Org Chart)
// ============================================================
let orgDepartments = [];
let orgUsersCache = [];

async function loadOrgTab() {
    await Promise.all([loadOrgDepartments(), loadOrgUsers()]);
    renderOrgManagerTable();
}

function switchOrgSubTab(sub) {
    const subs = ['departments', 'managers', 'orgchart', 'directory', 'profilefields'];
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
    if (sub === 'orgchart') renderOrgChart();
    if (sub === 'directory') loadDirectoryConfig();
    if (sub === 'profilefields') loadOrgProfileFieldsSchema();
    if (sub === 'managers') renderOrgManagerTable();
    if (sub === 'departments') renderOrgDepartments();
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
    container.innerHTML = orgProfileFieldsSchema.map((f, idx) => `
        <div class="flex gap-2 items-center w-full">
            <input class="input-field px-3 py-2 rounded-lg text-sm flex-1 min-w-0 org-pf-key" placeholder="key (snake_case)" value="${escHtml(f.key || '')}">
            <input class="input-field px-3 py-2 rounded-lg text-sm flex-1 min-w-0 org-pf-label" placeholder="Label" value="${escHtml(f.label || '')}">
            <select class="input-field px-3 py-2 rounded-lg text-sm org-pf-type">
                ${['string','number','boolean','array','object'].map(t => `<option value="${t}" ${((f.type||'string')===t)?'selected':''}>${t}</option>`).join('')}
            </select>
            <label class="text-xs text-gray-400 flex items-center gap-2">
                <input type="checkbox" class="accent-purple-500 org-pf-required" ${f.required ? 'checked' : ''}>
                Required
            </label>
            <button onclick="removeOrgProfileFieldRow(${idx})" class="text-red-400 hover:text-red-300 px-2" title="Remove">✕</button>
        </div>
        <div class="pl-1 pb-2">
            <input class="input-field px-3 py-2 rounded-lg text-sm w-full org-pf-desc" placeholder="Description (optional)" value="${escHtml(f.description || '')}">
        </div>
    `).join('');
}

function addOrgProfileFieldRow() {
    // Preserve any unsaved edits before adding a new row
    orgProfileFieldsSchema = collectOrgProfileFieldsSchemaFromUI();
    orgProfileFieldsSchema.push({ key: '', label: '', type: 'string', description: '', required: false });
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
    const rows = Array.from(container.querySelectorAll('.flex.gap-2.items-center.w-full'));
    const defs = [];
    rows.forEach((row, i) => {
        const keyEl = row.querySelector('.org-pf-key');
        const labelEl = row.querySelector('.org-pf-label');
        const typeEl = row.querySelector('.org-pf-type');
        const reqEl = row.querySelector('.org-pf-required');
        const descEl = container.querySelectorAll('.org-pf-desc')[i];
        const key = (keyEl?.value || '').trim().replace(/\s+/g, '_').toLowerCase();
        if (!key) return;
        defs.push({
            key,
            label: (labelEl?.value || '').trim() || key.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: (typeEl?.value || 'string'),
            description: (descEl?.value || '').trim() || null,
            required: !!reqEl?.checked
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
    renderOrgDepartments();
}

function renderOrgDepartments() {
    const container = document.getElementById('org-departments-grid');
    if (!container) return;
    if (orgDepartments.length === 0) {
        container.innerHTML = `
            <div class="card rounded-xl p-8 text-center col-span-full">
                <div class="text-4xl mb-3">🏢</div>
                <h4 class="font-semibold mb-2">No Departments Yet</h4>
                <p class="text-gray-400 text-sm mb-4">Create departments to define your organizational structure</p>
                <button onclick="showCreateDepartmentModal()" class="btn-primary px-4 py-2 rounded-lg">+ Create First Department</button>
            </div>`;
        return;
    }
    container.innerHTML = orgDepartments.map(d => {
        const manager = orgUsersCache.find(u => u.id === d.manager_id);
        const managerName = manager ? (manager.name || manager.email) : '';
        const memberCount = d.member_count || 0;
        return `
        <div class="card rounded-xl p-4">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xl">🏢</div>
                    <div>
                        <h4 class="font-semibold">${escHtml(d.name)}</h4>
                        <p class="text-xs text-gray-400">${memberCount} member${memberCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button onclick="editDepartment('${d.id}')" class="p-1 hover:bg-gray-700 rounded" title="Edit">✏️</button>
                    <button onclick="deleteDepartment('${d.id}')" class="p-1 hover:bg-gray-700 rounded text-red-400" title="Delete">🗑️</button>
                </div>
            </div>
            ${managerName ? `<p class="text-xs text-gray-400 mb-1">👤 Head: ${escHtml(managerName)}</p>` : ''}
            <p class="text-sm text-gray-400 line-clamp-2">${escHtml(d.description || 'No description')}</p>
        </div>`;
    }).join('');
}

function showCreateDepartmentModal() {
    ensureModalInBody('create-dept-modal');
    document.getElementById('dept-edit-id').value = '';
    document.getElementById('dept-modal-title').textContent = '🏢 Create Department';
    document.getElementById('dept-save-btn').textContent = 'Create';
    document.getElementById('dept-name').value = '';
    document.getElementById('dept-description').value = '';
    // Populate manager dropdown
    const mgrSelect = document.getElementById('dept-manager');
    mgrSelect.innerHTML = '<option value="">— None —</option>' +
        orgUsersCache.map(u => `<option value="${u.id}">${escHtml(u.name || u.email)}</option>`).join('');
    // Populate parent dropdown
    const parentSelect = document.getElementById('dept-parent');
    parentSelect.innerHTML = '<option value="">— None (Top Level) —</option>' +
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
            showToast(editId ? 'Department updated!' : 'Department created!', 'success');
            closeDeptModal();
            await loadOrgDepartments();
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
    document.getElementById('dept-modal-title').textContent = '✏️ Edit Department';
    document.getElementById('dept-save-btn').textContent = 'Save';
    document.getElementById('dept-name').value = dept.name || '';
    document.getElementById('dept-description').value = dept.description || '';
    document.getElementById('dept-manager').value = dept.manager_id || '';
    document.getElementById('dept-parent').value = dept.parent_id || '';
}

async function deleteDepartment(id) {
    if (!confirm('Delete this department?')) return;
    try {
        const res = await fetch(`/api/identity/departments/${id}`, {
            method: 'DELETE', headers: getAuthHeaders()
        });
        if (res.ok) {
            showToast('Department deleted', 'success');
            await loadOrgDepartments();
        } else {
            showToast('Failed to delete department', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// --- Manager Assignment ---
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

function renderOrgManagerTable() {
    const tbody = document.getElementById('org-manager-table');
    if (!tbody) return;
    const filter = (document.getElementById('org-manager-search')?.value || '').toLowerCase();
    const users = orgUsersCache.filter(u => {
        if (!filter) return true;
        return u.name.toLowerCase().includes(filter) || u.email.toLowerCase().includes(filter) || (u.employee_id || '').toLowerCase().includes(filter);
    });
    if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No users found</td></tr>';
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
            <td class="p-3 text-sm">${dept ? `<span class="text-purple-400 text-xs">${escHtml(dept.name)}</span>` : '<span class="text-gray-500 text-xs">—</span>'}</td>
            <td class="p-3 text-sm">${mgr ? `<span class="text-blue-400 text-xs">${escHtml(mgr.name)}</span>` : '<span class="text-gray-500 text-xs">Not assigned</span>'}</td>
            <td class="p-3">
                <button onclick="openManagerModal('${u.id}')" class="text-blue-400 hover:text-blue-300 text-sm" title="Assign Manager">✏️ Edit</button>
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
        if (mgrRes.ok) {
            showToast('Manager assignment saved!', 'success');
            // Update cache
            const idx = orgUsersCache.findIndex(u => u.id === userId);
            if (idx >= 0) {
                orgUsersCache[idx].manager_id = managerId;
                orgUsersCache[idx].employee_id = employeeId;
                orgUsersCache[idx].department_id = departmentId;
            }
            renderOrgManagerTable();
            closeManagerModal();
        } else {
            const data = await mgrRes.json().catch(() => ({}));
            showToast(data.detail || 'Failed to save', 'error');
        }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// --- Org Chart ---
function renderOrgChart() {
    const container = document.getElementById('org-chart-tree');
    if (!container) return;
    // Build hierarchy from users with managers
    const roots = orgUsersCache.filter(u => !u.manager_id);
    if (roots.length === 0 && orgUsersCache.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-3">🌳</div>
                <p class="text-gray-400">No users found. Add users and assign managers to see the org chart.</p>
            </div>`;
        return;
    }
    function buildTree(parentId) {
        const children = orgUsersCache.filter(u => u.manager_id === parentId);
        if (!children.length) return '';
        return `<ul class="org-tree-list">${children.map(c => {
            const dept = c.department_id ? orgDepartments.find(d => d.id === c.department_id) : null;
            const childHtml = buildTree(c.id);
            return `<li class="org-tree-item">
                <div class="org-tree-node card rounded-lg p-3 inline-block mb-2" style="min-width:180px">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-xs">${(c.name||c.email)[0].toUpperCase()}</div>
                        <div>
                            <div class="font-medium text-sm">${escHtml(c.name)}</div>
                            <div class="text-xs text-gray-400">${c.job_title ? escHtml(c.job_title) : (dept ? escHtml(dept.name) : '')}</div>
                        </div>
                    </div>
                </div>
                ${childHtml}
            </li>`;
        }).join('')}</ul>`;
    }
    let html = '<div class="org-chart-container overflow-x-auto">';
    // Render top-level users (no manager)
    html += '<ul class="org-tree-list">';
    roots.forEach(r => {
        const dept = r.department_id ? orgDepartments.find(d => d.id === r.department_id) : null;
        const childHtml = buildTree(r.id);
        html += `<li class="org-tree-item">
            <div class="org-tree-node org-tree-root card rounded-lg p-3 inline-block mb-2 border-purple-500/50" style="min-width:200px">
                <div class="flex items-center gap-2">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white text-sm">${(r.name||r.email)[0].toUpperCase()}</div>
                    <div>
                        <div class="font-semibold">${escHtml(r.name)}</div>
                        <div class="text-xs text-gray-400">${r.job_title ? escHtml(r.job_title) : (dept ? escHtml(dept.name) : 'Top Level')}</div>
                    </div>
                </div>
            </div>
            ${childHtml}
        </li>`;
    });
    // Users with no manager and who are not roots (orphans - assigned to a manager that doesn't exist)
    const orphans = orgUsersCache.filter(u => u.manager_id && !orgUsersCache.find(m => m.id === u.manager_id));
    if (orphans.length) {
        html += `<li class="org-tree-item"><div class="text-gray-500 text-sm mb-2">Unlinked Users</div><ul class="org-tree-list">${
            orphans.map(o => `<li class="org-tree-item"><div class="org-tree-node card rounded-lg p-3 inline-block mb-2 opacity-60" style="min-width:160px">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">${(o.name||o.email)[0].toUpperCase()}</div>
                    <div class="text-sm">${escHtml(o.name)}</div>
                </div>
            </div></li>`).join('')
        }</ul></li>`;
    }
    html += '</ul></div>';
    container.innerHTML = html;
}

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

