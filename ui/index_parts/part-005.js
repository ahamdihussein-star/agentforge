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
            const r=await fetch(API+'/api/tools/'+id);
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
                const r = await fetch(API + '/api/tools/' + toolId);
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
        
        // ========== URL SCRAPING FUNCTIONS ==========
        function showAddUrlModal(toolId) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
            modal.id = 'add-url-modal';
            modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
            
            modal.innerHTML = `
                <div class="bg-[#1e1e2e] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 class="font-semibold">🌐 Add URL / Scrape Website</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                    </div>
                    <div class="p-4 flex-1 overflow-auto space-y-4">
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">Website URL *</label>
                            <input type="url" id="scrape-url" class="input-field w-full rounded-lg px-4 py-2" placeholder="https://example.com/page">
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="scrape-recursive" class="w-4 h-4 rounded">
                                <span class="text-sm">Scrape linked pages (recursive)</span>
                            </label>
                        </div>
                        
                        <div id="scrape-options" class="hidden">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-sm text-gray-400 mb-1 block">Max Pages</label>
                                    <input type="number" id="scrape-max" class="input-field w-full rounded-lg px-4 py-2" value="10" min="1" max="100">
                                </div>
                                <div>
                                    <label class="text-sm text-gray-400 mb-1 block">Max Depth</label>
                                    <input type="number" id="scrape-depth" class="input-field w-full rounded-lg px-4 py-2" value="2" min="1" max="5">
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 text-sm">
                            <p class="text-blue-300">💡 The content will be extracted and added to your knowledge base for the agent to search.</p>
                        </div>
                        
                        <div id="scrape-status" class="hidden"></div>
                    </div>
                    <div class="p-4 border-t border-gray-700 flex justify-end gap-2">
                        <button onclick="document.getElementById('add-url-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg">Cancel</button>
                        <button onclick="scrapeUrlForTool('${toolId}')" id="btn-scrape" class="btn-primary px-4 py-2 rounded-lg">🌐 Scrape URL</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Toggle recursive options
            document.getElementById('scrape-recursive').onchange = (e) => {
                document.getElementById('scrape-options').classList.toggle('hidden', !e.target.checked);
            };
        }
        
        async function scrapeUrlForTool(toolId) {
            const url = document.getElementById('scrape-url')?.value?.trim();
            if (!url) return alert('Please enter a URL');
            if (!url.startsWith('http')) return alert('Please enter a valid URL starting with http:// or https://');
            
            const recursive = document.getElementById('scrape-recursive')?.checked || false;
            const maxPages = parseInt(document.getElementById('scrape-max')?.value) || 10;
            const maxDepth = parseInt(document.getElementById('scrape-depth')?.value) || 2;
            
            const statusEl = document.getElementById('scrape-status');
            const btnEl = document.getElementById('btn-scrape');
            
            statusEl.classList.remove('hidden');
            statusEl.innerHTML = '<div class="flex items-center gap-2 text-blue-300"><span class="animate-spin">⏳</span> Scraping website...</div>';
            btnEl.disabled = true;
            btnEl.textContent = 'Scraping...';
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        url, 
                        recursive, 
                        max_pages: maxPages,
                        max_depth: maxDepth
                    })
                });
                
                const data = await r.json();
                
                if (r.ok) {
                    statusEl.innerHTML = '<div class="text-green-300">✅ Successfully scraped! Extracted ' + (data.chunks_extracted || 0) + ' chunks.</div>';
                    setTimeout(() => {
                        document.getElementById('add-url-modal')?.remove();
                        viewTool(toolId); // Refresh
                    }, 1500);
                } else {
                    statusEl.innerHTML = '<div class="text-red-300">❌ ' + (data.detail || data.error || 'Failed to scrape') + '</div>';
                    btnEl.disabled = false;
                    btnEl.textContent = '🌐 Scrape URL';
                }
            } catch (e) {
                statusEl.innerHTML = '<div class="text-red-300">❌ Error: ' + e.message + '</div>';
                btnEl.disabled = false;
                btnEl.textContent = '🌐 Scrape URL';
            }
        }
        
        // ========== TABLE FUNCTIONS ==========
        let currentTableData = { headers: [], rows: [] };
        let currentTableToolId = null;
        let currentTableName = null;
        
        function showAddTableModal(toolId) {
            currentTableToolId = toolId;
            currentTableData = { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] };
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
            modal.id = 'add-table-modal';
            modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
            
            modal.innerHTML = `
                <div class="bg-[#1e1e2e] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 class="font-semibold">📊 Add Table</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                    </div>
                    <div class="p-4 flex-1 overflow-auto space-y-4">
                        <!-- Table Name -->
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">Table Name *</label>
                            <input type="text" id="table-name" class="input-field w-full rounded-lg px-4 py-2" placeholder="e.g., Employee Directory, Product Catalog">
                        </div>
                        
                        <!-- Import Options -->
                        <div class="flex gap-3 items-center p-3 bg-gray-800/50 rounded-lg">
                            <span class="text-sm text-gray-400">Import from:</span>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="file" id="table-file-input" class="hidden" accept=".csv,.xlsx,.xls" onchange="importTableFromFile(event)">
                                <button onclick="document.getElementById('table-file-input').click()" class="btn-secondary px-3 py-1.5 rounded text-sm">
                                    📁 CSV/Excel
                                </button>
                            </label>
                            <span class="text-gray-500">or create manually below</span>
                        </div>
                        
                        <!-- Table Size Controls -->
                        <div class="flex gap-4 items-center">
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-400">Columns:</label>
                                <button onclick="changeTableCols(-1)" class="btn-secondary w-8 h-8 rounded">-</button>
                                <span id="col-count" class="w-8 text-center">3</span>
                                <button onclick="changeTableCols(1)" class="btn-secondary w-8 h-8 rounded">+</button>
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="text-sm text-gray-400">Rows:</label>
                                <button onclick="changeTableRows(-1)" class="btn-secondary w-8 h-8 rounded">-</button>
                                <span id="row-count" class="w-8 text-center">2</span>
                                <button onclick="changeTableRows(1)" class="btn-secondary w-8 h-8 rounded">+</button>
                            </div>
                        </div>
                        
                        <!-- Editable Table -->
                        <div class="overflow-x-auto">
                            <div id="table-editor"></div>
                        </div>
                    </div>
                    <div class="p-4 border-t border-gray-700 flex justify-between items-center">
                        <span class="text-xs text-gray-500">💡 Click any cell to edit. Table data will be searchable by the agent.</span>
                        <div class="flex gap-2">
                            <button onclick="document.getElementById('add-table-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg">Cancel</button>
                            <button onclick="saveNewTable()" class="btn-primary px-4 py-2 rounded-lg">📊 Add Table</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            renderTableEditor();
        }
        
        function renderTableEditor(containerId = 'table-editor') {
            const container = document.getElementById(containerId);
            if(!container) return;
            
            let html = '<table class="w-full border-collapse text-sm">';
            
            // Headers row
            html += '<tr>';
            currentTableData.headers.forEach((h, i) => {
                html += `<th class="border border-gray-600 p-0">
                    <input type="text" value="${escHtml(h)}" 
                           onchange="currentTableData.headers[${i}]=this.value" 
                           class="w-full bg-gray-700 text-white font-semibold px-3 py-2 text-center outline-none focus:bg-gray-600"
                           placeholder="Header ${i+1}">
                </th>`;
            });
            html += '</tr>';
            
            // Data rows
            currentTableData.rows.forEach((row, ri) => {
                html += '<tr>';
                row.forEach((cell, ci) => {
                    html += `<td class="border border-gray-700 p-0">
                        <input type="text" value="${escHtml(cell)}" 
                               onchange="currentTableData.rows[${ri}][${ci}]=this.value"
                               class="w-full bg-gray-800 px-3 py-2 outline-none focus:bg-gray-700"
                               placeholder="">
                    </td>`;
                });
                html += '</tr>';
            });
            
            html += '</table>';
            container.innerHTML = html;
            
            // Update counters
            const colCount = document.getElementById('col-count');
            const rowCount = document.getElementById('row-count');
            if(colCount) colCount.textContent = currentTableData.headers.length;
            if(rowCount) rowCount.textContent = currentTableData.rows.length;
        }
        
        function changeTableCols(delta) {
            const newCount = currentTableData.headers.length + delta;
            if(newCount < 1 || newCount > 20) return;
            
            if(delta > 0) {
                currentTableData.headers.push(`Column ${newCount}`);
                currentTableData.rows.forEach(row => row.push(''));
            } else {
                currentTableData.headers.pop();
                currentTableData.rows.forEach(row => row.pop());
            }
            renderTableEditor();
        }
        
        function changeTableRows(delta) {
            const newCount = currentTableData.rows.length + delta;
            if(newCount < 1 || newCount > 100) return;
            
            if(delta > 0) {
                currentTableData.rows.push(new Array(currentTableData.headers.length).fill(''));
            } else {
                currentTableData.rows.pop();
            }
            renderTableEditor();
        }
        
        function importTableFromFile(event) {
            const file = event.target.files[0];
            if(!file) return;
            
            const fileName = file.name.toLowerCase();
            
            if(fileName.endsWith('.csv')) {
                // Parse CSV
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target.result;
                    parseCSVToTable(text);
                };
                reader.readAsText(file);
            } else if(fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // Parse Excel using SheetJS
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        // Dynamic import SheetJS
                        if(!window.XLSX) {
                            const script = document.createElement('script');
                            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                            document.head.appendChild(script);
                            await new Promise(r => script.onload = r);
                        }
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, {type: 'array'});
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                        
                        if(jsonData.length > 0) {
                            currentTableData.headers = jsonData[0].map(h => String(h || ''));
                            currentTableData.rows = jsonData.slice(1).map(row => 
                                currentTableData.headers.map((_, i) => String(row[i] || ''))
                            );
                            if(currentTableData.rows.length === 0) {
                                currentTableData.rows = [new Array(currentTableData.headers.length).fill('')];
                            }
                            renderTableEditor();
                            
                            // Auto-fill table name from filename
                            const tableName = document.getElementById('table-name');
                            if(tableName && !tableName.value) {
                                tableName.value = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
                            }
                        }
                    } catch(err) {
                        alert('Failed to parse Excel file: ' + err.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        }
        
        function parseCSVToTable(csvText) {
            const lines = csvText.split(/\r?\n/).filter(line => line.trim());
            if(lines.length === 0) return;
            
            // Simple CSV parser (handles basic cases)
            const parseRow = (line) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                
                for(let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if(char === '"') {
                        inQuotes = !inQuotes;
                    } else if(char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };
            
            currentTableData.headers = parseRow(lines[0]);
            currentTableData.rows = lines.slice(1).map(line => {
                const row = parseRow(line);
                // Ensure row has same length as headers
                while(row.length < currentTableData.headers.length) row.push('');
                return row.slice(0, currentTableData.headers.length);
            });
            
            if(currentTableData.rows.length === 0) {
                currentTableData.rows = [new Array(currentTableData.headers.length).fill('')];
            }
            
            renderTableEditor();
        }
        
        async function saveNewTable() {
            const tableName = document.getElementById('table-name')?.value?.trim();
            if(!tableName) return alert('Please enter a table name');
            if(currentTableData.headers.length === 0) return alert('Table must have at least one column');
            
            // Convert table to searchable text format
            const tableContent = convertTableToText(tableName, currentTableData);
            
            try {
                const r = await fetch(API+'/api/tools/'+currentTableToolId+'/table-entry', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        source: tableName, 
                        content: tableContent,
                        table_data: currentTableData
                    })
                });
                const data = await r.json();
                
                if(data.status === 'success') {
                    alert('✅ Table added!');
                    document.getElementById('add-table-modal')?.remove();
                    viewTool(currentTableToolId);
                } else {
                    alert('Error: ' + (data.error || 'Failed to add'));
                }
            } catch(e) {
                alert('Failed to add: ' + e.message);
            }
        }
        
        function convertTableToText(tableName, tableData) {
            let text = `## ${tableName}\n\n`;
            
            // Add as markdown table
            text += '| ' + tableData.headers.join(' | ') + ' |\n';
            text += '| ' + tableData.headers.map(() => '---').join(' | ') + ' |\n';
            tableData.rows.forEach(row => {
                text += '| ' + row.join(' | ') + ' |\n';
            });
            
            text += '\n\n### Records:\n\n';
            
            // Also add as structured text for better search
            tableData.rows.forEach((row, i) => {
                text += `**Record ${i + 1}:**\n`;
                tableData.headers.forEach((h, j) => {
                    if(row[j]) text += `- ${h}: ${row[j]}\n`;
                });
                text += '\n';
            });
            
            return text;
        }
        
        async function viewTableEntry(toolId, tableName) {
            currentTableToolId = toolId;
            currentTableName = tableName;
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/table-entry/'+encodeURIComponent(tableName));
                const data = await r.json();
                
                if(data.table_data) {
                    currentTableData = data.table_data;
                } else {
                    // Try to parse from content
                    currentTableData = { headers: ['Column 1'], rows: [['No data']] };
                }
                
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
                modal.id = 'view-table-modal';
                modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
                
                modal.innerHTML = `
                    <div class="bg-[#1e1e2e] rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <h3 class="font-semibold">${escHtml(tableName)}</h3>
                                <span class="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">Table</span>
                            </div>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div class="p-4 flex-1 overflow-auto space-y-4">
                            <!-- Table Size Controls -->
                            <div class="flex gap-4 items-center">
                                <div class="flex items-center gap-2">
                                    <label class="text-sm text-gray-400">Columns:</label>
                                    <button onclick="changeTableCols(-1);renderTableEditor('view-table-editor')" class="btn-secondary w-8 h-8 rounded">-</button>
                                    <span id="col-count" class="w-8 text-center">${currentTableData.headers.length}</span>
                                    <button onclick="changeTableCols(1);renderTableEditor('view-table-editor')" class="btn-secondary w-8 h-8 rounded">+</button>
                                </div>
                                <div class="flex items-center gap-2">
                                    <label class="text-sm text-gray-400">Rows:</label>
                                    <button onclick="changeTableRows(-1);renderTableEditor('view-table-editor')" class="btn-secondary w-8 h-8 rounded">-</button>
                                    <span id="row-count" class="w-8 text-center">${currentTableData.rows.length}</span>
                                    <button onclick="changeTableRows(1);renderTableEditor('view-table-editor')" class="btn-secondary w-8 h-8 rounded">+</button>
                                </div>
                                <button onclick="exportTableToCSV('${escHtml(tableName)}')" class="btn-secondary px-3 py-1.5 rounded text-sm ml-auto">
                                    📥 Export CSV
                                </button>
                            </div>
                            
                            <!-- Editable Table -->
                            <div class="overflow-x-auto">
                                <div id="view-table-editor"></div>
                            </div>
                        </div>
                        <div class="p-4 border-t border-gray-700 flex justify-between items-center">
                            <span class="text-xs text-gray-500">${currentTableData.headers.length} columns × ${currentTableData.rows.length} rows</span>
                            <div class="flex gap-2">
                                <button onclick="document.getElementById('view-table-modal').remove()" class="btn-secondary px-4 py-2 rounded-lg">Cancel</button>
                                <button onclick="updateTableEntry()" class="btn-primary px-4 py-2 rounded-lg">💾 Save Changes</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                renderTableEditor('view-table-editor');
                
            } catch(e) {
                alert('Failed to load table: ' + e.message);
            }
        }
        
        async function updateTableEntry() {
            const tableContent = convertTableToText(currentTableName, currentTableData);
            
            try {
                const r = await fetch(API+'/api/tools/'+currentTableToolId+'/table-entry/'+encodeURIComponent(currentTableName), {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        content: tableContent,
                        table_data: currentTableData
                    })
                });
                const data = await r.json();
                
                if(data.status === 'success') {
                    alert('✅ Table updated!');
                    document.getElementById('view-table-modal')?.remove();
                    viewTool(currentTableToolId);
                } else {
                    alert('Error: ' + (data.error || 'Failed to update'));
                }
            } catch(e) {
                alert('Failed to update: ' + e.message);
            }
        }
        
        function exportTableToCSV(tableName) {
            let csv = currentTableData.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
            currentTableData.rows.forEach(row => {
                csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = tableName + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        async function downloadDoc(docId, docName) {
            try {
                const r = await fetch(API+'/api/documents/'+docId+'/download');
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = docName;
                a.click();
                URL.revokeObjectURL(url);
            } catch(e) {
                alert('Failed to download: ' + e.message);
            }
        }
        
        // Send email using email tool
        async function sendEmailFromTool(toolId) {
            const toEl = document.getElementById(`email-to-${toolId}`);
            const subjectEl = document.getElementById(`email-subject-${toolId}`);
            const bodyEl = document.getElementById(`email-body-${toolId}`);
            const htmlEl = document.getElementById(`email-html-${toolId}`);
            const resultEl = document.getElementById(`email-result-${toolId}`);
            
            const to = toEl?.value?.trim();
            const subject = subjectEl?.value?.trim();
            const body = bodyEl?.value?.trim();
            const html = htmlEl?.checked || false;
            
            if (!to) return alert('Please enter recipient email');
            if (!subject) return alert('Please enter email subject');
            if (!body) return alert('Please enter email message');
            
            // Show loading
            resultEl.classList.remove('hidden');
            resultEl.innerHTML = `
                <div class="flex items-center gap-2 text-blue-400 p-3 bg-blue-500/10 rounded-lg">
                    <span class="animate-spin">⏳</span>
                    <span>Sending email...</span>
                </div>
            `;
            
            try {
                const response = await fetch(API + `/api/tools/${toolId}/send-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to, subject, body, html })
                });
                
                const data = await response.json();
                
                if (response.ok && data.status === 'success') {
                    resultEl.innerHTML = `
                        <div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <div class="flex items-center gap-2 text-green-400 font-medium">
                                <span>✅</span>
                                <span>Email sent successfully!</span>
                            </div>
                            <p class="text-sm text-gray-400 mt-1">
                                To: ${escHtml(to)}<br>
                                Subject: ${escHtml(subject)}
                            </p>
                        </div>
                    `;
                    // Clear form
                    toEl.value = '';
                    subjectEl.value = '';
                    bodyEl.value = '';
                } else {
                    resultEl.innerHTML = `
                        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div class="flex items-center gap-2 text-red-400 font-medium">
                                <span>❌</span>
                                <span>Failed to send email</span>
                            </div>
                            <p class="text-sm text-gray-400 mt-1">${escHtml(data.detail || data.message || 'Unknown error')}</p>
                        </div>
                    `;
                }
            } catch (err) {
                resultEl.innerHTML = `
                    <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <div class="flex items-center gap-2 text-red-400">
                            <span>❌</span>
                            <span>Error: ${escHtml(err.message)}</span>
                        </div>
                    </div>
                `;
            }
        }
        
        async function askKnowledgeBase(toolId) {
            const query = document.getElementById('kb-search-'+toolId)?.value;
            if(!query) return alert('Please enter a question');
            
            const mode = document.getElementById('kb-mode-'+toolId)?.value || 'ai';
            const resultsDiv = document.getElementById('kb-results-'+toolId);
            
            resultsDiv.classList.remove('hidden');
            resultsDiv.innerHTML = `
                <div class="flex items-center gap-2 text-gray-400 py-4">
                    <span class="animate-spin">⏳</span>
                    <span>${mode === 'ai' ? 'Thinking...' : 'Searching...'}</span>
                </div>
            `;
            
            try {
                if (mode === 'ai') {
                    // AI-powered answer
                    const r = await fetch(API+'/api/tools/'+toolId+'/ask', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ query, top_k: 5 })
                    });
                    const data = await r.json();
                    
                    resultsDiv.innerHTML = `
                        <div class="space-y-4">
                            <!-- AI Answer -->
                            <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
                                <div class="flex items-start gap-3">
                                    <span class="text-2xl">🤖</span>
                                    <div class="flex-1">
                                        <p class="text-gray-200 whitespace-pre-wrap">${escHtml(data.answer || 'No answer generated')}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Sources -->
                            ${data.sources?.length ? `
                                <div class="pt-2 border-t border-gray-700">
                                    <p class="text-xs text-gray-500 mb-2">📚 Sources used:</p>
                                    <div class="flex flex-wrap gap-2">
                                        ${data.sources.map(s => `
                                            <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                                ${escHtml(s.source)} (${s.score}%)
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Confidence -->
                            <div class="flex items-center gap-2 text-xs text-gray-500">
                                <span>Confidence:</span>
                                <div class="flex-1 bg-gray-700 rounded-full h-2 max-w-[100px]">
                                    <div class="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" style="width: ${data.confidence || 0}%"></div>
                                </div>
                                <span>${data.confidence || 0}%</span>
                            </div>
                        </div>
                    `;
                } else {
                    // Raw search mode
                    const r = await fetch(API+'/api/tools/'+toolId+'/search', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ query, top_k: 5 })
                    });
                    const data = await r.json();
                    
                    if(data.results?.length) {
                        resultsDiv.innerHTML = `
                            <h4 class="text-sm font-medium text-gray-300 mb-3">Found ${data.results.length} results:</h4>
                            <div class="space-y-3">
                                ${data.results.map((r, i) => `
                                    <div class="bg-gray-800 rounded-lg p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="text-xs text-purple-400">#${i+1} - Score: ${(r.score * 100).toFixed(1)}%</span>
                                            <span class="text-xs text-gray-500">${r.source || 'Unknown source'}</span>
                                        </div>
                                        <p class="text-sm text-gray-300">${escHtml(r.text?.substring(0, 500) || '')}${r.text?.length > 500 ? '...' : ''}</p>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        resultsDiv.innerHTML = '<p class="text-gray-500 text-center py-4">No results found. Try a different query.</p>';
                    }
                }
            } catch(e) {
                resultsDiv.innerHTML = `<p class="text-red-400">Error: ${e.message}</p>`;
            }
        }
        
        // Keep old function for backward compatibility
        async function testKnowledgeSearch(toolId) {
            document.getElementById('kb-mode-'+toolId).value = 'raw';
            return askKnowledgeBase(toolId);
        }
        
        async function viewPageContent(pageId) {
            try {
                const r = await fetch(API+'/api/scraped-pages/'+pageId);
                const data = await r.json();
                
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4';
                modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
                
                modal.innerHTML = `
                    <div class="bg-[#1e1e2e] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div class="p-4 border-b border-gray-700">
                            <h3 class="font-semibold truncate">${data.title || 'Page Content'}</h3>
                            <a href="${data.url}" target="_blank" class="text-xs text-purple-400 hover:underline">${data.url}</a>
                        </div>
                        <div class="p-4 overflow-auto flex-1">
                            <pre class="whitespace-pre-wrap text-sm text-gray-300">${escHtml(data.content || 'No content')}</pre>
                        </div>
                        <div class="p-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                            <span>${data.chunks?.length || 0} chunks</span>
                            <span>${(data.content?.length || 0).toLocaleString()} characters</span>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch(e) {
                alert('Failed to load page: ' + e.message);
            }
        }
        
        async function delPage(pageId, toolId) {
            if(!confirm('Delete this page?')) return;
            await fetch(API+'/api/scraped-pages/'+pageId, {
                method:'DELETE',
                headers: getAuthHeaders()
            });
            if(toolId) viewTool(toolId);
            else location.reload();
        }
        
        async function updateApiConfig(toolId) {
            const config = {
                base_url: document.getElementById('api-base-url-'+toolId)?.value,
                endpoint_path: document.getElementById('api-endpoint-'+toolId)?.value,
                http_method: document.getElementById('api-method-'+toolId)?.value,
                auth_type: document.getElementById('api-auth-'+toolId)?.value
            };
            
            try {
                await fetch(API+'/api/tools/'+toolId, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ api_config: config })
                });
                alert('✅ Configuration saved!');
            } catch(e) {
                alert('Failed to save: ' + e.message);
            }
        }
        
        async function saveMockResponse(toolId) {
            const textarea = document.getElementById('mock-response-'+toolId);
            if(!textarea) return;
            
            try {
                const mockResponse = JSON.parse(textarea.value);
                await fetch(API+'/api/tools/'+toolId, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ config: { mock_response: mockResponse, demo_mode: true } })
                });
                alert('✅ Mock response saved!');
            } catch(e) {
                if(e instanceof SyntaxError) {
                    alert('Invalid JSON format. Please check your input.');
                } else {
                    alert('Failed to save: ' + e.message);
                }
            }
        }
        
        async function saveOutputTransform(toolId) {
            const textarea = document.getElementById('output-transform-'+toolId);
            const checkbox = document.getElementById('transform-enabled-'+toolId);
            if(!textarea) return;
            
            const outputTransform = textarea.value.trim();
            const transformEnabled = checkbox?.checked || false;
            
            try {
                // Get current tool config first
                const r = await fetch(API+'/api/tools/'+toolId);
                const tool = await r.json();
                const currentConfig = tool.config || {};
                
                // Update with new transform settings
                await fetch(API+'/api/tools/'+toolId, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        config: { 
                            ...currentConfig,
                            output_transform: outputTransform,
                            transform_enabled: transformEnabled
                        } 
                    })
                });
                alert('✅ Output transformation saved!');
            } catch(e) {
                alert('Failed to save: ' + e.message);
            }
        }
        
        // ========== SMART API TESTING FUNCTIONS ==========
        
        async function analyzeApiParams(toolId) {
            const btn = document.getElementById('btn-analyze-' + toolId);
            const hint = document.getElementById('analyze-hint-' + toolId);
            
            if (btn) {
                btn.innerHTML = '<span class="animate-pulse">🔍 AI Analyzing...</span>';
                btn.disabled = true;
            }
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/analyze-params', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await r.json();
                const params = data.parameters;
                
                if (data.error) {
                    alert('Analysis failed: ' + data.error);
                    if (btn) {
                        btn.innerHTML = '❌ Failed';
                        setTimeout(() => { btn.innerHTML = '🔍 Analyze Parameters'; btn.disabled = false; }, 2000);
                    }
                    return;
                }
            
                if (params && params.length > 0) {
                    // Update each parameter with smart input options
                    params.forEach(param => {
                        const inputArea = document.getElementById('param-input-area-' + param.name);
                        if (!inputArea) return;
                        
                        // Build smart input based on LLM analysis
                        let inputHtml = `
                            <div class="flex flex-wrap gap-2 mb-2">
                                <button onclick="toggleParamInputMode('${param.name}', 'text')" 
                                        id="btn-text-${param.name}" 
                                        class="text-xs px-2 py-1 rounded bg-purple-600 text-white">
                                    ✏️ Text
                                </button>
                        `;
                        
                        // Add file upload if LLM suggests it
                        if (param.supports_file_upload) {
                            inputHtml += `
                                <button onclick="toggleParamInputMode('${param.name}', 'file')" 
                                        id="btn-file-${param.name}"
                                        class="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    📄 ${param.file_upload_label || 'Upload File'}
                                </button>
                            `;
                        }
                        
                        // Add quick generate button
                        inputHtml += `
                                <button onclick="quickGenerate('${param.name}', '${toolId}')" 
                                        class="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    ✨ Generate
                                </button>
                            </div>
                        `;
                        
                        // Text input
                        inputHtml += `
                            <div id="input-text-${param.name}">
                                <textarea id="test-param-${param.name}" class="input-field w-full rounded px-3 py-2 text-sm" 
                                          rows="${param.suggested_rows || 2}" 
                                          placeholder="${param.placeholder || 'Enter ' + param.name}...">${param.sample_value || ''}</textarea>
                            </div>
                        `;
                        
                        // File upload area (if LLM suggested)
                        if (param.supports_file_upload) {
                            inputHtml += `
                                <div id="input-file-${param.name}" class="hidden">
                                    <div class="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-purple-500 cursor-pointer transition"
                                         onclick="document.getElementById('file-${param.name}').click()">
                                        <input type="file" id="file-${param.name}" class="hidden" 
                                               accept="${param.accepted_files || '.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.jpg,.jpeg,.png'}"
                                               onchange="handleParamFileUpload('${param.name}', '${toolId}', event)">
                                        <span class="text-2xl block mb-1">📤</span>
                                        <p class="text-sm text-gray-400">${param.file_upload_hint || 'Upload file to extract data'}</p>
                                        <p class="text-xs text-gray-500">${param.accepted_file_types || 'PDF, Word, Excel, CSV, Images'}</p>
                                    </div>
                                    <div id="file-preview-${param.name}" class="hidden mt-2 bg-gray-900 rounded p-2 text-xs"></div>
                                </div>
                            `;
                        }
                        
                        // Add tip if available
                        if (param.tip) {
                            inputHtml += `<p class="text-xs text-purple-400 mt-2">💡 ${param.tip}</p>`;
                        }
                        
                        inputArea.innerHTML = inputHtml;
                    });
                    
                    // Hide hint
                    if (hint) hint.classList.add('hidden');
                    
                    // Update button
                    if (btn) {
                        btn.innerHTML = '✅ Analyzed';
                        setTimeout(() => {
                            btn.innerHTML = '🔍 Re-analyze';
                            btn.disabled = false;
                        }, 2000);
                    }
                } else {
                    if (btn) {
                        btn.innerHTML = '❌ No results';
                        setTimeout(() => {
                            btn.innerHTML = '🔍 Analyze Parameters';
                            btn.disabled = false;
                        }, 2000);
                    }
                }
            } catch (e) {
                alert('Analysis error: ' + e.message);
                if (btn) {
                    btn.innerHTML = '❌ Failed';
                    setTimeout(() => { btn.innerHTML = '🔍 Analyze Parameters'; btn.disabled = false; }, 2000);
                }
            }
        }
        
        // Quick generate - Pure LLM
        async function quickGenerate(paramName, toolId) {
            const paramInput = document.getElementById('test-param-' + paramName);
            if (!paramInput) return;
            
            // Show loading
            const originalValue = paramInput.value;
            paramInput.value = '✨ AI Generating...';
            paramInput.disabled = true;
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/generate-param', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ param_name: paramName, prompt: '' })
                });
                
                const data = await r.json();
                
                if (data.generated_data) {
                    paramInput.value = typeof data.generated_data === 'string'
                        ? data.generated_data
                        : JSON.stringify(data.generated_data, null, 2);
                } else if (data.error) {
                    paramInput.value = originalValue;
                    alert('Generation failed: ' + data.error);
                } else {
                    paramInput.value = originalValue;
                    alert('Could not generate data. Check LLM configuration.');
                }
            } catch (e) {
                paramInput.value = originalValue;
                alert('Error: ' + e.message);
            }
            
            paramInput.disabled = false;
            
            // Make sure we're in text mode
            toggleParamInputMode(paramName, 'text');
        }
        
        function toggleParamInputMode(paramName, mode) {
            // Hide all input modes
            ['text', 'file', 'ai'].forEach(m => {
                const inputDiv = document.getElementById('input-' + m + '-' + paramName);
                const btn = document.getElementById('btn-' + m + '-' + paramName);
                if (inputDiv) inputDiv.classList.add('hidden');
                if (btn) {
                    btn.classList.remove('bg-purple-600', 'text-white');
                    btn.classList.add('bg-gray-700', 'text-gray-300');
                }
            });
            
            // Show selected mode
            const selectedInput = document.getElementById('input-' + mode + '-' + paramName);
            const selectedBtn = document.getElementById('btn-' + mode + '-' + paramName);
            if (selectedInput) selectedInput.classList.remove('hidden');
            if (selectedBtn) {
                selectedBtn.classList.remove('bg-gray-700', 'text-gray-300');
                selectedBtn.classList.add('bg-purple-600', 'text-white');
            }
        }
        
        async function handleParamFileUpload(paramName, toolId, event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const previewDiv = document.getElementById('file-preview-' + paramName);
            const paramInput = document.getElementById('test-param-' + paramName);
            
            previewDiv.classList.remove('hidden');
            previewDiv.innerHTML = '<span class="animate-pulse">📄 Processing ' + file.name + '...</span>';
            
            try {
                // Read file content
                const fileContent = await readFileContent(file);
                
                // Use LLM to extract relevant data
                const r = await fetch(API + '/api/tools/' + toolId + '/extract-param', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        param_name: paramName,
                        file_name: file.name,
                        file_content: fileContent,
                        file_type: file.type
                    })
                });
                
                const data = await r.json();
                
                if (data.extracted_data) {
                    // Set the extracted data to the parameter input
                    if (paramInput) {
                        paramInput.value = typeof data.extracted_data === 'string' 
                            ? data.extracted_data 
                            : JSON.stringify(data.extracted_data, null, 2);
                    }
                    
                    previewDiv.innerHTML = `
                        <div class="text-green-400 mb-2">✅ Extracted from ${file.name}</div>
                        <pre class="text-xs text-gray-400 max-h-32 overflow-auto">${escHtml(paramInput?.value || '')}</pre>
                    `;
                    
                    // Switch back to text mode to show the result
                    toggleParamInputMode(paramName, 'text');
                } else {
                    previewDiv.innerHTML = '<span class="text-red-400">❌ Could not extract data. Try manually entering.</span>';
                }
            } catch (e) {
                previewDiv.innerHTML = '<span class="text-red-400">❌ Error: ' + e.message + '</span>';
            }
        }
        
        async function readFileContent(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                if (file.type.startsWith('image/')) {
                    reader.onload = () => resolve('[Image file: ' + file.name + ']');
                    reader.readAsDataURL(file);
                } else {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error('Failed to read file'));
                    reader.readAsText(file);
                }
            });
        }
        
        async function aiGenerateParam(paramName, toolId) {
            const promptInput = document.getElementById('ai-prompt-' + paramName);
            const resultDiv = document.getElementById('ai-result-' + paramName);
            const paramInput = document.getElementById('test-param-' + paramName);
            
            const prompt = promptInput?.value || 'Generate sample data';
            
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<span class="animate-pulse text-gray-400">✨ Generating with AI...</span>';
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/generate-param', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        param_name: paramName,
                        prompt: prompt
                    })
                });
                
                const data = await r.json();
                
                if (data.generated_data) {
                    if (paramInput) {
                        paramInput.value = typeof data.generated_data === 'string'
                            ? data.generated_data
                            : JSON.stringify(data.generated_data, null, 2);
                    }
                    
                    resultDiv.innerHTML = `
                        <div class="text-green-400 mb-2">✅ Generated successfully!</div>
                        <button onclick="toggleParamInputMode('${paramName}', 'text')" class="text-xs text-purple-400 hover:underline">
                            View & Edit →
                        </button>
                    `;
                } else if (data.error) {
                    resultDiv.innerHTML = `<span class="text-red-400">❌ ${data.error}</span>`;
                } else {
                    resultDiv.innerHTML = '<span class="text-red-400">❌ Could not generate data. Check LLM configuration.</span>';
                }
            } catch (e) {
                resultDiv.innerHTML = '<span class="text-red-400">❌ Error: ' + e.message + '</span>';
            }
        }
        
        async function autoFillTestData(toolId) {
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="animate-pulse">✨ AI Generating...</span>';
            btn.disabled = true;
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/auto-fill-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await r.json();
                
                if (data.parameters && Object.keys(data.parameters).length > 0) {
                    // Fill in all parameters from server
                    Object.entries(data.parameters).forEach(([name, value]) => {
                        const input = document.getElementById('test-param-' + name);
                        if (input) {
                            input.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
                        }
                    });
                    
                    btn.innerHTML = '✅ Filled!';
                    setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                } else if (data.error) {
                    alert('Failed to auto-fill: ' + data.error);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                } else {
                    alert('Could not generate data. Check LLM configuration.');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (e) {
                alert('Error: ' + e.message);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
        
        async function testApiCall(toolId) {
            const resultsDiv = document.getElementById('api-test-result-'+toolId);
            const pre = resultsDiv?.querySelector('pre');
            if(!pre) return;
            
            resultsDiv.classList.remove('hidden');
            pre.textContent = 'Calling API...';
            pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm';
            
            // Collect parameters
            const params = {};
            document.querySelectorAll('[id^="test-param-"]').forEach(input => {
                const name = input.id.replace('test-param-', '');
                if(input.value) {
                    // Try to parse JSON values
                    try {
                        params[name] = JSON.parse(input.value);
                    } catch {
                        params[name] = input.value;
                    }
                }
            });
            
            // Check if output transformation is enabled
            const transformEnabled = document.getElementById('transform-enabled-'+toolId)?.checked;
            const outputTransform = document.getElementById('output-transform-'+toolId)?.value?.trim();
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/test', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        parameters: params,
                        apply_transform: transformEnabled && outputTransform ? true : false,
                        transform_instructions: outputTransform
                    })
                });
                const data = await r.json();
                
                // Check if there's a transformed response
                if (data.transformed_response !== undefined) {
                    // Show both original and transformed
                    resultsDiv.innerHTML = `
                        <div class="space-y-4">
                            <div>
                                <h4 class="text-sm font-medium text-purple-400 mb-2">✨ Transformed Response:</h4>
                                <pre class="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-green-400">${escHtml(
                                    typeof data.transformed_response === 'string' 
                                        ? data.transformed_response 
                                        : JSON.stringify(data.transformed_response, null, 2)
                                )}</pre>
                            </div>
                            <details class="text-sm">
                                <summary class="text-gray-500 cursor-pointer hover:text-gray-300">View Original Response</summary>
                                <pre class="bg-gray-800 rounded-lg p-4 overflow-x-auto text-xs text-gray-400 mt-2">${escHtml(JSON.stringify(data.original_response || data.response, null, 2))}</pre>
                            </details>
                        </div>
                    `;
                } else {
                    pre.textContent = JSON.stringify(data, null, 2);
                    pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-green-400';
                }
            } catch(e) {
                pre.textContent = 'Error: ' + e.message;
                pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-red-400';
            }
        }
        
        async function saveToolConfig(toolId) {
            const name = document.getElementById('tool-name-'+toolId)?.value;
            const description = document.getElementById('tool-desc-'+toolId)?.value;
            const configText = document.getElementById('tool-config-'+toolId)?.value;
            
            let config = {};
            try {
                config = JSON.parse(configText || '{}');
            } catch(e) {
                alert('Invalid JSON in configuration');
                return;
            }
            
            try {
                await fetch(API+'/api/tools/'+toolId, {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name, description, config })
                });
                alert('✅ Configuration saved!');
            } catch(e) {
                alert('Failed to save: ' + e.message);
            }
        }
        
        async function testGenericTool(toolId) {
            const resultsDiv = document.getElementById('tool-test-result-'+toolId);
            const pre = resultsDiv?.querySelector('pre');
            if(!pre) return;
            
            resultsDiv.classList.remove('hidden');
            pre.textContent = 'Testing...';
            pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm';
            
            const inputText = document.getElementById('tool-test-input-'+toolId)?.value || '{}';
            let input = {};
            try {
                input = JSON.parse(inputText);
            } catch(e) {
                pre.textContent = 'Invalid JSON input';
                pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-red-400';
                return;
            }
            
            try {
                const r = await fetch(API+'/api/tools/'+toolId+'/test', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ parameters: input })
                });
                const data = await r.json();
                pre.textContent = JSON.stringify(data, null, 2);
                pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-green-400';
            } catch(e) {
                pre.textContent = 'Error: ' + e.message;
                pre.className = 'bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-red-400';
            }
        }
        async function scrape(tid){
            const url=document.getElementById('scrape-url').value;
            const rec=document.getElementById('scrape-rec').checked;
            const max=parseInt(document.getElementById('scrape-max').value);
            if(!url){alert('Enter URL');return;}
            
            // Show progress modal
            showProgressModal('Scraping website...');
            
            // Check if it's a dynamic site
            const dynamicSites = ['oracle.com', 'azure.microsoft.com', 'cloud.google.com', 'aws.amazon.com'];
            const isDynamic = dynamicSites.some(site => url.includes(site));
            
            if(isDynamic) {
                // Simulate progress for dynamic sites
                const steps = [
                    '🎭 [1/7] Launching Chromium browser...',
                    '🎭 [2/7] Creating browser context...',
                    '🎭 [3/7] Navigating to page...',
                    '🎭 [4/7] Waiting for JavaScript to render...',
                    '🎭 [5/7] Scrolling to load dynamic content...',
                    '🎭 [6/7] Extracting rendered HTML...',
                    '📊 Extracting tables and pricing data...'
                ];
                let stepIndex = 0;
                const progressInterval = setInterval(() => {
                    if(stepIndex < steps.length) {
                        updateProgress((stepIndex + 1) / steps.length * 90, steps[stepIndex]);
                        stepIndex++;
                    }
                }, 4000);
                
                try {
                    await fetch(API+'/api/tools/'+tid+'/scrape',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,recursive:rec,max_pages:max})});
                    clearInterval(progressInterval);
                    updateProgress(100, '✅ Scraping complete!');
                    await new Promise(r => setTimeout(r, 1000));
                    hideProgressModal();
                    viewTool(tid);
                } catch(e) {
                    clearInterval(progressInterval);
                    hideProgressModal();
                    alert('Error scraping: ' + e.message);
                }
            } else {
                updateProgress(30, '📄 Fetching page content...');
                try {
                    await fetch(API+'/api/tools/'+tid+'/scrape',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,recursive:rec,max_pages:max})});
                    updateProgress(100, '✅ Scraping complete!');
                    await new Promise(r => setTimeout(r, 1000));
                    hideProgressModal();
                    viewTool(tid);
                } catch(e) {
                    hideProgressModal();
                    alert('Error scraping: ' + e.message);
                }
            }
        }
        async function delPage(id){if(!confirm('Delete page?'))return;await fetch(API+'/api/scraped-pages/'+id,{method:'DELETE',headers:getAuthHeaders()});location.reload();}
        async function delTool(id){
            if(!confirm('Delete this tool?')) return;
            try {
                const res = await fetch(API+'/api/tools/'+id, {
                    method:'DELETE',
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    const error = await res.json();
                    showToast(error.detail || 'Failed to delete tool', 'error');
                    return;
                }
                showToast('Tool deleted', 'success');
                navigate('tools');
            } catch(e) {
                showToast('Failed to delete: ' + e.message, 'error');
            }
        }
        
        async function delToolFromCard(id, name){
            if(!confirm('Delete tool "' + name + '"?')) return;
            try {
                const res = await fetch(API+'/api/tools/'+id, {
                    method:'DELETE',
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    const error = await res.json();
                    showToast(error.detail || 'Failed to delete tool', 'error');
                    return;
                }
                showToast('Tool deleted', 'success');
                loadTools();
            } catch(e) {
                showToast('Failed to delete: ' + e.message, 'error');
            }
        }
        
        // Edit tool - opens wizard with existing data
        let editingToolId = null;
        
        async function editTool(id) {
            try {
                const r = await fetch(API + '/api/tools/' + id);
                if (!r.ok) {
                    showToast('Failed to load tool', 'error');
                    return;
                }
                const tool = await r.json();
                
                editingToolId = id;
                
                // Open modal and start wizard for this tool type
                showModal('modal-tool');
                startWizard(tool.type);
                
                // Update modal title to show we're editing
                const titleEl = document.getElementById('wizard-title');
                if (titleEl) {
                    titleEl.textContent = `Edit: ${tool.name}`;
                }
                const subtitleEl = document.getElementById('wizard-subtitle');
                if (subtitleEl) {
                    subtitleEl.textContent = 'Editing existing tool';
                }
                
                // Pre-fill common fields (wiz-name and wiz-desc are used in step 1)
                setTimeout(() => {
                    const nameEl = document.getElementById('wiz-name');
                    const descEl = document.getElementById('wiz-desc');
                    if (nameEl) nameEl.value = tool.name || '';
                    if (descEl) descEl.value = tool.description || '';
                    
                    // Pre-fill type-specific config in step 2
                    prefillToolConfig(tool);
                    
                    // Pre-fill access control data
                    prefillAccessControl(tool);
                    
                    // Update the Create button to say Update
                    const createBtn = document.getElementById('btn-create');
                    if (createBtn) {
                        createBtn.textContent = '✓ Update Tool';
                        createBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                        createBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                    }
                }, 100);
                
                showToast('Editing: ' + tool.name, 'info');
                
            } catch(e) {
                console.error('Error loading tool for edit:', e);
                showToast('Failed to load tool: ' + e.message, 'error');
            }
        }
        
        // Pre-fill tool-specific configuration fields
        function prefillToolConfig(tool) {
            const config = tool.config || {};
            
            switch(tool.type) {
                case 'api':
                    // API configuration can be in either api_config or config
                    // Check api_config first (proper API tools), then fall back to config
                    const apiCfg = tool.api_config || config || {};
                    
                    // API tool fields - use CORRECT element IDs from the wizard form
                    const apiBase = document.getElementById('api-url');  // NOT api-base-url!
                    const apiPath = document.getElementById('api-path');
                    const apiMethod = document.getElementById('api-method');
                    const apiAuth = document.getElementById('api-auth');
                    const apiAuthValue = document.getElementById('api-auth-val');  // NOT api-auth-value!
                    
                    // Get values from api_config first, then config
                    const baseUrl = apiCfg.base_url || config.base_url || '';
                    const endpointPath = apiCfg.endpoint_path || apiCfg.endpoint || config.endpoint_path || config.endpoint || '';
                    const httpMethod = apiCfg.http_method || apiCfg.method || config.http_method || config.method || 'GET';
                    const authType = apiCfg.auth_type || config.auth_type || 'none';
                    const authValue = apiCfg.auth_value || config.auth_value || '';
                    
                    if (apiBase) apiBase.value = baseUrl;
                    if (apiPath) apiPath.value = endpointPath;
                    if (apiMethod) apiMethod.value = httpMethod;
                    if (apiAuth) {
                        apiAuth.value = authType;
                        // Show auth value field if not 'none'
                        const authValGroup = document.getElementById('api-auth-val-group');
                        if (authValGroup && authType !== 'none') {
                            authValGroup.classList.remove('hidden');
                        }
                    }
                    if (apiAuthValue) apiAuthValue.value = authValue;
                    
                    // Load parameters from api_config or config
                    const inputParams = apiCfg.input_parameters || config.input_parameters || [];
                    if (inputParams && Array.isArray(inputParams) && inputParams.length > 0) {
                        apiParams = inputParams.map(p => ({
                            id: Date.now() + Math.random(),
                            name: p.name || '',
                            description: p.description || '',
                            data_type: p.data_type || 'string',
                            required: p.required || false,
                            location: p.location || 'query'
                        }));
                        // Render the parameters in the UI
                        setTimeout(() => {
                            if (typeof renderApiParams === 'function') renderApiParams();
                        }, 200);
                    }
                    
                    console.log('📝 Prefilled API config:', {
                        source: tool.api_config ? 'api_config' : 'config',
                        base_url: baseUrl,
                        endpoint: endpointPath,
                        method: httpMethod,
                        auth: authType,
                        params_count: inputParams.length,
                        elements_found: {
                            'api-url': !!apiBase,
                            'api-path': !!apiPath,
                            'api-method': !!apiMethod,
                            'api-auth': !!apiAuth
                        }
                    });
                    break;
                    
                case 'website':
                    const webUrl = document.getElementById('web-url');
                    const webRecursive = document.getElementById('web-recursive');
                    const webMax = document.getElementById('web-max');
                    if (webUrl) webUrl.value = config.url || config.base_url || '';
                    if (webRecursive) webRecursive.checked = config.recursive || false;
                    if (webMax) webMax.value = config.max_pages || 10;
                    
                    // Show existing scraped pages in the configuration section
                    const scrapedPages = tool.scraped_pages || [];
                    const scrapedContainer = document.getElementById('web-scraped-pages');
                    const scrapedList = document.getElementById('web-scraped-list');
                    
                    if (scrapedPages.length > 0 && scrapedContainer && scrapedList) {
                        scrapedContainer.classList.remove('hidden');
                        scrapedList.innerHTML = scrapedPages.map(p => `
                            <div class="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                                <div class="flex items-center gap-2 min-w-0 flex-1">
                                    <span>🔗</span>
                                    <a href="${escHtml(p.url)}" target="_blank" class="text-sm text-blue-400 hover:underline truncate">${escHtml(p.url || p.title || 'Page')}</a>
                                </div>
                                <span class="text-xs text-gray-500 ml-2">${p.chunks_extracted || 0} chunks</span>
                            </div>
                        `).join('');
                    } else if (scrapedContainer) {
                        scrapedContainer.classList.add('hidden');
                    }
                    
                    console.log('📝 Prefilled Website config:', {
                        url: config.url,
                        scraped_pages: scrapedPages.length
                    });
                    break;
                    
                case 'database':
                    const dbType = document.getElementById('db-type');
                    const dbHost = document.getElementById('db-host');
                    const dbPort = document.getElementById('db-port');
                    const dbUser = document.getElementById('db-user');
                    const dbPass = document.getElementById('db-password');
                    const dbName = document.getElementById('db-database');
                    
                    if (dbType) dbType.value = config.db_type || 'postgresql';
                    if (dbHost) dbHost.value = config.host || '';
                    if (dbPort) dbPort.value = config.port || '';
                    if (dbUser) dbUser.value = config.user || config.username || '';
                    if (dbPass) dbPass.value = config.password || '';
                    if (dbName) dbName.value = config.database || '';
                    break;
                    
                case 'knowledge':
                    const kbCollection = document.getElementById('kb-collection');
                    const kbChunkSize = document.getElementById('kb-chunk-size');
                    const kbTopK = document.getElementById('kb-top-k');
                    
                    if (kbCollection) kbCollection.value = config.collection_id || '';
                    if (kbChunkSize) kbChunkSize.value = config.chunk_size || 1000;
                    if (kbTopK) kbTopK.value = config.top_k || 5;
                    break;
                    
                case 'email':
                    const emailProvider = document.getElementById('email-provider');
                    const smtpHost = document.getElementById('smtp-host');
                    const smtpPort = document.getElementById('smtp-port');
                    
                    if (emailProvider) emailProvider.value = config.provider || 'smtp';
                    if (smtpHost) smtpHost.value = config.smtp_host || config.host || '';
                    if (smtpPort) smtpPort.value = config.smtp_port || config.port || '';
                    break;
                    
                case 'webhook':
                    const webhookUrl = document.getElementById('webhook-url');
                    const webhookMethod = document.getElementById('webhook-method');
                    
                    if (webhookUrl) webhookUrl.value = config.url || '';
                    if (webhookMethod) webhookMethod.value = config.method || 'POST';
                    break;
                    
                case 'websearch':
                    const searchProvider = document.getElementById('search-provider');
                    const searchKey = document.getElementById('search-api-key');
                    
                    if (searchProvider) searchProvider.value = config.provider || 'tavily';
                    if (searchKey) searchKey.value = config.api_key || '';
                    break;
                    
                default:
                    console.log('No specific config prefill for type:', tool.type);
            }
            
            // Prefill Access Control is now handled by prefillAccessControl function
        }
        
        // Prefill Access Control when editing a tool
        async function prefillAccessControl(tool) {
            if (!tool) return;
            
            const accessType = tool.access_type || 'owner_only';
            selectedToolAccessType = accessType;
            
            // Reset selections
            toolAccessSelected = { users: [], groups: [] };
            toolPermissionChips = { edit: [], delete: [], execute: [] };
            
            // Load users and groups data first
            await loadToolAccessUsersAndGroups();
            
            // Wait for DOM to be ready
            setTimeout(() => {
                // Select the access type in UI
                selectToolAccessType(accessType);
                
                // Populate allowed users
                if (tool.allowed_user_ids && tool.allowed_user_ids.length > 0) {
                    tool.allowed_user_ids.forEach(userId => {
                        const user = toolAccessData.users.find(u => u.id === userId);
                        if (user) {
                            toolAccessSelected.users.push({
                                id: user.id,
                                name: user.full_name || user.email || user.username,
                                email: user.email || '',
                                type: 'user'
                            });
                        }
                    });
                }
                
                // Populate allowed groups
                if (tool.allowed_group_ids && tool.allowed_group_ids.length > 0) {
                    tool.allowed_group_ids.forEach(groupId => {
                        const group = toolAccessData.groups.find(g => g.id === groupId);
                        if (group) {
                            toolAccessSelected.groups.push({
                                id: group.id,
                                name: group.name,
                                email: '',
                                type: 'group'
                            });
                        }
                    });
                }
                
                // Populate granular permissions
                ['edit', 'delete', 'execute'].forEach(permType => {
                    const field = `can_${permType}_user_ids`;
                    if (tool[field] && tool[field].length > 0) {
                        tool[field].forEach(id => {
                            if (id.startsWith('group:')) {
                                const groupId = id.replace('group:', '');
                                const group = toolAccessData.groups.find(g => g.id === groupId);
                                if (group) {
                                    toolPermissionChips[permType].push({ id: group.id, name: group.name, entityType: 'group' });
                                }
                            } else {
                                const user = toolAccessData.users.find(u => u.id === id);
                                if (user) {
                                    toolPermissionChips[permType].push({ id: user.id, name: user.full_name || user.email || user.username, entityType: 'user' });
                                }
                            }
                        });
                    }
                });
                
                // Update the UI
                updateToolAccessChips();
                updateToolPermissionDropdowns();
                
                // Render permission chips
                ['edit', 'delete', 'execute'].forEach(permType => {
                    if (typeof updatePermissionChipsDisplay === 'function') {
                        updatePermissionChipsDisplay(permType);
                    }
                });
                
                console.log('📝 [PREFILL] Access Control loaded:', {
                    access_type: accessType,
                    users: toolAccessSelected.users.length,
                    groups: toolAccessSelected.groups.length,
                    editPerms: toolPermissionChips.edit.length
                });
            }, 300);
        }
        
        function toggleToolMenu(toolId) {
            closeAllToolMenus();
            const menu = document.getElementById('tool-menu-' + toolId);
            if(menu) menu.classList.toggle('hidden');
        }
        
        function closeAllToolMenus() {
            document.querySelectorAll('[id^="tool-menu-"]').forEach(m => m.classList.add('hidden'));
        }
        
        async function duplicateTool(toolId) {
            try {
                const r = await fetch(API + '/api/tools/' + toolId);
                const tool = await r.json();
                const newTool = {
                    name: tool.name + ' (Copy)',
                    description: tool.description,
                    type: tool.type,
                    config: tool.config
                };
                const resp = await fetch(API + '/api/tools', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(newTool)
                });
                if(resp.ok) {
                    showToast('Tool duplicated', 'success');
                    loadTools();
                } else {
                    showToast('Failed to duplicate', 'error');
                }
            } catch(e) {
                showToast('Error: ' + e.message, 'error');
            }
        }

// Tool Selection Pattern
let selectedToolId = null;

function selectTool(toolId) {
    const card = document.querySelector(`[data-tool-id="${toolId}"]`);
    const toolName = card?.dataset.toolName || 'Tool';
    
    // If same tool clicked, deselect
    if (selectedToolId === toolId) {
        clearToolSelection();
        return;
    }
    
    // Clear previous selection
    document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('ring-2', 'ring-purple-500'));
    
    // Select new tool
    selectedToolId = toolId;
    card?.classList.add('ring-2', 'ring-purple-500');
    
    // Show action bar
    document.getElementById('selected-tool-name').textContent = toolName;
    document.getElementById('tools-action-bar').classList.remove('hidden');
    
    // Apply permissions
    if (typeof applyPermissions === 'function') applyPermissions();
}

function clearToolSelection() {
    selectedToolId = null;
    document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('ring-2', 'ring-purple-500'));
    document.getElementById('tools-action-bar').classList.add('hidden');
}

function viewSelectedTool() {
    if (selectedToolId) {
        clearToolSelection();
        viewTool(selectedToolId);
    }
}

function editSelectedTool() {
    if (selectedToolId) {
        const id = selectedToolId;
        clearToolSelection();
        openToolEditPanel(id);
    }
}

function duplicateSelectedTool() {
    if (selectedToolId) {
        const id = selectedToolId;
        clearToolSelection();
        duplicateTool(id);
    }
}

function deleteSelectedTool() {
    if (selectedToolId) {
        const card = document.querySelector(`[data-tool-id="${selectedToolId}"]`);
        const toolName = card?.dataset.toolName || 'this tool';
        const id = selectedToolId;
        clearToolSelection();
        delToolFromCard(id, toolName);
    }
}

// Clear selection when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tool-card') && !e.target.closest('#tools-action-bar')) {
        clearToolSelection();
    }
});

// Clear selection on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') clearToolSelection();
});
        
        // Close menus when clicking outside
        document.addEventListener('click', () => closeAllToolMenus());

// Edit Tool Modal

// Tool Edit Panel Functions
let currentEditTool = null;

async function openToolEditPanel(toolId) {
    try {
        const r = await fetch(API + '/api/tools/' + toolId);
        if (!r.ok) throw new Error('Failed to load tool');
        currentEditTool = await r.json();
        
        const icons = {document:'📄', website:'🌐', api:'🔌', knowledge:'📚', email:'📧', webhook:'🔗', websearch:'🔍', database:'🗄️'};
        
        // Set basic fields
        document.getElementById('edit-tool-id').value = currentEditTool.id;
        document.getElementById('edit-tool-type').value = currentEditTool.type;
        document.getElementById('edit-tool-name').value = currentEditTool.name || '';
        document.getElementById('edit-tool-desc').value = currentEditTool.description || '';
        document.getElementById('edit-tool-active').checked = currentEditTool.is_active !== false;
        document.getElementById('edit-panel-icon').textContent = icons[currentEditTool.type] || '🔧';
        document.getElementById('edit-panel-type').textContent = currentEditTool.type.toUpperCase();
        
        // Load config fields based on type
        loadEditConfigFields(currentEditTool);
        
        // Load sources
        loadEditSources(currentEditTool);
        
        // Load access control data
        await loadEditAccessControl(currentEditTool);
        
        // Show panel with animation
        const panel = document.getElementById('tool-edit-panel');
        const slider = document.getElementById('tool-edit-slider');
        panel.classList.remove('hidden');
        setTimeout(() => slider.classList.remove('translate-x-full'), 10);
        
        // Reset to first tab
        switchEditTab('basic');
        
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function closeToolEditPanel() {
    const panel = document.getElementById('tool-edit-panel');
    const slider = document.getElementById('tool-edit-slider');
    slider.classList.add('translate-x-full');
    setTimeout(() => panel.classList.add('hidden'), 300);
    currentEditTool = null;
}

async function loadEditAccessControl(tool) {
    // First load users and groups data
    await loadToolAccessUsersAndGroups();
    
    // Set access type
    const accessType = tool.access_type || 'owner_only';
    selectedToolAccessType = accessType;
    
    // Reset selections
    toolAccessSelected = { users: [], groups: [] };
    toolPermissionChips = { edit: [], delete: [], execute: [] };
    
    // Populate allowed users
    console.log('🔍 [DEBUG] tool.allowed_user_ids:', tool.allowed_user_ids);
    console.log('🔍 [DEBUG] toolAccessData.users:', toolAccessData.users.map(u => ({id: u.id, email: u.email})));
    
    if (tool.allowed_user_ids && tool.allowed_user_ids.length > 0) {
        tool.allowed_user_ids.forEach(userId => {
            console.log('🔍 [DEBUG] Looking for userId:', userId);
            const user = toolAccessData.users.find(u => u.id === userId);
            console.log('🔍 [DEBUG] Found user:', user);
            if (user) {
                toolAccessSelected.users.push({
                    id: user.id,
                    name: user.full_name || user.email || user.username,
                    email: user.email || '',
                    type: 'user'
                });
            }
        });
    }
    
    // Populate allowed groups
    if (tool.allowed_group_ids && tool.allowed_group_ids.length > 0) {
        tool.allowed_group_ids.forEach(groupId => {
            const group = toolAccessData.groups.find(g => g.id === groupId);
            if (group) {
                toolAccessSelected.groups.push({
                    id: group.id,
                    name: group.name,
                    email: '',
                    type: 'group'
                });
            }
        });
    }
    
    // Populate granular permissions
    ['edit', 'delete', 'execute'].forEach(permType => {
        const field = `can_${permType}_user_ids`;
        if (tool[field] && tool[field].length > 0) {
            tool[field].forEach(id => {
                if (id.startsWith('group:')) {
                    const groupId = id.replace('group:', '');
                    const group = toolAccessData.groups.find(g => g.id === groupId);
                    if (group) {
                        toolPermissionChips[permType].push({ id: group.id, name: group.name, entityType: 'group' });
                    }
                } else {
                    const user = toolAccessData.users.find(u => u.id === id);
                    if (user) {
                        toolPermissionChips[permType].push({ id: user.id, name: user.full_name || user.email || user.username, entityType: 'user' });
                    }
                }
            });
        }
    });
    
    // Update Edit Panel UI
    const isOwner = tool.is_owner === true;
    updateEditAccessUI(accessType, isOwner);
    
    console.log('📋 [LOAD EDIT] Access Control loaded:', { accessType, users: toolAccessSelected.users.length, groups: toolAccessSelected.groups.length, editPerms: toolPermissionChips.edit.length, isOwner });
}

// Update the Edit Panel Access UI
function updateEditAccessUI(accessType, isOwner) {
    const typeLabels = {
        'owner_only': { icon: '👤', label: 'Owner Only', desc: 'Only you can access this tool' },
        'authenticated': { icon: '🏢', label: 'All Logged In Users', desc: 'Any authenticated user can access' },
        'specific_users': { icon: '👥', label: 'Specific Users & Groups', desc: 'Only selected users/groups can access' },
        'public': { icon: '🌍', label: 'Public', desc: 'Everyone can access this tool' }
    };
    
    const typeInfo = typeLabels[accessType] || typeLabels['owner_only'];
    
    // Show access type display
    const typeDisplay = document.getElementById('edit-access-type-display');
    if (typeDisplay) {
        typeDisplay.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">${typeInfo.icon}</span>
                <div>
                    <div class="font-medium" style="color: #1f2937;">${typeInfo.label}</div>
                    <div class="text-xs" style="color: #6b7280;">${typeInfo.desc}</div>
                </div>
            </div>
        `;
    }
    
    // Show/hide entities section for specific_users
    const entitiesSection = document.getElementById('edit-access-entities');
    if (entitiesSection) {
        if (accessType === 'specific_users') {
            entitiesSection.classList.remove('hidden');
            
            // Show chips
            const chipsDisplay = document.getElementById('edit-access-chips-display');
            if (chipsDisplay) {
                const allSelected = [...toolAccessSelected.users, ...toolAccessSelected.groups];
                if (allSelected.length === 0) {
                    chipsDisplay.innerHTML = '<span class="text-sm italic" style="color: #9ca3af;">No users or groups assigned</span>';
                } else {
                    chipsDisplay.innerHTML = allSelected.map(e => `
                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" 
                              style="background: ${e.type === 'group' ? '#dbeafe' : '#ede9fe'}; color: ${e.type === 'group' ? '#1e40af' : '#5b21b6'}; border: 1px solid ${e.type === 'group' ? '#93c5fd' : '#c4b5fd'};">
                            ${e.type === 'group' ? '👥' : '👤'} ${e.name}
                        </span>
                    `).join('');
                }
            }
            
            // Show granular permissions
            ['edit', 'delete'].forEach(permType => {
                const permDiv = document.getElementById(`edit-perm-${permType}`);
                const permList = document.getElementById(`edit-perm-${permType}-list`);
                if (permDiv && permList) {
                    const perms = toolPermissionChips[permType];
                    if (perms.length > 0) {
                        permDiv.classList.remove('hidden');
                        permList.textContent = perms.map(p => `${p.entityType === 'group' ? '👥' : '👤'} ${p.name}`).join(', ');
                    } else {
                        permDiv.classList.add('hidden');
                    }
                }
            });
        } else {
            entitiesSection.classList.add('hidden');
        }
    }
    
    // Show owner controls or readonly message
    const ownerControls = document.getElementById('edit-access-owner-controls');
    const readonlyMsg = document.getElementById('edit-access-readonly-msg');
    
    if (isOwner) {
        if (ownerControls) ownerControls.classList.remove('hidden');
        if (readonlyMsg) readonlyMsg.classList.add('hidden');
        
        // Update access type cards
        document.querySelectorAll('.edit-access-card').forEach(card => {
            const cardType = card.dataset.access;
            const check = card.querySelector('.tool-access-check');
            if (cardType === accessType) {
                card.style.borderColor = '#7c3aed';
                card.style.background = '#f3e8ff';
                if (check) check.classList.remove('hidden');
            } else {
                card.style.borderColor = '#d1d5db';
                card.style.background = '#ffffff';
                if (check) check.classList.add('hidden');
            }
        });
        
        // Show/hide specific config
        const specificConfig = document.getElementById('edit-specific-config');
        if (specificConfig) {
            if (accessType === 'specific_users') {
                specificConfig.classList.remove('hidden');
                updateEditSelectedChips();
                updateEditPermDropdowns();
            } else {
                specificConfig.classList.add('hidden');
            }
        }
    } else {
        if (ownerControls) ownerControls.classList.add('hidden');
        if (readonlyMsg) readonlyMsg.classList.remove('hidden');
    }
}

