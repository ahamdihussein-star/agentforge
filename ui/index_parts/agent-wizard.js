// Auto-generated from ui/index.js
// Part 004: lines 5406-10347
// DO NOT reorder parts.

        
        // Toggle tool selection in modal
        function toggleModalToolSelection(type, toolId, element, color = 'purple') {
            const container = document.getElementById('available-tools-list');
            const toolsData = container._toolsData || [];
            const toolData = toolsData.find(t => t.id === toolId);
            const checkbox = element.querySelector('input[type="checkbox"]');
            
            // Prevent selecting tools the user can't execute
            try {
                if (toolData && Object.prototype.hasOwnProperty.call(toolData, 'can_execute') && toolData.can_execute === false) {
                    showToast('You do not have permission to use this tool. Ask the tool owner to grant Execute access.', 'warning');
                    return;
                }
            } catch (_) {
                // ignore
            }
            
            // Map type to correct array
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
            const arrayKey = typeToArray[type] || 'apis';
            const targetArray = tempToolSelection[arrayKey];
            
            if (!targetArray) {
                console.error('Unknown tool type:', type);
                return;
            }
            
            const idx = targetArray.findIndex(t => t.id === toolId);
            if (idx >= 0) {
                // Remove
                targetArray.splice(idx, 1);
                element.className = element.className.replace(/bg-\w+-500\/20/g, 'bg-gray-800/50');
                element.className = element.className.replace(/border-\w+-500\/50/g, 'border-transparent');
                if (checkbox) checkbox.checked = false;
            } else if (toolData) {
                // Add
                targetArray.push(toolData);
                element.classList.remove('bg-gray-800/50', 'border-transparent');
                element.classList.add(`bg-${color}-500/20`, `border-${color}-500/50`);
                if (checkbox) checkbox.checked = true;
            }
        }
        
        // Confirm tool selection
        function confirmToolSelection() {
            selectedDemoTools = {
                apis: [...tempToolSelection.apis],
                knowledge_bases: [...tempToolSelection.knowledge_bases],
                emails: [...tempToolSelection.emails],
                webhooks: [...tempToolSelection.webhooks],
                slacks: [...tempToolSelection.slacks],
                calendars: [...tempToolSelection.calendars],
                databases: [...tempToolSelection.databases],
                websearches: [...tempToolSelection.websearches],
                websites: [...tempToolSelection.websites]
            };
            closeSelectToolModal();
            updateSelectedToolsList();
            
            // Update wizard.tool_ids immediately
            syncToolsToWizard();
            
            // Trigger auto-save
            triggerAutoSave();
        }
        
        // Sync selectedDemoTools to wizard.tool_ids
        function syncToolsToWizard() {
            wizard.tool_ids = [];
            
            console.log('🔄 syncToolsToWizard called');
            console.log('   selectedDemoTools:', JSON.stringify(selectedDemoTools, null, 2));
            
            // Add all tool types with their actual IDs (no prefix for non-demo tools)
            const addTools = (tools, prefix = '', typeName = '') => {
                console.log(`   Processing ${typeName}: ${tools.length} tools`);
                tools.forEach(tool => {
                    const isDemoKit = tool.config?.source === 'demo_kit' || tool.id.startsWith('kit_');
                    const toolId = isDemoKit ? `${prefix}${tool.id}` : tool.id;
                    console.log(`      Tool: ${tool.name} (${tool.id}) -> ${toolId} (isDemoKit: ${isDemoKit})`);
                    if (!wizard.tool_ids.includes(toolId)) {
                        wizard.tool_ids.push(toolId);
                    }
                });
            };
            
            addTools(selectedDemoTools.apis, 'api:', 'APIs');
            addTools(selectedDemoTools.knowledge_bases, 'kb:', 'KnowledgeBases');
            addTools(selectedDemoTools.emails, '', 'Emails');
            addTools(selectedDemoTools.webhooks, '', 'Webhooks');
            addTools(selectedDemoTools.slacks, '', 'Slacks');
            addTools(selectedDemoTools.calendars, '', 'Calendars');
            addTools(selectedDemoTools.databases, '', 'Databases');
            addTools(selectedDemoTools.websearches, '', 'WebSearches');
            addTools(selectedDemoTools.websites, '', 'Websites');
            
            console.log('✅ Final wizard.tool_ids:', wizard.tool_ids);
        }
        
        // Go to configure new tool
        function goToConfigureNewTool() {
            returnToWizardAfterTool = true;
            showPage('tools');
            // Show create tool modal
            setTimeout(() => showToolModal(), 300);
        }
        
        // Update the selected tools list display
        function updateSelectedToolsList() {
            const container = document.getElementById('w-tools-list');
            const countEl = document.getElementById('selected-tools-count');
            
            // Count all tool types
            const totalCount = 
                selectedDemoTools.apis.length + 
                selectedDemoTools.knowledge_bases.length +
                selectedDemoTools.emails.length +
                selectedDemoTools.webhooks.length +
                selectedDemoTools.slacks.length +
                selectedDemoTools.calendars.length +
                selectedDemoTools.databases.length +
                selectedDemoTools.websearches.length +
                selectedDemoTools.websites.length;
            
            if (countEl) countEl.textContent = totalCount;
            
            if (!container) return;
            
            if (totalCount === 0) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500 text-sm">
                        <span class="text-2xl block mb-2">🔧</span>
                        No tools selected yet<br>
                        <span class="text-xs">Click one of the options above to add tools</span>
                    </div>
                `;
                return;
            }
            
            let html = '';
            
            // Helper to render tool items
            const renderToolItems = (tools, icon, label, colorClass, typeKey) => {
                tools.forEach(tool => {
                    html += `
                        <div class="flex items-center gap-3 p-3 rounded-lg ${colorClass}">
                            <span class="text-xl">${icon}</span>
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-sm">${escHtml(tool.name)}</p>
                                <p class="text-xs text-gray-500">${label}</p>
                            </div>
                            <button onclick="removeSelectedTool('${typeKey}', '${tool.id}')" class="text-gray-500 hover:text-red-400 p-1">✕</button>
                        </div>
                    `;
                });
            };
            
            renderToolItems(selectedDemoTools.apis, '🔌', 'API', 'bg-purple-500/10 border border-purple-500/30', 'api');
            renderToolItems(selectedDemoTools.knowledge_bases, '🧠', 'Knowledge Base', 'bg-blue-500/10 border border-blue-500/30', 'kb');
            renderToolItems(selectedDemoTools.emails, '📧', 'Email', 'bg-green-500/10 border border-green-500/30', 'email');
            renderToolItems(selectedDemoTools.webhooks, '🔗', 'Webhook', 'bg-yellow-500/10 border border-yellow-500/30', 'webhook');
            renderToolItems(selectedDemoTools.slacks, '💬', 'Slack', 'bg-pink-500/10 border border-pink-500/30', 'slack');
            renderToolItems(selectedDemoTools.calendars, '📅', 'Calendar', 'bg-orange-500/10 border border-orange-500/30', 'calendar');
            renderToolItems(selectedDemoTools.databases, '🗄️', 'Database', 'bg-indigo-500/10 border border-indigo-500/30', 'database');
            renderToolItems(selectedDemoTools.websearches, '🔍', 'Web Search', 'bg-cyan-500/10 border border-cyan-500/30', 'websearch');
            renderToolItems(selectedDemoTools.websites, '🌐', 'Website', 'bg-teal-500/10 border border-teal-500/30', 'website');
            
            container.innerHTML = html;
        }
        
        // Remove a selected tool
        function removeSelectedTool(type, toolId) {
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
            const arrayKey = typeToArray[type];
            if (arrayKey && selectedDemoTools[arrayKey]) {
                selectedDemoTools[arrayKey] = selectedDemoTools[arrayKey].filter(t => t.id !== toolId);
            }
            updateSelectedToolsList();
            syncToolsToWizard();
            triggerAutoSave();
        }
        
        // Load available tools for selection in Step 3 (compatibility)
        async function loadDemoKitToolsForSelection() {
            updateSelectedToolsList();
        }
        
        function loadWizardToolsNew() {
            console.log('=== loadWizardToolsNew called ===');
            console.log('wizard.suggestedTools:', JSON.stringify(wizard.suggestedTools));
            console.log('wizard.tool_ids (existing):', JSON.stringify(wizard.tool_ids));
            
            const suggestedContainer = document.getElementById('w-tools-suggested');
            const allContainer = document.getElementById('w-tools-list');
            
            if(!suggestedContainer) {
                console.error('w-tools-suggested container not found!');
                return;
            }
            
            const suggestedTools = wizard.suggestedTools || [];
            const existingToolIds = wizard.tool_ids || [];
            
            // Check if we already have tools selected (from Demo Kit, edit mode, or manual selection)
            const hasExistingTools = existingToolIds.length > 0 || 
                selectedDemoTools.apis.length > 0 || 
                selectedDemoTools.knowledge_bases.length > 0 ||
                selectedDemoTools.emails.length > 0 ||
                selectedDemoTools.webhooks.length > 0;
            const isEditMode = wizard.editId && existingToolIds.length > 0;
            
            console.log('isEditMode:', isEditMode, 'hasExistingTools:', hasExistingTools, 'existingToolIds:', existingToolIds);
            
            // Render suggested tools based on AI recommendation
            if(suggestedTools.length > 0) {
                let html = '';
                suggestedTools.forEach(toolType => {
                    console.log('Processing tool:', toolType);
                    const info = getToolBusinessInfo(toolType);
                    if(!info || !info.name) {
                        console.warn('No info for tool type:', toolType);
                        return;
                    }
                    // Check if this tool is already selected (for edit mode)
                    const isSelected = existingToolIds.includes(toolType);
                    html += `
                        <div class="card rounded-lg p-4 border-2 ${isSelected ? 'border-purple-500/50 bg-purple-500/5' : 'border-gray-700'} cursor-pointer tool-item" 
                             data-tool-type="${toolType}" onclick="toggleToolSelection(this, '${toolType}'); showToolDetail('${toolType}');">
                            <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-xl flex-shrink-0">
                                    ${info.icon}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between gap-2">
                                        <h5 class="font-medium">${info.name}</h5>
                                        <span class="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded flex-shrink-0">Recommended</span>
                                    </div>
                                    <p class="text-sm text-gray-400 mt-1">${info.businessDesc}</p>
                                    <p class="text-xs text-gray-500 mt-2">${info.benefit}</p>
                                </div>
                                <input type="checkbox" class="w-5 h-5 rounded flex-shrink-0" ${isSelected ? 'checked' : ''}>
                            </div>
                        </div>
                    `;
                });
                
                if(html) {
                    suggestedContainer.innerHTML = html;
                    // Only initialize tool_ids with suggested tools if NO existing tools (preserve Demo Kit and manual selections)
                    if(!isEditMode && !hasExistingTools) {
                        wizard.tool_ids = [...suggestedTools];
                    }
                    console.log('Rendered suggested tools, tool_ids:', wizard.tool_ids);
                } else {
                    suggestedContainer.innerHTML = `
                        <div class="text-center py-4 text-gray-500">
                            <p class="text-sm">No specific tools recommended. Select from available tools below.</p>
                        </div>
                    `;
                }
            } else {
                console.log('No suggested tools, showing default message');
                suggestedContainer.innerHTML = `
                    <div class="text-center py-4 text-gray-500">
                        <p class="text-sm">No specific tools recommended. Select from available tools below.</p>
                    </div>
                `;
            }
            
            // Also load all available tools from the system
            loadAvailableToolTypes();
        }
        
        function loadAvailableToolTypes() {
            const allContainer = document.getElementById('w-tools-list');
            if(!allContainer) return;
            
            // Show all tool types that are not already suggested
            const allToolTypes = Object.keys(baseToolInfo);
            const notSuggested = allToolTypes.filter(t => !(wizard.suggestedTools || []).includes(t));
            
            let html = '';
            
            // Add abstract tool types
            if(notSuggested.length > 0) {
                html += notSuggested.map(toolType => {
                    const info = getToolBusinessInfo(toolType);
                    return `
                        <div class="card rounded-lg p-4 border border-gray-700 hover:border-gray-500 cursor-pointer tool-item" 
                             data-tool-type="${toolType}" onclick="toggleToolSelection(this, '${toolType}'); showToolDetail('${toolType}');">
                            <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">
                                    ${info.icon}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h5 class="font-medium">${info.name}</h5>
                                    <p class="text-sm text-gray-400 mt-1">${info.businessDesc}</p>
                                </div>
                                <input type="checkbox" class="w-5 h-5 rounded flex-shrink-0">
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            // Also load actual tools from the system
            loadSystemTools(allContainer, html);
        }
        
        async function loadSystemTools(container, existingHtml) {
            try {
                const r = await fetch(API + '/api/tools');
                const d = await r.json();
                const systemTools = d.tools || [];
                
                if(systemTools.length > 0) {
                    const icons = {document:'📄', website:'🌐', api:'🔌', knowledge:'🧠'};
                    const toolsHtml = systemTools.map(t => `
                        <div class="card rounded-lg p-4 border border-gray-700 hover:border-gray-500 cursor-pointer tool-item" 
                             data-tool-id="${t.id}" onclick="toggleSystemTool(this, '${t.id}');">
                            <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">
                                    ${icons[t.type] || '🔧'}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <h5 class="font-medium">${escHtml(t.name)}</h5>
                                        <span class="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">${t.type}</span>
                                    </div>
                                    <p class="text-sm text-gray-400 mt-1">${t.documents?.length || 0} documents</p>
                                </div>
                                <input type="checkbox" class="w-5 h-5 rounded flex-shrink-0" ${wizard.tool_ids?.includes(t.id) ? 'checked' : ''}>
                            </div>
                        </div>
                    `).join('');
                    
                    if(existingHtml) {
                        container.innerHTML = existingHtml + `
                            <div class="col-span-full mt-4 pt-4 border-t border-gray-700">
                                <h5 class="text-sm font-medium text-gray-400 mb-3">📚 Your Knowledge Bases</h5>
                            </div>
                        ` + toolsHtml;
                    } else {
                        container.innerHTML = toolsHtml;
                    }
                } else if(existingHtml) {
                    container.innerHTML = existingHtml;
                } else {
                    container.innerHTML = '<p class="text-gray-500 text-sm">No tools available</p>';
                }
            } catch(e) {
                console.error('Error loading system tools:', e);
                if(existingHtml) {
                    container.innerHTML = existingHtml;
                }
            }
        }
        
        function toggleSystemTool(el, toolId) {
            const checkbox = el.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            if(checkbox.checked) {
                el.classList.add('border-purple-500/50', 'bg-purple-500/5');
                el.classList.remove('border-gray-700');
                if(!wizard.tool_ids.includes(toolId)) {
                    wizard.tool_ids.push(toolId);
                }
            } else {
                el.classList.remove('border-purple-500/50', 'bg-purple-500/5');
                el.classList.add('border-gray-700');
                wizard.tool_ids = wizard.tool_ids.filter(id => id !== toolId);
            }
        }
        
        function showToolDetail(toolType) {
            const info = getToolBusinessInfo(toolType);
            const sidebar = document.getElementById('tool-detail-sidebar');
            if(!info || !sidebar) return;
            
            sidebar.innerHTML = `
                <div class="text-center mb-4">
                    <div class="w-16 h-16 mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center text-3xl mb-3">
                        ${info.icon}
                    </div>
                    <h4 class="font-semibold">${info.name}</h4>
                    <p class="text-sm text-gray-400 mt-1">${info.businessDesc}</p>
                </div>
                
                <div class="mb-4">
                    <h5 class="text-xs font-medium text-gray-400 uppercase mb-2">What it does</h5>
                    <p class="text-sm">${info.benefit}</p>
                </div>
                
                <div>
                    <h5 class="text-xs font-medium text-gray-400 uppercase mb-2">Examples</h5>
                    <ul class="space-y-2">
                        ${(info.examples || []).map(ex => `
                            <li class="flex items-center gap-2 text-sm">
                                <span class="text-green-400">✓</span>
                                <span>${ex}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        function toggleToolSelection(el, toolType) {
            const checkbox = el.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            if(checkbox.checked) {
                el.classList.add('border-purple-500/50', 'bg-purple-500/5');
                el.classList.remove('border-gray-700');
            } else {
                el.classList.remove('border-purple-500/50', 'bg-purple-500/5');
                el.classList.add('border-gray-700');
            }
            
            showToolDetail(toolType);
        }
        
        function collectToolsNew() {
            // Use syncToolsToWizard for consistent tool ID handling
            syncToolsToWizard();
            
            // Store references for demo tools
            wizard.demo_apis = selectedDemoTools.apis || [];
            wizard.demo_knowledge_bases = selectedDemoTools.knowledge_bases || [];
            
            // Also check for any custom tools from suggested tools UI
            document.querySelectorAll('.tool-item input[type="checkbox"]:checked').forEach(cb => {
                const toolItem = cb.closest('.tool-item');
                const toolId = toolItem?.dataset?.toolId || toolItem?.dataset?.toolType;
                if(toolId && !wizard.tool_ids.includes(toolId)) {
                    wizard.tool_ids.push(toolId);
                }
            });
            
            console.log('✅ collectToolsNew - Final tool_ids:', wizard.tool_ids);
        }
        
        function collectGuardrails() {
            wizard.guardrails = {
                antiHallucination: document.getElementById('guard-anti-hallucination')?.checked ?? true,
                citeSources: document.getElementById('guard-cite-sources')?.checked ?? true,
                admitUncertainty: document.getElementById('guard-admit-uncertainty')?.checked ?? true,
                verifyFacts: document.getElementById('guard-verify-facts')?.checked ?? true,
                noSpeculation: document.getElementById('guard-no-speculation')?.checked ?? false,
                avoidTopics: document.getElementById('guard-avoid-topics')?.value || '',
                focusTopics: document.getElementById('guard-focus-topics')?.value || '',
                maxLength: document.getElementById('guard-max-length')?.value || 'medium',
                language: document.getElementById('guard-language')?.value || 'user',
                escalateAngry: document.getElementById('guard-escalate-angry')?.checked ?? true,
                escalateComplex: document.getElementById('guard-escalate-complex')?.checked ?? true,
                escalateRequest: document.getElementById('guard-escalate-request')?.checked ?? true,
                escalateSensitive: document.getElementById('guard-escalate-sensitive')?.checked ?? false,
                piiProtection: document.getElementById('guard-pii-protection')?.checked ?? true,
                maskPii: document.getElementById('guard-mask-pii')?.checked ?? true,
                noStorePii: document.getElementById('guard-no-store-pii')?.checked ?? true
            };
            
            // Collect Access Control settings
            collectWizardAccessControl();
        }
        
        // ========================================================================
        // WIZARD ACCESS CONTROL
        // ========================================================================
        
        // State for wizard access control
        let wizardAccessState = {
            accessType: 'authenticated',
            selectedEntities: [],
            taskPermissions: {},
            allUsers: [],
            allGroups: []
        };
        
        // Check if current user has admin permissions
        function isUserAdmin() {
            if (!currentUser) return false;
            const userPermissions = currentUser.permissions || [];
            const adminPermissions = ['admin', 'manage_agents', 'manage_users', 'manage_security'];
            return adminPermissions.some(p => userPermissions.includes(p));
        }
        
        // Check if current user is the owner of the current agent
        function isAgentOwner() {
            // For new agents (no id yet), the current user will become the owner
            if (!wizard.id) return true;
            
            if (!currentUser) return false;
            
            // Use string comparison to handle UUID formatting differences
            const ownerId = String(wizard.owner_id || '');
            const createdBy = String(wizard.created_by || '');
            const userId = String(currentUser.id || '');
            
            const isOwner = ownerId === userId || createdBy === userId;
            console.log(`🔍 isAgentOwner check: ownerId=${ownerId.slice(0,8)}..., userId=${userId.slice(0,8)}..., isOwner=${isOwner}`);
            return isOwner;
        }
        
        // State for agent admins with permissions
        let agentAdminState = {
            delegatedAdmins: [],  // [{entity_id, entity_type, entity_name, permissions: []}]
            isOwner: false,
            ownerId: null
        };
        
        // All available permissions
        const AGENT_PERMISSIONS = [
            { id: 'full_admin', name: 'Full Admin', icon: '⭐', desc: 'All permissions except delete', category: 'Special' },
            { id: 'edit_basic_info', name: 'Edit Info', icon: '📝', desc: 'Name, icon, description', category: 'Config' },
            { id: 'edit_personality', name: 'Edit Personality', icon: '🎭', desc: 'Agent personality', category: 'Config' },
            { id: 'edit_model', name: 'Change Model', icon: '🤖', desc: 'LLM model selection', category: 'Config' },
            { id: 'edit_guardrails', name: 'Edit Guardrails', icon: '🛡️', desc: 'Safety settings', category: 'Config' },
            { id: 'manage_tasks', name: 'Manage Tasks', icon: '📋', desc: 'Add/edit/delete tasks', category: 'Components' },
            { id: 'manage_tools', name: 'Manage Tools', icon: '🔧', desc: 'Add/edit/delete tools', category: 'Components' },
            { id: 'manage_knowledge', name: 'Manage Knowledge', icon: '📚', desc: 'Knowledge base', category: 'Components' },
            { id: 'manage_access', name: 'Manage Access', icon: '🔐', desc: 'End-user access', category: 'Access' },
            { id: 'manage_task_permissions', name: 'Task Permissions', icon: '✅', desc: 'Task-level access', category: 'Access' },
            { id: 'publish_agent', name: 'Publish', icon: '🚀', desc: 'Publish/unpublish', category: 'Deploy' },
            { id: 'delete_agent', name: 'Delete Agent', icon: '🗑️', desc: 'Delete (dangerous!)', category: 'Danger' }
        ];
        
        // Load current agent management config
        async function loadAgentAdmins(agentId) {
            if (!agentId) return;
            
            try {
                const orgId = currentUser?.org_id || 'default';
                const response = await fetch(`/api/access-control/agents/${agentId}/management?org_id=${orgId}`, {
                    headers: getAuthHeaders()
                });
                
                const section = document.getElementById('wizard-delegate-admin-section');
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('📋 Agent management data:', data);
                    
                    agentAdminState.ownerId = data.owner_id;
                    // Compare strings to handle UUID formatting
                    const ownerIdStr = String(data.owner_id || '');
                    const currentUserIdStr = String(currentUser?.id || '');
                    agentAdminState.isOwner = ownerIdStr && currentUserIdStr && ownerIdStr === currentUserIdStr;
                    agentAdminState.delegatedAdmins = data.delegated_admins || [];
                    
                    // Enrich with names
                    agentAdminState.delegatedAdmins.forEach(admin => {
                        if (admin.entity_type === 'user') {
                            const user = wizardAccessState.allUsers.find(u => u.id === admin.entity_id);
                            admin.entity_name = user?.name || user?.email || `User ${admin.entity_id.slice(0,8)}...`;
                        } else {
                            const group = wizardAccessState.allGroups.find(g => g.id === admin.entity_id);
                            admin.entity_name = group?.name || `Group ${admin.entity_id.slice(0,8)}...`;
                        }
                    });
                    
                    // Show the delegate admin section if user is owner
                    if (section) {
                        section.style.display = agentAdminState.isOwner ? 'block' : 'none';
                        console.log(`👁️ Delegate section visibility: ${agentAdminState.isOwner ? 'VISIBLE' : 'HIDDEN'}`);
                    }
                    
                    // Show owner badge
                    const ownerBadge = document.getElementById('ac-owner-badge');
                    if (ownerBadge) {
                        ownerBadge.style.display = agentAdminState.isOwner ? 'inline-flex' : 'none';
                    }
                    
                    renderDelegatedAdmins();
                } else if (response.status === 403) {
                    // API says no access, but double-check with local data
                    const localIsOwner = isAgentOwner();
                    console.log(`⚠️ 403 Forbidden from API, but local isOwner check: ${localIsOwner}`);
                    
                    if (localIsOwner) {
                        // Local check says we're owner - might be a sync issue
                        console.log('🔄 Local check says owner - showing delegation section anyway');
                        agentAdminState.isOwner = true;
                        agentAdminState.delegatedAdmins = [];
                        if (section) section.style.display = 'block';
                        renderDelegatedAdmins();
                    } else {
                        agentAdminState.isOwner = false;
                        if (section) section.style.display = 'none';
                    }
                } else {
                    console.error('❌ Failed to load agent management:', response.status);
                    // Fallback to local ownership check
                    const localIsOwner = isAgentOwner();
                    agentAdminState.isOwner = localIsOwner;
                    if (section) section.style.display = localIsOwner ? 'block' : 'none';
                    if (localIsOwner) renderDelegatedAdmins();
                }
            } catch (e) {
                console.error('Failed to load agent admins:', e);
            }
        }
        
        // Check if current user is the owner (from wizard data)
        function checkOwnershipFromWizard() {
            if (!currentUser || !wizard.id) return false;
            return wizard.owner_id === currentUser.id || wizard.created_by === currentUser.id;
        }
        
        // Render delegated admins with permission matrix
        function renderDelegatedAdmins() {
            const container = document.getElementById('wizard-delegated-admins-list');
            if (!container) return;
            
            const admins = agentAdminState.delegatedAdmins;
            
            if (admins.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:24px 16px; border-radius:12px; background:var(--bg-secondary);">
                        <div style="font-size:2rem; margin-bottom:8px;">👤</div>
                        <p style="color:var(--text-secondary); font-size:0.875rem;">You are the only admin.</p>
                        <p style="color:var(--text-muted); font-size:0.75rem; margin-top:4px;">Search above to add users or groups as delegated admins.</p>
                    </div>`;
                return;
            }
            
            const tasks = wizard.tasks || [];
            
            const selIdx = window._daSelectedIdx != null && window._daSelectedIdx < admins.length ? window._daSelectedIdx : 0;
            const selAdmin = admins[selIdx];
            
            container.innerHTML = `
                <div style="display:flex; gap:12px; min-height:380px;">
                    <!-- LEFT: Admin List -->
                    <div style="width:240px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
                        <div style="padding:10px; border-bottom:1px solid var(--border-color);">
                            <input type="text" id="da-filter" oninput="daFilterAdmins(this.value)"
                                   placeholder="Filter admins..."
                                   style="width:100%; padding:8px 12px; border-radius:10px; border:1px solid var(--input-border); background:var(--bg-input); color:var(--text-primary); font-size:0.8rem; outline:none;">
                        </div>
                        <div id="da-admin-list" style="flex:1; overflow-y:auto; padding:6px;">
                            ${admins.map((a, idx) => {
                                const icon = a.entity_type === 'user' ? '👤' : '👥';
                                const isActive = idx === selIdx;
                                const hasFA = a.permissions?.includes('full_admin');
                                const deniedCount = (a.denied_task_names || []).length;
                                const permCount = (a.permissions || []).length;
                                const activeBg = isActive ? 'var(--sidebar-active)' : 'transparent';
                                const activeBorder = isActive ? '2px solid var(--warning)' : '2px solid transparent';
                                
                                return `
                                <div class="da-admin-item" data-name="${(a.entity_name || '').toLowerCase()}"
                                     style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:12px; cursor:pointer; margin-bottom:4px; background:${activeBg}; border:${activeBorder}; transition:all 0.15s;"
                                     onclick="daSelectAdmin(${idx})">
                                    <span style="font-size:1.1rem;">${icon}</span>
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-size:0.8rem; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${a.entity_name || ''}">${a.entity_name || 'Unknown'}</div>
                                        <div style="display:flex; gap:4px; margin-top:2px; flex-wrap:wrap;">
                                            ${hasFA ? `<span style="font-size:0.6rem; padding:1px 6px; border-radius:8px; background:color-mix(in srgb, var(--warning) 20%, transparent); color:var(--warning);">Full Admin</span>` : `<span style="font-size:0.6rem; padding:1px 6px; border-radius:8px; background:color-mix(in srgb, var(--accent-primary) 15%, transparent); color:var(--accent-primary);">${permCount} perms</span>`}
                                            ${deniedCount > 0 ? `<span style="font-size:0.6rem; padding:1px 6px; border-radius:8px; background:color-mix(in srgb, var(--danger) 15%, transparent); color:var(--danger);">${deniedCount} denied</span>` : ''}
                                        </div>
                                    </div>
                                    ${isActive ? '<div style="width:4px; height:24px; border-radius:2px; background:var(--warning); flex-shrink:0;"></div>' : ''}
                                </div>`;
                            }).join('')}
                        </div>
                        <div style="padding:8px 10px; border-top:1px solid var(--border-color); text-align:center;">
                            <span style="font-size:0.7rem; color:var(--text-muted);">${admins.length} admin${admins.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    
                    <!-- RIGHT: Detail Panel -->
                    <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
                        ${selAdmin ? (() => {
                            const sa = selAdmin;
                            const icon = sa.entity_type === 'user' ? '👤' : '👥';
                            const hasFA = sa.permissions?.includes('full_admin');
                            const denied = sa.denied_task_names || [];
                            
                            return `
                            <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; background:var(--sidebar-active);">${icon}</div>
                                    <div>
                                        <div style="font-weight:600; color:var(--text-primary); font-size:0.95rem;">${sa.entity_name || 'Unknown'}</div>
                                        <div style="font-size:0.75rem; color:var(--text-muted);">${sa.entity_type === 'user' ? 'User' : 'Group'}</div>
                                    </div>
                                </div>
                                <button onclick="removeAgentAdmin('${sa.entity_id}')" style="padding:6px 14px; border-radius:10px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-size:0.75rem; cursor:pointer;">Remove</button>
                            </div>
                            
                            <div style="flex:1; overflow-y:auto; padding:16px 20px;">
                                <!-- Management Permissions -->
                                <div style="margin-bottom:20px;">
                                    <div style="font-size:0.8rem; font-weight:600; color:var(--warning); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                                        <span>🔧</span> Management Permissions
                                    </div>
                                    
                                    <label style="display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; cursor:pointer; margin-bottom:10px; background:${hasFA ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'var(--bg-secondary)'}; border:1px solid ${hasFA ? 'var(--warning)' : 'var(--border-color)'}; transition:all 0.15s;">
                                        <input type="checkbox" onchange="toggleFullAdmin(${selIdx}, this.checked)" ${hasFA ? 'checked' : ''}
                                               style="width:18px; height:18px; border-radius:5px; accent-color:var(--warning); cursor:pointer;">
                                        <div>
                                            <div style="font-size:0.875rem; font-weight:600; color:var(--warning);">⭐ Full Admin</div>
                                            <div style="font-size:0.7rem; color:var(--text-muted);">All permissions except delete</div>
                                        </div>
                                    </label>
                                    
                                    ${!hasFA ? `
                                    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px;">
                                        ${AGENT_PERMISSIONS.filter(p => p.id !== 'full_admin').map(perm => {
                                            const checked = sa.permissions?.includes(perm.id);
                                            const isDanger = perm.category === 'Danger';
                                            
                                            return `
                                            <label style="display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; background:var(--bg-secondary); border:1px solid ${checked ? (isDanger ? 'var(--danger)' : 'var(--accent-primary)') : 'var(--border-color)'}; transition:all 0.15s;">
                                                <input type="checkbox" onchange="toggleAdminPermission(${selIdx}, '${perm.id}', this.checked)" ${checked ? 'checked' : ''}
                                                       style="width:16px; height:16px; border-radius:4px; accent-color:${isDanger ? 'var(--danger)' : 'var(--accent-primary)'}; cursor:pointer;">
                                                <div style="min-width:0;">
                                                    <div style="font-size:0.8rem; color:${isDanger ? 'var(--danger)' : 'var(--text-primary)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${perm.icon} ${perm.name}</div>
                                                    <div style="font-size:0.65rem; color:var(--text-muted);">${perm.desc}</div>
                                                </div>
                                            </label>`;
                                        }).join('')}
                                    </div>
                                    ` : `<div style="font-size:0.75rem; color:var(--text-muted); padding:8px 0;">All management permissions are granted. Uncheck Full Admin to customize.</div>`}
                                </div>
                                
                                <!-- Chat Task Permissions -->
                                <div>
                                    <div style="font-size:0.8rem; font-weight:600; color:var(--accent-primary); margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                                        <span style="display:flex; align-items:center; gap:6px;"><span>💬</span> Chat Task Permissions</span>
                                        ${tasks.length > 0 ? `
                                        <div style="display:flex; gap:6px;">
                                            <button onclick="daSetAllTasks(${selIdx}, true)" style="padding:4px 10px; border-radius:8px; border:1px solid var(--success); background:transparent; color:var(--success); font-size:0.7rem; cursor:pointer;">Allow All</button>
                                            <button onclick="daSetAllTasks(${selIdx}, false)" style="padding:4px 10px; border-radius:8px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-size:0.7rem; cursor:pointer;">Deny All</button>
                                        </div>
                                        ` : ''}
                                    </div>
                                    
                                    ${tasks.length > 0 ? `
                                    <div style="display:flex; flex-direction:column; gap:6px;">
                                        ${tasks.map(task => {
                                            const taskName = task.name || 'Unnamed Task';
                                            const isDenied = denied.includes(taskName);
                                            
                                            return `
                                            <label style="display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:10px; cursor:pointer; background:var(--bg-secondary); border:1px solid var(--border-color); transition:all 0.15s;">
                                                <input type="checkbox" onchange="toggleAdminTaskAccess(${selIdx}, '${escHtml(taskName)}', this.checked)" ${!isDenied ? 'checked' : ''}
                                                       style="width:18px; height:18px; border-radius:5px; accent-color:var(--success); cursor:pointer; flex-shrink:0;">
                                                <div style="flex:1; min-width:0;">
                                                    <div style="font-size:0.85rem; color:${isDenied ? 'var(--danger)' : 'var(--text-primary)'}; ${isDenied ? 'text-decoration:line-through;' : ''}">${escHtml(taskName)}</div>
                                                    ${task.description ? `<div style="font-size:0.7rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${(task.description || '').slice(0, 70)}</div>` : ''}
                                                </div>
                                                <span style="font-size:0.7rem; padding:3px 10px; border-radius:8px; font-weight:500; flex-shrink:0; background:${isDenied ? 'color-mix(in srgb, var(--danger) 15%, transparent)' : 'color-mix(in srgb, var(--success) 15%, transparent)'}; color:${isDenied ? 'var(--danger)' : 'var(--success)'};">${isDenied ? 'Denied' : 'Allowed'}</span>
                                            </label>`;
                                        }).join('')}
                                    </div>
                                    ` : `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:16px;">No tasks defined yet. Add tasks in the Tasks step.</div>`}
                                </div>
                            </div>
                            `;
                        })() : `
                            <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.875rem;">
                                Select an admin from the list
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        
        // Select admin in master-detail panel
        function daSelectAdmin(idx) {
            window._daSelectedIdx = idx;
            renderDelegatedAdmins();
        }
        
        // Filter admin list
        function daFilterAdmins(query) {
            const items = document.querySelectorAll('.da-admin-item');
            const q = (query || '').toLowerCase();
            items.forEach(item => {
                const name = item.getAttribute('data-name') || '';
                item.style.display = !q || name.includes(q) ? 'flex' : 'none';
            });
        }
        
        // Allow/Deny all tasks for a delegated admin
        function daSetAllTasks(index, allowed) {
            const admin = agentAdminState.delegatedAdmins[index];
            if (!admin) return;
            const tasks = wizard.tasks || [];
            if (allowed) {
                admin.denied_task_names = [];
            } else {
                admin.denied_task_names = tasks.map(t => t.name || 'Unnamed Task');
            }
            saveAgentManagement();
            renderDelegatedAdmins();
        }
        
        // Toggle task access for admin
        function toggleAdminTaskAccess(index, taskName, allowed) {
            const admin = agentAdminState.delegatedAdmins[index];
            if (!admin) return;
            
            admin.denied_task_names = admin.denied_task_names || [];
            
            if (allowed) {
                admin.denied_task_names = admin.denied_task_names.filter(t => t !== taskName);
            } else {
                if (!admin.denied_task_names.includes(taskName)) {
                    admin.denied_task_names.push(taskName);
                }
            }
            
            saveAgentManagement();
            renderDelegatedAdmins();
        }
        
        // Toggle full admin permission
        function toggleFullAdmin(index, checked) {
            const admin = agentAdminState.delegatedAdmins[index];
            if (!admin) return;
            
            if (checked) {
                admin.permissions = ['full_admin'];
            } else {
                admin.permissions = [];
            }
            
            saveAgentManagement();
            renderDelegatedAdmins();
        }
        
        // Toggle individual permission
        function toggleAdminPermission(index, permId, checked) {
            const admin = agentAdminState.delegatedAdmins[index];
            if (!admin) return;
            
            admin.permissions = admin.permissions || [];
            admin.permissions = admin.permissions.filter(p => p !== 'full_admin');
            
            if (checked) {
                if (!admin.permissions.includes(permId)) {
                    admin.permissions.push(permId);
                }
            } else {
                admin.permissions = admin.permissions.filter(p => p !== permId);
            }
            
            saveAgentManagement();
            renderDelegatedAdmins();
        }
        
        // Save management config to backend
        async function saveAgentManagement() {
            const agentId = wizard.id;
            if (!agentId) return;
            
            const orgId = currentUser?.org_id || 'default';
            
            try {
                await fetch(`/api/access-control/agents/${agentId}/management?org_id=${orgId}`, {
                    method: 'PUT',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        delegated_admins: agentAdminState.delegatedAdmins.map(a => ({
                            entity_id: a.entity_id,
                            entity_type: a.entity_type,
                            permissions: a.permissions || [],
                            denied_task_names: a.denied_task_names || []  // Chat permissions
                        }))
                    })
                });
                console.log('✅ Agent management saved (including chat permissions)');
            } catch (e) {
                console.error('Failed to save agent management:', e);
            }
        }
        
        // Add agent admin (with default full_admin)
        async function addAgentAdmin(id, type, name) {
            const agentId = wizard.id;
            if (!agentId) {
                showToast('Save the agent first before adding admins', 'warning');
                return;
            }
            
            // Check if already exists
            if (agentAdminState.delegatedAdmins.some(a => a.entity_id === id)) {
                showToast('This user/group is already an admin', 'warning');
                return;
            }
            
            // Add to state with full_admin by default
            agentAdminState.delegatedAdmins.push({
                entity_id: id,
                entity_type: type,
                entity_name: name,
                permissions: ['full_admin']
            });
            
            await saveAgentManagement();
            renderDelegatedAdmins();
            showToast('Admin added with full permissions', 'success');
            
            // Clear search
            document.getElementById('wizard-admin-search').value = '';
            document.getElementById('wizard-admin-search-results')?.classList.add('hidden');
        }
        
        // Remove agent admin
        async function removeAgentAdmin(id) {
            agentAdminState.delegatedAdmins = agentAdminState.delegatedAdmins.filter(a => a.entity_id !== id);
            await saveAgentManagement();
            renderDelegatedAdmins();
            showToast('Admin removed', 'success');
        }
        
        // Show/hide permissions guide
        function showPermissionsGuide() {
            const guide = document.getElementById('permissions-guide');
            if (guide) {
                guide.classList.toggle('hidden');
            }
        }
        
        // Search for potential admins
        function searchPotentialAdmins(query) {
            const container = document.getElementById('wizard-admin-search-results');
            if (!container) return;
            
            if (!query || query.length < 2) {
                container.classList.add('hidden');
                return;
            }
            
            const q = query.toLowerCase();
            
            // Filter users and groups
            const matchedUsers = wizardAccessState.allUsers.filter(u => 
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
            ).slice(0, 5);
            
            const matchedGroups = wizardAccessState.allGroups.filter(g =>
                g.name && g.name.toLowerCase().includes(q)
            ).slice(0, 5);
            
            // Get already added admin IDs
            const existingAdminIds = agentAdminState.delegatedAdmins.map(a => a.entity_id);
            
            // Exclude already added admins
            const results = [
                ...matchedUsers.filter(u => !existingAdminIds.includes(u.id)).map(u => ({
                    id: u.id,
                    name: u.name || u.email,
                    type: 'user',
                    icon: '👤'
                })),
                ...matchedGroups.filter(g => !existingAdminIds.includes(g.id)).map(g => ({
                    id: g.id,
                    name: g.name,
                    type: 'group',
                    icon: '👥'
                }))
            ];
            
            if (results.length === 0) {
                container.innerHTML = '<p class="p-3 text-sm text-gray-400">No results found</p>';
            } else {
                container.innerHTML = results.map(r => `
                    <div class="p-3 hover:bg-gray-600 cursor-pointer flex items-center gap-3 border-b border-gray-600 last:border-0" onclick="addAgentAdmin('${r.id}', '${r.type}', '${r.name.replace(/'/g, "\\'")}')">
                        <span class="text-xl">${r.icon}</span>
                        <div class="flex-1">
                            <div class="font-medium text-sm text-white">${r.name}</div>
                            <span class="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">${r.type}</span>
                        </div>
                    </div>
                `).join('');
            }
            
            container.classList.remove('hidden');
        }
        
        // Check if current user can manage access control for this agent
        async function canManageAgentAccess() {
            // For new agents, the creator will be the owner
            if (!wizard.id) return true;
            
            // Check if owner
            if (isAgentOwner()) return true;
            
            // Check if delegated admin via API
            try {
                const orgId = currentUser?.org_id || 'default';
                const response = await fetch(`/api/access-control/agents/${wizard.id}/admins?org_id=${orgId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const adminUserIds = data.admin_user_ids || [];
                    const adminGroupIds = data.admin_group_ids || [];
                    
                    // Check if current user is in admin list
                    if (adminUserIds.includes(currentUser?.id)) return true;
                    
                    // Check if any of user's groups are in admin list
                    const userGroups = currentUser?.group_ids || [];
                    if (userGroups.some(g => adminGroupIds.includes(g))) return true;
                }
            } catch (e) {
                console.error('Error checking agent admin status:', e);
            }
            
            return false;
        }
        
        // Initialize wizard access control event listeners
        async function initWizardAccessControl() {
            // SECURITY: Only show access control for OWNER or DELEGATED ADMINS
            // Even platform super admins cannot see other users' agent access control
            const accessControlSection = document.getElementById('wizard-access-control-section');
            const ownerBadge = document.getElementById('ac-owner-badge');
            const canManage = await canManageAgentAccess();
            
            // Check if current user is the owner (for badge display)
            const isOwner = isAgentOwner();
            
            if (accessControlSection) {
                accessControlSection.style.display = canManage ? 'block' : 'none';
            }
            
            // Show owner badge if user is the owner
            if (ownerBadge) {
                if (isOwner || !wizard.id) {  // New agents - creator will be owner
                    ownerBadge.classList.remove('hidden');
                    ownerBadge.style.display = 'inline-flex';
                } else {
                    ownerBadge.classList.add('hidden');
                    ownerBadge.style.display = 'none';
                }
            }
            
            // Pre-load users/groups if user can manage access
            if (authToken && canManage) {
                loadWizardAccessEntities();
            }
            
            // Search input listener for access entities
            const searchInput = document.getElementById('wizard-access-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const query = e.target.value;
                    if (query.length >= 2) {
                        searchWizardAccessEntities(query);
                    } else {
                        document.getElementById('wizard-access-search-results')?.classList.add('hidden');
                    }
                });
            }
            
            // Search input listener for admin delegation
            const adminSearchInput = document.getElementById('wizard-admin-search');
            if (adminSearchInput) {
                adminSearchInput.addEventListener('input', (e) => {
                    const query = e.target.value;
                    if (query.length >= 2) {
                        searchPotentialAdmins(query);
                    } else {
                        document.getElementById('wizard-admin-search-results')?.classList.add('hidden');
                    }
                });
            }
            
            // Load agent admins if editing an existing agent (only for owner)
            const agentId = wizard.id || wizard.editId;
            const delegateSection = document.getElementById('wizard-delegate-admin-section');
            
            if (agentId && isAgentOwner()) {
                if (delegateSection) { delegateSection.classList.remove('hidden'); delegateSection.style.display = 'block'; }
                loadAgentAdmins(agentId);
            } else {
                if (delegateSection) delegateSection.style.display = 'none';
            }
        }
        
        // Select access type (public, authenticated, specific)
        function selectWizardAccessType(type) {
            wizardAccessState.accessType = type;
            
            // Update visual selection for new card design
            document.querySelectorAll('.access-type-card').forEach(card => {
                const cardType = card.dataset.value;
                const checkmark = card.querySelector('.access-check');
                
                // Reset all cards
                card.classList.remove('ac-selected');
                card.style.boxShadow = 'none';
                if (checkmark) checkmark.classList.add('hidden');
                
                // Style selected card
                if (cardType === type) {
                    card.classList.add('ac-selected');
                    if (checkmark) checkmark.classList.remove('hidden');
                    
                    if (type === 'public') {
                        card.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)';
                        card.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                        card.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.2)';
                    } else if (type === 'authenticated') {
                        card.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)';
                        card.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                        card.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.2)';
                    } else if (type === 'specific') {
                        card.style.background = 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)';
                        card.style.borderColor = 'rgba(168, 85, 247, 0.5)';
                        card.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.2)';
                    }
                } else {
                    // Reset unselected cards
                    if (cardType === 'public') {
                        card.style.background = 'rgba(34, 197, 94, 0.05)';
                        card.style.borderColor = 'rgba(34, 197, 94, 0.2)';
                    } else if (cardType === 'authenticated') {
                        card.style.background = 'rgba(59, 130, 246, 0.05)';
                        card.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                    } else if (cardType === 'specific') {
                        card.style.background = 'rgba(168, 85, 247, 0.05)';
                        card.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                    }
                }
            });
            
            updateWizardAccessUI();
        }
        
        function updateWizardAccessUI() {
            const specificSection = document.getElementById('wizard-access-specific-section');
            const taskPermSection = document.getElementById('wizard-task-permissions-section');
            
            // Sync task permissions with current tasks
            syncTaskPermissions();
            
            if (wizardAccessState.accessType === 'specific') {
                specificSection?.classList.remove('hidden');
                // Load users/groups if not loaded
                if (wizardAccessState.allUsers.length === 0) {
                    loadWizardAccessEntities();
                }
                
                // Always show task permissions when specific access is selected
                // (even without selected entities - shows global permissions)
                taskPermSection?.classList.remove('hidden');
                renderWizardTaskPermissions();
            } else if (wizardAccessState.accessType === 'authenticated') {
                // For authenticated users, also allow task-level permissions
                specificSection?.classList.add('hidden');
                taskPermSection?.classList.remove('hidden');
                renderWizardTaskPermissions();
            } else {
                // Public access - no need for granular permissions
                specificSection?.classList.add('hidden');
                taskPermSection?.classList.add('hidden');
            }
            
            renderWizardSelectedEntities();
        }
        
        // Load users and groups for access control
        async function loadWizardAccessEntities() {
            try {
                const headers = getAuthHeaders();
                const [usersRes, groupsRes] = await Promise.all([
                    fetch('/api/security/users', { headers, credentials: 'include' }),
                    fetch('/api/security/groups', { headers, credentials: 'include' })
                ]);
                
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    wizardAccessState.allUsers = Array.isArray(usersData) ? usersData : (usersData.users || []);
                }
                
                if (groupsRes.ok) {
                    const groupsData = await groupsRes.json();
                    wizardAccessState.allGroups = Array.isArray(groupsData) ? groupsData : (groupsData.groups || []);
                }
            } catch (e) {
                console.error('Failed to load users/groups:', e);
            }
        }
        
        async function searchWizardAccessEntities(query) {
            if (!query || query.length < 2) {
                document.getElementById('wizard-access-search-results')?.classList.add('hidden');
                return;
            }
            
            // Load users and groups if not already loaded
            if (wizardAccessState.allUsers.length === 0) {
                await loadWizardAccessEntities();
            }
            
            const lowerQuery = query.toLowerCase();
            const results = [];
            
            // Search users
            const users = Array.isArray(wizardAccessState.allUsers) ? wizardAccessState.allUsers : [];
            users.forEach(u => {
                const firstName = u.profile?.first_name || u.first_name || '';
                const lastName = u.profile?.last_name || u.last_name || '';
                const name = u.name || `${firstName} ${lastName}`.trim() || u.email || '';
                const email = u.email || '';
                
                if (name.toLowerCase().includes(lowerQuery) || email.toLowerCase().includes(lowerQuery)) {
                    if (!wizardAccessState.selectedEntities.find(e => e.id === u.id && e.type === 'user')) {
                        results.push({ id: u.id, name: name || email, email: email, type: 'user', icon: '👤' });
                    }
                }
            });
            
            // Search groups
            const groups = Array.isArray(wizardAccessState.allGroups) ? wizardAccessState.allGroups : [];
            groups.forEach(g => {
                const name = g.name || '';
                if (name.toLowerCase().includes(lowerQuery)) {
                    if (!wizardAccessState.selectedEntities.find(e => e.id === g.id && e.type === 'group')) {
                        results.push({ id: g.id, name: name, type: 'group', icon: '👥' });
                    }
                }
            });
            
            console.log('Search results for "' + query + '":', results.length);
            renderWizardSearchResults(results);
        }
        
        function renderWizardSearchResults(results) {
            const container = document.getElementById('wizard-access-search-results');
            if (!container) return;
            
            if (results.length === 0) {
                container.classList.add('hidden');
                return;
            }
            
            container.innerHTML = results.slice(0, 10).map(r => `
                <div class="p-3 hover:bg-gray-600 cursor-pointer flex items-center gap-3 border-b border-gray-600 last:border-0"
                     onclick="selectWizardAccessEntity('${r.id}', '${r.name.replace(/'/g, "\\'")}', '${r.type}', '${r.icon}')">
                    <span class="text-xl">${r.icon}</span>
                    <div class="flex-1">
                        <div class="font-medium text-sm text-white">${r.name}</div>
                        ${r.email ? `<div class="text-xs text-gray-400">${r.email}</div>` : ''}
                        <span class="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">${r.type}</span>
                    </div>
                </div>
            `).join('');
            container.classList.remove('hidden');
        }
        
        function selectWizardAccessEntity(id, name, type, icon) {
            wizardAccessState.selectedEntities.push({ id, name, type, icon });
            document.getElementById('wizard-access-search').value = '';
            document.getElementById('wizard-access-search-results')?.classList.add('hidden');
            updateWizardAccessUI();
        }
        
        function removeWizardAccessEntity(id) {
            wizardAccessState.selectedEntities = wizardAccessState.selectedEntities.filter(e => e.id !== id);
            updateWizardAccessUI();
        }
        
        function renderWizardSelectedEntities() {
            const container = document.getElementById('wizard-access-selected');
            if (!container) return;
            
            // Update stats
            const userCount = wizardAccessState.selectedEntities.filter(e => e.type === 'user').length;
            const groupCount = wizardAccessState.selectedEntities.filter(e => e.type === 'group').length;
            const userStat = document.getElementById('ac-stat-users');
            const groupStat = document.getElementById('ac-stat-groups');
            if (userStat) userStat.textContent = userCount;
            if (groupStat) groupStat.textContent = groupCount;
            
            // Show stats if we have specific users selected
            const statsContainer = document.getElementById('ac-quick-stats');
            if (statsContainer) {
                statsContainer.style.display = wizardAccessState.accessType === 'specific' && wizardAccessState.selectedEntities.length > 0 ? 'flex' : 'none';
            }
            
            if (wizardAccessState.selectedEntities.length === 0) {
                container.innerHTML = '<div class="text-sm text-gray-500 italic py-2">Select users or groups from the search above</div>';
                return;
            }
            
            container.innerHTML = wizardAccessState.selectedEntities.map(e => {
                const isUser = e.type === 'user';
                const bgColor = isUser ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)';
                const borderColor = isUser ? 'rgba(139, 92, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)';
                const iconBg = isUser ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)';
                
                return `
                    <div class="group inline-flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02]" 
                         style="background: ${bgColor}; border: 1px solid ${borderColor};">
                        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background: ${iconBg};">
                            ${isUser ? `
                                <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            ` : `
                                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            `}
                        </div>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-white">${e.name}</div>
                            <div class="text-xs text-gray-500">${isUser ? 'User' : 'Group'}</div>
                        </div>
                        <button onclick="removeWizardAccessEntity('${e.id}')" 
                                class="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500/40 text-red-400">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                `;
            }).join('');
        }
        
        function renderWizardTaskPermissions() {
            const container = document.getElementById('wizard-task-permissions-grid');
            if (!container) return;
            
            const tasks = wizard.tasks || [];
            const entities = wizardAccessState.selectedEntities || [];
            
            if (tasks.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style="background: rgba(255,255,255,0.05);">
                            <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                        </div>
                        <p class="text-gray-500 text-sm">Define tasks in the Tasks step first</p>
                        <button onclick="goToStep(2)" class="mt-3 text-purple-400 text-sm hover:underline">Go to Tasks →</button>
                    </div>
                `;
                return;
            }
            
            if (entities.length === 0) {
                // No specific entities - show simple allow/deny per task (global default)
                container.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:12px; margin-bottom:16px; background:var(--bg-card); border:1px solid var(--accent-secondary);">
                        <svg style="width:20px; height:20px; color:var(--accent-secondary); flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p style="font-size:0.875rem; color:var(--text-secondary);">These permissions apply to all authenticated users. Select "Specific Users" above to configure per-user permissions.</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${tasks.map((task, i) => {
                            const taskId = task.id || `task-${i}`;
                            const isAllowed = getTaskPermission(taskId, 'default') !== false;
                            
                            return `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:12px; background:var(--bg-secondary); border:1px solid var(--border-color); transition:all 0.15s;">
                                <div style="display:flex; align-items:center; gap:14px;">
                                    <div style="width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:${isAllowed ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)'};">
                                        <svg style="width:20px; height:20px; color:${isAllowed ? 'var(--success)' : 'var(--danger)'};" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            ${isAllowed 
                                                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'
                                                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
                                        </svg>
                                    </div>
                                    <div>
                                        <div style="font-weight:500; color:var(--text-primary);">${task.name || 'Unnamed Task'}</div>
                                        <div style="font-size:0.75rem; color:var(--text-muted); max-width:400px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(task.description || '').slice(0, 60)}${task.description?.length > 60 ? '...' : ''}</div>
                                    </div>
                                </div>
                                <button onclick="toggleWizardTaskPermission('${taskId}', 'default', ${!isAllowed}); renderWizardTaskPermissions();"
                                        style="padding:8px 20px; border-radius:10px; font-weight:600; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s;
                                               background:transparent; border:1px solid ${isAllowed ? 'var(--success)' : 'var(--danger)'}; color:${isAllowed ? 'var(--success)' : 'var(--danger)'};">
                                    <svg style="width:16px; height:16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        ${isAllowed 
                                            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>'
                                            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'}
                                    </svg>
                                    ${isAllowed ? 'Allowed' : 'Denied'}
                                </button>
                            </div>
                        `}).join('')}
                    </div>
                `;
                return;
            }
            
            // ===================================================================
            // Master-Detail Split Panel (Enterprise IAM pattern)
            // Left: searchable entity list   Right: selected entity's permissions
            // Scales to 100+ users/groups with search, filter, bulk actions.
            // ===================================================================
            
            // Track which entity is selected for detail view
            const selId = window._acSelectedEntityId || entities[0]?.id || null;
            const selEntity = entities.find(e => e.id === selId) || entities[0];
            
            // Pre-compute per-entity stats
            const entityStats = {};
            entities.forEach(e => {
                let denied = 0;
                tasks.forEach((t, i) => {
                    if (getTaskPermission(t.id || `task-${i}`, e.id) === false) denied++;
                });
                entityStats[e.id] = { denied, allowed: tasks.length - denied };
            });
            
            // --- Bulk selection state ---
            const bulkSel = window._acBulkSelected || new Set();
            const hasBulk = bulkSel.size > 0;
            
            container.innerHTML = `
                <!-- Bulk Actions Bar -->
                ${hasBulk ? `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:12px; margin-bottom:12px; background:var(--bg-card); border:1px solid var(--accent-primary);">
                    <span style="font-size:0.875rem; color:var(--accent-primary);"><strong>${bulkSel.size}</strong> selected</span>
                    <div style="display:flex; gap:8px;">
                        <button onclick="acBulkApply(true)" style="padding:6px 12px; font-size:0.75rem; border-radius:8px; border:1px solid var(--success); background:transparent; color:var(--success); cursor:pointer; font-weight:600;">Allow All Tasks</button>
                        <button onclick="acBulkApply(false)" style="padding:6px 12px; font-size:0.75rem; border-radius:8px; border:1px solid var(--danger); background:transparent; color:var(--danger); cursor:pointer; font-weight:600;">Deny All Tasks</button>
                        <button onclick="acBulkClear()" style="padding:6px 12px; font-size:0.75rem; border-radius:8px; border:1px solid var(--border-color); background:transparent; color:var(--text-muted); cursor:pointer;">Clear</button>
                    </div>
                </div>
                ` : ''}
                
                <div style="display:flex; gap:12px; min-height:340px;">
                    <!-- LEFT: Entity List -->
                    <div style="width:260px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
                        <!-- Search -->
                        <div style="padding:10px; border-bottom:1px solid var(--border-color);">
                            <input type="text" id="ac-entity-filter" oninput="acFilterEntities(this.value)"
                                   placeholder="Filter users/groups..."
                                   style="width:100%; padding:8px 12px; border-radius:10px; border:1px solid var(--input-border); background:var(--bg-input); color:var(--text-primary); font-size:0.8rem; outline:none;">
                        </div>
                        <!-- Scrollable list -->
                        <div id="ac-entity-list" style="flex:1; overflow-y:auto; padding:6px;">
                            ${entities.map(e => {
                                const isUser = e.type === 'user';
                                const st = entityStats[e.id] || { allowed: tasks.length, denied: 0 };
                                const isActive = selEntity && e.id === selEntity.id;
                                const isBulkChecked = bulkSel.has(e.id);
                                const activeBg = isActive ? 'var(--sidebar-active)' : 'transparent';
                                const activeBorder = isActive ? '2px solid var(--accent-primary)' : '2px solid transparent';
                                
                                return `
                                <div class="ac-entity-item" data-name="${(e.name || '').toLowerCase()}" data-type="${e.type}"
                                     style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:12px; cursor:pointer; margin-bottom:4px; background:${activeBg}; border:${activeBorder}; transition:all 0.15s;"
                                     onclick="acSelectEntity('${e.id}')">
                                    <input type="checkbox" ${isBulkChecked ? 'checked' : ''} 
                                           onclick="event.stopPropagation(); acToggleBulk('${e.id}', this.checked)"
                                           style="width:16px; height:16px; border-radius:4px; flex-shrink:0; accent-color:var(--accent-primary); cursor:pointer;">
                                    <div style="flex:1; min-width:0;">
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <span style="font-size:1rem;">${isUser ? '👤' : '👥'}</span>
                                            <span style="font-size:0.8rem; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${e.name || ''}">${e.name || 'Unknown'}</span>
                                        </div>
                                        <div style="display:flex; gap:6px; margin-top:3px;">
                                            <span style="font-size:0.65rem; padding:1px 6px; border-radius:8px; background:color-mix(in srgb, var(--success) 15%, transparent); color:var(--success);">${st.allowed}</span>
                                            ${st.denied > 0 ? `<span style="font-size:0.65rem; padding:1px 6px; border-radius:8px; background:color-mix(in srgb, var(--danger) 15%, transparent); color:var(--danger);">${st.denied}</span>` : ''}
                                        </div>
                                    </div>
                                    ${isActive ? '<div style="width:4px; height:24px; border-radius:2px; background:var(--accent-primary); flex-shrink:0;"></div>' : ''}
                                </div>`;
                            }).join('')}
                        </div>
                        <div style="padding:8px 10px; border-top:1px solid var(--border-color); text-align:center;">
                            <span style="font-size:0.7rem; color:var(--text-muted);">${entities.length} entities</span>
                        </div>
                    </div>
                    
                    <!-- RIGHT: Detail Panel -->
                    <div style="flex:1; display:flex; flex-direction:column; background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; overflow:hidden;">
                        ${selEntity ? (() => {
                            const se = selEntity;
                            const isUser = se.type === 'user';
                            const st = entityStats[se.id] || { allowed: tasks.length, denied: 0 };
                            
                            return `
                            <!-- Detail Header -->
                            <div style="padding:16px 20px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; background:var(--sidebar-active);">
                                        ${isUser ? '👤' : '👥'}
                                    </div>
                                    <div>
                                        <div style="font-weight:600; color:var(--text-primary); font-size:0.95rem;">${se.name || 'Unknown'}</div>
                                        <div style="font-size:0.75rem; color:var(--text-muted);">${isUser ? 'User' : 'Group'} &middot; ${st.allowed} allowed, ${st.denied} denied</div>
                                    </div>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button onclick="setAllEntityTasks('${se.id}', true)" style="padding:6px 14px; border-radius:10px; border:1px solid var(--success); background:transparent; color:var(--success); font-size:0.75rem; font-weight:600; cursor:pointer;">Allow All</button>
                                    <button onclick="setAllEntityTasks('${se.id}', false)" style="padding:6px 14px; border-radius:10px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-size:0.75rem; font-weight:600; cursor:pointer;">Deny All</button>
                                </div>
                            </div>
                            
                            <!-- Task List (scrollable) -->
                            <div style="flex:1; overflow-y:auto; padding:12px 16px;">
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    ${tasks.map((task, tIdx) => {
                                        const taskId = task.id || 'task-' + tIdx;
                                        const isAllowed = getTaskPermission(taskId, se.id) !== false;
                                        
                                        return `
                                        <label style="display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:12px; cursor:pointer; background:var(--bg-secondary); border:1px solid var(--border-color); transition:all 0.15s;">
                                            <input type="checkbox"
                                                   onchange="toggleWizardTaskPermission('${taskId}', '${se.id}', this.checked); renderWizardTaskPermissions();"
                                                   ${isAllowed ? 'checked' : ''}
                                                   style="width:18px; height:18px; border-radius:5px; accent-color:var(--success); cursor:pointer; flex-shrink:0;">
                                            <div style="flex:1; min-width:0;">
                                                <div style="font-size:0.875rem; font-weight:500; color:${isAllowed ? 'var(--text-primary)' : 'var(--danger)'}; ${isAllowed ? '' : 'text-decoration:line-through;'}">${task.name || 'Unnamed Task'}</div>
                                                ${task.description ? `<div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${(task.description || '').slice(0, 80)}</div>` : ''}
                                            </div>
                                            <span style="font-size:0.7rem; padding:3px 10px; border-radius:8px; font-weight:500; flex-shrink:0;
                                                         background:${isAllowed ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)'}; 
                                                         color:${isAllowed ? 'var(--success)' : 'var(--danger)'};">${isAllowed ? 'Allowed' : 'Denied'}</span>
                                        </label>`;
                                    }).join('')}
                                </div>
                            </div>
                            `;
                        })() : `
                            <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.875rem;">
                                Select a user or group from the list
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        
        function getTaskPermission(taskId, entityId) {
            // Check specific entity permission first
            const key = `${taskId}:${entityId}`;
            if (wizardAccessState.taskPermissions[key] !== undefined) {
                return wizardAccessState.taskPermissions[key];
            }
            // Fall back to default (allowed)
            return true;
        }
        
        function toggleWizardTaskPermission(taskId, entityId, allowed) {
            const key = `${taskId}:${entityId}`;
            wizardAccessState.taskPermissions[key] = allowed;
            
            // Save immediately like delegated admins do
            saveUserTaskPermissions();
        }
        
        // Select an entity in the master-detail panel
        function acSelectEntity(entityId) {
            window._acSelectedEntityId = entityId;
            renderWizardTaskPermissions();
        }
        
        // Filter entity list by search query
        function acFilterEntities(query) {
            const items = document.querySelectorAll('.ac-entity-item');
            const q = (query || '').toLowerCase();
            items.forEach(item => {
                const name = item.getAttribute('data-name') || '';
                const type = item.getAttribute('data-type') || '';
                const match = !q || name.includes(q) || type.includes(q);
                item.style.display = match ? 'flex' : 'none';
            });
        }
        
        // Bulk selection
        function acToggleBulk(entityId, checked) {
            if (!window._acBulkSelected) window._acBulkSelected = new Set();
            if (checked) {
                window._acBulkSelected.add(entityId);
            } else {
                window._acBulkSelected.delete(entityId);
            }
            renderWizardTaskPermissions();
        }
        
        function acBulkClear() {
            window._acBulkSelected = new Set();
            renderWizardTaskPermissions();
        }
        
        // Apply permissions in bulk to all selected entities
        function acBulkApply(allowed) {
            const sel = window._acBulkSelected || new Set();
            const tasks = wizard.tasks || [];
            sel.forEach(entityId => {
                tasks.forEach((task, i) => {
                    const taskId = task.id || `task-${i}`;
                    wizardAccessState.taskPermissions[`${taskId}:${entityId}`] = allowed;
                });
            });
            saveUserTaskPermissions();
            window._acBulkSelected = new Set();
            renderWizardTaskPermissions();
        }
        
        // Allow or deny all tasks for a specific entity
        function setAllEntityTasks(entityId, allowed) {
            const tasks = wizard.tasks || [];
            tasks.forEach((task, i) => {
                const taskId = task.id || `task-${i}`;
                const key = `${taskId}:${entityId}`;
                wizardAccessState.taskPermissions[key] = allowed;
            });
            saveUserTaskPermissions();
            renderWizardTaskPermissions();
        }
        
        // Save user task permissions immediately (same pattern as saveAgentManagement)
        async function saveUserTaskPermissions() {
            const agentId = wizard.id || wizard.editId;
            if (!agentId) {
                console.log('⏭️ No agent ID yet, skipping task permissions save');
                return;
            }
            
            const orgId = currentUser?.org_id || 'default';
            
            // ✨ NEW APPROACH: Same as delegated admins
            // Save denied_task_names with each entity via /access endpoint
            const tasks = wizard.tasks || [];
            const entities = wizardAccessState.selectedEntities || [];
            
            // Build entities with denied_task_names (same as delegated admin approach)
            const entitiesWithPermissions = entities.map(e => {
                const deniedTaskNames = [];
                
                tasks.forEach((task, i) => {
                    const taskId = task.id || `task-${i}`;
                    const key = `${taskId}:${e.id}`;
                    if (wizardAccessState.taskPermissions[key] === false) {
                        deniedTaskNames.push(task.name);
                    }
                });
                
                return {
                    id: e.id,
                    type: e.type,
                    name: e.name,
                    denied_task_names: deniedTaskNames.length > 0 ? deniedTaskNames : null
                };
            });
            
            try {
                // Save via /access endpoint (same as delegated admins use /management)
                await fetch(`/api/access-control/agents/${agentId}/access?org_id=${orgId}`, {
                    method: 'PUT',
                    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_type: wizardAccessState.accessType || 'specific',
                        entities: entitiesWithPermissions
                    })
                });
                console.log('✅ User task permissions saved via /access (same as delegated admins)');
            } catch (e) {
                console.error('❌ Failed to save user task permissions:', e);
            }
        }
        
        function toggleAllEntitiesForTask(taskId) {
            const entities = wizardAccessState.selectedEntities || [];
            // Check current state of first entity
            const firstKey = `${taskId}:${entities[0]?.id || 'default'}`;
            const currentState = wizardAccessState.taskPermissions[firstKey] !== false;
            const newState = !currentState;
            
            // Toggle all entities for this task
            entities.forEach(e => {
                wizardAccessState.taskPermissions[`${taskId}:${e.id}`] = newState;
            });
            wizardAccessState.taskPermissions[`${taskId}:default`] = newState;
            
            // Save immediately
            saveUserTaskPermissions();
            renderWizardTaskPermissions();
        }
        
        function allowAllTasks() {
            const tasks = wizard.tasks || [];
            const entities = wizardAccessState.selectedEntities || [];
            
            tasks.forEach(task => {
                const taskId = task.id || `task-${tasks.indexOf(task)}`;
                entities.forEach(e => {
                    wizardAccessState.taskPermissions[`${taskId}:${e.id}`] = true;
                });
                wizardAccessState.taskPermissions[`${taskId}:default`] = true;
            });
            
            // Save immediately
            saveUserTaskPermissions();
            renderWizardTaskPermissions();
        }
        
        function denyAllTasks() {
            const tasks = wizard.tasks || [];
            const entities = wizardAccessState.selectedEntities || [];
            
            tasks.forEach(task => {
                const taskId = task.id || `task-${tasks.indexOf(task)}`;
                entities.forEach(e => {
                    wizardAccessState.taskPermissions[`${taskId}:${e.id}`] = false;
                });
                wizardAccessState.taskPermissions[`${taskId}:default`] = false;
            });
            
            // Save immediately
            saveUserTaskPermissions();
            renderWizardTaskPermissions();
        }
        
        function collectWizardAccessControl() {
            // ✨ NEW APPROACH: Store denied_task_names with each entity (same as delegated admins)
            const tasks = wizard.tasks || [];
            const entities = wizardAccessState.selectedEntities || [];
            
            console.log('📋 ========== COLLECTING ACCESS CONTROL ==========');
            console.log('📋 Tasks:', tasks.map(t => ({id: t.id, name: t.name})));
            console.log('📋 Entities:', entities.map(e => ({id: e.id, name: e.name, type: e.type})));
            console.log('📋 Task Permissions State:', JSON.stringify(wizardAccessState.taskPermissions, null, 2));
            
            // Build entities with their denied_task_names
            const entitiesWithPermissions = entities.map(e => {
                const deniedTaskNames = [];
                
                tasks.forEach((task, i) => {
                    const taskId = task.id || `task-${i}`;
                    const key = `${taskId}:${e.id}`;
                    const isAllowed = wizardAccessState.taskPermissions[key];
                    
                    if (isAllowed === false) {
                        deniedTaskNames.push(task.name);
                        console.log(`   ❌ DENIED: ${e.name} for task "${task.name}"`);
                    }
                });
                
                console.log(`📋 Entity "${e.name}": denied_task_names=[${deniedTaskNames.join(', ')}]`);
                
                return {
                    id: e.id,
                    type: e.type,
                    name: e.name,
                    denied_task_names: deniedTaskNames.length > 0 ? deniedTaskNames : null
                };
            });
            
            wizard.accessControl = {
                accessType: wizardAccessState.accessType,
                entities: entitiesWithPermissions,
                _loaded: true  // ✅ Mark as ready for save (user explicitly modified)
            };
            
            console.log('📋 Final Access Control:', JSON.stringify(wizard.accessControl, null, 2));
            console.log('📋 ================================================');
        }
        
        async function loadAgentAccessControl(agentId) {
            // Try to load access control from the API
            try {
                const orgId = currentUser?.org_id || 'default';
                const response = await fetch(`/api/access-control/agents/${agentId}/full?org_id=${orgId}`, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('🔵 [API] Full access control response:', JSON.stringify(data, null, 2));
                    console.log('🔵 [API] agent_access:', JSON.stringify(data.agent_access, null, 2));
                    console.log('🔵 [API] agent_access.entities:', JSON.stringify(data.agent_access?.entities, null, 2));
                    
                    // ✨ NEW APPROACH: Read denied_task_names from each entity (same as delegated admins)
                    const mappedEntities = (data.agent_access?.entities || []).map(e => ({
                        id: e.entity_id || e.id,
                        type: e.entity_type || e.type,
                        name: e.name || '',
                        denied_task_names: e.denied_task_names || null  // ✅ Include denied tasks
                    }));
                    console.log('🔵 [API] Mapped entities with denied_task_names:', JSON.stringify(mappedEntities, null, 2));
                    
                    wizard.accessControl = {
                        accessType: data.agent_access?.access_type || 'authenticated',
                        entities: mappedEntities,
                        _loaded: true  // ✅ Mark as loaded from API to prevent accidental overwrite
                    };
                    
                    console.log('🔵 [API] Final wizard.accessControl:', JSON.stringify(wizard.accessControl, null, 2));
                    console.log('✅ Access control marked as _loaded = true');
                }
            } catch (e) {
                console.error('❌ Could not load access control from API:', e);
            }
        }
        
        async function saveAgentAccessControl(agentId) {
            // Save access control to the API
            try {
                const orgId = currentUser?.org_id || 'default';
                const userId = currentUser?.id || 'system';
                const ac = wizard.accessControl || {};
                
                // ⚠️ CRITICAL: Check if user has permission to save access control
                const perms = wizard.userPermissions || {};
                const canSaveAccess = perms.is_owner || perms.can_manage_access;
                const canSaveTaskPerms = perms.is_owner || perms.can_manage_task_permissions;
                
                // ⚠️ Also check if access control was actually loaded and modified
                // Prevent accidental overwrite of existing permissions
                if (!ac._loaded) {
                    console.log('⚠️ Access control not loaded from API - skipping save to prevent data loss');
                    return;
                }
                
                console.log('Saving access control for agent:', agentId, ac);
                console.log('🔐 Permissions check - canSaveAccess:', canSaveAccess, 'canSaveTaskPerms:', canSaveTaskPerms);
                
                // ✨ NEW APPROACH: Save everything via /access endpoint (same as delegated admins)
                // Include denied_task_names with each entity
                if (canSaveAccess || canSaveTaskPerms) {
                    const accessBody = {
                        access_type: ac.accessType || 'authenticated',
                        entities: (ac.entities || []).map(e => ({
                            id: e.id,
                            type: e.type,
                            name: e.name || 'Unknown',
                            denied_task_names: e.denied_task_names || null  // ✅ Include denied tasks
                        }))
                    };
                    console.log('📤 Saving access control with denied_task_names:', JSON.stringify(accessBody, null, 2));
                    
                    const accessResponse = await fetch(`/api/access-control/agents/${agentId}/access?org_id=${orgId}&user_id=${userId}`, {
                        method: 'PUT',
                        headers: { 
                            ...getAuthHeaders(), 
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify(accessBody)
                    });
                    
                    if (!accessResponse.ok) {
                        const errorText = await accessResponse.text();
                        console.error('❌ Failed to save access control:', accessResponse.status, errorText);
                    } else {
                        console.log('✅ Access control saved (including task permissions)');
                    }
                } else {
                    console.log('⏭️ Skipping access save - no permission');
                }
                
                console.log('✅ Access control save completed');
            } catch (e) {
                console.error('Failed to save access control:', e);
            }
        }
        
        async function loadWizardAccessControl() {
            const ac = wizard.accessControl || {};
            
            console.log('📥 ========== LOADING ACCESS CONTROL ==========');
            console.log('📥 Raw wizard.accessControl:', JSON.stringify(ac, null, 2));
            
            wizardAccessState.accessType = ac.accessType || 'authenticated';
            
            // Load all users/groups/roles first if not already loaded
            if (wizardAccessState.allUsers.length === 0) {
                await loadWizardAccessEntities();
            }
            
            // ✨ NEW APPROACH: Read denied_task_names from each entity (same as delegated admins)
            // Build a map of entityId -> denied_task_names
            const entityDeniedTasks = {};
            
            // Map entities and enrich with actual names
            wizardAccessState.selectedEntities = (ac.entities || []).map(e => {
                let name = e.name;
                let icon = '👤';
                
                // Store denied_task_names for this entity
                if (e.denied_task_names && e.denied_task_names.length > 0) {
                    entityDeniedTasks[e.id] = e.denied_task_names;
                    console.log(`📥 Entity ${e.id.slice(0, 8)}... has denied_task_names:`, e.denied_task_names);
                }
                
                // Try to find actual name from loaded data
                if (e.type === 'user') {
                    const user = wizardAccessState.allUsers.find(u => u.id === e.id);
                    if (user) {
                        name = user.name || user.email || `User ${e.id.slice(0, 8)}...`;
                    }
                    icon = '👤';
                } else if (e.type === 'group') {
                    const group = wizardAccessState.allGroups.find(g => g.id === e.id);
                    if (group) {
                        name = group.name || `Group ${e.id.slice(0, 8)}...`;
                    }
                    icon = '👥';
                } else if (e.type === 'role') {
                    const role = wizardAccessState.allRoles.find(r => r.id === e.id);
                    if (role) {
                        name = role.name || `Role ${e.id.slice(0, 8)}...`;
                    }
                    icon = '🏷️';
                }
                
                return { ...e, name, icon };
            });
            
            console.log('📥 Selected Entities:', wizardAccessState.selectedEntities.map(e => ({id: e.id, name: e.name, type: e.type})));
            console.log('📥 Entity denied tasks map:', entityDeniedTasks);
            
            // Convert to internal format: taskId:entityId -> true/false
            wizardAccessState.taskPermissions = {};
            const currentTasks = wizard.tasks || [];
            
            currentTasks.forEach((task, i) => {
                const taskId = task.id || `task-${i}`;
                const taskName = task.name;
                
                // Set default permission
                wizardAccessState.taskPermissions[`${taskId}:default`] = true;
                
                // Set per-entity permissions based on denied_task_names
                wizardAccessState.selectedEntities.forEach(e => {
                    const deniedTaskNames = entityDeniedTasks[e.id] || [];
                    const isDenied = deniedTaskNames.includes(taskName);
                    wizardAccessState.taskPermissions[`${taskId}:${e.id}`] = !isDenied;
                    if (isDenied) {
                        console.log(`   ❌ DENIED: ${e.name} for task "${taskName}" (${taskId})`);
                    }
                });
            });
            
            console.log('📥 Final taskPermissions state:', JSON.stringify(wizardAccessState.taskPermissions, null, 2));
            console.log('📥 ================================================');
            
            // Update the visual selection on access type cards
            console.log('📥 Setting access type visual selection to:', wizardAccessState.accessType);
            selectWizardAccessType(wizardAccessState.accessType);
        }
        
        async function loadGuardrailsToForm() {
            const g = wizard.guardrails || {};
            
            const setChecked = (id, value, defaultVal = true) => {
                const el = document.getElementById(id);
                if(el) el.checked = value ?? defaultVal;
            };
            
            const setValue = (id, value, defaultVal = '') => {
                const el = document.getElementById(id);
                if(el) el.value = value ?? defaultVal;
            };
            
            setChecked('guard-anti-hallucination', g.antiHallucination, true);
            setChecked('guard-cite-sources', g.citeSources, true);
            setChecked('guard-admit-uncertainty', g.admitUncertainty, true);
            setChecked('guard-verify-facts', g.verifyFacts, true);
            setChecked('guard-no-speculation', g.noSpeculation, false);
            setValue('guard-avoid-topics', g.avoidTopics, '');
            setValue('guard-focus-topics', g.focusTopics, '');
            setValue('guard-max-length', g.maxLength, 'medium');
            setValue('guard-language', g.language, 'user');
            setChecked('guard-escalate-angry', g.escalateAngry, true);
            setChecked('guard-escalate-complex', g.escalateComplex, true);
            setChecked('guard-escalate-request', g.escalateRequest, true);
            setChecked('guard-escalate-sensitive', g.escalateSensitive, false);
            setChecked('guard-pii-protection', g.piiProtection, true);
            setChecked('guard-mask-pii', g.maskPii, true);
            setChecked('guard-no-store-pii', g.noStorePii, true);
            
            // Load access control settings (async - enriches entity names)
            await loadWizardAccessControl();
        }
        
        async function showPreviewNew() {
            console.log('=== showPreviewNew called ===');
            
            const preview = document.getElementById('w-preview');
            if(!preview) {
                console.error('Preview container #w-preview not found');
                return;
            }
            
            // Use wizard state (populated by AI generation)
            if (!wizard.name || !wizard.goal || !wizard.personality) {
                console.error('Agent not fully configured. Please generate configuration first.');
                return;
            }
            
            // Collect guardrails from form
            collectGuardrails();
            
            // Load tools from API if not loaded
            if (allTools.length === 0) {
                try {
                    const toolsResponse = await fetch(API + '/api/tools');
                    const toolsData = await toolsResponse.json();
                    allTools = toolsData.tools || [];
                    console.log('Loaded tools for preview:', allTools.length);
                } catch(e) {
                    console.error('Error loading tools:', e);
                }
            }
            
            // Debug
            console.log('Preview state:', JSON.stringify({
                name: wizard.name,
                icon: wizard.icon,
                goal: (wizard.goal || '').substring(0, 50),
                tasksCount: (wizard.tasks || []).length,
                toolsCount: (wizard.tool_ids || []).length,
                allToolsCount: allTools.length
            }));
            
            // Safe access to arrays
            const tasks = Array.isArray(wizard.tasks) ? wizard.tasks : [];
            const toolIds = Array.isArray(wizard.tool_ids) ? wizard.tool_ids : [];
            const guardrails = wizard.guardrails || {};
            
            // Safe HTML escape
            const esc = (text) => {
                if(text === null || text === undefined) return '';
                const div = document.createElement('div');
                div.textContent = String(text);
                return div.innerHTML;
            };
            
            // Build tasks HTML with instructions
            let tasksHtml = '';
            if(tasks.length > 0) {
                tasks.forEach(task => {
                    if(!task) return;
                    const insts = Array.isArray(task.instructions) ? task.instructions : [];
                    let instsHtml = '';
                    if (insts.length > 0) {
                        instsHtml = `
                            <div class="mt-2 space-y-1">
                                ${insts.map((inst, i) => `
                                    <div class="flex gap-2 text-xs text-gray-400">
                                        <span class="text-purple-400">${i + 1}.</span>
                                        <span>${esc(inst)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                    tasksHtml += `
                        <div class="bg-gray-800/50 rounded-lg p-3">
                            <div class="font-medium text-sm">${esc(task.name || 'Unnamed Task')}</div>
                            <p class="text-xs text-gray-400 mt-1">${esc(task.description || '')}</p>
                            ${instsHtml}
                        </div>
                    `;
                });
            } else {
                tasksHtml = '<p class="text-gray-500 text-sm">No tasks defined</p>';
            }
            
            // Build tools HTML - fetch fresh from API to ensure names are shown
            let toolsHtml = '';
            
            // Debug
            console.log('=== Tools Debug ===');
            console.log('toolIds:', toolIds);
            
            if (toolIds.length > 0) {
                // Fetch tools from API and match by ID
                try {
                    const response = await fetch(API + '/api/tools');
                    const data = await response.json();
                    const allToolsFromApi = data.tools || [];
                    
                    console.log('Fetched tools:', allToolsFromApi.length);
                    console.log('Tool IDs to match:', toolIds);
                    
                    // Also check selectedDemoTools for tool names
                    const allSelectedTools = [
                        ...(selectedDemoTools?.apis || []),
                        ...(selectedDemoTools?.knowledge_bases || []),
                        ...(selectedDemoTools?.websites || []),
                        ...(selectedDemoTools?.databases || []),
                        ...(selectedDemoTools?.emails || []),
                        ...(selectedDemoTools?.webhooks || []),
                        ...(selectedDemoTools?.slacks || []),
                        ...(selectedDemoTools?.calendars || []),
                        ...(selectedDemoTools?.websearches || [])
                    ];
                    
                    toolsHtml = toolIds.map(toolId => {
                        const searchId = toolId.includes(':') ? toolId.split(':')[1] : toolId;
                        
                        // Try matching from API tools
                        let tool = allToolsFromApi.find(t => t.id === toolId);
                        if (!tool) tool = allToolsFromApi.find(t => t.id === searchId);
                        
                        // Try matching from selectedDemoTools (has names!)
                        if (!tool) tool = allSelectedTools.find(t => t.id === toolId);
                        if (!tool) tool = allSelectedTools.find(t => t.id === searchId);
                        
                        // More flexible matching
                        if (!tool) tool = allToolsFromApi.find(t => t.id?.includes(searchId) || searchId?.includes(t.id));
                        if (!tool) tool = allSelectedTools.find(t => t.id?.includes(searchId) || searchId?.includes(t.id));
                        
                        console.log('Tool matching:', toolId, '→', tool?.name || 'NOT FOUND');
                        
                        const isApi = tool?.type === 'api' || tool?.type === 'website' || toolId.startsWith('api:');
                        const icon = isApi ? '🔌' : '📚';
                        const name = tool?.name || 'Unknown Tool';
                        const colorClass = isApi
                            ? 'bg-blue-900/30 border border-blue-500/30' 
                            : 'bg-purple-900/30 border border-purple-500/30';
                        
                        return `<span class="px-3 py-1.5 ${colorClass} rounded-lg text-sm">${icon} ${esc(name)}</span>`;
                    }).join('');
                } catch(e) {
                    console.error('Error fetching tools:', e);
                    toolsHtml = '<span class="text-gray-500 text-sm">Error loading tools</span>';
                }
            } else if (wizard.generatedTools && wizard.generatedTools.length > 0) {
                // Use generated tools if available
                toolsHtml = wizard.generatedTools.map(tool => {
                    const icon = tool.type === 'api' ? '🔌' : '📚';
                    const colorClass = tool.type === 'api'
                        ? 'bg-blue-900/30 border border-blue-500/30' 
                        : 'bg-purple-900/30 border border-purple-500/30';
                    return `<span class="px-3 py-1.5 ${colorClass} rounded-lg text-sm">${icon} ${esc(tool.name)}</span>`;
                }).join('');
            } else {
                toolsHtml = '<span class="text-gray-500 text-sm">No tools selected</span>';
            }
            
            // Update toolIds count for display
            const toolsCount = wizard.generatedTools?.length || toolIds.length || 0;
            
            // Build guardrails HTML
            const hasGuardrails = guardrails.antiHallucination || guardrails.citeSources || 
                                 guardrails.piiProtection || guardrails.escalateComplex ||
                                 guardrails.escalateAngry || guardrails.escalateRequest;
            
            let guardrailsHtml = '';
            if(guardrails.antiHallucination) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Anti-Hallucination</span>';
            if(guardrails.citeSources) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Cite Sources</span>';
            if(guardrails.piiProtection) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ PII Protection</span>';
            if(guardrails.escalateComplex) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Smart Escalation</span>';
            if(guardrails.escalateAngry) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Anger Detection</span>';
            if(guardrails.admitUncertainty) guardrailsHtml += '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded">✓ Admit Uncertainty</span>';
            if(!hasGuardrails) guardrailsHtml = '<span class="text-gray-500">No guardrails configured</span>';
            
            // Set the HTML
            preview.innerHTML = `
                <!-- Agent Identity -->
                <div class="card rounded-xl p-4">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl">
                            ${wizard.icon || '🤖'}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold">${esc(wizard.name)}</h3>
                            <p class="text-sm text-gray-400">
                                Model: ${wizard.model}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Personality Summary -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-2 flex items-center gap-2">
                        <span>🎭</span> Personality
                    </h4>
                    <p class="text-sm text-gray-300">${wizard.personalityReason || 'AI-configured personality'}</p>
                    <div class="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-400">
                        <div>Creativity: ${wizard.personality?.creativity || '-'}/10</div>
                        <div>Length: ${wizard.personality?.length || '-'}/10</div>
                        <div>Formality: ${wizard.personality?.formality || '-'}/10</div>
                        <div>Empathy: ${wizard.personality?.empathy || '-'}/10</div>
                        <div>Proactivity: ${wizard.personality?.proactivity || '-'}/10</div>
                        <div>Confidence: ${wizard.personality?.confidence || '-'}/10</div>
                    </div>
                </div>
                
                <!-- Goal -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-2 flex items-center gap-2">
                        <span>🎯</span> Goal
                    </h4>
                    <p class="text-sm text-gray-300 whitespace-pre-wrap">${esc(wizard.goal)}</p>
                </div>
                
                <!-- Tasks -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-3 flex items-center gap-2">
                        <span>📋</span> Tasks (${tasks.length})
                    </h4>
                    <div class="space-y-3">${tasksHtml}</div>
                </div>
                
                <!-- Tools -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-3 flex items-center gap-2">
                        <span>🔧</span> Tools (${toolsCount})
                    </h4>
                    <div class="flex flex-wrap gap-2">${toolsHtml}</div>
                </div>
                
                <!-- Guardrails Summary -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-3 flex items-center gap-2">
                        <span>🛡️</span> Guardrails
                    </h4>
                    <div class="flex flex-wrap gap-2 text-sm">${guardrailsHtml}</div>
                </div>
                
                <!-- User Access Control -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-3 flex items-center gap-2">
                        <span>🔐</span> User Access
                    </h4>
                    ${buildUserAccessPreviewHtml()}
                </div>
                
                <!-- Delegated Admins -->
                <div class="card rounded-xl p-4">
                    <h4 class="font-medium mb-3 flex items-center gap-2">
                        <span>👥</span> Delegated Admins
                    </h4>
                    ${buildDelegatedAdminsPreviewHtml()}
                </div>
            `;
            
            console.log('Preview rendered successfully');
        }
        
        // Build HTML for user access permissions in preview - DETAILED
        function buildUserAccessPreviewHtml() {
            const accessType = wizardAccessState.accessType || 'authenticated';
            const selectedEntities = wizardAccessState.selectedEntities || [];
            const taskPermissions = wizardAccessState.taskPermissions || {};
            const tasks = wizard.tasks || [];
            
            // Debug logging
            console.log('🔍 [PREVIEW] buildUserAccessPreviewHtml called');
            console.log('🔍 [PREVIEW] accessType:', accessType);
            console.log('🔍 [PREVIEW] selectedEntities:', selectedEntities.length, selectedEntities.map(e => ({id: e.id?.slice(0,8), name: e.name})));
            console.log('🔍 [PREVIEW] tasks:', tasks.map(t => ({id: t.id?.slice(0,8), name: t.name})));
            console.log('🔍 [PREVIEW] taskPermissions keys:', Object.keys(taskPermissions));
            console.log('🔍 [PREVIEW] taskPermissions full:', JSON.stringify(taskPermissions, null, 2));
            
            // Access type description
            let accessTypeHtml = '';
            if (accessType === 'public') {
                accessTypeHtml = '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">🌍 Public Access</span>';
            } else if (accessType === 'specific') {
                accessTypeHtml = '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">🔒 Specific Users/Groups</span>';
            } else {
                accessTypeHtml = '<span class="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-sm">🔐 Authenticated Users</span>';
            }
            
            if (accessType !== 'specific' || selectedEntities.length === 0) {
                return `
                    <div class="mb-3">${accessTypeHtml}</div>
                    <p class="text-sm text-gray-500">${accessType === 'public' ? 'Anyone can access this agent' : accessType === 'authenticated' ? 'All logged-in users can access' : 'No specific users selected'}</p>
                `;
            }
            
            // Build entity list with DETAILED task permissions
            let entitiesHtml = selectedEntities.map(entity => {
                const icon = entity.type === 'user' ? '👤' : '👥';
                
                // Get detailed task permissions for this entity
                let taskDetailsHtml = '';
                if (tasks.length > 0) {
                    const taskItems = tasks.map((task, i) => {
                        // Key format: taskId:entityId (same as storage format)
                        const taskId = task.id || `task-${i}`;
                        const key = `${taskId}:${entity.id}`;
                        const value = taskPermissions[key];
                        const hasAccess = value !== false;
                        console.log(`🔍 [PREVIEW] Task "${task.name}" for ${entity.name}: key=${key}, value=${value}, hasAccess=${hasAccess}`);
                        return `
                            <div class="flex items-center gap-2 text-xs ${hasAccess ? 'text-green-400' : 'text-red-400'}">
                                <span>${hasAccess ? '✓' : '✗'}</span>
                                <span>${task.name}</span>
                            </div>
                        `;
                    }).join('');
                    
                    taskDetailsHtml = `
                        <div class="mt-2 pl-6 space-y-1 border-l-2 border-gray-700">
                            <div class="text-xs text-gray-500 mb-1">Task Access:</div>
                            ${taskItems}
                        </div>
                    `;
                }
                
                return `
                    <div class="bg-gray-800/50 rounded-lg p-3 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${icon}</span>
                            <span class="font-medium">${entity.name || entity.email || 'Unknown'}</span>
                            <span class="text-xs text-gray-500">(${entity.type === 'user' ? 'User' : 'Group'})</span>
                        </div>
                        ${taskDetailsHtml}
                    </div>
                `;
            }).join('');
            
            return `
                <div class="mb-3">${accessTypeHtml}</div>
                <div class="space-y-2">${entitiesHtml}</div>
            `;
        }
        
        // Build HTML for delegated admins in preview - DETAILED
        function buildDelegatedAdminsPreviewHtml() {
            const delegatedAdmins = agentAdminState.delegatedAdmins || [];
            const tasks = wizard.tasks || [];
            
            if (delegatedAdmins.length === 0) {
                return '<p class="text-sm text-gray-500">No delegated admins - you are the only admin</p>';
            }
            
            // Permission labels for display
            const permissionLabels = {
                'full_admin': '⭐ Full Admin',
                'edit_basic_info': '📝 Edit Info',
                'edit_personality': '🎭 Edit Personality',
                'edit_model': '🤖 Change Model',
                'edit_guardrails': '🛡️ Edit Guardrails',
                'manage_tasks': '📋 Manage Tasks',
                'manage_tools': '🔧 Manage Tools',
                'manage_knowledge': '📚 Manage Knowledge',
                'manage_users': '👥 Manage Access',
                'view_analytics': '📊 View Analytics',
                'export_data': '📤 Export Data'
            };
            
            return delegatedAdmins.map(admin => {
                const icon = admin.entity_type === 'user' ? '👤' : '👥';
                const hasFullAdmin = admin.permissions?.includes('full_admin');
                const deniedTasks = admin.denied_task_names || [];
                const permissions = admin.permissions || [];
                
                // Resolve actual name from loaded users/groups
                let displayName = admin.entity_name;
                if (!displayName || displayName.includes('...')) {
                    if (admin.entity_type === 'user') {
                        const user = wizardAccessState.allUsers.find(u => u.id === admin.entity_id);
                        displayName = user?.name || user?.email || admin.entity_name || 'Unknown User';
                    } else {
                        const group = wizardAccessState.allGroups.find(g => g.id === admin.entity_id);
                        displayName = group?.name || admin.entity_name || 'Unknown Group';
                    }
                }
                
                // Build DETAILED agent permissions
                let agentPermsHtml = '';
                if (hasFullAdmin) {
                    agentPermsHtml = '<span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">⭐ Full Admin (all permissions)</span>';
                } else if (permissions.length > 0) {
                    agentPermsHtml = permissions.map(p => {
                        const label = permissionLabels[p] || p;
                        return `<span class="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">${label}</span>`;
                    }).join(' ');
                } else {
                    agentPermsHtml = '<span class="text-xs text-gray-500">No agent permissions</span>';
                }
                
                // Build DETAILED task permissions (chat access)
                let taskPermsHtml = '';
                if (tasks.length > 0) {
                    const taskItems = tasks.map(task => {
                        const isDenied = deniedTasks.includes(task.name);
                        return `
                            <div class="flex items-center gap-2 text-xs ${isDenied ? 'text-red-400' : 'text-green-400'}">
                                <span>${isDenied ? '✗' : '✓'}</span>
                                <span>${task.name}</span>
                            </div>
                        `;
                    }).join('');
                    
                    taskPermsHtml = `
                        <div class="mt-2 pt-2 border-t border-gray-700">
                            <div class="text-xs text-gray-500 mb-1">Chat Access (Tasks):</div>
                            <div class="pl-2 space-y-1">${taskItems}</div>
                        </div>
                    `;
                }
                
                return `
                    <div class="bg-gray-800/50 rounded-lg p-3 mb-2">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-lg">${icon}</span>
                            <span class="font-medium">${displayName}</span>
                            <span class="text-xs text-gray-500">(${admin.entity_type === 'user' ? 'User' : 'Group'})</span>
                        </div>
                        <div class="pl-6 border-l-2 border-gray-700">
                            <div class="text-xs text-gray-500 mb-1">Agent Permissions:</div>
                            <div class="flex flex-wrap gap-1 mb-2">${agentPermsHtml}</div>
                            ${taskPermsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function prepareTestSuggestions() {
            try {
                const container = document.getElementById('test-suggestions');
                if(!container) return;
                
                // Use unified test prompts if available (generated from demo data)
                let suggestions = [];
                
                if (wizard.testPrompts && wizard.testPrompts.length > 0) {
                    // Use the test prompts generated from actual demo data
                    suggestions = wizard.testPrompts.slice(0, 5).map(tp => ({
                        prompt: tp.prompt,
                        category: tp.category,
                        hasData: true  // These prompts CAN be answered
                    }));
                    console.log('Using unified test prompts:', suggestions.length);
                } else {
                    // Fallback to task-based suggestions
                    const tasks = wizard.tasks || [];
                    suggestions = tasks.slice(0, 3).map(task => ({
                        prompt: `Test: ${task.name || 'Task'}`,
                        category: task.name,
                        hasData: false
                    }));
                    
                    // Add generic suggestions
                    suggestions.push({ prompt: 'Hello, what can you help me with?', category: 'General', hasData: true });
                    suggestions.push({ prompt: 'Can you explain your capabilities?', category: 'General', hasData: true });
                }
                
                container.innerHTML = suggestions.map(s => `
                    <button onclick="document.getElementById('test-input').value='${escHtml(s.prompt)}'; sendTest();" 
                            class="px-3 py-1.5 ${s.hasData ? 'bg-green-900/30 border border-green-500/30 hover:bg-green-800/30' : 'bg-gray-800 hover:bg-gray-700'} rounded-lg text-sm transition"
                            title="${s.hasData ? '✓ This prompt can be answered from demo data' : 'Generic test prompt'}">
                        ${escHtml(s.prompt)}
                    </button>
                `).join('');
                
                // Show info about prompts
                if (wizard.testPrompts && wizard.testPrompts.length > 0) {
                    container.insertAdjacentHTML('afterbegin', `
                        <div class="w-full mb-2 text-xs text-green-400 flex items-center gap-1">
                            <span>✓</span> These prompts are generated from your demo data - the agent can answer them!
                        </div>
                    `);
                }
                
                console.log('Test suggestions prepared');
            } catch(e) {
                console.error('Error in prepareTestSuggestions:', e);
            }
        }
        
        // ============================================================================
        // UNIFIED DEMO SYSTEM - Connected Tools, Data & Test Prompts
        // ============================================================================
        
        async function generateUnifiedDemo() {
            /**
             * Unified Demo Generation:
             * 1. Calls /api/demo/unified-setup
             * 2. Gets demo tools WITH actual data stored in knowledge base
             * 3. Gets test prompts that CAN BE ANSWERED from the data
             * 4. Everything is connected!
             */
            
            const goal = wizard.goal || wizard.originalGoal;
            if (!goal) {
                alert('Please define an agent goal first');
                return;
            }
            
            // Show loading state
            const readyEl = document.getElementById('demo-setup-ready');
            const generatingEl = document.getElementById('demo-setup-generating');
            const resultsEl = document.getElementById('demo-setup-results');
            
            if (readyEl) readyEl.classList.add('hidden');
            if (generatingEl) generatingEl.classList.remove('hidden');
            if (resultsEl) resultsEl.classList.add('hidden');
            
            try {
                // Call unified setup API
                const response = await fetch(API + '/api/demo/unified-setup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        goal: goal,
                        agent_name: wizard.name,
                        tasks: wizard.tasks,
                        personality: wizard.personality
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Store the results
                    wizard.unifiedDemo = data;
                    wizard.generatedTools = data.tools || [];
                    wizard.testPrompts = data.test_prompts || [];
                    wizard.demoAssets = data.demo_assets || [];
                    wizard.demoScript = data.demo_script || [];
                    
                    // Add ALL generated tools to selectedDemoTools AND wizard.tool_ids
                    if (data.tools && data.tools.length > 0) {
                        data.tools.forEach(tool => {
                            // Add to selectedDemoTools based on type
                            addToolToSelection(tool);
                        });
                        // Sync to wizard.tool_ids
                        syncToolsToWizard();
                        console.log('[Demo] Tools added to selectedDemoTools and wizard:', wizard.tool_ids);
                    }
                    
                    console.log('[Unified Demo] Success:', {
                        domain: data.domain,
                        tools: data.tools.length,
                        testPrompts: data.test_prompts.length,
                        documents: data.sample_data_count
                    });
                    
                    // Update the tools list UI
                    updateSelectedToolsList();
                    
                    // Show results
                    if (generatingEl) generatingEl.classList.add('hidden');
                    if (resultsEl) resultsEl.classList.remove('hidden');
                    
                    renderUnifiedDemoResults(data);
                    
                } else {
                    throw new Error('API request failed');
                }
                
            } catch (e) {
                console.error('[Unified Demo] Error:', e);
                
                // Show error state
                if (generatingEl) generatingEl.classList.add('hidden');
                if (readyEl) readyEl.classList.remove('hidden');
                
                alert('Failed to generate demo. Please try again.');
            }
        }
        
        function renderUnifiedDemoResults(data) {
            const container = document.getElementById('generated-demo-tools');
            if (!container) return;
            
            // Tools already added in the main generation function
            // Just render the UI
            
            // Render API tools
            const apiTools = (data.tools || []).filter(t => t.type === 'api');
            const kbTools = (data.tools || []).filter(t => t.type === 'knowledge');
            
            let toolsHtml = '';
            
            // API Tools Section
            if (apiTools.length > 0) {
                toolsHtml += `<div class="mb-4">
                    <h5 class="text-xs font-medium text-gray-400 mb-2">🔌 Mockup APIs Created:</h5>
                    <div class="space-y-2">`;
                
                apiTools.forEach(tool => {
                    toolsHtml += `
                    <div class="p-3 rounded-xl bg-blue-900/20 border border-blue-500/30">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-medium text-blue-300">${escHtml(tool.name)}</span>
                            <span class="text-xs text-green-400">✓ Ready</span>
                        </div>
                        <p class="text-xs text-gray-400 mb-2">${escHtml(tool.description)}</p>
                        <div class="text-xs font-mono bg-gray-800/50 rounded px-2 py-1 text-gray-500">
                            ${escHtml(tool.endpoint || '')}
                        </div>
                        ${tool.mock_data ? `
                        <details class="mt-2">
                            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-400">View mock response</summary>
                            <pre class="mt-1 text-xs bg-gray-800/50 rounded p-2 overflow-x-auto text-green-400">${escHtml(JSON.stringify(tool.mock_data, null, 2))}</pre>
                        </details>` : ''}
                    </div>`;
                });
                
                toolsHtml += `</div></div>`;
            }
            
            // Knowledge Base Section
            if (kbTools.length > 0) {
                toolsHtml += `<div class="mb-4">
                    <h5 class="text-xs font-medium text-gray-400 mb-2">📚 Knowledge Bases:</h5>
                    <div class="space-y-2">`;
                
                kbTools.forEach(tool => {
                    toolsHtml += `
                    <div class="p-3 rounded-xl bg-purple-900/20 border border-purple-500/30">
                        <div class="flex items-center justify-between">
                            <span class="font-medium text-purple-300">${escHtml(tool.name)}</span>
                            <span class="text-xs text-green-400">✓ ${tool.documents_count || 0} docs indexed</span>
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${escHtml(tool.description)}</p>
                    </div>`;
                });
                
                toolsHtml += `</div></div>`;
            }
            
            // Demo Assets Section with download links
            if (data.demo_assets && data.demo_assets.length > 0) {
                toolsHtml += `<div class="mb-4">
                    <h5 class="text-xs font-medium text-gray-400 mb-2">📎 Demo Assets (for testing):</h5>
                    <div class="space-y-2">`;
                
                data.demo_assets.forEach(asset => {
                    const icon = asset.type === 'image' ? '🖼️' : '📄';
                    const downloadBtn = asset.download_url 
                        ? `<a href="${API}${asset.download_url}" download="${asset.name}" class="text-xs text-purple-400 hover:text-purple-300 ml-2">⬇️ Download</a>`
                        : '';
                    
                    toolsHtml += `
                    <div class="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span>${icon}</span>
                                <span class="text-sm font-medium">${escHtml(asset.name)}</span>
                            </div>
                            ${downloadBtn}
                        </div>
                        <p class="text-xs text-gray-400 mt-1">${escHtml(asset.description || '')}</p>
                        ${asset.purpose ? `<p class="text-xs text-gray-500 mt-1">Purpose: ${escHtml(asset.purpose)}</p>` : ''}
                        ${asset.sample_text ? `
                        <details class="mt-2">
                            <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-400">View OCR text content</summary>
                            <pre class="mt-1 text-xs bg-gray-900/50 rounded p-2 overflow-x-auto text-gray-400 whitespace-pre-wrap">${escHtml(asset.sample_text)}</pre>
                        </details>` : ''}
                    </div>`;
                });
                
                toolsHtml += `</div></div>`;
            }
            
            // Test Prompts Preview
            if (data.test_prompts && data.test_prompts.length > 0) {
                toolsHtml += `<div class="mb-4">
                    <h5 class="text-xs font-medium text-gray-400 mb-2">🧪 Test Prompts (${data.test_prompts.length}):</h5>
                    <div class="space-y-1">`;
                
                data.test_prompts.slice(0, 4).forEach(tp => {
                    toolsHtml += `
                    <div class="flex items-center gap-2 text-xs">
                        <span class="text-purple-400">💬</span>
                        <span class="text-gray-300">"${escHtml(tp.prompt)}"</span>
                        <span class="text-gray-600 ml-auto">${escHtml(tp.category || '')}</span>
                    </div>`;
                });
                
                if (data.test_prompts.length > 4) {
                    toolsHtml += `<p class="text-xs text-gray-500 mt-1">+ ${data.test_prompts.length - 4} more in Test step</p>`;
                }
                
                toolsHtml += `</div></div>`;
            }
            
            // Demo Script
            if (data.demo_script && data.demo_script.length > 0) {
                toolsHtml += `
                <details class="mt-4 pt-4 border-t border-gray-700">
                    <summary class="text-sm font-medium text-gray-400 cursor-pointer hover:text-white">📋 Demo Setup Script</summary>
                    <div class="mt-2 p-3 bg-gray-800/50 rounded-lg text-xs font-mono space-y-1">
                        ${data.demo_script.map(line => `<div class="${line.startsWith('✓') ? 'text-green-400' : 'text-gray-400'}">${escHtml(line)}</div>`).join('')}
                    </div>
                </details>`;
            }
            
            // Summary
            if (data.summary) {
                toolsHtml += `
                <div class="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div class="flex items-center gap-4 text-xs">
                        <span class="text-green-400">✓ Demo Ready</span>
                        <span class="text-gray-400">${data.summary.apis_created} APIs</span>
                        <span class="text-gray-400">${data.summary.knowledge_bases} KB</span>
                        <span class="text-gray-400">${data.summary.documents_indexed} docs</span>
                        <span class="text-gray-400">${data.summary.demo_assets} assets</span>
                    </div>
                </div>`;
            }
            
            container.innerHTML = toolsHtml;
            
            // Update the Agent's Tools list
            updateAgentToolsList();
        }
        
        function updateAgentToolsList() {
            const container = document.getElementById('w-tools-list');
            if (!container) return;
            
            if (wizard.tool_ids.length === 0) {
                container.innerHTML = `<div class="text-center py-4 text-gray-500 text-sm">
                    Generate demo environment above to add tools automatically
                </div>`;
                return;
            }
            
            // Fetch and display the actual tools
            fetch(API + '/api/tools')
                .then(r => r.json())
                .then(data => {
                    const tools = data.tools || [];
                    const selectedTools = tools.filter(t => wizard.tool_ids.includes(t.id));
                    
                    if (selectedTools.length === 0) {
                        container.innerHTML = `<div class="text-center py-4 text-gray-500 text-sm">
                            No tools added yet
                        </div>`;
                        return;
                    }
                    
                    container.innerHTML = selectedTools.map(tool => {
                        const icon = tool.type === 'api' ? '🔌' : tool.type === 'knowledge' ? '📚' : '🔧';
                        let bgClass = 'bg-gray-800/50';
                        let borderClass = 'border-gray-700';
                        if (tool.type === 'api') {
                            bgClass = 'bg-blue-900/20';
                            borderClass = 'border-blue-500/30';
                        } else if (tool.type === 'knowledge') {
                            bgClass = 'bg-purple-900/20';
                            borderClass = 'border-purple-500/30';
                        }
                        return `
                        <div class="flex items-center gap-3 p-3 rounded-lg ${bgClass} border ${borderClass}">
                            <span class="text-lg">${icon}</span>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">${escHtml(tool.name)}</div>
                                <div class="text-xs text-gray-500 truncate">${escHtml(tool.description || tool.type)}</div>
                            </div>
                            <button onclick="removeToolFromWizard('${tool.id}')" class="text-gray-500 hover:text-red-400 text-sm">✕</button>
                        </div>`;
                    }).join('');
                })
                .catch(e => {
                    console.error('Error loading tools:', e);
                });
        }
        
        function removeToolFromWizard(toolId) {
            wizard.tool_ids = wizard.tool_ids.filter(id => id !== toolId);
            
            // Also remove from selectedDemoTools
            const cleanId = toolId.replace(/^(api:|kb:)/, '');
            Object.keys(selectedDemoTools).forEach(key => {
                selectedDemoTools[key] = selectedDemoTools[key].filter(t => t.id !== toolId && t.id !== cleanId);
            });
            
            updateAgentToolsList();
            updateSelectedToolsList();
        }
        
        async function refineUnifiedDemo() {
            const input = document.getElementById('demo-refine-input');
            const refinement = input?.value?.trim();
            if (!refinement) return;
            
            input.value = '';
            input.disabled = true;
            
            try {
                const response = await fetch(API + '/api/demo/refine-unified', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        knowledge_base_id: wizard.knowledgeBaseId,
                        refinement_prompt: refinement,
                        goal: wizard.goal
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    wizard.unifiedDemo = data;
                    wizard.testPrompts = data.test_prompts || wizard.testPrompts;
                    renderUnifiedDemoResults(data);
                }
            } catch (e) {
                console.error('Refine error:', e);
            }
            
            input.disabled = false;
        }
        
        function regenerateUnifiedDemo() {
            // Reset UI state
            const readyEl = document.getElementById('demo-setup-ready');
            const resultsEl = document.getElementById('demo-setup-results');
            
            if (resultsEl) resultsEl.classList.add('hidden');
            if (readyEl) readyEl.classList.remove('hidden');
            
            // Clear previous data
            wizard.unifiedDemo = null;
            wizard.testPrompts = [];
            wizard.knowledgeBaseId = null;
            
            // Regenerate
            generateUnifiedDemo();
        }
        
        // ============================================================================
        // AI Configure Tools & Demo Data Generation
        // ============================================================================
        
        function toggleDemoGenerator() {
            const content = document.getElementById('demo-gen-content');
            const toggle = document.getElementById('demo-gen-toggle');
            if(content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                toggle.textContent = '▼';
            } else {
                content.classList.add('hidden');
                toggle.textContent = '▶';
            }
        }
        
        async function aiConfigureTools() {
            const goal = wizard.goal || wizard.originalGoal;
            if(!goal) {
                alert('Please define an agent goal first (Step 1)');
                return;
            }
            
            // Show loading
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="animate-pulse">⏳</span> Analyzing...';
            btn.disabled = true;
            
            try {
                const response = await fetch(API + '/api/agents/configure-tools', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        goal: goal,
                        agent_name: wizard.name,
                        tasks: wizard.tasks 
                    })
                });
                
                if(response.ok) {
                    const data = await response.json();
                    wizard.suggestedTools = data.tools || [];
                    wizard.demoSuggestions = data.demo_suggestions || {};
                    loadWizardToolsNew();
                    
                    // Show demo suggestions if any
                    if(data.demo_suggestions) {
                        updateDemoSuggestions(data.demo_suggestions);
                    }
                    
                    alert(`✅ AI recommended ${wizard.suggestedTools.length} tools for your agent!`);
                } else {
                    // Fallback to local
                    wizard.suggestedTools = getLocalToolRecommendations(goal);
                    loadWizardToolsNew();
                }
            } catch(e) {
                console.error('AI configure tools error:', e);
                wizard.suggestedTools = getLocalToolRecommendations(goal);
                loadWizardToolsNew();
            }
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        
        function getLocalToolRecommendations(goal) {
            const goalLower = goal.toLowerCase();
            
            if(goalLower.includes('customer') || goalLower.includes('support')) {
                return ['knowledge', 'database', 'email'];
            } else if(goalLower.includes('sales') || goalLower.includes('product')) {
                return ['database', 'crm', 'knowledge'];
            } else if(goalLower.includes('hr') || goalLower.includes('employee')) {
                return ['knowledge', 'calendar', 'database'];
            } else if(goalLower.includes('research') || goalLower.includes('analysis')) {
                return ['websearch', 'knowledge', 'code'];
            } else if(goalLower.includes('code') || goalLower.includes('developer')) {
                return ['code', 'websearch', 'knowledge'];
            }
            return ['knowledge', 'websearch'];
        }
        
        function updateDemoSuggestions(suggestions) {
            // Store suggestions for later use
            wizard.demoSuggestions = suggestions;
        }
        
        async function generateDemoAPIs() {
            const statusEl = document.getElementById('demo-apis-status');
            statusEl.classList.remove('hidden');
            statusEl.innerHTML = '<span class="animate-pulse text-purple-400">Generating APIs...</span>';
            
            try {
                const response = await fetch(API + '/api/demo-lab/generate-for-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'apis',
                        agent_goal: wizard.goal,
                        agent_name: wizard.name,
                        tasks: wizard.tasks
                    })
                });
                
                if(response.ok) {
                    const data = await response.json();
                    statusEl.innerHTML = `<span class="text-green-400">✓ ${data.count || 1} APIs created!</span>`;
                    addGeneratedItem('api', data.items || [{ name: 'Mock API', endpoint: '/api/mock' }]);
                } else {
                    statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Using demo data</span>';
                    // Create sample mock API
                    createSampleMockAPI();
                }
            } catch(e) {
                console.error('Generate APIs error:', e);
                statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Using demo data</span>';
                createSampleMockAPI();
            }
        }
        
        async function generateDemoDocs() {
            const statusEl = document.getElementById('demo-docs-status');
            statusEl.classList.remove('hidden');
            statusEl.innerHTML = '<span class="animate-pulse text-purple-400">Generating documents...</span>';
            
            try {
                const response = await fetch(API + '/api/demo-lab/generate-for-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'documents',
                        agent_goal: wizard.goal,
                        agent_name: wizard.name,
                        tasks: wizard.tasks
                    })
                });
                
                if(response.ok) {
                    const data = await response.json();
                    statusEl.innerHTML = `<span class="text-green-400">✓ ${data.count || 1} documents created!</span>`;
                    addGeneratedItem('document', data.items || []);
                } else {
                    statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Using demo data</span>';
                    createSampleDocument();
                }
            } catch(e) {
                console.error('Generate docs error:', e);
                statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Using demo data</span>';
                createSampleDocument();
            }
        }
        
        async function generateDemoImages() {
            const statusEl = document.getElementById('demo-images-status');
            statusEl.classList.remove('hidden');
            statusEl.innerHTML = '<span class="animate-pulse text-purple-400">Generating images...</span>';
            
            try {
                const response = await fetch(API + '/api/demo-lab/generate-for-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'images',
                        agent_goal: wizard.goal,
                        agent_name: wizard.name,
                        tasks: wizard.tasks
                    })
                });
                
                if(response.ok) {
                    const data = await response.json();
                    statusEl.innerHTML = `<span class="text-green-400">✓ ${data.count || 1} images created!</span>`;
                    addGeneratedItem('image', data.items || []);
                } else {
                    statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Placeholder images</span>';
                }
            } catch(e) {
                console.error('Generate images error:', e);
                statusEl.innerHTML = '<span class="text-yellow-400">⚠️ Placeholder images</span>';
            }
        }
        
        async function generateAllDemoData() {
            const btn = event.target;
            btn.innerHTML = '<span class="animate-pulse">⏳</span> Generating all demo data...';
            btn.disabled = true;
            
            await generateDemoAPIs();
            await new Promise(r => setTimeout(r, 500));
            await generateDemoDocs();
            await new Promise(r => setTimeout(r, 500));
            await generateDemoImages();
            
            btn.innerHTML = '<span>🚀</span> Generate All Demo Data';
            btn.disabled = false;
        }
        
        function addGeneratedItem(type, items) {
            const container = document.getElementById('generated-demo-items');
            const list = document.getElementById('demo-items-list');
            container.classList.remove('hidden');
            
            const icons = { api: '🔌', document: '📄', image: '🖼️' };
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between bg-gray-800/50 rounded px-3 py-2';
                div.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span>${icons[type] || '📦'}</span>
                        <span class="text-sm">${item.name || type}</span>
                    </div>
                    <span class="text-xs text-green-400">✓</span>
                `;
                list.appendChild(div);
            });
        }
        
        async function createSampleMockAPI() {
            // Create a sample mock API based on agent goal
            const goalLower = (wizard.goal || '').toLowerCase();
            let apiName = 'Sample API';
            let endpoint = '/api/sample';
            
            if(goalLower.includes('customer') || goalLower.includes('order')) {
                apiName = 'Orders API';
                endpoint = '/api/orders';
            } else if(goalLower.includes('product') || goalLower.includes('catalog')) {
                apiName = 'Products API';
                endpoint = '/api/products';
            } else if(goalLower.includes('employee') || goalLower.includes('hr')) {
                apiName = 'Employees API';
                endpoint = '/api/employees';
            }
            
            addGeneratedItem('api', [{ name: apiName, endpoint: endpoint }]);
        }
        
        async function createSampleDocument() {
            const goalLower = (wizard.goal || '').toLowerCase();
            let docName = 'Sample Document';
            
            if(goalLower.includes('customer')) {
                docName = 'Customer Support FAQ';
            } else if(goalLower.includes('product')) {
                docName = 'Product Catalog';
            } else if(goalLower.includes('hr') || goalLower.includes('employee')) {
                docName = 'HR Policies';
            }
            
            addGeneratedItem('document', [{ name: docName }]);
        }
        
        // Deploy Options
        function selectDeployOption(option) {
            if(option === 'draft') {
                saveAgent('draft');
            } else {
                document.getElementById('deploy-options').classList.remove('hidden');
            }
        }
        
        function selectDeployTarget(target) {
            wizard.deployTarget = target;
            
            document.querySelectorAll('.deploy-target').forEach(el => {
                el.classList.toggle('border-purple-500', el.dataset.target === target);
                el.classList.toggle('bg-purple-500/10', el.dataset.target === target);
            });
            
            document.getElementById('cloud-providers').classList.toggle('hidden', target !== 'cloud');
            document.getElementById('onprem-config').classList.toggle('hidden', target !== 'onprem');
        }
        
        function selectCloudProvider(provider) {
            wizard.cloudProvider = provider;
            
            document.querySelectorAll('.cloud-provider').forEach(el => {
                el.classList.toggle('border-purple-500', el.dataset.provider === provider);
                el.classList.toggle('bg-purple-500/10', el.dataset.provider === provider);
            });
            
            ['aws', 'azure', 'gcp', 'oci'].forEach(p => {
                document.getElementById('cloud-config-' + p)?.classList.toggle('hidden', p !== provider);
            });
        }
        
        function onOnpremMethodChange() {
            const method = document.getElementById('onprem-method').value;
            document.getElementById('onprem-docker').classList.toggle('hidden', method !== 'docker');
            document.getElementById('onprem-kubernetes').classList.toggle('hidden', method !== 'kubernetes');
        }
        
        function copyDockerCommand() {
            const code = document.querySelector('#onprem-docker pre code').textContent;
            navigator.clipboard.writeText(code);
            alert('Docker command copied!');
        }
        
        function downloadK8sManifest() {
            const code = document.querySelector('#onprem-kubernetes pre code').textContent;
            const blob = new Blob([code], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'agent-deployment.yaml';
            a.click();
        }
        
        // Quick deploy from Test step
        async function deployAgentNow() {
            if (!confirm('Deploy this agent now? It will be published and available for use.')) {
                return;
            }
            await deployAgent();
        }
        
        // Save as draft from Test step
        async function saveAsDraft() {
            collectGuardrails();
            
            // Collect Access Control settings
            if (typeof collectWizardAccessControl === 'function') {
                collectWizardAccessControl();
            }
            
            const agentData = {
                name: wizard.name,
                icon: wizard.icon,
                iconType: wizard.iconType || 'emoji',
                iconData: wizard.iconData || '',
                goal: wizard.goal,
                model: wizard.model,
                personality: wizard.personality,
                tasks: wizard.tasks,
                tool_ids: wizard.tool_ids,
                guardrails: wizard.guardrails,
                status: 'draft',
                access_control: wizard.accessControl
            };
            
            try {
                const url = wizard.editId || wizard.id 
                    ? `${API}/api/agents/${wizard.editId || wizard.id}`
                    : `${API}/api/agents`;
                const method = wizard.editId || wizard.id ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {...getAuthHeaders(), 'Content-Type': 'application/json'},
                    body: JSON.stringify(agentData)
                });
                
                if (response.ok) {
                    showToast('Agent saved as draft!', 'success');
                    navigate('agents');
                    loadAgents();
                } else {
                    const error = await response.json();
                    showToast('Failed to save: ' + (error.detail || 'Unknown error'), 'error');
                }
            } catch(e) {
                console.error('Save draft error:', e);
                showToast('Failed to save draft', 'error');
            }
        }
        
        async function deployAgent() {
            // Collect all data and deploy
            collectGuardrails();
            
            // ✨ Collect Access Control settings before deploy
            if (typeof collectWizardAccessControl === 'function') {
                collectWizardAccessControl();
            }
            
            // Get user permissions
            const perms = wizard.userPermissions || {};
            const isOwner = perms.is_owner;
            const hasFullAdmin = perms.permissions?.includes('full_admin');
            
            // Build deploy data based on permissions
            // Only include fields the user has permission to modify
            const deployData = {};
            
            // Always include status for publish
            if (isOwner || hasFullAdmin || perms.can_publish) {
                deployData.status = 'published';
            }
            
            // Basic info (name, icon, goal)
            if (isOwner || hasFullAdmin || perms.can_edit_basic_info) {
                deployData.name = wizard.name;
                deployData.icon = wizard.icon;
                deployData.goal = wizard.goal;
            }
            
            // Personality
            if (isOwner || hasFullAdmin || perms.can_edit_personality) {
                deployData.personality = wizard.personality;
            }
            
            // Guardrails
            if (isOwner || hasFullAdmin || perms.can_edit_guardrails) {
                deployData.guardrails = wizard.guardrails || {};
            }
            
            // Tasks
            if (isOwner || hasFullAdmin || perms.can_manage_tasks) {
                deployData.tasks = wizard.tasks || [];
            }
            
            // Tools
            if (isOwner || hasFullAdmin || perms.can_manage_tools) {
                deployData.tool_ids = wizard.tool_ids || [];
            }
            
            // Model
            if (isOwner || hasFullAdmin || perms.can_edit_model) {
                deployData.model_id = wizard.model;
            }
            
            console.log('🚀 Deploying agent with permission-filtered data...');
            console.log('📦 Deploy data keys:', Object.keys(deployData));
            console.log('📦 Deploy data:', JSON.stringify(deployData, null, 2));
            console.log('🔐 User permissions:', JSON.stringify(perms, null, 2));
            console.log('🔐 isOwner:', isOwner, 'hasFullAdmin:', hasFullAdmin, 'can_publish:', perms.can_publish);
            
            // Safety check: if no fields to update, show error
            if (Object.keys(deployData).length === 0) {
                showToast('Error: No permissions to update this agent', 'error');
                return;
            }
            
            try {
                let response;
                const agentId = testAgent?.id || wizard.editId || wizard.id;
                
                console.log('Agent ID for deploy:', agentId);
                
                if (agentId) {
                    // Update existing agent - only send fields user can modify
                    response = await fetch(API + '/api/agents/' + agentId, {
                        method: 'PUT',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(deployData)
                    });
                } else {
                    // Create new agent - need full data
                    const fullData = {
                        name: wizard.name,
                        icon: wizard.icon,
                        goal: wizard.goal,
                        personality: wizard.personality,
                        guardrails: wizard.guardrails || {},
                        tasks: wizard.tasks || [],
                        tool_ids: wizard.tool_ids || [],
                        model_id: wizard.model,
                        status: 'published'
                    };
                    response = await fetch(API + '/api/agents', {
                        method: 'POST',
                        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify(fullData)
                    });
                }
                
                console.log('Deploy response status:', response.status);
                
                if(response.ok) {
                    const result = await response.json();
                    console.log('Deploy success:', result);
                    
                    // ✨ CRITICAL: Save Access Control settings when deploying
                    const savedAgentId = result.agent_id || result.agent?.id || agentId;
                    if (savedAgentId && wizard.accessControl) {
                        console.log('📋 Saving access control for deployed agent:', savedAgentId);
                        await saveAgentAccessControl(savedAgentId);
                    }
                    
                    showToast('🚀 Agent deployed successfully!', 'success');
                    wizard.editId = null;
                    wizard.id = null;
                    testAgent = null;
                    navigate('agents');
                    setAgentTab('published');
                } else {
                    const err = await response.json();
                    console.error('Deploy error response:', err);
                    showToast('Error: ' + (err.detail || 'Failed to deploy'), 'error');
                }
            } catch(e) {
                console.error('Deploy error:', e);
                showToast('Error deploying agent: ' + e.message, 'error');
            }
        }

        // ============================================================================
        // DEMO LAB FUNCTIONS
        // ============================================================================
        
        let demoTab = 'api';
        let demoItems = { apis: [], docs: [], images: [] };
        let demoConversation = [];
        let demoCurrentMode = 'api';
        let demoSidebarTab = 'all';
        let demoEditingItem = null;
        let demoKits = [];
        let currentKitId = null;
        let currentTestApi = null;
        let apiTestFromWizard = false;

        // Initialize Demo Lab
        function initDemoLab() {
            loadDemoKits();
        }

        // Load demo kits from server
        async function loadDemoKits() {
            try {
                const response = await fetch(API + '/api/demo-kits');
                const data = await response.json();
                demoKits = data.kits || [];
                renderDemoKitsList();
            } catch (e) {
                console.error('Failed to load demo kits:', e);
            }
        }

        // Render demo kits list in sidebar
        function renderDemoKitsList() {
            const container = document.getElementById('demo-kits-list');
            if (!container) return;
            
            if (demoKits.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <span class="text-3xl block mb-2">📦</span>
                        <p class="text-sm">No demo kits yet</p>
                        <p class="text-xs mt-1">Create one to get started!</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = demoKits.map(kit => `
                <div onclick="selectDemoKit('${kit.id}')" class="p-3 rounded-lg cursor-pointer transition-colors ${currentKitId === kit.id ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'}">
                    <div class="flex items-start gap-2">
                        <span class="text-xl">📦</span>
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm truncate">${escHtml(kit.name)}</p>
                            <p class="text-xs text-gray-500 truncate">${escHtml(kit.description || '')}</p>
                            <div class="flex gap-2 mt-2 text-xs">
                                <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">${kit.api_count} APIs</span>
                                <span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">${kit.kb_count} KBs</span>
                                <span class="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">${kit.asset_count} Assets</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Select a demo kit to view details
        async function selectDemoKit(kitId) {
            currentKitId = kitId;
            renderDemoKitsList();
            
            try {
                const response = await fetch(API + `/api/demo-kits/${kitId}`);
                const kit = await response.json();
                renderKitDetails(kit);
            } catch (e) {
                console.error('Failed to load kit details:', e);
                alert('Failed to load kit details');
            }
        }

        // Render kit details
        function renderKitDetails(kit) {
            document.getElementById('demo-welcome').classList.add('hidden');
            document.getElementById('demo-kit-details').classList.remove('hidden');
            
            document.getElementById('kit-detail-name').textContent = kit.name;
            document.getElementById('kit-detail-desc').textContent = kit.description;
            document.getElementById('kit-api-count').textContent = kit.apis?.length || 0;
            document.getElementById('kit-kb-count').textContent = kit.knowledge_bases?.length || 0;
            document.getElementById('kit-asset-count').textContent = kit.assets?.length || 0;
            
            // Render APIs
            const apisContainer = document.getElementById('kit-apis-list');
            if (kit.apis && kit.apis.length > 0) {
                apisContainer.innerHTML = kit.apis.map(api => `
                    <div class="card rounded-lg p-4">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="px-2 py-0.5 rounded text-xs font-bold ${api.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}">${api.method}</span>
                                    <code class="text-sm text-gray-300">${escHtml(api.endpoint)}</code>
                                </div>
                                <p class="font-medium">${escHtml(api.name)}</p>
                                <p class="text-sm text-gray-400 mt-1">${escHtml(api.description)}</p>
                                ${api.parameters && api.parameters.length > 0 ? `
                                    <div class="mt-2 text-xs text-gray-500">
                                        Parameters: ${api.parameters.map(p => p.name).join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="flex gap-2">
                                <button onclick="goToToolPage('${api.id}')" class="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    ✏️ Edit
                                </button>
                                <button onclick="testDemoApi('${kit.id}', '${api.id}')" class="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30">
                                    ▶ Test
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                apisContainer.innerHTML = '<p class="text-gray-500 text-sm">No APIs in this kit</p>';
            }
            
            // Render Knowledge Bases
            const kbContainer = document.getElementById('kit-kb-list');
            if (kit.knowledge_bases && kit.knowledge_bases.length > 0) {
                kbContainer.innerHTML = kit.knowledge_bases.map(kb => `
                    <div class="card rounded-lg p-4">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <p class="font-medium">${escHtml(kb.name)}</p>
                                <p class="text-sm text-gray-400 mt-1">${escHtml(kb.description)}</p>
                                <div class="mt-2 text-xs text-gray-500">
                                    ${kb.sections?.length || 0} sections
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="goToToolPage('${kb.id}')" class="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600">
                                    ✏️ Edit
                                </button>
                                <button onclick="viewKnowledgeBase('${kit.id}', '${kb.id}')" class="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                                    👁 View
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                kbContainer.innerHTML = '<p class="text-gray-500 text-sm">No knowledge bases in this kit</p>';
            }
            
            // Render Assets (assets don't have a Tools page, keep edit modal)
            const assetsContainer = document.getElementById('kit-assets-list');
            if (kit.assets && kit.assets.length > 0) {
                assetsContainer.innerHTML = kit.assets.map(asset => `
                    <div class="card rounded-lg p-4 text-center">
                        <div class="w-12 h-12 mx-auto mb-2 rounded-lg bg-gray-700 flex items-center justify-center">
                            ${asset.asset_type === 'invoice' ? '🧾' : asset.asset_type === 'receipt' ? '🧾' : '📄'}
                        </div>
                        <p class="font-medium text-sm truncate">${escHtml(asset.name)}</p>
                        <p class="text-xs text-gray-500 capitalize">${asset.asset_type}</p>
                        <div class="flex gap-1 mt-3 justify-center flex-wrap">
                            <button onclick="editDemoAsset('${kit.id}', '${asset.id}')" class="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600">
                                ✏️
                            </button>
                            <button onclick="generateAssetFile('${kit.id}', '${asset.id}')" class="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30">
                                Generate
                            </button>
                            ${asset.file_url ? `
                                <a href="${API}${asset.file_url}" download class="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                                    ⬇
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                assetsContainer.innerHTML = '<p class="text-gray-500 text-sm col-span-3 text-center">No demo assets in this kit</p>';
            }
        }
        
        // Navigate to Tool page for editing
        function goToToolPage(toolId) {
            showPage('tools');
            setTimeout(() => viewTool(toolId), 100);
        }

        // Show create kit modal
        function showCreateKitModal() {
            const modal = document.getElementById('create-kit-modal');
            if (!modal) return;
            ensureModalInBody('create-kit-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('new-kit-description').focus();
        }

        // Close create kit modal
        function closeCreateKitModal() {
            document.getElementById('create-kit-modal').classList.add('hidden');
            document.getElementById('create-kit-modal').classList.remove('flex');
            document.getElementById('kit-generation-status').classList.add('hidden');
            document.getElementById('generate-kit-btn').disabled = false;
        }

        // Generate demo kit
        async function generateDemoKit() {
            const name = document.getElementById('new-kit-name').value.trim();
            const description = document.getElementById('new-kit-description').value.trim();
            
            if (!description) {
                alert('Please describe what you need');
                return;
            }
            
            // Show loading
            document.getElementById('kit-generation-status').classList.remove('hidden');
            document.getElementById('generate-kit-btn').disabled = true;
            
            try {
                const response = await fetch(API + '/api/demo-kits/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: description,
                        kit_name: name || null
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to generate kit');
                }
                
                const kit = await response.json();
                
                // Close modal and refresh
                closeCreateKitModal();
                document.getElementById('new-kit-name').value = '';
                document.getElementById('new-kit-description').value = '';
                
                // Reload kits and select the new one
                await loadDemoKits();
                selectDemoKit(kit.id);
                
            } catch (e) {
                console.error('Failed to generate kit:', e);
                alert('Failed to generate demo kit: ' + e.message);
                document.getElementById('kit-generation-status').classList.add('hidden');
                document.getElementById('generate-kit-btn').disabled = false;
            }
        }

        // Delete current kit
        async function deleteCurrentKit() {
            if (!currentKitId) return;
            if (!confirm('Are you sure you want to delete this demo kit?')) return;
            
            try {
                await fetch(API + `/api/demo-kits/${currentKitId}`, { method: 'DELETE' });
                currentKitId = null;
                document.getElementById('demo-welcome').classList.remove('hidden');
                document.getElementById('demo-kit-details').classList.add('hidden');
                await loadDemoKits();
            } catch (e) {
                alert('Failed to delete kit');
            }
        }

        // Test API
        function testDemoApi(kitId, apiId) {
            const kit = demoKits.find(k => k.id === kitId);
            if (!kit) return;
            
            // Load full kit data to get API details
            fetch(API + `/api/demo-kits/${kitId}`)
                .then(r => r.json())
                .then(fullKit => {
                    const api = fullKit.apis.find(a => a.id === apiId);
                    if (!api) return;
                    
                    currentTestApi = { kitId, apiId, api };
                    apiTestFromWizard = false;
                    
                    document.getElementById('api-test-title').textContent = `Test: ${api.name}`;
                    document.getElementById('api-test-method').textContent = api.method;
                    document.getElementById('api-test-method').className = `px-2 py-0.5 rounded text-xs font-bold ${api.method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`;
                    document.getElementById('api-test-endpoint').textContent = api.endpoint;
                    
                    // Render parameters
                    const paramsContainer = document.getElementById('api-test-params');
                    if (api.parameters && api.parameters.length > 0) {
                        paramsContainer.innerHTML = api.parameters.map(p => `
                            <div class="flex items-center gap-2">
                                <label class="text-xs text-gray-400 w-24">${p.name}${p.required ? '*' : ''}</label>
                                <input type="text" class="api-param-input flex-1 input-field rounded px-2 py-1 text-sm" 
                                       data-param="${p.name}" placeholder="${p.type || 'string'}">
                            </div>
                        `).join('');
                    } else {
                        paramsContainer.innerHTML = '<p class="text-xs text-gray-500">No parameters</p>';
                    }
                    
                    // Show/hide body for POST
                    const bodyEl = document.getElementById('api-test-body');
                    if (api.method === 'POST' || api.method === 'PUT') {
                        bodyEl.classList.remove('hidden');
                        bodyEl.value = api.sample_request ? JSON.stringify(api.sample_request, null, 2) : '{}';
                    } else {
                        bodyEl.classList.add('hidden');
                    }
                    
                    // Reset response
                    document.getElementById('api-test-response').textContent = '// Click "Send Request" to test';
                    ensureModalInBody('api-test-modal');
                    document.getElementById('api-test-modal').classList.remove('hidden');
                    document.getElementById('api-test-modal').classList.add('flex');
                });
        }

        // Close API test modal
        function closeApiTestModal() {
            document.getElementById('api-test-modal').classList.add('hidden');
            document.getElementById('api-test-modal').classList.remove('flex');
            currentTestApi = null;
            apiTestFromWizard = false;
        }

        // Open API test modal from tool wizard (Try this API)
        // Business-friendly display: table for arrays, structured for objects
        function renderBusinessFriendlyResponse(data) {
            if (!data) return '<p class="text-gray-400 text-sm">No data returned</p>';
            
            // Array of objects → Table
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                const keys = Object.keys(data[0]);
                let html = `<div class="overflow-x-auto"><table class="w-full text-sm border-collapse">
                    <thead><tr class="bg-purple-900/40 border-b border-purple-600/50">`;
                keys.forEach(k => {
                    html += `<th class="px-3 py-2 text-left font-semibold text-purple-200">${k}</th>`;
                });
                html += `</tr></thead><tbody>`;
                data.forEach((row, idx) => {
                    html += `<tr class="${idx % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-800/20'} border-b border-gray-700/50">`;
                    keys.forEach(k => {
                        const val = row[k];
                        const display = val != null ? String(val) : '-';
                        html += `<td class="px-3 py-2 text-gray-200">${display}</td>`;
                    });
                    html += `</tr>`;
                });
                html += `</tbody></table></div>`;
                html += `<p class="text-xs text-gray-400 mt-2">${data.length} record${data.length !== 1 ? 's' : ''}</p>`;
                return html;
            }
            
            // Single object → Structured view
            if (typeof data === 'object' && !Array.isArray(data)) {
                let html = '<div class="space-y-2">';
                Object.entries(data).forEach(([k, v]) => {
                    const display = v != null ? (typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)) : '-';
                    html += `<div class="flex items-start gap-3 border-b border-gray-700/30 pb-2">
                        <span class="font-semibold text-purple-200 min-w-[120px]">${k}:</span>
                        <span class="text-gray-200 break-all">${display}</span>
                    </div>`;
                });
                html += '</div>';
                return html;
            }
            
            // Fallback: simple value or JSON
            return `<pre class="text-gray-200 text-sm whitespace-pre-wrap break-words">${typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}</pre>`;
        }

        function openWizardApiTestModal() {
            const baseUrl = (document.getElementById('api-base-url') || document.getElementById('api-url'))?.value?.trim() || '';
            const path = document.getElementById('api-path')?.value?.trim() || '';
            const method = document.getElementById('api-method')?.value || 'GET';
            const name = document.getElementById('wiz-name')?.value?.trim() || 'API';
            if (!baseUrl) {
                alert('Please enter the Base URL first.');
                return;
            }
            apiTestFromWizard = true;
            currentTestApi = null;
            document.getElementById('api-test-title').textContent = name;
            document.getElementById('api-test-method').textContent = method;
            document.getElementById('api-test-method').className = 'hidden';
            document.getElementById('api-test-endpoint').textContent = (baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, '')) || baseUrl;
            document.getElementById('api-test-endpoint').className = 'hidden';
            document.getElementById('api-test-response').innerHTML = '<p class="text-gray-500 text-center py-8">Results will appear here...</p>';
            if (typeof renderTestParams === 'function') renderTestParams();
            const bodyEl = document.getElementById('api-test-body');
            if (bodyEl) {
                bodyEl.classList.add('hidden');
                bodyEl.value = '{}';
            }
            ensureModalInBody('api-test-modal');
            document.getElementById('api-test-modal').classList.remove('hidden');
            document.getElementById('api-test-modal').classList.add('flex');
        }

        // Send API test request (wizard mode or demo kit mode)
        async function sendApiTestRequest() {
            const responseEl = document.getElementById('api-test-response');
            const sendBtn = document.getElementById('api-test-send-btn');
            if (!responseEl) return;

            // Wizard mode: test from tool create form
            if (apiTestFromWizard) {
                const params = {};
                (apiParams || []).forEach((p, i) => {
                    const key = (p.name || '').trim() || ('param_' + i);
                    const el = document.getElementById('test-param-' + (p.id != null ? p.id : i));
                    if (el && el.value !== undefined && el.value !== '') params[key] = el.value;
                });
                const baseUrl = (document.getElementById('api-base-url') || document.getElementById('api-url'))?.value?.trim() || '';
                const body = {
                    base_url: baseUrl,
                    http_method: document.getElementById('api-method')?.value || 'GET',
                    endpoint_path: document.getElementById('api-path')?.value || '',
                    auth_type: document.getElementById('api-auth')?.value || 'none',
                    auth_value: (document.getElementById('api-auth-value') || document.getElementById('api-auth-val'))?.value || '',
                    api_key_name: document.getElementById('api-key-name')?.value || '',
                    api_key_location: document.getElementById('api-key-loc')?.value || '',
                    parameters: params
                };
                if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = 'Sending...'; }
                responseEl.innerHTML = '<p class="text-gray-400 text-center py-8">⏳ Loading...</p>';
                try {
                    const r = await fetch(API + '/api/tools/test-api', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
                        body: JSON.stringify(body)
                    });
                    const d = await r.json();
                    if (d.success) {
                        responseEl.innerHTML = renderBusinessFriendlyResponse(d.data);
                        responseEl.className = 'text-sm overflow-auto max-h-64 m-0';
                    } else {
                        responseEl.innerHTML = `<p class="text-red-400 text-sm">❌ Error: ${d.error || 'Request failed'}</p>`;
                        responseEl.className = 'text-sm overflow-auto max-h-64 m-0';
                    }
                } catch (e) {
                    responseEl.innerHTML = `<p class="text-red-400 text-sm">❌ Error: ${e.message}</p>`;
                    responseEl.className = 'text-sm overflow-auto max-h-64 m-0';
                }
                if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<span>✓</span> Get Results'; }
                return;
            }

            if (!currentTestApi) return;
            const { kitId, apiId, api } = currentTestApi;

            const params = {};
            document.querySelectorAll('.api-param-input').forEach(input => {
                if (input.value && input.dataset.param) params[input.dataset.param] = input.value;
            });
            let body = {};
            if (api.method === 'POST' || api.method === 'PUT') {
                try {
                    body = JSON.parse(document.getElementById('api-test-body').value || '{}');
                } catch (e) {
                    alert('Invalid JSON in request body');
                    return;
                }
            }
            if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = 'Sending...'; }
            responseEl.innerHTML = '<p class="text-gray-400 text-center py-8">⏳ Loading...</p>';
            try {
                const response = await fetch(API + `/api/demo-kits/${kitId}/api/${apiId}/test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...params, ...body })
                });
                const result = await response.json();
                responseEl.innerHTML = renderBusinessFriendlyResponse(result.response || result);
                responseEl.className = 'text-sm overflow-auto max-h-64 m-0';
            } catch (e) {
                responseEl.innerHTML = `<p class="text-red-400 text-sm">❌ Error: ${e.message}</p>`;
                responseEl.className = 'text-sm overflow-auto max-h-64 m-0';
            }
            if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<span>✓</span> Get Results'; }
        }

        // View Knowledge Base
        function viewKnowledgeBase(kitId, kbId) {
            fetch(API + `/api/demo-kits/${kitId}`)
                .then(r => r.json())
                .then(kit => {
                    const kb = kit.knowledge_bases.find(k => k.id === kbId);
                    if (!kb) return;
                    
                    document.getElementById('kb-view-title').textContent = kb.name;
                    
                    // Render content with sections
                    let html = `<p class="text-gray-400 mb-4">${escHtml(kb.description)}</p>`;
                    
                    if (kb.sections && kb.sections.length > 0) {
                        html += kb.sections.map(s => `
                            <div class="mb-6">
                                <h3 class="text-lg font-semibold text-purple-400 mb-2">${escHtml(s.title)}</h3>
                                <div class="text-gray-300 whitespace-pre-wrap">${escHtml(s.content)}</div>
                            </div>
                        `).join('');
                    } else if (kb.content) {
                        html += `<div class="text-gray-300 whitespace-pre-wrap">${escHtml(kb.content)}</div>`;
                    }
                    
                    document.getElementById('kb-view-content').innerHTML = html;
                    ensureModalInBody('kb-view-modal');
                    document.getElementById('kb-view-modal').classList.remove('hidden');
                    document.getElementById('kb-view-modal').classList.add('flex');
                });
        }

        // Close KB view modal
        function closeKbViewModal() {
            document.getElementById('kb-view-modal').classList.add('hidden');
            document.getElementById('kb-view-modal').classList.remove('flex');
        }

        // ============================================================
        // ACCESS CONTROL MODULE - Now integrated in Agent Wizard (Step 4)
        // Old standalone modal removed for cleaner UX
        // ============================================================
        
        // Legacy state - kept for any remaining references
        let accessControlState = {
            agentId: null,
            agentName: '',
            accessType: 'authenticated',
            entities: [],
            tasks: [],
            tools: [],
            taskDefault: 'allow',
            toolDefault: 'allow',
            allUsers: [],
            allGroups: [],
            allRoles: []
        };
        
        async function openAccessControl(agentId, agentName) {
            console.log('🔐 Opening Access Control for:', agentId, agentName);
            
            accessControlState.agentId = agentId;
            accessControlState.agentName = agentName;
            
            document.getElementById('access-control-agent-name').textContent = agentName;
            
            // Show modal
            const modal = document.getElementById('access-control-modal');
            if (!modal) {
                console.error('❌ Access control modal not found!');
                showToast('Access Control modal not found', 'error');
                return;
            }
            ensureModalInBody('access-control-modal');
            modal.style.display = 'flex';
            
            console.log('✅ Modal opened and moved to body. Display:', modal.style.display);
            
            // Reset to first tab
            switchAccessTab(1);
            
            // Load data
            await loadAccessControlData();
        }
        
        function closeAccessControlModal() {
            const modal = document.getElementById('access-control-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
        
        function switchAccessTab(tab) {
            // Update tab buttons
            for(let i = 1; i <= 3; i++) {
                const btn = document.getElementById('access-tab-' + i);
                const content = document.getElementById('access-content-' + i);
                
                if(i === tab) {
                    btn.classList.add('border-purple-500', 'text-white', 'font-medium');
                    btn.classList.remove('border-transparent', 'text-gray-400');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('border-purple-500', 'text-white', 'font-medium');
                    btn.classList.add('border-transparent', 'text-gray-400');
                    content.classList.add('hidden');
                }
            }
        }
        
        async function loadAccessControlData() {
            try {
                // Get current org_id from session
                const orgId = currentUser?.org_id || 'default';
                const headers = getAuthHeaders();
                
                // Load full access config
                const response = await fetch(`${API}/api/access-control/agents/${accessControlState.agentId}/full?org_id=${orgId}`, { headers });
                
                if(response.ok) {
                    const data = await response.json();
                    
                    // Set access type
                    accessControlState.accessType = data.agent_access?.access_type || 'authenticated';
                    accessControlState.entities = data.agent_access?.entities || [];
                    accessControlState.tasks = data.task_access?.task_permissions || [];
                    accessControlState.tools = data.tool_access?.tool_permissions || [];
                    accessControlState.taskDefault = data.task_access?.allow_all_by_default ? 'allow' : 'deny';
                    accessControlState.toolDefault = data.tool_access?.allow_all_by_default ? 'allow' : 'deny';
                }
                
                // Load agent details for tasks/tools
                const agentResponse = await fetch(`${API}/api/agents/${accessControlState.agentId}`, { headers });
                if(agentResponse.ok) {
                    const agent = await agentResponse.json();
                    
                    // Parse tasks
                    let tasks = [];
                    if(typeof agent.tasks === 'string') {
                        try { tasks = JSON.parse(agent.tasks); } catch(e) {}
                    } else if(Array.isArray(agent.tasks)) {
                        tasks = agent.tasks;
                    }
                    accessControlState.tasks = tasks.map(t => ({
                        task_id: t.id,
                        task_name: t.name,
                        allowed_entity_ids: [],
                        denied_entity_ids: []
                    }));
                    
                    // Parse tools
                    let toolIds = [];
                    if(typeof agent.tool_ids === 'string') {
                        try { toolIds = JSON.parse(agent.tool_ids); } catch(e) {}
                    } else if(Array.isArray(agent.tool_ids)) {
                        toolIds = agent.tool_ids;
                    }
                    
                    // Load tool names
                    const toolsResponse = await fetch(`${API}/api/tools`, { headers });
                    if(toolsResponse.ok) {
                        const allTools = await toolsResponse.json();
                        accessControlState.tools = toolIds.map(tid => {
                            const tool = allTools.find(t => t.id === tid);
                            return {
                                tool_id: tid,
                                tool_name: tool?.name || 'Unknown Tool',
                                allowed_entity_ids: [],
                                denied_entity_ids: []
                            };
                        });
                    }
                }
                
                // Load users, groups, roles for entity selector
                await loadAccessEntities();
                
                // Render UI
                renderAccessType();
                renderTasksMatrix();
                renderToolsMatrix();
                
            } catch(e) {
                console.error('Error loading access control data:', e);
                showToast('Failed to load access control data', 'error');
            }
        }
        
        async function loadAccessEntities() {
            try {
                const headers = getAuthHeaders();
                
                // Load users
                const usersRes = await fetch(`${API}/api/security/users`, { headers });
                if(usersRes.ok) {
                    const usersData = await usersRes.json();
                    accessControlState.allUsers = Array.isArray(usersData) ? usersData : (usersData.users || []);
                    console.log('✅ Loaded users for access control:', accessControlState.allUsers.length, accessControlState.allUsers);
                }
                
                // Load roles
                const rolesRes = await fetch(`${API}/api/security/roles`, { headers });
                if(rolesRes.ok) {
                    const rolesData = await rolesRes.json();
                    accessControlState.allRoles = Array.isArray(rolesData) ? rolesData : (rolesData.roles || []);
                }
                
                // Load groups
                const groupsRes = await fetch(`${API}/api/security/groups`, { headers });
                if(groupsRes.ok) {
                    const groupsData = await groupsRes.json();
                    accessControlState.allGroups = Array.isArray(groupsData) ? groupsData : (groupsData.groups || []);
                    console.log('✅ Loaded groups for access control:', accessControlState.allGroups.length, accessControlState.allGroups);
                }
                
                // Enrich entities with proper names from loaded data
                enrichEntitiesWithNames();
                
            } catch(e) {
                console.error('Error loading entities:', e);
            }
        }
        
        function enrichEntitiesWithNames() {
            // Enrich each entity with its proper name from loaded users/groups/roles
            accessControlState.entities = accessControlState.entities.map(e => {
                if (e.name && !e.name.includes('...') && e.name.length > 10) {
                    // Already has a good name
                    return e;
                }
                
                // Try to find the entity's real name
                if (e.type === 'user') {
                    const user = accessControlState.allUsers.find(u => u.id === e.id);
                    if (user) {
                        return { ...e, name: user.name || user.email || `User ${e.id.slice(0, 8)}` };
                    }
                } else if (e.type === 'group') {
                    const group = accessControlState.allGroups.find(g => g.id === e.id);
                    if (group) {
                        return { ...e, name: group.name || `Group ${e.id.slice(0, 8)}` };
                    }
                } else if (e.type === 'role') {
                    const role = accessControlState.allRoles.find(r => r.id === e.id);
                    if (role) {
                        return { ...e, name: role.name || `Role ${e.id.slice(0, 8)}` };
                    }
                }
                
                return e;
            });
            
            console.log('✅ Enriched entities:', accessControlState.entities);
            
            // Re-render to show updated names
            renderSelectedEntities();
            renderTasksMatrix();
            renderToolsMatrix();
        }
        
        function selectAccessType(type) {
            accessControlState.accessType = type;
            renderAccessType();
        }
        
        function renderAccessType() {
            const types = ['public', 'authenticated', 'specific'];
            
            types.forEach(t => {
                const el = document.getElementById('access-type-' + t);
                if(t === accessControlState.accessType) {
                    el.classList.add('border-purple-500', 'bg-purple-500/10');
                    el.classList.remove('border-gray-600');
                } else {
                    el.classList.remove('border-purple-500', 'bg-purple-500/10');
                    el.classList.add('border-gray-600');
                }
            });
            
            // Show/hide entity selector
            const selector = document.getElementById('access-entity-selector');
            if(accessControlState.accessType === 'specific') {
                selector.classList.remove('hidden');
                renderSelectedEntities();
            } else {
                selector.classList.add('hidden');
            }
        }
        
        function searchAccessEntities(query) {
            const resultsEl = document.getElementById('access-entity-results');
            
            if(!query || query.length < 2) {
                resultsEl.classList.add('hidden');
                return;
            }
            
            query = query.toLowerCase();
            let results = [];
            
            // Search users - API returns 'name' field directly or nested in profile
            accessControlState.allUsers.filter(u => {
                const displayName = u.name || `${u.profile?.first_name || u.first_name || ''} ${u.profile?.last_name || u.last_name || ''}`.trim() || '';
                const email = u.email || '';
                return email.toLowerCase().includes(query) || 
                       displayName.toLowerCase().includes(query);
            }).slice(0, 5).forEach(u => {
                const displayName = u.name || `${u.profile?.first_name || u.first_name || ''} ${u.profile?.last_name || u.last_name || ''}`.trim() || u.email || `User ${u.id.slice(0, 8)}`;
                results.push({
                    id: u.id,
                    type: 'user',
                    name: displayName,
                    sub: u.email || ''
                });
            });
            
            // Search roles
            accessControlState.allRoles.filter(r => 
                r.name?.toLowerCase().includes(query)
            ).slice(0, 5).forEach(r => {
                results.push({
                    id: r.id,
                    type: 'role',
                    name: r.name || `Role ${r.id.slice(0, 8)}`,
                    sub: `${r.permissions?.length || 0} permissions`
                });
            });
            
            // Search groups
            accessControlState.allGroups.filter(g => 
                (g.name || '').toLowerCase().includes(query) ||
                (g.description || '').toLowerCase().includes(query)
            ).slice(0, 5).forEach(g => {
                results.push({
                    id: g.id,
                    type: 'group',
                    name: g.name || `Group ${g.id.slice(0, 8)}`,
                    sub: `${(g.member_ids || g.user_ids || []).length} members`
                });
            });
            
            if(results.length === 0) {
                resultsEl.innerHTML = '<div class="p-3 text-gray-500 text-sm">No results found</div>';
            } else {
                resultsEl.innerHTML = results.map(r => `
                    <div onclick="addAccessEntity('${r.id}', '${r.type}', '${r.name.replace(/'/g, "\\'")}')" 
                         class="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${r.type === 'user' ? '👤' : r.type === 'role' ? '🏷️' : '👥'}</span>
                            <div>
                                <div class="font-medium">${r.name}</div>
                                <div class="text-xs text-gray-400">${r.sub}</div>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
            
            resultsEl.classList.remove('hidden');
        }
        
        function addAccessEntity(id, type, name) {
            // Check if already added
            if(accessControlState.entities.find(e => e.id === id)) {
                showToast('Already added', 'info');
                return;
            }
            
            accessControlState.entities.push({ id, type, name });
            renderSelectedEntities();
            
            // Update matrices to show new entity columns
            renderTasksMatrix();
            renderToolsMatrix();
            
            // Clear search
            document.getElementById('access-entity-search').value = '';
            document.getElementById('access-entity-results').classList.add('hidden');
        }
        
        function removeAccessEntity(id) {
            accessControlState.entities = accessControlState.entities.filter(e => e.id !== id);
            renderSelectedEntities();
            
            // Also remove this entity from all task/tool denied lists
            accessControlState.tasks.forEach(t => {
                if (t.denied_entity_ids) {
                    t.denied_entity_ids = t.denied_entity_ids.filter(eid => eid !== id);
                }
            });
            accessControlState.tools.forEach(t => {
                if (t.denied_entity_ids) {
                    t.denied_entity_ids = t.denied_entity_ids.filter(eid => eid !== id);
                }
            });
            
            // Update matrices
            renderTasksMatrix();
            renderToolsMatrix();
        }
        
        function renderSelectedEntities() {
            const container = document.getElementById('access-selected-entities');
            
            if(accessControlState.entities.length === 0) {
                container.innerHTML = '<span class="text-gray-500 text-sm italic">No specific access configured - all authenticated users have access</span>';
                return;
            }
            
            container.innerHTML = accessControlState.entities.map(e => `
                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                      style="background: ${e.type === 'user' ? 'rgba(59, 130, 246, 0.2)' : e.type === 'role' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}">
                    ${e.type === 'user' ? '👤' : e.type === 'role' ? '🏷️' : '👥'}
                    ${e.name}
                    <button onclick="removeAccessEntity('${e.id}')" class="hover:text-red-400 ml-1">✕</button>
                </span>
            `).join('');
        }
        
        function renderTasksMatrix() {
            const container = document.getElementById('access-tasks-matrix');
            const entities = accessControlState.entities;
            const tasks = accessControlState.tasks;
            
            if(tasks.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <div class="text-4xl mb-2">📋</div>
                        <p>No tasks configured for this agent</p>
                    </div>
                `;
                return;
            }
            
            if(entities.length === 0) {
                // No specific entities - show simple allow/deny for each task
                container.innerHTML = `
                    <div class="text-sm text-gray-400 mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        💡 <strong>Tip:</strong> Add specific users, groups, or roles in "Agent Access" tab to configure per-entity task permissions.
                    </div>
                    ${tasks.map((task, idx) => `
                        <div class="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 mb-2">
                            <div class="flex items-center gap-3">
                                <span class="text-xl">📋</span>
                                <div>
                                    <div class="font-medium">${task.task_name}</div>
                                </div>
                            </div>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" class="accent-green-500 w-5 h-5" 
                                       ${!task.denied_all ? 'checked' : ''}
                                       onchange="toggleTaskGlobal(${idx}, this.checked)">
                                <span class="text-sm">${!task.denied_all ? '✅ Allowed' : '❌ Denied'}</span>
                            </label>
                        </div>
                    `).join('')}
                `;
                return;
            }
            
            // Show permission matrix: rows = tasks, columns = entities
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left p-3 font-medium">Task</th>
                                ${entities.map(e => `
                                    <th class="p-3 text-center">
                                        <div class="flex flex-col items-center gap-1">
                                            <span>${e.type === 'user' ? '👤' : e.type === 'role' ? '🏷️' : '👥'}</span>
                                            <span class="text-xs font-normal truncate max-w-[80px]" title="${e.name}">${e.name}</span>
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tasks.map((task, tIdx) => `
                                <tr class="border-b border-gray-700/50 hover:bg-gray-800/30">
                                    <td class="p-3">
                                        <div class="flex items-center gap-2">
                                            <span>📋</span>
                                            <span class="font-medium">${task.task_name}</span>
                                        </div>
                                    </td>
                                    ${entities.map((e, eIdx) => {
                                        const allowed = isTaskAllowedForEntity(tIdx, e.id);
                                        return `
                                            <td class="p-3 text-center">
                                                <button onclick="toggleTaskEntityAccess(${tIdx}, '${e.id}')" 
                                                        class="w-10 h-10 rounded-lg transition-all ${allowed ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'}">
                                                    ${allowed ? '✅' : '❌'}
                                                </button>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        function isTaskAllowedForEntity(taskIdx, entityId) {
            const task = accessControlState.tasks[taskIdx];
            if (!task) return true;
            const denied = task.denied_entity_ids || [];
            return !denied.includes(entityId) && !denied.includes('all');
        }
        
        function toggleTaskGlobal(idx, allowed) {
            accessControlState.tasks[idx].denied_all = !allowed;
            accessControlState.tasks[idx].denied_entity_ids = allowed ? [] : ['all'];
            renderTasksMatrix();
        }
        
        function toggleTaskEntityAccess(taskIdx, entityId) {
            const task = accessControlState.tasks[taskIdx];
            if (!task.denied_entity_ids) task.denied_entity_ids = [];
            
            const idx = task.denied_entity_ids.indexOf(entityId);
            if (idx > -1) {
                // Currently denied, remove from denied list (allow)
                task.denied_entity_ids.splice(idx, 1);
            } else {
                // Currently allowed, add to denied list (deny)
                task.denied_entity_ids.push(entityId);
            }
            // Remove 'all' if individual permissions are being set
            const allIdx = task.denied_entity_ids.indexOf('all');
            if (allIdx > -1) task.denied_entity_ids.splice(allIdx, 1);
            
            renderTasksMatrix();
        }
        
        function renderToolsMatrix() {
            const container = document.getElementById('access-tools-matrix');
            const entities = accessControlState.entities;
            const tools = accessControlState.tools;
            
            if(tools.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <div class="text-4xl mb-2">🔧</div>
                        <p>No tools configured for this agent</p>
                    </div>
                `;
                return;
            }
            
            if(entities.length === 0) {
                // No specific entities - show simple allow/deny for each tool
                container.innerHTML = `
                    <div class="text-sm text-gray-400 mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                        💡 <strong>Tip:</strong> Add specific users, groups, or roles in "Agent Access" tab to configure per-entity tool permissions.
                    </div>
                    ${tools.map((tool, idx) => `
                        <div class="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 mb-2">
                            <div class="flex items-center gap-3">
                                <span class="text-xl">🔧</span>
                                <div>
                                    <div class="font-medium">${tool.tool_name}</div>
                                </div>
                            </div>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" class="accent-green-500 w-5 h-5" 
                                       ${!tool.denied_all ? 'checked' : ''}
                                       onchange="toggleToolGlobal(${idx}, this.checked)">
                                <span class="text-sm">${!tool.denied_all ? '✅ Allowed' : '❌ Denied'}</span>
                            </label>
                        </div>
                    `).join('')}
                `;
                return;
            }
            
            // Show permission matrix: rows = tools, columns = entities
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left p-3 font-medium">Tool</th>
                                ${entities.map(e => `
                                    <th class="p-3 text-center">
                                        <div class="flex flex-col items-center gap-1">
                                            <span>${e.type === 'user' ? '👤' : e.type === 'role' ? '🏷️' : '👥'}</span>
                                            <span class="text-xs font-normal truncate max-w-[80px]" title="${e.name}">${e.name}</span>
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tools.map((tool, tIdx) => `
                                <tr class="border-b border-gray-700/50 hover:bg-gray-800/30">
                                    <td class="p-3">
                                        <div class="flex items-center gap-2">
                                            <span>🔧</span>
                                            <span class="font-medium">${tool.tool_name}</span>
                                        </div>
                                    </td>
                                    ${entities.map((e, eIdx) => {
                                        const allowed = isToolAllowedForEntity(tIdx, e.id);
                                        return `
                                            <td class="p-3 text-center">
                                                <button onclick="toggleToolEntityAccess(${tIdx}, '${e.id}')" 
                                                        class="w-10 h-10 rounded-lg transition-all ${allowed ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'}">
                                                    ${allowed ? '✅' : '❌'}
                                                </button>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        function isToolAllowedForEntity(toolIdx, entityId) {
            const tool = accessControlState.tools[toolIdx];
            if (!tool) return true;
            const denied = tool.denied_entity_ids || [];
            return !denied.includes(entityId) && !denied.includes('all');
        }
        
        function toggleToolGlobal(idx, allowed) {
            accessControlState.tools[idx].denied_all = !allowed;
            accessControlState.tools[idx].denied_entity_ids = allowed ? [] : ['all'];
            renderToolsMatrix();
        }
        
        function toggleToolEntityAccess(toolIdx, entityId) {
            const tool = accessControlState.tools[toolIdx];
            if (!tool.denied_entity_ids) tool.denied_entity_ids = [];
            
            const idx = tool.denied_entity_ids.indexOf(entityId);
            if (idx > -1) {
                // Currently denied, remove from denied list (allow)
                tool.denied_entity_ids.splice(idx, 1);
            } else {
                // Currently allowed, add to denied list (deny)
                tool.denied_entity_ids.push(entityId);
            }
            // Remove 'all' if individual permissions are being set
            const allIdx = tool.denied_entity_ids.indexOf('all');
            if (allIdx > -1) tool.denied_entity_ids.splice(allIdx, 1);
            
            renderToolsMatrix();
        }
        
        function updateTaskDefault(mode) {
            accessControlState.taskDefault = mode;
        }
        
        function updateToolDefault(mode) {
            accessControlState.toolDefault = mode;
        }
        
        async function applyAccessTemplate(templateId) {
            if(!templateId) return;
            
            const orgId = currentUser?.org_id || 'default';
            const headers = getAuthHeaders();
            
            try {
                const response = await fetch(
                    `${API}/api/access-control/agents/${accessControlState.agentId}/apply-template?template_id=${templateId}&org_id=${orgId}&user_id=${currentUser?.id || 'system'}`,
                    { method: 'POST', headers }
                );
                
                if(response.ok) {
                    showToast(`Template "${templateId}" applied!`, 'success');
                    await loadAccessControlData();
                } else {
                    throw new Error('Failed to apply template');
                }
            } catch(e) {
                showToast('Failed to apply template', 'error');
            }
            
            // Reset select
            document.getElementById('access-template-select').value = '';
        }
        
        function previewAccessAsUser() {
            showToast('Preview feature coming soon!', 'info');
        }
        
        async function saveAccessControl() {
            const orgId = currentUser?.org_id || 'default';
            const userId = currentUser?.id || 'system';
            const authHeaders = getAuthHeaders();
            
            try {
                // Save Level 1: Agent Access
                await fetch(
                    `${API}/api/access-control/agents/${accessControlState.agentId}/access?org_id=${orgId}&user_id=${userId}`,
                    {
                        method: 'PUT',
                        headers: { ...authHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            access_type: accessControlState.accessType,
                            entities: accessControlState.entities
                        })
                    }
                );
                
                // Save Level 2: Task Access
                await fetch(
                    `${API}/api/access-control/agents/${accessControlState.agentId}/tasks?org_id=${orgId}&user_id=${userId}`,
                    {
                        method: 'PUT',
                        headers: { ...authHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            allow_all_by_default: accessControlState.taskDefault === 'allow',
                            task_permissions: accessControlState.tasks
                        })
                    }
                );
                
                // Save Level 3: Tool Access
                await fetch(
                    `${API}/api/access-control/agents/${accessControlState.agentId}/tools?org_id=${orgId}&user_id=${userId}`,
                    {
                        method: 'PUT',
                        headers: { ...authHeaders, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            allow_all_by_default: accessControlState.toolDefault === 'allow',
                            tool_permissions: accessControlState.tools
                        })
                    }
                );
                
                showToast('Access control saved successfully!', 'success');
                closeAccessControlModal();
                
            } catch(e) {
                console.error('Error saving access control:', e);
                showToast('Failed to save access control', 'error');
            }
        }
        
        // ============================================================
        // END ACCESS CONTROL MODULE
        // ============================================================

        // Generate asset file
        async function generateAssetFile(kitId, assetId) {
            try {
                const response = await fetch(API + `/api/demo-kits/${kitId}/assets/${assetId}/generate`, {
                    method: 'POST'
                });
                
                if (!response.ok) throw new Error('Failed to generate');
                
                const result = await response.json();
                alert('Asset generated! You can now download it.');
                
                // Refresh kit details
                selectDemoKit(kitId);
            } catch (e) {
                alert('Failed to generate asset file: ' + e.message);
            }
        }
        
        // ========== EDIT FUNCTIONS ==========
        let currentEditKitId = null;
        let currentEditItemId = null;
        
        // Edit Asset (only Assets need modal - APIs and KBs go to Tools page)
        function editDemoAsset(kitId, assetId) {
            currentEditKitId = kitId;
            currentEditItemId = assetId;
            
            fetch(API + `/api/demo-kits/${kitId}`)
                .then(r => r.json())
                .then(kit => {
                    const asset = kit.assets.find(a => a.id === assetId);
                    if (!asset) return;
                    
                    document.getElementById('edit-asset-name').value = asset.name || '';
                    document.getElementById('edit-asset-description').value = asset.description || '';
                    document.getElementById('edit-asset-type').value = asset.asset_type || 'document';
                    ensureModalInBody('edit-asset-modal');
                    document.getElementById('edit-asset-modal').classList.remove('hidden');
                    document.getElementById('edit-asset-modal').classList.add('flex');
                });
        }
        
        function closeEditAssetModal() {
            document.getElementById('edit-asset-modal').classList.add('hidden');
            document.getElementById('edit-asset-modal').classList.remove('flex');
        }
        
        async function saveEditAsset() {
            try {
                const response = await fetch(API + `/api/demo-kits/${currentEditKitId}/asset/${currentEditItemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: document.getElementById('edit-asset-name').value,
                        description: document.getElementById('edit-asset-description').value,
                        asset_type: document.getElementById('edit-asset-type').value
                    })
                });
                
                if (!response.ok) throw new Error('Failed to update');
                
                closeEditAssetModal();
                selectDemoKit(currentEditKitId);
            } catch (e) {
                alert('Failed to save: ' + e.message);
            }
        }

        // Use example text in modal
        function useDemoKitExample() {
            showCreateKitModal();
            document.getElementById('new-kit-description').value = `I need tools for an HR agent that can check employee vacation balance, submit vacation requests, process expense claims with receipt uploads, and answer questions about HR policies including benefits and leave policies. Also need sample invoices and receipts for testing.`;
        }

        async function loadDemoItems() {
            try {
                const r = await fetch(API + '/api/demo/items');
                const d = await r.json();
                demoItems = d;
                renderDemoSidebar();
                updateDemoCounts();
            } catch(e) {
                console.log('Demo items not loaded:', e);
            }
        }

        function updateDemoCounts() {
            const apis = demoItems.apis || [];
            const docs = demoItems.docs || [];
            const images = demoItems.images || [];
            const all = apis.length + docs.length + images.length;
            
            document.getElementById('count-all').textContent = all;
            document.getElementById('count-api').textContent = apis.length;
            document.getElementById('count-document').textContent = docs.length;
            document.getElementById('count-image').textContent = images.length;
        }

        function renderDemoSidebar() {
            const container = document.getElementById('demo-sidebar-items');
            let items = [];
            
            // Get items based on tab filter
            if (demoSidebarTab === 'all') {
                items = [
                    ...(demoItems.apis || []).map(i => ({...i, itemType: 'api'})),
                    ...(demoItems.docs || []).map(i => ({...i, itemType: 'document'})),
                    ...(demoItems.images || []).map(i => ({...i, itemType: 'image'}))
                ];
            } else if (demoSidebarTab === 'api') {
                items = (demoItems.apis || []).map(i => ({...i, itemType: 'api'}));
            } else if (demoSidebarTab === 'document') {
                items = (demoItems.docs || []).map(i => ({...i, itemType: 'document'}));
            } else if (demoSidebarTab === 'image') {
                items = (demoItems.images || []).map(i => ({...i, itemType: 'image'}));
            }
            
            if (!items.length) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <span class="text-3xl block mb-2">📭</span>
                        <p class="text-sm">No items yet</p>
                        <p class="text-xs mt-1">Generate something to get started!</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = items.map(item => {
                const icons = { api: '🔗', document: '📄', image: '🖼️' };
                const colors = { api: 'purple', document: 'blue', image: 'green' };
                const icon = icons[item.itemType] || '📄';
                const color = colors[item.itemType] || 'gray';
                
                return `
                    <div class="group bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3 transition-all border border-transparent hover:border-${color}-500/30 cursor-pointer" onclick="viewDemoItem('${item.id}', '${item.itemType}')">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0 flex-1">
                                <span class="w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center text-sm flex-shrink-0">${icon}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="font-medium text-sm truncate">${item.name || 'Untitled'}</p>
                                    <p class="text-xs text-gray-500 truncate">${item.description || item.itemType}</p>
                                </div>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="event.stopPropagation(); editDemoItem('${item.id}', '${item.itemType}')" class="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Edit">
                                    ✏️
                                </button>
                                <button onclick="event.stopPropagation(); deleteDemoItem('${item.id}', '${item.itemType}')" class="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete">
                                    🗑️
                                </button>
                            </div>
                        </div>
                        ${item.url ? `
                            <div class="mt-2 pt-2 border-t border-gray-700/50 flex gap-2">
                                <a href="${item.url.startsWith('http') ? item.url : API + item.url}" target="_blank" onclick="event.stopPropagation()" class="text-xs text-${color}-400 hover:underline flex items-center gap-1">
                                    ${item.itemType === 'api' ? '🔗 Test API' : item.itemType === 'image' ? '👁️ View' : '⬇️ Download'}
                                </a>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        // View item details
        function viewDemoItem(id, type) {
            const items = type === 'api' ? demoItems.apis : type === 'document' ? demoItems.docs : demoItems.images;
            const item = items?.find(i => i.id === id);
            if (!item) return;
            
            const url = item.url ? (item.url.startsWith('http') ? item.url : API + item.url) : null;
            
            if (type === 'api' && url) {
                window.open(url, '_blank');
            } else if (url) {
                window.open(url, '_blank');
            }
        }

        // Edit item
        function editDemoItem(id, type) {
            const items = type === 'api' ? demoItems.apis : type === 'document' ? demoItems.docs : demoItems.images;
            const item = items?.find(i => i.id === id);
            if (!item) return;
            
            demoEditingItem = { id, type, item };
            ensureModalInBody('demo-edit-modal');
            const modal = document.getElementById('demo-edit-modal');
            const title = document.getElementById('edit-modal-title');
            const content = document.getElementById('edit-modal-content');
            
            const icons = { api: '🔗', document: '📄', image: '🖼️' };
            title.textContent = `${icons[type]} Edit ${item.name || 'Item'}`;
            
            content.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Name</label>
                        <input type="text" id="edit-item-name" class="input-field w-full rounded-lg px-3 py-2" value="${item.name || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Description</label>
                        <textarea id="edit-item-description" class="input-field w-full rounded-lg px-3 py-2 h-24">${item.description || ''}</textarea>
                    </div>
                    ${type === 'api' ? `
                        <div>
                            <label class="block text-sm font-medium mb-2">API URL</label>
                            <input type="text" id="edit-item-url" class="input-field w-full rounded-lg px-3 py-2 bg-gray-700" value="${item.url || ''}" readonly>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Endpoints</label>
                            <div class="bg-gray-800 rounded-lg p-3 text-sm font-mono max-h-40 overflow-y-auto">
                                ${(item.endpoints || []).map(e => `<div class="text-gray-300">${e.method} ${e.path}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        function closeDemoEditModal() {
            const modal = document.getElementById('demo-edit-modal');
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            demoEditingItem = null;
        }

        async function saveDemoEdit() {
            if (!demoEditingItem) return;
            
            const name = document.getElementById('edit-item-name')?.value;
            const description = document.getElementById('edit-item-description')?.value;
            
            try {
                const response = await fetch(API + '/api/demo/items/' + demoEditingItem.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: demoEditingItem.type,
                        name,
                        description
                    })
                });
                
                if (response.ok) {
                    closeDemoEditModal();
                    loadDemoItems();
                    addDemoMessage('assistant', `✅ Updated "${name}" successfully!`);
                } else {
                    alert('Failed to save changes');
                }
            } catch (e) {
                console.error('Save error:', e);
                alert('Error saving: ' + e.message);
            }
        }

        // Delete item
        async function deleteDemoItem(id, type) {
            if (!confirm('Are you sure you want to delete this item?')) return;
            
            try {
                const response = await fetch(API + '/api/demo/items/' + id + '?type=' + type, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    loadDemoItems();
                    addDemoMessage('assistant', '🗑️ Item deleted successfully.');
                } else {
                    alert('Failed to delete item');
                }
            } catch (e) {
                console.error('Delete error:', e);
                alert('Error deleting: ' + e.message);
            }
        }

        // Clear all demo history
        async function clearDemoHistory() {
            if (!confirm('Are you sure you want to clear all generated items? This cannot be undone.')) return;
            
            try {
                const response = await fetch(API + '/api/demo/items/clear', {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    demoItems = { apis: [], docs: [], images: [] };
                    demoConversation = [];
                    renderDemoSidebar();
                    updateDemoCounts();
                    clearDemoChat();
                }
            } catch (e) {
                console.error('Clear error:', e);
            }
        }

        async function sendDemoMessage() {
            const input = document.getElementById('demo-input');
            const message = input.value.trim();
            if (!message) return;

            input.value = '';
            
            // Remove welcome message
            const welcome = document.getElementById('demo-welcome');
            if (welcome) welcome.remove();
            
            // Add user message
            addDemoMessage('user', message);
            
            // Add thinking indicator
            const thinkingId = addDemoMessage('assistant', `<span class="animate-pulse">🧪 Generating ${demoCurrentMode}...</span>`, true);
            
            try {
                const response = await fetch(API + '/api/demo/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message, 
                        conversation: demoConversation,
                        mode_hint: demoCurrentMode  // Pass the current mode as a hint
                    })
                });
                
                const data = await response.json();
                
                // Remove thinking indicator
                document.getElementById(thinkingId)?.remove();
                
                // Add assistant response
                addDemoMessage('assistant', data.response);
                
                // If there's a generated item, show action buttons
                if (data.generated) {
                    addDemoActionButtons(data.generated);
                }
                
                // Save to conversation
                demoConversation.push({ role: 'user', content: message });
                demoConversation.push({ role: 'assistant', content: data.response });
                
                // Refresh items list
                loadDemoItems();
                
            } catch (e) {
                document.getElementById(thinkingId)?.remove();
                addDemoMessage('assistant', '❌ Error: ' + e.message);
            }
        }
