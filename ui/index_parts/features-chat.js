// Extracted from ui/index_parts/app-features.js
// Chunk: features-chat.js
// Loaded via defer in ui/index.html; do not reorder.

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
                chatConversations = (d.conversations || []).filter(c => (c.message_count || 0) > 0);
                renderChatConvList();
            } catch(e) {
                console.error('Failed to load conversations:', e);
                chatConversations = [];
                renderChatConvList();
            }
        }
        
        async function loadChatConversation(convId) {
            conv = convId;
            try {
                const r = await fetch(API+'/api/conversations/'+convId, {
                    headers: getAuthHeaders()
                });
                const c = await r.json();
                const container = document.getElementById('chat-messages');
                if (!container) return;

                const msgs = (c.messages || []).filter(m => m.role === 'user' || m.role === 'assistant');

                if (msgs.length === 0) {
                    // Empty conversation - show welcome instead of blank screen
                    const agentId = document.getElementById('chat-agent').value;
                    if (agentId) {
                        await startChatWithWelcome(agentId);
                    } else {
                        clearMsgs();
                    }
                    renderChatConvList();
                    return;
                }

                container.innerHTML = msgs.map(m => {
                    if (m.role === 'user') {
                        return `<div class="msg-row user"><div class="msg-bubble user">${esc(m.content)}</div></div>`;
                    } else {
                        return `<div class="msg-row assistant"><div class="msg-avatar">🤖</div><div class="msg-bubble assistant chat-content">${fmt(m.content)}</div></div>`;
                    }
                }).join('');
                container.scrollTop = container.scrollHeight;

                container.querySelectorAll('pre code').forEach(b=>hljs.highlightElement(b));
                renderChatConvList();
            } catch(e) {
                console.error('Failed to load conversation:', e);
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
            const ok = await uiConfirm(
                `Delete ${count} conversation${count > 1 ? 's' : ''}? This cannot be undone.`,
                { title: 'Delete conversations', confirmText: 'Delete', cancelText: 'Cancel', danger: true }
            );
            if (!ok) return;
            
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
                    showToast(`Could not delete ${result.failed} conversation(s).`, 'error');
                }
                
            } catch(e) {
                console.error('Delete error:', e);
                showToast('Could not delete conversations. Please try again.', 'error');
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
                showToast('Please enter an API key.', 'warning');
                return;
            }
            if (config.needsApiBase && !apiBase) {
                showToast('Please enter an API base URL.', 'warning');
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
            showToast(`${config.name} added successfully.`, 'success');
        }
        
        // Toast notification - uses global NotificationSystem (defined earlier)
        // showToast function is defined in the NotificationSystem section
        
        async function removeLLMProvider(provider) {
            const ok = await uiConfirm('Remove this provider?', {
                title: 'Remove provider',
                confirmText: 'Remove',
                cancelText: 'Cancel',
                danger: true
            });
            if (!ok) return;
            
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
                showToast('Please enter an API key.', 'warning');
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
            
            showToast('Provider updated successfully.', 'success');
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
                showToast('Provider not found.', 'error');
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
                    await uiAlert(
                        `${providerData.name} is working.\n\nResponse: "${String(data.response || '').substring(0, 160)}…"`,
                        { title: 'Connection successful', buttonText: 'Close' }
                    );
                } else {
                    await uiAlert(
                        `${providerData.name} test failed.\n\n${data.message || 'Please check your settings and try again.'}`,
                        { title: 'Connection failed', buttonText: 'Close' }
                    );
                }
            } catch (e) {
                if (card) {
                    card.classList.remove('animate-pulse');
                }
                await uiAlert(
                    `Could not test ${providerData.name}. Please try again.\n\n${e.message || ''}`,
                    { title: 'Test failed', buttonText: 'Close' }
                );
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
            const ok = await uiConfirm(
                'This will reindex all documents using the current embedding settings. Continue?',
                { title: 'Reindex knowledge base', confirmText: 'Reindex', cancelText: 'Cancel', danger: true }
            );
            if (!ok) return;
            
            try {
                const r = await fetch(API + '/api/settings/reindex', { method: 'POST' });
                const data = await r.json();
                
                if (data.status === 'success') {
                    await uiAlert(String(data.message || 'Reindex completed.'), { title: 'Reindex complete', buttonText: 'Close' });
                } else {
                    await uiAlert(String(data.message || 'Reindex failed.'), { title: 'Reindex failed', buttonText: 'Close' });
                }
            } catch (e) {
                await uiAlert('Could not start reindexing. Please try again.', { title: 'Reindex failed', buttonText: 'Close' });
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
                const response = await fetch(API + '/process/approvals?include_org=true&status=pending&limit=1', {
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
async function cancelToolWizard() {
    const isEditing = !!editingToolId;
    const confirmMsg = isEditing 
        ? 'Are you sure you want to cancel editing? Changes will not be saved.'
        : 'Are you sure you want to cancel? This tool will not be created.';
    
    const ok = await uiConfirm(confirmMsg, {
        title: 'Cancel?',
        confirmText: 'Cancel',
        cancelText: 'Keep working',
        danger: true
    });
    if (!ok) return;
    
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
    
    const ok = await uiConfirm(
        `This will re-scrape the website and replace existing content.\n\nURL: ${url}\nRecursive: ${recursive}\nMax Pages: ${maxPages}`,
        { title: 'Re-scrape website?', confirmText: 'Continue', cancelText: 'Cancel', danger: true }
    );
    if (!ok) return;
    
    showProgressModal('Re-scraping website...');
    updateProgress(10, 'Starting scrape...');
    
    try {
        const response = await fetch(API + '/api/tools/' + editingToolId + '/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
                await fetch(API + '/api/tools/' + toolId + '/documents', { method: 'POST', headers: getAuthHeaders(), body: fd });
            }
        }
        
        // Scrape URLs if any
        if (wizState.data.urls && wizState.data.urls.length > 0) {
            for (let i = 0; i < wizState.data.urls.length; i++) {
                const url = wizState.data.urls[i];
                updateProgress(45 + (i / wizState.data.urls.length) * 20, 'Scraping ' + url + '...');
                
                await fetch(API + '/api/tools/' + toolId + '/scrape', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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