// Select access type in edit panel
function selectEditAccessType(accessType) {
    selectedToolAccessType = accessType;
    updateEditAccessUI(accessType, true);
}

// Filter search in edit panel
function filterEditAccessSearch(query) {
    const resultsDiv = document.getElementById('edit-access-results');
    if (!resultsDiv) return;
    
    const q = query.toLowerCase();
    let html = '';
    
    const filteredUsers = toolAccessData.users.filter(u => {
        const name = (u.full_name || u.email || u.username || '').toLowerCase();
        return name.includes(q) || (u.email || '').toLowerCase().includes(q);
    }).slice(0, 5);
    
    const filteredGroups = toolAccessData.groups.filter(g => (g.name || '').toLowerCase().includes(q)).slice(0, 3);
    
    if (filteredUsers.length > 0) {
        html += `<div class="px-3 py-1 text-xs font-medium" style="background: #e5e7eb; color: #374151;">👤 Users</div>`;
        filteredUsers.forEach(u => {
            const isSelected = toolAccessSelected.users.some(s => s.id === u.id);
            const name = u.full_name || u.email || u.username;
            html += `<div class="px-3 py-2 cursor-pointer flex items-center justify-between" style="background: ${isSelected ? '#ede9fe' : '#ffffff'};" 
                         onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='${isSelected ? '#ede9fe' : '#ffffff'}'"
                         onclick="toggleEditAccessEntity('user', '${u.id}', '${name.replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')">
                        <span class="text-sm" style="color: #1f2937;">${name}</span>
                        ${isSelected ? '<span style="color: #059669;">✓</span>' : '<span style="color: #9ca3af;">+</span>'}
                    </div>`;
        });
    }
    
    if (filteredGroups.length > 0) {
        html += `<div class="px-3 py-1 text-xs font-medium" style="background: #e5e7eb; color: #374151;">👥 Groups</div>`;
        filteredGroups.forEach(g => {
            const isSelected = toolAccessSelected.groups.some(s => s.id === g.id);
            html += `<div class="px-3 py-2 cursor-pointer flex items-center justify-between" style="background: ${isSelected ? '#dbeafe' : '#ffffff'};"
                         onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='${isSelected ? '#dbeafe' : '#ffffff'}'"
                         onclick="toggleEditAccessEntity('group', '${g.id}', '${(g.name || '').replace(/'/g, "\\'")}', '')">
                        <span class="text-sm" style="color: #1f2937;">${g.name}</span>
                        ${isSelected ? '<span style="color: #059669;">✓</span>' : '<span style="color: #9ca3af;">+</span>'}
                    </div>`;
        });
    }
    
    if (!html) html = '<div class="px-3 py-4 text-center text-sm" style="color: #9ca3af;">No results</div>';
    resultsDiv.innerHTML = html;
}

function showEditAccessResults() {
    const resultsDiv = document.getElementById('edit-access-results');
    if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
        filterEditAccessSearch(document.getElementById('edit-access-search')?.value || '');
    }
}

function toggleEditAccessEntity(type, id, name, email) {
    const list = type === 'user' ? toolAccessSelected.users : toolAccessSelected.groups;
    const idx = list.findIndex(e => e.id === id);
    
    if (idx >= 0) {
        list.splice(idx, 1);
    } else {
        list.push({ id, name, email, type });
    }
    
    updateEditSelectedChips();
    updateEditPermDropdowns();
    filterEditAccessSearch(document.getElementById('edit-access-search')?.value || '');
}

function updateEditSelectedChips() {
    const container = document.getElementById('edit-selected-chips');
    const countBadge = document.getElementById('edit-selected-count');
    if (!container) return;
    
    const allSelected = [...toolAccessSelected.users, ...toolAccessSelected.groups];
    
    if (allSelected.length === 0) {
        container.innerHTML = '<span class="text-sm italic" style="color: #9ca3af;">No users or groups selected</span>';
    } else {
        container.innerHTML = allSelected.map(e => `
            <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                 style="background: ${e.type === 'group' ? '#dbeafe' : '#ede9fe'}; color: ${e.type === 'group' ? '#1e40af' : '#5b21b6'}; border: 1px solid ${e.type === 'group' ? '#93c5fd' : '#c4b5fd'};">
                ${e.type === 'group' ? '👥' : '👤'} ${e.name}
                <button onclick="toggleEditAccessEntity('${e.type}', '${e.id}', '', '')" style="margin-left: 4px;">×</button>
            </div>
        `).join('');
    }
    
    if (countBadge) countBadge.textContent = allSelected.length;
    
    // Also update the summary view
    const summaryChips = document.getElementById('edit-access-chips-display');
    if (summaryChips && allSelected.length > 0) {
        summaryChips.innerHTML = allSelected.map(e => `
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" 
                  style="background: ${e.type === 'group' ? '#dbeafe' : '#ede9fe'}; color: ${e.type === 'group' ? '#1e40af' : '#5b21b6'};">
                ${e.type === 'group' ? '👥' : '👤'} ${e.name}
            </span>
        `).join('');
    }
}

function updateEditPermDropdowns() {
    const allSelected = [...toolAccessSelected.users, ...toolAccessSelected.groups];
    
    ['edit', 'delete'].forEach(permType => {
        const select = document.getElementById(`edit-can-${permType}-select`);
        const chipsDiv = document.getElementById(`edit-can-${permType}-chips`);
        
        if (select) {
            let options = '<option value="">+ Add</option>';
            if (toolAccessSelected.users.length > 0) {
                options += '<optgroup label="👤 Users">';
                options += toolAccessSelected.users.map(u => `<option value="user:${u.id}">${u.name}</option>`).join('');
                options += '</optgroup>';
            }
            if (toolAccessSelected.groups.length > 0) {
                options += '<optgroup label="👥 Groups">';
                options += toolAccessSelected.groups.map(g => `<option value="group:${g.id}">${g.name}</option>`).join('');
                options += '</optgroup>';
            }
            select.innerHTML = options;
        }
        
        if (chipsDiv) {
            chipsDiv.innerHTML = toolPermissionChips[permType].map(e => `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" 
                      style="background: ${e.entityType === 'group' ? '#dbeafe' : '#ede9fe'}; color: ${e.entityType === 'group' ? '#1e40af' : '#5b21b6'};">
                    ${e.entityType === 'group' ? '👥' : '👤'} ${e.name}
                    <button onclick="removeEditPermChip('${permType}', '${e.id}', '${e.entityType}')" style="margin-left: 2px;">×</button>
                </span>
            `).join('');
        }
    });
}

function addEditPermChip(permType, selectEl) {
    const value = selectEl.value;
    if (!value) return;
    
    const [type, id] = value.split(':');
    const entity = type === 'user' 
        ? toolAccessSelected.users.find(u => u.id === id)
        : toolAccessSelected.groups.find(g => g.id === id);
    
    if (!entity) return;
    
    if (!toolPermissionChips[permType].some(e => e.id === id && e.entityType === type)) {
        toolPermissionChips[permType].push({ ...entity, entityType: type });
    }
    
    updateEditPermDropdowns();
    selectEl.value = '';
}

function removeEditPermChip(permType, entityId, entityType) {
    toolPermissionChips[permType] = toolPermissionChips[permType].filter(e => !(e.id === entityId && e.entityType === entityType));
    updateEditPermDropdowns();
}

function switchEditTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.edit-tab').forEach(t => {
        t.classList.remove('active', 'border-purple-500', 'text-purple-400');
        t.classList.add('border-transparent', 'text-gray-400');
    });
    const activeTab = document.querySelector(`.edit-tab[data-tab="${tab}"]`);
    if (activeTab) {
        activeTab.classList.add('active', 'border-purple-500', 'text-purple-400');
        activeTab.classList.remove('border-transparent', 'text-gray-400');
    }
    
    // Show content
    document.querySelectorAll('.edit-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('edit-tab-' + tab)?.classList.remove('hidden');
}

