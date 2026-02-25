// Extracted from ui/index_parts/app-features.js
// Chunk: features-demo-tools.js
// Loaded via defer in ui/index.html; do not reorder.

// Auto-generated from ui/index.js
// Part 005: lines 10347-25862
// DO NOT reorder parts.

        function addDemoMessage(role, content, isTemp = false) {
            const container = document.getElementById('demo-chat-messages');
            const id = 'demo-msg-' + Date.now();
            
            const msgDiv = document.createElement('div');
            msgDiv.id = id;
            msgDiv.className = role === 'user' 
                ? 'flex justify-end' 
                : 'flex justify-start';
            
            const bgColor = role === 'user' ? 'bg-gradient-to-r from-purple-600 to-purple-700' : 'bg-gray-800';
            
            msgDiv.innerHTML = `
                <div class="${bgColor} rounded-2xl px-4 py-3 max-w-[80%] shadow-lg">
                    ${role === 'assistant' ? '<span class="text-lg mr-2">🤖</span>' : ''}
                    <div class="text-sm ${role === 'user' ? '' : 'prose prose-invert prose-sm max-w-none'}">${content}</div>
                </div>
            `;
            
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
            
            return id;
        }

        function addDemoActionButtons(generated) {
            const container = document.getElementById('demo-chat-messages');
            
            console.log('[Demo Lab] Generated item:', generated);
            
            if (!generated) {
                console.log('[Demo Lab] No generated item');
                return;
            }
            
            // For documents/images, check if URL exists
            if ((generated.type === 'document' || generated.type === 'image') && !generated.url) {
                console.log('[Demo Lab] No URL for generated item:', generated);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'flex justify-start';
                errorDiv.innerHTML = `
                    <div class="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 mt-2">
                        ⚠️ Generation may have failed. Check server logs for details.
                    </div>
                `;
                container.appendChild(errorDiv);
                return;
            }
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'flex justify-start';
            
            let buttons = '';
            const fullUrl = generated.url ? (generated.url.startsWith('http') ? generated.url : API + generated.url) : '';
            
            if (generated.type === 'api') {
                const apiUrl = generated.url ? (generated.url.startsWith('http') ? generated.url : API + generated.url) : API + '/demo-api/' + generated.name;
                buttons = `
                    <button onclick="createToolFromDemo('${generated.id}')" class="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        ✨ Create API Tool
                    </button>
                    <a href="${apiUrl}" target="_blank" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        🔗 Test API
                    </a>
                `;
            } else if (generated.type === 'document') {
                buttons = `
                    <a href="${fullUrl}" download class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                        ⬇️ Download ${generated.name || 'Document'}
                    </a>
                    <a href="${fullUrl}" target="_blank" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        👁️ Preview
                    </a>
                `;
            } else if (generated.type === 'image') {
                buttons = `
                    <a href="${fullUrl}" download class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        ⬇️ Download Image
                    </a>
                    <a href="${fullUrl}" target="_blank" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        👁️ View Full Size
                    </a>
                `;
            }
            
            actionsDiv.innerHTML = `
                <div class="flex gap-2 mt-3 ml-2">
                    ${buttons}
                </div>
            `;
            
            container.appendChild(actionsDiv);
            container.scrollTop = container.scrollHeight;
        }

        async function createToolFromDemo(demoApiId) {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (typeof getAuthHeaders === 'function') Object.assign(headers, getAuthHeaders());
                const response = await fetch(API + '/api/demo/create-tool', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ demo_id: demoApiId })
                });
                
                const data = await response.json();
                
                if (response.status === 401) {
                    addDemoMessage('assistant', '⚠️ ' + (data.detail || 'Please sign in to create a tool from Demo Lab. You will be the owner and can edit or delete it later.'));
                    return;
                }
                if (data.success) {
                    addDemoMessage('assistant', `✅ API Tool "${data.tool_name}" created successfully! You can now assign it to any agent and you are the owner (you can edit or delete it).`);
                    loadTools();
                } else {
                    addDemoMessage('assistant', '❌ Failed to create tool: ' + (data.error || 'Unknown error'));
                }
            } catch (e) {
                addDemoMessage('assistant', '❌ Error: ' + e.message);
            }
        }

        async function createDocToolFromDemo(demoDocId) {
            addDemoMessage('assistant', '📄 To add this document to a tool, go to Tools and upload it there.');
        }

        function clearDemoChat() {
            demoConversation = [];
            const container = document.getElementById('demo-chat-messages');
            container.innerHTML = `
                <div class="text-center text-gray-500 py-6" id="demo-welcome">
                    <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                        <span class="text-4xl">🧪</span>
                    </div>
                    <p class="text-lg font-medium mb-2">Welcome to Demo Lab!</p>
                    <p class="text-sm mb-6 text-gray-400">Generate instant mock APIs, professional documents & images</p>
                    <p class="text-xs text-gray-500">Select a mode above and type your request below</p>
                </div>
            `;
        }
        // ============================================================================
        // END DEMO LAB FUNCTIONS
        // ============================================================================

        function setAgentTab(t){
            agentTab=t;
            document.getElementById('tab-published').className='tab-btn pb-3 px-2 border-b-2 whitespace-nowrap '+(t==='published'?'active border-purple-500':'border-transparent');
            document.getElementById('tab-draft').className='tab-btn pb-3 px-2 border-b-2 whitespace-nowrap '+(t==='draft'?'active border-purple-500':'border-transparent');
            loadAgents();
        }

        async function loadAgents(){
            const r=await fetch(API+'/api/agents?status='+agentTab, {
                headers: getAuthHeaders()
            });
            const d=await r.json();
            
            // Separate agents by type
            const workflowAgents = d.agents.filter(a => a.agent_type === 'process');
            const conversationalAgents = d.agents.filter(a => a.agent_type !== 'process');
            
            // Get containers
            const workflowSection = document.getElementById('workflow-agents-section');
            const workflowGrid = document.getElementById('workflow-agents-grid');
            const conversationalSection = document.getElementById('conversational-agents-section');
            const conversationalGrid = document.getElementById('conversational-agents-grid');
            
            // Update counts
            document.getElementById('workflow-count').textContent = workflowAgents.length;
            document.getElementById('conversational-count').textContent = conversationalAgents.length;
            
            // Handle empty state
            if(!d.agents.length){
                workflowSection.classList.add('hidden');
                conversationalGrid.innerHTML=`<div class="col-span-full text-center py-10 md:py-20 text-gray-500">
                    <img src="/AgentForge_Logo.png" alt="AgentForge" class="w-20 h-20 mx-auto mb-4 opacity-50">
                    <p class="mb-4">No ${agentTab} agents yet</p>
                    <button onclick="navigate('create')" class="btn-primary px-4 py-2 rounded-lg">Create Your First Agent</button>
                </div>`;
                return;
            }
            
            // Render Workflow Agents (different card design)
            if (workflowAgents.length > 0) {
                workflowSection.classList.remove('hidden');
                workflowGrid.innerHTML = workflowAgents.map(a => `
                    <div class="card rounded-xl overflow-hidden hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer group" 
                         style="background: linear-gradient(135deg, rgba(34,197,94,0.05), rgba(20,184,166,0.05)); border: 1px solid rgba(34,197,94,0.2);"
                         onclick="openAgent('${a.id}', '${a.status}', 'process')">
                        <!-- Header with gradient -->
                        <div class="p-4" style="background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(20,184,166,0.15));">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-2xl shadow-lg">
                                    🔄
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-white truncate">${a.name}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Workflow</span>
                                        <span class="text-xs px-2 py-0.5 rounded-full ${a.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">${a.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Body -->
                        <div class="p-4">
                            <p class="text-sm text-gray-400 line-clamp-2 mb-4">${a.goal}</p>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-4 text-xs text-gray-500">
                                    <span>⚡ Automation</span>
                                    <span>🔧 ${a.tools_count} tools</span>
                                </div>
                                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    ${a.status === 'published' ? `<button onclick="event.stopPropagation();openProcessExecution('${a.id}')" class="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm" title="Run">▶️</button>` : ''}
                                    <button onclick="event.stopPropagation();editAgent('${a.id}')" class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm" title="Edit">✏️</button>
                                    ${a.is_owner ? `<button onclick="event.stopPropagation();deleteAgent('${a.id}')" class="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm" title="Delete">🗑️</button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                workflowSection.classList.add('hidden');
            }
            
            // Render Conversational Agents (original design with purple theme)
            if (conversationalAgents.length > 0) {
                conversationalSection.classList.remove('hidden');
                conversationalGrid.innerHTML = conversationalAgents.map(a => `
                    <div class="card agent-card rounded-xl p-4 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer group" 
                         style="min-width:0;overflow:visible;"
                         onclick="openAgent('${a.id}', '${a.status}', 'conversational')">
                        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl flex-shrink-0">
                                ${a.icon || '🤖'}
                            </div>
                            <div style="flex:1;min-width:0;overflow:hidden;width:100%;">
                                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <h3 class="agent-title" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${a.name}</h3>
                                    <span class="text-xs px-2 py-0.5 rounded-full ${a.status === 'published' ? 'bg-purple-500/20 text-purple-400' : 'bg-yellow-500/20 text-yellow-400'}">${a.status}</span>
                                </div>
                                <p class="agent-desc text-sm text-gray-400 mt-1 line-clamp-2">${a.goal}</p>
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px;">
                            <div class="agent-stats" style="display:flex;gap:16px;font-size:0.75rem;color:var(--text-secondary);">
                                <span>📋 ${a.tasks_count} tasks</span>
                                <span>🔧 ${a.tools_count} tools</span>
                            </div>
                            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                ${a.status === 'published' ? `<button onclick="event.stopPropagation();openAgent('${a.id}', 'published', 'conversational')" class="p-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm" title="Chat">💬</button>` : ''}
                                ${a.status === 'draft' ? `<button data-permission="agents:publish" onclick="event.stopPropagation();publishAgent('${a.id}')" class="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm" title="Publish">🚀</button>` : ''}
                                <button data-permission="agents:edit" onclick="event.stopPropagation();editAgent('${a.id}')" class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm" title="Edit">✏️</button>
                                ${a.is_owner ? `<button data-permission="agents:delete" onclick="event.stopPropagation();deleteAgent('${a.id}')" class="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm" title="Delete">🗑️</button>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                conversationalGrid.innerHTML = `<div class="col-span-full text-center py-6 text-gray-500">
                    <p>No conversational agents yet</p>
                </div>`;
            }
        }

        async function openAgent(id, status, agentType = 'conversational'){
            try {
                // For process/workflow agents, open the process execution UI
                if (agentType === 'process' && status === 'published') {
                    openProcessExecution(id);
                    return;
                }
                
                if(status === 'published'){
                    // Open chat for published conversational agents
                    // Skip auto-load in navigate, we'll load manually
                    window._skipChatAgentLoad = true;
                    navigate('chat', true);
                    // Flag is cleared by navigate() after checking
                    
                    // Wait for agents to load before selecting
                    const agents = await loadChatAgents();
                    
                    // Set the agent value
                    const agentSelect = document.getElementById('chat-agent');
                    if (agentSelect) {
                        agentSelect.value = id;
                        // Verify the value was set
                        if (agentSelect.value !== id) {
                            // Agent not in accessible list - this can happen if user doesn't have chat access
                            // Try to add it manually or show error
                            const agentInList = agents && agents.find(a => a.id === id);
                            if (!agentInList) {
                                showToast('You do not have access to chat with this agent', 'error');
                                return;
                            }
                            // If agent is in list but value didn't set, try again
                            agentSelect.value = id;
                        }
                        // Trigger change and start chat
                        await onAgentChange();
                    } else {
                        showToast('Chat interface not ready. Please try again.', 'error');
                    }
                } else {
                    // Open edit for draft agents
                    editAgent(id);
                }
            } catch (err) {
                console.error('openAgent error:', err);
                showToast('Failed to open agent: ' + err.message, 'error');
            }
        }
        
        async function editAgent(id){
            // Fetch agent details with auth
            const r = await fetch(API+'/api/agents/'+id, {
                headers: getAuthHeaders()
            });
            const agent = await r.json();
            
            console.log('📝 Editing agent:', id);
            console.log('📝 Agent type:', agent.agent_type);
            console.log('📝 Full agent:', agent);
            
            // For process/workflow agents, open the visual process editor
            if (agent.agent_type === 'process') {
                console.log('📝 Opening Process Editor for workflow agent');
                openProcessEditor(agent);
                return;
            }
            
            console.log('📝 Opening Conversational Wizard for agent');
            
            // Fetch user's permissions for this agent
            let userPermissions = null;
            console.log('🔐🔐🔐 FETCHING USER PERMISSIONS 🔐🔐🔐');
            console.log('🔐 Agent ID:', id);
            console.log('🔐 Current User:', currentUser?.id, currentUser?.email);
            try {
                const permUrl = API+'/api/agents/'+id+'/my-permissions';
                console.log('🔐 Fetching permissions from:', permUrl);
                const permRes = await fetch(permUrl, {
                    headers: getAuthHeaders()
                });
                console.log('🔐 Permissions response status:', permRes.status);
                if (permRes.ok) {
                    userPermissions = await permRes.json();
                    console.log('🔐🔐🔐 USER PERMISSIONS RECEIVED 🔐🔐🔐');
                    console.log('🔐 Full permissions object:', JSON.stringify(userPermissions, null, 2));
                    console.log('🔐 is_owner:', userPermissions.is_owner);
                    console.log('🔐 permissions array:', userPermissions.permissions);
                    console.log('🔐 can_edit_model:', userPermissions.can_edit_model);
                    console.log('🔐 can_edit_guardrails:', userPermissions.can_edit_guardrails);
                    console.log('🔐 can_manage_tools:', userPermissions.can_manage_tools);
                    console.log('🔐 can_publish:', userPermissions.can_publish);
                } else if (permRes.status === 403) {
                    // User doesn't have any access - show read-only
                    console.warn('⚠️ No management access to this agent - read-only mode');
                    userPermissions = {
                        is_owner: false,
                        is_admin: false,
                        permissions: [],
                        can_edit_basic_info: false,
                        can_edit_personality: false,
                        can_edit_model: false,
                        can_edit_guardrails: false,
                        can_manage_tasks: false,
                        can_manage_tools: false,
                        can_manage_knowledge: false,
                        can_manage_access: false,
                        can_manage_task_permissions: false,
                        can_publish: false,
                        can_delete: false,
                        _read_only: true
                    };
                    showToast('You have read-only access to this agent', 'warning');
                } else {
                    console.warn('⚠️ Could not fetch permissions, response:', permRes.status);
                    // Still try to use agent owner/created_by to determine if owner
                    const currentUserId = currentUser?.id || '';
                    const isOwner = agent.owner_id === currentUserId || agent.created_by === currentUserId;
                    if (isOwner) {
                        userPermissions = {
                            is_owner: true,
                            permissions: ['full_admin'],
                            can_edit_basic_info: true,
                            can_edit_personality: true,
                            can_edit_model: true,
                            can_edit_guardrails: true,
                            can_manage_tasks: true,
                            can_manage_tools: true,
                            can_manage_knowledge: true,
                            can_manage_access: true,
                            can_manage_task_permissions: true,
                            can_publish: true,
                            can_delete: true
                        };
                    } else {
                        // Not owner and can't get permissions - read-only
                        userPermissions = {
                            is_owner: false,
                            permissions: [],
                            can_edit_basic_info: false,
                            can_edit_personality: false,
                            can_edit_model: false,
                            can_edit_guardrails: false,
                            can_manage_tasks: false,
                            can_manage_tools: false,
                            can_manage_knowledge: false,
                            can_manage_access: false,
                            can_manage_task_permissions: false,
                            can_publish: false,
                            can_delete: false,
                            _read_only: true
                        };
                    }
                }
            } catch (e) {
                console.error('❌ Error fetching permissions:', e);
                // Check if owner from agent data
                const currentUserId = currentUser?.id || '';
                const isOwner = agent.owner_id === currentUserId || agent.created_by === currentUserId;
                userPermissions = isOwner 
                    ? { is_owner: true, permissions: ['full_admin'], can_edit_basic_info: true, can_edit_personality: true, can_edit_model: true, can_edit_guardrails: true, can_manage_tasks: true, can_manage_tools: true, can_manage_knowledge: true, can_manage_access: true, can_manage_task_permissions: true, can_publish: true, can_delete: true }
                    : { is_owner: false, permissions: [], can_edit_basic_info: false, can_edit_personality: false, can_edit_model: false, can_edit_guardrails: false, can_manage_tasks: false, can_manage_tools: false, can_manage_knowledge: false, can_manage_access: false, can_manage_task_permissions: false, can_publish: false, can_delete: false, _read_only: true };
            }
            
            // First, show the create page WITHOUT resetting
            // Hide all pages
            document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
            document.getElementById('page-create').classList.remove('hidden');
            
            // Update nav
            document.querySelectorAll('.sidebar-item, .mobile-nav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('nav-create')?.classList.add('active');
            
            // Process tasks - convert instruction objects to strings
            const tasks = (agent.tasks || []).map(task => ({
                name: task.name || '',
                description: task.description || '',
                instructions: (task.instructions || []).map(inst => 
                    typeof inst === 'string' ? inst : (inst.text || '')
                )
            }));
            
            // Store agent ID for update
            wizard.editId = id;
            wizard.id = id;  // Also store as id for access control functions
            wizard.owner_id = agent.owner_id || null;  // For ownership check
            wizard.created_by = agent.created_by || null;  // For ownership check
            wizard.userPermissions = userPermissions;  // Store user permissions
            wizard.originalStatus = agent.status || 'draft';  // Store original status for cancel
            wizard.name = agent.name || '';
            wizard.icon = agent.icon || '';
            wizard.goal = agent.goal || '';
            wizard.model = agent.model_id || '';
            wizard.modelReason = agent.model_reason || '';
            wizard.tasks = tasks;
            wizard.tool_ids = agent.tool_ids || [];
            wizard.generatedTools = [];
            wizard.guardrails = agent.guardrails || {};
            wizard.accessControl = agent.access_control || null;
            
            // Also load access control from API if available
            await loadAgentAccessControl(id);
            
            // Load agent admins (for delegation UI)
            await loadAgentAdmins(id);
            
            // Load personality from agent
            wizard.personality = agent.personality || null;
            wizard.personalityReason = agent.personality_reason || '';
            
            // Load tools into selectedDemoTools for UI display
            await loadAgentToolsToSelection(agent.tool_ids || [], agent.tools || []);
            
            // Set basic info in form
            document.getElementById('w-name').value = wizard.name;
            document.getElementById('w-icon').value = wizard.icon;
            document.getElementById('w-goal').value = wizard.goal;
            
            // Apply personality to sliders if exists
            if (wizard.personality) {
                const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
                traits.forEach(trait => {
                    const val = wizard.personality[trait];
                    if (val !== undefined) {
                        const slider = document.getElementById(`p-${trait}`);
                        const numInput = document.getElementById(`p-${trait}-num`);
                        if (slider) slider.value = val;
                        if (numInput) numInput.value = val;
                    }
                });
            }
            
            if(document.getElementById('w-model')) {
                document.getElementById('w-model').value = wizard.model;
            }
            
            // Update testAgent to point to existing agent
            testAgent = { id: id, convId: null };
            
            // Go to step 1 (Basics) to show the loaded data
            step = 1;
            updateStepsNew();
            
            // Render tasks
            renderTasks();
            
            // Load guardrails to form (for when user navigates to step 4)
            loadGuardrailsToForm();
            
            // Apply permission-based restrictions to UI
            applyPermissionRestrictions(userPermissions);
            
            console.log('Editing agent:', id, wizard, 'permissions:', userPermissions);
        }
        
        // Apply permission-based restrictions to UI elements
        function applyPermissionRestrictions(perms) {
            if (!perms) {
                console.log('🔒🔒🔒 applyPermissionRestrictions called with NULL perms - SKIPPING');
                return;
            }
            
            console.log('🔒🔒🔒 APPLYING PERMISSION RESTRICTIONS 🔒🔒🔒');
            console.log('🔒 is_owner:', perms.is_owner);
            console.log('🔒 is_admin:', perms.is_admin);
            console.log('🔒 permissions:', perms.permissions);
            console.log('🔒 can_edit_basic_info:', perms.can_edit_basic_info);
            console.log('🔒 can_edit_personality:', perms.can_edit_personality);
            console.log('🔒 can_edit_model:', perms.can_edit_model);
            console.log('🔒 can_edit_guardrails:', perms.can_edit_guardrails);
            console.log('🔒 can_manage_tasks:', perms.can_manage_tasks);
            console.log('🔒 can_manage_tools:', perms.can_manage_tools);
            console.log('🔒 can_manage_knowledge:', perms.can_manage_knowledge);
            console.log('🔒 can_manage_access:', perms.can_manage_access);
            console.log('🔒 can_publish:', perms.can_publish);
            console.log('🔒 can_delete:', perms.can_delete);
            
            // Helper function to disable a section
            const disableSection = (selector, message = 'You do not have permission to edit this section') => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Add visual indicator
                    el.style.opacity = '0.5';
                    el.style.pointerEvents = 'none';
                    el.style.position = 'relative';
                    
                    // Disable all inputs within
                    el.querySelectorAll('input, textarea, select, button').forEach(input => {
                        input.disabled = true;
                    });
                });
            };
            
            // Helper to add "No Permission" overlay
            const addNoPermissionOverlay = (elementId, permName) => {
                const el = document.getElementById(elementId);
                if (!el) return;
                
                // Create overlay
                const overlay = document.createElement('div');
                overlay.className = 'no-permission-overlay';
                overlay.innerHTML = `
                    <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;border-radius:8px;">
                        <div style="text-align:center;color:#ff6b6b;">
                            <div style="font-size:2rem;">🔒</div>
                            <div style="font-size:0.9rem;margin-top:0.5rem;">No Permission</div>
                            <div style="font-size:0.75rem;color:#888;margin-top:0.25rem;">Requires: ${permName}</div>
                        </div>
                    </div>
                `;
                el.style.position = 'relative';
                el.appendChild(overlay);
                
                // Disable inputs
                el.querySelectorAll('input, textarea, select, button').forEach(input => {
                    input.disabled = true;
                });
            };
            
            // If owner or full_admin, no restrictions
            const hasFullAdmin = perms.permissions && perms.permissions.includes('full_admin');
            console.log('🔒 Checking if should skip restrictions:');
            console.log('🔒   perms.is_owner:', perms.is_owner);
            console.log('🔒   hasFullAdmin:', hasFullAdmin);
            
            if (perms.is_owner || hasFullAdmin) {
                console.log('✅ Owner/Full Admin - SKIPPING restrictions (no restrictions applied)');
                return;
            }
            
            console.log('🔒 NOT owner/full_admin - APPLYING restrictions now...');
            
            // Apply restrictions based on specific permissions
            
            // Step 1: Basic Info (name, icon, goal)
            if (!perms.can_edit_basic_info) {
                console.log('🔒 Restricting: Basic Info (can_edit_basic_info=false)');
                const basicFields = ['w-name', 'w-icon', 'w-goal'];
                basicFields.forEach(fieldId => {
                    const el = document.getElementById(fieldId);
                    console.log('🔒   Field', fieldId, ':', el ? 'FOUND - disabling' : 'NOT FOUND');
                    if (el) {
                        el.disabled = true;
                        el.style.opacity = '0.6';
                        el.style.backgroundColor = 'rgba(255,0,0,0.1)';
                        el.title = 'No permission to edit (requires: edit_basic_info)';
                    }
                });
            } else {
                console.log('✅ Basic Info: ALLOWED');
            }
            
            // Step 2: Personality sliders
            if (!perms.can_edit_personality) {
                console.log('🔒 Restricting: Personality (can_edit_personality=false)');
                const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
                traits.forEach(trait => {
                    const slider = document.getElementById(`p-${trait}`);
                    const numInput = document.getElementById(`p-${trait}-num`);
                    console.log('🔒   Slider p-'+trait+':', slider ? 'FOUND' : 'NOT FOUND');
                    if (slider) { slider.disabled = true; slider.style.opacity = '0.6'; }
                    if (numInput) { numInput.disabled = true; numInput.style.opacity = '0.6'; }
                });
            } else {
                console.log('✅ Personality: ALLOWED');
            }
            
            // Step 3: Tasks
            if (!perms.can_manage_tasks) {
                console.log('🔒 Restricting: Tasks (can_manage_tasks=false)');
                const taskContainer = document.getElementById('w-tasks');
                console.log('🔒   w-tasks:', taskContainer ? 'FOUND' : 'NOT FOUND');
                if (taskContainer) {
                    taskContainer.style.opacity = '0.6';
                    taskContainer.style.pointerEvents = 'none';
                }
                // Hide add task button
                const addTaskBtns = document.querySelectorAll('[onclick*="addTask"], [onclick*="addNewTask"]');
                console.log('🔒   Add task buttons found:', addTaskBtns.length);
                addTaskBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
            } else {
                console.log('✅ Tasks: ALLOWED');
            }
            
            // Step 3: Tools - disable tool-related elements but keep navigation working
            if (!perms.can_manage_tools) {
                console.log('🔒 Restricting: Tools (can_manage_tools=false)');
                const toolsStep = document.getElementById('wizard-step-3');
                console.log('🔒   wizard-step-3:', toolsStep ? 'FOUND' : 'NOT FOUND');
                if (toolsStep) {
                    // Disable tool-related elements but NOT navigation buttons
                    toolsStep.querySelectorAll('[onclick], button, .card').forEach(el => {
                        const onclick = el.getAttribute('onclick') || '';
                        // Skip navigation buttons (nextStep, prevStep, goStep, saveWizardProgress)
                        if (onclick.includes('nextStep') || onclick.includes('prevStep') || 
                            onclick.includes('goStep') || onclick.includes('saveWizardProgress')) {
                            return; // Don't disable navigation
                        }
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.5';
                    });
                    // Add visual overlay
                    if (!toolsStep.querySelector('.permission-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'permission-overlay';
                        overlay.innerHTML = `<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:1rem;margin-bottom:1rem;text-align:center;"><span style="color:#ff6b6b;">🔒 You don't have permission to manage tools</span></div>`;
                        toolsStep.insertBefore(overlay, toolsStep.firstChild);
                    }
                }
                // Disable tool selection buttons throughout page
                document.querySelectorAll('.tool-select-btn, .demo-tool-card, [onclick*="showSelectToolModal"], [onclick*="showAddToolModal"]').forEach(el => {
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0.5';
                });
            } else {
                console.log('✅ Tools: ALLOWED');
            }
            
            // Step 3: Knowledge Base
            if (!perms.can_manage_knowledge) {
                console.log('🔒 Restricting: Knowledge Base (can_manage_knowledge=false)');
                const kbSection = document.getElementById('wizard-kb-section');
                if (kbSection) {
                    kbSection.style.opacity = '0.6';
                    kbSection.style.pointerEvents = 'none';
                }
            } else {
                console.log('✅ Knowledge Base: ALLOWED');
            }
            
            // Step 1: LLM Model (model selection is in step 1, right side)
            if (!perms.can_edit_model) {
                console.log('🔒 Restricting: LLM Model (can_edit_model=false)');
                // The model list is in #llm-models-list
                const modelList = document.getElementById('llm-models-list');
                console.log('🔒   llm-models-list:', modelList ? 'FOUND' : 'NOT FOUND');
                if (modelList) {
                    modelList.style.pointerEvents = 'none';
                    modelList.style.opacity = '0.5';
                    // Add notice above model list
                    const parent = modelList.parentElement;
                    if (parent && !parent.querySelector('.model-permission-notice')) {
                        const notice = document.createElement('div');
                        notice.className = 'model-permission-notice';
                        notice.innerHTML = `<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:0.5rem;margin-bottom:0.5rem;text-align:center;font-size:0.75rem;"><span style="color:#ff6b6b;">🔒 No permission to change model</span></div>`;
                        parent.insertBefore(notice, modelList);
                    }
                }
                // Also disable all model options
                document.querySelectorAll('.model-option').forEach(el => {
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0.5';
                    el.onclick = null;
                });
            } else {
                console.log('✅ LLM Model: ALLOWED');
            }
            
            // Step 5: Guardrails (wizard-step-5)
            if (!perms.can_edit_guardrails) {
                console.log('🔒 Restricting: Guardrails (can_edit_guardrails=false)');
                const guardrailStep = document.getElementById('wizard-step-5');
                console.log('🔒   wizard-step-5:', guardrailStep ? 'FOUND' : 'NOT FOUND');
                if (guardrailStep) {
                    // Disable guardrail inputs but keep navigation working
                    guardrailStep.querySelectorAll('input, button, label, .card').forEach(el => {
                        const onclick = el.getAttribute('onclick') || '';
                        // Skip navigation buttons
                        if (onclick.includes('nextStep') || onclick.includes('prevStep') || 
                            onclick.includes('goStep') || onclick.includes('saveWizardProgress')) {
                            return;
                        }
                        if (el.tagName === 'INPUT') {
                            el.disabled = true;
                        }
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.5';
                    });
                    // Add visual overlay
                    if (!guardrailStep.querySelector('.permission-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'permission-overlay';
                        overlay.innerHTML = `<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:1rem;margin-bottom:1rem;text-align:center;"><span style="color:#ff6b6b;">🔒 You don't have permission to edit guardrails</span></div>`;
                        guardrailStep.insertBefore(overlay, guardrailStep.firstChild);
                    }
                }
            } else {
                console.log('✅ Guardrails: ALLOWED');
            }
            
            // Step 4: Access Control (End-User Access) - wizard-step-4
            if (!perms.can_manage_access) {
                console.log('🔒 Restricting: Access Control (End-User)');
                const accessStep = document.getElementById('wizard-step-4');
                console.log('🔒   wizard-step-4:', accessStep ? 'FOUND' : 'NOT FOUND');
                if (accessStep) {
                    // Find the main access control section (Level 1)
                    const accessControlSection = document.getElementById('wizard-access-control-section');
                    if (accessControlSection) {
                        accessControlSection.querySelectorAll('input, button, [onclick]').forEach(el => {
                            const onclick = el.getAttribute('onclick') || '';
                            // Skip navigation buttons
                            if (onclick.includes('nextStep') || onclick.includes('prevStep') || 
                                onclick.includes('goStep') || onclick.includes('saveWizardProgress')) {
                                return;
                            }
                            if (el.tagName === 'INPUT') el.disabled = true;
                            el.style.pointerEvents = 'none';
                            el.style.opacity = '0.5';
                        });
                        // Add notice
                        if (!accessControlSection.querySelector('.permission-overlay')) {
                            const overlay = document.createElement('div');
                            overlay.className = 'permission-overlay';
                            overlay.innerHTML = `<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:0.75rem;margin:0.5rem;text-align:center;"><span style="color:#ff6b6b;">🔒 No permission to manage end-user access</span></div>`;
                            accessControlSection.insertBefore(overlay, accessControlSection.firstChild);
                        }
                    }
                }
                // Disable access type cards anywhere
                document.querySelectorAll('.access-type-card').forEach(card => {
                    card.style.pointerEvents = 'none';
                    card.style.opacity = '0.5';
                });
            }
            
            // Step 5: Task Permissions
            if (!perms.can_manage_task_permissions) {
                console.log('🔒 Restricting: Task Permissions');
                const taskPermSection = document.getElementById('wizard-task-permissions-section');
                if (taskPermSection) {
                    taskPermSection.style.opacity = '0.6';
                    taskPermSection.style.pointerEvents = 'none';
                }
                // Disable task-level access toggles
                document.querySelectorAll('[data-task-permission]').forEach(el => {
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0.5';
                });
            }
            
            // Step 5: Delegation (Admin Management)
            if (!perms.is_owner) {
                console.log('🔒 Restricting: Delegation (only owner can delegate)');
                const delegateSection = document.getElementById('wizard-delegate-admin-section');
                if (delegateSection) {
                    delegateSection.style.opacity = '0.6';
                    delegateSection.style.pointerEvents = 'none';
                    // Add overlay message if not already added
                    if (!delegateSection.querySelector('.no-permission-overlay-msg')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'no-permission-overlay-msg';
                        overlay.innerHTML = `
                            <div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:1rem;margin-bottom:1rem;text-align:center;">
                                <span style="color:#ff6b6b;">🔒 Only the agent owner can delegate admin access</span>
                            </div>
                        `;
                        delegateSection.insertBefore(overlay, delegateSection.firstChild);
                    }
                }
            }
            
            // Publish/Deploy button
            if (!perms.can_publish) {
                console.log('🔒 Restricting: Publish/Deploy');
                // Select all publish/deploy related buttons
                const publishBtns = document.querySelectorAll(
                    '[onclick*="publishAgent"], [onclick*="deployAgent"], .publish-btn, #btn-deploy'
                );
                publishBtns.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                    btn.title = 'No permission to publish (requires: publish_agent)';
                });
                
                // Also disable the Save as Published option
                const savePublishBtns = document.querySelectorAll('button[onclick*="published"]');
                savePublishBtns.forEach(btn => {
                    if (btn.textContent?.toLowerCase().includes('publish')) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.pointerEvents = 'none';
                        btn.title = 'No permission to publish';
                    }
                });
            }
            
            // Delete button
            if (!perms.can_delete) {
                console.log('🔒 Restricting: Delete');
                const deleteBtns = document.querySelectorAll('[onclick*="deleteAgent"], .delete-btn');
                deleteBtns.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.title = 'No permission to delete';
                });
            }
            
            // Step 7: Test - Only allow if user has at least SOME edit permission
            // If user only has publish permission, they shouldn't be editing/testing
            const hasAnyEditPerm = perms.can_edit_basic_info || perms.can_edit_personality || 
                                   perms.can_edit_model || perms.can_edit_guardrails || 
                                   perms.can_manage_tasks || perms.can_manage_tools;
            if (!hasAnyEditPerm && !perms.is_owner) {
                console.log('🔒 Restricting: Test (no edit permissions)');
                const testStep = document.getElementById('wizard-step-7');
                if (testStep) {
                    testStep.querySelectorAll('input, button, textarea').forEach(el => {
                        const onclick = el.getAttribute('onclick') || '';
                        // Skip navigation buttons
                        if (onclick.includes('nextStep') || onclick.includes('prevStep') || 
                            onclick.includes('goStep') || onclick.includes('saveWizardProgress') ||
                            onclick.includes('saveAgent') || onclick.includes('deployAgent')) {
                            return;
                        }
                        el.disabled = true;
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.5';
                    });
                    // Add notice
                    if (!testStep.querySelector('.permission-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'permission-overlay';
                        overlay.innerHTML = `<div style="background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.3);border-radius:8px;padding:1rem;margin-bottom:1rem;text-align:center;"><span style="color:#ff6b6b;">🔒 You don't have permission to test this agent (requires edit permissions)</span></div>`;
                        testStep.insertBefore(overlay, testStep.firstChild);
                    }
                }
            }
            
            // Show a banner indicating restricted access
            if (!perms.is_owner && perms.is_admin) {
                const wizardHeader = document.querySelector('.wizard-header, #page-create > div:first-child');
                if (wizardHeader && !document.getElementById('restricted-access-banner')) {
                    // Build list of granted permissions
                    const grantedPerms = [];
                    if (perms.can_edit_basic_info) grantedPerms.push('📝 Basic Info');
                    if (perms.can_edit_personality) grantedPerms.push('🎭 Personality');
                    if (perms.can_edit_model) grantedPerms.push('🤖 Model');
                    if (perms.can_edit_guardrails) grantedPerms.push('🛡️ Guardrails');
                    if (perms.can_manage_tasks) grantedPerms.push('📋 Tasks');
                    if (perms.can_manage_tools) grantedPerms.push('🔧 Tools');
                    if (perms.can_manage_knowledge) grantedPerms.push('📚 Knowledge');
                    if (perms.can_manage_access) grantedPerms.push('🔐 Access Control');
                    if (perms.can_publish) grantedPerms.push('🚀 Publish');
                    if (perms.can_delete) grantedPerms.push('🗑️ Delete');
                    
                    const banner = document.createElement('div');
                    banner.id = 'restricted-access-banner';
                    banner.innerHTML = `
                        <div style="background:linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,152,0,0.15));border:1px solid rgba(255,193,7,0.4);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;">
                            <div style="display:flex;align-items:center;gap:0.75rem;">
                                <span style="font-size:1.25rem;">🔐</span>
                                <div style="flex:1;">
                                    <div style="color:#ffc107;font-weight:600;">Delegated Admin Access</div>
                                    <div style="color:#888;font-size:0.85rem;">You can only edit sections you have permission for.</div>
                                </div>
                            </div>
                            ${grantedPerms.length > 0 ? `
                            <div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,193,7,0.2);">
                                <div style="font-size:0.75rem;color:#888;margin-bottom:0.25rem;">Your permissions:</div>
                                <div style="display:flex;flex-wrap:wrap;gap:0.25rem;">
                                    ${grantedPerms.map(p => `<span style="font-size:0.7rem;padding:2px 6px;background:rgba(255,193,7,0.2);border-radius:4px;color:#ffc107;">${p}</span>`).join('')}
                                </div>
                            </div>
                            ` : `
                            <div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(255,193,7,0.2);">
                                <div style="font-size:0.85rem;color:#ff6b6b;">⚠️ You have no edit permissions - read-only access</div>
                            </div>
                            `}
                        </div>
                    `;
                    wizardHeader.parentNode.insertBefore(banner, wizardHeader);
                }
            } else if (perms._read_only) {
                // Read-only mode banner
                const wizardHeader = document.querySelector('.wizard-header, #page-create > div:first-child');
                if (wizardHeader && !document.getElementById('restricted-access-banner')) {
                    const banner = document.createElement('div');
                    banner.id = 'restricted-access-banner';
                    banner.innerHTML = `
                        <div style="background:linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,87,87,0.15));border:1px solid rgba(255,107,107,0.4);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;">
                            <span style="font-size:1.25rem;">🔒</span>
                            <div>
                                <div style="color:#ff6b6b;font-weight:600;">Read-Only Access</div>
                                <div style="color:#888;font-size:0.85rem;">You can view this agent but cannot make changes.</div>
                            </div>
                        </div>
                    `;
                    wizardHeader.parentNode.insertBefore(banner, wizardHeader);
                    
                    // Disable ALL inputs in read-only mode
                    document.querySelectorAll('#page-create input, #page-create textarea, #page-create select, #page-create button').forEach(el => {
                        if (!el.classList.contains('nav-btn')) {
                            el.disabled = true;
                            el.style.opacity = '0.5';
                        }
                    });
                }
            }
            
            console.log('🔒🔒🔒 PERMISSION RESTRICTIONS APPLIED SUCCESSFULLY 🔒🔒🔒');
        }
        
        // Load agent's tools into selectedDemoTools for display
        async function loadAgentToolsToSelection(toolIds, toolsData) {
            // Reset selectedDemoTools
            selectedDemoTools = {
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
            
            // If we have tools data from the agent response, use it
            if (toolsData && toolsData.length > 0) {
                toolsData.forEach(tool => {
                    addToolToSelection(tool);
                });
            } else if (toolIds && toolIds.length > 0) {
                // Otherwise, fetch tools from API
                try {
                    const response = await fetch(API + '/api/tools');
                    const data = await response.json();
                    const allTools = data.tools || [];
                    
                    toolIds.forEach(tid => {
                        // Handle prefixed IDs (api:xxx, kb:xxx)
                        const cleanId = tid.replace(/^(api:|kb:)/, '');
                        const tool = allTools.find(t => t.id === tid || t.id === cleanId);
                        if (tool) {
                            addToolToSelection(tool);
                        }
                    });
                } catch (e) {
                    console.error('Failed to load tools for agent:', e);
                }
            }
            
            // Update UI
            updateSelectedToolsList();
            console.log('✅ Loaded tools to selection:', selectedDemoTools);
        }
        
        // Add a tool to the correct category in selectedDemoTools
        function addToolToSelection(tool) {
            const typeToArray = {
                'api': 'apis',
                'knowledge': 'knowledge_bases',
                'document': 'knowledge_bases',
                'email': 'emails',
                'webhook': 'webhooks',
                'slack': 'slacks',
                'calendar': 'calendars',
                'database': 'databases',
                'websearch': 'websearches',
                'website': 'websites'
            };
            
            const arrayKey = typeToArray[tool.type] || 'apis';
            if (selectedDemoTools[arrayKey] && !selectedDemoTools[arrayKey].some(t => t.id === tool.id)) {
                selectedDemoTools[arrayKey].push(tool);
            }
        }
        
        async function deleteAgent(id){
            if(!confirm('Are you sure you want to delete this agent?')) return;
            
            try {
                console.log('🗑️ [DELETE] Attempting to delete agent:', id);
                const response = await fetch(API+'/api/agents/'+id, { 
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                
                console.log('🗑️ [DELETE] Response status:', response.status);
                
                if (!response.ok) {
                    let errorMsg = 'Failed to delete agent';
                    try {
                        const error = await response.json();
                        errorMsg = error.detail || errorMsg;
                    } catch(jsonErr) {
                        errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                    }
                    console.error('🗑️ [DELETE] Error:', errorMsg);
                    alert('Failed to delete agent: ' + errorMsg);
                    return;
                }
                
                showToast('Agent deleted successfully', 'success');
                loadAgents();
            } catch(e) {
                console.error('🗑️ [DELETE] Exception:', e);
                alert('Failed to delete agent: ' + e.message);
            }
        }
        
        async function publishAgent(id){
            try {
                const response = await fetch(API+'/api/agents/'+id, {
                    method: 'PUT',
                    headers: {...getAuthHeaders(), 'Content-Type': 'application/json'},
                    body: JSON.stringify({ status: 'published' })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to publish');
                }
                
                showToast('Agent published successfully!', 'success');
                loadAgents();
                setAgentTab('published');
            } catch(e) {
                console.error('Publish error:', e);
                showToast('Failed to publish agent: ' + e.message, 'error');
            }
        }

        function resetWizard(){
            step=1;
            wizard={name:'',icon:'',goal:'',personality:null,personalityReason:'',tasks:[],tool_ids:[],model:'',modelReason:'',editId:null};
            
            // Reset selectedDemoTools
            selectedDemoTools = {
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
            tempToolSelection = {
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
            
            updateSteps();
            document.getElementById('w-name').value='';
            document.getElementById('w-icon').value='';
            document.getElementById('w-goal').value='';
            
            // Reset personality sliders
            resetPersonalityDefaults();
            
            document.getElementById('w-tasks').innerHTML=`
                <div class="text-center py-8 text-gray-500">
                    <span class="text-4xl block mb-2">📝</span>
                    <p>No tasks yet. Click "+ Add Task" to create one.</p>
                    <p class="text-xs mt-2">Each task should have clear instructions for the LLM.</p>
                </div>
            `;
            document.getElementById('test-messages').innerHTML='';
            testAgent=null;
            
            // Update tools list display
            updateSelectedToolsList();
        }

        // Old wizard functions removed - using new 7-step wizard functions instead
        // updateStepsNew, nextStep, prevStep, collectTasksNew, loadWizardToolsNew, collectToolsNew, showPreviewNew

        // Task Modal State
        let taskModalEditIndex = null; // null = new task, number = editing existing task
        
        function addTask(){
            // Open modal for new task
            openTaskModal();
        }
        
        function openTaskModal(editIndex = null) {
            const modal = document.getElementById('modal-task');
            if (!modal) return;
            ensureModalInBody('modal-task');
            taskModalEditIndex = editIndex;
            const titleEl = document.getElementById('task-modal-title');
            const nameEl = document.getElementById('task-modal-name');
            const descEl = document.getElementById('task-modal-desc');
            const instructionsEl = document.getElementById('task-modal-instructions');
            const noInstructionsEl = document.getElementById('task-modal-no-instructions');
            
            // Reset modal
            instructionsEl.innerHTML = '';
            
            if (editIndex !== null && wizard.tasks && wizard.tasks[editIndex]) {
                // Edit mode
                const task = wizard.tasks[editIndex];
                titleEl.textContent = 'Edit Task';
                nameEl.value = task.name || '';
                descEl.value = task.description || '';
                
                // Load instructions
                if (task.instructions && task.instructions.length > 0) {
                    noInstructionsEl.classList.add('hidden');
                    task.instructions.forEach((inst, i) => {
                        addTaskModalInstructionWithValue(inst, i + 1);
                    });
                } else {
                    noInstructionsEl.classList.remove('hidden');
                }
            } else {
                // New task mode
                titleEl.textContent = 'Add New Task';
                nameEl.value = '';
                descEl.value = '';
                noInstructionsEl.classList.remove('hidden');
            }
            
            modal.classList.remove('hidden');
            nameEl.focus();
        }
        
        function closeTaskModal() {
            document.getElementById('modal-task').classList.add('hidden');
            taskModalEditIndex = null;
        }
        
        function addTaskModalInstruction() {
            const container = document.getElementById('task-modal-instructions');
            const noInstructionsEl = document.getElementById('task-modal-no-instructions');
            noInstructionsEl.classList.add('hidden');
            
            const stepNum = container.children.length + 1;
            addTaskModalInstructionWithValue('', stepNum);
        }
        
        function addTaskModalInstructionWithValue(value, stepNum) {
            const container = document.getElementById('task-modal-instructions');
            const instId = Date.now() + Math.random();
            container.insertAdjacentHTML('beforeend', `
                <div class="flex gap-2 items-center bg-gray-900 rounded-lg p-3 group" data-inst-id="${instId}">
                    <span class="text-blue-400 text-sm font-bold w-6">${stepNum}.</span>
                    <input type="text" 
                           class="task-modal-inst-text flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none"
                           value="${escHtml(value)}"
                           placeholder="e.g., Greet the user and ask how you can help">
                    <button onclick="removeTaskModalInstruction(this)" 
                            class="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            `);
        }
        
        function removeTaskModalInstruction(btn) {
            const instDiv = btn.closest('[data-inst-id]');
            const container = document.getElementById('task-modal-instructions');
            instDiv.remove();
            
            // Renumber remaining instructions
            const remaining = container.querySelectorAll('[data-inst-id]');
            remaining.forEach((el, i) => {
                el.querySelector('.text-blue-400').textContent = (i + 1) + '.';
            });
            
            // Show empty message if no instructions
            if (remaining.length === 0) {
                document.getElementById('task-modal-no-instructions').classList.remove('hidden');
            }
        }
        
        function saveTaskModal() {
            const name = document.getElementById('task-modal-name').value.trim();
            const desc = document.getElementById('task-modal-desc').value.trim();
            const instructionInputs = document.querySelectorAll('#task-modal-instructions .task-modal-inst-text');
            
            if (!name) {
                document.getElementById('task-modal-name').focus();
                document.getElementById('task-modal-name').classList.add('border-red-500');
                setTimeout(() => document.getElementById('task-modal-name').classList.remove('border-red-500'), 2000);
                return;
            }
            
            const instructions = [];
            instructionInputs.forEach(input => {
                const val = input.value.trim();
                if (val) instructions.push(val);
            });
            
            const taskData = {
                id: taskModalEditIndex !== null ? wizard.tasks[taskModalEditIndex].id : `task-${Date.now()}`,
                name: name,
                description: desc,
                instructions: instructions
            };
            
            if (!wizard.tasks) wizard.tasks = [];
            
            if (taskModalEditIndex !== null) {
                // Update existing task
                wizard.tasks[taskModalEditIndex] = taskData;
            } else {
                // Add new task
                wizard.tasks.push(taskData);
            }
            
            closeTaskModal();
            renderTasks();
            showToast(taskModalEditIndex !== null ? 'Task updated' : 'Task added', 'success');
        }
        
        function editTask(idx) {
            openTaskModal(idx);
        }

        function addInst(tid){
            const container = document.querySelector('#task-'+tid+' .insts');
            const emptyMsg = document.querySelector('#task-'+tid+' .inst-empty');
            if(emptyMsg) emptyMsg.style.display = 'none';
            
            const stepNum = container.children.length + 1;
            container.insertAdjacentHTML('beforeend',`
                <div class="flex gap-2 items-start bg-gray-900/50 rounded p-2" id="inst-${Date.now()}">
                    <span class="text-purple-400 text-xs font-bold mt-1">${stepNum}.</span>
                    <input type="text" class="inst-text input-field flex-1 rounded px-2 py-1 text-sm" placeholder="e.g., First, greet the user politely">
                    <button onclick="removeInst(this)" class="text-gray-500 hover:text-red-400 text-sm">✕</button>
                </div>
            `);
        }
        
        function removeInst(btn){
            const instDiv = btn.parentElement;
            const container = instDiv.parentElement;
            const taskDiv = container.closest('[id^=task-]');
            instDiv.remove();
            
            // Update step numbers
            container.querySelectorAll('[id^=inst-]').forEach((inst, i) => {
                inst.querySelector('span').textContent = (i+1) + '.';
            });
            
            // Show empty message if no instructions
            if(container.children.length === 0){
                const emptyMsg = taskDiv.querySelector('.inst-empty');
                if(emptyMsg) emptyMsg.style.display = 'block';
            }
        }

        // Old collectTasks, loadWizardTools, collectTools, showReview removed
        // Using new functions: collectTasksNew, loadWizardToolsNew, collectToolsNew, showPreviewNew

        async function sendTest(){
            const inp=document.getElementById('test-input');
            const m=inp.value.trim();
            if(!m && testAttachments.length === 0)return;
            inp.value='';
            
            // Get user's timezone
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Show message with attachments
            let displayMsg = m;
            if(testAttachments.length > 0){
                displayMsg += '\n\n📎 Attachments: ' + testAttachments.map(f => f.name).join(', ');
            }
            addTestMsg('user', displayMsg);
            
            // Use existing agent ID if available (from auto-save or previous test)
            const existingAgentId = testAgent?.id || wizard.editId;
            
            if(!existingAgentId){
                // Create new agent only if we don't have one
                console.log('🔧 Creating new test agent...');
                const r=await fetch(API+'/api/agents',{
                    method:'POST',
                    headers: {...getAuthHeaders(), 'Content-Type':'application/json'},
                    body:JSON.stringify({name:wizard.name || 'Untitled Agent',goal:wizard.goal,personality:wizard.personality || {},tasks:wizard.tasks || [],tool_ids:wizard.tool_ids || [],model_id:wizard.model || 'gpt-4o',status:'draft'})
                });
                const d=await r.json();
                const newAgentId = d.agent_id || d.agent?.id;
                testAgent={id: newAgentId};
                wizard.editId = newAgentId; // Sync with wizard
                console.log('✅ Created test agent:', newAgentId);
            } else if(!testAgent) {
                // Use existing agent from wizard
                testAgent = {id: existingAgentId};
                console.log('📌 Using existing agent for test:', existingAgentId);
            }
            try{
                if(testAttachments.length > 0){
                    // Send with FormData for file upload (non-streaming)
                    const formData = new FormData();
                    formData.append('message', m);
                    formData.append('timezone', userTimezone);
                    if(testAgent.convId) formData.append('conversation_id', testAgent.convId);
                    testAttachments.forEach(f => formData.append('files', f));
                    
                    const response = await fetch(API+'/api/agents/'+testAgent.id+'/test-chat-with-files', {
                        method:'POST', 
                        headers: {...getAuthHeaders()},
                        body: formData
                    });
                    const d=await response.json();
                    testAgent.convId=d.conversation_id;
                    addTestMsg('assistant',d.response,d.sources);
                } else {
                    // Use streaming for better UX
                    await sendTestMsgStreaming(testAgent.id, m, userTimezone);
                }
                // Clear attachments after send
                testAttachments = [];
                renderTestAttachments();
            }catch(e){addTestMsg('error','Error: '+e.message);}
        }

        function addTestMsg(role,content,sources=[]){
            const c=document.getElementById('test-messages');
            const d=document.createElement('div');
            d.className='animate-fade-in';
            if(role==='user')d.innerHTML=`<div class="flex justify-end"><div class="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm shadow-md">${esc(content)}</div></div>`;
            else if(role==='assistant')d.innerHTML=`<div class="flex"><div class="bg-gray-700 text-white rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] chat-content text-sm">${fmt(content)}</div></div>`;
            else if(role==='system')d.innerHTML=`<div class="text-center text-xs py-1 text-gray-500">${content}</div>`;
            else if(role==='thinking')d.innerHTML=`<div class="flex"><div class="bg-gray-600 text-gray-300 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm italic"><span class="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></span>${esc(content)}</div></div>`;
            else d.innerHTML=`<div class="text-center text-red-400 text-sm">${content}</div>`;
            c.appendChild(d);
            c.scrollTop=c.scrollHeight;
            return d;
        }
        
        // Streaming test chat with real-time thinking
        async function sendTestMsgStreaming(agentId, message, timezone) {
            const c = document.getElementById('test-messages');
            
            // Add thinking placeholder
            const thinkingDiv = document.createElement('div');
            thinkingDiv.id = 'test-thinking-container';
            thinkingDiv.className = 'animate-fade-in';
            thinkingDiv.innerHTML = `
                <div class="flex">
                    <div class="bg-gray-600 text-gray-300 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm italic">
                        <span class="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2"></span>
                        <span id="test-thinking-text">...</span>
                    </div>
                </div>
            `;
            c.appendChild(thinkingDiv);
            c.scrollTop = c.scrollHeight;
            
            let fullContent = '';
            let sources = [];
            let buffer = '';
            
            try {
                const response = await fetch(API + '/api/agents/' + agentId + '/chat/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_id: testAgent.convId,
                        timezone: timezone
                    })
                });
                
                if (!response.ok) throw new Error('HTTP ' + response.status);
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6).trim());
                                
                                switch (data.type) {
                                    case 'thinking':
                                    case 'tool_call':
                                    case 'tool_result':
                                        const textEl = document.getElementById('test-thinking-text');
                                        if (textEl) textEl.textContent = data.content;
                                        break;
                                    case 'conversation_id':
                                        testAgent.convId = data.content;
                                        break;
                                    case 'content':
                                        fullContent += data.content;
                                        break;
                                    case 'sources':
                                        sources = data.content || [];
                                        break;
                                    case 'done':
                                        // Remove thinking and show response
                                        const container = document.getElementById('test-thinking-container');
                                        if (container) container.remove();
                                        break;
                                    case 'error':
                                        const errContainer = document.getElementById('test-thinking-container');
                                        if (errContainer) errContainer.remove();
                                        addTestMsg('error', data.content);
                                        return;
                                }
                            } catch (e) { /* skip */ }
                        }
                    }
                }
                
                // Remove thinking container
                const container = document.getElementById('test-thinking-container');
                if (container) container.remove();
                
                // Add final response
                if (fullContent) {
                    addTestMsg('assistant', fullContent, sources);
                }
                
            } catch (e) {
                console.error('Test streaming error:', e);
                const container = document.getElementById('test-thinking-container');
                if (container) container.remove();
                addTestMsg('error', 'Error: ' + e.message);
            }
        }

        async function saveAgent(status){
            // Collect current wizard data
            if(typeof collectTasksNew === 'function') collectTasksNew();
            else if(typeof collectTasks === 'function') collectTasks();
            
            if(typeof collectToolsNew === 'function') collectToolsNew();
            else if(typeof collectTools === 'function') collectTools();
            
            if(typeof collectGuardrails === 'function') collectGuardrails();
            
            // Collect access control settings
            if(typeof collectWizardAccessControl === 'function') collectWizardAccessControl();
            
            // Get user permissions
            const perms = wizard.userPermissions || {};
            const isOwner = perms.is_owner;
            const hasFullAdmin = perms.permissions?.includes('full_admin');
            const agentId = testAgent?.id || wizard.editId;
            const hasValidId = agentId && agentId !== 'undefined' && agentId.length > 0;
            
            // For NEW agents (no ID), owner can save everything
            // For EXISTING agents, only save fields user has permission to modify
            let agentData;
            
            if (!hasValidId) {
                // New agent - need personality
                if (!wizard.personality) {
                    alert('Agent personality not configured. Please generate configuration first.');
                    return;
                }
                // New agent = full access
                agentData = {
                    name: wizard.name,
                    icon: wizard.icon,
                    goal: wizard.goal,
                    personality: wizard.personality,
                    personality_reason: wizard.personalityReason,
                    guardrails: wizard.guardrails || {},
                    tasks: wizard.tasks || [],
                    tool_ids: wizard.tool_ids || [],
                    model_id: wizard.model,
                    model_reason: wizard.modelReason,
                    status: status,
                    access_control: wizard.accessControl || null
                };
            } else {
                // Existing agent - build data based on permissions
                agentData = { status: status };  // Always include status
                
                if (isOwner || hasFullAdmin || perms.can_edit_basic_info) {
                    agentData.name = wizard.name;
                    agentData.icon = wizard.icon;
                    agentData.goal = wizard.goal;
                }
                if (isOwner || hasFullAdmin || perms.can_edit_personality) {
                    agentData.personality = wizard.personality;
                    agentData.personality_reason = wizard.personalityReason;
                }
                if (isOwner || hasFullAdmin || perms.can_edit_guardrails) {
                    agentData.guardrails = wizard.guardrails || {};
                }
                if (isOwner || hasFullAdmin || perms.can_manage_tasks) {
                    agentData.tasks = wizard.tasks || [];
                }
                if (isOwner || hasFullAdmin || perms.can_manage_tools) {
                    agentData.tool_ids = wizard.tool_ids || [];
                }
                if (isOwner || hasFullAdmin || perms.can_edit_model) {
                    agentData.model_id = wizard.model;
                    agentData.model_reason = wizard.modelReason;
                }
            }
            
            console.log('Saving agent with permission-filtered data:', agentData);
            console.log('🔐 User permissions:', perms);
            
            try {
                let response;
                
                if(hasValidId){
                    // Update existing agent
                    console.log('Updating agent:', agentId);
                    response = await fetch(API+'/api/agents/'+agentId, {
                        method: 'PUT',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(agentData)
                    });
                } else {
                    // Create new agent
                    console.log('Creating new agent');
                    response = await fetch(API+'/api/agents', {
                        method: 'POST',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(agentData)
                    });
                }
                
                if(response.ok) {
                    const savedAgent = await response.json();
                    const savedAgentId = savedAgent.id || agentId;
                    
                    // Save access control to API
                    if (wizard.accessControl && savedAgentId) {
                        await saveAgentAccessControl(savedAgentId);
                    }
                    
                    alert(status === 'published' ? '🚀 Agent Published!' : '💾 Saved as Draft!');
                    wizard.editId = null;
                    testAgent = null;
                    navigate('agents');
                    setAgentTab(status);
                } else {
                    const err = await response.json();
                    alert('Error: ' + (err.detail || 'Failed to save agent'));
                }
            } catch(e) {
                console.error('Save error:', e);
                alert('Error saving agent: ' + e.message);
            }
        }

        async function cleanupDuplicateTools() {
            if(!confirm('This will remove duplicate tools (keeping only the first of each name). Continue?')) return;
            
            try {
                console.log('Calling cleanup endpoint...');
                const r = await fetch(API + '/api/tools/cleanup-duplicates', { method: 'POST' });
                console.log('Response status:', r.status);
                
                if(!r.ok) {
                    const errorText = await r.text();
                    console.error('Cleanup error:', errorText);
                    alert('Error: ' + errorText);
                    return;
                }
                
                const data = await r.json();
                console.log('Cleanup result:', data);
                
                if(data.status === 'success') {
                    if(data.duplicates_removed > 0) {
                        alert(`✅ Removed ${data.duplicates_removed} duplicate tools.\n\nRemaining tools: ${data.remaining_tools}`);
                    } else {
                        alert('✅ No duplicates found. All tools have unique names.');
                    }
                    loadTools(); // Refresh
                } else {
                    alert('Error: ' + (data.error || 'Failed to cleanup'));
                }
            } catch(e) {
                console.error('Cleanup exception:', e);
                alert('Failed to cleanup: ' + e.message);
            }
        }
        
        async function deleteAllTools() {
            if(!confirm('⚠️ WARNING: This will DELETE ALL TOOLS permanently!\n\nAre you sure?')) return;
            if(!confirm('This action cannot be undone. Type DELETE to confirm.')) return;
            
            try {
                const r = await fetch(API + '/api/tools/all', { method: 'DELETE' });
                const data = await r.json();
                
                if(data.status === 'success') {
                    alert(`✅ Deleted ${data.deleted_count} tools.`);
                    loadTools();
                } else {
                    alert('Error: ' + (data.error || 'Failed to delete'));
                }
            } catch(e) {
                alert('Failed to delete: ' + e.message);
            }
        }

        async function loadTools(){
            const r=await fetch(API+'/api/tools', { headers: getAuthHeaders() });
            const d=await r.json();
            allTools=d.tools;
            const g=document.getElementById('tools-grid');
            const icons={document:'📄',website:'🌐',api:'🔌',knowledge:'🧠'};
            if(!d.tools.length){
                g.innerHTML=`<div class="col-span-full text-center py-10 md:py-20 text-gray-500">
                    <span class="text-4xl md:text-6xl mb-4 block">🔧</span>
                    <p class="mb-4">No tools yet</p>
                    <button data-permission="tools:create" onclick="showToolModal()" class="btn-primary px-4 py-2 rounded-lg">Create Tool</button>
                </div>`;
                return;
            }
            g.innerHTML=d.tools.map(t=>{
                const hasMockResponse = t.config?.mock_response;
                const mockLabel = hasMockResponse ? '<span class="tool-mock-badge" title="Has mock response for testing">Mock</span>' : '';
                // Access control badges
                const accessIcon = t.access_type === 'public' ? '🌐' : t.access_type === 'authenticated' ? '🔑' : t.access_type === 'specific_users' ? '👥' : '👤';
                const ownerBadge = t.is_owner ? '<span class="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400" title="You own this tool">Owner</span>' : '';
                // Check permissions for buttons (based on owner-granted permissions)
                const canEdit = t.can_edit || t.is_owner;
                const canDelete = t.can_delete || t.is_owner;
                return `
                <div class="card tool-card rounded-xl p-4 hover:border-purple-500 transition" 
                     style="min-width:0;overflow:visible;"
                     data-tool-id="${t.id}"
                     data-tool-name="${escHtml(t.name)}">
                    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;" class="cursor-pointer" onclick="viewTool('${t.id}')">
                        <span style="font-size:1.75rem;flex-shrink:0;">${icons[t.type]||'🔧'}</span>
                        <div style="flex:1;min-width:0;overflow:hidden;width:100%;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <h3 class="tool-title" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;">${escHtml(t.name)}</h3>
                                <span class="tool-type-badge">${t.type.toUpperCase()}</span>
                                ${ownerBadge}
                            </div>
                            <p class="tool-desc" style="font-size:0.875rem;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word;">${escHtml(t.description||'No description')}</p>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border-color);padding-top:12px;margin-top:8px;">
                        <div class="tool-stats" style="display:flex;gap:8px;font-size:0.75rem;color:var(--text-muted);align-items:center;">
                            <span title="Access: ${t.access_type || 'owner_only'}">${accessIcon}</span>
                            <span>🔧 ${t.type}</span>${mockLabel}
                        </div>
                        <div style="display:flex;gap:6px;">
                            ${canEdit ? `<button onclick="event.stopPropagation();editTool('${t.id}')" class="tool-btn edit" title="Edit">✏️</button>` : ''}
                            ${canDelete ? `<button onclick="event.stopPropagation();delToolFromCard('${t.id}', '${escHtml(t.name).replace(/'/g, "\\'")}')" class="tool-btn delete" title="Delete">🗑️</button>` : ''}
                        </div>
                    </div>
                </div>
            `}).join('');

        }
        async function viewTool(id){
            const r=await fetch(API+'/api/tools/'+id, { headers: getAuthHeaders() });
            const t=await r.json();
            const icons={document:'📄',website:'🌐',api:'🔌',knowledge:'📚',email:'📧',webhook:'🔗',websearch:'🔍',slack:'💬',calendar:'📅',database:'🗄️'};
            
            let h=`
                <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div class="flex items-center gap-4 flex-1 min-w-0">
                        <span class="text-3xl md:text-4xl">${icons[t.type]||'🔧'}</span>
                        <div class="min-w-0">
                            <h2 class="text-lg md:text-xl font-bold truncate">${t.name}</h2>
                            <p class="text-gray-400 text-sm truncate">${t.type.toUpperCase()} - ${t.description||'No description'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="navigate('tools')" class="btn-secondary px-4 py-2 rounded-lg text-sm">← Back</button>
                        <button data-permission="tools:delete" onclick="delTool('${t.id}')" class="btn-danger px-4 py-2 rounded-lg text-sm">🗑️ Delete</button>
                    </div>
                </div>
            `;
            
            // ========== KNOWLEDGE BASE / DOCUMENT TYPE ==========
            if(t.type==='document' || t.type==='knowledge'){
                // Check if this is a Demo Kit knowledge base with embedded content
                const isDemoKb = t.config?.source === 'demo_kit';
                const demoContent = t.config?.content || '';
                const demoSections = t.config?.sections || [];
                
                h+=`<div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">📚 Knowledge Base ${isDemoKb ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded ml-2">From Demo Lab</span>' : ''}</h3>
                        <span class="text-sm text-gray-400">${t.documents?.length || 0} document(s)</span>
                    </div>
                    
                    ${isDemoKb && demoSections.length > 0 ? `
                    <!-- Demo KB Content -->
                    <div class="mb-4 p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
                        <h4 class="text-sm font-medium text-purple-300 mb-3">📖 Embedded Content (${demoSections.length} sections)</h4>
                        <div class="space-y-3 max-h-64 overflow-y-auto">
                            ${demoSections.map((s, i) => `
                                <div class="bg-gray-800 rounded p-3">
                                    <h5 class="text-sm font-medium text-white mb-1">${escHtml(s.title || 'Section ' + (i+1))}</h5>
                                    <p class="text-xs text-gray-400 line-clamp-3">${escHtml((s.content || '').substring(0, 200))}${(s.content || '').length > 200 ? '...' : ''}</p>
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="viewDemoKbFullContent('${t.id}')" class="mt-3 text-sm text-purple-400 hover:text-purple-300">View full content →</button>
                    </div>
                    ` : ''}
                    
                    <!-- Upload Zone -->
                    <div class="drop-zone rounded-lg p-6 text-center mb-4 cursor-pointer border-2 border-dashed border-gray-600 hover:border-purple-500 transition" 
                         onclick="document.getElementById('det-input').click()"
                         ondragover="this.classList.add('border-purple-500');event.preventDefault()" 
                         ondragleave="this.classList.remove('border-purple-500')"
                         ondrop="handleDocDrop(event,'${t.id}')">
                        <input type="file" id="det-input" class="hidden" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx" onchange="uploadDocs('${t.id}',event)">
                        <span class="text-3xl block mb-2">📤</span>
                        <p class="text-gray-400 text-sm">Drop files or click to upload</p>
                        <p class="text-xs text-gray-500 mt-1">Supports: PDF, DOC, DOCX, TXT, MD, CSV, XLSX</p>
                    </div>
                    
                    <!-- Add Entry Buttons - Available for ALL knowledge bases -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        <button onclick="showAddTextEntryModal('${t.id}')" class="btn-secondary px-3 py-2 rounded-lg text-sm border border-dashed border-gray-600 hover:border-purple-500">
                            ✍️ Text
                        </button>
                        <button onclick="showAddTableModal('${t.id}')" class="btn-secondary px-3 py-2 rounded-lg text-sm border border-dashed border-gray-600 hover:border-green-500">
                            📊 Table
                        </button>
                        <button onclick="showAddUrlModal('${t.id}')" class="btn-secondary px-3 py-2 rounded-lg text-sm border border-dashed border-gray-600 hover:border-blue-500">
                            🌐 URL
                        </button>
                        <button onclick="document.getElementById('det-input').click()" class="btn-secondary px-3 py-2 rounded-lg text-sm border border-dashed border-gray-600 hover:border-yellow-500">
                            📄 File
                        </button>
                    </div>
                    
                    <!-- Documents List -->
                    <div class="space-y-2" id="docs-list-${t.id}">
                        ${t.documents?.length ? t.documents.map(d=>`
                            <div class="flex items-center justify-between bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition ${d.is_demo ? 'border-l-2 border-purple-500' : ''} ${d.is_table ? 'border-l-2 border-green-500' : ''}">
                                <div class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onclick="${d.is_table ? `viewTableEntry('${t.id}', '${escHtml(d.original_name)}')` : (d.is_demo ? `viewTextEntry('${t.id}', '${escHtml(d.original_name)}', true)` : `viewDocContent('${d.id}', '${escHtml(d.original_name)}')`)}">
                                    <span class="text-xl">${d.is_table ? '📊' : (d.is_demo ? '📝' : fileIcon(d.file_type))}</span>
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-2">
                                            <p class="text-sm font-medium truncate">${d.original_name}</p>
                                            ${d.is_table ? '<span class="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Table</span>' : ''}
                                            ${d.is_demo && !d.is_table ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Text</span>' : ''}
                                        </div>
                                        <p class="text-xs text-gray-500">${d.is_table ? (d.rows_count || 0) + ' rows' : fmtSize(d.file_size)} • ${d.chunks_count || 0} chunks • <span class="status-${d.status}">${d.status}</span></p>
                                    </div>
                                </div>
                                <div class="flex gap-1">
                                    ${d.is_table ? `
                                        <button onclick="viewTableEntry('${t.id}', '${escHtml(d.original_name)}')" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="View/Edit Table">✏️</button>
                                        <button onclick="deleteTextEntry('${t.id}', '${escHtml(d.original_name)}')" class="p-2 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">🗑️</button>
                                    ` : d.is_demo ? `
                                        <button onclick="viewTextEntry('${t.id}', '${escHtml(d.original_name)}', true)" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="View/Edit">✏️</button>
                                        <button onclick="deleteTextEntry('${t.id}', '${escHtml(d.original_name)}')" class="p-2 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">🗑️</button>
                                    ` : `
                                        <button onclick="viewDocContent('${d.id}', '${escHtml(d.original_name)}')" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="View Content">👁️</button>
                                        <button onclick="downloadDoc('${d.id}', '${escHtml(d.original_name)}')" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Download">⬇️</button>
                                        <button onclick="delDoc('${d.id}','${t.id}')" class="p-2 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">🗑️</button>
                                    `}
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 text-center py-8">No documents yet. Add content using the buttons above.</p>'}
                    </div>
                    
                    <!-- Scraped Pages List -->
                    ${t.scraped_pages?.length ? `
                        <div class="mt-4 pt-4 border-t border-gray-700">
                            <h4 class="text-sm font-medium text-gray-400 mb-2">🌐 Scraped URLs (${t.scraped_pages.length})</h4>
                            <div class="space-y-2">
                                ${t.scraped_pages.map(p => `
                                    <div class="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span>🔗</span>
                                            <a href="${escHtml(p.url)}" target="_blank" class="text-sm text-blue-400 hover:underline truncate">${escHtml(p.url)}</a>
                                        </div>
                                        <span class="text-xs text-gray-500">${p.chunks_extracted || 0} chunks</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Search/Query Section -->
                <div class="card rounded-xl p-4 md:p-5">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">💬 Ask Knowledge Base</h3>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-gray-400">Mode:</label>
                            <select id="kb-mode-${t.id}" class="input-field rounded px-2 py-1 text-xs">
                                <option value="ai">🤖 AI Answer</option>
                                <option value="raw">📄 Raw Search</option>
                            </select>
                            
                        </div>
                    </div>
                    <div class="flex gap-3 mb-4">
                        <input type="text" id="kb-search-${t.id}" class="input-field flex-1 rounded-lg px-4 py-2" 
                               placeholder="Ask a question..." 
                               onkeypress="if(event.key==='Enter')askKnowledgeBase('${t.id}')">
                        <button onclick="askKnowledgeBase('${t.id}')" class="btn-primary px-4 py-2 rounded-lg">Ask</button>
                    </div>
                    <div id="kb-results-${t.id}" class="hidden">
                        <!-- Results will appear here -->
                    </div>
                </div>`;
            }
            
            // ========== WEBSITE TYPE ==========
            if(t.type==='website'){
                h+=`<div class="card rounded-xl p-4 md:p-5 mb-4">
                    <h3 class="font-semibold mb-4">🌐 Web Scraping</h3>
                    <div class="flex flex-col sm:flex-row gap-3 mb-4">
                        <input type="text" id="scrape-url" class="input-field flex-1 rounded-lg px-4 py-2" placeholder="https://example.com" value="${t.config?.url||''}">
                        <div class="flex gap-2 items-center">
                            <label class="flex items-center gap-2 text-sm">
                                <input type="checkbox" id="scrape-rec" class="rounded">
                                <span>Recursive</span>
                            </label>
                            <input type="number" id="scrape-max" class="input-field w-20 rounded px-2 py-2" value="10" placeholder="Max">
                            <button onclick="scrape('${t.id}')" class="btn-primary px-4 py-2 rounded-lg">🔄 Scrape</button>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        ${t.scraped_pages?.length ? t.scraped_pages.map(p=>`
                            <div class="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="min-w-0 flex-1 cursor-pointer" onclick="viewPageContent('${p.id}')">
                                        <p class="text-sm truncate font-medium">${p.title||'Untitled'}</p>
                                        <p class="text-xs text-gray-500 truncate">${p.url}</p>
                                    </div>
                                    <div class="flex gap-1 ml-2">
                                        <button onclick="viewPageContent('${p.id}')" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="View Content">👁️</button>
                                        <a href="${p.url}" target="_blank" class="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Open URL">🔗</a>
                                        <button onclick="delPage('${p.id}','${t.id}')" class="p-2 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">🗑️</button>
                                    </div>
                                </div>
                                <div class="flex gap-3 text-xs text-gray-500">
                                    <span>📝 ${p.chunks?.length || 0} chunks</span>
                                    <span>📄 ${(p.content?.length || 0).toLocaleString()} chars</span>
                                    <span class="status-${p.status}">${p.status}</span>
                                </div>
                            </div>
                        `).join('') : '<p class="text-gray-500 text-center py-4">No pages scraped yet. Enter a URL above.</p>'}
                    </div>
                </div>`;
            }
            
            // ========== EMAIL TYPE ==========
            if(t.type==='email'){
                const emailConfig = t.config || {};
                const provider = emailConfig.provider || 'Not configured';
                const email = emailConfig.email || '';
                const isConnected = !!emailConfig.provider;
                
                h+=`<div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">📧 Email Configuration</h3>
                        <span class="text-xs px-2 py-1 rounded ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                            ${isConnected ? '✓ Connected' : '✗ Not Connected'}
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Provider</label>
                            <div class="input-field w-full rounded px-3 py-2 bg-gray-800">${provider === 'google' ? '🔵 Gmail' : provider === 'sendgrid' ? '📨 SendGrid' : provider === 'microsoft' ? '🔷 Outlook' : provider}</div>
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Email Address</label>
                            <div class="input-field w-full rounded px-3 py-2 bg-gray-800">${email || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Send Email Form -->
                <div class="card rounded-xl p-4 md:p-5 mb-4">
                    <h3 class="font-semibold mb-4">✉️ Send Email</h3>
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">To *</label>
                            <input type="email" id="email-to-${t.id}" class="input-field w-full rounded px-3 py-2" placeholder="recipient@example.com">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Subject *</label>
                            <input type="text" id="email-subject-${t.id}" class="input-field w-full rounded px-3 py-2" placeholder="Email subject">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Message *</label>
                            <textarea id="email-body-${t.id}" class="input-field w-full rounded px-3 py-2" rows="5" placeholder="Write your email message..."></textarea>
                        </div>
                        <div class="flex items-center justify-between">
                            <label class="flex items-center gap-2 text-sm text-gray-400">
                                <input type="checkbox" id="email-html-${t.id}" class="w-4 h-4">
                                <span>Send as HTML</span>
                            </label>
                            <button onclick="sendEmailFromTool('${t.id}')" class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2" ${!isConnected ? 'disabled' : ''}>
                                📤 Send Email
                            </button>
                        </div>
                    </div>
                    <div id="email-result-${t.id}" class="mt-4 hidden"></div>
                </div>`;
            }
            
            // ========== API TYPE ==========
            if(t.type==='api'){
                const apiConfig = t.api_config || {};
                const mockResponse = t.config?.mock_response ? JSON.stringify(t.config.mock_response, null, 2) : '{}';
                const isDemoMode = t.config?.demo_mode || false;
                
                h+=`<div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">🔌 API Configuration</h3>
                        ${isDemoMode ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Has Sample Response</span>' : ''}
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Base URL</label>
                            <input type="text" id="api-base-url-${t.id}" class="input-field w-full rounded px-3 py-2" value="${apiConfig.base_url || ''}">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Endpoint Path</label>
                            <input type="text" id="api-endpoint-${t.id}" class="input-field w-full rounded px-3 py-2" value="${apiConfig.endpoint_path || ''}">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">HTTP Method</label>
                            <select id="api-method-${t.id}" class="input-field w-full rounded px-3 py-2">
                                <option value="GET" ${apiConfig.http_method === 'GET' ? 'selected' : ''}>GET</option>
                                <option value="POST" ${apiConfig.http_method === 'POST' ? 'selected' : ''}>POST</option>
                                <option value="PUT" ${apiConfig.http_method === 'PUT' ? 'selected' : ''}>PUT</option>
                                <option value="DELETE" ${apiConfig.http_method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            </select>
                            
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Auth Type</label>
                            <select id="api-auth-${t.id}" class="input-field w-full rounded px-3 py-2">
                                <option value="none" ${apiConfig.auth_type === 'none' ? 'selected' : ''}>None</option>
                                <option value="api_key" ${apiConfig.auth_type === 'api_key' ? 'selected' : ''}>API Key</option>
                                <option value="bearer" ${apiConfig.auth_type === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                                <option value="basic" ${apiConfig.auth_type === 'basic' ? 'selected' : ''}>Basic Auth</option>
                            </select>
                            
                        </div>
                    </div>
                    
                    <button onclick="updateApiConfig('${t.id}')" class="btn-secondary px-4 py-2 rounded-lg text-sm mb-4">💾 Save Configuration</button>
                    
                    <!-- Parameters -->
                    ${apiConfig.input_parameters?.length ? `
                        <div class="mb-4">
                            <h4 class="text-sm font-medium text-gray-300 mb-2">Parameters</h4>
                            <div class="space-y-2">
                                ${apiConfig.input_parameters.map(p=>`
                                    <div class="bg-gray-800 rounded px-3 py-2 flex items-center gap-3">
                                        <span class="text-purple-400 font-mono">{${p.name}}</span>
                                        <span class="text-xs text-gray-500">${p.data_type}</span>
                                        ${p.required ? '<span class="text-xs text-red-400">required</span>' : ''}
                                        <span class="text-xs text-gray-500 flex-1">${p.description || ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Sample Response Editor (for testing without real API) -->
                ${isDemoMode ? `
                <div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">📝 Sample Response</h3>
                        <button onclick="saveMockResponse('${t.id}')" class="btn-primary px-4 py-2 rounded-lg text-sm">💾 Save</button>
                    </div>
                    <textarea id="mock-response-${t.id}" class="input-field w-full rounded-lg px-4 py-3 font-mono text-sm" rows="12" placeholder="Enter JSON sample response...">${escHtml(mockResponse)}</textarea>
                    <p class="text-xs text-gray-500 mt-2">This JSON will be returned when the agent calls this API during testing.</p>
                </div>
                ` : ''}
                
                <!-- Output Transformation (Natural Language) -->
                <div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">✨ Output Transformation</h3>
                        <button onclick="saveOutputTransform('${t.id}')" class="btn-primary px-4 py-2 rounded-lg text-sm">💾 Save</button>
                    </div>
                    <p class="text-sm text-gray-400 mb-3">Describe in plain English how you want the API response to be transformed:</p>
                    <textarea id="output-transform-${t.id}" class="input-field w-full rounded-lg px-4 py-3 text-sm" rows="3" 
                              placeholder="Examples:&#10;• Show only the total amount&#10;• Extract just the employee names as a list&#10;• Format as a summary with key metrics&#10;• Convert to a simple success/failure message">${escHtml(t.config?.output_transform || '')}</textarea>
                    <div class="flex items-center gap-4 mt-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="transform-enabled-${t.id}" class="w-4 h-4 rounded" ${t.config?.transform_enabled ? 'checked' : ''}>
                            <span class="text-sm text-gray-400">Enable transformation</span>
                        </label>
                        <span class="text-xs text-gray-500">When enabled, the API response will be transformed by AI based on your instructions</span>
                    </div>
                </div>
                
                <!-- Test API -->
                <div class="card rounded-xl p-4 md:p-5">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">🧪 Test API</h3>
                        <div class="flex gap-2">
                            ${isDemoMode ? `
                                <button onclick="analyzeApiParams('${t.id}')" class="btn-secondary px-3 py-1.5 rounded-lg text-sm" id="btn-analyze-${t.id}">
                                    🔍 Analyze Parameters
                                </button>
                                <button onclick="autoFillTestData('${t.id}')" class="btn-secondary px-3 py-1.5 rounded-lg text-sm">
                                    ✨ Auto-fill
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- Parameters Container - Will be populated by LLM analysis or default -->
                    <div id="api-params-container-${t.id}">
                        ${apiConfig.input_parameters?.length ? `
                            <p class="text-sm text-gray-400 mb-3">Enter values below to try the API. Optional fields can be left empty.</p>
                            <div class="space-y-4 mb-4">
                                ${apiConfig.input_parameters.map(p => `
                                <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50" id="param-wrapper-${p.name}">
                                    <div class="flex items-center justify-between mb-2">
                                        <label class="text-sm font-medium text-gray-200">${p.name} ${p.required ? '<span class="text-red-400">*</span>' : ''}</label>
                                        <span class="text-xs text-gray-500">${p.data_type || 'string'}</span>
                                    </div>
                                    ${p.description ? `<p class="text-xs text-gray-500 mb-2">${p.description}</p>` : ''}
                                    <div id="param-input-area-${p.name}">
                                        <input type="text" id="test-param-${p.name}" class="input-field w-full rounded-lg px-3 py-2.5 text-sm" placeholder="Enter ${p.name}..." />
                                    </div>
                                </div>
                                `).join('')}
                            </div>
                            ${isDemoMode ? `
                            <div class="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4 text-sm" id="analyze-hint-${t.id}">
                                <p class="text-blue-300">💡 Click "🔍 Analyze Parameters" to get smart input options based on your API configuration.</p>
                            </div>
                            ` : ''}
                        ` : '<p class="text-gray-500 text-sm mb-4">This API doesn\'t need any values. Click "Test Call" to try it.</p>'}
                    </div>
                    
                    <div class="flex gap-2">
                        <button onclick="testApiCall('${t.id}')" class="btn-primary px-6 py-2 rounded-lg">
                            ▶️ Test Call
                        </button>
                        ${isDemoMode ? `
                            <span class="text-xs text-purple-400 flex items-center gap-1">
                                ✓ Sample response configured
                            </span>
                        ` : ''}
                    </div>
                    
                    <div id="api-test-result-${t.id}" class="hidden mt-4">
                        <h4 class="text-sm font-medium text-gray-300 mb-2">Response:</h4>
                        <pre class="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm"></pre>
                    </div>
                </div>`;
            }
            
            // ========== ANY OTHER TOOL TYPE (Generic Config) ==========
            const handledTypes = ['document', 'knowledge', 'website', 'api'];
            if(!handledTypes.includes(t.type)) {
                const configJson = JSON.stringify(t.config || {}, null, 2);
                const toolIcon = {
                    'database': '🗄️',
                    'slack': '💬',
                    'email': '📧',
                    'calendar': '📅',
                    'crm': '👥',
                    'code': '💻',
                    'websearch': '🔍',
                    'ocr': '📷'
                }[t.type] || '🔧';
                
                h+=`<div class="card rounded-xl p-4 md:p-5 mb-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold">${toolIcon} ${t.type.toUpperCase()} Configuration</h3>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Tool Name</label>
                            <input type="text" id="tool-name-${t.id}" class="input-field w-full rounded px-3 py-2" value="${escHtml(t.name || '')}">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Description</label>
                            <textarea id="tool-desc-${t.id}" class="input-field w-full rounded px-3 py-2" rows="2">${escHtml(t.description || '')}</textarea>
                        </div>
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Configuration (JSON)</label>
                            <textarea id="tool-config-${t.id}" class="input-field w-full rounded-lg px-4 py-3 font-mono text-sm" rows="10" placeholder="{}">${escHtml(configJson)}</textarea>
                            <p class="text-xs text-gray-500 mt-1">Edit the JSON configuration for this tool</p>
                        </div>
                        
                        <button onclick="saveToolConfig('${t.id}')" class="btn-primary px-4 py-2 rounded-lg">💾 Save Configuration</button>
                    </div>
                </div>
                
                <!-- Test Section -->
                <div class="card rounded-xl p-4 md:p-5">
                    <h3 class="font-semibold mb-4">🧪 Test Tool</h3>
                    <div class="space-y-3 mb-4">
                        <div>
                            <label class="text-xs text-gray-400 block mb-1">Test Input</label>
                            <textarea id="tool-test-input-${t.id}" class="input-field w-full rounded px-3 py-2 font-mono text-sm" rows="3" placeholder='{"query": "test"}'>{}</textarea>
                        </div>
                    </div>
                    <button onclick="testGenericTool('${t.id}')" class="btn-primary px-4 py-2 rounded-lg mb-4">▶️ Test</button>
                    
                    <div id="tool-test-result-${t.id}" class="hidden">
                        <h4 class="text-sm font-medium text-gray-300 mb-2">Result:</h4>
                        <pre class="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm"></pre>
                    </div>
                </div>`;
            }
            
            document.getElementById('tool-detail').innerHTML=h;
            document.querySelectorAll('main>section').forEach(s=>s.classList.add('hidden'));
            document.getElementById('page-tool-detail').classList.remove('hidden');
        }

        async function uploadDocs(tid,e){
            const btn = e.target;
            for(const f of e.target.files){
                const fd=new FormData();
                fd.append('file',f);
                await fetch(API+'/api/tools/'+tid+'/documents',{method:'POST',body:fd});
            }
            viewTool(tid);
        }
        
        function handleDocDrop(e, tid) {
            e.preventDefault();
            e.target.classList.remove('border-purple-500');
            const files = e.dataTransfer.files;
            if(files.length > 0) {
                uploadDocsFromDrop(tid, files);
            }
        }
        
        async function uploadDocsFromDrop(tid, files) {
            for(const f of files) {
                const fd = new FormData();
                fd.append('file', f);
                await fetch(API+'/api/tools/'+tid+'/documents', {method:'POST', body:fd});
            }
            viewTool(tid);
        }
        
        async function delDoc(docId, toolId){
            if(!confirm('Delete this document?')) return;
            await fetch(API+'/api/documents/'+docId, {
                method:'DELETE',
                headers: getAuthHeaders()
            });
            if(toolId) viewTool(toolId);
            else location.reload();
        }
        
        // View Demo KB full content
        async function viewDemoKbFullContent(toolId) {
            try {
                const r = await fetch(API + '/api/tools/' + toolId, { headers: getAuthHeaders() });
                const t = await r.json();
                
                const sections = t.config?.sections || [];
                const content = t.config?.content || '';
                
                let html = `<p class="text-gray-400 mb-4">${escHtml(t.description)}</p>`;
                
                if (sections.length > 0) {
                    html += sections.map(s => `
                        <div class="mb-6">
                            <h3 class="text-lg font-semibold text-purple-400 mb-2">${escHtml(s.title)}</h3>
                            <div class="text-gray-300 whitespace-pre-wrap">${escHtml(s.content)}</div>
                        </div>
                    `).join('');
                } else if (content) {
                    html += `<div class="text-gray-300 whitespace-pre-wrap">${escHtml(content)}</div>`;
                }
                
                document.getElementById('kb-view-title').textContent = t.name;
                document.getElementById('kb-view-content').innerHTML = html;
                ensureModalInBody('kb-view-modal');
                document.getElementById('kb-view-modal').classList.remove('hidden');
                document.getElementById('kb-view-modal').classList.add('flex');
            } catch (e) {
                alert('Failed to load content');
            }
        }

        async function viewDocContent(docId, docName) {
            try {
                const r = await fetch(API+'/api/documents/'+docId+'/content');
                const data = await r.json();
                
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
                modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
                
                modal.innerHTML = `
                    <div class="bg-[#1e1e2e] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                            <h3 class="font-semibold truncate">${docName}</h3>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div class="p-4 overflow-auto flex-1">
                            <pre class="whitespace-pre-wrap text-sm text-gray-300">${escHtml(data.content || data.text || 'No content available')}</pre>
                        </div>
                        <div class="p-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                            <span>${data.chunks_count || 0} chunks indexed</span>
                            <span>${(data.content?.length || 0).toLocaleString()} characters</span>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch(e) {
                alert('Failed to load document: ' + e.message);
            }
        }
        
        async function viewTextEntry(toolId, docName, isTextEntry = false) {
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/data');
                const data = await r.json();
                
                // Find chunks for this document
                const chunks = data.chunks?.filter(c => c.source === docName) || [];
                const content = chunks.map(c => c.text).join('\n\n');
                
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
                modal.id = 'text-entry-modal';
                modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
                
                modal.innerHTML = `
                    <div class="bg-[#1e1e2e] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="font-semibold">${escHtml(docName)}</h3>
                                ${isTextEntry ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Text Entry</span>' : ''}
                            </div>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div class="p-4 flex-1 overflow-auto">
                            <label class="text-sm text-gray-400 mb-2 block">${isTextEntry ? 'Edit Content:' : 'Content (Read-only for uploaded files):'}</label>
                            <textarea id="text-entry-content" class="input-field w-full rounded-lg px-4 py-3 font-mono text-sm" rows="15" ${isTextEntry ? '' : 'readonly'}>${escHtml(content)}</textarea>
                        </div>
                        <div class="p-4 border-t border-gray-700 flex justify-between items-center">
                            <span class="text-xs text-gray-500">${chunks.length} chunk(s) • ${content.length.toLocaleString()} characters</span>
                            <div class="flex gap-2">
                                <button onclick="document.getElementById('text-entry-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg">Close</button>
                                ${isTextEntry ? `<button onclick="saveTextEntry('${toolId}', '${escHtml(docName)}')" class="btn-primary px-4 py-2 rounded-lg">💾 Save Changes</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch(e) {
                alert('Failed to load document: ' + e.message);
            }
        }
        
        // Keep old function names for backward compatibility
        async function viewDemoDocContent(toolId, docName) {
            return viewTextEntry(toolId, docName, true);
        }
        
        async function saveTextEntry(toolId, docName) {
            const content = document.getElementById('text-entry-content')?.value;
            if(!content) return alert('Content cannot be empty');
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/demo-document', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ source: docName, content })
                });
                const data = await r.json();
                
                if(data.status === 'success') {
                    alert('✅ Entry updated!');
                    document.getElementById('text-entry-modal')?.remove();
                    viewTool(toolId); // Refresh
                } else {
                    alert('Error: ' + (data.error || 'Failed to save'));
                }
            } catch(e) {
                alert('Failed to save: ' + e.message);
            }
        }
        
        // Keep old function name for backward compatibility
        async function saveDemoDocContent(toolId, docName) {
            return saveTextEntry(toolId, docName);
        }
        
        async function deleteTextEntry(toolId, docName) {
            if(!confirm(`Delete "${docName}"?`)) return;
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/demo-document/'+encodeURIComponent(docName), {
                    method: 'DELETE'
                });
                const data = await r.json();
                
                if(data.status === 'success') {
                    viewTool(toolId); // Refresh
                } else {
                    alert('Error: ' + (data.error || 'Failed to delete'));
                }
            } catch(e) {
                alert('Failed to delete: ' + e.message);
            }
        }
        
        // Keep old function name for backward compatibility
        async function deleteDemoDoc(toolId, docName) {
            return deleteTextEntry(toolId, docName);
        }
        
        function showAddTextEntryModal(toolId) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
            modal.id = 'add-text-entry-modal';
            modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
            
            modal.innerHTML = `
                <div class="bg-[#1e1e2e] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 class="font-semibold">✍️ Add Text Entry</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                    </div>
                    <div class="p-4 flex-1 overflow-auto space-y-4">
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">Title *</label>
                            <input type="text" id="new-text-entry-title" class="input-field w-full rounded-lg px-4 py-2" placeholder="e.g., Company Policy, FAQ, Product Info">
                        </div>
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">Content *</label>
                            <textarea id="new-text-entry-content" class="input-field w-full rounded-lg px-4 py-3 font-mono text-sm" rows="12" placeholder="Enter the text content that will be searchable by the agent..."></textarea>
                            <p class="text-xs text-gray-500 mt-1">💡 Tip: You can add multiple entries for different topics to organize your knowledge base.</p>
                        </div>
                    </div>
                    <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                        <button onclick="document.getElementById('add-text-entry-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg">Cancel</button>
                        <button onclick="addTextEntry('${toolId}')" class="btn-primary px-4 py-2 rounded-lg">✍️ Add Entry</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Keep old function name for backward compatibility
        function showAddDemoDocModal(toolId) {
            return showAddTextEntryModal(toolId);
        }
        
        async function addTextEntry(toolId) {
            const title = document.getElementById('new-text-entry-title')?.value?.trim();
            const content = document.getElementById('new-text-entry-content')?.value?.trim();
            
            if(!title || !content) {
                return alert('Please enter both title and content');
            }
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/demo-document', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ source: title, content })
                });
                const data = await r.json();
                
                if(data.status === 'success') {
                    alert('✅ Entry added!');
                    document.getElementById('add-text-entry-modal')?.remove();
                    viewTool(toolId); // Refresh
                } else {
                    alert('Error: ' + (data.error || 'Failed to add'));
                }
            } catch(e) {
                alert('Failed to add: ' + e.message);
            }
        }
        
        // Keep old function name for backward compatibility
        async function addDemoDoc(toolId) {
            return addTextEntry(toolId);
        }
        
