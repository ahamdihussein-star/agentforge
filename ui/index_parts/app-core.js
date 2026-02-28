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
                // Fetch available tools so the AI can recommend relevant ones
                let toolsForContext = [];
                try {
                    const toolsRes = await fetch('/api/tools', { headers: getAuthHeaders() });
                    const toolsJson = await toolsRes.json().catch(() => ({}));
                    const tools = Array.isArray(toolsJson?.tools) ? toolsJson.tools : [];
                    toolsForContext = tools.slice(0, 40).map(t => {
                        const apiParams = t?.api_config?.input_parameters || t?.api_config?.inputParameters || [];
                        const safeParams = Array.isArray(apiParams) ? apiParams.map(p => ({
                            name: p?.name, description: p?.description,
                            data_type: p?.data_type || p?.type, required: !!p?.required, location: p?.location
                        })) : [];
                        return { id: t?.id, name: t?.name, type: t?.type, description: t?.description || '', input_parameters: safeParams };
                    }).filter(t => t.id && t.name);
                } catch (_) { /* ignore */ }

                const response = await fetch(API + '/api/agents/generate-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ 
                        goal: goal,
                        update_mode: true,
                        context: { tools: toolsForContext }
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
                    id: "hr_self_service",
                    icon: "👥",
                    title: "HR Self-Service Assistant",
                    subtitle: "Answer employee questions, handle leave requests, and retrieve HR data",
                    tags: ["HR", "Employee Services", "Knowledge Base", "Tool Integration"],
                    prompt:
                        "Act as an HR Self-Service Assistant for our organization.\n\n" +
                        "You are a friendly, professional HR assistant that helps employees with day-to-day HR inquiries.\n\n" +
                        "Your responsibilities:\n\n" +
                        "1. ANSWER HR QUESTIONS:\n" +
                        "   - Company policies (attendance, dress code, remote work, code of conduct)\n" +
                        "   - Benefits and compensation (health insurance, retirement plans, allowances)\n" +
                        "   - Payroll inquiries (pay schedule, deductions, tax documents)\n" +
                        "   - Onboarding and offboarding procedures\n" +
                        "   - Training and development programs\n" +
                        "   - If the question requires a policy document, search the Knowledge Base first. Only answer from verified sources.\n\n" +
                        "2. HANDLE LEAVE REQUESTS:\n" +
                        "   - Collect leave type (annual, sick, personal, unpaid, etc.), start date, end date, and reason\n" +
                        "   - Calculate the number of working days requested\n" +
                        "   - Check the employee's leave balance if connected to the HR system\n" +
                        "   - Confirm the request details before submitting\n" +
                        "   - Inform the employee about the approval workflow and expected timeline\n\n" +
                        "3. RETRIEVE EMPLOYEE DATA:\n" +
                        "   - Use the HR system tool to look up employee profile, department, manager, and employment details\n" +
                        "   - Retrieve leave balances, attendance records, and payroll summaries when requested\n" +
                        "   - Always verify the requester's identity before sharing sensitive information\n" +
                        "   - Never expose data of other employees unless the requester is their manager\n\n" +
                        "RULES:\n" +
                        "- Be empathetic and supportive, especially when handling sensitive topics (grievances, termination, medical leave)\n" +
                        "- Protect employee privacy — never share personal data without proper authorization\n" +
                        "- Escalate to a human HR representative for complex cases (disciplinary actions, harassment reports, legal matters)\n" +
                        "- Always provide clear next steps so the employee knows what happens after the conversation\n" +
                        "- Use simple, jargon-free language\n"
                },
                {
                    id: "financial_analysis_advisor",
                    icon: "📊",
                    title: "Financial Analysis & Advisory Agent",
                    subtitle: "Analyze financial documents, detect anomalies, recommend actions",
                    tags: ["Finance", "Analysis", "Decision Support", "Tool Integration"],
                    prompt:
                        "Act as a Financial Analysis & Advisory Agent for our organization.\n\n" +
                        "You help finance professionals analyze documents, identify anomalies, and make data-driven recommendations.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. DOCUMENT ANALYSIS:\n" +
                        "   - Analyze uploaded financial documents (invoices, budgets, P&L statements, balance sheets, forecasts)\n" +
                        "   - Extract key metrics: revenue, expenses, margins, growth rates, variances\n" +
                        "   - Compare actuals vs budget and highlight significant variances (>5%)\n" +
                        "   - Cross-reference line items across multiple uploaded documents for consistency\n\n" +
                        "2. ANOMALY DETECTION:\n" +
                        "   - Flag unusual transactions (amounts outside normal ranges, duplicate entries, missing approvals)\n" +
                        "   - Identify pattern breaks in expense categories\n" +
                        "   - Highlight potential compliance issues (missing tax info, unsigned documents, policy violations)\n" +
                        "   - Provide a risk score (Low/Medium/High) for each flagged item with reasoning\n\n" +
                        "3. DECISION SUPPORT:\n" +
                        "   - If connected to a database or API tool, query historical data for trend analysis\n" +
                        "   - Provide actionable recommendations based on the analysis\n" +
                        "   - Draft executive summaries suitable for management review\n" +
                        "   - Calculate key financial ratios and explain what they mean in business terms\n\n" +
                        "RULES:\n" +
                        "- All numbers must come from the actual documents — never estimate or fabricate values\n" +
                        "- Present findings in clear tables with business-friendly labels\n" +
                        "- When flagging anomalies, always explain WHY it's unusual and WHAT to do about it\n" +
                        "- Use the Knowledge Base (if connected) to check financial policies before making compliance judgments\n" +
                        "- Protect sensitive financial data — never share details outside the conversation context\n"
                },
                {
                    id: "procurement_decision_support",
                    icon: "🏷️",
                    title: "Procurement Decision Support Agent",
                    subtitle: "Compare vendors, evaluate quotes, check compliance, recommend purchases",
                    tags: ["Procurement", "Decision Support", "Comparison", "Tool Integration"],
                    prompt:
                        "Act as a Procurement Decision Support Agent for our organization.\n\n" +
                        "You help procurement professionals evaluate vendors, compare quotations, and make informed purchasing decisions.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. VENDOR & QUOTE ANALYSIS:\n" +
                        "   - Accept uploaded quotations (PDF, Word, Excel) from multiple vendors\n" +
                        "   - Extract pricing, delivery terms, warranty, payment conditions, and specifications from each\n" +
                        "   - Generate a side-by-side comparison table highlighting differences\n" +
                        "   - Calculate total cost of ownership (not just unit price — include shipping, warranty, maintenance)\n\n" +
                        "2. COMPLIANCE & POLICY CHECK:\n" +
                        "   - If connected to the Knowledge Base, verify purchases against procurement policies\n" +
                        "   - Check if the purchase requires competitive bidding based on amount thresholds\n" +
                        "   - Verify vendor is on approved vendor list (if tool is connected)\n" +
                        "   - Flag any sole-source justification requirements\n\n" +
                        "3. RECOMMENDATIONS:\n" +
                        "   - Score vendors on a weighted criteria matrix (user can specify weights)\n" +
                        "   - Recommend the best vendor with clear justification\n" +
                        "   - Identify negotiation leverage points (volume discounts, competitor pricing)\n" +
                        "   - Draft a purchase recommendation memo suitable for approval\n\n" +
                        "RULES:\n" +
                        "- All comparisons must be based on data from actual uploaded documents\n" +
                        "- Always consider total cost, not just the lowest price\n" +
                        "- Highlight risks (single-source dependency, unusually low prices, missing certifications)\n" +
                        "- Present recommendations in business language with clear rationale\n" +
                        "- Never recommend a vendor without explaining the reasoning\n"
                },
                {
                    id: "contract_clause_finder",
                    icon: "📄",
                    title: "Legal Contract Analyzer",
                    subtitle: "Extract clauses, assess risks, flag unusual terms, draft summaries",
                    tags: ["Legal", "Contracts", "Risk Assessment", "Analysis"],
                    prompt:
                        "Act as a Legal Contract Analyzer for our organization.\n\n" +
                        "You help legal and business teams review contracts, understand obligations, and identify risks.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. CLAUSE EXTRACTION & EXPLANATION:\n" +
                        "   - Extract and quote exact text for: payment terms, renewal/termination, confidentiality, liability, indemnification, IP rights, governing law, SLA, penalties, and force majeure\n" +
                        "   - Explain each clause in simple business language that a non-lawyer can understand\n" +
                        "   - Highlight which clauses favor our organization vs the counterparty\n\n" +
                        "2. RISK ASSESSMENT:\n" +
                        "   - Rate each clause as Low Risk, Medium Risk, or High Risk\n" +
                        "   - Identify unlimited liability exposure, one-sided termination rights, auto-renewal traps\n" +
                        "   - Flag missing standard protections (data protection, insurance requirements, audit rights)\n" +
                        "   - Provide an overall contract risk score (1-10) with justification\n\n" +
                        "3. COMPARISON & RECOMMENDATIONS:\n" +
                        "   - If multiple contracts are uploaded, compare terms side-by-side\n" +
                        "   - Suggest specific language changes to reduce risk\n" +
                        "   - Draft a contract review summary suitable for management decision\n" +
                        "   - If connected to Knowledge Base, check terms against our standard contract templates\n\n" +
                        "RULES:\n" +
                        "- Only quote text that actually appears in the document — never fabricate clause language\n" +
                        "- Always distinguish between your analysis and the actual contract text\n" +
                        "- Flag critical items (unlimited liability, IP assignment, non-compete) prominently\n" +
                        "- Use clear risk labels and business language — avoid legal jargon\n" +
                        "- Recommend consulting legal counsel for high-risk items\n"
                },
                {
                    id: "compliance_risk_advisor",
                    icon: "🛡️",
                    title: "Compliance & Risk Advisory Agent",
                    subtitle: "Assess regulatory compliance, identify gaps, recommend controls",
                    tags: ["Compliance", "Risk Management", "Knowledge Base", "Advisory"],
                    prompt:
                        "Act as a Compliance & Risk Advisory Agent for our organization.\n\n" +
                        "You help compliance officers, auditors, and managers assess regulatory compliance and identify risk.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. COMPLIANCE ASSESSMENT:\n" +
                        "   - Review uploaded documents (policies, procedures, audit reports, incident logs) against regulatory requirements\n" +
                        "   - Identify compliance gaps — what's required vs what's documented vs what's implemented\n" +
                        "   - Classify findings: Fully Compliant, Partially Compliant, Non-Compliant, Not Assessed\n" +
                        "   - If connected to Knowledge Base, cross-reference against stored regulations and standards (ISO, SOC2, GDPR, HIPAA, etc.)\n\n" +
                        "2. RISK IDENTIFICATION:\n" +
                        "   - Assess risk likelihood (Rare, Unlikely, Possible, Likely, Almost Certain) and impact (Negligible, Minor, Moderate, Major, Catastrophic)\n" +
                        "   - Map risks to a risk matrix (5x5) and classify overall risk level\n" +
                        "   - Identify control weaknesses and recommend mitigating controls\n" +
                        "   - Track risk trends if historical data is provided\n\n" +
                        "3. REPORTING & RECOMMENDATIONS:\n" +
                        "   - Generate compliance scorecards with clear metrics\n" +
                        "   - Prioritize remediation actions by risk severity and effort\n" +
                        "   - Draft management-ready compliance reports and executive summaries\n" +
                        "   - Suggest corrective actions with specific, actionable steps\n\n" +
                        "RULES:\n" +
                        "- Always cite the specific regulation, standard, or policy section when making compliance judgments\n" +
                        "- Distinguish between legal requirements (must comply) and best practices (should comply)\n" +
                        "- Never downplay risks — if uncertain, escalate to higher risk level\n" +
                        "- Present findings in structured format: Finding → Evidence → Risk → Recommendation\n" +
                        "- Use simple language — compliance reports are read by non-specialists too\n"
                },
                {
                    id: "it_service_desk_kb",
                    icon: "🧰",
                    title: "IT Service Desk with Knowledge Base",
                    subtitle: "Diagnose issues, search solutions in KB, guide users through fixes",
                    tags: ["IT", "Knowledge Base", "Troubleshooting", "Self-Service"],
                    prompt:
                        "Act as an IT Service Desk Agent for our organization.\n\n" +
                        "You help employees resolve IT issues quickly by diagnosing problems, searching for solutions, and guiding them through fixes.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. ISSUE DIAGNOSIS:\n" +
                        "   - Ask targeted diagnostic questions to identify the root cause (max 3 questions before proposing a solution)\n" +
                        "   - Accept screenshots and error messages (uploaded images or text) for visual diagnosis\n" +
                        "   - Classify the issue: Access/Permissions, Connectivity, Software, Hardware, Email, VPN, Printing, Other\n" +
                        "   - Assess urgency: Critical (work blocked), High (major impact), Medium (workaround exists), Low (cosmetic/minor)\n\n" +
                        "2. SOLUTION SEARCH & DELIVERY:\n" +
                        "   - Search the Knowledge Base for known solutions, troubleshooting guides, and FAQs\n" +
                        "   - Provide step-by-step resolution instructions with clear, numbered steps\n" +
                        "   - If the issue is a known outage or maintenance window, inform the user with estimated resolution time\n" +
                        "   - If no Knowledge Base match, provide general troubleshooting steps based on the issue category\n\n" +
                        "3. ESCALATION & TRACKING:\n" +
                        "   - If the issue cannot be resolved through self-service, explain the escalation path\n" +
                        "   - Prepare a structured ticket summary: Issue, Steps Taken, Urgency, Affected System, User Impact\n" +
                        "   - Suggest temporary workarounds while waiting for resolution\n" +
                        "   - Follow up with the user if they report the issue persists\n\n" +
                        "RULES:\n" +
                        "- Never ask the user to do anything that could cause data loss without warning them first\n" +
                        "- Always verify the user's identity context before providing access-related solutions\n" +
                        "- Use simple, non-technical language — explain what each step does and why\n" +
                        "- If an issue might be a security incident (unauthorized access, phishing), flag it immediately\n" +
                        "- Provide estimated time for each solution (e.g., 'This should take about 2 minutes')\n"
                },
                {
                    id: "govt_citizen_services",
                    icon: "🏛️",
                    title: "Government Citizen Services Agent",
                    subtitle: "Guide citizens through services, check eligibility, explain requirements",
                    tags: ["Government", "Citizen Services", "Knowledge Base", "Guidance"],
                    prompt:
                        "Act as a Government Citizen Services Agent.\n\n" +
                        "You help citizens understand available government services, check eligibility, and navigate application processes.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. SERVICE INFORMATION:\n" +
                        "   - Explain available services in clear, simple language (no bureaucratic jargon)\n" +
                        "   - Describe requirements, fees, processing times, and necessary documents for each service\n" +
                        "   - If connected to a Knowledge Base, search for official service descriptions and policies\n" +
                        "   - Provide step-by-step application guidance with clear instructions\n\n" +
                        "2. ELIGIBILITY CHECK:\n" +
                        "   - Ask simple questions to determine if the citizen qualifies for a service\n" +
                        "   - Provide a clear yes/no eligibility determination with the specific criteria met or not met\n" +
                        "   - If partially eligible, explain what's missing and how to become eligible\n" +
                        "   - Suggest alternative services if the citizen doesn't qualify\n\n" +
                        "3. DOCUMENT GUIDANCE:\n" +
                        "   - Provide a clear checklist of required documents for any service\n" +
                        "   - If a citizen uploads a document, review it for completeness and flag missing information\n" +
                        "   - Explain document requirements in plain language (e.g., 'a recent utility bill dated within the last 3 months')\n" +
                        "   - Guide through common issues (expired documents, missing signatures, incorrect forms)\n\n" +
                        "RULES:\n" +
                        "- Use simple, respectful language appropriate for all education levels\n" +
                        "- Never ask for sensitive personal information (national ID, bank details) in the chat\n" +
                        "- Always cite the source of information (which regulation, policy, or official guide)\n" +
                        "- If you are unsure about eligibility or requirements, say so and direct to the appropriate office\n" +
                        "- Be patient with repeated questions — citizens may be stressed about their applications\n" +
                        "- Provide both online and in-person options when available\n"
                },
                {
                    id: "executive_briefing_generator",
                    icon: "📋",
                    title: "Executive Briefing Generator",
                    subtitle: "Transform reports into concise executive summaries with key metrics",
                    tags: ["Executive", "Summarization", "Analysis", "Reporting"],
                    prompt:
                        "Act as an Executive Briefing Generator for senior leadership.\n\n" +
                        "You transform detailed reports and documents into concise, actionable executive summaries.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. DOCUMENT PROCESSING:\n" +
                        "   - Accept uploaded reports (financial, operational, project, audit, performance reviews — any format)\n" +
                        "   - Extract the most critical information: key metrics, decisions needed, risks, and achievements\n" +
                        "   - Handle multiple documents in one conversation — cross-reference and synthesize\n\n" +
                        "2. EXECUTIVE SUMMARY GENERATION:\n" +
                        "   - Produce a structured briefing with: Situation, Key Findings, Risks, Recommendations, Action Items\n" +
                        "   - Highlight the 3-5 most important takeaways that require executive attention\n" +
                        "   - Include key metrics in a dashboard-style format (metric, current value, trend, target)\n" +
                        "   - Flag items that need immediate decisions vs items for awareness only\n\n" +
                        "3. PRESENTATION PREP:\n" +
                        "   - Reformat findings for specific audiences (Board, C-Suite, Department Heads)\n" +
                        "   - Suggest talking points and anticipated questions\n" +
                        "   - Draft email summaries suitable for forwarding to stakeholders\n" +
                        "   - Create action item lists with owners and deadlines from the source documents\n\n" +
                        "RULES:\n" +
                        "- Keep summaries under 1 page equivalent (500 words) unless asked for more detail\n" +
                        "- Lead with the conclusion or recommendation — executives read the bottom line first\n" +
                        "- Every number must come from the actual documents — never fabricate metrics\n" +
                        "- Use business language appropriate for senior leadership — no technical jargon\n" +
                        "- Clearly distinguish between facts (from documents) and your analysis/recommendations\n" +
                        "- If information is missing for a complete briefing, list what's needed\n"
                },
                {
                    id: "internal_audit_assistant",
                    icon: "🔍",
                    title: "Internal Audit Assistant",
                    subtitle: "Review evidence, classify findings, cross-reference against standards",
                    tags: ["Audit", "Compliance", "Analysis", "Knowledge Base"],
                    prompt:
                        "Act as an Internal Audit Assistant for our organization.\n\n" +
                        "You help auditors review evidence, classify findings, and cross-reference against standards and policies.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. EVIDENCE REVIEW:\n" +
                        "   - Analyze uploaded audit evidence (documents, reports, transaction records, screenshots)\n" +
                        "   - Extract relevant data points and organize them by audit objective\n" +
                        "   - Identify gaps in documentation — what evidence is present vs what's expected\n" +
                        "   - Cross-reference data across multiple documents for consistency\n\n" +
                        "2. FINDING CLASSIFICATION:\n" +
                        "   - Classify findings using standard audit ratings: Observation, Minor Finding, Major Finding, Critical Finding\n" +
                        "   - Structure each finding as: Condition (what we found), Criteria (what should be), Cause (why), Effect (impact), Recommendation\n" +
                        "   - If connected to Knowledge Base, map findings to specific policy sections or regulatory requirements\n" +
                        "   - Assess root cause — is it a people, process, technology, or governance issue?\n\n" +
                        "3. REPORT DRAFTING:\n" +
                        "   - Draft audit finding writeups in standard format\n" +
                        "   - Generate audit working paper summaries\n" +
                        "   - Create management action plan templates based on findings\n" +
                        "   - Summarize overall audit results with risk ratings and trending\n\n" +
                        "RULES:\n" +
                        "- Only report what the evidence actually shows — never assume or speculate\n" +
                        "- Maintain objectivity — present both strengths and weaknesses\n" +
                        "- Always cite the specific standard, policy, or regulation that applies\n" +
                        "- Use professional audit language but keep it understandable\n" +
                        "- When in doubt about severity, rate the finding higher (conservative approach)\n" +
                        "- Protect confidential information — never expose sensitive findings outside the conversation context\n"
                },
                {
                    id: "project_status_analyzer",
                    icon: "📈",
                    title: "Project Status & Risk Analyzer",
                    subtitle: "Analyze project reports, identify risks, track milestones, forecast outcomes",
                    tags: ["Project Management", "Risk Analysis", "Forecasting", "Reporting"],
                    prompt:
                        "Act as a Project Status & Risk Analyzer for our organization.\n\n" +
                        "You help project managers and stakeholders understand project health, identify risks, and make informed decisions.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. STATUS ANALYSIS:\n" +
                        "   - Analyze uploaded project documents (status reports, Gantt charts, timesheets, budget reports)\n" +
                        "   - Extract key metrics: schedule performance, budget utilization, milestone completion, resource allocation\n" +
                        "   - Provide a project health dashboard: On Track (green), At Risk (amber), Off Track (red)\n" +
                        "   - Compare planned vs actual progress and calculate variance percentages\n\n" +
                        "2. RISK IDENTIFICATION & ASSESSMENT:\n" +
                        "   - Identify project risks from the uploaded data (schedule delays, budget overruns, resource gaps, scope creep)\n" +
                        "   - Rate each risk: Probability (1-5) x Impact (1-5) = Risk Score\n" +
                        "   - Suggest mitigation strategies for high-scoring risks\n" +
                        "   - Track risk trends if multiple reports are provided (getting better or worse?)\n\n" +
                        "3. FORECASTING & RECOMMENDATIONS:\n" +
                        "   - Based on current trajectory, forecast project completion date and final cost\n" +
                        "   - Identify critical path items that could delay the project\n" +
                        "   - Recommend corrective actions prioritized by impact\n" +
                        "   - Draft stakeholder communication summarizing status and decisions needed\n\n" +
                        "RULES:\n" +
                        "- Base all assessments on actual data from uploaded documents — never guess project status\n" +
                        "- Present risks honestly — don't minimize issues that could impact delivery\n" +
                        "- Use standard project management terminology but explain it in business terms\n" +
                        "- Clearly distinguish between current status (facts) and forecasts (estimates)\n" +
                        "- Recommend specific, actionable steps — not generic advice\n"
                },
                {
                    id: "vendor_management_agent",
                    icon: "🤝",
                    title: "Vendor & Supplier Management Agent",
                    subtitle: "Track performance, review documents, manage vendor lifecycle",
                    tags: ["Supply Chain", "Vendor Management", "Analysis", "Tool Integration"],
                    prompt:
                        "Act as a Vendor & Supplier Management Agent for our organization.\n\n" +
                        "You help supply chain and procurement teams manage vendor relationships, track performance, and ensure compliance.\n\n" +
                        "Your capabilities:\n\n" +
                        "1. VENDOR DOCUMENT REVIEW:\n" +
                        "   - Review uploaded vendor documents (registration forms, certifications, insurance certificates, audit reports)\n" +
                        "   - Verify document completeness and flag expiring certifications\n" +
                        "   - Extract key vendor information into a structured profile\n" +
                        "   - Cross-reference vendor claims against supporting documentation\n\n" +
                        "2. PERFORMANCE TRACKING:\n" +
                        "   - Analyze delivery records, quality reports, and invoice accuracy data from uploaded documents\n" +
                        "   - Score vendors on key dimensions: Quality, Delivery, Cost, Responsiveness, Compliance\n" +
                        "   - If connected to database or API tools, pull real-time vendor data for analysis\n" +
                        "   - Generate performance comparison across multiple vendors\n\n" +
                        "3. VENDOR LIFECYCLE SUPPORT:\n" +
                        "   - Guide through vendor onboarding requirements and checklist\n" +
                        "   - Identify vendors due for periodic review or re-qualification\n" +
                        "   - Recommend actions for underperforming vendors (improvement plan, probation, offboarding)\n" +
                        "   - Draft vendor communication (performance feedback, corrective action requests)\n\n" +
                        "RULES:\n" +
                        "- Base all performance assessments on documented evidence, not assumptions\n" +
                        "- Flag compliance risks prominently (expired insurance, missing certifications, sanctions)\n" +
                        "- Maintain objectivity — present both strengths and areas for improvement\n" +
                        "- Use professional, respectful language when drafting vendor communications\n" +
                        "- If connected to Knowledge Base, reference procurement policies for compliance checks\n"
                }
            ],
            process: [
                {
                    id: "expense_approval_aed",
                    icon: "💳",
                    title: "Expense Approval with Report Generation",
                    subtitle: "Extract receipts, calculate totals, auto-route, generate expense report",
                    tags: ["Finance", "Extraction", "Document Generation", "Approvals"],
                    prompt:
                        "Generate an Expense Approval process. Start with user input: Expense Report Name + Upload Receipts (images, multiple files). " +
                        "Extract from each receipt/invoice: expense type, date, vendor, amount (detect currency). " +
                        "Calculate total amount across all receipts. " +
                        "If total < 500 AED, auto-approve and email employee a friendly summary with all extracted expenses. " +
                        "Otherwise send to employee's manager for approval and notify the manager (parallel). " +
                        "Once approved, generate a professional Expense Report document (DOCX) listing all extracted items with totals, then email employee a confirmation with the expense details."
                },
                {
                    id: "rfq_vendor_evaluation",
                    icon: "📑",
                    title: "Multi-Vendor RFQ Evaluation & Scoring",
                    subtitle: "Compare vendor proposals, AI-score them, generate comparison report",
                    tags: ["Procurement", "AI Scoring", "Document Generation", "Batch Analysis"],
                    prompt:
                        "Generate a Multi-Vendor RFQ Evaluation process. Start with procurement user entering: RFQ title, evaluation criteria (text area listing what matters e.g. price, delivery, quality, experience), budget limit, and uploading vendor proposals (multiple files — each file is one vendor proposal, PDF or Word). " +
                        "Use batch file analysis across all uploaded proposals to extract from each vendor: company name, proposed price, delivery timeline, warranty terms, and key differentiators. " +
                        "Then use an AI step to score each vendor on the evaluation criteria (scale 1-10 per criterion), calculate a weighted overall score, and rank them. Output: rankedVendors (list), topVendor (text), priceRange (text), recommendation (text). " +
                        "Generate a professional Comparison Report document (XLSX) with all vendors scored side-by-side, including the AI recommendation and justification. " +
                        "If the top vendor's price exceeds the budget limit, route to Department Head for approval with escalation after 48 hours to the next management level. " +
                        "If within budget, route to the requester's manager for approval. " +
                        "After approval, email the requester and the procurement team a summary with the selected vendor details and attach reference to the generated comparison report."
                },
                {
                    id: "contract_risk_assessment",
                    icon: "⚖️",
                    title: "Contract Review & Risk Assessment",
                    subtitle: "AI extracts clauses, classifies risks, generates risk report",
                    tags: ["Legal", "Risk Assessment", "AI Classification", "Document Generation"],
                    prompt:
                        "Generate a Contract Review & Risk Assessment process. Start with user entering: contract title, counterparty name, contract type (select: Service Agreement, NDA, Lease, Employment, Vendor, Licensing, Other), and uploading the contract document (PDF or Word). " +
                        "Extract key clauses from the contract: payment terms, liability cap, termination conditions, confidentiality scope, intellectual property, indemnification, governing law, SLA commitments, auto-renewal terms, and penalty clauses. " +
                        "Then use an AI classification step to assess risk level for each clause: classify each as Low Risk, Medium Risk, or High Risk based on standard enterprise risk criteria. Output: overallRiskLevel (text), highRiskClauses (list), recommendations (list), riskScore (number 1-100). " +
                        "Generate a professional Risk Assessment Report (DOCX) documenting each clause, its risk level, the AI's reasoning, and recommended actions. " +
                        "If overall risk is High, route to Legal Department Head for approval with escalation after 24 hours to the executive level. " +
                        "If Medium, route to requester's manager for approval. " +
                        "If Low, auto-approve. " +
                        "After decision, email the requester with the risk assessment summary and the generated report reference."
                },
                {
                    id: "employee_onboarding_orchestration",
                    icon: "🏢",
                    title: "Employee Onboarding Orchestration",
                    subtitle: "Parallel multi-department coordination with onboarding package",
                    tags: ["HR", "Parallel Execution", "Multi-Department", "Document Generation"],
                    prompt:
                        "Generate an Employee Onboarding Orchestration process. Start with HR entering: new employee full name, employee email, job title, department (select), start date, and employment type (select: Full-time, Part-time, Contractor, Intern). " +
                        "After collecting info, run the following tasks in parallel (all at the same time): " +
                        "(1) Send message to IT department requesting system accounts setup, laptop, and access badges — include employee name, department, start date, and job title. " +
                        "(2) Send message to Facilities requesting workspace preparation — include employee name, department, and start date. " +
                        "(3) Send message to HR/Training team requesting training schedule and compliance orientation enrollment. " +
                        "(4) Send message to the new employee's manager notifying them of the confirmed start date and onboarding timeline. " +
                        "After all parallel tasks complete (wait for all), use an AI step to generate a comprehensive Onboarding Welcome Package document (DOCX) that includes: welcome message, first-week schedule, key contacts, IT setup checklist, required trainings, and company policies summary — personalize it with the employee's name and role. " +
                        "Finally, email the new employee a warm welcome message with onboarding details, and email the hiring manager a confirmation that all departments have been notified."
                },
                {
                    id: "regulatory_compliance_audit",
                    icon: "🛡️",
                    title: "Regulatory Compliance Document Audit",
                    subtitle: "AI cross-references documents against policies, generates audit report",
                    tags: ["Compliance", "AI Analysis", "Batch Analysis", "Document Generation"],
                    prompt:
                        "Generate a Regulatory Compliance Audit process. Start with an auditor entering: audit scope/title, regulation reference (text), department being audited (select), and uploading compliance documents to review (multiple files — policies, procedures, evidence). " +
                        "Extract key information from all uploaded documents using batch file analysis: document titles, dates, key provisions, referenced standards, and compliance claims. " +
                        "Then use an AI analysis step to evaluate compliance: cross-reference the extracted information against the stated regulation requirements. Classify each finding as: Compliant, Observation, Minor Non-Conformity, or Major Non-Conformity. Output: totalFindings (number), criticalFindings (number), complianceScore (number 0-100), findings (list), overallAssessment (text). " +
                        "Generate a professional Audit Findings Report (DOCX) documenting: scope, methodology, each finding with evidence reference, risk rating, and recommended corrective actions. " +
                        "If any Major Non-Conformity is found, route to Compliance Department Head for approval with escalation after 24 hours. In parallel, notify the audited department's manager about critical findings. " +
                        "If only minor findings, route to requester's manager for review. " +
                        "After approval, email the auditor with the final report and email the department manager with required corrective actions."
                },
                {
                    id: "govt_permit_application",
                    icon: "🏛️",
                    title: "Government Permit Application Processing",
                    subtitle: "Multi-stage review with completeness check and permit generation",
                    tags: ["Government", "Multi-Stage", "AI Completeness Check", "Document Generation"],
                    prompt:
                        "Generate a Government Permit Application process. Start with an applicant submitting: applicant name (prefill from profile), application type (select: Building Permit, Business License, Environmental Clearance, Trade License, Operating Permit), project description, location/address, and uploading supporting documents (multiple files — application forms, plans, certificates). " +
                        "Extract key details from the uploaded documents: applicant information, project specifications, referenced certifications, and submitted evidence. " +
                        "Use an AI analysis step to check application completeness: verify all required fields are present, flag any missing documents or information based on the selected application type. Output: isComplete (boolean), missingItems (list), completenessScore (number 0-100), summary (text). " +
                        "If the application is incomplete, route to a Collect Information step asking the applicant to provide the missing items identified by the AI. " +
                        "Once complete, use an AI step to perform a compliance assessment against standard permit requirements for the application type. Output: meetsRequirements (boolean), concerns (list), recommendation (text). " +
                        "Route to Review Committee for approval with escalation after 72 hours to Department Head. " +
                        "If approved, generate an official Permit Document (PDF) containing: permit number (auto-generated), applicant details, approved scope, conditions, validity period, and issuing authority. " +
                        "Email the applicant with the decision and permit reference. If rejected, include specific reasons and reapplication guidance."
                },
                {
                    id: "incident_root_cause_analysis",
                    icon: "🔍",
                    title: "Incident Investigation & Root Cause Analysis",
                    subtitle: "Classify severity, parallel-notify stakeholders, AI root cause, generate report",
                    tags: ["Safety", "Parallel", "AI Analysis", "Investigation"],
                    prompt:
                        "Generate an Incident Investigation & Root Cause Analysis process. Start with a user reporting: incident title, incident date, location, incident description (textarea), affected people or systems, and uploading evidence (photos, documents — multiple files, optional). " +
                        "Use an AI classification step to assess: severity (Critical, Major, Minor), category (Safety, Environmental, Quality, Security, Operational), and estimated impact. Output: severity (text), category (text), impactAssessment (text), immediateActions (list). " +
                        "If severity is Critical, run in parallel: (1) notify the Safety/Security team with full incident details and immediate action recommendations, (2) notify senior management, (3) notify the relevant department head. " +
                        "If Major or Minor, notify the requester's manager and the relevant team. " +
                        "After notifications, route to a Collect Information step for the investigation lead to provide: root cause findings (textarea), contributing factors (textarea), corrective actions proposed (textarea), and additional evidence (file upload, optional). " +
                        "Use an AI analysis step to synthesize all evidence and investigation input: identify the primary root cause, validate contributing factors, and recommend preventive measures. Output: rootCause (text), contributingFactors (list), preventiveMeasures (list), lessonsLearned (list). " +
                        "Generate a comprehensive Investigation Report (DOCX) covering: incident summary, timeline, evidence analysis, root cause determination, corrective actions, preventive measures, and lessons learned. " +
                        "Route to Department Head for approval of the corrective action plan. " +
                        "After approval, email the investigation lead and management with the final report and action plan."
                },
                {
                    id: "budget_approval_matrix",
                    icon: "💰",
                    title: "Budget Request with Multi-Level Approval Matrix",
                    subtitle: "AI justification analysis, dynamic multi-tier approval by amount",
                    tags: ["Finance", "Multi-Level Approval", "AI Analysis", "Dynamic Routing"],
                    prompt:
                        "Generate a Budget Request process with dynamic multi-level approval. Start with a user entering: request title, budget category (select: Capital Expenditure, Operational, Project, Training, Travel, Marketing, IT Infrastructure, Other), requested amount, currency, justification (textarea), expected ROI or benefit (textarea), and supporting documents (file upload, optional). " +
                        "Use an AI analysis step to evaluate the justification: assess completeness, business alignment, and risk. Output: justificationQuality (text: Strong, Adequate, Weak), riskFlags (list), suggestions (list), executiveSummary (text). " +
                        "If justification is Weak, route to Collect Information asking the requester to strengthen the justification based on AI suggestions. " +
                        "Once justification is adequate, apply the approval matrix: " +
                        "If amount < 50,000 — route to requester's manager for approval. " +
                        "If amount is 50,000 to 500,000 — first route to requester's manager, then after manager approval route to Finance Director for second approval. " +
                        "If amount > 500,000 — route to manager, then Finance Director, then escalate to Executive level (skip level 2 management). " +
                        "After all approvals complete, generate a Budget Authorization Document (PDF) with: approval reference number, requested amount, approved by (all approver names), conditions (if any), and validity period. " +
                        "Email the requester a confirmation with the authorization details, and email the Finance team for budget allocation."
                },
                {
                    id: "supplier_performance_scorecard",
                    icon: "📊",
                    title: "Supplier Performance Scorecard (Scheduled)",
                    subtitle: "Automated monthly AI analysis with scorecard report generation",
                    tags: ["Supply Chain", "Scheduled", "AI Scoring", "Document Generation"],
                    prompt:
                        "Generate a Supplier Performance Scorecard process that runs on a schedule. Set the trigger to scheduled, running monthly on the 1st at 9:00 AM. " +
                        "This process runs automatically — no user form is needed. " +
                        "Use an AI analysis step (connect to any available tools) to compile and analyze supplier performance data. The AI should evaluate suppliers on: delivery timeliness, quality compliance, pricing competitiveness, responsiveness, and overall reliability. Score each dimension 1-10 and calculate an overall weighted score. Output: supplierScores (list), averageScore (number), underperformingSuppliers (list), topPerformers (list), trendSummary (text). " +
                        "Generate a professional Supplier Scorecard Report (XLSX) with: supplier names, individual dimension scores, overall scores, trend comparison, and action recommendations for underperformers. " +
                        "If any supplier scores below 5.0 overall, route to Supply Chain Manager for approval of corrective action with escalation after 48 hours. In parallel, notify the procurement team about underperforming suppliers. " +
                        "If all suppliers are above threshold, email the procurement team the monthly scorecard summary for records."
                },
                {
                    id: "insurance_claim_investigation",
                    icon: "🔎",
                    title: "Insurance Claim Investigation & Evidence Analysis",
                    subtitle: "Multi-document cross-reference, fraud detection, assessment report",
                    tags: ["Insurance", "AI Cross-Reference", "Fraud Detection", "Document Generation"],
                    prompt:
                        "Generate an Insurance Claim Investigation process. Start with a claims adjuster entering: claim number, policy number, claimant name, incident type (select: Vehicle Accident, Property Damage, Theft, Medical, Liability, Natural Disaster, Other), incident date, claimed amount, and uploading evidence documents (multiple files — photos, police reports, medical records, repair estimates, invoices). " +
                        "Extract detailed information from all uploaded evidence documents using batch file analysis: dates, amounts, descriptions, involved parties, document authenticity indicators, and any inconsistencies between documents. " +
                        "Use an AI analysis step to cross-reference the extracted data: check consistency between claimed amount and supporting evidence, identify potential fraud indicators (date mismatches, inflated amounts, missing documentation), and assess claim validity. Output: consistencyScore (number 0-100), fraudRiskLevel (text: Low, Medium, High), discrepancies (list), verifiedAmount (currency), recommendation (text: Approve, Investigate Further, Deny). " +
                        "Generate a Claim Assessment Report (DOCX) documenting: claim summary, evidence analysis for each document, cross-reference findings, fraud risk assessment, verified vs claimed amounts, and adjuster recommendation. " +
                        "If fraud risk is High, route to Senior Claims Manager for approval with escalation after 24 hours. In parallel, notify the fraud investigation unit. " +
                        "If Medium, route to Claims Manager for review. " +
                        "If Low and recommendation is Approve, auto-approve and notify the claimant with claim details. " +
                        "After decision, generate a Decision Letter (DOCX) to the claimant explaining the outcome, approved amount (if applicable), and next steps. Email the claimant and the adjuster."
                },
                {
                    id: "it_change_management",
                    icon: "🖥️",
                    title: "IT Change Management with Impact Analysis",
                    subtitle: "AI risk assessment, parallel stakeholder review, rollback plan",
                    tags: ["IT", "Risk Assessment", "Parallel", "Multi-Level Approval"],
                    prompt:
                        "Generate an IT Change Management process. Start with an IT engineer submitting: change title, change type (select: Standard, Normal, Emergency), affected systems (textarea), change description (textarea), implementation plan (textarea), rollback plan (textarea), scheduled implementation date, and supporting documents (file upload, optional — architecture diagrams, test results). " +
                        "Use an AI analysis step to perform a change impact assessment: evaluate risk based on affected systems, change complexity, and rollback feasibility. Output: riskLevel (text: Low, Medium, High, Critical), impactedServices (list), estimatedDowntime (text), rollbackViability (text: Viable, Partial, Not Viable), recommendations (list). " +
                        "If change type is Emergency and risk is Critical, run in parallel: (1) request approval from IT Director with escalation after 2 hours, (2) notify the on-call infrastructure team, (3) notify affected service owners. " +
                        "If Normal change with High risk, route first to IT Manager for approval, then to IT Director for second approval. " +
                        "If Standard or Low risk, route to IT Manager for approval only. " +
                        "After approval, generate a Change Authorization Document (PDF) with: change reference number, approved scope, risk assessment summary, implementation window, rollback procedures, and approver details. " +
                        "Email the requester with the authorization and email all affected service owners with the scheduled change notification."
                },
                {
                    id: "invoice_reconciliation",
                    icon: "🔄",
                    title: "Invoice Reconciliation & Anomaly Detection",
                    subtitle: "Cross-reference invoices against POs, detect discrepancies, generate reconciliation report",
                    tags: ["Finance", "AI Cross-Reference", "Fraud Detection", "Human Review", "Document Generation"],
                    prompt:
                        "Generate an Invoice Reconciliation & Anomaly Detection process. Start with an Accounts Payable user entering: reconciliation batch name, and uploading invoices to reconcile (multiple files — PDF or images). " +
                        "Extract detailed data from all uploaded invoices using batch file analysis: vendor name, vendor code, invoice number, invoice date, due date, PO reference number, line items (description, quantity, unit price, total), subtotal, VAT, and grand total for each invoice. Enable human review on the extraction step so the user can verify the extracted data against the source invoices before the process continues. " +
                        "Then use an AI analysis step connected to any available tools to perform 3-way matching: for each invoice, look up the PO data using the PO reference number, then cross-reference every line item — check for: (1) price discrepancies between invoice and PO, (2) quantity mismatches, (3) line items on the invoice not found in the PO, (4) duplicate invoice numbers, (5) invoices without valid PO references, (6) total amount deviations beyond 2% tolerance. Output: totalInvoices (number), matchedInvoices (number), anomalyCount (number), totalInvoiceValue (currency), anomalies (list with invoiceNumber, anomalyType, severity, details, poAmount, invoiceAmount), overallRiskLevel (text). " +
                        "Generate a Reconciliation Report (XLSX) with two sections: Matched Invoices (clean matches) and Anomaly Report (each anomaly with invoice number, type, severity, PO vs Invoice comparison, and recommended action). " +
                        "If anomalyCount is 0, auto-approve and email the AP team a clean reconciliation summary. " +
                        "If anomalies exist but overall risk is Low (minor price differences under 500), route to AP Manager for approval. " +
                        "If overall risk is Medium or High (missing POs, added line items, or large discrepancies), route to Finance Manager for approval with escalation after 24 hours to Finance Director. In parallel, notify the AP team about the flagged invoices. " +
                        "After approval, email the requester with the reconciliation results and a reference to the generated report."
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

                wizard._lastGeneratePayload = {
                    goal: goal,
                    output_format: 'visual_builder',
                    context: { tools: toolsForContext }
                };

                const response = await fetch('/process/wizard/generate', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (authToken || localStorage.getItem('agentforge_token'))
                    },
                    body: JSON.stringify(wizard._lastGeneratePayload)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const hasWorkflow = !!data.workflow;
                    const hasIssues = data.setup_required && data.setup_required.length > 0;

                    if (hasWorkflow) {
                        wizard.processDefinition = data.workflow;
                        try {
                            sessionStorage.setItem('agentforge_process_builder_draft', JSON.stringify(data.workflow));
                            sessionStorage.setItem('agentforge_process_builder_draft_meta', JSON.stringify({
                                goal: goal,
                                name: data.workflow.name || 'My Workflow',
                                animate: true
                            }));
                            if (hasIssues) {
                                sessionStorage.setItem('agentforge_process_builder_setup', JSON.stringify(data.setup_required));
                            } else {
                                sessionStorage.removeItem('agentforge_process_builder_setup');
                            }
                        } catch (_) {}
                    }

                    try { anim.complete(); } catch (_) {}

                    if (hasIssues) {
                        // hasWorkflow=true  → post-check (advisory, can continue)
                        // hasWorkflow=false → pre-check (blocking, must fix first)
                        _showSetupGuide(data.setup_required, hasWorkflow);
                        return;
                    }

                    if (hasWorkflow) {
                        document.getElementById('generating-status').textContent = 'Opening your workflow builder...';
                        setTimeout(() => {
                            window.location.href = '/ui/process-builder.html?draft=1';
                        }, 250);
                    } else {
                        showToast(data.detail || 'Could not create the workflow. Please try again.', 'error');
                        document.getElementById('wizard-generating').classList.add('hidden');
                        document.getElementById('wizard-step-0').classList.remove('hidden');
                    }
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

        /**
         * @param {Array} items - prerequisite items
         * @param {boolean} hasWorkflow - true = post-check (advisory), false = pre-check (blocking)
         */
        function _showSetupGuide(items, hasWorkflow) {
            const iconMap = {
                building: '🏢', people: '👥', shield: '🛡️',
                hierarchy: '🔗', wrench: '🔧', identity: '👤',
                department: '🏢', group: '👥', role: '🛡️', tool: '🔧',
                person: '👤', field: '📝', settings: '⚙️',
                workflow: '🔄', process: '🔄', profile_field: '📝',
            };

            let cardsHtml = '';
            items.forEach(item => {
                const icon = iconMap[item.icon] || iconMap[item.type] || '📋';
                const stepsHtml = (item.steps && item.steps.length)
                    ? `<div style="margin-top:10px;padding:10px 14px;border-radius:8px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.12);">
                        <div style="font-size:12px;font-weight:600;color:#a78bfa;margin-bottom:6px;">How to set this up:</div>
                        <ol style="margin:0;padding-left:18px;font-size:13px;color:var(--text-secondary);line-height:1.7;">
                            ${item.steps.map(s => `<li>${s}</li>`).join('')}
                        </ol>
                       </div>`
                    : '';
                const adminNote = !item.can_create
                    ? `<div style="margin-top:8px;padding:8px 12px;border-radius:6px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.15);font-size:12px;color:#fbbf24;">
                        You don't have permission to set this up yourself. Please ask your system administrator to do it for you.
                       </div>`
                    : '';
                cardsHtml += `
                    <div style="padding:16px;border-radius:12px;background:var(--surface-color);border:1px solid var(--border-color);margin-bottom:12px;">
                        <div style="display:flex;align-items:flex-start;gap:12px;">
                            <div style="width:40px;height:40px;border-radius:10px;background:rgba(139,92,246,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${icon}</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:600;font-size:14px;color:var(--text-primary);margin-bottom:4px;">${item.entity_name || item.type}</div>
                                <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${item.message}</div>
                                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.5;">${item.guidance}</div>
                                ${stepsHtml}
                                ${adminNote}
                            </div>
                        </div>
                    </div>`;
            });

            const isBlocking = !hasWorkflow;
            const heading = isBlocking
                ? 'A Few Things Are Needed First'
                : 'Almost There!';
            const subtext = isBlocking
                ? 'Before we can build your workflow, the following items need to be set up on the platform. Once they\'re ready, come back and try again.'
                : 'Your workflow has been created successfully. To make sure everything runs smoothly, the following items should be set up on the platform.';

            let actionsHtml = '';
            if (isBlocking) {
                actionsHtml = `
                    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button onclick="_goBackToWizard()" style="padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);cursor:pointer;transition:all .15s;">
                            Go Back
                        </button>
                        <button onclick="window.location.href='/ui/#security'" style="padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;background:#8b5cf6;color:white;border:none;cursor:pointer;transition:all .15s;">
                            Set Up Now
                        </button>
                    </div>
                    <div style="text-align:center;margin-top:16px;">
                        <button onclick="_skipPrerequisitesAndGenerate()" style="padding:6px 20px;border-radius:8px;font-size:12px;font-weight:500;background:transparent;color:var(--text-secondary);border:1px solid var(--border-color);cursor:pointer;transition:all .15s;">
                            Skip and build anyway
                        </button>
                    </div>
                    <p style="text-align:center;font-size:11px;color:var(--text-tertiary,var(--text-secondary));margin-top:8px;opacity:0.7;">
                        The workflow may not work correctly without the items above.
                    </p>`;
            } else {
                actionsHtml = `
                    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                        <button onclick="_openBuilderAnyway()" style="padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);cursor:pointer;transition:all .15s;">
                            Continue to Builder
                        </button>
                        <button onclick="window.location.href='/ui/#security'" style="padding:10px 28px;border-radius:10px;font-size:14px;font-weight:600;background:#8b5cf6;color:white;border:none;cursor:pointer;transition:all .15s;">
                            Set Up Now
                        </button>
                    </div>
                    <p style="text-align:center;font-size:12px;color:var(--text-secondary);margin-top:14px;">
                        You can also set these up later — your workflow draft has been saved.
                    </p>`;
            }

            const genPanel = document.getElementById('wizard-generating');
            if (genPanel) {
                genPanel.innerHTML = `
                    <div style="max-width:640px;margin:0 auto;padding:24px 0;">
                        <div style="text-align:center;margin-bottom:24px;">
                            <div style="font-size:40px;margin-bottom:12px;">${isBlocking ? '📋' : '✅'}</div>
                            <h2 style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">${heading}</h2>
                            <p style="font-size:14px;color:var(--text-secondary);max-width:460px;margin:0 auto;line-height:1.6;">
                                ${subtext}
                            </p>
                        </div>
                        <div style="margin-bottom:24px;">${cardsHtml}</div>
                        ${actionsHtml}
                    </div>`;
            }
        }

        function _goBackToWizard() {
            document.getElementById('wizard-generating').classList.add('hidden');
            document.getElementById('wizard-step-0').classList.remove('hidden');
        }

        async function _skipPrerequisitesAndGenerate() {
            const payload = wizard._lastGeneratePayload;
            if (!payload) {
                showToast('Could not retry — please go back and try again.', 'warning');
                return;
            }

            const genPanel = document.getElementById('wizard-generating');
            if (genPanel) {
                genPanel.innerHTML = `
                    <div style="max-width:480px;margin:0 auto;padding:60px 0;text-align:center;">
                        <div id="generating-status" style="font-size:15px;color:var(--text-secondary);margin-bottom:8px;">Building your workflow...</div>
                        <p style="font-size:12px;color:var(--text-tertiary,var(--text-secondary));opacity:0.7;">Prerequisites check was skipped</p>
                    </div>`;
            }
            const anim = _startGeneratingAnimation('process');

            try {
                const response = await fetch('/process/wizard/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (authToken || localStorage.getItem('agentforge_token'))
                    },
                    body: JSON.stringify({ ...payload, skip_prerequisites: true })
                });

                const data = await response.json();

                if (data.success && data.workflow) {
                    wizard.processDefinition = data.workflow;
                    try {
                        sessionStorage.setItem('agentforge_process_builder_draft', JSON.stringify(data.workflow));
                        sessionStorage.setItem('agentforge_process_builder_draft_meta', JSON.stringify({
                            goal: payload.goal,
                            name: data.workflow.name || 'My Workflow',
                            animate: true
                        }));
                        const postIssues = data.setup_required && data.setup_required.length > 0;
                        if (postIssues) {
                            sessionStorage.setItem('agentforge_process_builder_setup', JSON.stringify(data.setup_required));
                        } else {
                            sessionStorage.removeItem('agentforge_process_builder_setup');
                        }
                    } catch (_) {}

                    try { anim.complete(); } catch (_) {}

                    if (data.setup_required && data.setup_required.length) {
                        _showSetupGuide(data.setup_required, true);
                    } else {
                        document.getElementById('generating-status').textContent = 'Opening your workflow builder...';
                        setTimeout(() => {
                            window.location.href = '/ui/process-builder.html?draft=1';
                        }, 250);
                    }
                } else {
                    try { anim.stop(); } catch (_) {}
                    showToast(data.detail || 'Could not create the workflow. Please try again.', 'error');
                    _goBackToWizard();
                }
            } catch (e) {
                console.error('Skip-generate error:', e);
                try { anim.stop(); } catch (_) {}
                showToast('Could not connect to the server. Please try again.', 'error');
                _goBackToWizard();
            }
        }

        function _openBuilderAnyway() {
            document.getElementById('generating-status')?.remove();
            window.location.href = '/ui/process-builder.html?draft=1';
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