function loadEditConfigFields(tool) {
    const container = document.getElementById('edit-config-content');
    const config = tool.config || {};
    let html = '';
    
    switch(tool.type) {
        case 'website':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Website URL</label>
                        <input type="url" id="edit-cfg-url" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.url || '')}">
                    </div>
                    <div class="flex items-center gap-4">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="edit-cfg-recursive" class="w-4 h-4" ${config.recursive ? 'checked' : ''}>
                            <span class="text-sm">Recursive scraping</span>
                        </label>
                        <div class="flex items-center gap-2">
                            <label class="text-sm text-gray-400">Max pages:</label>
                            <input type="number" id="edit-cfg-maxpages" class="input-field w-20 rounded px-2 py-1" value="${config.max_pages || 10}">
                        </div>
                    </div>
                    <p class="text-xs text-yellow-400">⚠️ Changing URL will require re-scraping</p>
                </div>
            `;
            break;
            
        case 'document':
        case 'knowledge':
            html = `
                <div class="space-y-4">
                    <div class="card rounded-lg p-4">
                        <h5 class="font-medium mb-3">🔍 Search Settings</h5>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">Chunk Size</label>
                                <input type="number" id="edit-cfg-chunk" class="input-field w-full rounded-lg px-3 py-2" value="${config.chunk_size || 1000}">
                            </div>
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">Overlap</label>
                                <input type="number" id="edit-cfg-overlap" class="input-field w-full rounded-lg px-3 py-2" value="${config.overlap || 200}">
                            </div>
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">Top K Results</label>
                                <input type="number" id="edit-cfg-topk" class="input-field w-full rounded-lg px-3 py-2" value="${config.top_k || 5}">
                            </div>
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">Search Type</label>
                                <select id="edit-cfg-search" class="input-field w-full rounded-lg px-3 py-2">
                                    <option value="hybrid" ${config.search_type === 'hybrid' ? 'selected' : ''}>Hybrid</option>
                                    <option value="semantic" ${config.search_type === 'semantic' ? 'selected' : ''}>Semantic</option>
                                    <option value="keyword" ${config.search_type === 'keyword' ? 'selected' : ''}>Keyword</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-yellow-400">⚠️ Changing chunk size/overlap will require re-indexing documents</p>
                </div>
            `;
            break;
            
        case 'api':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">API Base URL</label>
                        <input type="url" id="edit-cfg-apiurl" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.base_url || '')}">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">API Key</label>
                        <input type="password" id="edit-cfg-apikey" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.api_key || '')}" placeholder="Enter API key">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Headers (JSON)</label>
                        <textarea id="edit-cfg-headers" rows="3" class="input-field w-full px-4 py-2 rounded-lg font-mono text-sm">${escHtml(JSON.stringify(config.headers || {}, null, 2))}</textarea>
                    </div>
                </div>
            `;
            break;
            
        case 'database':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Database Type</label>
                        <select id="edit-cfg-dbtype" class="input-field w-full px-4 py-2 rounded-lg">
                            <option value="postgresql" ${config.db_type === 'postgresql' ? 'selected' : ''}>PostgreSQL</option>
                            <option value="mysql" ${config.db_type === 'mysql' ? 'selected' : ''}>MySQL</option>
                            <option value="mssql" ${config.db_type === 'mssql' ? 'selected' : ''}>SQL Server</option>
                            <option value="mongodb" ${config.db_type === 'mongodb' ? 'selected' : ''}>MongoDB</option>
                            <option value="sqlite" ${config.db_type === 'sqlite' ? 'selected' : ''}>SQLite</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Connection String</label>
                        <input type="password" id="edit-cfg-connstr" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.connection_string || '')}" placeholder="postgresql://user:pass@host:5432/db">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Allowed Tables (comma-separated, empty = all)</label>
                        <input type="text" id="edit-cfg-tables" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml((config.tables || []).join(', '))}" placeholder="users, orders, products">
                    </div>
                </div>
            `;
            break;
            
        case 'email':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Email Provider</label>
                        <select id="edit-cfg-emailprovider" class="input-field w-full px-4 py-2 rounded-lg">
                            <option value="smtp" ${config.provider === 'smtp' ? 'selected' : ''}>SMTP</option>
                            <option value="sendgrid" ${config.provider === 'sendgrid' ? 'selected' : ''}>SendGrid</option>
                            <option value="ses" ${config.provider === 'ses' ? 'selected' : ''}>AWS SES</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">From Email</label>
                        <input type="email" id="edit-cfg-fromemail" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.from_email || '')}" placeholder="noreply@example.com">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">API Key / Password</label>
                        <input type="password" id="edit-cfg-emailkey" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.api_key || config.password || '')}" placeholder="Enter API key or password">
                    </div>
                    <div id="smtp-fields" class="${config.provider === 'smtp' ? '' : 'hidden'}">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">SMTP Host</label>
                                <input type="text" id="edit-cfg-smtphost" class="input-field w-full px-3 py-2 rounded-lg" value="${escHtml(config.smtp_host || '')}" placeholder="smtp.gmail.com">
                            </div>
                            <div>
                                <label class="text-xs text-gray-400 mb-1 block">SMTP Port</label>
                                <input type="number" id="edit-cfg-smtpport" class="input-field w-full px-3 py-2 rounded-lg" value="${config.smtp_port || 587}">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'webhook':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Webhook URL</label>
                        <input type="url" id="edit-cfg-webhookurl" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.url || '')}" placeholder="https://api.example.com/webhook">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">HTTP Method</label>
                        <select id="edit-cfg-webhookmethod" class="input-field w-full px-4 py-2 rounded-lg">
                            <option value="POST" ${config.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="GET" ${config.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="PUT" ${config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="PATCH" ${config.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Headers (JSON)</label>
                        <textarea id="edit-cfg-webhookheaders" rows="3" class="input-field w-full px-4 py-2 rounded-lg font-mono text-sm">${escHtml(JSON.stringify(config.headers || {}, null, 2))}</textarea>
                    </div>
                </div>
            `;
            break;
            
        case 'slack':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Bot Token</label>
                        <input type="password" id="edit-cfg-slacktoken" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.bot_token || '')}" placeholder="xoxb-...">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Default Channel</label>
                        <input type="text" id="edit-cfg-slackchannel" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.default_channel || '')}" placeholder="#general">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Allowed Channels (comma-separated, empty = all)</label>
                        <input type="text" id="edit-cfg-slackchannels" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml((config.channels || []).join(', '))}" placeholder="#general, #support">
                    </div>
                </div>
            `;
            break;
            
        case 'websearch':
            html = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Search Provider</label>
                        <select id="edit-cfg-searchprovider" class="input-field w-full px-4 py-2 rounded-lg">
                            <option value="tavily" ${config.provider === 'tavily' ? 'selected' : ''}>Tavily</option>
                            <option value="serper" ${config.provider === 'serper' ? 'selected' : ''}>Serper (Google)</option>
                            <option value="bing" ${config.provider === 'bing' ? 'selected' : ''}>Bing</option>
                            <option value="duckduckgo" ${config.provider === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">API Key</label>
                        <input type="password" id="edit-cfg-searchkey" class="input-field w-full px-4 py-2 rounded-lg" value="${escHtml(config.api_key || '')}" placeholder="Enter API key">
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Max Results</label>
                        <input type="number" id="edit-cfg-searchmax" class="input-field w-full px-4 py-2 rounded-lg" value="${config.max_results || 10}" min="1" max="50">
                    </div>
                </div>
            `;
            break;
            
        default:
            html = `
                <div class="text-center py-8 text-gray-400">
                    <p>Configuration for ${tool.type} type</p>
                    <pre class="mt-4 text-left text-xs bg-gray-800 p-4 rounded-lg overflow-auto max-h-64">${escHtml(JSON.stringify(config, null, 2))}</pre>
                </div>
            `;
    }
    
    container.innerHTML = html;
}
function loadEditSources(tool) {
    const container = document.getElementById('edit-sources-content');
    let html = '';
    
    // Documents
    const docs = tool.documents || [];
    html += `
        <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
                <h5 class="font-medium">📄 Documents (${docs.length})</h5>
            </div>
            ${docs.length > 0 ? `
                <div class="space-y-2 max-h-48 overflow-y-auto">
                    ${docs.map(d => `
                        <div class="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                            <span class="text-sm truncate flex-1">${escHtml(d.name || d.filename || 'Document')}</span>
                            <button onclick="removeEditDoc('${d.id}')" class="text-red-400 hover:text-red-300 p-1">🗑️</button>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-gray-500 text-sm">No documents uploaded</p>'}
        </div>
    `;
    
    // Scraped Pages (for website type)
    if (tool.type === 'website') {
        const pages = tool.scraped_pages || [];
        html += `
            <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h5 class="font-medium">🌐 Scraped Pages (${pages.length})</h5>
                </div>
                ${pages.length > 0 ? `
                    <div class="space-y-2 max-h-48 overflow-y-auto">
                        ${pages.map(p => `
                            <div class="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                                <span class="text-sm truncate flex-1">${escHtml(p.title || p.url || 'Page')}</span>
                                <button onclick="removeEditPage('${p.id}')" class="text-red-400 hover:text-red-300 p-1">🗑️</button>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-gray-500 text-sm">No pages scraped</p>'}
            </div>
        `;
    }
    
    // Add new source button
    html += `
        <div class="pt-4 border-t border-gray-700">
            <p class="text-sm text-gray-400 mb-3">To add new sources, use the tool detail page.</p>
            <button onclick="closeToolEditPanel(); viewTool('${tool.id}')" class="btn-secondary px-4 py-2 rounded-lg text-sm">
                Open Full View →
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

async function saveToolChanges() {
    const toolId = document.getElementById('edit-tool-id').value;
    const toolType = document.getElementById('edit-tool-type').value;
    
    // Gather basic info
    const updates = {
        name: document.getElementById('edit-tool-name').value,
        description: document.getElementById('edit-tool-desc').value,
        is_active: document.getElementById('edit-tool-active').checked
    };
    
    // Gather config based on type
    const config = {};
    switch(toolType) {
        case 'website':
            config.url = document.getElementById('edit-cfg-url')?.value || '';
            config.recursive = document.getElementById('edit-cfg-recursive')?.checked || false;
            config.max_pages = parseInt(document.getElementById('edit-cfg-maxpages')?.value) || 10;
            break;
        case 'document':
        case 'knowledge':
            config.chunk_size = parseInt(document.getElementById('edit-cfg-chunk')?.value) || 1000;
            config.overlap = parseInt(document.getElementById('edit-cfg-overlap')?.value) || 200;
            config.top_k = parseInt(document.getElementById('edit-cfg-topk')?.value) || 5;
            config.search_type = document.getElementById('edit-cfg-search')?.value || 'hybrid';
            break;
        case 'api':
            config.base_url = document.getElementById('edit-cfg-apiurl')?.value || '';
            config.api_key = document.getElementById('edit-cfg-apikey')?.value || '';
            try {
                config.headers = JSON.parse(document.getElementById('edit-cfg-headers')?.value || '{}');
            } catch(e) {
                config.headers = {};
            }
            break;
        case 'database':
            config.db_type = document.getElementById('edit-cfg-dbtype')?.value || 'postgresql';
            config.connection_string = document.getElementById('edit-cfg-connstr')?.value || '';
            const tablesStr = document.getElementById('edit-cfg-tables')?.value || '';
            config.tables = tablesStr ? tablesStr.split(',').map(t => t.trim()).filter(t => t) : [];
            break;
        case 'email':
            config.provider = document.getElementById('edit-cfg-emailprovider')?.value || 'smtp';
            config.from_email = document.getElementById('edit-cfg-fromemail')?.value || '';
            config.api_key = document.getElementById('edit-cfg-emailkey')?.value || '';
            if (config.provider === 'smtp') {
                config.smtp_host = document.getElementById('edit-cfg-smtphost')?.value || '';
                config.smtp_port = parseInt(document.getElementById('edit-cfg-smtpport')?.value) || 587;
            }
            break;
        case 'webhook':
            config.url = document.getElementById('edit-cfg-webhookurl')?.value || '';
            config.method = document.getElementById('edit-cfg-webhookmethod')?.value || 'POST';
            try {
                config.headers = JSON.parse(document.getElementById('edit-cfg-webhookheaders')?.value || '{}');
            } catch(e) {
                config.headers = {};
            }
            break;
        case 'slack':
            config.bot_token = document.getElementById('edit-cfg-slacktoken')?.value || '';
            config.default_channel = document.getElementById('edit-cfg-slackchannel')?.value || '';
            const channelsStr = document.getElementById('edit-cfg-slackchannels')?.value || '';
            config.channels = channelsStr ? channelsStr.split(',').map(c => c.trim()).filter(c => c) : [];
            break;
        case 'websearch':
            config.provider = document.getElementById('edit-cfg-searchprovider')?.value || 'tavily';
            config.api_key = document.getElementById('edit-cfg-searchkey')?.value || '';
            config.max_results = parseInt(document.getElementById('edit-cfg-searchmax')?.value) || 10;
            break;
    }
    
    // Merge with existing config
    updates.config = { ...(currentEditTool?.config || {}), ...config };
    
    // ONLY send access control fields if user is the OWNER
    // This prevents non-owners from accidentally overwriting permissions
    const isOwner = currentEditTool?.is_owner === true;
    
    if (isOwner && typeof selectedToolAccessType !== 'undefined') {
        updates.access_type = selectedToolAccessType;
        
        if (selectedToolAccessType === 'specific_users' && typeof toolAccessSelected !== 'undefined') {
            updates.allowed_user_ids = toolAccessSelected.users.map(u => u.id);
            updates.allowed_group_ids = toolAccessSelected.groups.map(g => g.id);
            
            if (typeof toolPermissionChips !== 'undefined') {
                updates.can_edit_user_ids = toolPermissionChips.edit.map(e => 
                    e.entityType === 'group' ? `group:${e.id}` : e.id
                );
                updates.can_delete_user_ids = toolPermissionChips.delete.map(e => 
                    e.entityType === 'group' ? `group:${e.id}` : e.id
                );
                updates.can_execute_user_ids = toolPermissionChips.execute.map(e => 
                    e.entityType === 'group' ? `group:${e.id}` : e.id
                );
            }
        }
        
        console.log('📋 [SAVE] Access Control Updates (OWNER):', {
            access_type: updates.access_type,
            allowed_user_ids: updates.allowed_user_ids,
            allowed_group_ids: updates.allowed_group_ids,
            can_edit_user_ids: updates.can_edit_user_ids
        });
    } else if (!isOwner) {
        console.log('📋 [SAVE] Skipping access control (not owner)');
    }
    
    // Check if critical config changed (for re-processing)
    const oldConfig = currentEditTool?.config || {};
    let needsReprocess = false;
    let reprocessMessage = '';
    
    if (toolType === 'website' && oldConfig.url !== config.url) {
        needsReprocess = true;
        reprocessMessage = 'URL changed. You may need to re-scrape the website.';
    } else if ((toolType === 'document' || toolType === 'knowledge') && 
               (oldConfig.chunk_size !== config.chunk_size || oldConfig.overlap !== config.overlap)) {
        needsReprocess = true;
        reprocessMessage = 'Chunk settings changed. You may need to re-index documents.';
    }
    
    try {
        const r = await fetch(API + '/api/tools/' + toolId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        if (r.ok) {
            const result = await r.json();
            
            // Show appropriate message based on reprocess action
            if (result.reprocess_action) {
                let msg = 'Tool updated. ';
                switch(result.reprocess_action) {
                    case 'rescrape':
                        const pagesCount = result.reprocess_result?.pages_scraped || 0;
                        msg += `Re-scraped ${pagesCount} pages from new URL.`;
                        break;
                    case 'reindex':
                        const docsCount = result.reprocess_result?.documents_reindexed || 0;
                        msg += `Re-indexed ${docsCount} documents with new chunk settings.`;
                        break;
                    case 'test_connection':
                        msg += result.reprocess_result?.message || 'Configuration updated.';
                        break;
                    default:
                        msg += 'Configuration updated.';
                }
                if (result.reprocess_result?.error) {
                    showToast('Tool updated but re-processing failed: ' + result.reprocess_result.error, 'warning');
                } else {
                    showToast(msg, 'success');
                }
            } else {
                showToast('Tool updated successfully', 'success');
            }
            closeToolEditPanel();
            loadTools();
        } else {
            const err = await r.json();
            showToast(err.detail || 'Failed to update', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function removeEditDoc(docId) {
    // This would need backend support - for now just show message
    showToast('Use full view to manage documents', 'info');
}

function removeEditPage(pageId) {
    showToast('Use full view to manage pages', 'info');
}
async function showEditToolModal(toolId) {
    try {
        const r = await fetch(API + '/api/tools/' + toolId);
        if (!r.ok) {
            showToast('Failed to load tool', 'error');
            return;
        }
        const tool = await r.json();
        
        // Create edit modal
        const modal = document.createElement('div');
        modal.id = 'edit-tool-modal';
        modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]';
        modal.innerHTML = `
            <div class="card rounded-2xl p-6 w-full max-w-lg mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold">✏️ Edit Tool</h3>
                    <button onclick="closeEditToolModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <form id="edit-tool-form" class="space-y-4">
                    <input type="hidden" id="edit-tool-id" value="${tool.id}">
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Name</label>
                        <input type="text" id="edit-tool-name" value="${escHtml(tool.name)}" class="input-field w-full px-4 py-2 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm text-gray-400 mb-2">Description</label>
                        <textarea id="edit-tool-desc" rows="3" class="input-field w-full px-4 py-2 rounded-lg">${escHtml(tool.description || '')}</textarea>
                    </div>
                    <div class="flex gap-3 pt-4">
                        <button type="button" onclick="closeEditToolModal()" class="btn-secondary flex-1 py-2 rounded-lg">Cancel</button>
                        <button type="submit" class="btn-primary flex-1 py-2 rounded-lg">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Handle form submit
        document.getElementById('edit-tool-form').onsubmit = async (e) => {
            e.preventDefault();
            await saveToolEdit();
        };
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}

function closeEditToolModal() {
    document.getElementById('edit-tool-modal')?.remove();
}

async function saveToolEdit() {
    const toolId = document.getElementById('edit-tool-id').value;
    const name = document.getElementById('edit-tool-name').value;
    const description = document.getElementById('edit-tool-desc').value;
    
    try {
        const r = await fetch(API + '/api/tools/' + toolId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        if (r.ok) {
            showToast('Tool updated successfully', 'success');
            closeEditToolModal();
            // Refresh tool view
            navigate('tools');
            setTimeout(() => showToolDetails(toolId), 100);
        } else {
            const data = await r.json();
            showToast(data.detail || 'Failed to update tool', 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    }
}


        // Data Viewer Functions
        let currentPageData = null;
        let currentToolData = null;
        let currentDataTab = 'tables';
        let dataSearchQuery = '';
        
        async function viewToolData(toolId) {
            ensureModalInBody('data-viewer-modal');
            document.getElementById('data-viewer-modal').classList.remove('hidden');
            document.getElementById('data-viewer-content').innerHTML = '<div class="text-center text-gray-500 py-10"><div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-3"></div>Loading all tool data...</div>';
            
            try {
                const r = await fetch(API + '/api/tools/' + toolId + '/data');
                const data = await r.json();
                currentToolData = data;
                currentPageData = null;
                dataSearchQuery = '';
                
                document.getElementById('data-viewer-title').textContent = '📊 ' + (data.name || 'Tool Data');
                document.getElementById('data-viewer-subtitle').textContent = `${data.type.toUpperCase()} - ${data.total_chunks} chunks from ${data.sources?.length || 0} sources`;
                
                // Show search box
                document.getElementById('data-search-box').classList.remove('hidden');
                document.getElementById('data-search-input').value = '';
                
                // Stats
                document.getElementById('data-viewer-stats').innerHTML = `
                    <span>📝 ${(data.total_chars || 0).toLocaleString()} total characters</span>
                    <span>🧩 ${data.total_chunks || 0} chunks</span>
                    <span>📄 ${data.sources?.length || 0} sources</span>
                `;
                
                renderToolDataTab();
            } catch (e) {
                document.getElementById('data-viewer-content').innerHTML = '<div class="text-center text-red-400 py-10">Error loading data: ' + e.message + '</div>';
            }
        }
        
        function searchToolData() {
            dataSearchQuery = document.getElementById('data-search-input').value.toLowerCase().trim();
            if (currentToolData) {
                renderToolDataTab();
            } else if (currentPageData) {
                renderDataTab();
            }
        }
        
        function renderToolDataTab() {
            const container = document.getElementById('data-viewer-content');
            if (!currentToolData) return;
            
            let chunks = currentToolData.chunks || [];
            
            // Filter by search
            if (dataSearchQuery) {
                chunks = chunks.filter(c => 
                    (c.text || '').toLowerCase().includes(dataSearchQuery) ||
                    (c.source || '').toLowerCase().includes(dataSearchQuery)
                );
            }
            
            if (currentDataTab === 'tables') {
                // Show all tables from all chunks
                let allContent = chunks.map(c => c.text || '').join('\n\n');
                const tables = extractTables(allContent);
                
                if (tables.length === 0) {
                    container.innerHTML = `<div class="text-center text-gray-500 py-10">
                        ${dataSearchQuery ? 'No tables found matching "' + escHtml(dataSearchQuery) + '"' : 'No tables found in the data.'}
                        <br><br>Switch to "Full Text" or "Chunks" tab to see content.
                    </div>`;
                    return;
                }
                
                let html = dataSearchQuery ? `<p class="text-sm text-purple-400 mb-4">Found ${tables.length} tables matching "${escHtml(dataSearchQuery)}"</p>` : '';
                tables.forEach((table, i) => {
                    html += `<div class="mb-6">
                        <h4 class="text-sm font-semibold text-purple-400 mb-2">Table ${i + 1}</h4>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm border-collapse">${table}</table>
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
                
            } else if (currentDataTab === 'text') {
                // Full text view grouped by source
                const bySource = {};
                chunks.forEach(c => {
                    const src = c.source || 'Unknown';
                    if (!bySource[src]) bySource[src] = [];
                    bySource[src].push(c.text || '');
                });
                
                let html = dataSearchQuery ? `<p class="text-sm text-purple-400 mb-4">Showing results for "${escHtml(dataSearchQuery)}" (${chunks.length} chunks)</p>` : '';
                
                Object.entries(bySource).forEach(([source, texts]) => {
                    html += `<div class="mb-6">
                        <h4 class="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                            <span>📄</span> ${escHtml(source)}
                            <span class="text-gray-500 font-normal">(${texts.length} chunks)</span>
                        </h4>
                        <div class="bg-gray-900 rounded-lg p-4 font-mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">${highlightSearch(escHtml(texts.join('\n\n---\n\n')))}</div>
                    </div>`;
                });
                
                container.innerHTML = html || '<div class="text-center text-gray-500 py-10">No content available.</div>';
                
            } else if (currentDataTab === 'chunks') {
                if (chunks.length === 0) {
                    container.innerHTML = `<div class="text-center text-gray-500 py-10">
                        ${dataSearchQuery ? 'No chunks found matching "' + escHtml(dataSearchQuery) + '"' : 'No chunks available.'}
                    </div>`;
                    return;
                }
                
                let html = dataSearchQuery ? `<p class="text-sm text-purple-400 mb-4">Found ${chunks.length} chunks matching "${escHtml(dataSearchQuery)}"</p>` : '';
                html += '<div class="space-y-4">';
                
                chunks.slice(0, 50).forEach((chunk, i) => {
                    const text = (chunk.text && typeof chunk.text === 'string') ? chunk.text : '';
                    if (!text) return; // Skip empty chunks
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-semibold text-purple-400">Chunk ${i + 1}</span>
                                <div class="flex gap-2 text-xs text-gray-500">
                                    <span>📄 ${escHtml(chunk.source || 'Unknown')}</span>
                                    <span>${text.length} chars</span>
                                </div>
                            </div>
                            <pre class="text-sm whitespace-pre-wrap text-gray-300">${highlightSearch(escHtml(text.substring(0, 500)))}${text.length > 500 ? '...' : ''}</pre>
                        </div>
                    `;
                });
                
                if (chunks.length > 50) {
                    html += `<p class="text-center text-gray-500 py-4">Showing 50 of ${chunks.length} chunks. Use search to find specific data.</p>`;
                }
                
                html += '</div>';
                container.innerHTML = html;
            }
        }
        
        function highlightSearch(text) {
            if (!dataSearchQuery || !text) return text || '';
            const regex = new RegExp('(' + dataSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            return String(text).replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">$1</mark>');
        }
        
        async function viewPageData(pageId) {
            ensureModalInBody('data-viewer-modal');
            document.getElementById('data-viewer-modal').classList.remove('hidden');
            document.getElementById('data-search-box').classList.add('hidden'); // Hide search for page data
            document.getElementById('data-viewer-content').innerHTML = '<div class="text-center text-gray-500 py-10"><div class="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-3"></div>Loading data...</div>';
            
            currentToolData = null; // Reset tool data
            dataSearchQuery = '';
            
            try {
                const r = await fetch(API + '/api/scraped-pages/' + pageId + '/data');
                const data = await r.json();
                currentPageData = data;
                
                document.getElementById('data-viewer-title').textContent = '📊 ' + (data.title || 'Extracted Data');
                document.getElementById('data-viewer-subtitle').textContent = data.url;
                
                // Stats
                document.getElementById('data-viewer-stats').innerHTML = `
                    <span>📝 ${(data.content?.length || 0).toLocaleString()} characters</span>
                    <span>🧩 ${data.chunks?.length || 0} chunks</span>
                    <span>📊 ${data.tables?.length || 0} tables found</span>
                    <span>📅 ${new Date(data.created_at).toLocaleString()}</span>
                `;
                
                renderDataTab();
            } catch (e) {
                document.getElementById('data-viewer-content').innerHTML = '<div class="text-center text-red-400 py-10">Error loading data: ' + e.message + '</div>';
            }
        }
        
        function setDataTab(tab) {
            currentDataTab = tab;
            document.querySelectorAll('[id^="data-tab-"]').forEach(btn => {
                btn.classList.toggle('border-purple-500', btn.id === 'data-tab-' + tab);
                btn.classList.toggle('text-white', btn.id === 'data-tab-' + tab);
                btn.classList.toggle('border-transparent', btn.id !== 'data-tab-' + tab);
                btn.classList.toggle('text-gray-400', btn.id !== 'data-tab-' + tab);
            });
            if (currentToolData) {
                renderToolDataTab();
            } else {
                renderDataTab();
            }
        }
        
        function renderDataTab() {
            const container = document.getElementById('data-viewer-content');
            if (!currentPageData) return;
            
            if (currentDataTab === 'tables') {
                // Extract and render tables
                const tables = extractTables(currentPageData.content || '');
                if (tables.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 py-10">No tables found in the extracted data.<br><br>Switch to "Full Text" tab to see all content.</div>';
                    return;
                }
                
                let html = '';
                tables.forEach((table, i) => {
                    html += `<div class="mb-6">
                        <h4 class="text-sm font-semibold text-purple-400 mb-2">Table ${i + 1}</h4>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm border-collapse">
                                ${table}
                            </table>
                        </div>
                    </div>`;
                });
                container.innerHTML = html;
            } else if (currentDataTab === 'text') {
                // Full text view
                const content = currentPageData.content || 'No content';
                container.innerHTML = `
                    <div class="bg-gray-900 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap overflow-x-auto" style="max-height: 60vh;">${escHtml(content)}</div>
                `;
            } else if (currentDataTab === 'chunks') {
                // Chunks view
                const chunks = currentPageData.chunks || [];
                if (chunks.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 py-10">No chunks available.</div>';
                    return;
                }
                
                let html = '<div class="space-y-4">';
                chunks.forEach((chunk, i) => {
                    let text = typeof chunk === 'string' ? chunk : (chunk.text || chunk.content || JSON.stringify(chunk));
                    if (!text || typeof text !== 'string') text = '';
                    html += `
                        <div class="bg-gray-800 rounded-lg p-4">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-semibold text-purple-400">Chunk ${i + 1}</span>
                                <span class="text-xs text-gray-500">${text.length} chars</span>
                            </div>
                            <pre class="text-sm whitespace-pre-wrap text-gray-300">${escHtml(text.substring(0, 1000))}${text.length > 1000 ? '...' : ''}</pre>
                        </div>
                    `;
                });
                html += '</div>';
                container.innerHTML = html;
            }
        }
        
        function extractTables(content) {
            const tables = [];
            
            // Look for [TABLE] markers
            const tableMatches = content.match(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/gi);
            if (tableMatches) {
                tableMatches.forEach(match => {
                    const tableContent = match.replace(/\[TABLE\]/i, '').replace(/\[\/TABLE\]/i, '').trim();
                    const rows = tableContent.split('\n').filter(r => r.trim());
                    if (rows.length > 0) {
                        let tableHtml = '';
                        rows.forEach((row, i) => {
                            const cells = row.split('|').map(c => c.trim()).filter(c => c);
                            const tag = i === 0 ? 'th' : 'td';
                            const bgClass = i === 0 ? 'bg-purple-900/30' : (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50');
                            tableHtml += '<tr class="' + bgClass + '">' + cells.map(c => '<' + tag + ' class="border border-gray-700 px-3 py-2">' + escHtml(c) + '</' + tag + '>').join('') + '</tr>';
                        });
                        tables.push(tableHtml);
                    }
                });
            }
            
            // Also look for pipe-separated tables without markers
            const lines = content.split('\n');
            let currentTable = [];
            let inTable = false;
            
            lines.forEach(line => {
                if (line.includes('|') && line.split('|').length >= 3) {
                    currentTable.push(line);
                    inTable = true;
                } else if (inTable && currentTable.length > 0) {
                    // End of table
                    if (currentTable.length >= 2) {
                        let tableHtml = '';
                        currentTable.forEach((row, i) => {
                            const cells = row.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/));
                            if (cells.length > 0) {
                                const tag = i === 0 ? 'th' : 'td';
                                const bgClass = i === 0 ? 'bg-purple-900/30' : (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50');
                                tableHtml += '<tr class="' + bgClass + '">' + cells.map(c => '<' + tag + ' class="border border-gray-700 px-3 py-2">' + escHtml(c) + '</' + tag + '>').join('') + '</tr>';
                            }
                        });
                        if (tableHtml) tables.push(tableHtml);
                    }
                    currentTable = [];
                    inTable = false;
                }
            });
            
            // Check if we ended while still in a table
            if (currentTable.length >= 2) {
                let tableHtml = '';
                currentTable.forEach((row, i) => {
                    const cells = row.split('|').map(c => c.trim()).filter(c => c && !c.match(/^-+$/));
                    if (cells.length > 0) {
                        const tag = i === 0 ? 'th' : 'td';
                        const bgClass = i === 0 ? 'bg-purple-900/30' : (i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50');
                        tableHtml += '<tr class="' + bgClass + '">' + cells.map(c => '<' + tag + ' class="border border-gray-700 px-3 py-2">' + escHtml(c) + '</' + tag + '>').join('') + '</tr>';
                    }
                });
                if (tableHtml) tables.push(tableHtml);
            }
            
            return tables;
        }
        
        function closeDataViewer() {
            document.getElementById('data-viewer-modal').classList.add('hidden');
            document.getElementById('data-search-box').classList.add('hidden');
            currentPageData = null;
            currentToolData = null;
            dataSearchQuery = '';
        }
        
        function copyDataContent() {
            let content = '';
            if (currentToolData) {
                content = currentToolData.chunks?.map(c => c.text).join('\n\n---\n\n') || '';
            } else if (currentPageData) {
                content = currentPageData.content || '';
            }
            if (!content) return;
            navigator.clipboard.writeText(content);
            alert('Content copied to clipboard!');
        }
        
        function downloadDataContent() {
            let content = '';
            let filename = 'data.txt';
            if (currentToolData) {
                content = currentToolData.chunks?.map(c => `[Source: ${c.source}]\n${c.text}`).join('\n\n' + '='.repeat(50) + '\n\n') || '';
                filename = (currentToolData.name || 'tool-data') + '.txt';
            } else if (currentPageData) {
                content = currentPageData.content || '';
                filename = (currentPageData.title || 'data') + '.txt';
            }
            if (!content) return;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function showToolModal(){
            // Reset editing state when opening for new tool
            editingToolId = null;
            
            // Reset wizard state
            resetWizard();
            
            // Update modal title
            const titleEl = document.getElementById('wizard-title');
            if (titleEl) titleEl.textContent = 'Create Tool';
            const subtitleEl = document.getElementById('wizard-subtitle');
            if (subtitleEl) subtitleEl.textContent = 'Select a tool type';
            
            showModal('modal-tool');
        }

        function backToToolTypes(){
            document.getElementById('tool-form').classList.add('hidden');
            document.getElementById('tool-categories').classList.remove('hidden');
            document.querySelectorAll('.tool-type').forEach(b=>b.classList.remove('border-purple-500'));
        }

        function selectToolType(type){
            toolType=type;
            document.querySelectorAll('.tool-type').forEach(b=>b.classList.remove('border-purple-500'));
            document.getElementById('tool-categories').classList.add('hidden');
            document.getElementById('tool-form').classList.remove('hidden');
            
            // Hide all form types
            const formTypes2 = ['knowledge','document','website','api','database','spreadsheet','email','slack','calendar','crm','webhook','websearch','imagegen','code','calculator','storage','stt','tts','translate','ocr','hitl'];
            formTypes2.forEach(t => {
                const el = document.getElementById('form-'+t);
                if(el) el.classList.add('hidden');
            });
            
            // Show selected form
            const selectedForm = document.getElementById('form-'+type);
            if(selectedForm) selectedForm.classList.remove('hidden');
            
            if(type==='document'){
                const z=document.getElementById('doc-upload-zone');
                z.ondragover=e=>{e.preventDefault();z.classList.add('dragover');};
                z.ondragleave=()=>z.classList.remove('dragover');
                z.ondrop=e=>{e.preventDefault();z.classList.remove('dragover');handleDocFilesDrop(e.dataTransfer.files);};
            }
        }

        // Tool form helper functions
        function onDBTypeChange(){
            const t = document.getElementById('db-type').value;
            const portMap = {
                // Relational
                postgresql:'5432', mysql:'3306', mssql:'1433', sqlite:'', 
                oracle:'1521', oracle_autonomous:'1522', db2:'50000', sybase:'5000', 
                teradata:'1025', azure_sql:'1433', cockroachdb:'26257', tidb:'4000',
                // Cloud Data Warehouses
                snowflake:'443', redshift:'5439', bigquery:'443',
                // NoSQL
                mongodb:'27017', mongodb_atlas:'27017', dynamodb:'443', cosmosdb:'443',
                firestore:'443', couchdb:'5984', cassandra:'9042', scylladb:'9042', hbase:'9090',
                // In-Memory
                redis:'6379', memcached:'11211', elasticache:'6379',
                // Search
                elasticsearch:'9200', opensearch:'9200', solr:'8983', meilisearch:'7700',
                // Vector
                pinecone:'443', weaviate:'8080', qdrant:'6333', milvus:'19530', chroma:'8000',
                // Time Series
                influxdb:'8086', timescaledb:'5432', questdb:'9000',
                // Graph
                neo4j:'7687', neptune:'8182', arangodb:'8529'
            };
            document.getElementById('db-port').value = portMap[t] || '5432';
        }
        function onSheetProviderChange(){
            const p = document.getElementById('sheet-provider').value;
            document.getElementById('sheet-google-fields').classList.toggle('hidden', p !== 'google');
            document.getElementById('sheet-airtable-fields').classList.toggle('hidden', p !== 'airtable');
        }
        function onEmailProviderChange(){
            const p = document.getElementById('email-provider').value;
            document.getElementById('email-smtp-fields').classList.toggle('hidden', p !== 'smtp');
            document.getElementById('email-api-fields').classList.toggle('hidden', p === 'smtp');
        }
        function onMsgPlatformChange(){
            const p = document.getElementById('msg-platform').value;
            document.getElementById('msg-slack-fields').classList.toggle('hidden', p !== 'slack');
            document.getElementById('msg-teams-fields').classList.toggle('hidden', p !== 'teams');
            document.getElementById('msg-discord-fields').classList.toggle('hidden', p !== 'discord');
        }
        function onCalProviderChange(){}
        function onCRMPlatformChange(){
            const p = document.getElementById('crm-platform').value;
            document.getElementById('crm-salesforce-fields').classList.toggle('hidden', p !== 'salesforce');
            document.getElementById('crm-hubspot-fields').classList.toggle('hidden', p !== 'hubspot');
        }
        function onWebhookTypeChange(){
            const t = document.getElementById('hook-type').value;
            document.getElementById('hook-outgoing-fields').classList.toggle('hidden', t !== 'outgoing');
            document.getElementById('hook-incoming-fields').classList.toggle('hidden', t !== 'incoming');
        }
        function onSearchProviderChange(){
            const p = document.getElementById('search-provider').value;
            const hints = {tavily:'Get your API key from tavily.com',serper:'Get your API key from serper.dev',bing:'Get your API key from Azure Portal',brave:'Get your API key from brave.com/search/api'};
            document.getElementById('search-api-hint').textContent = hints[p] || '';
        }
        function onImageProviderChange(){}
        function testDBConnection(){alert('Database connection test coming soon!');}
        function testSheetConnection(){alert('Spreadsheet connection test coming soon!');}
        function testEmailConnection(){alert('Email connection test coming soon!');}

        // Knowledge Base helper functions
        function toggleKBEmbedding(){
            const useGlobal = document.getElementById('kb-emb-global').checked;
            document.getElementById('kb-emb-custom').classList.toggle('hidden', useGlobal);
        }
        function toggleKBVectorDB(){
            const useGlobal = document.getElementById('kb-vdb-global').checked;
            document.getElementById('kb-vdb-custom').classList.toggle('hidden', useGlobal);
        }
        function onKBEmbProviderChange(){
            const p = document.getElementById('kb-emb-provider').value;
            document.getElementById('kb-emb-model-group').classList.toggle('hidden', p === 'sentence_transformers');
            document.getElementById('kb-emb-local-group').classList.toggle('hidden', p !== 'sentence_transformers');
            document.getElementById('kb-emb-key-group').classList.toggle('hidden', p === 'sentence_transformers' || p === 'ollama');
        }
        function onKBVDBProviderChange(){
            const p = document.getElementById('kb-vdb-provider').value;
            document.getElementById('kb-vdb-pinecone-group').classList.toggle('hidden', p !== 'pinecone');
        }

        function handleDocFiles(e){handleDocFilesDrop(e.target.files);}
        function handleDocFilesDrop(files){for(const f of files)uploadedFiles.push(f);renderDocFiles();}
        function renderDocFiles(){document.getElementById('doc-files-list').innerHTML=uploadedFiles.map((f,i)=>`<div class="flex items-center justify-between bg-gray-800 rounded-lg p-2"><div class="flex items-center gap-2 min-w-0"><span>${fileIcon(f.name.split('.').pop())}</span><span class="text-sm truncate">${f.name}</span></div><button onclick="uploadedFiles.splice(${i},1);renderDocFiles()" class="text-gray-500 hover:text-red-400 p-1">✕</button></div>`).join('');}

        // API Tool Wizard
        function setApiStep(s){
            apiStep=s;
            for(let i=1;i<=4;i++){
                const stepEl = document.getElementById('api-step-'+i);
                const btnEl = document.getElementById('api-step-'+i+'-btn');
                if(stepEl) stepEl.classList.toggle('hidden',i!==s);
                if(btnEl) btnEl.className='api-step px-2 md:px-4 py-2 rounded-lg border text-xs md:text-sm whitespace-nowrap '+(i===s?'border-purple-500 bg-purple-500/10 text-white':'border-gray-700 text-gray-400');
            }
            if(s===4 && typeof renderTestParams==='function') renderTestParams();
        }

        function addApiParam(){
            apiParams.push({id:Date.now(),name:'',description:'',data_type:'string',required:false,location:'query'});
            renderApiParams();
        }

        function renderApiParams(){
            document.getElementById('api-params-list').innerHTML=apiParams.map((p,i)=>`
                <div class="card rounded-lg p-3 md:p-4 space-y-3" id="param-${p.id}">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label class="text-xs text-gray-400">Name</label>
                            <input type="text" value="${p.name}" onchange="apiParams[${i}].name=this.value.replace(/\\s/g,'')" class="input-field w-full rounded px-3 py-2 text-sm mt-1" placeholder="city">
                        </div>
                        <div>
                            <label class="text-xs text-gray-400">Type</label>
                            <select onchange="apiParams[${i}].data_type=this.value" class="input-field w-full rounded px-3 py-2 text-sm mt-1">
                                <option value="string" ${p.data_type==='string'?'selected':''}>String</option>
                                <option value="integer" ${p.data_type==='integer'?'selected':''}>Integer</option>
                                <option value="boolean" ${p.data_type==='boolean'?'selected':''}>Boolean</option>
                            </select>
                            
                        </div>
                        <div>
                            <label class="text-xs text-gray-400">Location</label>
                            <select onchange="apiParams[${i}].location=this.value" class="input-field w-full rounded px-3 py-2 text-sm mt-1">
                                <option value="query" ${p.location==='query'?'selected':''}>Query</option>
                                <option value="path" ${p.location==='path'?'selected':''}>Path</option>
                                <option value="header" ${p.location==='header'?'selected':''}>Header</option>
                                <option value="body" ${p.location==='body'?'selected':''}>Body</option>
                            </select>
                            
                        </div>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400">Description</label>
                        <input type="text" value="${p.description}" onchange="apiParams[${i}].description=this.value" class="input-field w-full rounded px-3 py-2 text-sm mt-1" placeholder="The city name">
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="toggle-switch ${p.required?'on':''}" onclick="apiParams[${i}].required=!apiParams[${i}].required;renderApiParams()"></div>
                            <span class="text-sm">Required</span>
                        </div>
                        <button onclick="apiParams.splice(${i},1);renderApiParams()" class="text-gray-500 hover:text-red-400 text-sm">Remove</button>
                    </div>
                </div>
            `).join('')||'<p class="text-gray-500 text-sm text-center py-3">No fields yet. Click "Add field" if the API needs any.</p>';
        }

        function setConfigMode(mode){
            configMode=mode;
            document.getElementById('config-manual-btn').className='card p-3 md:p-4 rounded-lg text-center'+(mode==='manual'?' border-purple-500 bg-purple-500/10':'');
            document.getElementById('config-spec-btn').className='card p-3 md:p-4 rounded-lg text-center'+(mode==='spec'?' border-purple-500 bg-purple-500/10':'');
            document.getElementById('config-manual-form').classList.toggle('hidden',mode==='spec');
            document.getElementById('config-spec-upload').classList.toggle('hidden',mode==='manual');
        }

        async function handleSpecFile(e){
            const file=e.target.files[0];if(!file)return;
            const fd=new FormData();fd.append('file',file);
            try{
                const r=await fetch(API+'/api/tools/parse-openapi',{method:'POST',body:fd});
                const d=await r.json();
                if(d.base_url){ const u=document.getElementById('api-base-url')||document.getElementById('api-url'); if(u) u.value=d.base_url; }
                if(d.endpoints?.length){
                    const ep=d.endpoints[0];
                    document.getElementById('api-method').value=ep.method;
                    document.getElementById('api-path').value=ep.path;
                    apiParams=ep.parameters.map(p=>({id:Date.now()+Math.random(),name:p.name,description:p.description,data_type:p.data_type,required:p.required,location:p.location}));
                    renderApiParams();
                }
                alert('OpenAPI spec loaded!');
                setConfigMode('manual');
            }catch(e){alert('Failed to parse spec');}
        }

        function toggleAuthFields(){
            const auth=document.getElementById('api-auth')?.value;
            const authValContainer = document.getElementById('auth-value-container') || document.getElementById('api-auth-val-group');
            const keyOptions = document.getElementById('api-key-options');
            if(authValContainer) authValContainer.classList.toggle('hidden',auth==='none');
            if(keyOptions) keyOptions.classList.toggle('hidden',auth!=='api_key');
        }

        function getBusinessFriendlyParamLabel(paramName, description) {
            if (description && description.length > 5 && !description.toLowerCase().startsWith('the ')) {
                var cleaned = description.charAt(0).toUpperCase() + description.slice(1);
                if (cleaned.endsWith('.')) cleaned = cleaned.slice(0, -1);
                return cleaned;
            }
            const lowerName = (paramName || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
            const labelMap = {
                'supplier id': 'Supplier ID', 'supplierid': 'Supplier ID',
                'customer id': 'Customer ID', 'customerid': 'Customer ID',
                'order id': 'Order Number', 'orderid': 'Order Number',
                'product id': 'Product Code', 'productid': 'Product Code',
                'user id': 'User ID', 'userid': 'User ID',
                'account id': 'Account Number', 'accountid': 'Account Number',
                'invoice id': 'Invoice Number', 'invoiceid': 'Invoice Number',
                'transaction id': 'Transaction ID', 'transactionid': 'Transaction ID',
                'id': 'ID', 'name': 'Name', 'email': 'Email Address',
                'phone': 'Phone Number', 'mobile': 'Mobile Number',
                'date': 'Date', 'start date': 'Start Date', 'end date': 'End Date',
                'status': 'Status', 'type': 'Type', 'category': 'Category',
                'amount': 'Amount', 'price': 'Price', 'quantity': 'Quantity',
                'address': 'Address', 'city': 'City', 'country': 'Country',
                'code': 'Code', 'reference': 'Reference Number'
            };
            return labelMap[lowerName] || paramName.split(/[_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }

        function renderTestParams(){
            const container = document.getElementById('api-test-params');
            if (!container) return;
            const hasParams = apiParams && apiParams.length > 0;
            container.innerHTML = hasParams ? apiParams.map((p,i)=> {
                const safeId = 'test-param-' + (p.id != null ? p.id : i);
                const friendlyLabel = getBusinessFriendlyParamLabel(p.name, p.description);
                const required = p.required ? '<span class="text-purple-300 text-xs ml-1 font-normal">Required</span>' : '<span class="text-gray-400 text-xs ml-1 font-normal">Optional</span>';
                const helpText = p.description && p.description.length > 5 ? `<div class="text-xs text-gray-300 mt-1">${escHtml(p.description)}</div>` : '';
                const placeholder = `Enter ${friendlyLabel.toLowerCase()}`;
                return `
                <div class="space-y-1.5">
                    <label for="${safeId}" class="flex items-baseline justify-between text-sm font-semibold text-white">
                        <span>${escHtml(friendlyLabel)}</span>
                        ${required}
                    </label>
                    ${helpText}
                    <input type="text" id="${safeId}" class="w-full bg-gray-900/80 border-2 border-purple-500/20 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:border-purple-400 focus:bg-gray-900 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all duration-200 hover:border-purple-500/30" placeholder="${escHtml(placeholder)}" data-param-key="${escHtml(p.name || '')}" data-param-id="${p.id != null ? p.id : i}">
                </div>`;
            }).join('') : '<p class="text-gray-500 text-sm py-8 text-center">No additional information needed</p>';
        }

        async function testApiConnection(){
            const btn=document.getElementById('test-api-btn');
            if(btn){ btn.disabled=true; btn.textContent='Testing...'; }
            const resultEl=document.getElementById('api-test-result');
            const statusIcon=document.getElementById('test-status-icon');
            const statusText=document.getElementById('test-status-text');
            const responsePre=document.getElementById('test-response');
            if(resultEl) resultEl.classList.remove('hidden');
            if(statusIcon) statusIcon.textContent='⏳';
            if(statusText) statusText.textContent='Testing...';
            const params={};
            (apiParams||[]).forEach((p,i)=>{ const el=document.getElementById('test-param-'+(p.id!=null?p.id:i))||document.getElementById('test-param-'+p.name); if(el&&el.value) params[p.name||('param_'+i)]=el.value; });
            const baseUrlEl=document.getElementById('api-base-url')||document.getElementById('api-url');
            const authValEl=document.getElementById('api-auth-value')||document.getElementById('api-auth-val');
            try{
                const r=await fetch(API+'/api/tools/test-api',{method:'POST',headers:{'Content-Type':'application/json',...(typeof getAuthHeaders==='function'?getAuthHeaders():{})},body:JSON.stringify({
                    base_url:baseUrlEl?.value||'',
                    http_method:document.getElementById('api-method')?.value,
                    endpoint_path:document.getElementById('api-path')?.value,
                    auth_type:document.getElementById('api-auth')?.value,
                    auth_value:authValEl?.value||'',
                    api_key_name:document.getElementById('api-key-name')?.value||'',
                    api_key_location:document.getElementById('api-key-loc')?.value||'',
                    parameters:params
                })});
                const d=await r.json();
                if(d.success){
                    if(statusIcon) statusIcon.textContent='✅';
                    if(statusText) statusText.textContent='Success! Status: '+d.status_code;
                }else{
                    if(statusIcon) statusIcon.textContent='❌';
                    if(statusText) statusText.textContent='Failed: '+(d.error||'Status '+d.status_code);
                }
                if(responsePre) responsePre.textContent=JSON.stringify(d.data,null,2);
            }catch(e){
                if(statusIcon) statusIcon.textContent='❌';
                if(statusText) statusText.textContent='Error: '+e.message;
            }
            if(btn){ btn.disabled=false; btn.textContent='🔌 Test Connection'; }
        }

        async function createTool(){
            if(!toolType){alert('Select tool type');return;}
            let name,desc,config={},api_config=null;
            
            // Helper function to check if name exists (skip for same tool when editing)
            function isNameDuplicate(toolName) {
                if(!allTools || !toolName) return false;
                return allTools.some(t => {
                    // When editing, skip the tool being edited
                    if (editingToolId && t.id === editingToolId) return false;
                    return t.name.toLowerCase().trim() === toolName.toLowerCase().trim();
                });
            }
            
            // Knowledge Base Tool
            if(toolType==='knowledge'){
                name=document.getElementById('kb-name').value?.trim();
                desc=document.getElementById('kb-desc').value;
                if(!name){alert('Enter knowledge base name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
                
                // Build KB config
                config = {
                    collection_id: document.getElementById('kb-collection').value || name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                    // Embedding config
                    embedding: {
                        use_global: document.getElementById('kb-emb-global').checked,
                        provider: document.getElementById('kb-emb-provider').value,
                        model: document.getElementById('kb-emb-model').value,
                        local_model: document.getElementById('kb-emb-local-model').value,
                        api_key: document.getElementById('kb-emb-api-key').value
                    },
                    // Vector DB config
                    vector_db: {
                        use_global: document.getElementById('kb-vdb-global').checked,
                        provider: document.getElementById('kb-vdb-provider').value,
                        pinecone_api_key: document.getElementById('kb-vdb-pinecone-key').value
                    },
                    // RAG Settings
                    chunk_size: parseInt(document.getElementById('kb-chunk-size').value) || 1000,
                    chunk_overlap: parseInt(document.getElementById('kb-chunk-overlap').value) || 200,
                    top_k: parseInt(document.getElementById('kb-top-k').value) || 5,
                    search_type: document.getElementById('kb-search-type').value,
                    similarity_threshold: parseInt(document.getElementById('kb-threshold').value) / 100,
                    // Advanced
                    reranking: document.getElementById('kb-rerank').value,
                    context_window: parseInt(document.getElementById('kb-context-window').value) || 4000,
                    include_metadata: document.getElementById('kb-include-metadata').checked,
                    auto_reindex: document.getElementById('kb-auto-reindex').checked
                };
            }
            else if(toolType==='document'){
                name=document.getElementById('doc-name').value?.trim();
                desc=document.getElementById('doc-desc').value;
                if(!name){alert('Enter tool name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
            }else if(toolType==='website'){
                name=document.getElementById('web-name').value?.trim();
                desc=document.getElementById('web-desc').value;
                config.url=document.getElementById('web-url').value;
                config.recursive=document.getElementById('web-recursive').checked;
                config.max_pages=parseInt(document.getElementById('web-max').value);
                if(!name){alert('Enter tool name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
                if(!config.url){alert('Enter website URL');return;}
            }else if(toolType==='api'){
                name=(document.getElementById('api-name')||document.getElementById('wiz-name'))?.value?.trim();
                desc=(document.getElementById('api-desc')||document.getElementById('wiz-desc'))?.value||'';
                if(!name){alert('Enter tool name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
                api_config={
                    base_url:(document.getElementById('api-base-url')||document.getElementById('api-url'))?.value||'',
                    http_method:document.getElementById('api-method').value,
                    endpoint_path:document.getElementById('api-path').value,
                    auth_type:document.getElementById('api-auth').value,
                    auth_value:(document.getElementById('api-auth-value')||document.getElementById('api-auth-val'))?.value||'',
                    api_key_name:document.getElementById('api-key-name')?.value||'',
                    api_key_location:document.getElementById('api-key-loc')?.value||'',
                    headers:{},
                    input_parameters:(apiParams||[]).map(p=>({name:p.name,description:p.description,data_type:p.data_type,required:p.required,location:p.location}))
                };
            }
            // Email Tool
            else if(toolType==='email'){
                name = document.getElementById('wiz-name')?.value?.trim();
                desc = document.getElementById('wiz-desc')?.value || '';
                if(!name){alert('Enter tool name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
                
                // Get email config from the form
                const emailConfigData = document.getElementById('email-config-data')?.value;
                if(emailConfigData){
                    try {
                        config = JSON.parse(emailConfigData);
                    } catch(e) {
                        config = {};
                    }
                }
                
                // If no OAuth config, check for SendGrid
                if(!config.provider){
                    const sendgridKey = document.getElementById('sendgrid-api-key')?.value;
                    const sendgridFrom = document.getElementById('sendgrid-from-email')?.value;
                    if(sendgridKey && sendgridFrom){
                        config = {
                            provider: 'sendgrid',
                            apiKey: sendgridKey,
                            fromEmail: sendgridFrom
                        };
                    }
                }
                
                if(!config.provider){
                    alert('Please connect an email provider first');
                    return;
                }
            }
            // Generic handler for other tools (webhook, websearch, etc.)
            else {
                name = document.getElementById('wiz-name')?.value?.trim();
                desc = document.getElementById('wiz-desc')?.value || '';
                if(!name){alert('Enter tool name');return;}
                if(isNameDuplicate(name)){
                    alert(`❌ A tool named "${name}" already exists.\nPlease choose a different name.`);
                    return;
                }
            }
            
            // Show progress modal
            const isEditing = !!editingToolId;
            showProgressModal(isEditing ? 'Updating tool...' : 'Creating tool...');
            
            try {
                updateProgress(10, isEditing ? '📝 Updating tool...' : '📝 Creating tool...');
                
                // Use PUT for editing, POST for creating
                const method = isEditing ? 'PUT' : 'POST';
                const url = isEditing ? API+'/api/tools/'+editingToolId : API+'/api/tools';
                
                const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({type:toolType,name,description:desc,config,api_config})});
                
                // Check for errors (including duplicate name)
                if(!r.ok) {
                    const errorData = await r.json().catch(() => ({}));
                    const errorMsg = errorData.detail || errorData.message || `Error: ${r.status}`;
                    hideProgressModal();
                    alert('❌ ' + errorMsg);
                    return;
                }
                
                const d=await r.json();
                
                if(toolType==='document'&&uploadedFiles.length){
                    updateProgress(30, '📄 Uploading documents...');
                    for(let i=0; i<uploadedFiles.length; i++){
                        const f = uploadedFiles[i];
                        updateProgress(30 + (i/uploadedFiles.length)*60, `📄 Uploading ${f.name}...`);
                        const fd=new FormData();
                        fd.append('file',f);
                        await fetch(API+'/api/tools/'+d.tool_id+'/documents',{method:'POST',body:fd});
                    }
                    updateProgress(100, '✅ Documents uploaded!');
                }
                
                if(toolType==='website'&&config.url){
                    updateProgress(20, '🌐 Starting web scraper...');
                    
                    // Check if dynamic site
                    const domain = new URL(config.url).hostname;
                    const dynamicSites = ['oracle.com','azure.microsoft.com','cloud.google.com','aws.amazon.com','digitalocean.com','vercel.com','netlify.com','heroku.com'];
                    const isDynamic = dynamicSites.some(s => domain.includes(s));
                    
                    let progressInterval;
                    let currentProgress = 20;
                    
                    if(isDynamic){
                        updateProgress(25, '🎭 Detected dynamic site - launching Playwright browser...');
                        
                        // Simulate progress during long scrape
                        const progressSteps = [
                            {p: 30, msg: '🎭 [1/7] Launching Chromium browser...'},
                            {p: 35, msg: '🎭 [2/7] Creating browser context...'},
                            {p: 40, msg: '🎭 [3/7] Navigating to page...'},
                            {p: 50, msg: '🎭 [4/7] Waiting for JavaScript to render...'},
                            {p: 60, msg: '🎭 [5/7] Scrolling to load dynamic content...'},
                            {p: 70, msg: '🎭 [6/7] Extracting rendered HTML...'},
                            {p: 80, msg: '📊 Extracting tables and pricing data...'},
                        ];
                        let stepIndex = 0;
                        
                        progressInterval = setInterval(() => {
                            if(stepIndex < progressSteps.length){
                                updateProgress(progressSteps[stepIndex].p, progressSteps[stepIndex].msg);
                                stepIndex++;
                            }
                        }, 4000); // Every 4 seconds
                    } else {
                        updateProgress(30, '📄 Fetching page content...');
                        progressInterval = setInterval(() => {
                            if(currentProgress < 80){
                                currentProgress += 10;
                                updateProgress(currentProgress, '📄 Processing page...');
                            }
                        }, 2000);
                    }
                    
                    try {
                        const scrapeResult = await fetch(API+'/api/tools/'+d.tool_id+'/scrape',{
                            method:'POST',
                            headers:{'Content-Type':'application/json'},
                            body:JSON.stringify({url:config.url,recursive:config.recursive,max_pages:config.max_pages})
                        });
                        
                        clearInterval(progressInterval);
                        
                        const scrapeData = await scrapeResult.json();
                        
                        if(scrapeData.pages_scraped > 0){
                            updateProgress(100, `✅ Successfully scraped ${scrapeData.pages_scraped} page(s)!`);
                        } else {
                            updateProgress(100, '⚠️ No content found on page');
                        }
                    } catch(scrapeError) {
                        clearInterval(progressInterval);
                        updateProgress(100, `❌ Scrape failed: ${scrapeError.message}`);
                    }
                }
                
                if(toolType==='api'){
                    updateProgress(100, '✅ API Tool created!');
                }
                
                // Wait a moment to show success
                await new Promise(r => setTimeout(r, 1500));
                
                hideProgressModal();
                hideModal('modal-tool');
                
                // Show success notification
                const wasEditing = !!editingToolId;
                showToast(wasEditing ? 'Tool updated successfully!' : 'Tool created successfully!', 'success');
                
                // Reset editing state
                editingToolId = null;
                
                loadTools();
                loadWizardTools();
                
                // Navigate to tool detail to see the data
                viewTool(d.tool_id || d.id);
                
            } catch(error) {
                updateProgress(0, `❌ Error: ${error.message}`);
                await new Promise(r => setTimeout(r, 2000));
                hideProgressModal();
                editingToolId = null;
            }
        }
        
        function showProgressModal(title){
            ensureModalInBody('progress-modal');
            document.getElementById('progress-modal').classList.remove('hidden');
            document.getElementById('progress-title').textContent = title;
            document.getElementById('progress-bar').style.width = '0%';
            document.getElementById('progress-status').textContent = 'Starting...';
            document.getElementById('progress-log').innerHTML = '';
            // Disable create button (check both possible IDs)
            const createBtn = document.getElementById('create-tool-btn') || document.getElementById('btn-create');
            if (createBtn) {
                createBtn.disabled = true;
                createBtn.dataset.originalText = createBtn.textContent;
                createBtn.textContent = 'Creating...';
            }
        }
        
        function updateProgress(percent, status){
            document.getElementById('progress-bar').style.width = percent + '%';
            document.getElementById('progress-status').textContent = status;
            // Add to log
            const log = document.getElementById('progress-log');
            const time = new Date().toLocaleTimeString();
            log.innerHTML += `<div class="text-xs text-gray-400">[${time}] ${status}</div>`;
            log.scrollTop = log.scrollHeight;
        }
        
        function hideProgressModal(){
            document.getElementById('progress-modal').classList.add('hidden');
            document.getElementById('progress-log').innerHTML = '';
            // Re-enable create button (check both possible IDs)
            const createBtn = document.getElementById('create-tool-btn') || document.getElementById('btn-create');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.textContent = createBtn.dataset.originalText || 'Create Tool';
            }
        }

        async function loadChatAgents(){
            console.log('🔍 [loadChatAgents] Starting...');
            const headers = getAuthHeaders();
            console.log('🔍 [loadChatAgents] Auth headers:', {
                hasAuth: !!headers.Authorization,
                tokenLength: headers.Authorization ? headers.Authorization.length : 0,
                tokenPreview: headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'none',
                currentUser: currentUser ? { id: currentUser.id, email: currentUser.email } : null,
                authTokenExists: !!authToken
            });
            
            try {
                // Use /api/agents/accessible for chat - shows agents user can CHAT with
                // (different from /api/agents which shows agents user can MANAGE)
                const r=await fetch(API+'/api/agents/accessible', {
                    headers: headers
                });
                
                console.log('🔍 [loadChatAgents] Response status:', r.status, r.statusText);
                
                if (!r.ok) {
                    console.error('❌ [loadChatAgents] Request failed:', r.status, r.statusText);
                    const errorText = await r.text().catch(() => '');
                    console.error('❌ [loadChatAgents] Error response:', errorText);
                    
                    // If unauthorized, the user might not be logged in
                    if (r.status === 401) {
                        console.error('❌ [loadChatAgents] 401 Unauthorized - checking auth state:', {
                            authToken: authToken ? 'exists' : 'missing',
                            tokenFromStorage: localStorage.getItem('agentforge_token') ? 'exists' : 'missing',
                            currentUser: currentUser ? 'exists' : 'missing'
                        });
                        showToast('Please login to access agents', 'error');
                        // Don't navigate to dashboard if we're already on chat page
                        if (_currentPage !== 'chat') {
                            navigate('dashboard');
                        }
                        return;
                    }
                    return;
                }
                
                const d=await r.json();
                // Handle different response formats
                let agents = [];
                if (Array.isArray(d)) {
                    agents = d;
                } else if (d && Array.isArray(d.agents)) {
                    agents = d.agents;
                }

                // Chat UI should only show conversational agents.
                // Process agents are handled via Processes UI (runs/forms), not chat.
                const chatAgents = (agents || []).filter(a => {
                    const t = (a && (a.agent_type || a.type)) ? String(a.agent_type || a.type).toLowerCase() : 'conversational';
                    return t !== 'process';
                });
                
                const agentSelect = document.getElementById('chat-agent');
                if (agentSelect) {
                    agentSelect.innerHTML='<option value="">Select Agent...</option>'+chatAgents.map(a=>`<option value="${a.id}">${a.icon || '🤖'} ${a.name}</option>`).join('');
                }
                
                return chatAgents; // Return agents for verification
            } catch (err) {
                console.error('loadChatAgents error:', err);
                return [];
            }
        }

        async function onAgentChange(){
            try {
                const id=document.getElementById('chat-agent').value;
                if(!id) {
                    // Show default message when no agent selected
                    const msgContainer = document.getElementById('chat-messages');
                    if (msgContainer) {
                        msgContainer.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-icon">💬</div><h2>Welcome to Chat</h2><p>Select an agent from the sidebar to start a conversation</p></div>';
                    }
                    // Update header
                    updateChatHeader(null);
                    return;
                }
                
                // Show loading state
                const msgContainer = document.getElementById('chat-messages');
                if (msgContainer) {
                    msgContainer.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-icon" style="animation:pulse 1.5s infinite">⏳</div><h2>Loading...</h2><p>Preparing your chat experience</p></div>';
                }
                
                // Load conversations for this agent
                const r=await fetch(API+'/api/agents/'+id+'/conversations', {
                    headers: getAuthHeaders()
                });
                
                if (!r.ok) {
                    console.error('Failed to load conversations:', r.status);
                    if (r.status === 401) {
                        showToast('Please login to access this agent', 'error');
                        return;
                    }
                }
                
                const d=await r.json();
                
                // Update conversation list sidebar
                chatConversations = d.conversations || [];
                renderChatConvList();
                
                // Sync mobile selector
                const mobileAgent = document.getElementById('chat-agent-mobile');
                if (mobileAgent) mobileAgent.value = id;
                
                // If there are existing conversations, load the most recent one
                // Otherwise, show welcome message (don't create new conversation until user sends message)
                console.log('🔍 [CHAT] Conversations loaded:', chatConversations.length, chatConversations.map(c => ({id: c.id?.substring(0,8), title: c.title})));
                if (chatConversations.length > 0) {
                    // Load the most recent conversation (first in list - already sorted by updated_at desc)
                    console.log('📂 [CHAT] Loading last conversation:', chatConversations[0].id, chatConversations[0].title);
                    await loadChatConversation(chatConversations[0].id);
                } else {
                    // No conversations - show welcome message
                    console.log('✨ [CHAT] No conversations, showing welcome');
                    conv = null;
                    await startChatWithWelcome(id);
                }
            } catch (err) {
                console.error('onAgentChange error:', err);
                showToast('Failed to load chat: ' + err.message, 'error');
                const msgContainer = document.getElementById('chat-messages');
                if (msgContainer) {
                    msgContainer.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-icon">❌</div><h2>Failed to Load</h2><p>' + esc(err.message) + '</p></div>';
                }
            }
        }
        
        // Update desktop header with agent info
        function updateChatHeader(agent) {
            const nameEl = document.getElementById('chat-agent-name');
            const statusEl = document.getElementById('chat-agent-status');
            const dotEl = document.getElementById('chat-online-dot');
            const avatarEl = document.querySelector('.chat-header-avatar');
            
            if (!agent) {
                if (nameEl) nameEl.textContent = 'Select an Agent';
                if (statusEl) statusEl.textContent = 'Choose an agent to start chatting';
                if (dotEl) dotEl.style.display = 'none';
                if (avatarEl) avatarEl.textContent = '🤖';
                return;
            }
            
            if (nameEl) nameEl.textContent = agent.name || 'AI Assistant';
            if (statusEl) statusEl.textContent = agent.description || 'Ready to help';
            if (dotEl) dotEl.style.display = 'inline-block';
            if (avatarEl) avatarEl.textContent = agent.icon || '🤖';
        }
        
        async function startChatWithWelcome(agentId){
            const msgContainer = document.getElementById('chat-messages');
            msgContainer.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-icon" style="animation:pulse 1.5s infinite">⏳</div><h2>Loading...</h2><p>Preparing your chat</p></div>';
            
            try {
                const response = await fetch(API+'/api/agents/'+agentId+'/start-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    }
                });
                
                if(!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('❌ Start chat failed:', response.status, errorData);
                    let errorMsg = `Failed to start chat session (${response.status})`;
                    if(errorData.detail) {
                        if(typeof errorData.detail === 'object') {
                            errorMsg = errorData.detail.message || errorData.detail.error || JSON.stringify(errorData.detail);
                        } else {
                            errorMsg = errorData.detail;
                        }
                    } else if(errorData.message) {
                        errorMsg = errorData.message;
                    }
                    throw new Error(errorMsg);
                }
                
                const session = await response.json();
                console.log('📨 Start chat response:', session);
                
                // Store the conversation ID
                conv = session.conversation_id;
                
                // Update header with agent info
                updateChatHeader({ 
                    name: session.agent_name, 
                    description: session.agent_description || 'Ready to help you',
                    icon: session.agent_icon || '🤖'
                });
                
                // Build personalized welcome message - Modern UI
                const fullName = session.user_name || 'User';
                const firstName = fullName.split(' ')[0];
                const agentName = session.agent_name || 'Assistant';
                const tasks = session.accessible_tasks || [];
                
                let welcomeHtml = `
                    <div class="chat-welcome">
                        <div class="chat-welcome-icon">👋</div>
                        <h2>Hi ${esc(firstName)}!</h2>
                        <p>I'm <strong style="color:var(--accent-primary)">${esc(agentName)}</strong>. How can I help you today?</p>
                `;
                
                if(tasks.length > 0) {
                    const visibleTasks = tasks.slice(0, 5);
                    const hiddenTasks = tasks.slice(5);
                    const hasMore = hiddenTasks.length > 0;
                    
                    welcomeHtml += `
                        <div style="margin-top:24px;text-align:left;max-width:400px;margin-left:auto;margin-right:auto;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:16px;padding:20px">
                            <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em">✨ What I can do for you</p>
                            <ul style="font-size:0.875rem;color:var(--text-primary);list-style:none;padding:0;margin:0">
                                ${visibleTasks.map(t => `<li style="padding:6px 0;display:flex;align-items:center;gap:8px"><span style="color:var(--accent-primary)">→</span> ${esc(t)}</li>`).join('')}
                                ${hasMore ? `
                                    <li id="welcome-tasks-hidden" class="hidden">
                                        ${hiddenTasks.map(t => `<span style="display:block;padding:6px 0"><span style="color:var(--accent-primary)">→</span> ${esc(t)}</span>`).join('')}
                                    </li>
                                    <li id="welcome-tasks-toggle" style="padding:8px 0;color:var(--accent-primary);cursor:pointer;font-size:0.75rem" onclick="toggleWelcomeTasks()">
                                        ↓ Show ${hiddenTasks.length} more capabilities
                                    </li>
                                ` : ''}
                            </ul>
                        </div>
                    `;
                }
                
                welcomeHtml += '</div>';
                msgContainer.innerHTML = welcomeHtml;
                
            } catch(err) {
                console.error('Start chat error:', err);
                msgContainer.innerHTML = '<div class="chat-welcome"><div class="chat-welcome-icon">💬</div><h2>Start a Conversation</h2><p>Type a message below to begin</p></div>';
            }
        }

        // onConvChange removed - now using sidebar list instead of dropdown

        // File handling for chat
        function handleChatFile(event){
            const files = Array.from(event.target.files);
            chatAttachments = [...chatAttachments, ...files];
            renderChatAttachments();
            event.target.value = '';
        }
        
        function handleTestFile(event){
            const files = Array.from(event.target.files);
            testAttachments = [...testAttachments, ...files];
            renderTestAttachments();
            event.target.value = '';
        }
        
        function renderChatAttachments(){
            const container = document.getElementById('chat-attachments');
            if(chatAttachments.length === 0){
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            container.innerHTML = chatAttachments.map((f, i) => `
                <div class="flex items-center gap-2 bg-gray-700 text-white rounded-lg px-3 py-1 text-sm">
                    <span>${getFileIcon(f.name)} ${f.name.substring(0, 20)}${f.name.length > 20 ? '...' : ''}</span>
                    <button onclick="removeChatAttachment(${i})" class="text-red-400 hover:text-red-300">✕</button>
                </div>
            `).join('');
        }
        
        function renderTestAttachments(){
            const container = document.getElementById('test-attachments');
            if(testAttachments.length === 0){
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            container.innerHTML = testAttachments.map((f, i) => `
                <div class="flex items-center gap-2 bg-gray-700 text-white rounded-lg px-3 py-1 text-sm">
                    <span>${getFileIcon(f.name)} ${f.name.substring(0, 20)}${f.name.length > 20 ? '...' : ''}</span>
                    <button onclick="removeTestAttachment(${i})" class="text-red-400 hover:text-red-300">✕</button>
                </div>
            `).join('');
        }
        
        function getFileIcon(filename){
            const ext = filename.toLowerCase().split('.').pop();
            const icons = {
                'pdf': '📕',
                'doc': '📘', 'docx': '📘',
                'xls': '📊', 'xlsx': '📊',
                'ppt': '📽️', 'pptx': '📽️',
                'csv': '📋',
                'txt': '📝', 'md': '📝',
                'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'bmp': '🖼️', 'svg': '🖼️'
            };
            return icons[ext] || '📄';
        }
        
        function removeChatAttachment(index){
            chatAttachments.splice(index, 1);
            renderChatAttachments();
        }
        
        function removeTestAttachment(index){
            testAttachments.splice(index, 1);
            renderTestAttachments();
        }

        async function sendMsg(){
            const aid=document.getElementById('chat-agent').value;
            const inp=document.getElementById('chat-input');
            const m=inp.value.trim();
            if(!aid){alert('Please select an agent');return;}
            if(!m && chatAttachments.length === 0)return;
            inp.value='';
            
            // Get user's timezone
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // Show message with attachments
            let displayMsg = m;
            if(chatAttachments.length > 0){
                displayMsg += '\n\n📎 Attachments: ' + chatAttachments.map(f => f.name).join(', ');
            }
            addMsg('user', displayMsg);
            addTyping();
            
            try{
                let response;
                if(chatAttachments.length > 0){
                    // Send with FormData for file upload
                    const formData = new FormData();
                    formData.append('message', m);
                    formData.append('timezone', userTimezone);
                    if(conv) formData.append('conversation_id', conv);
                    chatAttachments.forEach(f => formData.append('files', f));
                    response = await fetch(API+'/api/agents/'+aid+'/chat-with-files', {
                        method:'POST', 
                        headers: getAuthHeaders(),
                        body: formData
                    });
                } else {
                    // Use streaming endpoint for real-time thinking display
                    await sendMsgStreaming(aid, m, userTimezone);
                    return; // streaming handles everything
                }
                const d=await response.json();
                rmTyping();
                conv=d.conversation_id;
                addMsg('assistant',d.response,d.sources);
                // Update conversation list
                updateConvDropdown(d.conversation_id, m);
                // Clear attachments after send
                chatAttachments = [];
                renderChatAttachments();
            }catch(e){rmTyping();addMsg('error','Error: '+e.message);}
        }

        // Streaming chat with real-time thinking display (inline like ChatGPT)
        let thinkingTypeTimer = null; // Track typing animation
        
        async function sendMsgStreaming(aid, message, timezone){
            const c=document.getElementById('chat-messages');
            
            // Add thinking message - Modern design
            const thinkingDiv = document.createElement('div');
            thinkingDiv.id = 'thinking-container';
            thinkingDiv.className = 'msg-row assistant';
            thinkingDiv.innerHTML = `
                <div class="msg-avatar">🤖</div>
                <div class="msg-bubble thinking-bubble" style="display:flex;align-items:center;gap:10px;padding:14px 18px">
                    <span class="thinking-dot"></span>
                    <span id="thinking-content" style="font-style:italic">Thinking...</span>
                </div>
            `;
            c.appendChild(thinkingDiv);
            c.scrollTop = c.scrollHeight;
            
            let fullContent = '';
            let sources = [];
            let buffer = ''; // Buffer for incomplete SSE data
            
            try {
                const response = await fetch(API+'/api/agents/'+aid+'/chat/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_id: conv,
                        timezone: timezone
                    })
                });
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // Add to buffer and process complete lines
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    
                    // Keep incomplete line in buffer
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;
                                const data = JSON.parse(jsonStr);
                                
                                switch (data.type) {
                                    case 'thinking':
                                        setThinkingText(data.content);
                                        break;
                                    case 'tool_call':
                                        setThinkingText(data.content);
                                        break;
                                    case 'tool_result':
                                        setThinkingText(data.content);
                                        break;
                                    case 'conversation_id':
                                        conv = data.content;
                                        break;
                                    case 'content':
                                        fullContent += data.content;
                                        break;
                                    case 'sources':
                                        sources = data.content || [];
                                        break;
                                    case 'done':
                                        finishThinkingUI(true);
                                        break;
                                    case 'error':
                                        // IMPORTANT: show the error to the user (don't remove the bubble silently)
                                        finishThinkingUI(false);
                                        addMsg('error', data.content || 'Error: failed to get a response.');
                                        return;
                                }
                            } catch (e) { 
                                // Invalid JSON, skip
                            }
                        }
                    }
                }
                
                // Add the final response
                if (fullContent) {
                    addMsg('assistant', fullContent, sources);
                    updateConvDropdown(conv, message);
                } else {
                    // Stream finished but no content was received (avoid silent failure UX)
                    addMsg('error', 'No response received. Please try again.');
                }
                
            } catch (e) {
                console.error('Streaming error:', e);
                finishThinkingUI(false);
                addMsg('error', 'Connection error. Please try again.');
            }
        }
        
        // Simple text update without complex typing animation (avoids race conditions)
        function setThinkingText(content) {
            const textEl = document.getElementById('thinking-content');
            if (!textEl || !content) return;
            
            // Cancel any previous typing animation
            if (thinkingTypeTimer) {
                clearTimeout(thinkingTypeTimer);
                thinkingTypeTimer = null;
            }
            
            // Simple fade-in effect by updating text directly
            textEl.style.opacity = '0.5';
            textEl.textContent = content;
            
            // Fade in
            setTimeout(() => {
                textEl.style.opacity = '1';
            }, 50);
            
            document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
        }
        
        function finishThinkingUI(success) {
            // Remove thinking message
            const container = document.getElementById('thinking-container');
            if (container) {
                container.remove();
            }
            // Also remove typing indicator if still there
            rmTyping();
        }
        
        function updateConvDropdown(convId, message) {
            // Update sidebar list
            if (!chatConversations.find(c => c.id === convId)) {
                chatConversations.unshift({
                    id: convId,
                    title: message.substring(0, 30) + '...'
                });
                renderChatConvList();
            }
            conv = convId;
        }

        function addMsg(role,content,sources=[]){
            const c=document.getElementById('chat-messages');
            const d=document.createElement('div');
            d.className='msg-row ' + role;
            
            if(role==='user') {
                d.innerHTML=`<div class="msg-bubble user">${esc(content)}</div>`;
            } else if(role==='assistant'){
                d.innerHTML=`
                    <div class="msg-avatar">🤖</div>
                    <div>
                        <div class="msg-bubble assistant chat-content">${fmt(content)}</div>
                        ${sources?.length ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${sources.map(s=>`<span class="source-badge px-2 py-1 rounded text-xs">${s.source}</span>`).join('')}</div>` : ''}
                    </div>
                `;
            } else {
                d.className = '';
                d.innerHTML=`<div style="text-align:center;color:#f87171;font-size:0.875rem;padding:12px">${content}</div>`;
            }
            c.appendChild(d);
            c.scrollTop=c.scrollHeight;
            d.querySelectorAll('pre code').forEach(b=>hljs.highlightElement(b));
        }

        function addTyping(){
            const c=document.getElementById('chat-messages');
            const d=document.createElement('div');
            d.id='typing';
            d.className='msg-row assistant';
            d.innerHTML=`
                <div class="msg-avatar">🤖</div>
                <div class="msg-bubble assistant" style="display:flex;align-items:center;gap:6px;padding:16px 20px">
                    <span class="thinking-dot"></span>
                    <span class="thinking-dot" style="animation-delay:0.2s"></span>
                    <span class="thinking-dot" style="animation-delay:0.4s"></span>
                </div>
            `;
            c.appendChild(d);
            c.scrollTop=c.scrollHeight;
        }

        function rmTyping(){document.getElementById('typing')?.remove();}
        
        // ============================================================================
        // CHAT CONVERSATION MANAGEMENT (with selection/bulk delete)
        // ============================================================================
        let chatConversations = [];
        let chatSelectionMode = false;
        let chatSelectedConvs = new Set();
        
        function renderChatConvList() {
            const container = document.getElementById('chat-conv-list');
            const agentId = document.getElementById('chat-agent').value;
            
            if (!agentId) {
                container.innerHTML = '<div class="conv-empty"><div class="conv-empty-icon">🤖</div><p class="conv-empty-text">Select an agent to start</p></div>';
                return;
            }
            
            if (chatConversations.length === 0) {
                container.innerHTML = '<div class="conv-empty"><div class="conv-empty-icon">✨</div><p class="conv-empty-text">No conversations yet<br><span style="font-size:0.75rem;opacity:0.6">Click "New Chat" to begin</span></p></div>';
                return;
            }
            
            container.innerHTML = chatConversations.map(c => {
                const timeAgo = formatTimeAgo(c.updated_at || c.created_at);
                return `
                <div class="conv-item ${conv === c.id ? 'active' : ''} ${chatSelectedConvs.has(c.id) ? 'selected' : ''}"
                     onclick="${chatSelectionMode ? `toggleChatConvSelection('${c.id}')` : `loadChatConversation('${c.id}')`}">
                    ${chatSelectionMode ? `<div class="conv-checkbox ${chatSelectedConvs.has(c.id) ? 'checked' : ''}" onclick="event.stopPropagation(); toggleChatConvSelection('${c.id}')"></div>` : ''}
                    <div class="conv-icon">💬</div>
                    <div class="conv-content">
                        <div class="conv-title">${esc(c.title || 'Untitled')}</div>
                        <div class="conv-time">${timeAgo}</div>
                    </div>
                </div>
            `}).join('');
            
            updateChatDeleteButton();
        }
        
        // Format time ago helper
        function formatTimeAgo(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString();
        }
        
        async function loadChatConversations(agentId) {
            try {
                const r = await fetch(API+'/api/agents/'+agentId+'/conversations', {
                    headers: getAuthHeaders()
                });
                const d = await r.json();
                chatConversations = d.conversations || [];
                renderChatConvList();
            } catch(e) {
                console.error('Failed to load conversations:', e);
                chatConversations = [];
                renderChatConvList();
            }
        }
        
        async function loadChatConversation(convId) {
            console.log('📥 [loadChatConversation] Loading conversation:', convId);
            conv = convId;
            try {
                const r = await fetch(API+'/api/conversations/'+convId, {
                    headers: getAuthHeaders()
                });
                const c = await r.json();
                
                console.log('📥 [loadChatConversation] Loaded conversation:', {
                    id: c.id,
                    title: c.title,
                    messageCount: (c.messages || []).length,
                    messages: (c.messages || []).map(m => ({role: m.role, contentPreview: m.content?.substring(0, 50)}))
                });
                
                // Render messages - Modern UI
                const container = document.getElementById('chat-messages');
                if (!container) {
                    console.error('❌ [loadChatConversation] chat-messages container not found!');
                    return;
                }
                
                const messagesHtml = (c.messages || []).map(m => {
                    if (m.role === 'user') {
                        return `<div class="msg-row user"><div class="msg-bubble user">${esc(m.content)}</div></div>`;
                    } else {
                        return `<div class="msg-row assistant"><div class="msg-avatar">🤖</div><div class="msg-bubble assistant chat-content">${fmt(m.content)}</div></div>`;
                    }
                }).join('');
                
                console.log('📥 [loadChatConversation] Rendering', (c.messages || []).length, 'messages to container');
                container.innerHTML = messagesHtml;
                container.scrollTop = container.scrollHeight;
                
                // Highlight code blocks
                container.querySelectorAll('pre code').forEach(b=>hljs.highlightElement(b));
                
                renderChatConvList();
                console.log('✅ [loadChatConversation] Done! Messages displayed.');
            } catch(e) {
                console.error('❌ [loadChatConversation] Failed to load conversation:', e);
            }
        }
        
        function startNewChatConversation() {
            conv = null;
            chatSelectedConvs.clear();
            if (chatSelectionMode) toggleChatSelectionMode();
            
            const agentId = document.getElementById('chat-agent').value;
            if (agentId) {
                startChatWithWelcome(agentId);
            } else {
                clearMsgs();
            }
            renderChatConvList();
        }
        
        function toggleChatSelectionMode() {
            chatSelectionMode = !chatSelectionMode;
            chatSelectedConvs.clear();
            
            const editBtn = document.getElementById('chat-edit-btn');
            const selectionBar = document.getElementById('chat-selection-bar');
            
            if (chatSelectionMode) {
                editBtn.textContent = 'Done';
                editBtn.classList.add('active');
            } else {
                editBtn.textContent = 'Edit';
                editBtn.classList.remove('active');
            }
            
            if (selectionBar) {
                selectionBar.classList.toggle('hidden', !chatSelectionMode);
            }
            
            renderChatConvList();
        }
        
        function toggleChatConvSelection(convId) {
            if (chatSelectedConvs.has(convId)) {
                chatSelectedConvs.delete(convId);
            } else {
                chatSelectedConvs.add(convId);
            }
            renderChatConvList();
        }
        
        function toggleChatSelectAll() {
            const allIds = chatConversations.map(c => c.id);
            const allSelected = allIds.every(id => chatSelectedConvs.has(id));
            
            if (allSelected) {
                chatSelectedConvs.clear();
                document.getElementById('chat-select-all-text').textContent = 'Select All';
            } else {
                allIds.forEach(id => chatSelectedConvs.add(id));
                document.getElementById('chat-select-all-text').textContent = 'Deselect All';
            }
            
            renderChatConvList();
        }
        
        function updateChatDeleteButton() {
            const btn = document.getElementById('chat-delete-selected-btn');
            const count = chatSelectedConvs.size;
            btn.textContent = `Delete (${count})`;
            btn.disabled = count === 0;
        }
        
        async function deleteChatSelectedConvs() {
            if (chatSelectedConvs.size === 0) return;
            
            const count = chatSelectedConvs.size;
            if (!confirm(`Delete ${count} conversation${count > 1 ? 's' : ''}? This cannot be undone.`)) {
                return;
            }
            
            const btn = document.getElementById('chat-delete-selected-btn');
            btn.textContent = 'Deleting...';
            btn.disabled = true;
            
            try {
                const response = await fetch(API+'/api/conversations/bulk', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        conversation_ids: Array.from(chatSelectedConvs)
                    })
                });
                
                const result = await response.json();
                
                // Clear current if deleted
                if (conv && chatSelectedConvs.has(conv)) {
                    conv = null;
                    clearMsgs();
                }
                
                // Reload
                chatSelectedConvs.clear();
                const agentId = document.getElementById('chat-agent').value;
                if (agentId) await loadChatConversations(agentId);
                
                toggleChatSelectionMode();
                
                if (result.failed > 0) {
                    alert(`Failed to delete ${result.failed} conversation(s)`);
                }
                
            } catch(e) {
                console.error('Delete error:', e);
                alert('Failed to delete: ' + e.message);
                updateChatDeleteButton();
            }
        }
        
        function toggleChatSidebar() {
            const sidebar = document.getElementById('chat-sidebar');
            sidebar.classList.toggle('hidden');
        }
        
        async function clearChat(){
            if(conv){
                try{
                    await fetch(API+'/api/conversations/'+conv,{method:'DELETE',headers:getAuthHeaders()});
                    // Remove from list
                    chatConversations = chatConversations.filter(c => c.id !== conv);
                    renderChatConvList();
                }catch(e){console.error('Delete conversation error:',e);}
            }
            conv=null;clearMsgs();
        }
        function clearMsgs(){document.getElementById('chat-messages').innerHTML=`<div class="chat-welcome"><div class="chat-welcome-icon">💬</div><h2>Start a Conversation</h2><p>Type a message below to begin chatting</p></div>`;}
        
        function toggleWelcomeTasks() {
            const hidden = document.getElementById('welcome-tasks-hidden');
            const toggle = document.getElementById('welcome-tasks-toggle');
            if (hidden && toggle) {
                if (hidden.classList.contains('hidden')) {
                    hidden.classList.remove('hidden');
                    toggle.textContent = '▲ Show less';
                } else {
                    hidden.classList.add('hidden');
                    const count = hidden.querySelectorAll('span').length;
                    toggle.textContent = `... and ${count} more`;
                }
            }
        }
        function showModal(id){document.getElementById(id).classList.remove('hidden');}
        function hideModal(id){document.getElementById(id).classList.add('hidden');}
        function esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
        function fmt(t){
            // Clean LaTeX notation for better display
            if (!t || typeof t !== 'string') return '';
            let text = String(t);
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
            // Remove LaTeX brackets but keep content
            text = text.replace(/\\\[/g, '');
            text = text.replace(/\\\]/g, '');
            text = text.replace(/\\\(/g, '');
            text = text.replace(/\\\)/g, '');
            // Clean up display math blocks
            text = text.replace(/\[\s*([^\]]+)\s*\]/g, (match, content) => {
                // If it looks like math (has operators), format it nicely
                if(content.includes('=') || content.includes('×') || content.includes('+') || content.includes('-')){
                    return '\n**' + content.trim() + '**\n';
                }
                return match;
            });
            
            if(typeof marked!=='undefined'){
                marked.setOptions({breaks:true,gfm:true});
                let html = marked.parse(text);
                // Wrap tables in responsive container
                html = html.replace(/<table>/g, '<div class="table-container"><table>');
                html = html.replace(/<\/table>/g, '</table></div>');
                return html;
            }
            return esc(text).replace(/\n/g,'<br>');
        }
        function fileIcon(ext){const i={pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',txt:'📄',csv:'📊',md:'📝'};return i[ext?.toLowerCase()]||'📄';}
        function fmtSize(b){if(b<1024)return b+' B';if(b<1024*1024)return(b/1024).toFixed(1)+' KB';return(b/1024/1024).toFixed(1)+' MB';}

        // ============================================================================
        // Theme Functions
        // ============================================================================
        
        const THEMES = ['dark', 'light', 'ocean', 'sunset', 'forest', 'midnight'];
        
        function setTheme(themeName) {
            if (!THEMES.includes(themeName)) themeName = 'dark';
            
            // Remove old theme
            document.documentElement.removeAttribute('data-theme');
            
            // Apply new theme (dark is default, so no attribute needed)
            if (themeName !== 'dark') {
                document.documentElement.setAttribute('data-theme', themeName);
            }
            
            // Save preference
            localStorage.setItem('agentforge-theme', themeName);
            
            // Update UI buttons
            updateThemeButtons(themeName);
            
            console.log('Theme changed to:', themeName);
        }
        
        function loadTheme() {
            const savedTheme = localStorage.getItem('agentforge-theme') || 'dark';
            setTheme(savedTheme);
        }
        
        function updateThemeButtons(activeTheme) {
            document.querySelectorAll('.theme-btn').forEach(btn => {
                const btnTheme = btn.getAttribute('data-theme-btn');
                const checkmark = btn.querySelector('.theme-check');
                
                if (btnTheme === activeTheme) {
                    btn.classList.add('border-purple-500', 'bg-purple-500/10');
                    btn.classList.remove('border-gray-700', 'border-transparent');
                    if (checkmark) checkmark.classList.remove('hidden');
                    if (checkmark) checkmark.classList.add('flex');
                } else {
                    btn.classList.remove('border-purple-500', 'bg-purple-500/10');
                    btn.classList.add('border-gray-700');
                    if (checkmark) checkmark.classList.add('hidden');
                    if (checkmark) checkmark.classList.remove('flex');
                }
            });
        }
        
        // ============================================================================
        // INTEGRATION SETUP (Admin Only)
        // ============================================================================
        
        function showIntegrationSetup(provider) {
            const providerInfo = {
                google: {
                    name: 'Google',
                    icon: `<svg width="32" height="32" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>`,
                    consoleUrl: 'https://console.cloud.google.com/apis/credentials',
                    apiUrl: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
                    scopes: 'Gmail API (gmail.send)',
                    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
                },
                microsoft: {
                    name: 'Microsoft',
                    icon: `<svg width="32" height="32" viewBox="0 0 21 21">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>`,
                    consoleUrl: 'https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
                    apiUrl: '',
                    scopes: 'Mail.Send, User.Read',
                    envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET']
                }
            };
            
            const info = providerInfo[provider];
            const redirectUri = `${window.location.origin}/api/oauth/${provider}/callback`;
            
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
            modal.id = 'integration-setup-modal';
            modal.innerHTML = `
                <div class="modal-content-box rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div class="p-4 border-b flex items-center justify-between shrink-0" style="border-color:var(--border-color);">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                ${info.icon}
                            </div>
                            <h3 class="font-bold text-lg" style="color:var(--text-primary);">Configure ${info.name}</h3>
                        </div>
                        <button onclick="document.getElementById('integration-setup-modal').remove()" 
                                class="text-gray-400 hover:text-white text-xl">×</button>
                    </div>
                    
                    <div class="p-6 overflow-y-auto flex-1 space-y-6">
                        <!-- Steps -->
                        <div class="space-y-4">
                            <div class="flex gap-4">
                                <div class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                <div class="flex-1">
                                    <h5 class="font-medium" style="color:var(--text-primary);">Create OAuth App</h5>
                                    <p class="text-sm mt-1" style="color:var(--text-muted);">Create a new OAuth application in ${info.name} Console</p>
                                    <a href="${info.consoleUrl}" target="_blank" 
                                       class="inline-flex items-center gap-1 text-sm text-purple-400 hover:underline mt-2">
                                        Open ${info.name} Console →
                                    </a>
                                </div>
                            </div>
                            
                            <div class="flex gap-4">
                                <div class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                <div class="flex-1">
                                    <h5 class="font-medium" style="color:var(--text-primary);">Set Redirect URI</h5>
                                    <p class="text-sm mt-1" style="color:var(--text-muted);">Add this redirect URI to your OAuth app:</p>
                                    <div class="flex items-center gap-2 mt-2">
                                        <code class="flex-1 text-xs p-2 rounded" style="background:var(--bg-input);color:var(--text-secondary);">${redirectUri}</code>
                                        <button onclick="navigator.clipboard.writeText('${redirectUri}'); showToast('Copied!', 'success')" 
                                                class="btn-secondary px-3 py-2 rounded text-xs">Copy</button>
                                    </div>
                                </div>
                            </div>
                            
                            ${info.apiUrl ? `
                            <div class="flex gap-4">
                                <div class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                <div class="flex-1">
                                    <h5 class="font-medium" style="color:var(--text-primary);">Enable API</h5>
                                    <p class="text-sm mt-1" style="color:var(--text-muted);">Enable ${info.scopes}</p>
                                    <a href="${info.apiUrl}" target="_blank" 
                                       class="inline-flex items-center gap-1 text-sm text-purple-400 hover:underline mt-2">
                                        Enable API →
                                    </a>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="flex gap-4">
                                <div class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 text-sm font-bold">${info.apiUrl ? '4' : '3'}</div>
                                <div class="flex-1">
                                    <h5 class="font-medium" style="color:var(--text-primary);">Enter Credentials</h5>
                                    <p class="text-sm mt-1 mb-3" style="color:var(--text-muted);">Copy your Client ID and Secret from ${info.name}</p>
                                    
                                    <div class="space-y-3">
                                        <div>
                                            <label class="text-sm mb-1 block" style="color:var(--text-secondary);">Client ID</label>
                                            <input type="text" id="integration-client-id" 
                                                   class="input-field w-full rounded-lg px-4 py-2" 
                                                   placeholder="Enter Client ID">
                                        </div>
                                        <div>
                                            <label class="text-sm mb-1 block" style="color:var(--text-secondary);">Client Secret</label>
                                            <input type="password" id="integration-client-secret" 
                                                   class="input-field w-full rounded-lg px-4 py-2" 
                                                   placeholder="Enter Client Secret">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-4 border-t flex justify-between shrink-0" style="border-color:var(--border-color);">
                        <button onclick="document.getElementById('integration-setup-modal').remove()" 
                                class="btn-secondary px-6 py-2 rounded-lg">Cancel</button>
                        <button onclick="saveIntegration('${provider}')" 
                                class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2">
                            <span>Save & Test</span>
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        async function saveIntegration(provider) {
            const clientId = document.getElementById('integration-client-id')?.value;
            const clientSecret = document.getElementById('integration-client-secret')?.value;
            
            if (!clientId || !clientSecret) {
                showToast('Please fill in both Client ID and Client Secret', 'error');
                return;
            }
            
            try {
                const res = await fetch('/api/settings/integrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider, clientId, clientSecret })
                });
                
                if (res.ok) {
                    document.getElementById('integration-setup-modal')?.remove();
                    showToast(`${provider === 'google' ? 'Google' : 'Microsoft'} integration saved!`, 'success');
                    
                    // Update status
                    const statusEl = document.getElementById(`${provider}-integration-status`);
                    if (statusEl) {
                        statusEl.textContent = '✓ Configured';
                        statusEl.style.color = '#22c55e';
                    }
                } else {
                    showToast('Failed to save integration', 'error');
                }
            } catch (err) {
                showToast('Error saving integration', 'error');
            }
        }
        
        // Load theme on page load
        loadTheme();

        // ============================================================================
        // Settings Functions
        // ============================================================================
        
        let currentSettings = null;
        
        async function loadSettings() {
            try {
                const r = await fetch(API + '/api/settings');
                const data = await r.json();
                currentSettings = data.settings;
                populateSettingsForm(currentSettings);
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
        
        function populateSettingsForm(settings) {
            // Load configured LLM providers
            configuredLLMProviders = settings.llm_providers || [];
            
            // If no providers array but has legacy llm config, convert it
            if (configuredLLMProviders.length === 0 && settings.llm?.api_key) {
                const config = getProviderConfig(settings.llm.provider);
                configuredLLMProviders.push({
                    provider: settings.llm.provider,
                    name: config.name,
                    api_key: settings.llm.api_key,
                    api_base: settings.llm.api_base || '',
                    resource: settings.llm.resource || '',
                    models: config.models
                });
            }
            
            renderConfiguredProviders();
            updateDefaultProviderDropdown();
            
            // Set default provider and model
            if (settings.llm?.provider) {
                const defaultSelect = document.getElementById('default-llm-provider');
                if (defaultSelect) {
                    defaultSelect.value = settings.llm.provider;
                    onDefaultProviderChange();
                    if (settings.llm.model) {
                        document.getElementById('default-llm-model').value = settings.llm.model;
                    }
                }
            }
            
            // Initialize add provider form
            onLLMProviderChange();
            
            // Embedding
            document.getElementById('emb-provider').value = settings.embedding?.provider || 'openai';
            document.getElementById('emb-model').value = settings.embedding?.model || 'text-embedding-3-small';
            document.getElementById('emb-local-model').value = settings.embedding?.local_model || 'all-MiniLM-L6-v2';
            document.getElementById('emb-api-key').value = settings.embedding?.api_key || '';
            onEmbeddingProviderChange();
            
            // Vector DB
            document.getElementById('vdb-provider').value = settings.vector_db?.provider || 'memory';
            document.getElementById('vdb-chroma-path').value = settings.vector_db?.chroma_path || './data/chromadb';
            document.getElementById('vdb-pinecone-key').value = settings.vector_db?.pinecone_api_key || '';
            document.getElementById('vdb-pinecone-index').value = settings.vector_db?.pinecone_index || '';
            onVectorDBProviderChange();
            
            // RAG Settings
            document.getElementById('rag-chunk-size').value = settings.chunk_size || 1000;
            document.getElementById('rag-chunk-overlap').value = settings.chunk_overlap || 200;
            document.getElementById('rag-top-k').value = settings.search_top_k || 5;
            
            // Feature Toggles
            updateToggle('toggle-rag', settings.enable_rag);
            updateToggle('toggle-scraping', settings.enable_web_scraping);
            updateToggle('toggle-api', settings.enable_api_tools);
            
            updateVDBStatus();
        }
        
        function updateToggle(id, enabled) {
            const el = document.getElementById(id);
            if (enabled) {
                el.classList.add('on');
            } else {
                el.classList.remove('on');
            }
        }
        
        function toggleFeature(feature) {
            const toggleId = feature === 'rag' ? 'toggle-rag' : feature === 'scraping' ? 'toggle-scraping' : 'toggle-api';
            const el = document.getElementById(toggleId);
            el.classList.toggle('on');
        }
        
        function onLLMProviderChange() {
            const provider = document.getElementById('llm-provider').value;
            const apiKeyGroup = document.getElementById('llm-api-key-group');
            const apiBaseGroup = document.getElementById('llm-api-base-group');
            const resourceGroup = document.getElementById('llm-resource-group');
            const providerInfo = document.getElementById('llm-provider-info');
            const providerInfoText = document.getElementById('llm-provider-info-text');
            const providerLink = document.getElementById('llm-provider-link');
            const modelsPreview = document.getElementById('llm-models-preview');
            const modelsListPreview = document.getElementById('llm-models-list-preview');
            
            const config = getProviderConfig(provider);
            
            // Show/hide fields based on provider
            apiKeyGroup.classList.toggle('hidden', !config.needsApiKey);
            apiBaseGroup.classList.toggle('hidden', !config.needsApiBase);
            resourceGroup.classList.toggle('hidden', !config.needsResource);
            
            // Update placeholder
            if (config.needsApiKey) {
                document.getElementById('llm-api-key').placeholder = config.keyPlaceholder;
            }
            
            // Clear API key field when changing provider
            document.getElementById('llm-api-key').value = '';
            document.getElementById('llm-api-base').value = '';
            
            // Show provider info
            providerInfoText.textContent = config.info;
            if (config.link) {
                providerLink.href = config.link;
                providerLink.classList.remove('hidden');
            } else {
                providerLink.classList.add('hidden');
            }
            
            // Show supported models preview
            if (modelsPreview && modelsListPreview) {
                modelsPreview.classList.remove('hidden');
                modelsListPreview.innerHTML = config.models.map(m => 
                    `<span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">${m}</span>`
                ).join('');
            }
            
            // Set default API base for local providers
            const apiBaseInput = document.getElementById('llm-api-base');
            if (provider === 'ollama') {
                apiBaseInput.placeholder = 'http://localhost:11434';
                apiBaseInput.value = 'http://localhost:11434';
            } else if (provider === 'lmstudio') {
                apiBaseInput.placeholder = 'http://localhost:1234/v1';
                apiBaseInput.value = 'http://localhost:1234/v1';
            } else {
                apiBaseInput.placeholder = 'https://api.example.com/v1';
            }
        }
        
        // Update the provider dropdown to hide already configured providers
        function updateProviderDropdown() {
            const select = document.getElementById('llm-provider');
            if (!select) return;
            
            const configuredProviderIds = configuredLLMProviders.map(p => p.provider);
            
            // Get all options
            const options = select.querySelectorAll('option');
            let firstAvailable = null;
            let hasAvailable = false;
            
            options.forEach(option => {
                if (option.value && configuredProviderIds.includes(option.value)) {
                    // Hide configured providers
                    option.style.display = 'none';
                } else if (option.value) {
                    option.style.display = '';
                    hasAvailable = true;
                    if (!firstAvailable) {
                        firstAvailable = option.value;
                    }
                }
            });
            
            // If current selection is configured, switch to first available
            if (configuredProviderIds.includes(select.value) && firstAvailable) {
                select.value = firstAvailable;
                onLLMProviderChange();
            }
            
            // If all providers are configured, hide the add section
            const addSection = document.querySelector('.border-t.border-gray-700.pt-4');
            if (addSection) {
                if (!hasAvailable) {
                    addSection.innerHTML = `
                        <div class="text-center py-6">
                            <span class="text-3xl">🎉</span>
                            <p class="text-gray-400 mt-2 font-medium">All providers configured!</p>
                            <p class="text-xs text-gray-500 mt-1">You can remove a provider above to add a different configuration.</p>
                        </div>
                    `;
                }
            }
        }
        
        // Provider configurations (shared across functions)
        function getProviderConfig(provider) {
            const providerConfigs = {
                openai: {
                    name: 'OpenAI',
                    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'sk-...',
                    info: 'Industry-leading models with excellent reasoning capabilities',
                    link: 'https://platform.openai.com/api-keys'
                },
                anthropic: {
                    name: 'Anthropic',
                    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'sk-ant-...',
                    info: 'Excellent for writing, analysis, and nuanced conversations',
                    link: 'https://console.anthropic.com/settings/keys'
                },
                google: {
                    name: 'Google',
                    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'AIza...',
                    info: 'Multimodal models with long context support (up to 1M tokens)',
                    link: 'https://aistudio.google.com/app/apikey'
                },
                xai: {
                    name: 'xAI',
                    models: ['grok-2', 'grok-2-mini', 'grok-beta'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'xai-...',
                    info: 'Grok models by xAI with real-time knowledge',
                    link: 'https://console.x.ai/'
                },
                groq: {
                    name: 'Groq',
                    models: ['llama-3.3-70b-versatile', 'llama-3.3-70b-specdec', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'gsk_...',
                    info: 'Ultra-fast inference with open-source models',
                    link: 'https://console.groq.com/keys'
                },
                mistral: {
                    name: 'Mistral',
                    models: ['mistral-large-2411', 'mistral-small-2503', 'open-mistral-nemo', 'codestral-2501', 'ministral-8b-2410'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'Your Mistral API key',
                    info: 'Efficient European AI models with strong multilingual support',
                    link: 'https://console.mistral.ai/api-keys/'
                },
                deepseek: {
                    name: 'DeepSeek',
                    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'sk-...',
                    info: 'Cost-effective models with strong coding capabilities',
                    link: 'https://platform.deepseek.com/api_keys'
                },
                together: {
                    name: 'Together AI',
                    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Llama-3.1-405B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'Your Together API key',
                    info: 'Access to 100+ open-source models',
                    link: 'https://api.together.xyz/settings/api-keys'
                },
                perplexity: {
                    name: 'Perplexity',
                    models: ['sonar', 'sonar-pro', 'sonar-reasoning'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'pplx-...',
                    info: 'Models with real-time internet search capabilities',
                    link: 'https://www.perplexity.ai/settings/api'
                },
                cohere: {
                    name: 'Cohere',
                    models: ['command-a-03-2025', 'command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024'],
                    needsApiKey: true, needsApiBase: false, needsResource: false,
                    keyPlaceholder: 'Your Cohere API key',
                    info: 'Enterprise-focused models with RAG capabilities',
                    link: 'https://dashboard.cohere.com/api-keys'
                },
                azure_openai: {
                    name: 'Azure OpenAI',
                    models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo'],
                    needsApiKey: true, needsApiBase: true, needsResource: true,
                    keyPlaceholder: 'Your Azure API key',
                    info: 'Enterprise Azure-hosted OpenAI models',
                    link: 'https://portal.azure.com/'
                },
                aws_bedrock: {
                    name: 'AWS Bedrock',
                    models: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'anthropic.claude-3-sonnet-20240229-v1:0', 'amazon.titan-text-premier-v1:0'],
                    needsApiKey: true, needsApiBase: true, needsResource: true,
                    keyPlaceholder: 'AWS Access Key',
                    info: 'AWS-hosted models with enterprise security',
                    link: 'https://aws.amazon.com/bedrock/'
                },
                ollama: {
                    name: 'Ollama',
                    models: ['llama3.2', 'llama3.1', 'llama3.1:70b', 'mistral', 'mixtral', 'codellama', 'phi3', 'gemma2', 'qwen2.5'],
                    needsApiKey: false, needsApiBase: true, needsResource: false,
                    keyPlaceholder: '',
                    info: 'Run open-source models locally for free',
                    link: 'https://ollama.ai/'
                },
                lmstudio: {
                    name: 'LM Studio',
                    models: ['local-model'],
                    needsApiKey: false, needsApiBase: true, needsResource: false,
                    keyPlaceholder: '',
                    info: 'Run models locally with LM Studio GUI',
                    link: 'https://lmstudio.ai/'
                },
                custom: {
                    name: 'Custom',
                    models: ['custom-model'],
                    needsApiKey: true, needsApiBase: true, needsResource: false,
                    keyPlaceholder: 'Your API key',
                    info: 'Any OpenAI-compatible API endpoint',
                    link: ''
                }
            };
            return providerConfigs[provider] || providerConfigs.openai;
        }
        
        // Configured LLM Providers storage
        let configuredLLMProviders = [];
        
        function addLLMProvider() {
            const provider = document.getElementById('llm-provider').value;
            const apiKey = document.getElementById('llm-api-key').value;
            const apiBase = document.getElementById('llm-api-base').value;
            const resource = document.getElementById('llm-resource')?.value || '';
            
            const config = getProviderConfig(provider);
            
            // Validation
            if (config.needsApiKey && !apiKey) {
                alert('Please enter an API key');
                return;
            }
            if (config.needsApiBase && !apiBase) {
                alert('Please enter an API base URL');
                return;
            }
            
            // Add new provider
            configuredLLMProviders.push({
                provider,
                name: config.name,
                api_key: apiKey,
                api_base: apiBase,
                resource: resource,
                models: config.models
            });
            
            // Clear form
            document.getElementById('llm-api-key').value = '';
            document.getElementById('llm-api-base').value = '';
            if (document.getElementById('llm-resource')) {
                document.getElementById('llm-resource').value = '';
            }
            
            // Update UI
            renderConfiguredProviders();
            updateDefaultProviderDropdown();
            
            // Auto-select as default if it's the first one
            if (configuredLLMProviders.length === 1) {
                document.getElementById('default-llm-provider').value = provider;
                onDefaultProviderChange();
            }
            
            // Auto-save
            saveSettingsQuiet();
            
            // Show success message
            showToast(`✅ ${config.name} added successfully!`, 'success');
        }
        
        // Toast notification - uses global NotificationSystem (defined earlier)
        // showToast function is defined in the NotificationSystem section
        
        function removeLLMProvider(provider) {
            if (!confirm('Are you sure you want to remove this provider?')) {
                return;
            }
            
            configuredLLMProviders = configuredLLMProviders.filter(p => p.provider !== provider);
            renderConfiguredProviders();
            updateDefaultProviderDropdown();
            saveSettingsQuiet();
        }
        
        function renderConfiguredProviders() {
            const container = document.getElementById('configured-providers-table');
            const noProvidersMsg = document.getElementById('no-providers-msg');
            
            if (configuredLLMProviders.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-4 text-gray-500 text-sm" id="no-providers-msg">
                        <span class="text-2xl block mb-2">📭</span>
                        No providers configured yet. Add one below.
                    </div>
                `;
                updateProviderDropdown();
                return;
            }
            
            container.innerHTML = configuredLLMProviders.map((p, idx) => {
                const maskedKey = p.api_key ? '•••••••' + p.api_key.slice(-4) : 'No key';
                const isDefault = currentSettings?.llm?.provider === p.provider;
                
                return `
                    <div class="bg-gray-800/50 rounded-lg p-3 border ${isDefault ? 'border-purple-500' : 'border-gray-700'}" id="provider-card-${p.provider}">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">${getProviderIcon(p.provider)}</span>
                                <span class="font-medium">${p.name}</span>
                                ${isDefault ? '<span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Default</span>' : ''}
                            </div>
                            <div class="flex items-center gap-1">
                                <button onclick="event.stopPropagation(); testConfiguredProvider('${p.provider}')" 
                                        class="text-xs text-gray-400 hover:text-green-400 px-2 py-1.5 rounded hover:bg-gray-700 transition-colors" 
                                        title="Test Connection">
                                    🧪
                                </button>
                                <button onclick="event.stopPropagation(); editLLMProvider('${p.provider}')" 
                                        class="text-xs text-gray-400 hover:text-blue-400 px-2 py-1.5 rounded hover:bg-gray-700 transition-colors" 
                                        title="Edit API Key">
                                    ✏️
                                </button>
                                <button onclick="event.stopPropagation(); removeLLMProvider('${p.provider}')" 
                                        class="text-xs text-gray-400 hover:text-red-400 px-2 py-1.5 rounded hover:bg-gray-700 transition-colors" 
                                        title="Remove Provider">
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <div class="text-xs text-gray-500 mb-2">
                            API Key: <span class="text-gray-400">${maskedKey}</span>
                            ${p.api_base ? ` • Base: <span class="text-gray-400">${p.api_base}</span>` : ''}
                        </div>
                        <div class="flex flex-wrap gap-1">
                            ${p.models.slice(0, 5).map(m => 
                                `<span class="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">${m}</span>`
                            ).join('')}
                            ${p.models.length > 5 ? `<span class="text-[10px] text-gray-500">+${p.models.length - 5} more</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            
            // Update dropdown to hide configured providers
            updateProviderDropdown();
        }
        
        // Edit an existing LLM provider
        function editLLMProvider(providerName) {
            const providerData = configuredLLMProviders.find(p => p.provider === providerName);
            if (!providerData) return;
            
            // Create edit modal
            const modal = document.createElement('div');
            modal.id = 'edit-provider-modal';
            modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 border border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold flex items-center gap-2">
                            <span>${getProviderIcon(providerName)}</span>
                            Edit ${providerData.name}
                        </h3>
                        <button onclick="closeEditModal()" class="text-gray-400 hover:text-white text-xl">&times;</button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">API Key</label>
                            <input type="password" id="edit-api-key" class="input-field w-full rounded-lg px-4 py-2" 
                                   value="${providerData.api_key}" placeholder="Enter new API key...">
                        </div>
                        ${providerData.api_base ? `
                        <div>
                            <label class="text-sm text-gray-400 mb-1 block">API Base URL</label>
                            <input type="text" id="edit-api-base" class="input-field w-full rounded-lg px-4 py-2" 
                                   value="${providerData.api_base}" placeholder="API Base URL">
                        </div>
                        ` : ''}
                        
                        <div id="edit-test-result" class="hidden p-3 rounded-lg text-sm"></div>
                        
                        <div class="flex gap-2 pt-2">
                            <button onclick="testEditedProvider('${providerName}')" class="btn-secondary px-4 py-2 rounded-lg text-sm flex-1">
                                🧪 Test
                            </button>
                            <button onclick="saveEditedProvider('${providerName}')" class="btn-primary px-4 py-2 rounded-lg text-sm flex-1">
                                💾 Save
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Focus on input
            document.getElementById('edit-api-key').focus();
        }
        
        function closeEditModal() {
            const modal = document.getElementById('edit-provider-modal');
            if (modal) modal.remove();
        }
        
        async function testEditedProvider(providerName) {
            const apiKey = document.getElementById('edit-api-key').value;
            const apiBase = document.getElementById('edit-api-base')?.value || '';
            const config = getProviderConfig(providerName);
            
            const resultEl = document.getElementById('edit-test-result');
            resultEl.classList.remove('hidden', 'bg-green-900/50', 'bg-red-900/50');
            resultEl.classList.add('bg-gray-700');
            resultEl.innerHTML = '<span class="animate-pulse">🧪 Testing...</span>';
            
            try {
                const r = await fetch(API + '/api/settings/test-llm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        provider: providerName,
                        model: config.models[0],
                        api_key: apiKey,
                        api_base: apiBase
                    })
                });
                
                const data = await r.json();
                resultEl.classList.remove('bg-gray-700');
                
                if (data.status === 'success') {
                    resultEl.classList.add('bg-green-900/50');
                    resultEl.innerHTML = '✅ Connection successful!';
                } else {
                    resultEl.classList.add('bg-red-900/50');
                    resultEl.innerHTML = '❌ ' + data.message;
                }
            } catch (e) {
                resultEl.classList.remove('bg-gray-700');
                resultEl.classList.add('bg-red-900/50');
                resultEl.innerHTML = '❌ ' + e.message;
            }
        }
        
        function saveEditedProvider(providerName) {
            const apiKey = document.getElementById('edit-api-key').value;
            const apiBase = document.getElementById('edit-api-base')?.value || '';
            
            if (!apiKey) {
                alert('Please enter an API key');
                return;
            }
            
            // Update provider
            const idx = configuredLLMProviders.findIndex(p => p.provider === providerName);
            if (idx >= 0) {
                configuredLLMProviders[idx].api_key = apiKey;
                if (apiBase) configuredLLMProviders[idx].api_base = apiBase;
            }
            
            // Close modal
            closeEditModal();
            
            // Update UI and save
            renderConfiguredProviders();
            saveSettingsQuiet();
            
            alert('✅ Provider updated successfully!');
        }
        
        function getProviderIcon(provider) {
            const icons = {
                openai: '🟢', anthropic: '🟠', google: '🔵', xai: '⚫', groq: '🟡',
                mistral: '🔷', deepseek: '🔶', together: '🟣', perplexity: '🔴',
                cohere: '🟤', azure_openai: '☁️', aws_bedrock: '🌩️', ollama: '🦙',
                lmstudio: '🖥️', custom: '⚙️'
            };
            return icons[provider] || '🤖';
        }
        
        function updateDefaultProviderDropdown() {
            const select = document.getElementById('default-llm-provider');
            if (!select) return;
            
            const currentDefault = currentSettings?.llm?.provider || '';
            
            select.innerHTML = '<option value="">-- Select Provider --</option>' +
                configuredLLMProviders.map(p => 
                    `<option value="${p.provider}" ${p.provider === currentDefault ? 'selected' : ''}>${p.name}</option>`
                ).join('');
            
            // Update model dropdown
            onDefaultProviderChange();
        }
        
        function onDefaultProviderChange() {
            const provider = document.getElementById('default-llm-provider').value;
            const modelSelect = document.getElementById('default-llm-model');
            
            if (!provider) {
                modelSelect.innerHTML = '<option value="">-- Select Model --</option>';
                return;
            }
            
            const providerData = configuredLLMProviders.find(p => p.provider === provider);
            if (!providerData) return;
            
            const currentModel = currentSettings?.llm?.model || '';
            modelSelect.innerHTML = providerData.models.map(m => 
                `<option value="${m}" ${m === currentModel ? 'selected' : ''}>${m}</option>`
            ).join('');
        }
        
        async function testNewLLMProvider() {
            const provider = document.getElementById('llm-provider').value;
            const apiKey = document.getElementById('llm-api-key').value;
            const apiBase = document.getElementById('llm-api-base').value;
            
            const resultEl = document.getElementById('llm-test-result');
            resultEl.classList.remove('hidden', 'bg-green-900/50', 'bg-red-900/50');
            resultEl.classList.add('bg-gray-800');
            resultEl.innerHTML = '<span class="animate-pulse">🧪 Testing connection...</span>';
            
            try {
                const config = getProviderConfig(provider);
                const r = await fetch(API + '/api/settings/test-llm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        provider,
                        model: config.models[0],
                        api_key: apiKey,
                        api_base: apiBase
                    })
                });
                
                const data = await r.json();
                resultEl.classList.remove('bg-gray-800');
                
                if (data.status === 'success') {
                    resultEl.classList.add('bg-green-900/50');
                    resultEl.innerHTML = '✅ <strong>Success!</strong> Connection verified.';
                } else {
                    resultEl.classList.add('bg-red-900/50');
                    resultEl.innerHTML = '❌ <strong>Failed:</strong> ' + data.message;
                }
            } catch (e) {
                resultEl.classList.remove('bg-gray-800');
                resultEl.classList.add('bg-red-900/50');
                resultEl.innerHTML = '❌ <strong>Error:</strong> ' + e.message;
            }
        }
        
        async function testConfiguredProvider(providerName) {
            const providerData = configuredLLMProviders.find(p => p.provider === providerName);
            if (!providerData) {
                alert('Provider not found');
                return;
            }
            
            // Show loading state
            const card = document.getElementById(`provider-card-${providerName}`);
            const originalBorder = card?.className;
            if (card) {
                card.classList.add('animate-pulse');
            }
            
            try {
                const r = await fetch(API + '/api/settings/test-llm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        provider: providerData.provider,
                        model: providerData.models[0],
                        api_key: providerData.api_key,
                        api_base: providerData.api_base || ''
                    })
                });
                
                const data = await r.json();
                
                if (card) {
                    card.classList.remove('animate-pulse');
                }
                
                if (data.status === 'success') {
                    alert(`✅ ${providerData.name} is working!\n\nResponse: "${data.response?.substring(0, 100)}..."`);
                } else {
                    alert(`❌ ${providerData.name} test failed:\n\n${data.message}`);
                }
            } catch (e) {
                if (card) {
                    card.classList.remove('animate-pulse');
                }
                alert(`❌ Error testing ${providerData.name}:\n\n${e.message}`);
            }
        }
        
        async function saveSettingsQuiet() {
            // Save without showing alert
            try {
                const defaultProvider = document.getElementById('default-llm-provider')?.value || '';
                const defaultModel = document.getElementById('default-llm-model')?.value || '';
                
                const settings = {
                    llm: {
                        provider: defaultProvider,
                        model: defaultModel,
                        api_key: configuredLLMProviders.find(p => p.provider === defaultProvider)?.api_key || '',
                        api_base: configuredLLMProviders.find(p => p.provider === defaultProvider)?.api_base || '',
                    },
                    llm_providers: configuredLLMProviders,
                    embedding: {
                        provider: document.getElementById('emb-provider')?.value || 'openai',
                        model: document.getElementById('emb-model')?.value || 'text-embedding-3-small',
                        local_model: document.getElementById('emb-local-model')?.value || 'all-MiniLM-L6-v2',
                        api_key: document.getElementById('emb-api-key')?.value || '',
                    },
                    vector_db: {
                        provider: document.getElementById('vdb-provider')?.value || 'memory',
                        chroma_path: document.getElementById('vdb-chroma-path')?.value || './data/chromadb',
                        pinecone_api_key: document.getElementById('vdb-pinecone-key')?.value || '',
                        pinecone_index: document.getElementById('vdb-pinecone-index')?.value || '',
                    },
                    chunk_size: parseInt(document.getElementById('rag-chunk-size')?.value) || 1000,
                    chunk_overlap: parseInt(document.getElementById('rag-chunk-overlap')?.value) || 200,
                    search_top_k: parseInt(document.getElementById('rag-top-k')?.value) || 5,
                    enable_rag: document.getElementById('toggle-rag')?.classList.contains('on') ?? true,
                    enable_web_scraping: document.getElementById('toggle-scraping')?.classList.contains('on') ?? true,
                    enable_api_tools: document.getElementById('toggle-api')?.classList.contains('on') ?? true,
                };
                
                console.log('Saving settings with', configuredLLMProviders.length, 'providers');
                
                const response = await fetch(API + '/api/settings', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(settings)
                });
                
                const data = await response.json();
                if (data.status === 'success') {
                    console.log('✅ Settings saved successfully');
                    currentSettings = settings;
                } else {
                    console.error('❌ Failed to save settings:', data.message);
                }
            } catch (e) {
                console.error('❌ Failed to save settings:', e);
            }
        }
        
        function onEmbeddingProviderChange() {
            const provider = document.getElementById('emb-provider').value;
            
            document.getElementById('emb-model-group').classList.toggle('hidden', provider === 'sentence_transformers');
            document.getElementById('emb-local-model-group').classList.toggle('hidden', provider !== 'sentence_transformers');
            document.getElementById('emb-api-key-group').classList.toggle('hidden', provider === 'sentence_transformers' || provider === 'ollama');
        }
        
        function onVectorDBProviderChange() {
            const provider = document.getElementById('vdb-provider').value;
            
            document.getElementById('vdb-chroma-path-group').classList.toggle('hidden', provider !== 'chromadb');
            document.getElementById('vdb-pinecone-group').classList.toggle('hidden', provider !== 'pinecone');
            
            updateVDBStatus();
        }
        
        function updateVDBStatus() {
            const provider = document.getElementById('vdb-provider').value;
            const iconEl = document.getElementById('vdb-status-icon');
            const textEl = document.getElementById('vdb-status-text');
            
            if (provider === 'memory') {
                iconEl.textContent = '🟡';
                textEl.textContent = 'Using keyword search (no embeddings)';
            } else if (provider === 'chromadb') {
                iconEl.textContent = '🟢';
                textEl.textContent = 'ChromaDB ready - local vector search enabled';
            } else if (provider === 'pinecone') {
                const hasKey = document.getElementById('vdb-pinecone-key').value && !document.getElementById('vdb-pinecone-key').value.startsWith('***');
                iconEl.textContent = hasKey ? '🟢' : '🔴';
                textEl.textContent = hasKey ? 'Pinecone configured' : 'API key required';
            }
        }
        
        async function saveSettings() {
            try {
                const defaultProvider = document.getElementById('default-llm-provider')?.value || '';
                const defaultModel = document.getElementById('default-llm-model')?.value || '';
                const defaultProviderData = configuredLLMProviders.find(p => p.provider === defaultProvider);
                
                const settings = {
                    llm: {
                        provider: defaultProvider,
                        model: defaultModel,
                        api_key: defaultProviderData?.api_key || '',
                        api_base: defaultProviderData?.api_base || '',
                        resource: defaultProviderData?.resource || '',
                    },
                    llm_providers: configuredLLMProviders,
                    embedding: {
                        provider: document.getElementById('emb-provider').value,
                        model: document.getElementById('emb-model').value,
                        local_model: document.getElementById('emb-local-model').value,
                        api_key: document.getElementById('emb-api-key').value,
                    },
                    vector_db: {
                        provider: document.getElementById('vdb-provider').value,
                        chroma_path: document.getElementById('vdb-chroma-path').value,
                        pinecone_api_key: document.getElementById('vdb-pinecone-key').value,
                        pinecone_index: document.getElementById('vdb-pinecone-index').value,
                    },
                    chunk_size: parseInt(document.getElementById('rag-chunk-size').value),
                    chunk_overlap: parseInt(document.getElementById('rag-chunk-overlap').value),
                    search_top_k: parseInt(document.getElementById('rag-top-k').value),
                    enable_rag: document.getElementById('toggle-rag').classList.contains('on'),
                    enable_web_scraping: document.getElementById('toggle-scraping').classList.contains('on'),
                    enable_api_tools: document.getElementById('toggle-api').classList.contains('on'),
                };
                
                const r = await fetch(API + '/api/settings', {
                    method: 'PUT',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(settings)
                });
                
                const data = await r.json();
                if (data.status === 'success') {
                    currentSettings = settings;
                    alert('✅ Settings saved successfully!');
                } else {
                    alert('❌ Failed to save: ' + (data.message || 'Unknown error'));
                }
            } catch (e) {
                alert('❌ Error: ' + e.message);
            }
        }
        
        async function testLLM() {
            const resultEl = document.getElementById('llm-test-result');
            resultEl.classList.remove('hidden', 'bg-green-900/50', 'bg-red-900/50');
            resultEl.classList.add('bg-gray-800');
            resultEl.innerHTML = '<span class="animate-pulse">🧪 Testing LLM connection...</span>';
            
            try {
                const settings = {
                    provider: document.getElementById('llm-provider').value,
                    model: document.getElementById('llm-model').value,
                    api_key: document.getElementById('llm-api-key').value,
                    api_base: document.getElementById('llm-api-base').value,
                    ollama_host: document.getElementById('llm-ollama-host').value,
                };
                
                const r = await fetch(API + '/api/settings/test-llm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(settings)
                });
                
                const data = await r.json();
                resultEl.classList.remove('bg-gray-800');
                
                if (data.status === 'success') {
                    resultEl.classList.add('bg-green-900/50');
                    resultEl.innerHTML = '✅ <strong>Success!</strong> Response: ' + data.response.substring(0, 100);
                } else {
                    resultEl.classList.add('bg-red-900/50');
                    resultEl.innerHTML = '❌ <strong>Failed:</strong> ' + data.message;
                }
            } catch (e) {
                resultEl.classList.remove('bg-gray-800');
                resultEl.classList.add('bg-red-900/50');
                resultEl.innerHTML = '❌ <strong>Error:</strong> ' + e.message;
            }
        }
        
        async function testEmbedding() {
            const resultEl = document.getElementById('emb-test-result');
            resultEl.classList.remove('hidden', 'bg-green-900/50', 'bg-red-900/50');
            resultEl.classList.add('bg-gray-800');
            resultEl.innerHTML = '<span class="animate-pulse">🧪 Testing embedding provider...</span>';
            
            try {
                const settings = {
                    provider: document.getElementById('emb-provider').value,
                    model: document.getElementById('emb-model').value,
                    local_model: document.getElementById('emb-local-model').value,
                    api_key: document.getElementById('emb-api-key').value,
                };
                
                const r = await fetch(API + '/api/settings/test-embedding', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(settings)
                });
                
                const data = await r.json();
                resultEl.classList.remove('bg-gray-800');
                
                if (data.status === 'success') {
                    resultEl.classList.add('bg-green-900/50');
                    resultEl.innerHTML = `✅ <strong>Success!</strong> Dimensions: ${data.dimensions}`;
                } else {
                    resultEl.classList.add('bg-red-900/50');
                    resultEl.innerHTML = '❌ <strong>Failed:</strong> ' + data.message;
                }
            } catch (e) {
                resultEl.classList.remove('bg-gray-800');
                resultEl.classList.add('bg-red-900/50');
                resultEl.innerHTML = '❌ <strong>Error:</strong> ' + e.message;
            }
        }
        
        async function reindexKnowledgeBase() {
            if (!confirm('This will reindex all documents with the current embedding settings. Continue?')) return;
            
            try {
                const r = await fetch(API + '/api/settings/reindex', { method: 'POST' });
                const data = await r.json();
                
                if (data.status === 'success') {
                    alert('✅ ' + data.message);
                } else {
                    alert('❌ ' + (data.message || 'Reindex failed'));
                }
            } catch (e) {
                alert('❌ Error: ' + e.message);
            }
        }

        // Initial data loading moved to showApp() function
        function initAppData() {
            loadAgents();
            loadTools();
            loadSettings();
            loadPendingApprovalsCount(); // Load approval badge count
            
            // Navigate to hash page or default to agents
            const hash = window.location.hash.slice(1);
            if (hash && document.getElementById('page-' + hash)) {
                navigate(hash, false);
            } else {
                navigate('agents', true);
            }
        }
        
        // Load pending approvals count for badge
        async function loadPendingApprovalsCount() {
            try {
                const response = await fetch(API + '/process/approvals?status=pending&limit=1', {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const count = data.total ?? (data.items ? data.items.length : 0);
                    const badge = document.getElementById('approval-badge');
                    if (badge) {
                        if (count > 0) {
                            badge.textContent = count > 99 ? '99+' : count;
                            badge.classList.remove('hidden');
                        } else {
                            badge.classList.add('hidden');
                        }
                    }
                }
            } catch(e) {
                console.log('Could not load approval count:', e);
            }
        }
// ============================================================================
// TOOL WIZARD - JavaScript
// ============================================================================

// Wizard State
let wizState = {
    type: null,
    step: 0,
    maxSteps: 4,
    data: {
        name: '',
        description: '',
        config: {},
        files: [],
        urls: []
    }
};

// Tool Access Control State
let selectedToolAccessType = 'owner_only';
let toolAccessData = { users: [], groups: [] };
let toolAccessSelected = { users: [], groups: [] };
let toolPermissionChips = { edit: [], delete: [], execute: [] };

// Select Tool Access Type
function selectToolAccessType(accessType) {
    selectedToolAccessType = accessType;
    
    // Update UI for both old (wiz-step-2) and new (wiz-step-5) access cards
    document.querySelectorAll('.tool-access-card, .access-step-card').forEach(card => {
        const cardType = card.dataset.access;
        const checkmark = card.querySelector('.tool-access-check, .access-step-check');
        
        if (cardType === accessType) {
            card.classList.remove('border-gray-600');
            if (accessType === 'owner_only') card.classList.add('border-purple-500', 'bg-purple-500/10');
            else if (accessType === 'authenticated') card.classList.add('border-blue-500', 'bg-blue-500/10');
            else if (accessType === 'specific_users') card.classList.add('border-yellow-500', 'bg-yellow-500/10');
            else if (accessType === 'public') card.classList.add('border-green-500', 'bg-green-500/10');
            if (checkmark) checkmark.classList.remove('hidden');
        } else {
            card.classList.remove('border-purple-500', 'border-blue-500', 'border-yellow-500', 'border-green-500');
            card.classList.remove('bg-purple-500/10', 'bg-blue-500/10', 'bg-yellow-500/10', 'bg-green-500/10');
            card.classList.add('border-gray-600');
            if (checkmark) checkmark.classList.add('hidden');
        }
    });
    
    // Show/hide specific users config (both old and new)
    const specificConfig = document.getElementById('tool-specific-access-config');
    const accessStepConfig = document.getElementById('access-step-specific-config');
    
    if (specificConfig) {
        if (accessType === 'specific_users') {
            specificConfig.classList.remove('hidden');
            loadToolAccessUsersAndGroups();
        } else {
            specificConfig.classList.add('hidden');
        }
    }
    
    if (accessStepConfig) {
        if (accessType === 'specific_users') {
            accessStepConfig.classList.remove('hidden');
            loadToolAccessUsersAndGroups();
        } else {
            accessStepConfig.classList.add('hidden');
        }
    }
}

// Load users and groups for access control
async function loadToolAccessUsersAndGroups() {
    try {
        // Load users from security API
        const usersRes = await fetch(API + '/api/security/users', { headers: getAuthHeaders() });
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            toolAccessData.users = usersData.users || usersData || [];
        }
        
        // Load groups from security API
        const groupsRes = await fetch(API + '/api/security/groups', { headers: getAuthHeaders() });
        if (groupsRes.ok) {
            const groupsData = await groupsRes.json();
            // Add members_count from member_ids or user_ids array length
            toolAccessData.groups = (groupsData.groups || groupsData || []).map(g => ({
                ...g,
                members_count: (g.member_ids || g.user_ids || []).length
            }));
        }
        
        // Populate permission dropdowns
        updateToolPermissionDropdowns();
        
        // Show initial results
        filterToolAccessSearch('');
        
    } catch (e) {
        console.error('Failed to load users/groups for access control:', e);
    }
}

// Filter and show search results
function filterToolAccessSearch(query) {
    const resultsDiv = document.getElementById('tool-access-search-results');
    if (!resultsDiv) return;
    
    const q = query.toLowerCase();
    let html = '';
    
    // Filter users
    const filteredUsers = toolAccessData.users.filter(u => {
        const name = (u.full_name || u.email || u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
    }).slice(0, 5);
    
    // Filter groups
    const filteredGroups = toolAccessData.groups.filter(g => {
        return (g.name || '').toLowerCase().includes(q);
    }).slice(0, 3);
    
    if (filteredUsers.length > 0) {
        html += `<div class="px-3 py-2 text-xs font-medium" style="background: #e5e7eb; color: #374151;">👤 Users</div>`;
        filteredUsers.forEach(u => {
            const isSelected = toolAccessSelected.users.some(s => s.id === u.id);
            const name = u.full_name || u.email || u.username;
            html += `
                <div class="px-4 py-3 cursor-pointer flex items-center justify-between transition" 
                     style="background: ${isSelected ? '#ede9fe' : '#ffffff'};"
                     onmouseover="this.style.background='${isSelected ? '#ddd6fe' : '#f3f4f6'}'"
                     onmouseout="this.style.background='${isSelected ? '#ede9fe' : '#ffffff'}'"
                     onclick="toggleToolAccessEntity('user', '${u.id}', '${name.replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                            ${name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="text-sm font-medium" style="color: #1f2937;">${name}</div>
                            <div class="text-xs" style="color: #6b7280;">${u.email || ''}</div>
                        </div>
                    </div>
                    ${isSelected ? '<span style="color: #059669;" class="text-sm font-bold">✓</span>' : '<span style="color: #9ca3af;" class="text-sm">+</span>'}
                </div>
            `;
        });
    }
    
    if (filteredGroups.length > 0) {
        html += `<div class="px-3 py-2 text-xs font-medium ${filteredUsers.length > 0 ? 'border-t' : ''}" style="background: #e5e7eb; color: #374151; border-color: #d1d5db;">👥 Groups</div>`;
        filteredGroups.forEach(g => {
            const isSelected = toolAccessSelected.groups.some(s => s.id === g.id);
            html += `
                <div class="px-4 py-3 cursor-pointer flex items-center justify-between transition"
                     style="background: ${isSelected ? '#dbeafe' : '#ffffff'};"
                     onmouseover="this.style.background='${isSelected ? '#bfdbfe' : '#f3f4f6'}'"
                     onmouseout="this.style.background='${isSelected ? '#dbeafe' : '#ffffff'}'"
                     onclick="toggleToolAccessEntity('group', '${g.id}', '${(g.name || '').replace(/'/g, "\\'")}', '')">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm">
                            👥
                        </div>
                        <div>
                            <div class="text-sm font-medium" style="color: #1f2937;">${g.name}</div>
                            <div class="text-xs" style="color: #6b7280;">${g.members_count || 0} members</div>
                        </div>
                    </div>
                    ${isSelected ? '<span style="color: #059669;" class="text-sm font-bold">✓</span>' : '<span style="color: #9ca3af;" class="text-sm">+</span>'}
                </div>
            `;
        });
    }
    
    if (html === '') {
        html = `<div class="px-4 py-6 text-center text-sm" style="color: #6b7280;">No results found</div>`;
    }
    
    resultsDiv.innerHTML = html;
}

// Show search results
function showToolAccessResults() {
    const resultsDiv = document.getElementById('tool-access-search-results');
    if (resultsDiv) {
        resultsDiv.classList.remove('hidden');
        filterToolAccessSearch(document.getElementById('tool-access-search')?.value || '');
    }
}

// Toggle entity selection
function toggleToolAccessEntity(type, id, name, email) {
    const list = type === 'user' ? toolAccessSelected.users : toolAccessSelected.groups;
    const existingIndex = list.findIndex(e => e.id === id);
    
    if (existingIndex >= 0) {
        // Remove
        list.splice(existingIndex, 1);
    } else {
        // Add
        list.push({ id, name, email, type });
    }
    
    // Update UI
    updateToolAccessChips();
    updateToolAccessHiddenSelects();
    updateToolPermissionDropdowns();
    filterToolAccessSearch(document.getElementById('tool-access-search')?.value || '');
}

// Update the chips display
function updateToolAccessChips() {
    const container = document.getElementById('tool-access-selected-chips');
    const countBadge = document.getElementById('tool-access-count');
    const noSelectionMsg = document.getElementById('tool-no-selection-msg');
    if (!container) return;
    
    const allSelected = [...toolAccessSelected.users, ...toolAccessSelected.groups];
    
    if (allSelected.length === 0) {
        container.innerHTML = `<div id="tool-no-selection-msg" class="text-sm italic" style="color: #6b7280;">Click on users or groups from search to add them</div>`;
    } else {
        container.innerHTML = allSelected.map(e => `
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105"
                 style="background: ${e.type === 'user' ? '#ede9fe' : '#dbeafe'}; border: 1px solid ${e.type === 'user' ? '#c4b5fd' : '#93c5fd'};">
                <span class="text-xs">${e.type === 'user' ? '👤' : '👥'}</span>
                <span style="color: ${e.type === 'user' ? '#5b21b6' : '#1e40af'}; font-weight: 500;">${e.name}</span>
                <button onclick="toggleToolAccessEntity('${e.type}', '${e.id}', '', '')" 
                        class="w-5 h-5 rounded-full flex items-center justify-center transition"
                        style="background: ${e.type === 'user' ? '#c4b5fd' : '#93c5fd'}; color: ${e.type === 'user' ? '#5b21b6' : '#1e40af'};">
                    ×
                </button>
            </div>
        `).join('');
    }
    
    if (countBadge) {
        countBadge.textContent = allSelected.length;
    }
}

// Update hidden selects for form compatibility
function updateToolAccessHiddenSelects() {
    const usersSelect = document.getElementById('tool-allowed-users');
    const groupsSelect = document.getElementById('tool-allowed-groups');
    
    if (usersSelect) {
        usersSelect.innerHTML = toolAccessSelected.users.map(u => 
            `<option value="${u.id}" selected>${u.name}</option>`
        ).join('');
    }
    
    if (groupsSelect) {
        groupsSelect.innerHTML = toolAccessSelected.groups.map(g => 
            `<option value="${g.id}" selected>${g.name}</option>`
        ).join('');
    }
}

// Update permission dropdowns with selected users AND groups
function updateToolPermissionDropdowns() {
    const selectedUsers = toolAccessSelected.users;
    const selectedGroups = toolAccessSelected.groups;
    const allSelected = [...selectedUsers, ...selectedGroups];
    const selects = ['tool-can-edit-users', 'tool-can-delete-users', 'tool-can-execute-users'];
    
    // Show/hide empty message and grid based on whether anything is selected
    const emptyMsg = document.getElementById('granular-permissions-empty');
    const grid = document.getElementById('granular-permissions-grid');
    
    if (allSelected.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        if (grid) grid.classList.add('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        if (grid) grid.classList.remove('hidden');
    }
    
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValues = Array.from(select.selectedOptions).map(o => o.value);
            let options = `<option value="">+ Add user/group</option>`;
            
            // Add users
            if (selectedUsers.length > 0) {
                options += `<optgroup label="👤 Users">`;
                options += selectedUsers.map(u => 
                    `<option value="user:${u.id}" ${currentValues.includes('user:'+u.id) ? 'selected' : ''}>${u.name}</option>`
                ).join('');
                options += `</optgroup>`;
            }
            
            // Add groups
            if (selectedGroups.length > 0) {
                options += `<optgroup label="👥 Groups">`;
                options += selectedGroups.map(g => 
                    `<option value="group:${g.id}" ${currentValues.includes('group:'+g.id) ? 'selected' : ''}>${g.name}</option>`
                ).join('');
                options += `</optgroup>`;
            }
            
            select.innerHTML = options;
        }
    });
}

// Add permission chip (handles both users and groups)
function addToolPermissionChip(permType, selectEl) {
    const value = selectEl.value;
    if (!value) return;
    
    // Parse value format: "user:id" or "group:id"
    const [type, id] = value.split(':');
    
    let entity;
    if (type === 'user') {
        entity = toolAccessSelected.users.find(u => u.id === id);
    } else if (type === 'group') {
        entity = toolAccessSelected.groups.find(g => g.id === id);
    }
    
    if (!entity) return;
    
    // Add entity type for chip display
    const chipData = { ...entity, entityType: type };
    
    // Add to chips if not already there
    if (!toolPermissionChips[permType].some(e => e.id === id && e.entityType === type)) {
        toolPermissionChips[permType].push(chipData);
    }
    
    // Update chip display
    updatePermissionChipsDisplay(permType);
    
    // Reset select
    selectEl.value = '';
}

// Update permission chips display
function updatePermissionChipsDisplay(permType) {
    const chipsContainer = document.getElementById(`tool-can-${permType}-chips`);
    if (chipsContainer) {
        chipsContainer.innerHTML = toolPermissionChips[permType].map(e => `
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" 
                  style="background: ${e.entityType === 'group' ? '#dbeafe' : '#ede9fe'}; color: ${e.entityType === 'group' ? '#1e40af' : '#5b21b6'}; border: 1px solid ${e.entityType === 'group' ? '#93c5fd' : '#c4b5fd'};">
                ${e.entityType === 'group' ? '👥' : '👤'} ${e.name}
                <button onclick="removeToolPermissionChip('${permType}', '${e.id}', '${e.entityType}')" class="hover:text-red-600 ml-1 font-bold">×</button>
            </span>
        `).join('');
    }
}

// Remove permission chip
function removeToolPermissionChip(permType, entityId, entityType) {
    toolPermissionChips[permType] = toolPermissionChips[permType].filter(e => 
        !(e.id === entityId && e.entityType === entityType)
    );
    
    // Update display
    updatePermissionChipsDisplay(permType);
}

// Close search results when clicking outside
document.addEventListener('click', function(e) {
    const searchInput = document.getElementById('tool-access-search');
    const resultsDiv = document.getElementById('tool-access-search-results');
    if (searchInput && resultsDiv && !searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
        resultsDiv.classList.add('hidden');
    }
});

// Tool metadata
const toolMeta = {
    // Knowledge & Data
    knowledge: { icon: '🧠', name: 'Knowledge Base', hasConfig: true, hasSources: true, steps: ['Basics', 'RAG Config', 'Sources', 'Access', 'Review'] },
    document: { icon: '📄', name: 'Documents', hasConfig: false, hasSources: true, steps: ['Basics', 'Upload', 'Access', 'Review'] },
    website: { icon: '🌐', name: 'Website', hasConfig: true, hasSources: false, steps: ['Basics', 'Configuration', 'Access', 'Review'] },
    database: { icon: '🗄️', name: 'Database', hasConfig: true, hasSources: false, steps: ['Basics', 'Connection', 'Access', 'Review'] },
    spreadsheet: { icon: '📊', name: 'Spreadsheet', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    storage: { icon: '☁️', name: 'Cloud Storage', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    // Integrations
    api: { icon: '🔗', name: 'REST API', hasConfig: true, hasSources: false, steps: ['Basics', 'Configuration', 'Access', 'Review'] },
    email: { icon: '📧', name: 'Email', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    slack: { icon: '💬', name: 'Messaging', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    calendar: { icon: '📅', name: 'Calendar', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    crm: { icon: '🎯', name: 'CRM', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    webhook: { icon: '🪝', name: 'Webhook', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    erp: { icon: '🏢', name: 'ERP', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    // AI Services
    websearch: { icon: '🔍', name: 'Web Search', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    imagegen: { icon: '🎨', name: 'Image Gen', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    stt: { icon: '🎤', name: 'Speech to Text', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    tts: { icon: '🔊', name: 'Text to Speech', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    translate: { icon: '🌍', name: 'Translation', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    ocr: { icon: '📷', name: 'OCR / Vision', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    code: { icon: '💻', name: 'Code Exec', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] },
    calculator: { icon: '🧮', name: 'Calculator', hasConfig: false, hasSources: false, steps: ['Basics', 'Access', 'Review'] },
    hitl: { icon: '👤', name: 'Human in Loop', hasConfig: true, hasSources: false, steps: ['Basics', 'Config', 'Access', 'Review'] }
};

// Show tool modal - defined earlier in the file (search for "function showToolModal")
// This duplicate was removed to avoid confusion

// Close wizard
function closeWizard() {
    document.getElementById('modal-tool').classList.add('hidden');
    resetWizard();
}

// Reset wizard state
function resetWizard() {
    wizState = {
        type: null,
        step: 0,
        maxSteps: 4,
        data: { name: '', description: '', config: {}, files: [], urls: [] },
        tableData: null
    };
    
    // Reset editing state
    editingToolId = null;
    
    // Reset text and table entries
    wizTextEntries = [];
    wizTableEntries = [];
    
    // Reset UI
    document.getElementById('wizard-steps-bar').classList.add('hidden');
    document.getElementById('wizard-footer').classList.add('hidden');
    document.getElementById('wizard-icon').textContent = '🔧';
    document.getElementById('wizard-title').textContent = 'Create Tool';
    document.getElementById('wizard-subtitle').textContent = 'Select a tool type';
    
    // Reset Create button to default state
    const createBtn = document.getElementById('btn-create');
    if (createBtn) {
        createBtn.textContent = '✓ Create Tool';
        createBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        createBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    }
    
    // Show step 0, hide others (including new steps 5 and 6)
    for (let i = 0; i <= 6; i++) {
        const el = document.getElementById('wiz-step-' + i);
        if (el) el.classList.toggle('hidden', i !== 0);
    }
    
    // Reset forms
    document.getElementById('wiz-name').value = '';
    document.getElementById('wiz-desc').value = '';
    document.getElementById('wiz-files-list').innerHTML = '';
    document.getElementById('wiz-urls-list').innerHTML = '';
    
    // Reset text/table lists
    const textList = document.getElementById('wiz-text-list');
    const tableList = document.getElementById('wiz-table-list');
    if (textList) textList.innerHTML = '';
    if (tableList) tableList.innerHTML = '';
    
    // Hide all config sections
    document.querySelectorAll('[id^="cfg-"]').forEach(el => el.classList.add('hidden'));
}

// Start wizard with tool type
function startWizard(type) {
    wizState.type = type;
    wizState.step = 1;
    
    // Reset API parameters when starting a new API tool (edit flow sets them in openToolEditor)
    if (type === 'api') apiParams = [];
    
    // Reset access control state for new tools
    selectedToolAccessType = 'owner_only';
    wizState.data = {
        name: '',
        description: '',
        config: {},
        files: [],
        urls: [],
        access_type: 'owner_only',
        allowed_user_ids: [],
        allowed_group_ids: [],
        can_edit_user_ids: [],
        can_delete_user_ids: [],
        can_execute_user_ids: []
    };
    
    // Reset access control UI
    setTimeout(() => selectToolAccessType('owner_only'), 100);
    
    const meta = toolMeta[type] || { icon: '🔧', name: type, steps: ['Basics', 'Config', 'Test'] };
    wizState.maxSteps = meta.steps.length;
    
    // Update header
    document.getElementById('wizard-icon').textContent = meta.icon;
    document.getElementById('wizard-title').textContent = meta.name;
    document.getElementById('wizard-subtitle').textContent = 'Step 1 of ' + wizState.maxSteps;
    
    // Update step 1 header
    document.getElementById('step1-icon').textContent = meta.icon;
    document.getElementById('step1-title').textContent = meta.name;
    
    // Show steps bar and footer
    document.getElementById('wizard-steps-bar').classList.remove('hidden');
    document.getElementById('wizard-footer').classList.remove('hidden');
    
    // Update steps labels
    updateStepsBar();
    
    // Show step 1
    showStep(1);
}

// Update steps bar
function updateStepsBar() {
    const meta = toolMeta[wizState.type] || { steps: ['Basics', 'Config', 'Sources', 'Test'] };
    const steps = document.querySelectorAll('.wizard-step');
    
    steps.forEach((step, idx) => {
        const stepNum = idx + 1;
        const numEl = step.querySelector('.step-num');
        const labelEl = step.querySelector('.step-label');
        
        // Hide steps beyond max
        step.style.display = stepNum <= wizState.maxSteps ? 'flex' : 'none';
        
        // Update label
        if (labelEl && meta.steps[idx]) {
            labelEl.textContent = meta.steps[idx];
        }
        
        // Update styling
        if (stepNum < wizState.step) {
            // Completed
            step.classList.remove('opacity-50');
            numEl.classList.remove('bg-gray-700');
            numEl.classList.add('bg-green-600');
            numEl.innerHTML = '✓';
        } else if (stepNum === wizState.step) {
            // Current
            step.classList.remove('opacity-50');
            numEl.classList.remove('bg-gray-700', 'bg-green-600');
            numEl.classList.add('bg-purple-600');
            numEl.textContent = stepNum;
        } else {
            // Future
            step.classList.add('opacity-50');
            numEl.classList.remove('bg-purple-600', 'bg-green-600');
            numEl.classList.add('bg-gray-700');
            numEl.textContent = stepNum;
        }
    });
    
    // Hide connectors beyond max
    const connectors = document.querySelectorAll('.step-connector');
    connectors.forEach((conn, idx) => {
        conn.style.display = (idx + 2) <= wizState.maxSteps ? 'block' : 'none';
    });
}

// Show specific step
function showStep(step) {
    wizState.step = step;
    
    // Update subtitle
    const meta = toolMeta[wizState.type] || {};
    document.getElementById('wizard-subtitle').textContent = 
        'Step ' + step + ' of ' + wizState.maxSteps + ': ' + (meta.steps?.[step-1] || '');
    
    // Hide all step contents (including new steps 5 and 6)
    for (let i = 0; i <= 6; i++) {
        const el = document.getElementById('wiz-step-' + i);
        if (el) el.classList.add('hidden');
    }
    
    // Map logical step to actual step
    const actualStep = getActualStep(step);
    document.getElementById('wiz-step-' + actualStep).classList.remove('hidden');
    
    // Show appropriate config section
    if (actualStep === 2) {
        showConfigSection();
        
        // Update step 2 header for noTestStep tools (this is their final step)
        const isLastStep = step === wizState.maxSteps;
        const step2Header = document.querySelector('#wiz-step-2 h4.font-semibold');
        const step2Desc = document.querySelector('#wiz-step-2 p.text-xs');
        if (step2Header && isLastStep && meta.noTestStep) {
            step2Header.textContent = 'Configuration';
            step2Desc.textContent = editingToolId 
                ? 'Configure and update your tool' 
                : 'Configure and create your tool';
        }
    }
    
    // Show/hide sources tabs based on tool type
    if (actualStep === 3) {
        const hasSources = toolMeta[wizState.type]?.hasSources;
        document.getElementById('source-tabs').style.display = hasSources ? 'flex' : 'none';
    }
    
    // Load access control data when entering Access step
    if (actualStep === 5) {
        loadAccessStepData();
    }
    
    // Update buttons
    updateButtons();
    updateStepsBar();
    
    // Update Review step if on last step (Review)
    if (actualStep === 6) {
        updateReviewStep();
        
        // Update step 6 title based on editing state
        const step6Title = document.getElementById('step6-title');
        const step6Subtitle = document.getElementById('step6-subtitle');
        if (step6Title) {
            step6Title.textContent = editingToolId ? 'Review & Update' : 'Review & Create';
        }
        if (step6Subtitle) {
            step6Subtitle.textContent = editingToolId ? 'Review your changes before updating' : 'Review your configuration before creating';
        }
    }
    
    // Also update old summary for compatibility
    if (step === wizState.maxSteps) {
        updateSummary();
    }
}

// Get actual step content based on tool type
function getActualStep(logicalStep) {
    const meta = toolMeta[wizState.type];
    if (!meta) return logicalStep;
    
    // Map based on tool capabilities
    // Step 1: Always Basics -> wiz-step-1
    if (logicalStep === 1) return 1;
    
    // New flow with Access Control and Review steps
    // wiz-step-1: Basics
    // wiz-step-2: Configuration
    // wiz-step-3: Sources (for data tools)
    // wiz-step-4: Old Test step (kept for compatibility but rarely used)
    // wiz-step-5: Access Control (new)
    // wiz-step-6: Review (new)
    
    if (meta.hasConfig && meta.hasSources) {
        // knowledge: Basics -> Config -> Sources -> Access -> Review
        // steps: ['Basics', 'RAG Config', 'Sources', 'Access', 'Review']
        if (logicalStep === 2) return 2; // Config
        if (logicalStep === 3) return 3; // Sources
        if (logicalStep === 4) return 5; // Access
        if (logicalStep === 5) return 6; // Review
    } else if (!meta.hasConfig && meta.hasSources) {
        // document: Basics -> Upload -> Access -> Review
        // steps: ['Basics', 'Upload', 'Access', 'Review']
        if (logicalStep === 2) return 3; // Sources/Upload
        if (logicalStep === 3) return 5; // Access
        if (logicalStep === 4) return 6; // Review
    } else if (meta.hasConfig && !meta.hasSources) {
        // api, website, database, etc: Basics -> Config -> Access -> Review
        // steps: ['Basics', 'Configuration', 'Access', 'Review']
        if (logicalStep === 2) return 2; // Config
        if (logicalStep === 3) return 5; // Access
        if (logicalStep === 4) return 6; // Review
    } else {
        // calculator (no config, no sources): Basics -> Access -> Review
        // steps: ['Basics', 'Access', 'Review']
        if (logicalStep === 2) return 5; // Access
        if (logicalStep === 3) return 6; // Review
    }
    
    return logicalStep;
}

// Show appropriate config section
function showConfigSection() {
    document.querySelectorAll('[id^="cfg-"]').forEach(el => el.classList.add('hidden'));
    
    const cfgId = 'cfg-' + wizState.type;
    const cfgEl = document.getElementById(cfgId);
    
    if (cfgEl) {
        cfgEl.classList.remove('hidden');
    } else {
        document.getElementById('cfg-simple').classList.remove('hidden');
    }
    
    // When showing API config, render the parameters list (optional section)
    if (wizState.type === 'api' && typeof renderApiParams === 'function') {
        renderApiParams();
    }
    
    // Hide the old Access Control section in step 2 (now moved to step 5)
    const oldAccessControl = document.getElementById('tool-access-control');
    if (oldAccessControl) {
        oldAccessControl.classList.add('hidden');
    }
}

// Update navigation buttons
function updateButtons() {
    const btnBack = document.getElementById('btn-back');
    const btnNext = document.getElementById('btn-next');
    const btnSkip = document.getElementById('btn-skip');
    const btnCreate = document.getElementById('btn-create');
    
    // Back button - always show if not on step 1
    btnBack.style.display = wizState.step > 1 ? 'block' : 'none';
    
    // Skip button (only on sources step)
    const actualStep = getActualStep(wizState.step);
    btnSkip.classList.toggle('hidden', actualStep !== 3);
    
    // Next vs Create/Update
    if (wizState.step >= wizState.maxSteps) {
        btnNext.classList.add('hidden');
        btnCreate.classList.remove('hidden');
        
        // Update button text based on editing state
        if (editingToolId) {
            btnCreate.textContent = '✓ Update Tool';
            btnCreate.classList.remove('bg-green-600', 'hover:bg-green-700');
            btnCreate.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            btnCreate.textContent = '✓ Create Tool';
            btnCreate.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            btnCreate.classList.add('bg-green-600', 'hover:bg-green-700');
        }
    } else {
        btnNext.classList.remove('hidden');
        btnCreate.classList.add('hidden');
    }
}

// Navigate back
function wizBack() {
    if (wizState.step > 1) {
        showStep(wizState.step - 1);
    } else {
        // Go back to type selection
        resetWizard();
        document.getElementById('wiz-step-0').classList.remove('hidden');
    }
}

// Cancel tool edit/create
function cancelToolWizard() {
    const isEditing = !!editingToolId;
    const confirmMsg = isEditing 
        ? 'Are you sure you want to cancel editing? Changes will not be saved.'
        : 'Are you sure you want to cancel? This tool will not be created.';
    
    if (!confirm(confirmMsg)) return;
    
    // Close the modal
    hideModal('modal-tool');
    
    // Reset state
    editingToolId = null;
    resetWizard();
    
    showToast('Cancelled', 'info');
}

// Navigate next
function wizNext() {
    // Validate current step
    if (!validateStep()) return;
    
    // Save current step data
    saveStepData();
    
    if (wizState.step < wizState.maxSteps) {
        showStep(wizState.step + 1);
    }
}

// Skip step
function wizSkip() {
    if (wizState.step < wizState.maxSteps) {
        showStep(wizState.step + 1);
    }
}

// Validate current step
function validateStep() {
    if (wizState.step === 1) {
        const name = document.getElementById('wiz-name').value.trim();
        if (!name) {
            alert('Please enter a name');
            return false;
        }
    }
    
    if (getActualStep(wizState.step) === 2) {
        // Validate config based on type
        if (wizState.type === 'website') {
            const url = document.getElementById('web-url').value.trim();
            if (!url) {
                alert('Please enter a website URL');
                return false;
            }
        }
        if (wizState.type === 'api') {
            const url = document.getElementById('api-url').value.trim();
            if (!url) {
                alert('Please enter an API URL');
                return false;
            }
        }
    }
    
    return true;
}

// Save step data
function saveStepData() {
    if (wizState.step === 1) {
        wizState.data.name = document.getElementById('wiz-name').value.trim();
        wizState.data.description = document.getElementById('wiz-desc').value.trim();
    }
    
    if (getActualStep(wizState.step) === 2) {
        // Save config based on type
        const config = {};
        
        if (wizState.type === 'knowledge') {
            config.embedding = {
                use_global: document.getElementById('kb-emb-global').checked,
                provider: document.getElementById('kb-emb-provider').value,
                model: document.getElementById('kb-emb-model').value
            };
            config.chunk_size = parseInt(document.getElementById('kb-chunk').value) || 1000;
            config.chunk_overlap = parseInt(document.getElementById('kb-overlap').value) || 200;
            config.top_k = parseInt(document.getElementById('kb-topk').value) || 5;
            config.search_type = document.getElementById('kb-search').value;
        }
        
        if (wizState.type === 'website') {
            config.url = document.getElementById('web-url').value;
            config.recursive = document.getElementById('web-recursive').checked;
            config.max_pages = parseInt(document.getElementById('web-max').value) || 10;
        }
        
        if (wizState.type === 'database') {
            config.db_type = document.getElementById('db-type').value;
            config.host = document.getElementById('db-host').value;
            config.port = parseInt(document.getElementById('db-port').value);
            config.database = document.getElementById('db-name').value;
            config.username = document.getElementById('db-user').value;
            config.password = document.getElementById('db-pass').value;
        }
        
        if (wizState.type === 'api') {
            config.base_url = document.getElementById('api-url').value;
            config.method = document.getElementById('api-method').value;
            config.path = document.getElementById('api-path').value;
            config.auth_type = document.getElementById('api-auth').value;
            config.auth_value = document.getElementById('api-auth-val')?.value;
        }
        
        if (wizState.type === 'websearch') {
            config.provider = document.getElementById('search-provider').value;
            config.api_key = document.getElementById('search-key').value;
        }
        
        if (wizState.type === 'email') {
            // Get email config from hidden field or state
            const emailConfigData = document.getElementById('email-config-data')?.value;
            if (emailConfigData) {
                try {
                    const emailConfig = JSON.parse(emailConfigData);
                    Object.assign(config, emailConfig);
                } catch(e) {
                    console.error('Failed to parse email config:', e);
                }
            }
            
            // Also check if config was already set in wizState
            if (wizState.data.config && wizState.data.config.email) {
                Object.assign(config, wizState.data.config.email);
            }
            
            // Also check for SendGrid config
            const sendgridKey = document.getElementById('sendgrid-api-key')?.value;
            const sendgridFrom = document.getElementById('sendgrid-from-email')?.value;
            if (sendgridKey && sendgridFrom) {
                config.provider = 'sendgrid';
                config.apiKey = sendgridKey;
                config.fromEmail = sendgridFrom;
            }
            
            console.log('Email config:', config);
        }
        
        if (wizState.type === 'webhook') {
            config.url = document.getElementById('hook-url')?.value;
            config.method = document.getElementById('hook-method')?.value;
            config.secret = document.getElementById('hook-secret')?.value;
        }
        
        if (wizState.type === 'slack') {
            config.webhook_url = document.getElementById('slack-webhook')?.value;
        }
        
        if (wizState.type === 'calendar') {
            config.provider = document.getElementById('cal-provider')?.value;
            config.api_key = document.getElementById('cal-api-key')?.value;
        }
        
        wizState.data.config = config;
    }
    
    // Save Access Control data (from either old step 2 or new step 5)
    if (getActualStep(wizState.step) === 2 || getActualStep(wizState.step) === 5) {
        wizState.data.access_type = selectedToolAccessType || 'owner_only';
        
        if (wizState.data.access_type === 'specific_users') {
            // Read from toolAccessSelected (chips) instead of hidden selects
            wizState.data.allowed_user_ids = toolAccessSelected.users.map(u => u.id);
            wizState.data.allowed_group_ids = toolAccessSelected.groups.map(g => g.id);
            
            // Read granular permissions from toolPermissionChips
            // Format: "user:id" or "group:id" so backend can identify type
            wizState.data.can_edit_user_ids = toolPermissionChips.edit.map(e => 
                e.entityType === 'group' ? `group:${e.id}` : e.id
            );
            wizState.data.can_delete_user_ids = toolPermissionChips.delete.map(e => 
                e.entityType === 'group' ? `group:${e.id}` : e.id
            );
            wizState.data.can_execute_user_ids = toolPermissionChips.execute.map(e => 
                e.entityType === 'group' ? `group:${e.id}` : e.id
            );
            
            console.log('📋 [COLLECT] Access Control Data:', {
                allowed_user_ids: wizState.data.allowed_user_ids,
                allowed_group_ids: wizState.data.allowed_group_ids,
                can_edit_user_ids: wizState.data.can_edit_user_ids,
                can_delete_user_ids: wizState.data.can_delete_user_ids,
                can_execute_user_ids: wizState.data.can_execute_user_ids
            });
        } else {
            wizState.data.allowed_user_ids = [];
            wizState.data.allowed_group_ids = [];
            wizState.data.can_edit_user_ids = [];
            wizState.data.can_delete_user_ids = [];
            wizState.data.can_execute_user_ids = [];
        }
    }
}

// Update summary
function updateSummary() {
    const meta = toolMeta[wizState.type] || {};
    document.getElementById('sum-type').textContent = meta.icon + ' ' + meta.name;
    document.getElementById('sum-name').textContent = wizState.data.name || '-';
    document.getElementById('sum-docs').textContent = wizState.data.files?.length || 0;
    document.getElementById('sum-urls').textContent = wizState.data.urls?.length || 0;
    document.getElementById('sum-text').textContent = wizTextEntries?.length || 0;
    document.getElementById('sum-tables').textContent = wizTableEntries?.length || 0;
}

// ========== ACCESS STEP (Step 5) FUNCTIONS ==========

// Load data for access step
async function loadAccessStepData() {
    // Load users and groups if not already loaded
    if (!toolAccessData.users.length || !toolAccessData.groups.length) {
        await loadToolAccessUsersAndGroups();
    }
    
    // Update the chips display based on current selections
    updateAccessStepChips();
    updateAccessStepPermDropdowns();
    
    // Update access type card selection
    document.querySelectorAll('#wiz-step-5 .access-step-card').forEach(card => {
        const accessType = card.dataset.access;
        const isSelected = accessType === selectedToolAccessType;
        card.classList.toggle('border-purple-500', isSelected && accessType === 'owner_only');
        card.classList.toggle('border-blue-500', isSelected && accessType === 'authenticated');
        card.classList.toggle('border-yellow-500', isSelected && accessType === 'specific_users');
        card.classList.toggle('border-green-500', isSelected && accessType === 'public');
        card.classList.toggle('border-gray-600', !isSelected);
        card.classList.toggle('bg-purple-500/10', isSelected && accessType === 'owner_only');
        card.classList.toggle('bg-blue-500/10', isSelected && accessType === 'authenticated');
        card.classList.toggle('bg-yellow-500/10', isSelected && accessType === 'specific_users');
        card.classList.toggle('bg-green-500/10', isSelected && accessType === 'public');
        card.querySelector('.access-step-check')?.classList.toggle('hidden', !isSelected);
    });
    
    // Show/hide specific users config
    const specificConfig = document.getElementById('access-step-specific-config');
    if (specificConfig) {
        specificConfig.classList.toggle('hidden', selectedToolAccessType !== 'specific_users');
    }
}

// Filter access step search results
function filterAccessStepSearch(query) {
    const resultsEl = document.getElementById('access-step-search-results');
    if (!resultsEl) return;
    
    if (!query || query.length < 1) {
        resultsEl.classList.add('hidden');
        return;
    }
    
    const q = query.toLowerCase();
    let html = '';
    
    // Filter users
    const matchingUsers = toolAccessData.users.filter(u => 
        (u.full_name?.toLowerCase().includes(q) || 
         u.email?.toLowerCase().includes(q) ||
         u.username?.toLowerCase().includes(q)) &&
        !toolAccessSelected.users.some(su => su.id === u.id)
    ).slice(0, 5);
    
    // Filter groups
    const matchingGroups = toolAccessData.groups.filter(g => 
        g.name?.toLowerCase().includes(q) &&
        !toolAccessSelected.groups.some(sg => sg.id === g.id)
    ).slice(0, 5);
    
    if (matchingUsers.length) {
        html += '<div class="px-3 py-1 text-xs text-gray-400 bg-gray-700">Users</div>';
        matchingUsers.forEach(u => {
            html += `<div class="px-3 py-2 cursor-pointer hover:bg-gray-700 flex items-center gap-2" 
                         onclick="addAccessStepUser('${u.id}', '${escHtml(u.full_name || u.email)}', '${escHtml(u.email || '')}')">
                <span class="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs">👤</span>
                <div>
                    <div class="text-sm">${escHtml(u.full_name || u.username || 'User')}</div>
                    <div class="text-xs text-gray-400">${escHtml(u.email || '')}</div>
                </div>
            </div>`;
        });
    }
    
    if (matchingGroups.length) {
        html += '<div class="px-3 py-1 text-xs text-gray-400 bg-gray-700">Groups</div>';
        matchingGroups.forEach(g => {
            html += `<div class="px-3 py-2 cursor-pointer hover:bg-gray-700 flex items-center gap-2" 
                         onclick="addAccessStepGroup('${g.id}', '${escHtml(g.name)}')">
                <span class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">👥</span>
                <div class="text-sm">${escHtml(g.name)}</div>
            </div>`;
        });
    }
    
    if (!html) {
        html = '<div class="px-3 py-2 text-sm text-gray-400">No results found</div>';
    }
    
    resultsEl.innerHTML = html;
    resultsEl.classList.remove('hidden');
}

function showAccessStepResults() {
    const searchInput = document.getElementById('access-step-search');
    if (searchInput && searchInput.value) {
        filterAccessStepSearch(searchInput.value);
    }
}

function addAccessStepUser(id, name, email) {
    if (!toolAccessSelected.users.some(u => u.id === id)) {
        toolAccessSelected.users.push({ id, name, email, type: 'user' });
        updateAccessStepChips();
        updateAccessStepPermDropdowns();
    }
    document.getElementById('access-step-search').value = '';
    document.getElementById('access-step-search-results').classList.add('hidden');
}

function addAccessStepGroup(id, name) {
    if (!toolAccessSelected.groups.some(g => g.id === id)) {
        toolAccessSelected.groups.push({ id, name, type: 'group' });
        updateAccessStepChips();
        updateAccessStepPermDropdowns();
    }
    document.getElementById('access-step-search').value = '';
    document.getElementById('access-step-search-results').classList.add('hidden');
}

function removeAccessStepUser(id) {
    toolAccessSelected.users = toolAccessSelected.users.filter(u => u.id !== id);
    updateAccessStepChips();
    updateAccessStepPermDropdowns();
}

function removeAccessStepGroup(id) {
    toolAccessSelected.groups = toolAccessSelected.groups.filter(g => g.id !== id);
    updateAccessStepChips();
    updateAccessStepPermDropdowns();
}

function updateAccessStepChips() {
    const chipsEl = document.getElementById('access-step-selected-chips');
    const countEl = document.getElementById('access-step-count');
    const noSelectionEl = document.getElementById('access-step-no-selection');
    
    if (!chipsEl) return;
    
    const totalCount = toolAccessSelected.users.length + toolAccessSelected.groups.length;
    
    if (countEl) countEl.textContent = totalCount;
    
    if (totalCount === 0) {
        chipsEl.innerHTML = '<div id="access-step-no-selection" class="text-sm italic text-gray-500">Click on users or groups from search to add them</div>';
        return;
    }
    
    let html = '';
    
    // User chips
    toolAccessSelected.users.forEach(u => {
        html += `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
            👤 ${escHtml(u.name)}
            <button onclick="removeAccessStepUser('${u.id}')" class="ml-1 hover:text-red-400">&times;</button>
        </span>`;
    });
    
    // Group chips
    toolAccessSelected.groups.forEach(g => {
        html += `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
            👥 ${escHtml(g.name)}
            <button onclick="removeAccessStepGroup('${g.id}')" class="ml-1 hover:text-red-400">&times;</button>
        </span>`;
    });
    
    chipsEl.innerHTML = html;
}

function updateAccessStepPermDropdowns() {
    ['edit', 'delete', 'execute'].forEach(permType => {
        const selectEl = document.getElementById('access-step-' + permType + '-select');
        if (!selectEl) return;
        
        let html = '<option value="">+ Add user/group</option>';
        
        // Add users
        toolAccessSelected.users.forEach(u => {
            if (!toolPermissionChips[permType]?.some(c => c.id === u.id && c.entityType === 'user')) {
                html += `<option value="user:${u.id}">${escHtml(u.name)}</option>`;
            }
        });
        
        // Add groups
        toolAccessSelected.groups.forEach(g => {
            if (!toolPermissionChips[permType]?.some(c => c.id === g.id && c.entityType === 'group')) {
                html += `<option value="group:${g.id}">${escHtml(g.name)}</option>`;
            }
        });
        
        selectEl.innerHTML = html;
        
        // Update chips display
        updateAccessStepPermChips(permType);
    });
}

function addAccessStepPermChip(permType, selectEl) {
    const value = selectEl.value;
    if (!value) return;
    
    const [type, id] = value.split(':');
    
    let entity;
    if (type === 'user') {
        entity = toolAccessSelected.users.find(u => u.id === id);
    } else if (type === 'group') {
        entity = toolAccessSelected.groups.find(g => g.id === id);
    }
    
    if (!entity) return;
    
    const chipData = { id: entity.id, name: entity.name, entityType: type };
    
    if (!toolPermissionChips[permType]) {
        toolPermissionChips[permType] = [];
    }
    
    if (!toolPermissionChips[permType].some(c => c.id === id && c.entityType === type)) {
        toolPermissionChips[permType].push(chipData);
    }
    
    updateAccessStepPermChips(permType);
    selectEl.value = '';
    updateAccessStepPermDropdowns();
}

function updateAccessStepPermChips(permType) {
    const chipsEl = document.getElementById('access-step-' + permType + '-chips');
    if (!chipsEl) return;
    
    const chips = toolPermissionChips[permType] || [];
    
    if (chips.length === 0) {
        chipsEl.innerHTML = '';
        return;
    }
    
    let html = '';
    chips.forEach(chip => {
        const icon = chip.entityType === 'user' ? '👤' : '👥';
        const bgColor = chip.entityType === 'user' ? 'bg-purple-500/20' : 'bg-blue-500/20';
        const textColor = chip.entityType === 'user' ? 'text-purple-300' : 'text-blue-300';
        html += `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${bgColor} ${textColor}">
            ${icon} ${escHtml(chip.name)}
            <button onclick="removeAccessStepPermChip('${permType}', '${chip.id}', '${chip.entityType}')" class="hover:text-red-400">&times;</button>
        </span>`;
    });
    
    chipsEl.innerHTML = html;
}

function removeAccessStepPermChip(permType, id, entityType) {
    if (toolPermissionChips[permType]) {
        toolPermissionChips[permType] = toolPermissionChips[permType].filter(c => !(c.id === id && c.entityType === entityType));
    }
    updateAccessStepPermChips(permType);
    updateAccessStepPermDropdowns();
}

// ========== REVIEW STEP (Step 6) FUNCTIONS ==========

function updateReviewStep() {
    const meta = toolMeta[wizState.type] || {};
    
    // Basic info
    document.getElementById('review-type').textContent = meta.icon + ' ' + meta.name;
    document.getElementById('review-name').textContent = wizState.data.name || document.getElementById('wiz-name')?.value || '-';
    document.getElementById('review-desc').textContent = wizState.data.description || document.getElementById('wiz-desc')?.value || '-';
    
    // Config details based on tool type
    const configDetailsEl = document.getElementById('review-config-details');
    if (configDetailsEl) {
        let configHtml = '';
        
        if (wizState.type === 'api') {
            const baseUrl = document.getElementById('api-url')?.value || '';
            const endpoint = document.getElementById('api-path')?.value || '';
            const method = document.getElementById('api-method')?.value || 'GET';
            const authType = document.getElementById('api-auth')?.value || 'none';
            configHtml = `
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Base URL:</span>
                    <span class="col-span-2 truncate">${escHtml(baseUrl || '-')}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Endpoint:</span>
                    <span class="col-span-2">${escHtml(endpoint || '-')}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Method:</span>
                    <span class="col-span-2">${escHtml(method)}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Auth:</span>
                    <span class="col-span-2">${escHtml(authType === 'none' ? 'None' : authType)}</span>
                </div>
                ${(apiParams && apiParams.length > 0) ? `
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Fields (params):</span>
                    <span class="col-span-2">${apiParams.length} field(s) — ${apiParams.map(p => escHtml(p.name || 'unnamed')).join(', ') || '-'}</span>
                </div>
                ` : ''}
            `;
        } else if (wizState.type === 'website') {
            const url = document.getElementById('web-url')?.value || '';
            const recursive = document.getElementById('web-recursive')?.checked || false;
            const maxPages = document.getElementById('web-max')?.value || '10';
            configHtml = `
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">URL:</span>
                    <span class="col-span-2 truncate">${escHtml(url || '-')}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Recursive:</span>
                    <span class="col-span-2">${recursive ? 'Yes' : 'No'}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Max Pages:</span>
                    <span class="col-span-2">${escHtml(maxPages)}</span>
                </div>
            `;
        } else if (wizState.type === 'database') {
            const dbType = document.getElementById('db-type')?.value || 'postgresql';
            const host = document.getElementById('db-host')?.value || '';
            configHtml = `
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Database:</span>
                    <span class="col-span-2">${escHtml(dbType)}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 items-center">
                    <span class="text-gray-400">Host:</span>
                    <span class="col-span-2">${escHtml(host || '-')}</span>
                </div>
            `;
        }
        
        configDetailsEl.innerHTML = configHtml;
    }
    
    // Access control summary
    const accessTypeLabels = {
        'owner_only': { icon: '👤', label: 'Owner Only', color: 'purple' },
        'authenticated': { icon: '🔑', label: 'All Logged In', color: 'blue' },
        'specific_users': { icon: '👥', label: 'Specific Users', color: 'yellow' },
        'public': { icon: '🌐', label: 'Public', color: 'green' }
    };
    
    const accessLabel = accessTypeLabels[selectedToolAccessType] || accessTypeLabels['owner_only'];
    const accessTypeEl = document.getElementById('review-access-type');
    accessTypeEl.innerHTML = accessLabel.icon + ' ' + accessLabel.label;
    accessTypeEl.className = `px-2 py-1 rounded bg-${accessLabel.color}-500/20 text-${accessLabel.color}-300 text-xs`;
    
    // Show users/groups if specific_users
    const usersSection = document.getElementById('review-access-users');
    const groupsSection = document.getElementById('review-access-groups');
    const permsSection = document.getElementById('review-permissions-section');
    
    if (selectedToolAccessType === 'specific_users') {
        if (toolAccessSelected.users.length > 0) {
            usersSection.classList.remove('hidden');
            document.getElementById('review-users-list').innerHTML = toolAccessSelected.users.map(u => 
                `<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">👤 ${escHtml(u.name)}</span>`
            ).join('');
        } else {
            usersSection.classList.add('hidden');
        }
        
        if (toolAccessSelected.groups.length > 0) {
            groupsSection.classList.remove('hidden');
            document.getElementById('review-groups-list').innerHTML = toolAccessSelected.groups.map(g => 
                `<span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs">👥 ${escHtml(g.name)}</span>`
            ).join('');
        } else {
            groupsSection.classList.add('hidden');
        }
        
        // Show granular permissions
        const hasEditPerms = toolPermissionChips.edit && toolPermissionChips.edit.length > 0;
        const hasDeletePerms = toolPermissionChips.delete && toolPermissionChips.delete.length > 0;
        const hasExecutePerms = toolPermissionChips.execute && toolPermissionChips.execute.length > 0;
        const hasAnyPerms = hasEditPerms || hasDeletePerms || hasExecutePerms;
        
        if (hasAnyPerms && permsSection) {
            permsSection.classList.remove('hidden');
            
            // Edit permissions
            const editSection = document.getElementById('review-perm-edit');
            if (hasEditPerms) {
                editSection.classList.remove('hidden');
                document.getElementById('review-edit-list').innerHTML = toolPermissionChips.edit.map(p => {
                    const icon = p.entityType === 'user' ? '👤' : '👥';
                    const color = p.entityType === 'user' ? 'purple' : 'blue';
                    return `<span class="px-1.5 py-0.5 rounded bg-${color}-500/20 text-${color}-300 text-xs">${icon} ${escHtml(p.name)}</span>`;
                }).join('');
            } else {
                editSection.classList.add('hidden');
            }
            
            // Delete permissions
            const deleteSection = document.getElementById('review-perm-delete');
            if (hasDeletePerms) {
                deleteSection.classList.remove('hidden');
                document.getElementById('review-delete-list').innerHTML = toolPermissionChips.delete.map(p => {
                    const icon = p.entityType === 'user' ? '👤' : '👥';
                    const color = p.entityType === 'user' ? 'purple' : 'blue';
                    return `<span class="px-1.5 py-0.5 rounded bg-${color}-500/20 text-${color}-300 text-xs">${icon} ${escHtml(p.name)}</span>`;
                }).join('');
            } else {
                deleteSection.classList.add('hidden');
            }
            
            // Execute permissions
            const executeSection = document.getElementById('review-perm-execute');
            if (hasExecutePerms) {
                executeSection.classList.remove('hidden');
                document.getElementById('review-execute-list').innerHTML = toolPermissionChips.execute.map(p => {
                    const icon = p.entityType === 'user' ? '👤' : '👥';
                    const color = p.entityType === 'user' ? 'purple' : 'blue';
                    return `<span class="px-1.5 py-0.5 rounded bg-${color}-500/20 text-${color}-300 text-xs">${icon} ${escHtml(p.name)}</span>`;
                }).join('');
            } else {
                executeSection.classList.add('hidden');
            }
        } else if (permsSection) {
            permsSection.classList.add('hidden');
        }
    } else {
        usersSection.classList.add('hidden');
        groupsSection.classList.add('hidden');
        if (permsSection) permsSection.classList.add('hidden');
    }
    
    // Sources summary (show only for data tools)
    const sourcesSection = document.getElementById('review-sources-section');
    if (sourcesSection && meta.hasSources) {
        sourcesSection.classList.remove('hidden');
        document.getElementById('review-files').textContent = wizState.data.files?.length || 0;
        document.getElementById('review-urls').textContent = wizState.data.urls?.length || 0;
        document.getElementById('review-text').textContent = wizTextEntries?.length || 0;
        document.getElementById('review-tables').textContent = wizTableEntries?.length || 0;
    } else if (sourcesSection) {
        sourcesSection.classList.add('hidden');
    }
    
    // Reset test result
    const testResult = document.getElementById('review-test-result');
    if (testResult) testResult.classList.add('hidden');
}

// Re-scrape website for editing tool
async function rescrapeWebsite() {
    if (!editingToolId) {
        showToast('No tool to rescrape', 'error');
        return;
    }
    
    const url = document.getElementById('web-url')?.value?.trim();
    if (!url) {
        showToast('Please enter a URL first', 'error');
        return;
    }
    
    const recursive = document.getElementById('web-recursive')?.checked || false;
    const maxPages = parseInt(document.getElementById('web-max')?.value) || 10;
    
    if (!confirm(`This will re-scrape the website and replace existing content.\n\nURL: ${url}\nRecursive: ${recursive}\nMax Pages: ${maxPages}\n\nContinue?`)) {
        return;
    }
    
    showProgressModal('Re-scraping website...');
    updateProgress(10, 'Starting scrape...');
    
    try {
        const response = await fetch(API + '/api/tools/' + editingToolId + '/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                recursive: recursive,
                max_pages: maxPages
            })
        });
        
        updateProgress(80, 'Processing content...');
        
        if (response.ok) {
            const data = await response.json();
            updateProgress(100, 'Done!');
            
            setTimeout(() => {
                hideProgressModal();
                showToast(`Successfully scraped! Extracted ${data.chunks_extracted || 0} chunks.`, 'success');
                
                // Refresh the scraped pages list
                fetch(API + '/api/tools/' + editingToolId)
                    .then(r => r.json())
                    .then(tool => {
                        const scrapedPages = tool.scraped_pages || [];
                        const scrapedContainer = document.getElementById('web-scraped-pages');
                        const scrapedList = document.getElementById('web-scraped-list');
                        
                        if (scrapedPages.length > 0 && scrapedContainer && scrapedList) {
                            scrapedContainer.classList.remove('hidden');
                            scrapedList.innerHTML = scrapedPages.map(p => `
                                <div class="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
                                    <div class="flex items-center gap-2 min-w-0 flex-1">
                                        <span>🔗</span>
                                        <a href="${escHtml(p.url)}" target="_blank" class="text-sm text-blue-400 hover:underline truncate">${escHtml(p.url || p.title || 'Page')}</a>
                                    </div>
                                    <span class="text-xs text-gray-500 ml-2">${p.chunks_extracted || 0} chunks</span>
                                </div>
                            `).join('');
                        }
                    });
            }, 500);
        } else {
            const error = await response.json();
            hideProgressModal();
            showToast(error.detail || 'Failed to scrape', 'error');
        }
    } catch (e) {
        hideProgressModal();
        showToast('Error: ' + e.message, 'error');
    }
}

// Test tool (unified: API opens same modal as "Try this API", other types run inline)
async function testWizTool() {
    if (wizState.type === 'api' && typeof openWizardApiTestModal === 'function') {
        openWizardApiTestModal();
        return;
    }
    
    const resultEl = document.getElementById('wiz-test-result') || document.getElementById('review-test-result');
    const reviewResultEl = document.getElementById('review-test-result');
    
    if (resultEl) {
        resultEl.classList.remove('hidden');
        resultEl.className = 'p-3 rounded-lg text-sm bg-blue-900/30 border border-blue-600';
        resultEl.innerHTML = '<span class="animate-pulse">🔄 Testing...</span>';
    }
    if (reviewResultEl && reviewResultEl !== resultEl) {
        reviewResultEl.classList.remove('hidden');
        reviewResultEl.className = 'p-3 rounded-lg text-sm bg-blue-900/30 border border-blue-600';
        reviewResultEl.innerHTML = '<span class="animate-pulse">🔄 Testing...</span>';
    }
    
    try {
        let testResult = { success: true, message: 'Connection successful!' };
        
        if (wizState.type === 'api') {
            const baseUrl = document.getElementById('api-url')?.value;
            const endpoint = document.getElementById('api-path')?.value || '';
            const method = document.getElementById('api-method')?.value || 'GET';
            
            if (baseUrl) {
                try {
                    const testResponse = await fetch(API + '/api/tools/test-api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                        body: JSON.stringify({
                            base_url: baseUrl,
                            endpoint_path: endpoint,
                            http_method: method,
                            auth_type: document.getElementById('api-auth')?.value || 'none',
                            auth_value: document.getElementById('api-auth-val')?.value || ''
                        })
                    });
                    const testData = await testResponse.json();
                    testResult = {
                        success: testData.success,
                        message: testData.success 
                            ? `✅ API responded with status ${testData.status_code}` 
                            : `❌ ${testData.error || 'Connection failed'}`,
                        data: testData.data
                    };
                } catch (e) {
                    testResult = { success: false, message: '❌ ' + e.message };
                }
            } else {
                testResult = { success: false, message: '⚠️ Please enter a Base URL first' };
            }
        } else {
            // For other types, just simulate success
            await new Promise(r => setTimeout(r, 500));
        }
        
        // Show result
        const className = testResult.success 
            ? 'p-3 rounded-lg text-sm bg-green-900/30 border border-green-600'
            : 'p-3 rounded-lg text-sm bg-red-900/30 border border-red-600';
        
        let resultHtml = testResult.message;
        if (testResult.data) {
            resultHtml += `<pre class="mt-2 text-xs bg-gray-900 p-2 rounded overflow-x-auto max-h-32">${escHtml(JSON.stringify(testResult.data, null, 2))}</pre>`;
        }
        
        if (resultEl) {
            resultEl.className = className;
            resultEl.innerHTML = resultHtml;
        }
        if (reviewResultEl && reviewResultEl !== resultEl) {
            reviewResultEl.className = className;
            reviewResultEl.innerHTML = resultHtml;
        }
    } catch (e) {
        const errorHtml = '❌ Test failed: ' + e.message;
        const errorClass = 'p-3 rounded-lg text-sm bg-red-900/30 border border-red-600';
        if (resultEl) {
            resultEl.className = errorClass;
            resultEl.innerHTML = errorHtml;
        }
        if (reviewResultEl && reviewResultEl !== resultEl) {
            reviewResultEl.className = errorClass;
            reviewResultEl.innerHTML = errorHtml;
        }
    }
}

// Create or Update tool
async function wizCreate() {
    saveStepData();
    
    // Validate required data
    if (!wizState.data.name) {
        alert('Please enter a tool name');
        return;
    }
    
    // Special validation for email
    if (wizState.type === 'email') {
        const config = wizState.data.config || {};
        const emailConfigData = document.getElementById('email-config-data')?.value;
        const hasOAuthConfig = config.provider || config.email || (emailConfigData && emailConfigData.length > 2);
        const hasSendGridConfig = document.getElementById('sendgrid-api-key')?.value && document.getElementById('sendgrid-from-email')?.value;
        
        if (!hasOAuthConfig && !hasSendGridConfig) {
            alert('Please connect an email provider first (Gmail, Outlook, or SendGrid)');
            return;
        }
    }
    
    // Check if we're editing
    const isEditing = !!editingToolId;
    
    // Show progress
    showProgressModal(isEditing ? 'Updating tool...' : 'Creating tool...');
    updateProgress(10, isEditing ? 'Updating tool...' : 'Creating tool...');
    
    try {
        // Create or Update tool
        console.log(isEditing ? 'Updating tool:' : 'Creating tool:', {
            type: wizState.type,
            name: wizState.data.name,
            description: wizState.data.description,
            config: wizState.data.config
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        // Use PUT for update, POST for create
        const url = isEditing ? API + '/api/tools/' + editingToolId : API + '/api/tools';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
                type: wizState.type,
                name: wizState.data.name,
                description: wizState.data.description,
                config: wizState.data.config,
                // Access Control
                access_type: wizState.data.access_type || 'owner_only',
                allowed_user_ids: wizState.data.allowed_user_ids || [],
                allowed_group_ids: wizState.data.allowed_group_ids || [],
                can_edit_user_ids: wizState.data.can_edit_user_ids || [],
                can_delete_user_ids: wizState.data.can_delete_user_ids || [],
                can_execute_user_ids: wizState.data.can_execute_user_ids || []
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || (isEditing ? 'Failed to update tool' : 'Failed to create tool'));
        }
        
        const result = await response.json();
        const toolId = isEditing ? editingToolId : result.tool_id;
        
        updateProgress(20, isEditing ? 'Tool updated!' : 'Tool created!');
        
        // Upload files if any
        if (wizState.data.files && wizState.data.files.length > 0) {
            for (let i = 0; i < wizState.data.files.length; i++) {
                const file = wizState.data.files[i];
                updateProgress(20 + (i / wizState.data.files.length) * 25, 'Uploading ' + file.name + '...');
                
                const fd = new FormData();
                fd.append('file', file);
                await fetch(API + '/api/tools/' + toolId + '/documents', { method: 'POST', body: fd });
            }
        }
        
        // Scrape URLs if any
        if (wizState.data.urls && wizState.data.urls.length > 0) {
            for (let i = 0; i < wizState.data.urls.length; i++) {
                const url = wizState.data.urls[i];
                updateProgress(45 + (i / wizState.data.urls.length) * 20, 'Scraping ' + url + '...');
                
                await fetch(API + '/api/tools/' + toolId + '/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, recursive: false, max_pages: 1 })
                });
            }
        }
        
        // Add text entries if any
        if (wizTextEntries && wizTextEntries.length > 0) {
            for (let i = 0; i < wizTextEntries.length; i++) {
                const entry = wizTextEntries[i];
                updateProgress(65 + (i / wizTextEntries.length) * 15, 'Adding text: ' + entry.title + '...');
                
                await fetch(API + '/api/tools/' + toolId + '/demo-document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ source: entry.title, content: entry.content })
                });
            }
        }
        
        // Add table entries if any
        if (wizTableEntries && wizTableEntries.length > 0) {
            for (let i = 0; i < wizTableEntries.length; i++) {
                const table = wizTableEntries[i];
                updateProgress(80 + (i / wizTableEntries.length) * 15, 'Adding table: ' + table.name + '...');
                
                // Convert table to searchable text
                let tableContent = `## ${table.name}\n\n`;
                tableContent += '| ' + table.data.headers.join(' | ') + ' |\n';
                tableContent += '| ' + table.data.headers.map(() => '---').join(' | ') + ' |\n';
                table.data.rows.forEach(row => {
                    tableContent += '| ' + row.join(' | ') + ' |\n';
                });
                tableContent += '\n### Records:\n\n';
                table.data.rows.forEach((row, idx) => {
                    tableContent += `**Record ${idx + 1}:**\n`;
                    table.data.headers.forEach((h, j) => {
                        if (row[j]) tableContent += `- ${h}: ${row[j]}\n`;
                    });
                    tableContent += '\n';
                });
                
                await fetch(API + '/api/tools/' + toolId + '/table-entry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        source: table.name, 
                        content: tableContent,
                        table_data: table.data
                    })
                });
            }
        }
        
        updateProgress(100, isEditing ? '✅ Tool updated!' : '✅ Done!');
        
        // Reset wizard entries
        wizTextEntries = [];
        wizTableEntries = [];
        
        // Show success notification
        showToast(isEditing ? 'Tool updated successfully!' : 'Tool created successfully!', 'success');
        
        // Reset editing state
        const savedToolId = toolId;
        const wasEditing = isEditing;
        const meta = toolMeta[wizState.type];
        editingToolId = null;
        
        setTimeout(() => {
            hideProgressModal();
            closeWizard();
            loadTools();
            
            // For tools with noTestStep: always show tool detail for testing
            // For new tools with test step: show tool detail
            // For updates: just show success toast and stay on tools list
            if (savedToolId && (meta?.noTestStep || !wasEditing)) {
                viewTool(savedToolId);
            } else if (wasEditing) {
                showToast('Tool updated successfully!', 'success');
            }
        }, 500);
        
    } catch (e) {
        hideProgressModal();
        console.error(isEditing ? 'Error updating tool:' : 'Error creating tool:', e);
        editingToolId = null; // Reset on error too
        if (e.name === 'AbortError') {
            alert('Request timed out. Please try again.');
        } else {
            alert((isEditing ? 'Error updating tool: ' : 'Error creating tool: ') + (e.message || 'Unknown error'));
        }
    }
}

// File handling
function handleWizFiles(event) {
    const files = Array.from(event.target.files);
    wizState.data.files.push(...files);
    renderWizFiles();
}

function renderWizFiles() {
    const list = document.getElementById('wiz-files-list');
    list.innerHTML = wizState.data.files.map((f, i) => `
        <div class="flex items-center justify-between bg-gray-800 rounded-lg p-2">
            <div class="flex items-center gap-2 min-w-0">
                <span>${getFileIcon(f.name)}</span>
                <span class="text-sm truncate">${f.name}</span>
                <span class="text-xs text-gray-500">(${formatSize(f.size)})</span>
            </div>
            <button onclick="removeWizFile(${i})" class="text-gray-500 hover:text-red-400 p-1">✕</button>
        </div>
    `).join('');
}

function removeWizFile(idx) {
    wizState.data.files.splice(idx, 1);
    renderWizFiles();
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙', txt: '📄', csv: '📊', md: '📝' };
    return icons[ext] || '📄';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// URL handling
function addWizUrl() {
    const input = document.getElementById('wiz-url-input');
    const url = input.value.trim();
    if (url && url.startsWith('http')) {
        wizState.data.urls.push(url);
        input.value = '';
        renderWizUrls();
    }
}

function renderWizUrls() {
    const list = document.getElementById('wiz-urls-list');
    list.innerHTML = wizState.data.urls.map((url, i) => `
        <div class="flex items-center justify-between bg-gray-800 rounded-lg p-2">
            <div class="flex items-center gap-2 min-w-0">
                <span>🔗</span>
                <span class="text-sm truncate">${url}</span>
            </div>
            <button onclick="removeWizUrl(${i})" class="text-gray-500 hover:text-red-400 p-1">✕</button>
        </div>
    `).join('');
}

function removeWizUrl(idx) {
    wizState.data.urls.splice(idx, 1);
    renderWizUrls();
}

// Source tabs
function setSourceTab(tab) {
    const tabs = ['docs', 'urls', 'text', 'table'];
    
    tabs.forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        const sourceEl = document.getElementById('sources-' + t);
        
        if (tabEl) {
            tabEl.classList.toggle('border-purple-500', tab === t);
            tabEl.classList.toggle('text-white', tab === t);
            tabEl.classList.toggle('border-transparent', tab !== t);
            tabEl.classList.toggle('text-gray-400', tab !== t);
        }
        
        if (sourceEl) {
            sourceEl.classList.toggle('hidden', tab !== t);
        }
    });
    
    // Initialize table editor if switching to table tab
    if (tab === 'table' && !wizState.tableData) {
        wizState.tableData = { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] };
        renderWizTableEditor();
    }
}

// Wizard Text Entry functions
let wizTextEntries = [];

function addWizTextEntry() {
    const title = document.getElementById('wiz-text-title')?.value?.trim();
    const content = document.getElementById('wiz-text-content')?.value?.trim();
    
    if (!title || !content) {
        alert('Please enter both title and content');
        return;
    }
    
    wizTextEntries.push({ title, content });
    document.getElementById('wiz-text-title').value = '';
    document.getElementById('wiz-text-content').value = '';
    renderWizTextList();
}

function renderWizTextList() {
    const list = document.getElementById('wiz-text-list');
    if (!list) return;
    
    list.innerHTML = wizTextEntries.map((e, i) => `
        <div class="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <div class="flex items-center gap-2 min-w-0">
                <span>📝</span>
                <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${escHtml(e.title)}</p>
                    <p class="text-xs text-gray-500">${e.content.length} characters</p>
                </div>
            </div>
            <button onclick="removeWizTextEntry(${i})" class="text-red-400 hover:text-red-300 p-1">🗑️</button>
        </div>
    `).join('');
}

function removeWizTextEntry(idx) {
    wizTextEntries.splice(idx, 1);
    renderWizTextList();
}

// Wizard Table functions
let wizTableEntries = [];

function renderWizTableEditor() {
    const container = document.getElementById('wiz-table-editor');
    if (!container || !wizState.tableData) return;
    
    let html = '<table class="w-full border-collapse text-sm">';
    
    // Headers row
    html += '<tr>';
    wizState.tableData.headers.forEach((h, i) => {
        html += `<th class="border border-gray-600 p-0">
            <input type="text" value="${escHtml(h)}" 
                   onchange="wizState.tableData.headers[${i}]=this.value" 
                   class="w-full bg-gray-700 text-white font-semibold px-2 py-1.5 text-center outline-none focus:bg-gray-600 text-xs"
                   placeholder="Header">
        </th>`;
    });
    html += '</tr>';
    
    // Data rows
    wizState.tableData.rows.forEach((row, ri) => {
        html += '<tr>';
        row.forEach((cell, ci) => {
            html += `<td class="border border-gray-700 p-0">
                <input type="text" value="${escHtml(cell)}" 
                       onchange="wizState.tableData.rows[${ri}][${ci}]=this.value"
                       class="w-full bg-gray-800 px-2 py-1.5 outline-none focus:bg-gray-700 text-xs">
            </td>`;
        });
        html += '</tr>';
    });
    
    html += '</table>';
    container.innerHTML = html;
    
    // Update counters
    const colCount = document.getElementById('wiz-col-count');
    const rowCount = document.getElementById('wiz-row-count');
    if (colCount) colCount.textContent = wizState.tableData.headers.length;
    if (rowCount) rowCount.textContent = wizState.tableData.rows.length;
}

function changeWizTableCols(delta) {
    if (!wizState.tableData) return;
    const newCount = wizState.tableData.headers.length + delta;
    if (newCount < 1 || newCount > 10) return;
    
    if (delta > 0) {
        wizState.tableData.headers.push('Column ' + newCount);
        wizState.tableData.rows.forEach(row => row.push(''));
    } else {
        wizState.tableData.headers.pop();
        wizState.tableData.rows.forEach(row => row.pop());
    }
    renderWizTableEditor();
}

function changeWizTableRows(delta) {
    if (!wizState.tableData) return;
    const newCount = wizState.tableData.rows.length + delta;
    if (newCount < 1 || newCount > 20) return;
    
    if (delta > 0) {
        wizState.tableData.rows.push(new Array(wizState.tableData.headers.length).fill(''));
    } else {
        wizState.tableData.rows.pop();
    }
    renderWizTableEditor();
}

function importWizTableFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            parseWizCSV(e.target.result);
        };
        reader.readAsText(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!window.XLSX) {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    document.head.appendChild(script);
                    await new Promise(r => script.onload = r);
                }
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                
                if (jsonData.length > 0) {
                    wizState.tableData = {
                        headers: jsonData[0].map(h => String(h || '')),
                        rows: jsonData.slice(1).map(row => 
                            jsonData[0].map((_, i) => String(row[i] || ''))
                        )
                    };
                    if (wizState.tableData.rows.length === 0) {
                        wizState.tableData.rows = [new Array(wizState.tableData.headers.length).fill('')];
                    }
                    renderWizTableEditor();
                    
                    // Auto-fill table name
                    const tableName = document.getElementById('wiz-table-name');
                    if (tableName && !tableName.value) {
                        tableName.value = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
                    }
                }
            } catch (err) {
                alert('Failed to parse file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

function parseWizCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return;
    
    const parseRow = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };
    
    wizState.tableData = {
        headers: parseRow(lines[0]),
        rows: lines.slice(1).map(line => {
            const row = parseRow(line);
            while (row.length < wizState.tableData.headers.length) row.push('');
            return row.slice(0, wizState.tableData.headers.length);
        })
    };
    
    if (wizState.tableData.rows.length === 0) {
        wizState.tableData.rows = [new Array(wizState.tableData.headers.length).fill('')];
    }
    
    renderWizTableEditor();
}

