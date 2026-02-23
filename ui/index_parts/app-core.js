// Auto-generated from ui/index.js
// Part 001: lines 1-1784
// DO NOT reorder parts.

const API='';
        
        // Debug logging: ON so you can see navigate/modal logs. Set to false to silence.
        const DEBUG_MODE = true;
        const _originalLog = console.log;
        const _originalWarn = console.warn;
        if (!DEBUG_MODE) {
            console.log = function() {};
            console.warn = function() {};
        } else {
            _originalLog('🔧 [AgentForge] Debug logs ON');
        }
        // This always shows (never silenced) so you know the app script loaded
        console.info('[AgentForge] App script loaded. DEBUG_MODE=' + DEBUG_MODE);
        
        // Utility function - define early
        function escHtml(text) {
            if(text === null || text === undefined) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        }

        // =============================================================================
        // Business-friendly rendering helpers (Approvals, Reports, etc.)
        // =============================================================================

        function _afLooksLikeUuid(s) {
            try {
                const t = String(s || '').trim();
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
            } catch (_) { return false; }
        }

        function _afKeyNorm(k) {
            try { return String(k || '').trim().toLowerCase().replace(/\s+/g, '_'); } catch (_) { return ''; }
        }

        function _afIsInternalKey(k) {
            const nk = _afKeyNorm(k);
            if (!nk) return true;
            if (nk.startsWith('_')) return true;
            if (nk === '_user_context' || nk === 'user_context') return true;
            if (nk === 'org_id' || nk === 'orgid' || nk === 'org') return true;
            if (nk === 'current_user' || nk === 'currentuser') return true;
            if (nk === 'submitted_information' || nk === 'submittedinformation') return true;
            if (nk === 'download_url' || nk === 'path' || nk === 'content_type' || nk === 'contenttype') return true;
            return false;
        }

        function _afHumanizeLabel(k) {
            try {
                if (typeof window.humanizeFieldLabel === 'function') {
                    const r = window.humanizeFieldLabel(k);
                    if (r) return String(r);
                }
            } catch (_) {}
            const raw = String(k || '').trim();
            if (!raw) return '';
            return raw
                .replace(/[_\-]+/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/^\w/, c => c.toUpperCase());
        }

        function _afTryParseJsonString(v) {
            try {
                if (typeof v !== 'string') return v;
                const s = v.trim();
                if (!s) return v;
                if (s.length > 20000) return v;
                if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
                    return JSON.parse(s);
                }
                return v;
            } catch (_) {
                return v;
            }
        }

        function _afIsUploadedFileObj(v) {
            try {
                if (!v || typeof v !== 'object') return false;
                const kind = String(v.kind || '').toLowerCase();
                if (kind === 'uploadedfile' || kind === 'uploaded_file') return true;
                // Support legacy-ish shapes coming from approvals/review data
                if (v.name && (v.id || v.file_type || v.content_type || v.download_url || v.path)) return true;
                return false;
            } catch (_) { return false; }
        }

        function _afRenderFileLine(file) {
            try {
                const name = String(file?.name || 'Uploaded file');
                const typ = file?.file_type ? String(file.file_type).toUpperCase() : '';
                const size = (typeof file?.size === 'number') ? `${Math.round(file.size / 1024)} KB` : '';
                const meta = [typ, size].filter(Boolean).join(' · ');
                const id = file?.id ? String(file.id) : '';
                const btn = id ? `
                    <button type="button"
                        onclick="afDownloadProcessUploadFile('${escHtml(id)}','${escHtml(name)}')"
                        style="margin-left:10px;padding:6px 10px;border-radius:10px;border:1px solid color-mix(in srgb, var(--border-color) 55%, transparent);background:color-mix(in srgb, var(--bg-card) 40%, transparent);color:var(--text-primary);font-size:12px;font-weight:700;cursor:pointer;"
                    >Download</button>
                ` : '';
                return `
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid color-mix(in srgb, var(--border-color) 22%, transparent);">
                        <div style="min-width:0;">
                            <div style="color:var(--text-primary);font-weight:750;word-break:break-word;">${escHtml(name)}</div>
                            ${meta ? `<div style="margin-top:2px;color:var(--text-secondary);font-size:12px;">${escHtml(meta)}</div>` : ''}
                        </div>
                        <div style="flex-shrink:0;">${btn}</div>
                    </div>
                `;
            } catch (_) {
                return '';
            }
        }

        function _afRenderValueBusiness(v, depth = 0) {
            const maxDepth = 2;
            try {
                if (v === undefined || v === null || v === '') return '';
                v = _afTryParseJsonString(v);

                if (typeof v === 'boolean') return escHtml(v ? 'Yes' : 'No');
                if (typeof v === 'number') return escHtml(String(v));
                if (typeof v === 'string') {
                    const s = v.trim();
                    if (!s) return '';
                    // Hide raw UUIDs (most are internal references)
                    if (_afLooksLikeUuid(s)) return '';
                    const t = (s.length > 260) ? (s.slice(0, 260) + '…') : s;
                    return escHtml(t);
                }

                if (Array.isArray(v)) {
                    const arr = v.filter(x => x !== undefined && x !== null && x !== '');
                    if (arr.length === 0) return '';
                    // Files list
                    if (arr.every(_afIsUploadedFileObj)) {
                        return `<div>${arr.slice(0, 10).map(_afRenderFileLine).join('')}${arr.length > 10 ? `<div style="margin-top:8px;color:var(--text-secondary);font-size:12px;">Showing 10 of ${arr.length} files.</div>` : ''}</div>`;
                    }
                    // Compact list of items
                    const items = arr.slice(0, 6).map((it, idx) => {
                        if (typeof it === 'string' || typeof it === 'number' || typeof it === 'boolean') {
                            const r = _afRenderValueBusiness(it, depth + 1);
                            return r ? `<div style="color:var(--text-primary);">• ${r}</div>` : '';
                        }
                        if (it && typeof it === 'object') {
                            const pickKeys = ['name', 'title', 'type', 'category', 'date', 'amount', 'total', 'vendor', 'status', 'decision'];
                            const parts = [];
                            for (const k of pickKeys) {
                                if (it[k] !== undefined && it[k] !== null && it[k] !== '') {
                                    const r = _afRenderValueBusiness(it[k], depth + 1);
                                    if (r) parts.push(r);
                                }
                                if (parts.length >= 3) break;
                            }
                            const line = parts.length ? parts.join(' — ') : `Item ${idx + 1}`;
                            return `<div style="color:var(--text-primary);">• ${line}</div>`;
                        }
                        return '';
                    }).filter(Boolean).join('');
                    const more = arr.length > 6 ? `<div style="margin-top:8px;color:var(--text-secondary);font-size:12px;">+ ${arr.length - 6} more</div>` : '';
                    return items ? `<div>${items}${more}</div>` : escHtml(`${arr.length} item${arr.length !== 1 ? 's' : ''}`);
                }

                if (typeof v === 'object') {
                    if (_afIsUploadedFileObj(v)) return _afRenderFileLine(v);
                    if (depth >= maxDepth) return '';

                    const entries = Object.entries(v)
                        .filter(([k, val]) => !_afIsInternalKey(k))
                        .filter(([, val]) => val !== undefined && val !== null && val !== '');

                    if (!entries.length) return '';

                    // Render a small, readable list of fields (no JSON)
                    const rows = entries.slice(0, 8).map(([k, val]) => {
                        const rendered = _afRenderValueBusiness(val, depth + 1);
                        if (!rendered) return '';
                        return `
                            <div style="display:flex;gap:10px;align-items:flex-start;">
                                <div style="min-width:140px;color:var(--text-secondary);font-size:12px;font-weight:650;">${escHtml(_afHumanizeLabel(k))}</div>
                                <div style="color:var(--text-primary);font-size:13px;line-height:1.5;word-break:break-word;">${rendered}</div>
                            </div>
                        `;
                    }).filter(Boolean).join('');

                    const more = entries.length > 8 ? `<div style="margin-top:8px;color:var(--text-secondary);font-size:12px;">+ ${entries.length - 8} more details</div>` : '';
                    return rows ? `<div style="display:flex;flex-direction:column;gap:8px;">${rows}${more}</div>` : '';
                }

                return '';
            } catch (_) {
                return '';
            }
        }

        /**
         * Render "Details to review" in a non-technical, business-friendly format.
         * - No raw JSON
         * - Hides internal keys and most UUID references
         * - Shows file uploads as attachments with download buttons
         */
        function afRenderReviewData(rd, opts = {}) {
            const maxRows = (opts && typeof opts.maxRows === 'number') ? opts.maxRows : 24;
            if (!rd) return '';
            rd = _afTryParseJsonString(rd);
            if (typeof rd === 'string') {
                const s = rd.trim();
                if (!s) return '';
                // If it was a JSON string that we couldn't parse, show a safe short message
                return `<div style="color:var(--text-secondary);font-size:13px;line-height:1.5;">${escHtml(s.length > 320 ? (s.slice(0, 320) + '…') : s)}</div>`;
            }
            if (typeof rd !== 'object' || rd === null) return '';

            const entries = Object.entries(rd).filter(([k, v]) => {
                if (_afIsInternalKey(k)) return false;
                if (v === undefined || v === null || v === '') return false;
                // Hide internal reference IDs by default
                if (typeof v === 'string' && _afLooksLikeUuid(v) && /(^|_|\s)(id|uuid)(_|$)/i.test(String(k))) return false;
                return true;
            });
            if (!entries.length) return '';

            const rows = entries.slice(0, maxRows).map(([k, v]) => {
                const rendered = _afRenderValueBusiness(v, 0);
                if (!rendered) return '';
                return `
                    <tr style="border-bottom:1px solid color-mix(in srgb, var(--border-color) 22%, transparent);">
                        <td style="padding:10px 14px 10px 0;color:var(--text-secondary);font-weight:750;white-space:nowrap;vertical-align:top;">${escHtml(_afHumanizeLabel(k) || k)}</td>
                        <td style="padding:10px 0;color:var(--text-primary);vertical-align:top;">${rendered}</td>
                    </tr>
                `;
            }).filter(Boolean).join('');

            if (!rows) return '';

            const moreNote = entries.length > maxRows
                ? `<div style="margin-top:10px;color:var(--text-secondary);font-size:12px;">Showing ${maxRows} fields. Ask your administrator if you need more details.</div>`
                : '';

            return `
                <div style="overflow-x:auto;">
                    <table style="width:100%;font-size:13px;">
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                ${moreNote}
            `;
        }

        async function afDownloadProcessUploadFile(fileId, filename) {
            const id = String(fileId || '').trim();
            if (!id) return;
            const name = String(filename || '').trim() || `upload-${id}`;
            try {
                const headers = (typeof getAuthHeaders === 'function') ? getAuthHeaders() : {};
                const res = await fetch(API + `/process/uploads/${encodeURIComponent(id)}/download`, { headers });
                if (!res.ok) {
                    let msg = res.statusText || 'Failed to download file';
                    try {
                        const data = await res.json().catch(() => null);
                        if (data && (data.detail || data.message || data.error)) msg = data.detail || data.message || data.error;
                    } catch (_) {}
                    try { if (typeof showToast === 'function') showToast(String(msg || 'Failed to download file'), 'error'); } catch (_) {}
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
                try { if (typeof showToast === 'function') showToast('Unable to download file', 'error'); } catch (_) {}
            }
        }

        // Expose helpers for other parts (approvals, chat, playback)
        try { window.afRenderReviewData = afRenderReviewData; } catch (_) {}
        try { window.afDownloadProcessUploadFile = afDownloadProcessUploadFile; } catch (_) {}
        
        let step=0,wizard={name:'',icon:'',goal:'',originalGoal:'',personality:null,tasks:[],tool_ids:[],suggestedTools:[],guardrails:{},model:'',modelReason:'',editId:null,deployTarget:'cloud',cloudProvider:''},allTools=[],toolType=null,uploadedFiles=[],agentTab='published',conv=null,testAgent=null,apiStep=1,apiParams=[],configMode='manual',chatAttachments=[],testAttachments=[];
        
        // Track current page to prevent duplicate navigation from hashchange
        let _currentPage = '';
        
        // Create wizard (modal) state
        let _createWizardReturnTo = 'dashboard';
        let _createFlowStep = 'type'; // 'type' | 'method' | 'ai'
        let _createBuildMode = null;  // 'manual' | 'ai' | null
        let _wizardStep0OriginalHtml = null;

        // Ensure modal is direct child of body so it's visible when opened from any page
        function ensureModalInBody(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return false;
            if (modal.parentElement !== document.body) document.body.appendChild(modal);
            return true;
        }

        function navigate(p, updateHash = true){
            // DEBUG: Log only create navigation
            if (p === 'create') {
                console.log('🎯 [CREATE] navigate("create") called', { from: _currentPage, stack: new Error().stack?.split('\n').slice(1, 4).join(' <- ') });
            }
            
            const fromPage = _currentPage || 'dashboard';
            const isCreate = p === 'create';
            
            // Remember where to return when closing the modal
            if (isCreate && fromPage && fromPage !== 'create') {
                _createWizardReturnTo = fromPage;
            }
            
            // Track current page
            _currentPage = p;
            
            // Hide all sections (except when opening Create as a modal overlay)
            if (!isCreate) {
                document.querySelectorAll('main>section').forEach(s => s.classList.add('hidden'));
            }
            
            // Show target page
            const targetPage = document.getElementById('page-'+p);
            if (targetPage) {
                targetPage.classList.remove('hidden');
                // DEBUG: Check create page visibility
                if (p === 'create') {
                    console.log('🎯 [CREATE] page-create shown', { 
                        display: window.getComputedStyle(targetPage).display,
                        step0Visible: !document.getElementById('wizard-step-0')?.classList.contains('hidden'),
                        goalInputExists: !!document.getElementById('w-initial-goal')
                    });
                }
            }
            
            // Update nav
            document.querySelectorAll('.sidebar-item').forEach(b=>b.classList.remove('active'));
            document.getElementById('nav-'+p)?.classList.add('active');
            document.querySelectorAll('.mobile-nav button').forEach(b=>b.classList.remove('active'));
            document.getElementById('mob-'+p)?.classList.add('active');
            
            // Update URL hash
            if (updateHash) window.location.hash = p;
            
            // Page-specific initialization
            if(p==='dashboard') loadDashboardStats();
            if(p==='agents')loadAgents();
            if(p==='tools')loadTools();
            if(p==='chat') { if (!window._skipChatAgentLoad) loadChatAgents(); window._skipChatAgentLoad = false; }
            if(p==='create'){
                console.log('🎯 [CREATE] Calling resetWizardNew()...');
                try {
                    resetWizardNew();
                    step=0;
                    updateStepsNew();
                    createFlowReset();
                    console.log('🎯 [CREATE] resetWizardNew() completed successfully');
                } catch(e) {
                    console.error('🎯 [CREATE] ERROR in resetWizardNew():', e);
                }
            }
            if(p==='settings'){ loadSettings(); updateThemeButtons(localStorage.getItem('agentforge-theme') || 'dark'); loadIdentitySettings(); }
            if(p==='profile') loadProfileInfo();
            if(p==='demo')initDemoLab();
            if(p==='approvals') loadApprovals();
        }

        async function closeCreateWizardModal(force = false) {
            const hasProgress = !!(wizard?.editId || wizard?.id || wizard?.goal || wizard?.originalGoal || (step && step > 0));
            const doClose = () => {
                const returnTo = (_createWizardReturnTo && _createWizardReturnTo !== 'create') ? _createWizardReturnTo : 'dashboard';
                // Ensure create is hidden before switching pages
                document.getElementById('page-create')?.classList.add('hidden');
                navigate(returnTo);
            };
            
            if (force || !hasProgress) return doClose();
            
            const ok = await uiConfirm(
                'Close setup and discard your current draft?',
                { title: 'Discard your draft?', confirmText: 'Discard', cancelText: 'Keep editing', danger: true }
            );
            if (ok) doClose();
        }
        
        // Load dashboard statistics
        async function loadDashboardStats() {
            try {
                const headers = getAuthHeaders();
                // Fetch stats in parallel
                const [agentsRes, toolsRes, usersRes] = await Promise.allSettled([
                    fetch(API + '/api/agents?status=published', { headers }).then(r => r.ok ? r.json() : { agents: [] }),
                    fetch(API + '/api/tools', { headers }).then(r => r.ok ? r.json() : { tools: [] }),
                    fetch(API + '/api/security/users', { headers }).then(r => r.ok ? r.json() : [])
                ]);
                
                const agents = agentsRes.status === 'fulfilled' ? (agentsRes.value.agents || agentsRes.value || []) : [];
                const tools = toolsRes.status === 'fulfilled' ? (toolsRes.value.tools || toolsRes.value || []) : [];
                const users = usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.users || []) : [];
                
                const agentEl = document.getElementById('dash-stat-agents');
                const toolEl = document.getElementById('dash-stat-tools');
                const userEl = document.getElementById('dash-stat-users');
                if (agentEl) agentEl.textContent = Array.isArray(agents) ? agents.length : 0;
                if (toolEl) toolEl.textContent = Array.isArray(tools) ? tools.length : 0;
                if (userEl) userEl.textContent = Array.isArray(users) ? users.length : 0;
            } catch (e) {
                console.error('Dashboard stats error:', e);
            }
        }
        
        // Handle browser back/forward buttons
        window.addEventListener('hashchange', function() {
            const hash = window.location.hash.slice(1); // Remove the '#'
            // Only navigate if hash changed and page exists
            // Skip if we're already on this page (prevents duplicate loading)
            if (hash && hash !== _currentPage && document.getElementById('page-' + hash)) {
                navigate(hash, false);
            }
        });
        
        // ============================================================================
        // PERSONALITY SLIDER FUNCTIONS
        // ============================================================================
        
        // Store API-provided personality descriptions (100% dynamic from LLM)
        let apiPersonalityDescriptions = {};
        
        // Update a personality slider - descriptions come from API only
        function updatePersonalitySlider(trait, value) {
            value = Math.min(10, Math.max(1, parseInt(value) || 5));
            
            // Update number input
            const numInput = document.getElementById(`p-${trait}-num`);
            const slider = document.getElementById(`p-${trait}`);
            if (numInput) numInput.value = value;
            if (slider) slider.value = value;
            
            // Update wizard personality
            if (!wizard.personality) wizard.personality = {};
            wizard.personality[trait] = value;
            
            // Update description - ONLY use API description (no fallback)
            const descEl = document.getElementById(`p-${trait}-desc`);
            if (descEl) {
                const apiDesc = apiPersonalityDescriptions[trait + 'Desc'];
                if (apiDesc) {
                    descEl.textContent = apiDesc;
                }
                // If no API description, leave as is (will be updated on next API call)
            }
            
            // Update overall preview
            updatePersonalityPreview();
        }
        
        // Sync slider from number input
        function syncSlider(trait, value) {
            value = Math.min(10, Math.max(1, parseInt(value) || 5));
            document.getElementById(`p-${trait}`).value = value;
            updatePersonalitySlider(trait, value);
        }
        
        // Update the personality preview text - uses API-provided reason
        function updatePersonalityPreview() {
            const previewEl = document.getElementById('personality-preview-text');
            if (!previewEl) return;
            
            // If we have an API-provided personality reason, use it
            if (wizard.personalityReason) {
                previewEl.textContent = wizard.personalityReason;
                return;
            }
            
            // Otherwise show a simple dynamic message
            const name = wizard.name || 'Your agent';
            previewEl.textContent = `${name}'s personality is configured above. Generate from a goal to get AI recommendations.`;
        }
        
        // Reset personality - just clears values, user must regenerate
        function resetPersonalityDefaults() {
            const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
            traits.forEach(trait => {
                const slider = document.getElementById(`p-${trait}`);
                const numInput = document.getElementById(`p-${trait}-num`);
                const descEl = document.getElementById(`p-${trait}-desc`);
                if (slider) slider.value = 5;
                if (numInput) numInput.value = 5;
                if (descEl) descEl.textContent = 'Generate from goal to get AI recommendation';
            });
            wizard.personality = null;
            wizard.personalityReason = null;
            apiPersonalityDescriptions = {};
            updatePersonalityPreview();
        }
        
        // Initialize personality sliders from wizard state
        function initPersonalitySliders() {
            if (!wizard.personality) return;
            
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
            
            updatePersonalityPreview();
        }
        
        // Update all personality descriptions when agent name changes
        function updateAgentNameInPersonality() {
            wizard.name = document.getElementById('w-name')?.value || '';
            const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
            traits.forEach(trait => {
                const slider = document.getElementById(`p-${trait}`);
                if (slider) {
                    updatePersonalitySlider(trait, slider.value);
                }
            });
            updatePersonalityPreview();
        }
        
        // ============================================================================
        // GOAL CHANGE - REAL-TIME RECOMMENDATIONS
        // ============================================================================
        
        let goalDebounceTimer = null;
        let lastGoalText = '';
        
        // Called when goal text changes
        function onGoalChange() {
            const goal = document.getElementById('w-goal')?.value?.trim() || '';
            
            // Don't update if goal is too short or hasn't changed significantly
            if (goal.length < 20 || goal === lastGoalText) {
                return;
            }
            
            // Clear previous timer
            if (goalDebounceTimer) {
                clearTimeout(goalDebounceTimer);
            }
            
            // Show hint that we're waiting
            const hint = document.getElementById('goal-hint');
            if (hint) {
                hint.textContent = 'Keep typing... recommendations will update automatically';
                hint.className = 'text-[10px] text-purple-400 mt-1';
            }
            
            // Debounce: wait 1.5 seconds after user stops typing
            goalDebounceTimer = setTimeout(() => {
                lastGoalText = goal;
                updateRecommendationsFromGoal(goal);
            }, 1500);
        }
        
        // Fetch new recommendations from API based on goal
        async function updateRecommendationsFromGoal(goal) {
            const indicator = document.getElementById('goal-update-indicator');
            const hint = document.getElementById('goal-hint');
            
            // Show loading indicator
            if (indicator) indicator.classList.remove('hidden');
            if (hint) {
                hint.textContent = 'AI is analyzing your goal...';
                hint.className = 'text-[10px] text-purple-400 mt-1';
            }
            
            try {
                const response = await fetch(API + '/api/agents/generate-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        goal: goal,
                        update_mode: true  // Flag to indicate this is an update, not initial creation
                    })
                });
                
                if (!response.ok) throw new Error('Failed to get recommendations');
                
                const config = await response.json();
                
                // Apply recommendations with animation
                applyRecommendationsWithAnimation(config);
                
                // Show success
                if (hint) {
                    hint.textContent = '✨ Recommendations updated based on your goal';
                    hint.className = 'text-[10px] text-green-400 mt-1';
                    
                    // Reset hint after 3 seconds
                    setTimeout(() => {
                        hint.textContent = 'Edit your goal anytime - recommendations will update automatically';
                        hint.className = 'text-[10px] text-gray-500 mt-1';
                    }, 3000);
                }
                
                // Show toast
                showToast('✨ AI recommendations updated!', 'success');
                
            } catch (error) {
                console.error('Error updating recommendations:', error);
                if (hint) {
                    hint.textContent = 'Could not update recommendations. Try again.';
                    hint.className = 'text-[10px] text-red-400 mt-1';
                }
            } finally {
                // Hide loading indicator
                if (indicator) indicator.classList.add('hidden');
            }
        }
        
        // Apply recommendations with smooth animation
        function applyRecommendationsWithAnimation(config) {
            // 1. Update Model with animation
            if (config.model) {
                wizard.model = config.model;
                wizard.modelReason = config.modelReason;  // Store the reason
                
                const modelContainer = document.getElementById('llm-models-list');
                if (modelContainer) {
                    modelContainer.classList.add('animate-pulse');
                    setTimeout(() => {
                        loadLLMModels();  // This will highlight the new recommended model
                        modelContainer.classList.remove('animate-pulse');
                    }, 300);
                }
                
                // Update model reason
                const modelWhyEl = document.getElementById('model-why-text');
                if (modelWhyEl && config.modelReason) {
                    modelWhyEl.textContent = config.modelReason;
                }
            }
            
            // 2. Store personality descriptions from API
            if (config.personalityDescriptions) {
                apiPersonalityDescriptions = config.personalityDescriptions;
            }
            
            // 3. Update Personality sliders with animation
            if (config.personality) {
                const slidersContainer = document.getElementById('personality-sliders');
                if (slidersContainer) {
                    slidersContainer.classList.add('animate-pulse');
                }
                
                // Update personality reason
                if (config.personalityReason) {
                    const previewEl = document.getElementById('personality-preview-text');
                    if (previewEl) {
                        previewEl.textContent = config.personalityReason;
                    }
                }
                
                setTimeout(() => {
                    // Apply each personality value
                    const traits = ['creativity', 'length', 'formality', 'empathy', 'proactivity', 'confidence'];
                    traits.forEach((trait, index) => {
                        const value = config.personality[trait];
                        if (value !== undefined) {
                            // Animate slider update with slight delay for each
                            setTimeout(() => {
                                animateSliderTo(trait, value);
                                
                                // Update description from API
                                const desc = apiPersonalityDescriptions[trait + 'Desc'];
                                const descEl = document.getElementById(`p-${trait}-desc`);
                                if (desc && descEl) {
                                    descEl.textContent = desc;
                                }
                            }, index * 100);
                        }
                    });
                    
                    if (slidersContainer) {
                        slidersContainer.classList.remove('animate-pulse');
                    }
                }, 300);
                
                // Update wizard personality
                wizard.personality = { ...wizard.personality, ...config.personality };
            }
            
            // 3. Update Agent Name if provided
            if (config.name && !wizard.name) {
                const nameEl = document.getElementById('w-name');
                if (nameEl && !nameEl.value) {
                    nameEl.value = config.name;
                    wizard.name = config.name;
                }
            }
            
            // 4. Store suggested tasks for later
            if (config.tasks) {
                wizard.tasks = config.tasks;
            }
            
            // 5. Store guardrails recommendations
            if (config.guardrails) {
                wizard.guardrails = { ...wizard.guardrails, ...config.guardrails };
            }
            
            // 6. Store suggested tools
            if (config.suggestedTools) {
                wizard.suggestedTools = config.suggestedTools;
            }
            
            // Update preview text
            updatePersonalityPreview();
        }
        
        // Animate slider from current value to target value
        function animateSliderTo(trait, targetValue) {
            const slider = document.getElementById(`p-${trait}`);
            const numInput = document.getElementById(`p-${trait}-num`);
            
            if (!slider) return;
            
            const currentValue = parseInt(slider.value) || 5;
            const steps = Math.abs(targetValue - currentValue);
            const direction = targetValue > currentValue ? 1 : -1;
            
            if (steps === 0) return;
            
            let currentStep = 0;
            const interval = setInterval(() => {
                currentStep++;
                const newValue = currentValue + (direction * currentStep);
                
                slider.value = newValue;
                if (numInput) numInput.value = newValue;
                
                // Update description
                updatePersonalitySlider(trait, newValue);
                
                if (currentStep >= steps) {
                    clearInterval(interval);
                }
            }, 50);
        }
        
        // ============================================================================
        // NEW AI-POWERED WIZARD FUNCTIONS
        // ============================================================================
        
        function resetWizardNew() {
            step = 0;
            wizard = {
                name: '',
                icon: '',
                goal: '',
                originalGoal: '',
                personality: null,
                personalityReason: '',
                tasks: [],
                tool_ids: [],
                suggestedTools: [],
                guardrails: {},
                model: '',
                modelReason: '',
                editId: null,
                deployTarget: 'cloud',
                cloudProvider: '',
                accessControl: null,  // Will be set when user visits Access Control step
                userPermissions: { is_owner: true, permissions: ['full_admin'] }  // New agent = user is owner
            };
            
            // Clear API descriptions
            apiPersonalityDescriptions = {};
            lastGoalText = '';
            
            // Reset UI
            document.getElementById('wizard-step-0')?.classList.remove('hidden');
            document.getElementById('wizard-generating')?.classList.add('hidden');
            document.getElementById('wizard-progress')?.classList.add('hidden');
            for(let i=1; i<=8; i++) {
                document.getElementById('wizard-step-'+i)?.classList.add('hidden');
            }

            // Capture the original Step 0 markup once (used for restoring later)
            if (_wizardStep0OriginalHtml === null) {
                const step0El = document.getElementById('wizard-step-0');
                if (step0El) _wizardStep0OriginalHtml = step0El.innerHTML;
            }
            
            // Check if step-0 content was replaced (e.g., by showProcessEditor)
            // If so, restore the original content
            const goalInput = document.getElementById('w-initial-goal');
            if (!goalInput) {
                // Content was replaced, need to restore wizard-step-0
                restoreWizardStep0();
            } else {
                goalInput.value = '';
            }
            
            // Reset agent type selection to default
            selectedAgentType = 'conversational';
            try { selectAgentType('conversational'); } catch (_) {}
            try { createFlowReset(); } catch (_) {}
        }
        
        // Restore wizard step 0 original content if it was replaced
        function restoreWizardStep0() {
            const step0 = document.getElementById('wizard-step-0');
            if (!step0) return;
            
            if (_wizardStep0OriginalHtml) {
                step0.innerHTML = _wizardStep0OriginalHtml;
            } else {
                console.warn('restoreWizardStep0: no original HTML captured yet');
                return;
            }
            
            // Re-apply default state (cards + flow)
            try { selectAgentType(selectedAgentType || 'conversational'); } catch (_) {}
            try { createFlowReset(); } catch (_) {}
        }
        
        async function updateStepsNew() {
            console.log('=== updateStepsNew called, step:', step);
            
            // Show/hide step 0 vs other steps
            if(step === 0) {
                document.getElementById('wizard-step-0')?.classList.remove('hidden');
                document.getElementById('wizard-generating')?.classList.add('hidden');
                document.getElementById('wizard-progress')?.classList.add('hidden');
                document.getElementById('wizard-sticky-header')?.classList.add('hidden');
                for(let i=1; i<=8; i++) {
                    document.getElementById('wizard-step-'+i)?.classList.add('hidden');
                }
                return;
            }
            
            // Show progress bar and sticky header for steps 1+
            document.getElementById('wizard-step-0')?.classList.add('hidden');
            document.getElementById('wizard-generating')?.classList.add('hidden');
            // Keep old progress bar hidden - we use sticky header now
            document.getElementById('wizard-progress')?.classList.add('hidden');
            document.getElementById('wizard-sticky-header')?.classList.remove('hidden');
            
            // Update NEW sticky header
            updateWizardStickyHeader();
            
            // Update step indicators (old system)
            for(let i=1; i<=8; i++) {
                const el = document.getElementById('step-'+i);
                const content = document.getElementById('wizard-step-'+i);
                if(el) {
                    el.className = 'w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center cursor-pointer text-xs md:text-sm ' + 
                        (i < step ? 'step-done' : i === step ? 'step-active' : 'step-pending');
                }
                if(content) {
                    content.classList.toggle('hidden', i !== step);
                    console.log('Step', i, 'visibility:', i === step ? 'visible' : 'hidden');
                }
            }
            
            // Load step-specific content
            console.log('Loading content for step:', step);
            if(step === 1) {
                console.log('Loading LLM models');
                loadLLMModels();
                initPersonalitySliders();
                updateWizardCreationModeCopy();
            }
            if(step === 3) {
                console.log('Loading Demo Kit Tools for selection');
                loadDemoKitToolsForSelection();
            }
            if(step === 4) {
                console.log('🟢🟢🟢 STEP 4: ACCESS CONTROL LOADING 🟢🟢🟢');
                console.log('🟢 wizard.accessControl BEFORE load:', JSON.stringify(wizard.accessControl, null, 2));
                // Collect tasks from previous step to ensure they're available
                collectTasksNew();
                console.log('🟢 Tasks collected, now loading wizard access control...');
                // ✅ IMPORTANT: Load saved access control data FIRST
                await loadWizardAccessControl();
                console.log('🟢 loadWizardAccessControl completed');
                console.log('🟢 wizardAccessState.selectedEntities:', JSON.stringify(wizardAccessState.selectedEntities, null, 2));
                console.log('🟢 wizardAccessState.taskPermissions:', JSON.stringify(wizardAccessState.taskPermissions, null, 2));
                // Sync task permissions
                syncTaskPermissions();
                // Update access control UI
                updateWizardAccessUI();
                // Initialize access control (async - will check ownership)
                initWizardAccessControl();
                console.log('🟢🟢🟢 STEP 4 LOADING COMPLETE 🟢🟢🟢');
            }
            if(step === 5) {
                console.log('Loading Guardrails');
                // Load guardrails values from wizard object if editing
                loadGuardrailsToForm();
            }
            if(step === 6) {
                console.log('Calling showPreviewNew');
                // Ensure tools are collected before preview
                collectToolsNew();
                // Reload access control to ensure task IDs match current tasks
                await loadWizardAccessControl();
                showPreviewNew();
            }
            if(step === 7) {
                console.log('Calling prepareTestSuggestions');
                prepareTestSuggestions();
                // Reset test conversation when entering test step
                resetTestConversation();
            }
            
            // ⚠️ CRITICAL: Re-apply permission restrictions after step content is rendered
            // This ensures restrictions work on dynamically loaded elements
            console.log('🔐🔐🔐 STEP CHANGE CHECK 🔐🔐🔐');
            console.log('🔐 step:', step);
            console.log('🔐 wizard.editId:', wizard.editId);
            console.log('🔐 wizard.userPermissions:', wizard.userPermissions);
            console.log('🔐 wizard.id:', wizard.id);
            
            // Apply restrictions for delegated admins who are editing
            const isEditing = wizard.editId || wizard.id;
            const hasPerms = wizard.userPermissions;
            
            if (hasPerms && isEditing) {
                console.log('🔐✅ Will apply permission restrictions for step', step);
                // Small delay to ensure DOM is updated
                setTimeout(() => {
                    applyPermissionRestrictions(wizard.userPermissions);
                }, 100);
            } else {
                console.log('🔐❌ NOT applying restrictions - editId/id:', isEditing, 'perms:', !!hasPerms);
            }
        }
        
        // Reset test conversation
        async function resetTestConversation() {
            const messagesDiv = document.getElementById('test-messages');
            messagesDiv.innerHTML = '';
            
            // Only reset conversation, keep agent ID to prevent duplicates
            if(testAgent) {
                testAgent.convId = null; // Reset conversation but keep agent
            }
            testAttachments = [];
            renderTestAttachments();
            console.log('Test conversation reset (agent preserved)');
            
            // Show personalized welcome message
            const userName = currentUser?.first_name || currentUser?.display_name || 
                           currentUser?.email?.split('@')[0]?.replace('.', ' ') || 'there';
            const agentName = wizard.name || 'your agent';
            
            const welcomeHtml = `
                <div class="animate-fade-in">
                    <div class="text-center py-4">
                        <div class="text-4xl mb-2">👋</div>
                        <h3 class="text-lg font-semibold text-white">Hi ${userName}!</h3>
                        <p class="text-sm text-gray-400 mt-1">I'm ${agentName}. Try asking me something!</p>
                        ${wizard.tasks && wizard.tasks.length > 0 ? `
                            <div class="mt-3 text-xs text-gray-500">
                                <p>Available tasks: ${wizard.tasks.map(t => t.name).slice(0, 3).join(', ')}${wizard.tasks.length > 3 ? '...' : ''}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            messagesDiv.innerHTML = welcomeHtml;
        }
        
        function goStep(s) {
            // In edit mode, allow jumping to any step
            // In create mode, only allow going back to previous steps
            const isEditing = wizard.editId || wizard.id;
            
            if (s >= 1 && s <= 7) {
                if (isEditing || s <= step) {
                    step = s;
                    updateStepsNew();
                }
            }
        }
        
        async function nextStep() {
            // Validate and collect data based on current step
            if(step === 1) {
                wizard.name = document.getElementById('w-name').value;
                wizard.icon = document.getElementById('w-icon').value || '🤖';
                wizard.iconType = document.getElementById('w-icon-type')?.value || 'emoji';
                wizard.iconData = document.getElementById('w-icon-data')?.value || '';
                wizard.goal = document.getElementById('w-goal').value;
                
                // Collect personality slider values (must be set by AI generation)
                const creativity = parseInt(document.getElementById('p-creativity')?.value);
                const length = parseInt(document.getElementById('p-length')?.value);
                const formality = parseInt(document.getElementById('p-formality')?.value);
                const empathy = parseInt(document.getElementById('p-empathy')?.value);
                const proactivity = parseInt(document.getElementById('p-proactivity')?.value);
                const confidence = parseInt(document.getElementById('p-confidence')?.value);
                
                // Check if personality was configured
                if (!creativity || !length || !formality || !empathy || !proactivity || !confidence) {
                    showToast('Personality is not set yet. Generate the agent configuration first.', 'warning');
                    return;
                }
                
                wizard.personality = { creativity, length, formality, empathy, proactivity, confidence };
                
                if(!wizard.name || !wizard.goal) {
                    showToast('Please fill in the name and goal first.', 'warning');
                    return;
                }
            }
            if(step === 2) collectTasksNew();
            if(step === 3) collectToolsNew();
            if(step === 4 && typeof collectWizardAccessControl === 'function') collectWizardAccessControl();
            if(step === 5) collectGuardrails();
            
            // Auto-save to database before moving to next step
            await autoSaveWizardStep();
            
            // Also save Access Control when leaving step 4
            if(step === 4 && typeof saveAgentAccessControl === 'function') {
                const agentId = testAgent?.id || wizard.editId || wizard.id;
                if(agentId) {
                    console.log('💾 Auto-saving Access Control for step 4...');
                    await saveAgentAccessControl(agentId);
                }
            }
            
            step++;
            if(step > 7) step = 7;  // 7 steps total - Test & Deploy is final
            console.log('➡️ Moving to step:', step);
            updateStepsNew();
        }
        
        // Auto-save wizard configuration to database
        async function autoSaveWizardStep() {
            // Only save if we have at least a goal (minimum to create draft)
            if (!wizard.goal) {
                console.log('⏭️ Skipping auto-save: no goal yet');
                return; // Skip if no goal
            }
            
            // Ensure we have minimum data
            const agentName = wizard.name || 'Untitled Agent';
            const agentGoal = wizard.goal;
            
            try {
                const agentData = {
                    name: agentName,
                    icon: wizard.icon || '🤖',
                    goal: agentGoal,
                    personality: wizard.personality || {tone: 'professional', voice: 'balanced', languages: ['English']},
                    personality_reason: wizard.personalityReason || '',
                    guardrails: wizard.guardrails || {},
                    tasks: wizard.tasks || [],
                    tool_ids: wizard.tool_ids || [],
                    model_id: wizard.model || 'gpt-4o',
                    model_reason: wizard.modelReason || '',
                    status: 'draft' // Always save as draft during wizard
                };
                
                console.log('📝 Auto-saving wizard step, editId:', wizard.editId, 'testAgent:', testAgent?.id);
                
                let response;
                const agentId = testAgent?.id || wizard.editId;
                const hasValidId = agentId && agentId !== 'undefined' && agentId.length > 0;
                
                if(hasValidId){
                    // Update existing agent
                    response = await fetch(API+'/api/agents/'+agentId, {
                        method: 'PUT',
                        headers: {...getAuthHeaders(), 'Content-Type': 'application/json'},
                        body: JSON.stringify(agentData)
                    });
                } else {
                    // Create new agent - MUST send auth headers for ownership
                    response = await fetch(API+'/api/agents', {
                        method: 'POST',
                        headers: {...getAuthHeaders(), 'Content-Type': 'application/json'},
                        body: JSON.stringify(agentData)
                    });
                }
                
                if(response.ok) {
                    const data = await response.json();
                    // Store agent ID for future updates
                    if(data.agent_id) {
                        wizard.editId = data.agent_id;
                        if(!testAgent) testAgent = {id: data.agent_id};
                    } else if(data.agent && data.agent.id) {
                        wizard.editId = data.agent.id;
                        if(!testAgent) testAgent = {id: data.agent.id};
                    } else if(data.agent_id === undefined && !wizard.editId) {
                        // If creating new agent, extract ID from agent object if present
                        const agentObj = data.agent || data;
                        if(agentObj && agentObj.id) {
                            wizard.editId = agentObj.id;
                            if(!testAgent) testAgent = {id: agentObj.id};
                        }
                    }
                    
                    // ✨ CRITICAL: Save owner_id when creating new agent
                    // This is returned from POST /api/agents and is essential for access control
                    if(data.owner_id && !wizard.owner_id) {
                        wizard.owner_id = data.owner_id;
                        wizard.created_by = data.created_by || data.owner_id;
                        console.log('👤 Agent owner set:', wizard.owner_id);
                    } else if(!wizard.owner_id && currentUser?.id) {
                        // Fallback: current user is the owner since they created it
                        wizard.owner_id = currentUser.id;
                        wizard.created_by = currentUser.id;
                        console.log('👤 Agent owner set from currentUser:', wizard.owner_id);
                    }
                    
                    // ✨ ALSO set wizard.id (needed for access control checks)
                    if (!wizard.id && wizard.editId) {
                        wizard.id = wizard.editId;
                        console.log('🔗 wizard.id synced from editId:', wizard.id);
                    }
                    
                    console.log('✅ Wizard step auto-saved to database, agent ID:', wizard.editId || testAgent?.id);
                } else {
                    console.warn('⚠️  Failed to auto-save wizard step:', await response.text());
                }
            } catch(e) {
                console.warn('⚠️  Auto-save error (non-blocking):', e);
                // Don't block wizard flow if save fails
            }
        }
        
        function prevStep() {
            if(step > 1) {
                step--;
                updateStepsNew();
            }
        }
        
        // Update the sticky header with current step info
        function updateWizardStickyHeader() {
            const stepNames = {
                1: 'Setup',
                2: 'Tasks',
                3: 'Tools',
                4: 'Access Control',
                5: 'Safety',
                6: 'Preview',
                7: 'Test & Deploy'
            };
            
            // 7 steps total
            const totalSteps = 7;
            const isEditing = wizard.editId || wizard.id;
            
            // Update title
            const titleEl = document.getElementById('wizard-header-title');
            if (titleEl) {
                titleEl.textContent = isEditing ? `Edit: ${wizard.name || 'Agent'}` : 'Create Agent';
            }
            
            // Update step info
            const stepEl = document.getElementById('wizard-header-step');
            if (stepEl) {
                stepEl.textContent = `Step ${step} of ${totalSteps}: ${stepNames[step] || ''}`;
            }
            
            // Update back button state
            const backBtn = document.getElementById('wizard-btn-back');
            if (backBtn) {
                backBtn.disabled = step <= 1;
            }
            
            // Update next/deploy button visibility
            // Step 7 (Test & Deploy) is the final step - show Deploy, hide Next
            const nextBtn = document.getElementById('wizard-btn-next');
            const deployBtn = document.getElementById('wizard-btn-deploy');
            if (nextBtn && deployBtn) {
                if (step >= 7) {
                    // Final step - hide Next, show Deploy
                    nextBtn.classList.add('hidden');
                    deployBtn.classList.remove('hidden');
                } else {
                    nextBtn.classList.remove('hidden');
                    deployBtn.classList.add('hidden');
                }
            }
            
            // Update progress dots
            const progressSteps = document.querySelectorAll('.wizard-progress-step');
            progressSteps.forEach((stepDiv) => {
                const dataStep = parseInt(stepDiv.dataset.step);
                const dot = stepDiv.querySelector('.wizard-step-dot');
                if (dot) {
                    dot.classList.remove('active', 'completed', 'clickable');
                    
                    // In edit mode, make all steps clickable
                    if (isEditing && dataStep !== step) {
                        dot.classList.add('clickable');
                    }
                    
                    // Handle step states
                    if (step === dataStep) {
                        dot.classList.add('active');
                    } else if (step > dataStep) {
                        dot.classList.add('completed');
                    }
                }
            });
            
            // Update progress lines
            const progressLines = document.querySelectorAll('.wizard-progress-line');
            progressLines.forEach((line, idx) => {
                line.classList.toggle('completed', idx < step - 1);
            });
        }
        
        // Cancel edit and restore agent to original state
        async function cancelEdit() {
            // Confirm with user
            const confirmMsg = wizard.originalStatus === 'published' 
                ? 'Are you sure you want to cancel? The agent will be restored to published state.'
                : 'Are you sure you want to cancel editing?';
            
            if (!(await uiConfirm(confirmMsg, { title: 'Cancel editing?', confirmText: 'Cancel editing', cancelText: 'Keep editing', danger: true }))) return;
            
            // If this was a published agent being edited, restore it to published status
            const agentId = wizard.editId || wizard.id;
            if (agentId && wizard.originalStatus === 'published') {
                try {
                    // Restore to published status using PUT
                    const response = await fetch(API + '/api/agents/' + agentId, {
                        method: 'PUT',
                        headers: {...getAuthHeaders(), 'Content-Type': 'application/json'},
                        body: JSON.stringify({ status: 'published' })
                    });
                    
                    if (response.ok) {
                        showToast('Edit cancelled - agent restored to published state', 'info');
                    } else {
                        const error = await response.json();
                        console.warn('Could not restore agent status:', error);
                        showToast('Edit cancelled but could not restore status', 'warning');
                    }
                } catch (e) {
                    console.error('Error restoring agent status:', e);
                    showToast('Edit cancelled', 'info');
                }
            } else {
                showToast('Edit cancelled', 'info');
            }
            
            // Clear wizard state
            wizard.editId = null;
            wizard.id = null;
            wizard.originalStatus = null;
            testAgent = null;
            
            // Navigate back to agents list
            navigate('agents');
            loadAgents();
        }
        
        // Go to specific step (for clickable step indicators)
        async function goToStep(targetStep) {
            // Collect data from current step before navigating
            if(step === 1) {
                wizard.name = document.getElementById('w-name')?.value || wizard.name;
                wizard.icon = document.getElementById('w-icon')?.value || wizard.icon || '🤖';
                wizard.goal = document.getElementById('w-goal')?.value || wizard.goal;
            }
            if(step === 2) collectTasksNew();
            if(step === 3) collectToolsNew();
            if(step === 4 && typeof collectWizardAccessControl === 'function') collectWizardAccessControl();
            if(step === 5) collectGuardrails();
            
            // Navigate to target step
            step = targetStep;
            updateStepsNew();
        }
        
        // Manual save button for wizard
        async function saveWizardProgress() {
            // Collect current step data
            if(step === 1) {
                wizard.name = document.getElementById('w-name')?.value || wizard.name;
                wizard.icon = document.getElementById('w-icon')?.value || wizard.icon || '🤖';
                wizard.goal = document.getElementById('w-goal')?.value || wizard.goal;
                
                // Collect personality if available
                const creativity = parseInt(document.getElementById('p-creativity')?.value);
                const length = parseInt(document.getElementById('p-length')?.value);
                const formality = parseInt(document.getElementById('p-formality')?.value);
                const empathy = parseInt(document.getElementById('p-empathy')?.value);
                const proactivity = parseInt(document.getElementById('p-proactivity')?.value);
                const confidence = parseInt(document.getElementById('p-confidence')?.value);
                if(creativity && length && formality && empathy && proactivity && confidence) {
                    wizard.personality = { creativity, length, formality, empathy, proactivity, confidence };
                }
            }
            if(step === 2) collectTasksNew();
            if(step === 3) collectToolsNew();
            if(step === 4 && typeof collectWizardAccessControl === 'function') collectWizardAccessControl();
            if(step === 5) collectGuardrails();
            
            // Save to database
            await autoSaveWizardStep();
            
            // Show confirmation
            showToast('✅ Progress saved!', 'success');
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
                this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none';
                this.container.style.cssText = 'max-height: calc(100vh - 2rem); overflow: hidden;';
                document.body.appendChild(this.container);
            },
            
            getConfig(type) {
                const configs = {
                    success: {
                        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
                        bgClass: 'bg-gradient-to-r from-emerald-500/95 to-green-600/95',
                        borderClass: 'border-emerald-400/30',
                        iconBg: 'bg-emerald-400/20',
                        title: 'Success',
                        duration: 4000
                    },
                    error: {
                        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
                        bgClass: 'bg-gradient-to-r from-red-500/95 to-rose-600/95',
                        borderClass: 'border-red-400/30',
                        iconBg: 'bg-red-400/20',
                        title: 'Error',
                        duration: 8000
                    },
                    warning: {
                        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
                        bgClass: 'bg-gradient-to-r from-amber-500/95 to-orange-600/95',
                        borderClass: 'border-amber-400/30',
                        iconBg: 'bg-amber-400/20',
                        title: 'Warning',
                        duration: 6000
                    },
                    info: {
                        icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
                        bgClass: 'bg-gradient-to-r from-blue-500/95 to-indigo-600/95',
                        borderClass: 'border-blue-400/30',
                        iconBg: 'bg-blue-400/20',
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
                
                // Clean message - remove emoji prefixes if they exist
                const cleanMessage = message.replace(/^[✅❌⚠️ℹ️✨🎉💡🔔]\s*/, '');
                
                const notification = document.createElement('div');
                notification.id = id;
                notification.className = `
                    ${config.bgClass} ${config.borderClass}
                    backdrop-blur-xl border rounded-xl shadow-2xl
                    transform translate-x-full opacity-0
                    transition-all duration-300 ease-out
                    pointer-events-auto overflow-hidden
                `;
                notification.style.cssText = 'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);';
                
                notification.innerHTML = `
                    <div class="p-4">
                        <div class="flex items-start gap-3">
                            <div class="${config.iconBg} rounded-full p-2 flex-shrink-0">
                                ${config.icon}
                            </div>
                            <div class="flex-1 min-w-0 pt-0.5">
                                <p class="text-sm font-semibold text-white/90">${config.title}</p>
                                <p class="text-sm text-white/80 mt-0.5 break-words">${this.escapeHtml(cleanMessage)}</p>
                            </div>
                            <button onclick="NotificationSystem.dismiss('${id}')" 
                                class="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors text-white/60 hover:text-white">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    ${showProgress ? `<div class="h-1 bg-white/20"><div class="notif-progress h-full bg-white/40 rounded-full" style="width: 100%; transition: width ${duration}ms linear;"></div></div>` : ''}
                `;
                
                // Add to container
                this.container.insertBefore(notification, this.container.firstChild);
                this.notifications.push({ id, element: notification, timeout: null });
                
                // Animate in
                requestAnimationFrame(() => {
                    notification.classList.remove('translate-x-full', 'opacity-0');
                    notification.classList.add('translate-x-0', 'opacity-100');
                    
                    // Start progress bar animation
                    if (showProgress) {
                        const progressBar = notification.querySelector('.notif-progress');
                        if (progressBar) {
                            requestAnimationFrame(() => {
                                progressBar.style.width = '0%';
                            });
                        }
                    }
                });
                
                // Auto dismiss
                const timeout = setTimeout(() => this.dismiss(id), duration);
                const notifRecord = this.notifications.find(n => n.id === id);
                if (notifRecord) notifRecord.timeout = timeout;
                
                // Limit visible notifications
                this.enforceLimit();
                
                return id;
            },
            
            dismiss(id) {
                const index = this.notifications.findIndex(n => n.id === id);
                if (index === -1) return;
                
                const { element, timeout } = this.notifications[index];
                if (timeout) clearTimeout(timeout);
                
                // Animate out
                element.classList.add('translate-x-full', 'opacity-0');
                element.style.marginTop = `-${element.offsetHeight + 12}px`;
                
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
            
            // ========== EASY-TO-USE HELPER METHODS ==========
            success(message, options = {}) {
                return this.show(message, 'success', options);
            },
            
            error(message, options = {}) {
                return this.show(message, 'error', options);
            },
            
            warning(message, options = {}) {
                return this.show(message, 'warning', options);
            },
            
            info(message, options = {}) {
                return this.show(message, 'info', options);
            },
            
            // Promise-based notification (shows loading, then success/error)
            async promise(promise, messages = {}) {
                const loadingMsg = messages.loading || 'Loading...';
                const successMsg = messages.success || 'Success!';
                const errorMsg = messages.error || 'Something went wrong';
                
                const id = this.show(loadingMsg, 'info', { duration: 60000, showProgress: false });
                
                try {
                    const result = await promise;
                    this.dismiss(id);
                    this.success(typeof successMsg === 'function' ? successMsg(result) : successMsg);
                    return result;
                } catch (err) {
                    this.dismiss(id);
                    this.error(typeof errorMsg === 'function' ? errorMsg(err) : (err.message || errorMsg));
                    throw err;
                }
            },
            
            // Confirmation notification with action button
            confirm(message, onConfirm, options = {}) {
                const id = 'notif-confirm-' + Date.now();
                const config = this.getConfig('warning');
                
                this.init();
                
                const notification = document.createElement('div');
                notification.id = id;
                notification.className = `
                    ${config.bgClass} ${config.borderClass}
                    backdrop-blur-xl border rounded-xl shadow-2xl
                    transform translate-x-full opacity-0
                    transition-all duration-300 ease-out
                    pointer-events-auto overflow-hidden
                `;
                notification.style.cssText = 'box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);';
                
                notification.innerHTML = `
                    <div class="p-4">
                        <div class="flex items-start gap-3">
                            <div class="${config.iconBg} rounded-full p-2 flex-shrink-0">
                                ${config.icon}
                            </div>
                            <div class="flex-1 min-w-0 pt-0.5">
                                <p class="text-sm font-semibold text-white/90">${options.title || 'Confirm'}</p>
                                <p class="text-sm text-white/80 mt-0.5">${this.escapeHtml(message)}</p>
                                <div class="flex gap-2 mt-3">
                                    <button onclick="NotificationSystem.handleConfirm('${id}', true)" 
                                        class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                                        ${options.confirmText || 'Confirm'}
                                    </button>
                                    <button onclick="NotificationSystem.handleConfirm('${id}', false)" 
                                        class="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                                        ${options.cancelText || 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Store callback
                this._confirmCallbacks = this._confirmCallbacks || {};
                this._confirmCallbacks[id] = onConfirm;
                
                this.container.insertBefore(notification, this.container.firstChild);
                this.notifications.push({ id, element: notification, timeout: null });
                
                requestAnimationFrame(() => {
                    notification.classList.remove('translate-x-full', 'opacity-0');
                    notification.classList.add('translate-x-0', 'opacity-100');
                });
                
                return id;
            },
            
            handleConfirm(id, confirmed) {
                const callback = this._confirmCallbacks?.[id];
                if (callback && confirmed) callback();
                delete this._confirmCallbacks?.[id];
                this.dismiss(id);
            }
        };
        
        // ========== GLOBAL SHORTHAND: notify ==========
        // Usage: notify.success('Saved!'), notify.error('Failed'), etc.
        const notify = {
            success: (msg, opts) => NotificationSystem.success(msg, opts),
            error: (msg, opts) => NotificationSystem.error(msg, opts),
            warning: (msg, opts) => NotificationSystem.warning(msg, opts),
            info: (msg, opts) => NotificationSystem.info(msg, opts),
            promise: (p, msgs) => NotificationSystem.promise(p, msgs),
            confirm: (msg, cb, opts) => NotificationSystem.confirm(msg, cb, opts),
            dismiss: (id) => NotificationSystem.dismiss(id),
            dismissAll: () => NotificationSystem.dismissAll()
        };
        
        // Backward compatible showToast function
        function showToast(message, type = 'info', options = {}) {
            return NotificationSystem.show(message, type, options);
        }

        // Modern dialogs are provided by `/ui/dialogs.js` (reusable component).
        // We keep small, local fallbacks so the app remains resilient if the
        // shared component fails to load for any reason.
        async function uiConfirm(message, options = {}) {
            try {
                if (typeof window !== 'undefined' && typeof window.afConfirm === 'function') {
                    return !!(await window.afConfirm(message, options));
                }
            } catch (_) { /* ignore */ }
            return !!confirm(String(message || 'Are you sure?'));
        }

        async function uiAlert(message, options = {}) {
            try {
                if (typeof window !== 'undefined' && typeof window.afAlert === 'function') {
                    await window.afAlert(message, options);
                    return true;
                }
            } catch (_) { /* ignore */ }
            alert(String(message || ''));
            return true;
        }

        async function uiPrompt(message, options = {}) {
            try {
                if (typeof window !== 'undefined' && typeof window.afPrompt === 'function') {
                    return await window.afPrompt(message, options);
                }
            } catch (_) { /* ignore */ }
            // Fallback prompt: single-line only
            const out = prompt(String(message || ''), String(options.defaultValue || ''));
            return out === null ? null : String(out);
        }
        
        // =========================================================================
        // CREATE WIZARD — TEMPLATE GALLERY (conversational + process)
        // =========================================================================

        const AF_CREATE_TEMPLATES = {
            conversational: [
                {
                    id: "invoice_intake_assistant",
                    icon: "🧾",
                    title: "Invoice Intake Assistant",
                    subtitle: "Extract invoice fields and prepare a clean summary",
                    tags: ["Invoice", "Extraction", "Finance"],
                    prompt:
                        "Act as an Invoice Intake Assistant.\n\n" +
                        "Users will upload invoices (PDF or scanned images) and ask questions.\n" +
                        "Your job:\n" +
                        "- Extract key fields: vendor, invoice number, invoice date, due date, currency, total amount, tax amount (if present), and line items (if available).\n" +
                        "- If a field is missing, say \"Not found\" and ask one clear follow-up question.\n" +
                        "- Provide a simple, business-friendly summary and a structured table of extracted fields.\n" +
                        "- Draft a short email to Accounts Payable with the extracted details.\n"
                },
                {
                    id: "claims_document_reader",
                    icon: "🩺",
                    title: "Healthcare Document Reader",
                    subtitle: "Summarize a medical document and extract key values",
                    tags: ["Healthcare", "Documents", "Extraction"],
                    prompt:
                        "Act as a Healthcare Document Reader.\n\n" +
                        "Users will upload medical documents (lab reports, discharge summaries, referrals).\n" +
                        "Your job:\n" +
                        "- Extract patient name (if present), document date, facility, key findings, and any critical values.\n" +
                        "- Provide a clear summary in plain language.\n" +
                        "- If the document contains measurements, list them in a table (test, value, unit, reference range if present).\n" +
                        "- Always add a final section: \"Questions to confirm\" with any missing items.\n"
                },
                {
                    id: "supply_chain_doc_extractor",
                    icon: "📦",
                    title: "Shipment Document Extractor",
                    subtitle: "Extract shipment details from packing lists / BOLs",
                    tags: ["Supply Chain", "Extraction", "Logistics"],
                    prompt:
                        "Act as a Shipment Document Extractor.\n\n" +
                        "Users will upload a packing list, bill of lading, or delivery note (PDF or scanned image).\n" +
                        "Your job:\n" +
                        "- Extract shipment ID, PO number (if present), supplier, destination, ship date, expected delivery date, and item list.\n" +
                        "- Provide a clean summary and a table of items (SKU/description, quantity, unit).\n" +
                        "- If anything is missing, ask concise follow-up questions.\n"
                },
                {
                    id: "contract_clause_finder",
                    icon: "📄",
                    title: "Contract Clause Finder",
                    subtitle: "Find key clauses and explain them clearly",
                    tags: ["Legal", "Contracts", "Extraction"],
                    prompt:
                        "Act as a Contract Clause Finder.\n\n" +
                        "Users will upload a contract and ask for specific clauses.\n" +
                        "Your job:\n" +
                        "- Extract and quote the exact text for: payment terms, renewal/termination, confidentiality, liability, and governing law (if present).\n" +
                        "- Explain each clause in simple business language.\n" +
                        "- List any risky or unusual terms the user should review.\n"
                },
                {
                    id: "receipt_organizer",
                    icon: "🧾",
                    title: "Receipt Organizer",
                    subtitle: "Turn receipts into a clean expense summary",
                    tags: ["Extraction", "Finance", "Receipts"],
                    prompt:
                        "Act as a Receipt Organizer.\n\n" +
                        "Users will upload one or more receipts (images or PDFs).\n" +
                        "Your job:\n" +
                        "- For each receipt, extract vendor, date, currency, and amount.\n" +
                        "- Categorize each receipt into a practical expense category.\n" +
                        "- Provide a total amount and a clean table of all receipts.\n" +
                        "- Ask follow-up questions only when necessary.\n"
                },
                {
                    id: "compliance_policy_qa",
                    icon: "🛡️",
                    title: "Policy Q&A Assistant",
                    subtitle: "Answer policy questions from uploaded documents",
                    tags: ["Compliance", "Knowledge", "Documents"],
                    prompt:
                        "Act as a Policy Q&A Assistant.\n\n" +
                        "Users will upload policy documents and ask questions.\n" +
                        "Your job:\n" +
                        "- Answer using only what is stated in the uploaded document.\n" +
                        "- Quote the relevant section (short excerpt) to support your answer.\n" +
                        "- If the document does not contain the answer, say so and suggest what to check next.\n"
                },
                {
                    id: "it_ticket_triage_extractor",
                    icon: "🧰",
                    title: "IT Ticket Triage Assistant",
                    subtitle: "Extract key info from screenshots and messages",
                    tags: ["IT", "Extraction", "Triage"],
                    prompt:
                        "Act as an IT Ticket Triage Assistant.\n\n" +
                        "Users will describe an issue and may upload screenshots or error messages (images or PDFs).\n" +
                        "Your job:\n" +
                        "- Extract: impacted system, user impact, error message (exact), time observed, and urgency.\n" +
                        "- Ask only the minimum follow-up questions needed to proceed.\n" +
                        "- Produce a clean ticket summary and a short recommended next step.\n"
                },
                {
                    id: "customs_docs_helper",
                    icon: "🛃",
                    title: "Customs Documents Helper",
                    subtitle: "Extract shipment and HS details from paperwork",
                    tags: ["Customs", "Supply Chain", "Extraction"],
                    prompt:
                        "Act as a Customs Documents Helper.\n\n" +
                        "Users will upload shipping paperwork (commercial invoice, packing list, certificate of origin).\n" +
                        "Your job:\n" +
                        "- Extract: exporter, importer, origin country, destination, item list, quantities, and declared values.\n" +
                        "- If an HS code is present, extract it; if not, ask what product category it belongs to.\n" +
                        "- Provide a clear checklist of missing items required for customs clearance.\n"
                },
                {
                    id: "equipment_manual_qna",
                    icon: "📘",
                    title: "Equipment Manual Q&A",
                    subtitle: "Answer questions from a manual and extract procedures",
                    tags: ["Operations", "Documents", "Knowledge"],
                    prompt:
                        "Act as an Equipment Manual Q&A Assistant.\n\n" +
                        "Users will upload an equipment manual and ask how to perform a procedure.\n" +
                        "Your job:\n" +
                        "- Provide step-by-step instructions using only what’s written in the manual.\n" +
                        "- Quote a short relevant excerpt.\n" +
                        "- List safety warnings and required tools/materials if mentioned.\n"
                },
                {
                    id: "bank_statement_extractor",
                    icon: "🏦",
                    title: "Bank Statement Extractor",
                    subtitle: "Extract transactions into a clean table",
                    tags: ["Finance", "Extraction", "Reconciliation"],
                    prompt:
                        "Act as a Bank Statement Extractor.\n\n" +
                        "Users will upload a bank statement (PDF or scanned image).\n" +
                        "Your job:\n" +
                        "- Extract transactions into a table: date, description, debit, credit, balance (if present).\n" +
                        "- Summarize totals for debits and credits.\n" +
                        "- If some pages are unreadable, state what is missing.\n"
                }
            ],
            process: [
                {
                    id: "expense_approval_aed",
                    icon: "💳",
                    title: "Expense Approval (Receipts + Auto-approve)",
                    subtitle: "Extract from receipts and route by total threshold",
                    tags: ["Finance", "Approvals", "Extraction"],
                    prompt:
                        "Generate an Expense Approval process, process start with use input of Expense Report Name + Upload Receipts (images, multiple files), then Extract from each receipt/invoice expense type, date, vendor, amount (detect currency) after that Calculate total Amount across all receipts. if total Amount < 500 AED the process auto-approve and email employee a friendly summary with all extracted expenses otherwise send to employee’s manager for approval and notify the manager about the pending task (parallel). Once manager approved the task email employee a friendly confirmation with the expense details."
                },
                {
                    id: "invoice_processing_3way_match",
                    icon: "🧾",
                    title: "Invoice Processing (3‑way check)",
                    subtitle: "Extract invoice fields and route exceptions for approval",
                    tags: ["Invoice", "Approvals", "Extraction"],
                    prompt:
                        "Generate an Invoice Processing workflow. Start with Accounts Payable entering invoice reference and uploading the invoice file (PDF or scanned image). Extract vendor, invoice number, invoice date, due date, currency, total, tax, and line items. Ask for a Purchase Order number if not found. If total amount is under 10,000, route to auto-approve and email AP a summary. If 10,000 or more, route to Finance Manager for approval and notify them about the pending approval (use the approval step’s built-in notification). After approval, email AP with the extracted invoice details and the decision."
                },
                {
                    id: "supplier_delivery_delay",
                    icon: "🚚",
                    title: "Supplier Delivery Delay Management",
                    subtitle: "Capture a delay and escalate by severity and time",
                    tags: ["Supply Chain", "SLA", "Escalation"],
                    prompt:
                        "Generate a Supplier Delivery Delay workflow. Start with a user submitting a delay report: supplier name, PO number, expected delivery date, new estimated date, and reason. Classify severity (low/medium/high) based on delay length and criticality. Notify the requester immediately with a summary. If severity is high, route to Supply Chain Manager for approval/decision and enable escalation after 8 hours to Department Head. If severity is low, send a notification to the supply chain team and finish."
                },
                {
                    id: "quality_nonconformance_report",
                    icon: "✅",
                    title: "Quality Non‑Conformance Report",
                    subtitle: "Record an issue and route corrective action approvals",
                    tags: ["Quality", "Compliance", "Approvals"],
                    prompt:
                        "Generate a Quality Non‑Conformance workflow. Start with a user submitting an issue: product, batch/lot number, issue description, photos/documents (multiple files), and severity. Extract key details from uploaded documents if present. If severity is high, route to Quality Manager for approval and notify them immediately. In parallel, notify the production team. After approval, send a confirmation to the requester and log the final decision in a summary message."
                },
                {
                    id: "healthcare_prior_auth",
                    icon: "🏥",
                    title: "Healthcare Prior Authorization",
                    subtitle: "Collect request info, extract from referral, route approval",
                    tags: ["Healthcare", "Documents", "Approvals"],
                    prompt:
                        "Generate a Prior Authorization workflow. Start with a user submitting patient name, policy/member ID, requested service, and uploading supporting documents (referral / medical report). Extract key details from the documents. If required information is missing, route to Collect Information to request it. Then route to Medical Director for approval and notify them about the pending approval using the approval step notification. After decision, notify the requester with a friendly summary including key extracted details."
                },
                {
                    id: "maintenance_work_order",
                    icon: "🛠️",
                    title: "Maintenance Work Order",
                    subtitle: "Request, classify urgency, approve, and notify",
                    tags: ["Operations", "SLA", "Approvals"],
                    prompt:
                        "Generate a Maintenance Work Order process. Start with a user submitting asset/location, problem description, preferred time window, and photos (optional). Classify urgency (low/medium/high). If high, route to Facilities Manager for approval and enable escalation after 4 hours to Department Head. If medium/low, notify the facilities team and send the requester a confirmation with the ticket summary."
                },
                {
                    id: "vendor_onboarding_compliance",
                    icon: "🤝",
                    title: "Vendor Onboarding (Compliance Check)",
                    subtitle: "Collect documents and route compliance approval",
                    tags: ["Compliance", "Supply Chain", "Documents"],
                    prompt:
                        "Generate a Vendor Onboarding workflow. Start with a user entering vendor name, contact email, and uploading required documents (registration certificate, tax documents, bank details). Extract the key details from the documents. If anything is missing, request it. Route to Compliance for approval and notify them. After approval, notify Procurement with the vendor summary and notify the requester that onboarding is complete."
                },
                {
                    id: "inventory_replenishment_approval",
                    icon: "📊",
                    title: "Inventory Replenishment Approval",
                    subtitle: "Request replenishment and route approvals by value",
                    tags: ["Supply Chain", "Approvals", "Operations"],
                    prompt:
                        "Generate an Inventory Replenishment workflow. Start with a user requesting replenishment: item name/SKU, quantity, target warehouse, and justification. Calculate the total estimated value (user provides unit price or total). If total value is under 50,000, auto-approve and notify the requester and warehouse team. If 50,000 or more, route to Supply Chain Manager for approval and enable escalation after 12 hours to Department Head. After decision, notify the requester with a friendly summary."
                },
                {
                    id: "it_incident_change_approval",
                    icon: "🚨",
                    title: "IT Incident + Emergency Change Approval",
                    subtitle: "Capture incident, notify stakeholders, approve emergency fix",
                    tags: ["IT", "Parallel", "Approvals"],
                    prompt:
                        "Generate an IT Incident workflow. Start with a user reporting an incident: impacted service, incident summary, screenshots/logs (optional upload), and severity (low/medium/high). If severity is high, run in parallel: (1) notify the on-call team, (2) notify the department head, and (3) request approval from the IT Manager for an emergency fix (use approval built-in notification). After approval or rejection, notify the requester with the outcome and a short summary."
                },
                {
                    id: "insurance_claim_intake_review",
                    icon: "🧾",
                    title: "Insurance Claim Intake & Review",
                    subtitle: "Collect claim details, extract from documents, route review",
                    tags: ["Insurance", "Documents", "Approvals"],
                    prompt:
                        "Generate an Insurance Claim Intake workflow. Start with a user entering claim type, policy number, claimant contact, incident date, and uploading supporting documents (photos, reports, invoices). Extract key details from the documents (amounts, vendor, dates). If claim total is under 20,000, route to auto-approve and notify the requester. If 20,000 or more, route to Claims Manager for approval and enable escalation after 24 hours to Department Head. After decision, send a friendly summary with extracted details."
                },
                {
                    id: "customs_clearance_review",
                    icon: "🛃",
                    title: "Customs Clearance Review",
                    subtitle: "Extract shipment details and route compliance approval",
                    tags: ["Customs", "Supply Chain", "Compliance"],
                    prompt:
                        "Generate a Customs Clearance workflow. Start with a user uploading shipment documents (commercial invoice, packing list, certificate of origin) and entering shipment reference. Extract exporter/importer, origin, destination, item list, and declared values. If required information is missing, request it via Collect Information. Route to Compliance for approval and notify them. After approval, notify the requester and logistics team with a clear shipment summary."
                }
            ]
        };

        let _createTemplateTab = 'conversational';
        let _createTemplateQuery = '';
        const _createTplEsc = (input) => {
            const s = String(input ?? '');
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        function _findCreateTemplateById(id) {
            const all = [...(AF_CREATE_TEMPLATES.conversational || []), ...(AF_CREATE_TEMPLATES.process || [])];
            return all.find(t => t && t.id === id) || null;
        }

        function _setCreatePromptText(kind, text) {
            const el = document.getElementById(kind === 'process' ? 'w-process-goal' : 'w-initial-goal');
            if (!el) return false;
            el.value = String(text || '');
            try {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const prev = el.style.boxShadow;
                el.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)';
                setTimeout(() => { el.style.boxShadow = prev; }, 900);
            } catch (_) { /* ignore */ }
            return true;
        }

        function applyCreateTemplate(templateId) {
            const tpl = _findCreateTemplateById(templateId);
            if (!tpl) return;
            const kind = (tpl && (AF_CREATE_TEMPLATES.process || []).some(p => p.id === tpl.id)) ? 'process' : 'conversational';
            _setCreatePromptText(kind, tpl.prompt);
            try { showToast('Template loaded. You can edit it, then press “Generate with AI”.', 'success'); } catch (_) {}
        }
        window.applyCreateTemplate = applyCreateTemplate;

        function _renderTemplateChips() {
            const convWrap = document.getElementById('conv-template-chips');
            const procWrap = document.getElementById('proc-template-chips');
            if (convWrap) {
                const picks = (AF_CREATE_TEMPLATES.conversational || []).slice(0, 6);
                convWrap.innerHTML = picks.map(t =>
                    `<button onclick="applyCreateTemplate('${t.id}')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition">${t.icon} ${t.title}</button>`
                ).join('');
            }
            if (procWrap) {
                const picks = (AF_CREATE_TEMPLATES.process || []).slice(0, 6);
                procWrap.innerHTML = picks.map(t =>
                    `<button onclick="applyCreateTemplate('${t.id}')" class="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition">${t.icon} ${t.title}</button>`
                ).join('');
            }
        }

        function openCreateTemplateGallery(kind = null) {
            const modal = document.getElementById('create-template-modal');
            if (!modal) return;
            _createTemplateTab = (kind === 'process' || kind === 'conversational') ? kind : (selectedAgentType === 'process' ? 'process' : 'conversational');
            _createTemplateQuery = '';
            const search = document.getElementById('create-template-search');
            if (search) search.value = '';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            switchCreateTemplateTab(_createTemplateTab);
            _renderCreateTemplateGallery();
        }
        window.openCreateTemplateGallery = openCreateTemplateGallery;

        function closeCreateTemplateGallery() {
            const modal = document.getElementById('create-template-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        window.closeCreateTemplateGallery = closeCreateTemplateGallery;

        function switchCreateTemplateTab(tab) {
            _createTemplateTab = (tab === 'process') ? 'process' : 'conversational';
            const convBtn = document.getElementById('create-template-tab-conv');
            const procBtn = document.getElementById('create-template-tab-proc');
            const setBtn = (btn, active) => {
                if (!btn) return;
                btn.classList.toggle('bg-gray-700', !!active);
                btn.classList.toggle('bg-gray-800', !active);
                btn.classList.toggle('text-white', !!active);
            };
            setBtn(convBtn, _createTemplateTab === 'conversational');
            setBtn(procBtn, _createTemplateTab === 'process');
            _renderCreateTemplateGallery();
        }
        window.switchCreateTemplateTab = switchCreateTemplateTab;

        function filterCreateTemplateGallery(q) {
            _createTemplateQuery = String(q || '');
            _renderCreateTemplateGallery();
        }
        window.filterCreateTemplateGallery = filterCreateTemplateGallery;

        function _renderCreateTemplateGallery() {
            const grid = document.getElementById('create-template-grid');
            const empty = document.getElementById('create-template-empty');
            const titleEl = document.getElementById('create-template-modal-title');
            if (!grid) return;
            const list = (_createTemplateTab === 'process' ? AF_CREATE_TEMPLATES.process : AF_CREATE_TEMPLATES.conversational) || [];
            const q = _createTemplateQuery.trim().toLowerCase();
            const filtered = list.filter(t => {
                if (!q) return true;
                const hay = `${t.title} ${t.subtitle} ${(t.tags || []).join(' ')} ${t.prompt}`.toLowerCase();
                return hay.includes(q);
            });
            if (titleEl) titleEl.textContent = _createTemplateTab === 'process' ? 'Process Templates' : 'Conversational Templates';
            if (empty) empty.classList.toggle('hidden', filtered.length > 0);
            grid.innerHTML = filtered.map(t => {
                const tagHtml = (t.tags || []).slice(0, 4).map(x =>
                    `<span class="text-[11px] px-2 py-0.5 rounded-full" style="background:var(--bg-input);color:var(--text-secondary);border:1px solid color-mix(in srgb, var(--border-color) 70%, transparent);">${_createTplEsc(String(x))}</span>`
                ).join(' ');
                const snippet = String(t.prompt || '').trim().replace(/\s+/g, ' ');
                const short = snippet.length > 160 ? (snippet.slice(0, 160) + '…') : snippet;
                return `
                    <div class="card p-4 rounded-xl transition-transform" style="cursor:default;">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex items-start gap-3 min-w-0">
                                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style="background:var(--bg-input);border:1px solid color-mix(in srgb, var(--border-color) 65%, transparent);">${t.icon || '✨'}</div>
                                <div class="min-w-0">
                                    <div class="font-semibold leading-tight" style="color:var(--text-primary);">${_createTplEsc(t.title || 'Template')}</div>
                                    <div class="text-xs mt-0.5" style="color:var(--text-secondary);">${_createTplEsc(t.subtitle || '')}</div>
                                </div>
                            </div>
                            <button onclick="applyCreateTemplate('${t.id}'); closeCreateTemplateGallery()" class="btn-primary px-3 py-2 rounded-lg text-sm font-medium transition flex-shrink-0">Use</button>
                        </div>
                        <div class="mt-3 flex flex-wrap gap-1.5">${tagHtml}</div>
                        <div class="mt-3 text-xs leading-relaxed" style="color:var(--text-secondary);">${_createTplEsc(short)}</div>
                    </div>
                `;
            }).join('');
        }

        // Backward-compatible wrappers for older buttons (kept intentionally).
        function useAgentTemplate(templateId) {
            applyCreateTemplate(String(templateId || '').trim());
        }
        function useProcessTemplate(templateId) {
            applyCreateTemplate(String(templateId || '').trim());
        }
        window.useAgentTemplate = useAgentTemplate;
        window.useProcessTemplate = useProcessTemplate;
        
        // =========================================================================
        // AGENT TYPE SELECTION (Conversational vs Workflow)
        // =========================================================================
        
        let selectedAgentType = 'conversational'; // Default
        
        function selectAgentType(type) {
            console.log('🎯 [CREATE] selectAgentType() called with type:', type);
            selectedAgentType = type === 'process' ? 'process' : 'conversational';
            
            // Update card styles
            const convCard = document.getElementById('type-card-conversational');
            const procCard = document.getElementById('type-card-process');
            
            if (selectedAgentType === 'conversational') {
                convCard?.classList.add('border-purple-500');
                convCard?.classList.remove('border-transparent');
                procCard?.classList.remove('border-green-500');
                procCard?.classList.add('border-transparent');
                // Update selection text
                if (convCard) convCard.querySelector('.text-sm:last-child').textContent = '✓ Selected';
                if (procCard) procCard.querySelector('.text-sm:last-child').textContent = 'Click to select';
                if (convCard) convCard.querySelector('.text-sm:last-child').className = 'text-sm text-purple-400 font-medium';
                if (procCard) procCard.querySelector('.text-sm:last-child').className = 'text-sm text-gray-500';
            } else {
                procCard?.classList.add('border-green-500');
                procCard?.classList.remove('border-transparent');
                convCard?.classList.remove('border-purple-500');
                convCard?.classList.add('border-transparent');
                // Update selection text
                if (procCard) procCard.querySelector('.text-sm:last-child').textContent = '✓ Selected';
                if (convCard) convCard.querySelector('.text-sm:last-child').textContent = 'Click to select';
                if (procCard) procCard.querySelector('.text-sm:last-child').className = 'text-sm text-green-400 font-medium';
                if (convCard) convCard.querySelector('.text-sm:last-child').className = 'text-sm text-gray-500';
            }
            
            // Toggle method copy blocks
            document.getElementById('build-manual-copy-conv')?.classList.toggle('hidden', selectedAgentType !== 'conversational');
            document.getElementById('build-manual-copy-proc')?.classList.toggle('hidden', selectedAgentType !== 'process');
            document.getElementById('build-ai-copy-conv')?.classList.toggle('hidden', selectedAgentType !== 'conversational');
            document.getElementById('build-ai-copy-proc')?.classList.toggle('hidden', selectedAgentType !== 'process');
            
            // Toggle AI prompt blocks
            document.getElementById('create-ai-conversational')?.classList.toggle('hidden', selectedAgentType !== 'conversational');
            document.getElementById('create-ai-process')?.classList.toggle('hidden', selectedAgentType !== 'process');
        }
        
        // =========================================================================
        // UNIFIED CREATE FLOW (Step 0 only)
        // =========================================================================
        
        function createFlowReset() {
            _createFlowStep = 'type';
            _createBuildMode = null;
            selectBuildMode(null);
            createFlowGo('type');
        }
        
        function createFlowGo(stepName) {
            _createFlowStep = stepName;
            
            const stepType = document.getElementById('create-flow-step-type');
            const stepMethod = document.getElementById('create-flow-step-method');
            const stepAI = document.getElementById('create-flow-step-ai');
            
            stepType?.classList.toggle('hidden', stepName !== 'type');
            stepMethod?.classList.toggle('hidden', stepName !== 'method');
            stepAI?.classList.toggle('hidden', stepName !== 'ai');
            
            // Stepper visuals
            const dots = {
                type: document.querySelector('.create-flow-step[data-step="type"] .create-flow-dot'),
                method: document.querySelector('.create-flow-step[data-step="method"] .create-flow-dot'),
                ai: document.querySelector('.create-flow-step[data-step="ai"] .create-flow-dot')
            };
            const dividers = Array.from(document.querySelectorAll('.create-flow-divider'));
            
            const setDot = (dot, state) => {
                if (!dot) return;
                dot.classList.remove('active', 'completed');
                if (state === 'active') dot.classList.add('active');
                if (state === 'completed') dot.classList.add('completed');
            };
            
            if (stepName === 'type') {
                setDot(dots.type, 'active');
                setDot(dots.method, null);
                setDot(dots.ai, null);
                dividers.forEach(d => d.classList.remove('completed'));
            } else if (stepName === 'method') {
                setDot(dots.type, 'completed');
                setDot(dots.method, 'active');
                setDot(dots.ai, null);
                dividers[0]?.classList.add('completed');
                dividers[1]?.classList.remove('completed');
            } else {
                setDot(dots.type, 'completed');
                setDot(dots.method, 'completed');
                setDot(dots.ai, 'active');
                dividers.forEach(d => d.classList.add('completed'));
            }
            
            // Ensure the correct AI prompt is visible for current agent type
            try { selectAgentType(selectedAgentType); } catch (_) {}
            // Ensure template chips are rendered (safe no-op if not present)
            try { _renderTemplateChips(); } catch (_) { /* ignore */ }
        }
        
        function selectBuildMode(mode) {
            _createBuildMode = mode;
            
            const manualCard = document.getElementById('build-card-manual');
            const aiCard = document.getElementById('build-card-ai');
            const manualSel = document.getElementById('build-manual-selected');
            const aiSel = document.getElementById('build-ai-selected');
            const continueBtn = document.getElementById('create-flow-continue-btn');
            
            // Reset visuals
            manualCard?.classList.remove('border-blue-500');
            aiCard?.classList.remove('border-purple-500');
            manualCard?.classList.add('border-transparent');
            aiCard?.classList.add('border-transparent');
            
            if (mode === 'manual') {
                manualCard?.classList.add('border-blue-500');
                manualCard?.classList.remove('border-transparent');
                if (manualSel) { manualSel.textContent = '✓ Selected'; manualSel.className = 'text-sm text-blue-400 font-medium'; }
                if (aiSel) { aiSel.textContent = 'Click to select'; aiSel.className = 'text-sm text-gray-500'; }
                if (continueBtn) continueBtn.textContent = 'Start Setup';
            } else if (mode === 'ai') {
                aiCard?.classList.add('border-purple-500');
                aiCard?.classList.remove('border-transparent');
                if (aiSel) { aiSel.textContent = '✓ Selected'; aiSel.className = 'text-sm text-purple-400 font-medium'; }
                if (manualSel) { manualSel.textContent = 'Click to select'; manualSel.className = 'text-sm text-gray-500'; }
                if (continueBtn) continueBtn.textContent = 'Continue';
            } else {
                if (manualSel) { manualSel.textContent = 'Click to select'; manualSel.className = 'text-sm text-gray-500'; }
                if (aiSel) { aiSel.textContent = 'Click to select'; aiSel.className = 'text-sm text-gray-500'; }
                if (continueBtn) continueBtn.textContent = 'Continue';
            }
        }
        
        function createFlowContinue() {
            if (!_createBuildMode) {
                showToast('Please choose how you want to set it up.', 'warning');
                return;
            }
            
            if (_createBuildMode === 'manual') {
                if (selectedAgentType === 'process') {
                    openVisualBuilder();
                    closeCreateWizardModal(true);
                    return;
                }
                startManualConversationalWizard();
                return;
            }
            
            createFlowGo('ai');
        }
        
        function createFlowGenerate() {
            if (selectedAgentType === 'process') {
                return generateProcessConfig();
            }
            return generateAgentConfig();
        }
        
        function startManualConversationalWizard() {
            try {
                wizard.creationMode = 'manual';
                wizard.agentType = 'conversational';
            } catch (_) { /* ignore */ }
            step = 1;
            updateStepsNew();
            updateWizardCreationModeCopy();
        }
        
        function updateWizardCreationModeCopy() {
            const isAI = wizard?.creationMode === 'ai';
            
            const subtitle = document.getElementById('wizard-step1-subtitle');
            if (subtitle) subtitle.textContent = isAI ? 'AI-generated settings — review and adjust as needed' : 'Set up your agent — you can update anytime';
            
            const nameHint = document.getElementById('w-name-hint');
            if (nameHint) nameHint.textContent = isAI ? 'Generated by AI based on your description — edit if needed.' : 'Choose a clear name your users will recognize.';
            
            const goalHint = document.getElementById('goal-hint');
            if (goalHint) goalHint.textContent = isAI ? 'AI-generated goal — make it as specific as possible.' : 'Describe the outcome in clear business terms.';
            
            const badge = document.getElementById('goal-ai-badge');
            if (badge) badge.textContent = isAI ? 'AI Generated' : 'Manual';
        }

        // Expose unified-create flow functions for inline onclick handlers
        // (Some deployments load scripts in ways that don't automatically bind functions to window.)
        try {
            window.createFlowGo = createFlowGo;
            window.createFlowContinue = createFlowContinue;
            window.createFlowGenerate = createFlowGenerate;
            window.selectBuildMode = selectBuildMode;
            window.closeCreateWizardModal = closeCreateWizardModal;
            window.createFlowReset = createFlowReset;
            // Helpers for the generating animation (used across modules)
            window._setGeneratingLabels = _setGeneratingLabels;
        } catch (_) { /* ignore */ }
        
        // Generate Process/Workflow Configuration using AI
        function _resetGeneratingSteps() {
            const steps = ['gen-step-1', 'gen-step-2', 'gen-step-3', 'gen-step-4', 'gen-step-5'];
            steps.forEach((id, idx) => {
                const el = document.getElementById(id);
                if (!el) return;
                const icon = el.querySelector('span');
                if (!icon) return;
                if (idx === 0) {
                    el.classList.remove('text-gray-500');
                    icon.className = 'w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center animate-pulse';
                    icon.textContent = '✓';
                } else {
                    el.classList.add('text-gray-500');
                    icon.className = 'w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center';
                    icon.textContent = '○';
                }
            });
        }

        function _setGeneratingLabels(mode) {
            const titleEl = document.getElementById('generating-title');
            const labels = {
                conversational: {
                    title: 'Configuring Your Agent...',
                    status0: 'Analyzing your goal...',
                    steps: [
                        'Understanding your requirements',
                        'Selecting optimal AI model',
                        'Defining tasks & capabilities',
                        'Recommending tools',
                        'Setting up guardrails',
                    ],
                    statuses: [
                        'Understanding your requirements...',
                        'Selecting optimal AI model...',
                        'Defining tasks & capabilities...',
                        'Recommending tools...',
                        'Setting up guardrails...',
                    ]
                },
                process: {
                    title: 'Building Your Workflow...',
                    status0: 'Designing your workflow...',
                    steps: [
                        'Understanding your workflow goal',
                        'Designing the steps',
                        'Preparing forms & data fields',
                        'Setting approvals & messages',
                        'Finalizing the layout',
                    ],
                    statuses: [
                        'Understanding your workflow goal...',
                        'Designing the steps...',
                        'Preparing forms & data fields...',
                        'Setting approvals & messages...',
                        'Finalizing the layout...',
                    ]
                }
            };
            const cfg = labels[mode] || labels.conversational;
            if (titleEl) titleEl.textContent = cfg.title;
            for (let i = 1; i <= 5; i++) {
                const lab = document.getElementById('gen-label-' + i);
                if (lab) lab.textContent = cfg.steps[i - 1] || lab.textContent;
            }
            const statusEl = document.getElementById('generating-status');
            if (statusEl && cfg.status0) statusEl.textContent = cfg.status0;
            return cfg;
        }

        function _startGeneratingAnimation(mode) {
            const cfg = _setGeneratingLabels(mode);
            _resetGeneratingSteps();
            const statusEl = document.getElementById('generating-status');
            let idx = 0;
            let stopped = false;

            // advance steps every 700ms but don't block API call
            const tick = () => {
                if (stopped) return;
                try {
                    if (statusEl) statusEl.textContent = cfg.statuses[idx] || cfg.status0;
                    // mark previous as done
                    if (idx > 0) {
                        const prev = document.getElementById('gen-step-' + idx);
                        if (prev) {
                            const icon = prev.querySelector('span');
                            if (icon) {
                                icon.className = 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center';
                                icon.textContent = '✓';
                            }
                            prev.classList.remove('text-gray-500');
                        }
                    }
                    // activate current
                    const cur = document.getElementById('gen-step-' + (idx + 1));
                    if (cur) {
                        const icon = cur.querySelector('span');
                        if (icon) {
                            icon.className = 'w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center animate-pulse';
                            icon.textContent = '✓';
                        }
                        cur.classList.remove('text-gray-500');
                    }
                } catch (_) { /* ignore */ }
                idx = (idx + 1) % 5;
            };

            const intervalId = setInterval(tick, 700);
            tick();

            return {
                complete: () => {
                    stopped = true;
                    clearInterval(intervalId);
                    try {
                        // mark all as done
                        for (let i = 1; i <= 5; i++) {
                            const el = document.getElementById('gen-step-' + i);
                            if (!el) continue;
                            const icon = el.querySelector('span');
                            if (icon) {
                                icon.className = 'w-5 h-5 rounded-full bg-green-500 flex items-center justify-center';
                                icon.textContent = '✓';
                            }
                            el.classList.remove('text-gray-500');
                        }
                    } catch (_) { /* ignore */ }
                },
                stop: () => {
                    stopped = true;
                    clearInterval(intervalId);
                }
            };
        }

        async function generateProcessConfig() {
            const goal = document.getElementById('w-process-goal')?.value.trim();
            if(!goal) {
                showToast('Please describe what your workflow should do.', 'warning');
                return;
            }
            
            wizard.originalGoal = goal;
            wizard.agentType = 'process';
            
            // Show generating animation
            document.getElementById('wizard-step-0').classList.add('hidden');
            document.getElementById('wizard-generating').classList.remove('hidden');
            const anim = _startGeneratingAnimation('process');
            
            try {
                // Provide available tools context to the wizard (sanitized: no secrets)
                let toolsForContext = [];
                try {
                    const toolsRes = await fetch('/api/tools', {
                        headers: { 'Authorization': 'Bearer ' + (authToken || localStorage.getItem('agentforge_token')) }
                    });
                    const toolsJson = await toolsRes.json();
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

                const response = await fetch('/process/wizard/generate', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (authToken || localStorage.getItem('agentforge_token'))
                    },
                    body: JSON.stringify({
                        goal: goal,
                        output_format: 'visual_builder',
                        context: {
                            tools: toolsForContext
                        }
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.workflow) {
                    // Store the workflow definition
                    wizard.processDefinition = data.workflow;
                    
                    // Store draft for builder fallback (if postMessage is blocked or tab was closed)
                    try {
                        sessionStorage.setItem('agentforge_process_builder_draft', JSON.stringify(data.workflow));
                        sessionStorage.setItem('agentforge_process_builder_draft_meta', JSON.stringify({
                            goal: goal,
                            name: data.workflow.name || 'My Workflow',
                            animate: true
                        }));
                    } catch (_) { /* ignore */ }

                    try { anim.complete(); } catch (_) {}
                    document.getElementById('generating-status').textContent = 'Opening your workflow builder...';
                    // Open builder in the SAME tab (better UX)
                    setTimeout(() => {
                        window.location.href = '/ui/process-builder.html?draft=1';
                    }, 250);
                } else {
                    showToast(data.detail || 'Could not create the workflow. Please try again.', 'error');
                    document.getElementById('wizard-generating').classList.add('hidden');
                    document.getElementById('wizard-step-0').classList.remove('hidden');
                    try { anim.stop(); } catch (_) {}
                }
            } catch(e) {
                console.error('Process generation error:', e);
                showToast('Could not connect to the server. Please try again.', 'error');
                document.getElementById('wizard-generating').classList.add('hidden');
                document.getElementById('wizard-step-0').classList.remove('hidden');
                try { anim.stop(); } catch (_) {}
            }
        }
        
        // Show Process Editor (using modal instead of replacing content)
        function showProcessEditor(workflow) {
            // Hide the generating state and show step 0
            document.getElementById('wizard-generating')?.classList.add('hidden');
            document.getElementById('wizard-step-0')?.classList.remove('hidden');
            
            // Create or get the process editor modal
            let modal = document.getElementById('process-editor-preview-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'process-editor-preview-modal';
                modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4';
                document.body.appendChild(modal);
            }
            
            const nodesHtml = (workflow.nodes || []).map((node, i) => `
                <div class="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div class="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">${i+1}</div>
                    <div>
                        <div class="font-medium">${node.name || node.type}</div>
                        <div class="text-xs text-gray-400">${node.type}</div>
                    </div>
                </div>
            `).join('');
            
            modal.innerHTML = `
                <div class="absolute inset-0 bg-black/70" onclick="closeProcessEditorPreview()"></div>
                <div class="relative bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <button onclick="closeProcessEditorPreview()" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                    
                    <div class="p-8">
                        <div class="text-center mb-8">
                            <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center mb-4 text-4xl">
                                ✅
                            </div>
                            <h2 class="text-2xl font-bold mb-2">Your Workflow is Ready!</h2>
                            <p class="text-gray-400">${workflow.name || 'Workflow'} has been created with ${workflow.nodes?.length || 0} steps</p>
                        </div>
                        
                        <div class="card rounded-xl p-6 mb-6 bg-gray-800/50">
                            <h3 class="font-semibold mb-4">Workflow Steps:</h3>
                            <div class="space-y-3">
                                ${nodesHtml || '<p class="text-gray-500">No steps defined</p>'}
                            </div>
                        </div>
                        
                        <div class="card rounded-xl p-6 mb-6 bg-gray-800/50">
                            <label class="text-sm text-gray-400 mb-2 block">Workflow Name</label>
                            <input type="text" id="process-name" class="input-field w-full rounded-lg px-4 py-3 bg-gray-700 border border-gray-600" value="${workflow.name || 'My Workflow'}">
                        </div>
                        
                        <div class="flex gap-4">
                            <button onclick="closeProcessEditorPreview(); openVisualEditor();" class="flex-1 px-6 py-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition">
                                ✏️ Edit Visually
                            </button>
                            <button onclick="saveProcess()" class="flex-1 px-6 py-3 rounded-lg text-white font-medium" style="background: linear-gradient(135deg, #22c55e 0%, #14b8a6 100%);">
                                💾 Save & Activate
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            modal.classList.remove('hidden');
        }
        
        // Close the process editor preview modal
        function closeProcessEditorPreview() {
            const modal = document.getElementById('process-editor-preview-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }
        
        // Open Visual Editor
        function openVisualEditor(agentId = null) {
            // If we have a freshly generated workflow (not yet saved), pass it as a draft to the builder
            try {
                if (!agentId && wizard && wizard.processDefinition) {
                    sessionStorage.setItem('agentforge_process_builder_draft', JSON.stringify(wizard.processDefinition));
                    sessionStorage.setItem('agentforge_process_builder_draft_meta', JSON.stringify({
                        goal: wizard.originalGoal || wizard.config?.goal || '',
                        animate: true
                    }));
                    window.open('/ui/process-builder.html?draft=1', '_blank');
                    return;
                }
            } catch (e) {
                console.warn('Could not store draft for builder:', e);
            }
            
            // Open process builder with agent ID if editing an existing workflow
            const url = agentId ? `/ui/process-builder.html?agent=${agentId}` : '/ui/process-builder.html';
            window.open(url, '_blank');
        }
        
        // Save Process
        async function saveProcess() {
            const name = document.getElementById('process-name')?.value || 'My Workflow';
            const workflow = wizard.processDefinition;
            workflow.name = name;
            
            try {
                const response = await fetch('/api/agents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (authToken || localStorage.getItem('agentforge_token'))
                    },
                    body: JSON.stringify({
                        name: name,
                        goal: wizard.originalGoal,
                        agent_type: 'process',
                        process_definition: workflow,
                        is_published: true
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    closeProcessEditorPreview(); // Close the modal
                    showToast('Workflow saved successfully!', 'success');
                    navigate('agents'); // Go to agents list
                } else {
                    const error = await response.json();
                    showToast('Could not save: ' + (error.detail || 'Unknown error'), 'error');
                }
            } catch(e) {
                showToast('Could not save workflow. Please try again.', 'error');
            }
        }
        
        // ============================================================================
        // PROCESS EXECUTION FUNCTIONS
        // ============================================================================
        
        let currentProcessAgent = null;
        let currentExecutionId = null;
        let executionPollInterval = null;
        let executionPollStopped = false;  // stop loop on 401 so we don't keep hitting the server

        // Process playback (visual animation) + test report (business-friendly)
        const _execMilestones = {}; // { [executionId]: { waiting?: true, completed?: true, failed?: true } }
        let _pbPlayer = {
            agentId: null,
            ready: false,
            playId: null,
            pending: null, // { playId, trace, after, subtitle }
            last: null // { agentId, trace, subtitle }
        };
        let _inlineApproval = { approvalId: null, executionId: null };

        function _markMilestone(executionId, milestone) {
            if (!executionId) return false;
            if (!_execMilestones[executionId]) _execMilestones[executionId] = {};
            if (_execMilestones[executionId][milestone]) return false;
            _execMilestones[executionId][milestone] = true;
            return true;
        }
