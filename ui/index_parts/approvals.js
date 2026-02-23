// Auto-generated from ui/index.js
// Part 003: lines 3544-5406
// DO NOT reorder parts.

        
        // ============================================================================
        // APPROVAL DASHBOARD FUNCTIONS
        // ============================================================================
        
        // Open Approval Dashboard – show approvals with "Assigned to" per process builder config (user/role/group)
        async function openApprovalDashboard() {
            try {
                const headers = getAuthHeaders();
                const [approvalRes, usersRes, rolesRes, groupsRes] = await Promise.all([
                    fetch(API + '/process/approvals?status=pending', { headers }),
                    fetch(API + '/api/security/users', { headers }).catch(() => ({ ok: false })),
                    fetch(API + '/api/security/roles', { headers }).catch(() => ({ ok: false })),
                    fetch(API + '/api/security/groups', { headers }).catch(() => ({ ok: false }))
                ]);
                
                if (!approvalRes.ok) {
                    showToast('Could not load approvals', 'error');
                    return;
                }
                
                const data = await approvalRes.json();
                const approvals = data.items || data.approvals || [];
                
                let usersList = [], rolesList = [], groupsList = [];
                if (usersRes.ok) { const d = await usersRes.json(); usersList = Array.isArray(d) ? d : (d.users || []); }
                if (rolesRes.ok) { const d = await rolesRes.json(); rolesList = Array.isArray(d) ? d : (d.roles || []); }
                if (groupsRes.ok) { const d = await groupsRes.json(); groupsList = Array.isArray(d) ? d : (d.groups || []); }
                
                const userMap = Object.fromEntries(usersList.map(u => [String(u.id), u.name || u.email || u.id]));
                const roleMap = Object.fromEntries(rolesList.map(r => [String(r.id), r.name || r.id]));
                const groupMap = Object.fromEntries(groupsList.map(g => [String(g.id), g.name || g.id]));
                
                function assigneeDisplay(a) {
                    const t = (a.assignee_type || 'user');
                    const u = (a.assigned_user_ids || []).map(id => userMap[id] || id);
                    const r = (a.assigned_role_ids || []).map(id => roleMap[id] || id);
                    const g = (a.assigned_group_ids || []).map(id => groupMap[id] || id);
                    if (t === 'user' && u.length) return 'Assigned to: ' + (u.join(', ') || '—');
                    if (t === 'role' && r.length) return 'Assigned to role(s): ' + (r.join(', ') || '—');
                    if (t === 'group' && g.length) return 'Assigned to group(s): ' + (g.join(', ') || '—');
                    if (t === 'any' || (!u.length && !r.length && !g.length)) return 'Assigned to: Anyone';
                    return 'Assigned to: ' + (u.length ? u.join(', ') : r.length ? 'Role(s) ' + r.join(', ') : g.length ? 'Group(s) ' + g.join(', ') : '—');
                }
                function escapeHtml(s) {
                    if (s == null) return '';
                    const div = document.createElement('div');
                    div.textContent = String(s);
                    return div.innerHTML;
                }
                function friendlyLabel(key) {
                    return humanizeFieldLabel(key) || String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                }
                function renderReviewData(rd) {
                    try {
                        if (typeof window.afRenderReviewData === 'function') {
                            return window.afRenderReviewData(rd, { maxRows: 24 }) || '';
                        }
                    } catch (_) {}
                    // Fallback: safe plain text only
                    try {
                        const s = (rd == null) ? '' : String(rd);
                        return s ? `<div class="text-gray-300 text-sm">${escapeHtml(s)}</div>` : '';
                    } catch (_) { return ''; }
                }
                
                document.getElementById('approval-count-subtitle').textContent = 
                    `${approvals.length} item${approvals.length !== 1 ? 's' : ''} waiting for your decision`;
                
                const container = document.getElementById('approval-list');
                
                if (approvals.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-10 text-gray-500">
                            <span class="text-4xl mb-4 block">✅</span>
                            <p>No pending approvals</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = approvals.map(approval => `
                        <div class="card rounded-xl p-4 border-l-4 border-l-yellow-500">
                            <div class="flex items-start justify-between mb-3">
                                <div>
                                    <h4 class="font-semibold">${approval.title || 'Approval'}</h4>
                                    <p class="text-sm text-gray-400">${approval.description || ''}</p>
                                    <p class="text-xs text-gray-500 mt-1">${assigneeDisplay(approval)}</p>
                                </div>
                                <span class="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">${humanizeUrgency(approval.priority || approval.urgency)}</span>
                            </div>
                            
                            ${(() => { const html = renderReviewData(approval.review_data || approval.details_to_review); return html ? `
                                <div class="bg-gray-800/80 rounded-lg p-4 mb-3 text-sm border border-gray-700/50">
                                    <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details to review</div>
                                    ${html}
                                </div>
                            ` : ''; })()}
                            
                            <div class="flex gap-3">
                                <button onclick="approveRequest('${approval.id}')" class="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition">
                                    ✅ Approve
                                </button>
                                <button onclick="rejectRequest('${approval.id}')" class="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition">
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
                
                document.getElementById('approval-dashboard-modal').classList.remove('hidden');
                
            } catch(e) {
                console.error('Error loading approvals:', e);
                showToast('Could not load approvals', 'error');
            }
        }
        
        // Approve Request
        async function approveRequest(approvalId) {
            const comments = await uiPrompt('Add a comment (optional).', {
                title: 'Approval comment',
                confirmText: 'Submit',
                cancelText: 'Skip',
                multiline: true,
                defaultValue: '',
                placeholder: 'Optional…'
            });
            
            try {
                const response = await fetch(API + `/process/approvals/${approvalId}/decide`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        decision: 'approved',
                        comments: comments || ''
                    })
                });
                
                if (response.ok) {
                    showToast('Request approved', 'success');
                    openApprovalDashboard(); // Refresh list
                } else {
                    const error = await response.json();
                    showToast(error.detail || 'Could not approve', 'error');
                }
            } catch(e) {
                showToast('Could not approve request', 'error');
            }
        }
        
        // Reject Request
        async function rejectRequest(approvalId) {
            const comments = await uiPrompt('Add a reason for rejection (optional).', {
                title: 'Rejection reason',
                confirmText: 'Reject',
                cancelText: 'Cancel',
                multiline: true,
                defaultValue: '',
                placeholder: 'Optional…'
            });
            if (comments === null) return; // User cancelled
            
            try {
                const response = await fetch(API + `/process/approvals/${approvalId}/decide`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        decision: 'rejected',
                        comments: comments || 'Rejected'
                    })
                });
                
                if (response.ok) {
                    showToast('Request rejected', 'success');
                    openApprovalDashboard(); // Refresh list
                } else {
                    const error = await response.json();
                    showToast(error.detail || 'Could not reject', 'error');
                }
            } catch(e) {
                showToast('Could not reject request', 'error');
            }
        }
        
        // Close Approval Dashboard
        function closeApprovalDashboard() {
            document.getElementById('approval-dashboard-modal').classList.add('hidden');
        }
        
        // ============================================================================
        // PROCESS VISUAL EDITOR
        // ============================================================================
        
        let editingProcessAgent = null;
        
        // Open Process Editor for existing workflow agent
        function openProcessEditor(agent) {
            // Open the full visual workflow builder
            window.open(`/ui/process-builder.html?agent=${agent.id}`, '_blank');
        }
        
        // Create Process Editor Modal
        function createProcessEditorModal() {
            const modalHtml = `
                <div id="process-editor-modal" class="hidden fixed inset-0 modal-backdrop flex items-center justify-center z-[60]" onclick="if(event.target===this)closeProcessEditor()">
                    <div class="card rounded-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" onclick="event.stopPropagation()">
                        <!-- Header -->
                        <div class="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0" style="background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(20,184,166,0.1));">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-2xl">✏️</div>
                                <div>
                                    <h3 id="process-editor-title" class="text-lg font-bold">Edit Workflow</h3>
                                    <p class="text-sm text-gray-400">Modify workflow steps and configuration</p>
                                </div>
                            </div>
                            <button onclick="closeProcessEditor()" class="text-gray-400 hover:text-white text-2xl px-2">✕</button>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-1 overflow-y-auto p-6">
                            <!-- Basic Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label class="text-sm text-gray-400 mb-1 block">Workflow Name</label>
                                    <input type="text" id="process-editor-name" class="input-field w-full rounded-lg px-4 py-3" placeholder="My Workflow">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400 mb-1 block">Goal / Description</label>
                                    <input type="text" id="process-editor-goal" class="input-field w-full rounded-lg px-4 py-3" placeholder="What does this workflow do?">
                                </div>
                            </div>
                            
                            <!-- Workflow Steps -->
                            <div class="mb-6">
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="font-semibold flex items-center gap-2">🔄 Workflow Steps</h4>
                                    <button onclick="addWorkflowNode()" class="text-sm px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition">
                                        + Add Step
                                    </button>
                                </div>
                                <div id="workflow-nodes-container" class="space-y-3">
                                    <!-- Nodes will be rendered here -->
                                </div>
                            </div>
                            
                            <!-- Add Node Panel (hidden by default) -->
                            <div id="add-node-panel" class="hidden mb-6 p-4 rounded-lg border border-dashed border-gray-600">
                                <h5 class="font-medium mb-3">Select Step Type</h5>
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <button onclick="insertNode('action')" class="p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-center transition">
                                        <span class="text-2xl block mb-1">⚡</span>
                                        <span class="text-sm">Action</span>
                                    </button>
                                    <button onclick="insertNode('condition')" class="p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-center transition">
                                        <span class="text-2xl block mb-1">🔀</span>
                                        <span class="text-sm">Condition</span>
                                    </button>
                                    <button onclick="insertNode('approval')" class="p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-center transition">
                                        <span class="text-2xl block mb-1">✅</span>
                                        <span class="text-sm">Approval</span>
                                    </button>
                                    <button onclick="insertNode('notification')" class="p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-center transition">
                                        <span class="text-2xl block mb-1">📧</span>
                                        <span class="text-sm">Notify</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
                            <button onclick="closeProcessEditor()" class="btn-secondary px-4 py-2 rounded-lg">Cancel</button>
                            <div class="flex gap-3">
                                <button onclick="testWorkflow()" class="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
                                    🧪 Test
                                </button>
                                <button onclick="saveProcessChanges()" class="px-6 py-2 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #22c55e 0%, #14b8a6 100%);">
                                    💾 Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Approval step config modal (approvers from Platform User/Role/Group or Tool) -->
                <div id="approval-config-modal" class="hidden fixed inset-0 modal-backdrop flex items-center justify-center z-[70]" onclick="if(event.target===this)closeApprovalConfigModal()">
                    <div class="card rounded-xl w-full max-w-lg mx-4 p-6" onclick="event.stopPropagation()">
                        <h3 class="text-lg font-bold mb-4">✅ Approval Step Configuration</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm text-gray-400 mb-1">Title</label>
                                <input type="text" id="approval-config-title" class="input-field w-full rounded-lg px-4 py-2" placeholder="Approval Required">
                            </div>
                            <div>
                                <label class="block text-sm text-gray-400 mb-1">Description</label>
                                <input type="text" id="approval-config-description" class="input-field w-full rounded-lg px-4 py-2" placeholder="Optional">
                            </div>
                            <div>
                                <label class="block text-sm text-gray-400 mb-1">Approvers from</label>
                                <select id="approval-config-source" onchange="onApprovalConfigSourceChange()" class="input-field w-full rounded-lg px-4 py-2">
                                    <option value="platform_user">Platform User</option>
                                    <option value="platform_role">Platform Role</option>
                                    <option value="platform_group">Platform Group</option>
                                    <option value="tool">Tool</option>
                                </select>
                            </div>
                            <div id="approval-config-platform-user-wrap" class="hidden">
                                <label class="block text-sm text-gray-400 mb-1">Select users</label>
                                <select id="approval-config-user-list" multiple class="input-field w-full rounded-lg px-4 py-2 h-32"></select>
                            </div>
                            <div id="approval-config-platform-role-wrap" class="hidden">
                                <label class="block text-sm text-gray-400 mb-1">Select roles</label>
                                <select id="approval-config-role-list" multiple class="input-field w-full rounded-lg px-4 py-2 h-32"></select>
                            </div>
                            <div id="approval-config-platform-group-wrap" class="hidden">
                                <label class="block text-sm text-gray-400 mb-1">Select groups</label>
                                <select id="approval-config-group-list" multiple class="input-field w-full rounded-lg px-4 py-2 h-32"></select>
                            </div>
                            <div id="approval-config-tool-wrap" class="hidden">
                                <label class="block text-sm text-gray-400 mb-1">Select tool (configured only)</label>
                                <select id="approval-config-tool" class="input-field w-full rounded-lg px-4 py-2">
                                    <option value="">— None —</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm text-gray-400 mb-1">Timeout (hours)</label>
                                <input type="number" id="approval-config-timeout" class="input-field w-full rounded-lg px-4 py-2" value="24" min="1">
                            </div>
                        </div>
                        <div class="flex gap-3 mt-6">
                            <button onclick="closeApprovalConfigModal()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                            <button onclick="saveApprovalConfig()" class="btn-primary flex-1 py-2 rounded-lg">Save</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Render workflow nodes in editor
        function renderWorkflowNodes(workflow) {
            const container = document.getElementById('workflow-nodes-container');
            const nodes = workflow.nodes || [];
            
            if (nodes.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                        <span class="text-3xl block mb-2">📭</span>
                        <p>No steps yet. Click "Add Step" to begin.</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = nodes.map((node, index) => {
                const typeIcons = {
                    trigger: '🎯',
                    action: '⚡',
                    condition: '🔀',
                    approval: '✅',
                    notification: '📧',
                    end: '🏁'
                };
                
                const typeColors = {
                    trigger: 'border-green-500/30 bg-green-500/5',
                    action: 'border-blue-500/30 bg-blue-500/5',
                    condition: 'border-yellow-500/30 bg-yellow-500/5',
                    approval: 'border-orange-500/30 bg-orange-500/5',
                    notification: 'border-purple-500/30 bg-purple-500/5',
                    end: 'border-gray-500/30 bg-gray-500/5'
                };
                
                const icon = typeIcons[node.type] || '📦';
                const colorClass = typeColors[node.type] || 'border-gray-600';
                
                return `
                    <div class="p-4 rounded-lg border ${colorClass} group" data-node-index="${index}">
                        <div class="flex items-start gap-3">
                            <div class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                                ${icon}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <input type="text" 
                                           class="input-field flex-1 rounded px-2 py-1 text-sm font-medium" 
                                           value="${node.name || node.type}" 
                                           onchange="updateNodeName(${index}, this.value)"
                                           placeholder="Step name">
                                    <span class="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">${node.type}</span>
                                </div>
                                ${node.config ? `
                                    <div class="text-xs text-gray-500 mt-1">
                                        ${Object.entries(node.config).slice(0, 2).map(([k, v]) => 
                                            `<span class="mr-2">${k}: ${typeof v === 'string' ? v.substring(0, 20) : JSON.stringify(v).substring(0, 20)}...</span>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onclick="editNodeConfig(${index})" class="p-1.5 rounded hover:bg-gray-700" title="Configure">⚙️</button>
                                <button onclick="moveNodeUp(${index})" class="p-1.5 rounded hover:bg-gray-700 ${index === 0 ? 'opacity-30' : ''}" title="Move Up">⬆️</button>
                                <button onclick="moveNodeDown(${index})" class="p-1.5 rounded hover:bg-gray-700 ${index === nodes.length - 1 ? 'opacity-30' : ''}" title="Move Down">⬇️</button>
                                <button onclick="deleteNode(${index})" class="p-1.5 rounded hover:bg-red-500/20 text-red-400" title="Delete">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Add new workflow node
        function addWorkflowNode() {
            const panel = document.getElementById('add-node-panel');
            panel.classList.toggle('hidden');
        }
        
        // Insert a new node of specific type
        function insertNode(type) {
            if (!editingProcessAgent) return;
            
            const workflow = editingProcessAgent.process_definition || { nodes: [], edges: [] };
            
            const newNode = {
                id: 'node_' + Date.now(),
                type: type,
                name: type.charAt(0).toUpperCase() + type.slice(1) + ' ' + (workflow.nodes.length + 1),
                config: {}
            };
            
            // Set default config based on type
            switch(type) {
                case 'action':
                    newNode.config = { action_type: 'api_call', description: '' };
                    break;
                case 'condition':
                    newNode.config = { condition: '', true_next: '', false_next: '' };
                    break;
                case 'approval':
                    newNode.config = { assignee_source: 'platform_user', assignee_type: 'user', assignee_ids: [], timeout_hours: 24 };
                    break;
                case 'notification':
                    newNode.config = { channel: 'email', template: '' };
                    break;
            }
            
            workflow.nodes.push(newNode);
            editingProcessAgent.process_definition = workflow;
            
            // Re-render and hide panel
            renderWorkflowNodes(workflow);
            document.getElementById('add-node-panel').classList.add('hidden');
            
            showToast('Step added', 'success');
        }
        
        // Update node name
        function updateNodeName(index, newName) {
            if (!editingProcessAgent) return;
            const workflow = editingProcessAgent.process_definition;
            if (workflow.nodes[index]) {
                workflow.nodes[index].name = newName;
            }
        }
        
        // Move node up
        function moveNodeUp(index) {
            if (!editingProcessAgent || index === 0) return;
            const workflow = editingProcessAgent.process_definition;
            const nodes = workflow.nodes;
            [nodes[index], nodes[index - 1]] = [nodes[index - 1], nodes[index]];
            renderWorkflowNodes(workflow);
        }
        
        // Move node down
        function moveNodeDown(index) {
            if (!editingProcessAgent) return;
            const workflow = editingProcessAgent.process_definition;
            const nodes = workflow.nodes;
            if (index >= nodes.length - 1) return;
            [nodes[index], nodes[index + 1]] = [nodes[index + 1], nodes[index]];
            renderWorkflowNodes(workflow);
        }
        
        // Delete node
        function deleteNode(index) {
            if (!editingProcessAgent) return;
            uiConfirm('Remove this step?', { title: 'Remove step', confirmText: 'Remove', cancelText: 'Cancel', danger: true })
                .then((ok) => {
                    if (!ok) return;
                    const workflow = editingProcessAgent.process_definition;
                    workflow.nodes.splice(index, 1);
                    renderWorkflowNodes(workflow);
                    showToast('Step removed', 'success');
                });
        }
        
        // Edit node configuration (approval node opens dedicated modal; others use JSON prompt)
        let approvalConfigNodeIndex = -1;
        async function editNodeConfig(index) {
            if (!editingProcessAgent) return;
            const workflow = editingProcessAgent.process_definition;
            const node = workflow.nodes[index];
            if (node.type === 'approval') {
                approvalConfigNodeIndex = index;
                openApprovalConfigModal(node.config || {});
                return;
            }
            const configStr = await uiPrompt('Advanced configuration (for administrators).', {
                title: 'Advanced settings',
                confirmText: 'Save',
                cancelText: 'Cancel',
                multiline: true,
                defaultValue: JSON.stringify(node.config || {}, null, 2),
                placeholder: ''
            });
            if (configStr !== null) {
                try {
                    node.config = JSON.parse(configStr);
                    renderWorkflowNodes(workflow);
                    showToast('Configuration updated', 'success');
                } catch(e) {
                    showToast('Invalid JSON', 'error');
                }
            }
        }
        
        // Approval config modal: approvers from Platform User / Role / Group / Tool
        async function openApprovalConfigModal(currentConfig) {
            const modal = document.getElementById('approval-config-modal');
            if (!modal) return;
            let source = currentConfig.assignee_source || '';
            if (!source && currentConfig.assignee_type) source = 'platform_' + currentConfig.assignee_type;
            if (!source) source = 'platform_user';
            const assigneeType = currentConfig.assignee_type || 'user';
            const assigneeIds = currentConfig.assignee_ids || currentConfig.approvers || [];
            const assigneeToolId = currentConfig.assignee_tool_id || '';
            const title = currentConfig.title || 'Approval Required';
            const description = currentConfig.description || '';
            const timeoutHours = currentConfig.timeout_hours != null ? currentConfig.timeout_hours : 24;
            
            const headers = getAuthHeaders();
            let users = [], roles = [], groups = [], tools = [];
            try {
                const [uRes, rRes, gRes, tRes] = await Promise.all([
                    fetch(API + '/api/security/users', { headers }),
                    fetch(API + '/api/security/roles', { headers }),
                    fetch(API + '/api/security/groups', { headers }),
                    fetch(API + '/api/tools/accessible', { headers })
                ]);
                if (uRes.ok) { const d = await uRes.json(); users = Array.isArray(d) ? d : (d.users || []); }
                if (rRes.ok) { const d = await rRes.json(); roles = Array.isArray(d) ? d : (d.roles || []); }
                if (gRes.ok) { const d = await gRes.json(); groups = Array.isArray(d) ? d : (d.groups || []); }
                if (tRes.ok) { const d = await tRes.json(); tools = d.tools || []; }
            } catch (e) {
                console.error('Load approval options:', e);
            }
            
            const userOptions = users.map(u => `<option value="${u.id}" ${assigneeIds.includes(u.id) ? 'selected' : ''}>${(u.name || u.email || u.id).substring(0, 40)}</option>`).join('');
            const roleOptions = roles.map(r => `<option value="${r.id}" ${assigneeIds.includes(r.id) ? 'selected' : ''}>${(r.name || r.id).substring(0, 40)}</option>`).join('');
            const groupOptions = groups.map(g => `<option value="${g.id}" ${assigneeIds.includes(g.id) ? 'selected' : ''}>${(g.name || g.id).substring(0, 40)}</option>`).join('');
            const toolOptions = tools.map(t => `<option value="${t.id}" ${assigneeToolId === t.id ? 'selected' : ''}>${(t.name || t.id).substring(0, 40)}</option>`).join('');
            
            document.getElementById('approval-config-title').value = title;
            document.getElementById('approval-config-description').value = description;
            document.getElementById('approval-config-timeout').value = timeoutHours;
            document.getElementById('approval-config-source').value = source;
            document.getElementById('approval-config-user-list').innerHTML = userOptions;
            document.getElementById('approval-config-role-list').innerHTML = roleOptions;
            document.getElementById('approval-config-group-list').innerHTML = groupOptions;
            document.getElementById('approval-config-tool').innerHTML = '<option value="">— None —</option>' + (toolOptions || '');
            document.getElementById('approval-config-tool').value = assigneeToolId;
            
            document.getElementById('approval-config-platform-user-wrap').classList.toggle('hidden', source !== 'platform_user');
            document.getElementById('approval-config-platform-role-wrap').classList.toggle('hidden', source !== 'platform_role');
            document.getElementById('approval-config-platform-group-wrap').classList.toggle('hidden', source !== 'platform_group');
            document.getElementById('approval-config-tool-wrap').classList.toggle('hidden', source !== 'tool');
            
            modal.classList.remove('hidden');
        }
        function onApprovalConfigSourceChange() {
            const v = document.getElementById('approval-config-source').value;
            document.getElementById('approval-config-platform-user-wrap').classList.toggle('hidden', v !== 'platform_user');
            document.getElementById('approval-config-platform-role-wrap').classList.toggle('hidden', v !== 'platform_role');
            document.getElementById('approval-config-platform-group-wrap').classList.toggle('hidden', v !== 'platform_group');
            document.getElementById('approval-config-tool-wrap').classList.toggle('hidden', v !== 'tool');
        }
        function saveApprovalConfig() {
            if (!editingProcessAgent || approvalConfigNodeIndex < 0) return;
            const workflow = editingProcessAgent.process_definition;
            const node = workflow.nodes[approvalConfigNodeIndex];
            const source = document.getElementById('approval-config-source').value;
            const userList = document.getElementById('approval-config-user-list');
            const roleList = document.getElementById('approval-config-role-list');
            const groupList = document.getElementById('approval-config-group-list');
            const toolSelect = document.getElementById('approval-config-tool');
            const assigneeIds = [];
            if (source === 'platform_user') {
                for (let i = 0; i < userList.options.length; i++) if (userList.options[i].selected) assigneeIds.push(userList.options[i].value);
            } else if (source === 'platform_role') {
                for (let i = 0; i < roleList.options.length; i++) if (roleList.options[i].selected) assigneeIds.push(roleList.options[i].value);
            } else if (source === 'platform_group') {
                for (let i = 0; i < groupList.options.length; i++) if (groupList.options[i].selected) assigneeIds.push(groupList.options[i].value);
            }
            const assigneeType = source === 'platform_user' ? 'user' : source === 'platform_role' ? 'role' : source === 'platform_group' ? 'group' : 'user';
            node.config = {
                assignee_source: source,
                assignee_type: assigneeType,
                assignee_ids: assigneeIds,
                assignee_tool_id: source === 'tool' ? (toolSelect.value || '') : undefined,
                title: document.getElementById('approval-config-title').value.trim() || 'Approval Required',
                description: document.getElementById('approval-config-description').value.trim(),
                timeout_hours: parseInt(document.getElementById('approval-config-timeout').value, 10) || 24
            };
            document.getElementById('approval-config-modal').classList.add('hidden');
            approvalConfigNodeIndex = -1;
            renderWorkflowNodes(workflow);
            showToast('Approval configuration updated', 'success');
        }
        function closeApprovalConfigModal() {
            document.getElementById('approval-config-modal').classList.add('hidden');
            approvalConfigNodeIndex = -1;
        }
        
        // Test the workflow
        function testWorkflow() {
            if (!editingProcessAgent) return;
            closeProcessEditor();
            openProcessExecution(editingProcessAgent.id);
        }
        
        // Save process changes
        async function saveProcessChanges() {
            if (!editingProcessAgent) return;
            
            const name = document.getElementById('process-editor-name').value.trim();
            const goal = document.getElementById('process-editor-goal').value.trim();
            
            if (!name) {
                showToast('Please enter a workflow name', 'error');
                return;
            }
            
            try {
                const response = await fetch(API + '/api/agents/' + editingProcessAgent.id, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        name: name,
                        goal: goal,
                        process_definition: editingProcessAgent.process_definition
                    })
                });
                
                if (response.ok) {
                    showToast('Workflow saved!', 'success');
                    closeProcessEditor();
                    loadAgents();
                } else {
                    const error = await response.json();
                    showToast(error.detail || 'Could not save', 'error');
                }
            } catch(e) {
                showToast('Could not save workflow', 'error');
            }
        }
        
        // Close process editor
        function closeProcessEditor() {
            const modal = document.getElementById('process-editor-modal');
            if (modal) modal.classList.add('hidden');
            editingProcessAgent = null;
        }
        
        // Open Visual Workflow Builder
        function openVisualBuilder() {
            // So the new tab can read the token: copy sessionStorage → localStorage if needed
            const sessionToken = sessionStorage.getItem('agentforge_token');
            if (sessionToken && !localStorage.getItem('agentforge_token')) {
                localStorage.setItem('agentforge_token', sessionToken);
                const u = sessionStorage.getItem('agentforge_user');
                if (u) localStorage.setItem('agentforge_user', u);
            }
            const newWindow = window.open('/ui/process-builder.html', '_blank');
            if (!newWindow) {
                showToast('Please allow popups to open the Visual Builder', 'warning');
            }
        }
        
        // Show AI Workflow Input
        function showAIWorkflowInput() {
            document.getElementById('ai-workflow-input').classList.remove('hidden');
            document.getElementById('workflow-templates').classList.add('hidden');
        }
        
        // Hide AI Workflow Input
        function hideAIWorkflowInput() {
            document.getElementById('ai-workflow-input').classList.add('hidden');
            document.getElementById('workflow-templates').classList.remove('hidden');
        }
        
        // Open Builder with Template
        function openBuilderWithTemplate(template) {
            window.open(`/ui/process-builder.html?template=${template}`, '_blank');
        }
        
        // Process Templates (Legacy)
        function useProcessTemplate(template) {
            const templates = {
                approval: "When a request is submitted, check if the amount is over $500. If yes, send to manager for approval. Notify the requester of the decision and update the system.",
                onboarding: "When a new employee joins, create their accounts, send welcome email, schedule orientation, assign a buddy, and notify IT and HR.",
                notification: "Monitor for important events. When triggered, send notifications via email and Slack to the relevant team members.",
                data_sync: "Every hour, fetch data from the external API, validate and transform it, then update our database and log the results."
            };
            
            const goalField = document.getElementById('w-process-goal');
            if (goalField) {
                goalField.value = templates[template] || '';
            }
        }
        
        // Generate Agent Configuration using AI
        async function generateAgentConfig() {
            const goal = document.getElementById('w-initial-goal').value.trim();
            if(!goal) {
                showToast('Please describe what your assistant should do.', 'warning');
                return;
            }
            
            wizard.originalGoal = goal;
            
            // Show generating animation
            document.getElementById('wizard-step-0').classList.add('hidden');
            document.getElementById('wizard-generating').classList.remove('hidden');
            // Ensure conversational labels are shown (process uses a different set)
            try {
                if (typeof window._setGeneratingLabels === 'function') window._setGeneratingLabels('conversational');
            } catch (_) { /* ignore */ }
            
            // Animate steps
            const steps = ['gen-step-1', 'gen-step-2', 'gen-step-3', 'gen-step-4', 'gen-step-5'];
            const statuses = [
                'Understanding your requirements...',
                'Selecting optimal AI model...',
                'Defining tasks & capabilities...',
                'Recommending tools...',
                'Setting up guardrails...'
            ];
            
            for(let i=0; i<steps.length; i++) {
                await new Promise(r => setTimeout(r, 600));
                document.getElementById('generating-status').textContent = statuses[i];
                
                // Mark previous as done
                if(i > 0) {
                    const prev = document.getElementById(steps[i-1]);
                    prev.querySelector('span').className = 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center';
                    prev.querySelector('span').textContent = '✓';
                    prev.classList.remove('text-gray-500');
                }
                
                // Activate current
                const curr = document.getElementById(steps[i]);
                curr.querySelector('span').className = 'w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center animate-pulse';
                curr.classList.remove('text-gray-500');
            }
            
            // Mark last as done
            await new Promise(r => setTimeout(r, 400));
            const last = document.getElementById(steps[steps.length-1]);
            last.querySelector('span').className = 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center';
            last.querySelector('span').textContent = '✓';
            
            try {
                // Provide available tools context to the wizard (sanitized: no secrets)
                let toolsForContext = [];
                try {
                    const token = authToken || localStorage.getItem('agentforge_token');
                    const toolsRes = await fetch('/api/tools', {
                        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                    });
                    const toolsJson = await toolsRes.json().catch(() => ({}));
                    const tools = Array.isArray(toolsJson?.tools) ? toolsJson.tools : [];
                    toolsForContext = tools.slice(0, 40).map(t => {
                        const apiParams = t?.api_config?.input_parameters || t?.api_config?.inputParameters || [];
                        const safeParams = Array.isArray(apiParams) ? apiParams.map(p => ({
                            name: p?.name,
                            description: p?.description,
                            data_type: p?.data_type || p?.type,
                            required: !!p?.required,
                            location: p?.location
                        })) : [];
                        return {
                            id: t?.id,
                            name: t?.name,
                            type: t?.type,
                            description: t?.description || '',
                            input_parameters: safeParams
                        };
                    }).filter(t => t.id && t.name);
                } catch (_) { /* ignore */ }

                // Call AI to generate configuration - 100% dynamic, no fallback
                const token = authToken || localStorage.getItem('agentforge_token');
                const response = await fetch(API + '/api/agents/generate-config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
                    },
                    body: JSON.stringify({
                        goal,
                        context: {
                            tools: toolsForContext
                        }
                    })
                });
                
                if(response.ok) {
                    const config = await response.json();
                    try {
                        wizard.creationMode = 'ai';
                        wizard.agentType = 'conversational';
                    } catch (_) { /* ignore */ }
                    applyGeneratedConfig(config);
                } else {
                    // Show error - no local fallback
                    const error = await response.json().catch(() => ({}));
                    showToast('Could not generate the agent. Please check your AI settings and try again.', 'error');
                    document.getElementById('wizard-generating').classList.add('hidden');
                    document.getElementById('wizard-step-0').classList.remove('hidden');
                    return;
                }
            } catch(e) {
                console.error('Config generation error:', e);
                showToast('Could not connect to the AI service. Please try again.', 'error');
                document.getElementById('wizard-generating').classList.add('hidden');
                document.getElementById('wizard-step-0').classList.remove('hidden');
                return;
            }
            
            // Move to step 1
            await new Promise(r => setTimeout(r, 500));
            step = 1;
            updateStepsNew();
        }
        
        
        function applyGeneratedConfig(config) {
            console.log('=== applyGeneratedConfig called ===');
            console.log('Received config:', JSON.stringify(config, null, 2));
            
            // Set all wizard properties from API response (no defaults!)
            wizard.name = config.name;
            wizard.icon = config.icon;
            wizard.goal = config.goal;
            wizard.model = config.model;
            wizard.modelReason = config.modelReason;  // Store for display
            wizard.tasks = Array.isArray(config.tasks) ? config.tasks : [];
            wizard.suggestedTools = Array.isArray(config.suggestedTools) ? config.suggestedTools : [];
            wizard.personality = config.personality;
            wizard.guardrails = config.guardrails;
            
            // Store personality descriptions from API
            if (config.personalityDescriptions) {
                apiPersonalityDescriptions = config.personalityDescriptions;
            }
            
            // Store the goal for debounce comparison
            lastGoalText = wizard.goal;
            
            console.log('Wizard state after assignment:');
            console.log('- name:', wizard.name);
            console.log('- model:', wizard.model);
            console.log('- modelReason:', wizard.modelReason);
            console.log('- personality:', wizard.personality);
            
            // Apply to form elements
            const nameEl = document.getElementById('w-name');
            const iconEl = document.getElementById('w-icon');
            const goalEl = document.getElementById('w-goal');
            
            if(nameEl) nameEl.value = wizard.name || '';
            if(iconEl) iconEl.value = wizard.icon || '🤖';
            if(goalEl) goalEl.value = wizard.goal || '';
            
            // Set personality sliders from API response
            if (config.personality) {
                const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
                traits.forEach(trait => {
                    const value = config.personality[trait];
                    if (value !== undefined) {
                        const slider = document.getElementById(`p-${trait}`);
                        const numInput = document.getElementById(`p-${trait}-num`);
                        if (slider) slider.value = value;
                        if (numInput) numInput.value = value;
                    }
                });
                
                // Show personality reason if provided
                if (config.personalityReason) {
                    const previewEl = document.getElementById('personality-preview-text');
                    if (previewEl) {
                        previewEl.textContent = config.personalityReason;
                    }
                }
                
                // Update individual trait descriptions
                if (config.personalityDescriptions) {
                    traits.forEach(trait => {
                        const desc = config.personalityDescriptions[trait + 'Desc'];
                        const descEl = document.getElementById(`p-${trait}-desc`);
                        if (desc && descEl) {
                            descEl.textContent = desc;
                        }
                    });
                }
            }
            
            // Update model selection UI
            selectModel(wizard.model);
            
            // Update model explanation from API
            const modelWhyEl = document.getElementById('model-why-text');
            if(modelWhyEl && config.modelReason) {
                modelWhyEl.textContent = config.modelReason;
            }
            
            // Render tasks
            renderTasks();
            
            console.log('applyGeneratedConfig complete');
        }
        
        // ========== ICON MANAGEMENT ==========
        
        function handleIconUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Check file size (max 500KB)
            if (file.size > 500 * 1024) {
                uiAlert('This image is too large. Please upload an image up to 500 KB.', { title: 'Image too large' });
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                uiAlert('Please upload an image file (PNG or JPG).', { title: 'Unsupported file type' });
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                
                // Update preview
                document.getElementById('w-icon-emoji').classList.add('hidden');
                const imgEl = document.getElementById('w-icon-image');
                imgEl.src = base64Data;
                imgEl.classList.remove('hidden');
                
                // Store data
                document.getElementById('w-icon-type').value = 'image';
                document.getElementById('w-icon-data').value = base64Data;
                document.getElementById('w-icon').value = '📷'; // Fallback
                
                wizard.icon = '📷';
                wizard.iconType = 'image';
                wizard.iconData = base64Data;
            };
            reader.readAsDataURL(file);
        }
        
        function showIconPicker() {
            // Populate emoji grid
            const emojis = ['🤖','🎯','💼','🎧','📊','🛒','📧','🔧','💡','🎓','🏥','🏦','✈️','🍔','🏠','⚡','🔒','📱','🌐','💬','📋','🎨','🔬','⚙️','🚀','💰','📈','🎮','🤝','🌟','👨‍💻','👩‍💼','🏢','📦','🛠️','💳','📞','🗂️','🔍','📁','🎪','🎭','🎬','🏆','🎖️','👔','👗','🛡️','⚖️','📜'];
            const grid = document.getElementById('emoji-grid');
            if (grid) {
                grid.innerHTML = emojis.map(e => 
                    `<button onclick="selectEmoji('${e}')" class="w-8 h-8 text-lg hover:bg-gray-700 rounded transition">${e}</button>`
                ).join('');
            }
            console.log('🎯 [openIconPicker] Opening icon-picker-modal');
            const modal = document.getElementById('icon-picker-modal');
            if (!modal) {
                console.error('❌ [openIconPicker] Modal not found!');
                return;
            }
            ensureModalInBody('icon-picker-modal');
            modal.classList.remove('hidden');
            console.log('✅ [openIconPicker] Modal opened:', {
                classes: modal.className,
                display: window.getComputedStyle(modal).display,
                isVisible: modal.offsetParent !== null
            });
        }
        
        function closeIconPicker() {
            document.getElementById('icon-picker-modal').classList.add('hidden');
        }
        
        function selectEmoji(emoji) {
            // Update preview
            document.getElementById('w-icon-image').classList.add('hidden');
            const emojiEl = document.getElementById('w-icon-emoji');
            emojiEl.textContent = emoji;
            emojiEl.classList.remove('hidden');
            
            // Store data
            document.getElementById('w-icon-type').value = 'emoji';
            document.getElementById('w-icon-data').value = '';
            document.getElementById('w-icon').value = emoji;
            
            wizard.icon = emoji;
            wizard.iconType = 'emoji';
            wizard.iconData = '';
            
            closeIconPicker();
        }
        
        // ========== LLM MODEL MANAGEMENT - 100% DYNAMIC ==========
        // No hardcoded model config - everything comes from API
        
        async function loadLLMModels() {
            const container = document.getElementById('llm-models-list');
            if (!container) return;
            
            // Fetch current settings to get configured providers
            let settings = {};
            try {
                const r = await fetch(API + '/api/settings');
                const data = await r.json();
                settings = data.settings || data || {};
            } catch (e) {
                console.log('Could not fetch settings:', e);
            }
            
            const llmProviders = settings.llm_providers || [];
            
            if (llmProviders.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-6">
                        <span class="text-3xl">⚠️</span>
                        <p class="text-sm text-gray-400 mt-3">No AI models configured</p>
                        <p class="text-xs text-gray-500 mt-1">Add API keys in Settings to enable AI models</p>
                        <button onclick="navigate('settings')" class="mt-4 btn-primary px-4 py-2 rounded-lg text-sm">
                            ⚙️ Configure API Keys
                        </button>
                    </div>
                `;
                return;
            }
            
            // Build list of available models from configured providers
            const availableModels = [];
            for (const provider of llmProviders) {
                const providerModels = provider.models || [];
                for (const modelId of providerModels) {
                    availableModels.push({
                        id: modelId,
                        name: modelId,
                        provider: provider.provider,
                        providerName: provider.name
                    });
                }
            }
            
            // Check if wizard.model is available, if not use first available
            const currentModelAvailable = availableModels.some(m => m.id === wizard.model);
            if (!currentModelAvailable && availableModels.length > 0) {
                wizard.model = availableModels[0].id;
            }
            
            // Group models by provider
            const modelsByProvider = {};
            for (const model of availableModels) {
                const providerKey = model.providerName || model.provider;
                if (!modelsByProvider[providerKey]) {
                    modelsByProvider[providerKey] = [];
                }
                modelsByProvider[providerKey].push(model);
            }
            
            // Get provider icons
            const providerIcons = {
                'openai': '🟢', 'OpenAI': '🟢',
                'anthropic': '🟠', 'Anthropic': '🟠',
                'google': '🔵', 'Google': '🔵',
                'xai': '⚫', 'xAI': '⚫',
                'groq': '🟡', 'Groq': '🟡',
                'mistral': '🔷', 'Mistral': '🔷',
                'deepseek': '🔶', 'DeepSeek': '🔶',
                'together': '🟣', 'Together AI': '🟣',
                'perplexity': '🔴', 'Perplexity': '🔴',
                'cohere': '🟤', 'Cohere': '🟤',
                'ollama': '🦙', 'Ollama': '🦙',
                'lmstudio': '🖥️', 'LM Studio': '🖥️'
            };
            
            let html = '';
            
            // Show AI recommendation from API if available
            if (wizard.model && wizard.modelReason && wizard.goal) {
                html += `
                    <div class="mb-4 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
                        <div class="flex items-start gap-2">
                            <span class="text-lg">💡</span>
                            <div>
                                <p class="text-sm font-medium text-purple-300">AI Recommendation</p>
                                <p class="text-xs text-gray-400 mt-1">${wizard.modelReason}</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Render models grouped by provider
            for (const [providerName, models] of Object.entries(modelsByProvider)) {
                const icon = providerIcons[providerName] || '🤖';
                
                html += `
                    <div class="mb-3">
                        <p class="text-xs text-gray-500 mb-2 flex items-center gap-1">
                            <span>${icon}</span> ${providerName}
                        </p>
                        <div class="space-y-2">
                `;
                
                for (const model of models) {
                    const isSelected = model.id === wizard.model;
                    const isRecommended = model.id === wizard.model && wizard.goal;
                    
                    const recommendedBadge = isRecommended
                        ? `<span class="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded ml-1">✨ AI Selected</span>`
                        : '';
                    
                    html += `
                        <div class="p-2.5 rounded-lg cursor-pointer model-option transition-all ${isSelected ? 'border-2 border-purple-500 bg-purple-500/10' : 'border border-gray-700 hover:border-gray-500'}" 
                             data-model="${model.id}" onclick="selectModel('${model.id}')">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-medium">${model.name}</span>
                                ${recommendedBadge}
                            </div>
                        </div>
                    `;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = html;
            
            // Update model explanation
            if (wizard.modelReason) {
                const modelWhyEl = document.getElementById('model-why-text');
                if (modelWhyEl) {
                    modelWhyEl.textContent = wizard.modelReason;
                }
            }
        }
        
        function selectModel(modelId) {
            wizard.model = modelId;
            
            // Update UI
            document.querySelectorAll('.model-option').forEach(el => {
                const isSelected = el.dataset.model === modelId;
                if (el.dataset.model) {
                    el.className = 'p-2.5 rounded-lg cursor-pointer model-option transition-all ' + 
                        (isSelected ? 'border-2 border-purple-500 bg-purple-500/10' : 'border border-gray-700 hover:border-gray-500');
                }
            });
            
            // Update explanation
            updateModelExplanation(modelId, wizard.goal);
        }
        
        function updateModelExplanation(modelId, goal) {
            const modelWhyEl = document.getElementById('model-why-text');
            if (!modelWhyEl) return;
            
            // Use the API-provided model reason (100% dynamic)
            if (wizard.modelReason) {
                modelWhyEl.textContent = wizard.modelReason;
            } else {
                // If no reason yet, show simple message
                modelWhyEl.textContent = `${modelId} selected for your agent.`;
            }
        }
        
        function renderTasks() {
            const container = document.getElementById('w-tasks');
            if(!container) return;
            
            const tasks = wizard.tasks || [];
            
            if(tasks.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 text-gray-500">
                        <span class="text-5xl block mb-3">📋</span>
                        <p class="text-lg font-medium mb-1">No tasks defined yet</p>
                        <p class="text-sm">Click "+ Add Task" to create your first task</p>
                    </div>
                `;
                return;
            }
            
            // Clean card view - click to edit via modal
            container.innerHTML = tasks.map((task, idx) => `
                <div class="card rounded-lg p-4 hover:bg-gray-800/80 transition cursor-pointer group" id="task-${idx}" data-task-idx="${idx}" onclick="editTask(${idx})">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl shrink-0">
                            📋
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-semibold text-white truncate">${escHtml(task.name || 'Untitled Task')}</h4>
                                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                                    ${(task.instructions || []).length} steps
                                </span>
                            </div>
                            <p class="text-sm text-gray-400 line-clamp-2">${escHtml(task.description || 'No description')}</p>
                            ${(task.instructions || []).length > 0 ? `
                                <div class="mt-2 text-xs text-gray-500">
                                    <span class="text-blue-400">1.</span> ${escHtml((task.instructions[0] || '').slice(0, 60))}${(task.instructions[0] || '').length > 60 ? '...' : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onclick="event.stopPropagation(); editTask(${idx})" class="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition" title="Edit">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                                </svg>
                            </button>
                            <button onclick="event.stopPropagation(); removeTask(${idx})" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition" title="Delete">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        // Auto-save task field
        function autoSaveTask(taskIdx, field, value) {
            if (wizard.tasks[taskIdx]) {
                wizard.tasks[taskIdx][field] = value;
            }
        }
        
        // Auto-save instruction
        function autoSaveInstruction(taskIdx, instIdx, value) {
            if (wizard.tasks[taskIdx] && wizard.tasks[taskIdx].instructions) {
                wizard.tasks[taskIdx].instructions[instIdx] = value;
            }
        }
        
        function addTask() {
            saveCurrentTaskEdits();  // Save current edits first
            wizard.tasks.push({ name: '', description: '', instructions: [] });
            renderTasks();
        }
        
        function removeTask(idx) {
            saveCurrentTaskEdits();  // Save current edits first
            wizard.tasks.splice(idx, 1);
            renderTasks();
        }
        
        function addInstruction(taskIdx) {
            saveCurrentTaskEdits();  // Save current edits first
            if(!wizard.tasks[taskIdx].instructions) wizard.tasks[taskIdx].instructions = [];
            wizard.tasks[taskIdx].instructions.push('');
            renderTasks();
            
            // Focus on the new instruction input
            setTimeout(() => {
                const taskEl = document.getElementById(`task-${taskIdx}`);
                if (taskEl) {
                    const inputs = taskEl.querySelectorAll('.inst-text');
                    if (inputs.length > 0) {
                        inputs[inputs.length - 1].focus();
                    }
                }
            }, 100);
        }
        
        // Drag & Drop for Instructions
        let draggedInstruction = null;
        
        function handleInstructionDragStart(e) {
            draggedInstruction = e.target.closest('.instruction-item');
            draggedInstruction.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        }
        
        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const container = e.target.closest('.insts');
            if (!container) return;
            
            const afterElement = getDragAfterElement(container, e.clientY);
            const dragging = document.querySelector('.instruction-item.opacity-50');
            if (dragging) {
                if (afterElement == null) {
                    container.appendChild(dragging);
                } else {
                    container.insertBefore(dragging, afterElement);
                }
            }
        }
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.instruction-item:not(.opacity-50)')];
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        
        function handleDragEnd(e) {
            e.target.classList.remove('opacity-50');
            draggedInstruction = null;
        }
        
        function handleInstructionDrop(e, taskIdx) {
            e.preventDefault();
            
            // Get new order from DOM
            const container = document.getElementById(`instructions-${taskIdx}`);
            const items = container.querySelectorAll('.instruction-item');
            const newInstructions = [];
            
            items.forEach(item => {
                const input = item.querySelector('.inst-text');
                if (input) {
                    newInstructions.push(input.value);
                }
            });
            
            // Update wizard data
            wizard.tasks[taskIdx].instructions = newInstructions;
            
            // Re-render to update numbers
            renderTasks();
        }

        function removeInstructionOriginal(taskIdx, instIdx) {
            saveCurrentTaskEdits();  // Save current edits first
            wizard.tasks[taskIdx].instructions.splice(instIdx, 1);
            renderTasks();
        }
        
        // Alias for backward compatibility
        function removeInstruction(taskIdx, instIdx) {
            removeInstructionOriginal(taskIdx, instIdx);
        }
        
        // Save current task edits from DOM to wizard.tasks
        function saveCurrentTaskEdits() {
            const taskElements = document.querySelectorAll('#w-tasks > div[id^="task-"]');
            
            taskElements.forEach((taskEl, idx) => {
                if (wizard.tasks[idx]) {
                    // Save task name
                    const nameInput = taskEl.querySelector('.task-name');
                    if (nameInput) wizard.tasks[idx].name = nameInput.value;
                    
                    // Save task description
                    const descInput = taskEl.querySelector('.task-desc');
                    if (descInput) wizard.tasks[idx].description = descInput.value;
                    
                    // Save instructions
                    const instInputs = taskEl.querySelectorAll('.inst-text');
                    wizard.tasks[idx].instructions = [];
                    instInputs.forEach(input => {
                        wizard.tasks[idx].instructions.push(input.value);
                    });
                }
            });
        }
        
        function collectTasksNew() {
            console.log('=== collectTasksNew called ===');
            
            // ✨ NEW APPROACH: Tasks are saved directly to wizard.tasks via modal
            // Just ensure tasks array exists and has valid data
            if (!wizard.tasks) {
                wizard.tasks = [];
            }
            
            // Clean up any empty tasks
            wizard.tasks = wizard.tasks.filter(task => task && task.name && task.name.trim());
            
            // Ensure all tasks have IDs
            wizard.tasks.forEach((task, idx) => {
                if (!task.id) {
                    task.id = `task_${Date.now()}_${idx}`;
                }
            });
            
            console.log('Tasks from wizard.tasks:', wizard.tasks.length);
            console.log('Task names:', wizard.tasks.map(t => t.name));
            
            // Sync task permissions - ensure all tasks have default permissions
            syncTaskPermissions();
        }
        
        // Sync task permissions with current tasks
        function syncTaskPermissions() {
            const tasks = wizard.tasks || [];
            
            // Add default permissions for new tasks
            tasks.forEach(task => {
                const taskId = task.id;
                const defaultKey = `${taskId}:default`;
                
                // If no permission exists for this task, set default to allowed
                if (wizardAccessState.taskPermissions[defaultKey] === undefined) {
                    wizardAccessState.taskPermissions[defaultKey] = true;
                }
            });
            
            console.log('Task permissions synced for', tasks.length, 'tasks');
        }
        
        // Tools with business explanations
        // Base tool info - will be customized based on agent goal
        const baseToolInfo = {
            knowledge: { icon: '🧠', name: 'Knowledge Base' },
            database: { icon: '🗄️', name: 'Database' },
            email: { icon: '📧', name: 'Email' },
            calendar: { icon: '📅', name: 'Calendar' },
            crm: { icon: '🎯', name: 'CRM' },
            websearch: { icon: '🔍', name: 'Web Search' },
            code: { icon: '💻', name: 'Code Execution' },
            slack: { icon: '💬', name: 'Messaging' },
            api: { icon: '🔌', name: 'API Integration' },
            webhook: { icon: '🔗', name: 'Webhooks' },
            website: { icon: '🌐', name: 'Website' },
            ocr: { icon: '🧾', name: 'Document Reading' }
        };
        
        // Generate dynamic tool info based on agent goal
        function getToolBusinessInfo(toolType) {
            const base = baseToolInfo[toolType] || { icon: '🔧', name: toolType };
            const goal = (wizard.goal || wizard.originalGoal || '').toLowerCase();
            const agentName = wizard.name || 'Agent';
            
            // Dynamic descriptions based on goal context
            const contextualInfo = {
                knowledge: getKnowledgeInfo(goal, agentName),
                database: getDatabaseInfo(goal, agentName),
                email: getEmailInfo(goal, agentName),
                calendar: getCalendarInfo(goal, agentName),
                crm: getCrmInfo(goal, agentName),
                websearch: getWebSearchInfo(goal, agentName),
                code: getCodeInfo(goal, agentName),
                slack: getSlackInfo(goal, agentName)
            };
            
            return { ...base, ...contextualInfo[toolType] } || base;
        }
        
        function getKnowledgeInfo(goal, agentName) {
            if(goal.includes('customer') || goal.includes('support')) {
                return {
                    businessDesc: 'Access support documentation and FAQs',
                    examples: ['Support articles', 'Troubleshooting guides', 'Return policies', 'Product manuals'],
                    benefit: `${agentName} can answer customer questions using your support docs`
                };
            } else if(goal.includes('sales') || goal.includes('product')) {
                return {
                    businessDesc: 'Product information and sales materials',
                    examples: ['Product specs', 'Pricing sheets', 'Competitive analysis', 'Sales playbooks'],
                    benefit: `${agentName} can provide accurate product info to close deals`
                };
            } else if(goal.includes('hr') || goal.includes('employee')) {
                return {
                    businessDesc: 'HR policies and employee resources',
                    examples: ['Employee handbook', 'Benefits guide', 'Leave policies', 'Onboarding docs'],
                    benefit: `${agentName} can answer HR questions accurately`
                };
            } else if(goal.includes('research') || goal.includes('analysis')) {
                return {
                    businessDesc: 'Research documents and data sources',
                    examples: ['Research papers', 'Market reports', 'Data sets', 'Analysis templates'],
                    benefit: `${agentName} can reference existing research for better insights`
                };
            } else if(goal.includes('code') || goal.includes('developer')) {
                return {
                    businessDesc: 'Technical documentation and code references',
                    examples: ['API docs', 'Code standards', 'Architecture guides', 'Best practices'],
                    benefit: `${agentName} can provide consistent coding guidance`
                };
            }
            return {
                businessDesc: 'Your organization\'s documents and information',
                examples: ['Documentation', 'Guidelines', 'Procedures', 'Reference materials'],
                benefit: `${agentName} can answer questions using your content`
            };
        }
        
        function getDatabaseInfo(goal, agentName) {
            if(goal.includes('customer') || goal.includes('order')) {
                return {
                    businessDesc: 'Customer and order data access',
                    examples: ['Order status', 'Customer history', 'Shipping info', 'Payment records'],
                    benefit: `${agentName} can look up real-time order and customer info`
                };
            } else if(goal.includes('sales')) {
                return {
                    businessDesc: 'Sales and inventory data',
                    examples: ['Stock levels', 'Pricing', 'Discounts', 'Sales history'],
                    benefit: `${agentName} can check availability and pricing instantly`
                };
            } else if(goal.includes('hr') || goal.includes('employee')) {
                return {
                    businessDesc: 'Employee and HR records',
                    examples: ['Leave balances', 'Employee profiles', 'Attendance', 'Payroll info'],
                    benefit: `${agentName} can access employee data securely`
                };
            }
            return {
                businessDesc: 'Connect to your business databases',
                examples: ['Records lookup', 'Data queries', 'Status checks', 'History retrieval'],
                benefit: `${agentName} can fetch real-time data from your systems`
            };
        }
        
        function getEmailInfo(goal, agentName) {
            if(goal.includes('customer') || goal.includes('support')) {
                return {
                    businessDesc: 'Send support emails and confirmations',
                    examples: ['Ticket updates', 'Resolution confirmations', 'Follow-ups', 'Satisfaction surveys'],
                    benefit: `${agentName} can send timely support communications`
                };
            } else if(goal.includes('sales')) {
                return {
                    businessDesc: 'Sales outreach and follow-ups',
                    examples: ['Quote emails', 'Follow-up sequences', 'Meeting requests', 'Proposal delivery'],
                    benefit: `${agentName} can maintain sales momentum with timely emails`
                };
            } else if(goal.includes('hr')) {
                return {
                    businessDesc: 'HR communications and notifications',
                    examples: ['Policy updates', 'Leave approvals', 'Onboarding emails', 'Announcements'],
                    benefit: `${agentName} can handle routine HR communications`
                };
            }
            return {
                businessDesc: 'Automated email communications',
                examples: ['Notifications', 'Confirmations', 'Reports', 'Alerts'],
                benefit: `${agentName} can send emails automatically`
            };
        }
        
        function getCalendarInfo(goal, agentName) {
            if(goal.includes('sales') || goal.includes('meeting')) {
                return {
                    businessDesc: 'Schedule sales meetings and demos',
                    examples: ['Demo bookings', 'Follow-up calls', 'Team syncs', 'Client meetings'],
                    benefit: `${agentName} can book meetings without back-and-forth`
                };
            } else if(goal.includes('hr') || goal.includes('interview')) {
                return {
                    businessDesc: 'Manage interviews and HR appointments',
                    examples: ['Interview scheduling', '1:1 meetings', 'Training sessions', 'Reviews'],
                    benefit: `${agentName} can coordinate HR schedules efficiently`
                };
            }
            return {
                businessDesc: 'Schedule and manage appointments',
                examples: ['Meeting booking', 'Availability checks', 'Reminders', 'Rescheduling'],
                benefit: `${agentName} can manage calendar tasks automatically`
            };
        }
        
        function getCrmInfo(goal, agentName) {
            return {
                businessDesc: 'Customer relationship management',
                examples: ['Contact lookup', 'Deal tracking', 'Interaction history', 'Lead info'],
                benefit: `${agentName} can personalize interactions with CRM data`
            };
        }
        
        function getWebSearchInfo(goal, agentName) {
            if(goal.includes('research') || goal.includes('analysis')) {
                return {
                    businessDesc: 'Research current information online',
                    examples: ['Market data', 'News articles', 'Competitor info', 'Industry trends'],
                    benefit: `${agentName} can find up-to-date information for research`
                };
            }
            return {
                businessDesc: 'Search the web for current information',
                examples: ['Latest updates', 'External data', 'News', 'Public information'],
                benefit: `${agentName} can access current web information`
            };
        }
        
        function getCodeInfo(goal, agentName) {
            if(goal.includes('code') || goal.includes('developer') || goal.includes('programming')) {
                return {
                    businessDesc: 'Execute and test code',
                    examples: ['Code testing', 'Script execution', 'Debugging', 'Code generation'],
                    benefit: `${agentName} can run and validate code directly`
                };
            }
            return {
                businessDesc: 'Run calculations and scripts',
                examples: ['Data processing', 'Calculations', 'Transformations', 'Automation'],
                benefit: `${agentName} can perform complex computations`
            };
        }
        
        function getSlackInfo(goal, agentName) {
            return {
                businessDesc: 'Team notifications and alerts',
                examples: ['Escalations', 'Status updates', 'Alerts', 'Team notifications'],
                benefit: `${agentName} can notify your team when needed`
            };
        }
        
        // Simple object for backward compatibility
        function getAllToolBusinessInfo() {
            const result = {};
            Object.keys(baseToolInfo).forEach(key => {
                result[key] = getToolBusinessInfo(key);
            });
            return result;
        }
        
        // Selected tools for the agent - ALL types
        let selectedDemoTools = {
            apis: [],
            knowledge_bases: [],
            emails: [],
            webhooks: [],
            slacks: [],
            calendars: [],
            databases: [],
            websearches: [],
            websites: []
        };
        
        // Temporary selection in modal
        let tempToolSelection = {
            apis: [],
            knowledge_bases: [],
            emails: [],
            webhooks: [],
            slacks: [],
            calendars: [],
            databases: [],
            websearches: [],
            websites: []
        };
        
        // Flag to return to wizard after creating tool
        let returnToWizardAfterTool = false;
        
        // Auto-save agent data
        async function autoSaveAgent() {
            if (!wizard.editId) return; // Only auto-save if editing existing agent
            
            try {
                // Collect all current data
                collectToolsNew();
                collectGuardrails();
                
                const agentData = {
                    name: wizard.name || 'Untitled Agent',
                    icon: wizard.icon || '🤖',
                    goal: wizard.goal || '',
                    tasks: wizard.tasks || [],
                    tool_ids: wizard.tool_ids || [],
                    guardrails: wizard.guardrails || {},
                    personality: wizard.personality || {},
                    model_id: wizard.model || 'gpt-4o',
                    status: 'draft'
                };
                
                await fetch(API + `/api/agents/${wizard.editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agentData)
                });
                
                console.log('✅ Agent auto-saved');
            } catch (e) {
                console.error('Auto-save failed:', e);
            }
        }
        
        // Debounced auto-save
        let autoSaveTimeout = null;
        function triggerAutoSave() {
            if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(autoSaveAgent, 2000); // Save after 2 seconds of no changes
        }
        
        // Show select tool modal
        async function showSelectToolModal() {
            const modal = document.getElementById('select-tool-modal');
            if (!modal) return;
            ensureModalInBody('select-tool-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            // Reset temp selection to current selection
            tempToolSelection = {
                apis: [...selectedDemoTools.apis],
                knowledge_bases: [...selectedDemoTools.knowledge_bases],
                emails: [...selectedDemoTools.emails],
                webhooks: [...selectedDemoTools.webhooks],
                slacks: [...selectedDemoTools.slacks],
                calendars: [...selectedDemoTools.calendars],
                databases: [...selectedDemoTools.databases],
                websearches: [...selectedDemoTools.websearches],
                websites: [...selectedDemoTools.websites]
            };
            
            await loadToolsForModal();
        }
        
        // Close select tool modal
        function closeSelectToolModal() {
            document.getElementById('select-tool-modal').classList.add('hidden');
            document.getElementById('select-tool-modal').classList.remove('flex');
        }
        
        // Load tools into modal
        async function loadToolsForModal() {
            const container = document.getElementById('available-tools-list');
            
            try {
                // Use /api/tools to show all tools the user can VIEW.
                // The API also returns can_execute, so we can prevent selecting tools the user can't run.
                const response = await fetch(API + '/api/tools', { headers: getAuthHeaders() });
                let data = null;
                try { data = await response.json(); } catch (_) { data = null; }
                
                if (!response.ok) {
                    const msg = (data && (data.detail || data.message || data.error))
                        ? (data.detail || data.message || data.error)
                        : (response.status === 401 ? 'Please sign in to see your tools.' : (response.statusText || 'Failed to load tools'));
                    container.innerHTML = `
                        <div class="text-center py-6 text-red-400">
                            <p>${escHtml(String(msg || 'Failed to load tools'))}</p>
                            <button onclick="loadToolsForModal()" class="text-sm text-purple-400 mt-2">Retry</button>
                        </div>
                    `;
                    return;
                }
                
                const tools = Array.isArray(data) ? data : (data && data.tools) ? data.tools : [];
                
                if (tools.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-8 bg-gray-800/30 rounded-xl">
                            <span class="text-4xl block mb-3">🔧</span>
                            <p class="text-gray-400 mb-2">No tools available yet</p>
                            <p class="text-sm text-gray-500">Create tools in the Tools page or Demo Lab first</p>
                        </div>
                    `;
                    return;
                }
                
                const _normToolType = (tool) => {
                    const raw = String(tool?.type || '').toLowerCase().trim();
                    return raw.replace(/[\s_-]+/g, '');
                };
                
                // Group by type
                const apis = tools.filter(t => _normToolType(t) === 'api');
                const kbs = tools.filter(t => {
                    const nt = _normToolType(t);
                    return nt === 'knowledge' || nt === 'document' || nt === 'knowledgebase' || nt === 'kb';
                });
                const emails = tools.filter(t => _normToolType(t) === 'email');
                const webhooks = tools.filter(t => _normToolType(t) === 'webhook');
                const websearches = tools.filter(t => {
                    const nt = _normToolType(t);
                    return nt === 'websearch' || nt === 'search' || nt === 'websearchtool';
                });
                const slacks = tools.filter(t => _normToolType(t) === 'slack');
                const calendars = tools.filter(t => _normToolType(t) === 'calendar');
                const databases = tools.filter(t => {
                    const nt = _normToolType(t);
                    return nt === 'database' || nt === 'db';
                });
                const websites = tools.filter(t => _normToolType(t) === 'website');
                const otherTools = tools.filter(t => {
                    const nt = _normToolType(t);
                    return !['api','knowledge','document','knowledgebase','kb','email','webhook','websearch','search','websearchtool','slack','calendar','database','db','website'].includes(nt);
                });
                
                let html = '';
                
                // Helper function to render tool section
                const renderToolSection = (toolList, icon, title, color, typeKey) => {
                    if (toolList.length === 0) return '';
                    
                    // Map typeKey to tempToolSelection array
                    const typeToArray = {
                        'api': 'apis',
                        'kb': 'knowledge_bases',
                        'email': 'emails',
                        'webhook': 'webhooks',
                        'slack': 'slacks',
                        'calendar': 'calendars',
                        'database': 'databases',
                        'websearch': 'websearches',
                        'website': 'websites'
                    };
                    const arrayKey = typeToArray[typeKey] || 'apis';
                    
                    let sectionHtml = `
                        <div class="mb-4">
                            <h5 class="text-sm font-medium text-${color}-400 mb-3 flex items-center gap-2">
                                <span>${icon}</span> ${title}
                                <span class="text-xs bg-${color}-500/20 px-2 py-0.5 rounded-full">${toolList.length}</span>
                            </h5>
                            <div class="space-y-2">
                    `;
                    
                    for (const tool of toolList) {
                        const canExecute = (tool && Object.prototype.hasOwnProperty.call(tool, 'can_execute')) ? !!tool.can_execute : true;
                        const isSelected = (tempToolSelection[arrayKey] || []).some(t => t.id === tool.id);
                        const disabledClass = canExecute ? '' : ' opacity-60 cursor-not-allowed';
                        const badgeNoAccess = canExecute ? '' : `<span class="text-xs bg-gray-700/60 text-gray-300 px-2 py-0.5 rounded">No access</span>`;
                        sectionHtml += `
                            <div class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-' + color + '-500/20 border border-' + color + '-500/50' : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'}${disabledClass}"
                                 onclick="toggleModalToolSelection('${typeKey}', '${tool.id}', this, '${color}')" data-tool-id="${tool.id}">
                                <input type="checkbox" class="w-4 h-4 rounded" ${isSelected ? 'checked' : ''} ${canExecute ? '' : 'disabled'}>
                                <span class="text-xl">${icon}</span>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm truncate">${escHtml(tool.name)}</p>
                                    <p class="text-xs text-gray-500 truncate">${escHtml(tool.description || 'No description')}</p>
                                </div>
                                ${badgeNoAccess}
                                ${tool.config?.source === 'demo_kit' ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Demo</span>' : ''}
                            </div>
                        `;
                    }
                    
                    sectionHtml += `</div></div>`;
                    return sectionHtml;
                };
                
                // APIs
                html += renderToolSection(apis, '🔌', 'APIs', 'purple', 'api');
                
                // Knowledge Bases
                html += renderToolSection(kbs, '🧠', 'Knowledge Bases', 'blue', 'kb');
                
                // Email
                html += renderToolSection(emails, '📧', 'Email', 'green', 'email');
                
                // Webhooks
                html += renderToolSection(webhooks, '🔗', 'Webhooks', 'yellow', 'webhook');
                
                // Web Search
                html += renderToolSection(websearches, '🔍', 'Web Search', 'cyan', 'websearch');
                
                // Slack
                html += renderToolSection(slacks, '💬', 'Slack', 'pink', 'slack');
                
                // Calendar
                html += renderToolSection(calendars, '📅', 'Calendar', 'orange', 'calendar');
                
                // Database
                html += renderToolSection(databases, '🗄️', 'Database', 'indigo', 'database');
                
                // Websites
                html += renderToolSection(websites, '🌐', 'Websites', 'teal', 'website');
                
                // Other tools (still selectable if can_execute=true)
                html += renderToolSection(otherTools, '🧩', 'Other', 'gray', 'api');
                
                container.innerHTML = html || `
                    <div class="text-center py-8 bg-gray-800/30 rounded-xl">
                        <span class="text-4xl block mb-3">🔧</span>
                        <p class="text-gray-400 mb-2">No tools matched the supported categories</p>
                        <p class="text-sm text-gray-500">Your tools are available, but their type is not recognized by the UI yet.</p>
                    </div>
                `;
                
                // Store tool data for reference
                container._toolsData = tools;
                
            } catch (e) {
                console.error('Failed to load tools:', e);
                container.innerHTML = `
                    <div class="text-center py-6 text-red-400">
                        <p>Failed to load tools</p>
                        <button onclick="loadToolsForModal()" class="text-sm text-purple-400 mt-2">Retry</button>
                    </div>
                `;
            }
        }