function addWizTableEntry() {
    const tableName = document.getElementById('wiz-table-name')?.value?.trim();
    if (!tableName) {
        alert('Please enter a table name');
        return;
    }
    if (!wizState.tableData || wizState.tableData.headers.length === 0) {
        alert('Please create a table first');
        return;
    }
    
    wizTableEntries.push({
        name: tableName,
        data: JSON.parse(JSON.stringify(wizState.tableData))
    });
    
    // Reset
    document.getElementById('wiz-table-name').value = '';
    wizState.tableData = { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] };
    renderWizTableEditor();
    renderWizTableList();
}

function renderWizTableList() {
    const list = document.getElementById('wiz-table-list');
    if (!list) return;
    
    list.innerHTML = wizTableEntries.map((e, i) => `
        <div class="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <div class="flex items-center gap-2 min-w-0">
                <span>📊</span>
                <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${escHtml(e.name)}</p>
                    <p class="text-xs text-gray-500">${e.data.headers.length} cols × ${e.data.rows.length} rows</p>
                </div>
            </div>
            <button onclick="removeWizTableEntry(${i})" class="text-red-400 hover:text-red-300 p-1">🗑️</button>
        </div>
    `).join('');
}

function removeWizTableEntry(idx) {
    wizTableEntries.splice(idx, 1);
    renderWizTableList();
}

// Config helpers
function toggleKBEmb() {
    const useGlobal = document.getElementById('kb-emb-global').checked;
    document.getElementById('kb-emb-fields').classList.toggle('hidden', useGlobal);
}

function onKBEmbChange() {
    const provider = document.getElementById('kb-emb-provider').value;
    // Update model options based on provider
}

function onDBTypeChange() {
    const type = document.getElementById('db-type').value;
    const ports = {
        postgresql: 5432, mysql: 3306, mssql: 1433, sqlite: '', 
        oracle: 1521, oracle_autonomous: 1522, db2: 50000, sybase: 5000, 
        teradata: 1025, azure_sql: 1433, cockroachdb: 26257, tidb: 4000,
        snowflake: 443, redshift: 5439, bigquery: 443,
        mongodb: 27017, mongodb_atlas: 27017, dynamodb: 443, cosmosdb: 443,
        firestore: 443, couchdb: 5984, cassandra: 9042, scylladb: 9042, hbase: 9090,
        redis: 6379, memcached: 11211, elasticache: 6379,
        elasticsearch: 9200, opensearch: 9200, solr: 8983, meilisearch: 7700,
        pinecone: 443, weaviate: 8080, qdrant: 6333, milvus: 19530, chroma: 8000,
        influxdb: 8086, timescaledb: 5432, questdb: 9000,
        neo4j: 7687, neptune: 8182, arangodb: 8529
    };
    document.getElementById('db-port').value = ports[type] || 5432;
    
    // Show/hide specific field sections
    const isOracle = type === 'oracle';
    const isOracleADB = type === 'oracle_autonomous';
    const isCloudDW = ['snowflake', 'bigquery', 'redshift'].includes(type);
    const isNoSQL = ['mongodb', 'mongodb_atlas', 'couchdb', 'dynamodb', 'cosmosdb', 'firestore'].includes(type);
    const isVector = ['pinecone', 'weaviate', 'qdrant', 'milvus', 'chroma'].includes(type);
    
    document.getElementById('db-standard-fields')?.classList.toggle('hidden', isOracleADB || isCloudDW || isVector);
    document.getElementById('db-oracle-fields')?.classList.toggle('hidden', !isOracle);
    document.getElementById('db-oracle-adb-fields')?.classList.toggle('hidden', !isOracleADB);
    document.getElementById('db-cloud-fields')?.classList.toggle('hidden', !isCloudDW);
    document.getElementById('db-nosql-fields')?.classList.toggle('hidden', !isNoSQL);
    document.getElementById('db-vector-fields')?.classList.toggle('hidden', !isVector);
    document.getElementById('db-snowflake-extra')?.classList.toggle('hidden', type !== 'snowflake');
}

function onOracleConnTypeChange() {
    const type = document.getElementById('oracle-conn-type')?.value;
    document.getElementById('oracle-service-field')?.classList.toggle('hidden', type !== 'basic');
    document.getElementById('oracle-tns-field')?.classList.toggle('hidden', type !== 'tns');
    document.getElementById('oracle-wallet-fields')?.classList.toggle('hidden', type !== 'wallet');
}

function onApiAuthChange() {
    const auth = document.getElementById('api-auth').value;
    document.getElementById('api-auth-val-group').classList.toggle('hidden', auth === 'none');
}

// ============================================================================
// EMAIL CONFIGURATION (Simple & User-Friendly)
// ============================================================================
// EMAIL INTEGRATION - Simple OAuth Flow for End Users
// ============================================================================

// Connect email provider via OAuth
async function connectEmailProvider(provider) {
    const btnId = provider === 'google' ? 'gmail-connect-btn' : 'outlook-connect-btn';
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    
    // Show loading
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Connecting...';
    btn.disabled = true;
    
    try {
        // Request OAuth URL from backend
        const endpoint = provider === 'google' ? '/api/oauth/google/email/url' : '/api/oauth/microsoft/email/url';
        const res = await fetch(endpoint);
        
        if (!res.ok) {
            // OAuth not configured - show admin message
            showOAuthNotConfigured(provider);
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        const data = await res.json();
        console.log("Login response:", data);
        
        // Open OAuth popup
        const popup = window.open(
            data.url, 
            `${provider} Login`, 
            'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
        );
        
        // Listen for OAuth completion
        const handleMessage = (event) => {
            if (event.data.type === `${provider}-oauth-success`) {
                window.removeEventListener('message', handleMessage);
                // Pass tokens along with email
                onEmailConnected(provider, event.data.email, {
                    access_token: event.data.access_token,
                    refresh_token: event.data.refresh_token
                });
                btn.innerHTML = originalText;
                btn.disabled = false;
            } else if (event.data.type === `${provider}-oauth-error`) {
                window.removeEventListener('message', handleMessage);
                showToast('Connection failed. Please try again.', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Timeout after 2 minutes
        setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            if (btn.disabled) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }, 120000);
        
    } catch (err) {
        console.error('OAuth error:', err);
        showOAuthNotConfigured(provider);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Handle successful email connection
function onEmailConnected(provider, email, tokens = {}) {
    const cardId = provider === 'google' ? 'gmail' : 'outlook';
    const card = document.getElementById(`${cardId}-connect-card`);
    const btn = document.getElementById(`${cardId}-connect-btn`);
    const connected = document.getElementById(`${cardId}-connected`);
    const emailEl = document.getElementById(`${cardId}-connected-email`);
    
    if (!card || !btn || !connected || !emailEl) return;
    
    // Update UI
    card.classList.add('border-green-500');
    btn.classList.add('hidden');
    connected.classList.remove('hidden');
    emailEl.textContent = email;
    
    // Store config with tokens
    const emailConfig = { 
        provider, 
        email,
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || ''
    };
    
    const providerEl = document.getElementById('email-provider');
    const configEl = document.getElementById('email-config-data');
    if (providerEl) providerEl.value = provider;
    if (configEl) configEl.value = JSON.stringify(emailConfig);
    
    // Update wizard state with tokens
    if (typeof wizState !== 'undefined' && wizState.data) {
        wizState.data.config = wizState.data.config || {};
        wizState.data.config = emailConfig;
    }
    
    console.log('Email connected:', { provider, email, hasTokens: !!tokens.access_token });
    showToast(`Connected to ${email}`, 'success');
}

// Disconnect email provider
function disconnectEmailProvider(provider) {
    const cardId = provider === 'google' ? 'gmail' : 'outlook';
    const card = document.getElementById(`${cardId}-connect-card`);
    const btn = document.getElementById(`${cardId}-connect-btn`);
    const connected = document.getElementById(`${cardId}-connected`);
    
    if (!card || !btn || !connected) return;
    
    // Reset UI
    card.classList.remove('border-green-500');
    btn.classList.remove('hidden');
    connected.classList.add('hidden');
    
    // Clear config
    const providerEl = document.getElementById('email-provider');
    const configEl = document.getElementById('email-config-data');
    if (providerEl) providerEl.value = '';
    if (configEl) configEl.value = '';
    
    showToast('Email disconnected', 'info');
}

// Show message when OAuth is not configured (for platform admin)
function showOAuthNotConfigured(provider) {
    const providerName = provider === 'google' ? 'Google' : 'Microsoft';
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4';
    modal.id = 'oauth-config-modal';
    modal.innerHTML = `
        <div class="modal-content-box rounded-2xl w-full max-w-md overflow-hidden">
            <div class="p-6 text-center">
                <div class="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                    <span class="text-3xl">⚙️</span>
                </div>
                <h3 class="text-xl font-bold mb-2" style="color:var(--text-primary);">Setup Required</h3>
                <p class="mb-6" style="color:var(--text-secondary);">
                    ${providerName} integration needs to be configured by the administrator.
                </p>
                <p class="text-sm mb-6" style="color:var(--text-muted);">
                    Go to <strong>Settings → Integrations</strong> to set up ${providerName} OAuth credentials.
                </p>
                <button onclick="document.getElementById('oauth-config-modal').remove()" 
                        class="btn-primary px-8 py-3 rounded-lg">
                    Got it
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Toggle SendGrid setup panel
function toggleSendGridSetup() {
    const setup = document.getElementById('sendgrid-setup');
    const btn = document.getElementById('sendgrid-setup-btn');
    if (!setup || !btn) return;
    
    const isHidden = setup.classList.contains('hidden');
    setup.classList.toggle('hidden');
    btn.textContent = isHidden ? 'Cancel' : 'Setup';
}

// Save SendGrid configuration
function saveSendGridConfig() {
    const apiKey = document.getElementById('sendgrid-api-key')?.value;
    const fromEmail = document.getElementById('sendgrid-from-email')?.value;
    
    if (!apiKey || !fromEmail) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    // Update UI
    const card = document.getElementById('sendgrid-connect-card');
    if (card) card.classList.add('border-green-500');
    
    // Store config
    const providerEl = document.getElementById('email-provider');
    const configEl = document.getElementById('email-config-data');
    if (providerEl) providerEl.value = 'sendgrid';
    if (configEl) configEl.value = JSON.stringify({ provider: 'sendgrid', apiKey, fromEmail });
    
    // Hide setup and show connected state
    const setup = document.getElementById('sendgrid-setup');
    const btn = document.getElementById('sendgrid-setup-btn');
    if (setup) setup.classList.add('hidden');
    if (btn) {
        btn.textContent = 'Connected ✓';
        btn.disabled = true;
        btn.classList.remove('btn-secondary');
        btn.classList.add('bg-green-500/20', 'text-green-400', 'cursor-default');
    }
    
    // Update wizard state
    if (typeof wizState !== 'undefined' && wizState.data) {
        wizState.data.config = wizState.data.config || {};
        wizState.data.config.email = { provider: 'sendgrid', apiKey, fromEmail };
    }
    
    showToast('SendGrid configured successfully', 'success');
}

// Get email configuration (for saving tool)
function getEmailConfig() {
    const configData = document.getElementById('email-config-data')?.value;
    if (configData) {
        try {
            return JSON.parse(configData);
        } catch (e) {}
    }
    return null;
}

// Legacy functions for compatibility
function toggleEmailProvider(provider) {}
function onEmailProviderSelect() {}
function onEmailProvChange() {}

function onSheetProvChange() {
    const p = document.getElementById('sheet-provider').value;
    document.getElementById('sheet-google-fields').classList.toggle('hidden', p !== 'google');
    document.getElementById('sheet-airtable-fields').classList.toggle('hidden', p !== 'airtable');
}

function onStorageTypeChange() {
    const type = document.getElementById('storage-type')?.value;
    document.getElementById('storage-cloud-section')?.classList.toggle('hidden', type !== 'cloud');
    document.getElementById('storage-local-section')?.classList.toggle('hidden', type !== 'local');
}

function onStorageProvChange() {
    const p = document.getElementById('storage-provider')?.value;
    const isOCI = p?.startsWith('oci_');
    const isAzure = p?.startsWith('azure_');
    const isGCS = p?.startsWith('gcs');
    const needsEndpoint = ['minio', 'digitalocean_spaces', 'backblaze_b2', 'wasabi', 'cloudflare_r2', 'linode_obj', 'vultr_obj'].includes(p);
    
    document.getElementById('storage-s3-fields')?.classList.toggle('hidden', isOCI || isAzure || isGCS);
    document.getElementById('storage-oci-fields')?.classList.toggle('hidden', !isOCI);
    document.getElementById('storage-azure-fields')?.classList.toggle('hidden', !isAzure);
    document.getElementById('storage-gcs-fields')?.classList.toggle('hidden', !isGCS);
    document.getElementById('storage-endpoint-field')?.classList.toggle('hidden', !needsEndpoint);
}

function onLocalStorageTypeChange() {
    const type = document.getElementById('local-storage-type')?.value;
    const isLocal = type === 'local';
    document.getElementById('local-path-field')?.classList.toggle('hidden', !isLocal);
    document.getElementById('network-storage-fields')?.classList.toggle('hidden', isLocal);
    document.getElementById('sftp-key-field')?.classList.toggle('hidden', type !== 'sftp');
    
    // Update port based on protocol
    const ports = { nfs: 2049, smb: 445, sftp: 22, ftp: 21, webdav: 443 };
    const portEl = document.getElementById('net-port');
    if (portEl && ports[type]) portEl.value = ports[type];
}

function onAzureAuthChange() {
    const type = document.getElementById('azure-auth-type')?.value;
    const isConnString = type === 'connection_string' || type === 'account_key' || type === 'sas_token';
    document.getElementById('azure-conn-string-field')?.classList.toggle('hidden', !isConnString);
    document.getElementById('azure-sp-fields')?.classList.toggle('hidden', type !== 'service_principal');
}

function onCRMChange() {
    const p = document.getElementById('crm-platform').value;
    document.getElementById('crm-salesforce-fields')?.classList.toggle('hidden', p !== 'salesforce');
    document.getElementById('crm-hubspot-fields')?.classList.toggle('hidden', p !== 'hubspot');
}

function onMsgPlatformChange() {
    const p = document.getElementById('msg-platform').value;
    
    // Hide all platform-specific fields first
    const platforms = ['slack', 'teams', 'whatsapp', 'facebook', 'telegram', 'twilio', 'discord', 'firebase', 'generic'];
    platforms.forEach(plat => {
        document.getElementById(`msg-${plat}-fields`)?.classList.add('hidden');
    });
    
    // Show relevant fields
    if (p === 'slack') document.getElementById('msg-slack-fields')?.classList.remove('hidden');
    else if (p === 'teams') document.getElementById('msg-teams-fields')?.classList.remove('hidden');
    else if (p === 'whatsapp') document.getElementById('msg-whatsapp-fields')?.classList.remove('hidden');
    else if (p === 'facebook' || p === 'instagram') document.getElementById('msg-facebook-fields')?.classList.remove('hidden');
    else if (p === 'telegram') document.getElementById('msg-telegram-fields')?.classList.remove('hidden');
    else if (p === 'twilio' || p === 'vonage' || p === 'plivo' || p === 'messagebird' || p === 'sinch') document.getElementById('msg-twilio-fields')?.classList.remove('hidden');
    else if (p === 'discord') document.getElementById('msg-discord-fields')?.classList.remove('hidden');
    else if (p === 'firebase_fcm' || p === 'onesignal' || p === 'pusher') document.getElementById('msg-firebase-fields')?.classList.remove('hidden');
    else document.getElementById('msg-generic-fields')?.classList.remove('hidden');
}

function onTeamsTypeChange() {
    const type = document.getElementById('teams-type')?.value;
    document.getElementById('teams-webhook-field')?.classList.toggle('hidden', type !== 'webhook');
    document.getElementById('teams-bot-fields')?.classList.toggle('hidden', type !== 'bot' && type !== 'graph');
}

function onWhatsAppProviderChange() {
    const p = document.getElementById('whatsapp-provider')?.value;
    document.getElementById('whatsapp-meta-fields')?.classList.toggle('hidden', p !== 'meta');
}

function onSTTProviderChange() {
    const p = document.getElementById('stt-provider')?.value;
    const isOCI = p === 'oci_speech';
    const isAzure = p === 'azure';
    const isLocal = ['whisper_local', 'vosk', 'deepspeech', 'kaldi', 'coqui'].includes(p);
    
    document.getElementById('stt-cloud-fields')?.classList.toggle('hidden', isOCI || isAzure || isLocal);
    document.getElementById('stt-oci-fields')?.classList.toggle('hidden', !isOCI);
    document.getElementById('stt-azure-fields')?.classList.toggle('hidden', !isAzure);
    document.getElementById('stt-local-fields')?.classList.toggle('hidden', !isLocal);
}

function onTTSProviderChange() {
    const p = document.getElementById('tts-provider')?.value;
    const isOCI = p === 'oci_speech';
    const isLocal = ['coqui_tts', 'piper', 'espeak', 'festival', 'mimic'].includes(p);
    
    document.getElementById('tts-cloud-fields')?.classList.toggle('hidden', isOCI || isLocal);
    document.getElementById('tts-oci-fields')?.classList.toggle('hidden', !isOCI);
    document.getElementById('tts-local-fields')?.classList.toggle('hidden', !isLocal);
}

function onOCRProviderChange() {
    const p = document.getElementById('ocr-provider')?.value;
    const isOCI = p === 'oci_vision' || p === 'oci_doc';
    const isLocal = ['tesseract', 'paddleocr', 'easyocr', 'doctr', 'surya'].includes(p);
    
    document.getElementById('ocr-cloud-fields')?.classList.toggle('hidden', isOCI || isLocal);
    document.getElementById('ocr-oci-fields')?.classList.toggle('hidden', !isOCI);
    document.getElementById('ocr-local-fields')?.classList.toggle('hidden', !isLocal);
}

// Code Execution Functions
function onCodeModeChange() {
    const mode = document.getElementById('code-mode')?.value;
    document.getElementById('code-gen-section')?.classList.toggle('hidden', mode === 'execute');
    document.getElementById('code-manual-section')?.classList.toggle('hidden', mode === 'generate');
    document.getElementById('code-manual-input')?.classList.toggle('hidden', mode === 'generate');
}

async function generateToolCode() {
    const description = document.getElementById('code-description')?.value;
    const inputs = document.getElementById('code-inputs')?.value;
    const outputFormat = document.getElementById('code-output-format')?.value;
    const lang = document.getElementById('code-lang')?.value || 'python';
    
    if (!description) {
        alert('Please provide a tool description');
        return;
    }
    
    try {
        const btn = event.target;
        btn.disabled = true;
        btn.innerHTML = '<span class="animate-spin">⏳</span> Generating...';
        
        const response = await fetch(API + '/api/tools/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description, inputs, output_format: outputFormat, language: lang })
        });
        
        const data = await response.json();
        
        if (data.code) {
            document.getElementById('code-generated').value = data.code;
            document.getElementById('generated-code-preview').classList.remove('hidden');
        } else {
            alert('Failed to generate code: ' + (data.error || 'Unknown error'));
        }
        
        btn.disabled = false;
        btn.innerHTML = '<span>✨</span> Generate Code';
    } catch (e) {
        console.error('Code generation error:', e);
        alert('Error generating code: ' + e.message);
    }
}

// Human in the Loop Functions
function onHITLTypeChange() {
    const type = document.getElementById('hitl-type')?.value;
    
    document.getElementById('hitl-approval-fields')?.classList.toggle('hidden', type !== 'approval');
    document.getElementById('hitl-selection-fields')?.classList.toggle('hidden', type !== 'selection');
    document.getElementById('hitl-form-fields')?.classList.toggle('hidden', type !== 'form');
}

function addHITLFormField() {
    const template = document.getElementById('hitl-field-template');
    const builder = document.getElementById('hitl-form-builder');
    if (!template || !builder) return;
    
    const clone = template.content.cloneNode(true);
    builder.appendChild(clone);
}

function removeHITLFormField(btn) {
    btn.closest('.hitl-field-item')?.remove();
}

function onHITLFieldTypeChange(select) {
    const type = select.value;
    const container = select.closest('.hitl-field-item');
    const optionsField = container?.querySelector('.hitl-field-options');
    
    if (optionsField) {
        optionsField.classList.toggle('hidden', !['select', 'radio', 'checkbox'].includes(type));
    }
}

function toggleHITLDeployment() {
    const checked = document.getElementById('hitl-deploy-form')?.checked;
    document.getElementById('hitl-deployment-fields')?.classList.toggle('hidden', !checked);
}

// TTS speed/pitch display
function updateTTSDisplay() {
    const speed = document.getElementById('tts-speed')?.value || 1;
    const pitch = document.getElementById('tts-pitch')?.value || 1;
    document.getElementById('tts-speed-val').textContent = speed + 'x';
    document.getElementById('tts-pitch-val').textContent = pitch + 'x';
}

// ============================================================================
// AUTHENTICATION & SECURITY FUNCTIONS
// ============================================================================

// Auth state
let authToken = localStorage.getItem('agentforge_token') || null;
let currentUser = JSON.parse(localStorage.getItem('agentforge_user') || 'null');
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
    
    const email = document.getElementById('login-email').value;
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
            body: JSON.stringify({ email, password, remember_me: remember, mfa_code: mfaCode || undefined })
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
            window.pendingLoginEmail = email;
            window.pendingLoginPassword = password;
            window.pendingLoginRemember = remember;
            window.pendingMfaMethods = data.mfa_methods || data.mfa_methods || [];
            
            console.log("📋 [FRONTEND] Stored pending login data:");
            console.log("   Email:", window.pendingLoginEmail);
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
    
    // Get email to display (mask for privacy)
    const email = window.pendingMfaEmail || window.pendingLoginEmail || 'your email';
    const maskEmail = (email) => {
        if (!email || email === 'your email') return email;
        const [local, domain] = email.split('@');
        if (local.length <= 2) return email;
        const visible = local.substring(0, 2);
        const masked = '*'.repeat(Math.min(local.length - 2, 4));
        return `${visible}${masked}@${domain}`;
    };
    const displayEmail = maskEmail(email);
    
    console.log("📝 [FRONTEND] Setting modal innerHTML...");
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-md mx-4">
            <div class="text-center mb-6">
                <div class="text-5xl mb-3">🔐</div>
                <h3 class="text-xl font-bold mb-2">Two-Factor Authentication</h3>
                <p class="text-gray-400 text-sm">Enter the 6-digit code sent to</p>
                <p class="text-purple-400 font-semibold text-sm mt-1" id="mfa-email-display" title="${email}">${displayEmail}</p>
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
    window.pendingLoginEmail = null;
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
                    email: window.pendingLoginEmail,
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
                    email: window.pendingLoginEmail,
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
        console.warn('⚠️ [getAuthHeaders] No authToken available. Checking localStorage...');
        const storedToken = localStorage.getItem('agentforge_token');
        if (storedToken) {
            console.log('✅ [getAuthHeaders] Found token in localStorage, updating authToken');
            authToken = storedToken;
            return { 'Authorization': 'Bearer ' + authToken };
        } else {
            console.warn('⚠️ [getAuthHeaders] No token found in localStorage either');
        }
    }
    return headers;
}

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
    const subs = ['departments', 'managers', 'orgchart', 'directory'];
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
    if (sub === 'managers') renderOrgManagerTable();
    if (sub === 'departments') renderOrgDepartments();
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
        if (mgrRes.ok) {
            showToast('Manager assignment saved!', 'success');
            // Update cache
            const idx = orgUsersCache.findIndex(u => u.id === userId);
            if (idx >= 0) {
                orgUsersCache[idx].manager_id = managerId;
                orgUsersCache[idx].employee_id = employeeId;
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
        const res = await fetch('/api/process/approvals', { headers: getAuthHeaders() });
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
    const comment = prompt(decision === 'approved' ? 'Add a comment (optional):' : 'Reason for rejection (optional):') || '';
    try {
        const res = await fetch(`/api/process/approvals/${approvalId}/decide`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision, comment })
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
            const res = await fetch('/api/process/approvals', { headers: getAuthHeaders() });
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
            const res = await fetch('/api/process/approvals', { headers: getAuthHeaders() });
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

// Edit security user
function editSecurityUser(userId) {
    const user = securityUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm';
    modal.id = 'edit-user-modal';
    modal.innerHTML = `
        <div class="card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 class="text-xl font-bold mb-4">Edit User</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Email</label>
                    <input type="email" id="edit-user-email" value="${user.email}" class="input-field w-full px-4 py-2 rounded-lg" disabled>
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
                <div>
                    <label class="block text-sm text-gray-400 mb-2">Custom Profile Fields</label>
                    <p class="text-xs text-gray-500 mb-2">Add any custom attributes (e.g., National ID, Badge Number, Office Location). These are automatically available for process forms and AI-generated workflows.</p>
                    <div id="edit-user-custom-fields" class="space-y-2">
                        ${(() => {
                            const meta = user.user_metadata || user.custom_attributes || {};
                            const entries = Object.entries(meta).filter(([k,v]) => v !== null && v !== undefined);
                            if (!entries.length) return '<div class="text-xs text-gray-500 italic" id="no-custom-fields-msg">No custom fields yet.</div>';
                            return entries.map(([k, v], i) => `
                                <div class="flex gap-2 items-center" data-custom-row="${i}">
                                    <input type="text" value="${escapeHtml(k)}" placeholder="Field name" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 custom-field-key">
                                    <input type="text" value="${escapeHtml(String(v))}" placeholder="Value" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 custom-field-val">
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

// Add a new custom field row in the edit user modal
function addCustomFieldRow() {
    const container = document.getElementById('edit-user-custom-fields');
    if (!container) return;
    const noMsg = document.getElementById('no-custom-fields-msg');
    if (noMsg) noMsg.remove();
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    row.innerHTML = `
        <input type="text" placeholder="Field name (e.g., national_id)" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 custom-field-key">
        <input type="text" placeholder="Value" class="input-field px-3 py-1.5 rounded-lg text-sm flex-1 custom-field-val">
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
    const firstName = document.getElementById('edit-user-firstname').value?.trim() || '';
    const lastName = document.getElementById('edit-user-lastname').value?.trim() || '';
    const status = document.getElementById('edit-user-status').value;
    const roleCheckboxes = document.querySelectorAll('#edit-user-roles input[type="checkbox"]:checked');
    const roleIds = Array.from(roleCheckboxes).map(cb => cb.value);
    
    const customFields = collectCustomFields();
    console.log('📝 Saving user edit:', { firstName, lastName, status, roleIds, customFields });
    
    try {
        const res = await fetch('/api/security/users/' + userId, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
    if (!confirm('Delete this invitation?')) return;
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
    
    if (!confirm('Are you sure you want to delete the role "' + role.name + '"?')) return;
    
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
        
        const firstNameInput = document.getElementById('update-first-name');
        const lastNameInput = document.getElementById('update-last-name');
        const displayNameInput = document.getElementById('update-display-name');
        
        console.log('📝 Profile Update Debug:');
        console.log('   First Name Input:', firstNameInput, '=', firstNameInput?.value);
        console.log('   Last Name Input:', lastNameInput, '=', lastNameInput?.value);
        console.log('   Display Name Input:', displayNameInput, '=', displayNameInput?.value);
        
        const firstName = firstNameInput?.value?.trim() || '';
        const lastName = lastNameInput?.value?.trim() || '';
        const displayName = displayNameInput?.value?.trim() || '';
        
        // IMPORTANT: Send empty string as is, not null, so it can update to empty
        const requestBody = {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName || null
        };
        
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
