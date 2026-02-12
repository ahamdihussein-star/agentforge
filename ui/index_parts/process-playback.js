// Auto-generated from ui/index.js
// Part 002: lines 1784-3544
// DO NOT reorder parts.

        function closeProcessPlaybackModal() {
            const modal = document.getElementById('process-playback-modal');
            if (modal) modal.classList.add('hidden');
        }

        function _setPlaybackSubtitle(text) {
            const el = document.getElementById('process-playback-subtitle');
            if (el) el.textContent = text || 'Showing the actual path the workflow took';
        }

        function _openProcessPlaybackModal(agentId, subtitle) {
            const modal = document.getElementById('process-playback-modal');
            const frame = document.getElementById('process-playback-frame');
            if (!modal || !frame) return;

            // If agent changed (or iframe not loaded yet), reload the player
            const shouldReload = !agentId || _pbPlayer.agentId !== agentId || !frame.src || frame.src === 'about:blank';
            if (shouldReload) {
                _pbPlayer.ready = false;
                _pbPlayer.agentId = agentId || null;
                const src = agentId ? `/ui/process-builder.html?agent=${encodeURIComponent(agentId)}&player=1` : '/ui/process-builder.html?player=1';
                frame.src = src;
            }

            _setPlaybackSubtitle(subtitle || '');
            modal.classList.remove('hidden');
        }

        function replayProcessPlayback() {
            if (_pbPlayer.last && _pbPlayer.last.agentId && Array.isArray(_pbPlayer.last.trace)) {
                requestProcessPlayback(_pbPlayer.last.agentId, _pbPlayer.last.trace, { subtitle: _pbPlayer.last.subtitle || '', after: null, forceOpen: true });
            }
        }

        function closeProcessTestReport() {
            const modal = document.getElementById('process-test-report-modal');
            if (modal) modal.classList.add('hidden');
        }

        function _postToPlaybackFrame(msg) {
            const frame = document.getElementById('process-playback-frame');
            const win = frame && frame.contentWindow;
            if (!win) return false;
            try {
                win.postMessage(msg, window.location.origin);
                return true;
            } catch (_) {
                return false;
            }
        }

        // Listen for messages from the embedded Process Builder player
        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data || {};
            if (!data || typeof data !== 'object') return;

            if (data.type === 'PB_PLAYER_READY') {
                _pbPlayer.ready = true;
                if (_pbPlayer.pending && _pbPlayer.pending.trace) {
                    const p = _pbPlayer.pending;
                    _pbPlayer.pending = null;
                    _pbPlayer.playId = p.playId || null;
                    _pbPlayer.last = { agentId: _pbPlayer.agentId, trace: p.trace, subtitle: p.subtitle || '' };
                    _postToPlaybackFrame({ type: 'PB_PLAYER_PLAY_TRACE', playId: _pbPlayer.playId, trace: p.trace });
                }
                return;
            }

            if (data.type === 'PB_PLAYER_PLAY_DONE') {
                const playId = data.playId || null;
                if (_pbPlayer.playId && playId && String(_pbPlayer.playId) !== String(playId)) return;
                const after = data.after || null;
                // Run the queued callback (if any)
                if (_pbPlayer._after && typeof _pbPlayer._after === 'function') {
                    try { _pbPlayer._after(after); } catch (_) {}
                }
                _pbPlayer._after = null;
                return;
            }
        });

        function requestProcessPlayback(agentId, trace, opts = {}) {
            const subtitle = opts.subtitle || '';
            const after = (typeof opts.after === 'function') ? opts.after : null;
            const forceOpen = !!opts.forceOpen;

            if (!agentId || !Array.isArray(trace) || trace.length === 0) {
                if (after) after(null);
                return;
            }

            // Open the modal (or keep it open)
            if (forceOpen || document.getElementById('process-playback-modal')?.classList.contains('hidden')) {
                _openProcessPlaybackModal(agentId, subtitle);
            } else {
                _setPlaybackSubtitle(subtitle);
            }

            const playId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            _pbPlayer.playId = playId;
            _pbPlayer._after = after;
            _pbPlayer.last = { agentId, trace, subtitle };

            // If iframe already ready, play immediately; otherwise queue until PB_PLAYER_READY
            if (_pbPlayer.ready && _pbPlayer.agentId === agentId) {
                _postToPlaybackFrame({ type: 'PB_PLAYER_PLAY_TRACE', playId, trace });
            } else {
                _pbPlayer.pending = { playId, trace, after: null, subtitle };
                _openProcessPlaybackModal(agentId, subtitle);
            }
        }

        function _parseCurrentProcessDefinition() {
            const agent = currentProcessAgent;
            if (!agent) return {};
            let def = agent.process_definition;
            if (typeof def === 'string') {
                try { def = def ? JSON.parse(def) : {}; } catch (_) { def = {}; }
            }
            if (!def || typeof def !== 'object') def = {};
            return def;
        }

        function _getProcessEdges(def) {
            const raw = def.edges || def.connections || def.links || [];
            if (!Array.isArray(raw)) return [];
            return raw.map(e => ({
                from: e.from || e.source,
                to: e.to || e.target,
                type: e.type || e.edge_type || e.edgeType || 'default'
            })).filter(e => e.from && e.to);
        }

        function buildPlaybackTraceFromExecution(execution) {
            const def = _parseCurrentProcessDefinition();
            const edges = _getProcessEdges(def);
            const edgeTypeByKey = new Map(edges.map(e => [`${e.from}=>${e.to}`, e.type || 'default']));
            const lookup = getProcessNodeLookup();

            const execStatus = String(execution?.status || '').toLowerCase();
            const currentId = String(execution?.current_step || execution?.current_node_id || '').trim();
            const statusById = {};
            try {
                (execution?.completed_steps || []).forEach(id => { if (id) statusById[String(id)] = 'completed'; });
            } catch (_) {}
            if (currentId) {
                statusById[currentId] = (
                    execStatus === 'waiting' ? 'waiting' :
                    execStatus === 'failed' ? 'failed' :
                    execStatus === 'paused' ? 'paused' :
                    execStatus || 'running'
                );
            }
            const execErr = friendlyErrorMessage(execution?.error?.message || execution?.error_message || '', '');

            const seq = [];
            const seen = new Set();
            const push = (id) => {
                const s = String(id || '').trim();
                if (!s) return;
                if (seen.has(s)) return;
                seen.add(s);
                seq.push(s);
            };

            // Ensure we start from the trigger/start node when available
            const startNode = Array.isArray(def.nodes)
                ? def.nodes.find(n => ['trigger', 'form', 'start'].includes(String(n?.type || '').toLowerCase()))
                : null;
            if (startNode && startNode.id) push(startNode.id);

            (execution?.completed_steps || []).forEach(push);
            if (execution?.current_step) push(execution.current_step);

            // Safety: if run stopped (waiting/failed), never animate beyond current node
            if ((execStatus === 'waiting' || execStatus === 'failed' || execStatus === 'paused' || execStatus === 'cancelled' || execStatus === 'timed_out') && currentId) {
                const cut = seq.indexOf(currentId);
                if (cut >= 0) seq.splice(cut + 1);
            }

            // Build trace for the player (nodeId + edgeType for correct branch highlighting)
            const trace = seq.map((nodeId, idx) => {
                const prevId = idx > 0 ? seq[idx - 1] : null;
                let edgeType = null;
                if (prevId && prevId !== nodeId) {
                    const t = edgeTypeByKey.get(`${prevId}=>${nodeId}`);
                    edgeType = (t && t !== 'default') ? t : null;
                }
                const info = lookup[nodeId] || {};
                return {
                    nodeId,
                    edgeType,
                    type: info.type || 'step',
                    title: info.name || 'Step',
                    status_key: statusById[nodeId] || '',
                    terminal: nodeId === currentId && (statusById[nodeId] === 'failed' || statusById[nodeId] === 'waiting' || statusById[nodeId] === 'paused' || statusById[nodeId] === 'cancelled' || statusById[nodeId] === 'timed_out'),
                    error: (nodeId === currentId && statusById[nodeId] === 'failed') ? String(execErr || '') : null
                };
            });
            return trace;
        }

        async function buildPlaybackTraceForExecution(executionId, execution) {
            const execId = String(executionId || execution?.id || execution?.execution_id || '').trim();
            if (!execId) return buildPlaybackTraceFromExecution(execution);
            try {
                const headers = getAuthHeaders();
                const res = await fetch(API + `/process/executions/${encodeURIComponent(execId)}/steps`, { headers });
                let data = null;
                try { data = await res.json(); } catch (_) { data = null; }
                const steps = (data && Array.isArray(data.steps)) ? data.steps : [];
                if (res.ok && steps.length) {
                    const def = _parseCurrentProcessDefinition();
                    const edges = _getProcessEdges(def);
                    const edgeTypeByKey = new Map(edges.map(e => [`${e.from}=>${e.to}`, e.type || 'default']));
                    const lookup = getProcessNodeLookup();
                    const sorted = steps
                        .filter(s => s && s.node_id)
                        .slice()
                        .sort((a, b) => (a.order || 0) - (b.order || 0));
                    const trace = sorted.map((s, idx) => {
                        const nodeId = String(s.node_id || '').trim();
                        const prevId = (idx > 0 && sorted[idx - 1] && sorted[idx - 1].node_id) ? String(sorted[idx - 1].node_id) : null;
                        let edgeType = null;
                        if (prevId && prevId !== nodeId) {
                            const t = edgeTypeByKey.get(`${prevId}=>${nodeId}`);
                            edgeType = (t && t !== 'default') ? t : null;
                        }
                        const info = lookup[nodeId] || {};
                        return {
                            nodeId,
                            edgeType,
                            type: info.type || String(s.node_type || 'step').toLowerCase(),
                            title: info.name || s.step_name || 'Step',
                            status: s.status || null,
                            error: s.error || null
                        };
                    });
                    return trace;
                }
            } catch (_) {
                // ignore and fall back
            }
            return buildPlaybackTraceFromExecution(execution);
        }

        function _formatMaybeDateTime(d) {
            try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return '';
                return dt.toLocaleString();
            } catch (_) {
                return '';
            }
        }

        function _renderReportValue(v) {
            if (v == null) return '—';
            if (typeof v === 'string') return v.trim() ? v : '—';
            if (typeof v === 'number' || typeof v === 'boolean') return String(v);
            if (typeof v === 'object') {
                // Uploaded file reference (hide server path; show name only)
                try {
                    if (v && v.kind === 'uploadedFile' && (v.name || v.id)) {
                        const name = v.name || 'Uploaded file';
                        const size = (typeof v.size === 'number') ? `${Math.round(v.size / 1024)} KB` : '';
                        const typ = v.file_type ? String(v.file_type).toUpperCase() : '';
                        const meta = [typ, size].filter(Boolean).join(' · ');
                        return meta ? `${name} (${meta})` : name;
                    }
                } catch (_) {}
            }
            try {
                const s = JSON.stringify(v);
                if (!s) return '—';
                return s.length > 240 ? (s.slice(0, 240) + '…') : s;
            } catch (_) {
                const s = String(v);
                return s.length > 240 ? (s.slice(0, 240) + '…') : s;
            }
        }

        function _renderIoValue(v) {
            if (v == null) return '—';
            if (typeof v === 'string') return v.trim() ? escHtml(v) : '—';
            if (typeof v === 'number' || typeof v === 'boolean') return escHtml(String(v));
            if (typeof v === 'object') {
                // Uploaded file reference (sanitized by API)
                if (v.kind === 'uploadedFile' && (v.name || v.id)) {
                    const name = v.name || 'Uploaded file';
                    const size = (typeof v.size === 'number') ? `${Math.round(v.size / 1024)} KB` : '';
                    const typ = v.file_type ? String(v.file_type).toUpperCase() : '';
                    const meta = [typ, size].filter(Boolean).join(' · ');
                    const btn = v.id ? `
                        <button
                            type="button"
                            class="text-xs px-2 py-1 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200"
                            data-upload-file-id="${escHtml(String(v.id))}"
                            data-upload-file-name="${escHtml(String(name))}"
                        >Download</button>
                    ` : '';
                    return `${escHtml(name)}${meta ? ` <span class="text-xs text-gray-500">(${escHtml(meta)})</span>` : ''}${btn ? ` <span class="ml-2 inline-block">${btn}</span>` : ''}`;
                }
            }
            try {
                const s = JSON.stringify(v);
                if (!s) return '—';
                const t = s.length > 1800 ? (s.slice(0, 1800) + '…') : s;
                return escHtml(t);
            } catch (_) {
                const s = String(v);
                const t = s.length > 1800 ? (s.slice(0, 1800) + '…') : s;
                return escHtml(t);
            }
        }

        async function downloadProcessUploadFile(fileId, filename) {
            const id = String(fileId || '').trim();
            if (!id) return;
            const name = String(filename || '').trim() || `upload-${id}`;
            try {
                const headers = getAuthHeaders();
                const res = await fetch(API + `/process/uploads/${encodeURIComponent(id)}/download`, { headers });
                if (!res.ok) {
                    let msg = res.statusText || 'Failed to download file';
                    try {
                        const data = await res.json().catch(() => null);
                        if (data && (data.detail || data.message || data.error)) msg = data.detail || data.message || data.error;
                    } catch (_) {}
                    try { showToast(String(msg || 'Failed to download file'), 'error'); } catch (_) {}
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
                try { showToast('Unable to download file', 'error'); } catch (_) {}
            }
        }

        async function _fetchExecutionStepsIo(executionId) {
            const execId = String(executionId || '').trim();
            if (!execId) return [];
            const headers = getAuthHeaders();
            const res = await fetch(API + `/process/executions/${encodeURIComponent(execId)}/steps?include_io=1`, { headers });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) return [];
            const steps = data?.steps || [];
            return Array.isArray(steps) ? steps : [];
        }

        function _renderIoTable(obj) {
            const o = (obj && typeof obj === 'object') ? obj : {};
            const entries = Object.entries(o || {});
            if (!entries.length) return `<div class="text-sm text-gray-500">—</div>`;
            const rows = entries.slice(0, 28).map(([k, v]) => `
                <div class="flex items-start justify-between gap-4 py-2 border-b border-gray-700/50">
                    <div class="text-sm text-gray-400">${escHtml(humanizeFieldLabel(k) || k)}</div>
                    <div class="text-sm text-gray-200 font-medium max-w-[66%] text-right break-words">${_renderIoValue(v)}</div>
                </div>
            `).join('');
            return `<div>${rows}</div>`;
        }

        async function _loadAndRenderStepIo(executionId) {
            const el = document.getElementById('process-test-report-stepio');
            if (!el) return;
            el.innerHTML = `<div class="text-sm text-gray-500 py-4">Loading step inputs & outputs…</div>`;
            let steps = [];
            try { steps = await _fetchExecutionStepsIo(executionId); } catch (_) { steps = []; }
            if (!steps.length) {
                el.innerHTML = `<div class="text-sm text-gray-500">No step details available for this run.</div>`;
                return;
            }
            steps.sort((a, b) => (a.order || 0) - (b.order || 0));
            const cards = steps.slice(0, 80).map((s) => {
                const info = (s && typeof s.status === 'object') ? s.status : {};
                const color = String(info?.color || '').toLowerCase();
                const stKey =
                    (info && (info.key || info.status || info.value)) ? String(info.key || info.status || info.value).toLowerCase() :
                    (color === 'green') ? 'completed' :
                    (color === 'red') ? 'failed' :
                    (color === 'yellow') ? 'waiting' :
                    (color === 'orange') ? 'paused' :
                    (color === 'blue') ? 'running' :
                    '';
                const icon = stKey === 'completed' ? '✅' : stKey === 'failed' ? '❌' : (stKey === 'waiting' || stKey === 'paused') ? '⏳' : '🔄';
                const badge = stKey === 'completed'
                    ? `<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">Completed</span>`
                    : stKey === 'failed'
                        ? `<span class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">Failed</span>`
                        : (stKey === 'waiting' || stKey === 'paused')
                            ? `<span class="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold">Waiting</span>`
                            : `<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-semibold">Running</span>`;
                const name = s.step_name || s.step_type || 'Step';
                const dur = s.duration_seconds != null ? `${s.duration_seconds}s` : '';
                const inputs = (s && s.input) ? s.input : {};
                const outputs = (s && s.output) ? s.output : {};
                return `
                    <details class="p-4 rounded-xl border border-gray-700 bg-gray-900/40">
                        <summary class="cursor-pointer select-none">
                            <div class="flex items-center justify-between gap-3">
                                <div class="flex items-center gap-3 min-w-0">
                                    <div class="text-lg">${icon}</div>
                                    <div class="min-w-0">
                                        <div class="font-semibold text-gray-100 truncate">${escHtml(name)}</div>
                                        <div class="text-xs text-gray-500">${escHtml(humanizeNodeType(s.step_type))}${dur ? ` · ${escHtml(dur)}` : ''}</div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2 flex-shrink-0">${badge}</div>
                            </div>
                        </summary>
                        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="p-3 rounded-lg border border-gray-700/70 bg-black/20">
                                <div class="text-sm font-semibold text-gray-100 mb-2">Inputs</div>
                                ${_renderIoTable(inputs)}
                            </div>
                            <div class="p-3 rounded-lg border border-gray-700/70 bg-black/20">
                                <div class="text-sm font-semibold text-gray-100 mb-2">Outputs</div>
                                ${_renderIoTable(outputs)}
                            </div>
                        </div>
                    </details>
                `;
            }).join('');
            el.innerHTML = `<div class="space-y-3">${cards}</div>`;

            // Enrich the "What happened" step cards with brief output summaries
            try {
                steps.forEach((s, idx) => {
                    const stepCard = document.querySelector(`[data-report-step-idx="${idx}"] .report-step-output`);
                    if (!stepCard) return;
                    const outputs = (s && s.output) ? s.output : {};
                    if (!outputs || typeof outputs !== 'object' || !Object.keys(outputs).length) return;
                    // Build a concise summary (max 5 key-value pairs, skip internal keys)
                    const skipKeys = new Set(['sent', 'channel', 'recipients_count', 'result', 'error', 'logs', '_internal']);
                    const entries = Object.entries(outputs).filter(([k]) => !skipKeys.has(k));
                    if (!entries.length) return;
                    const summaryRows = entries.slice(0, 5).map(([k, v]) => {
                        const label = humanizeFieldLabel ? humanizeFieldLabel(k) : k;
                        let val = v;
                        if (val && typeof val === 'object') {
                            try { val = JSON.stringify(val); } catch (_) { val = String(val); }
                        }
                        val = String(val || '');
                        if (val.length > 120) val = val.slice(0, 120) + '…';
                        return `<div class="flex gap-2"><span class="text-gray-500 flex-shrink-0">${escHtml(label)}:</span><span class="text-gray-300 truncate">${escHtml(val)}</span></div>`;
                    }).join('');
                    const moreText = entries.length > 5 ? `<div class="text-gray-500 text-xs mt-1">+${entries.length - 5} more fields</div>` : '';
                    stepCard.innerHTML = `<div class="text-xs space-y-1 pl-9 border-t border-gray-700/50 pt-2 mt-1">${summaryRows}${moreText}</div>`;
                    stepCard.classList.remove('hidden');
                });
            } catch (_) {}

            // Wire up authenticated downloads for uploaded file buttons
            try {
                el.querySelectorAll('button[data-upload-file-id]').forEach(btn => {
                    btn.addEventListener('click', async (ev) => {
                        try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
                        const id = btn.getAttribute('data-upload-file-id') || '';
                        const name = btn.getAttribute('data-upload-file-name') || '';
                        await downloadProcessUploadFile(id, name);
                    });
                });
            } catch (_) {}
        }

        function showProcessTestReport(execution, stepsResolved) {
            const modal = document.getElementById('process-test-report-modal');
            const body = document.getElementById('process-test-report-body');
            const title = document.getElementById('process-test-report-title');
            const subtitle = document.getElementById('process-test-report-subtitle');
            if (!modal || !body) return;

            const status = String(execution?.status || '').toLowerCase();
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';

            const inputData = execution?.input_data ?? execution?.trigger_input ?? {};
            const output = execution?.output ?? execution?.result ?? null;
            const errorMsg = friendlyErrorMessage(execution?.error?.message || execution?.error_message || (execution?.error && execution?.error.message) || '', '');

            if (title) title.textContent = isCompleted ? 'Test report' : (isFailed ? 'Test report (failed)' : 'Test report');
            if (subtitle) subtitle.textContent = execution?.created_at ? `Run started ${_formatMaybeDateTime(execution.created_at)}` : 'Summary of what happened in this run';

            const inputs = window._processInputs || [];
            const labelByKey = {};
            inputs.forEach(i => { if (i && i.id) labelByKey[i.id] = i.label || humanizeFieldLabel(i.id) || i.id; });

            const inputRows = Object.keys(inputData || {}).map(k => {
                const label = labelByKey[k] || humanizeFieldLabel(k) || k;
                const val = _renderReportValue(inputData[k]);
                return `
                    <div class="flex items-start justify-between gap-4 py-2 border-b border-gray-700/50">
                        <div class="text-sm text-gray-400">${escHtml(label)}</div>
                        <div class="text-sm text-gray-200 font-medium max-w-[60%] text-right break-words">${escHtml(val)}</div>
                    </div>
                `;
            }).join('') || `<div class="text-sm text-gray-500">No inputs.</div>`;

            const statusBadge = isCompleted
                ? `<span class="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">Completed</span>`
                : (isFailed
                    ? `<span class="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">Failed</span>`
                    : `<span class="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-semibold">In progress</span>`);

            const stepsHtml = (stepsResolved || []).map((s, idx) => {
                const icon = { completed: '✅', running: '🔄', pending: '⏳', failed: '❌', skipped: '⏭️' }[s.status] || '⏳';
                const cls = {
                    completed: 'border-green-500/30 bg-green-500/5',
                    running: 'border-yellow-500/30 bg-yellow-500/5',
                    pending: 'border-gray-600 bg-gray-800/50',
                    failed: 'border-red-500/30 bg-red-500/5',
                    skipped: 'border-gray-600 bg-gray-800/30'
                }[s.status] || 'border-gray-600 bg-gray-800/30';
                const typeBadge = s.typeLabel || humanizeNodeType(s.type) || '';
                return `
                    <div class="p-3 rounded-xl border ${cls}" data-report-step-idx="${idx}">
                        <div class="flex items-center gap-3">
                            <div class="text-lg">${icon}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-semibold text-gray-100 truncate">${escHtml(s.name || 'Step')}</div>
                                <div class="text-xs text-gray-500 uppercase">${escHtml(typeBadge)}</div>
                            </div>
                            <div class="text-xs text-gray-500">#${idx + 1}</div>
                        </div>
                        <div class="report-step-output mt-2 hidden"></div>
                    </div>
                `;
            }).join('') || `<div class="text-sm text-gray-500">No steps yet.</div>`;

            const outputHtml = isCompleted
                ? (output == null
                    ? `<div class="text-sm text-gray-500">No output was produced.</div>`
                    : (typeof output === 'string'
                        ? `<div class="text-sm text-gray-200 whitespace-pre-wrap">${escHtml(output)}</div>`
                        : (() => {
                            const entries = (output && typeof output === 'object') ? Object.entries(output) : [];
                            if (!entries.length) {
                                return `<div class="text-sm text-gray-200 whitespace-pre-wrap">${escHtml(_renderReportValue(output))}</div>`;
                            }
                            const rows = entries.slice(0, 24).map(([k, v]) => `
                                <tr class="border-b border-gray-700/50">
                                    <td class="py-2 pr-4 text-gray-400 font-medium whitespace-nowrap">${escHtml(humanizeFieldLabel(k) || k)}</td>
                                    <td class="py-2 text-gray-200">${escHtml(_renderReportValue(v))}</td>
                                </tr>
                            `).join('');
                            return `<div class="overflow-x-auto"><table class="w-full text-sm"><tbody>${rows}</tbody></table></div>`;
                        })()))
                : (isFailed
                    ? `<div class="text-sm text-red-300">${escHtml(errorMsg || 'The workflow failed. Please check configuration and try again.')}</div>`
                    : `<div class="text-sm text-gray-500">Result will appear when the workflow completes.</div>`);

            body.innerHTML = `
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <div class="text-lg font-bold text-gray-100">${escHtml(currentProcessAgent?.name || 'Workflow')}</div>
                        <div class="text-sm text-gray-400">${escHtml(currentProcessAgent?.goal || '')}</div>
                    </div>
                    <div>${statusBadge}</div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div class="p-4 rounded-xl border border-gray-700 bg-gray-900/40">
                        <div class="font-semibold text-gray-100 mb-3">Submitted information</div>
                        <div>${inputRows}</div>
                    </div>
                    <div class="p-4 rounded-xl border border-gray-700 bg-gray-900/40">
                        <div class="font-semibold text-gray-100 mb-3">What happened</div>
                        <div class="space-y-2">${stepsHtml}</div>
                    </div>
                </div>

                <div class="mt-4 p-4 rounded-xl border border-gray-700 bg-gray-900/40">
                    <div class="font-semibold text-gray-100 mb-2">Outcome</div>
                    ${outputHtml}
                </div>

                <div class="mt-4 p-4 rounded-xl border border-gray-700 bg-gray-900/40">
                    <div class="font-semibold text-gray-100 mb-3">Step inputs & outputs</div>
                    <div id="process-test-report-stepio" class="text-sm text-gray-500">Loading…</div>
                </div>
            `;

            modal.classList.remove('hidden');

            // Load step I/O asynchronously (keeps UI snappy)
            const execId = execution?.id || execution?.execution_id || execution?.executionId;
            if (execId) {
                try { _loadAndRenderStepIo(execId); } catch (_) {}
            } else {
                const el = document.getElementById('process-test-report-stepio');
                if (el) el.innerHTML = `<div class="text-sm text-gray-500">Step details are not available.</div>`;
            }
        }

        async function loadInlineApprovalForExecution(executionId) {
            const detailsEl = document.getElementById('process-inline-approval-details');
            if (!detailsEl) return;
            const execId = String(executionId || '').trim();
            if (!execId) return;

            // Avoid hammering the server while polling
            const now = Date.now();
            if (_inlineApproval._loading) return;
            if (_inlineApproval._lastFetchAt && (now - _inlineApproval._lastFetchAt) < 1800) return;
            if (_inlineApproval.executionId === execId && _inlineApproval.approvalId) return;

            _inlineApproval._loading = true;
            _inlineApproval._lastFetchAt = now;
            _inlineApproval.executionId = execId;
            _inlineApproval.approvalId = null;

            detailsEl.innerHTML = `<div class="text-gray-500">Loading approval details…</div>`;

            try {
                const headers = getAuthHeaders();
                const [approvalRes, usersRes, rolesRes, groupsRes] = await Promise.all([
                    fetch(API + '/process/approvals?status=pending', { headers }),
                    fetch(API + '/api/security/users', { headers }).catch(() => ({ ok: false })),
                    fetch(API + '/api/security/roles', { headers }).catch(() => ({ ok: false })),
                    fetch(API + '/api/security/groups', { headers }).catch(() => ({ ok: false }))
                ]);

                if (!approvalRes.ok) {
                    detailsEl.innerHTML = `<div class="text-red-300">Could not load approval details.</div>`;
                    return;
                }

                const data = await approvalRes.json();
                const approvals = data.items || data.approvals || [];

                const getRunId = (a) => {
                    if (!a) return '';
                    return String(
                        a.process_execution_id ||
                        a.run_id ||
                        a.processExecutionId ||
                        a.runId ||
                        a.execution_id ||
                        a.executionId ||
                        ''
                    );
                };

                const match = (approvals || []).find(a => getRunId(a) === execId);
                if (!match) {
                    detailsEl.innerHTML = `<div class="text-gray-400">Approval is pending, but the approval request is not visible yet. This can take a few seconds. Please wait…</div>`;
                    return;
                }

                _inlineApproval.approvalId = match.id;

                let usersList = [], rolesList = [], groupsList = [];
                if (usersRes.ok) { const d = await usersRes.json(); usersList = Array.isArray(d) ? d : (d.users || []); }
                if (rolesRes.ok) { const d = await rolesRes.json(); rolesList = Array.isArray(d) ? d : (d.roles || []); }
                if (groupsRes.ok) { const d = await groupsRes.json(); groupsList = Array.isArray(d) ? d : (d.groups || []); }
                const userMap = Object.fromEntries(usersList.map(u => [String(u.id), u.name || u.email || u.id]));
                const roleMap = Object.fromEntries(rolesList.map(r => [String(r.id), r.name || r.id]));
                const groupMap = Object.fromEntries(groupsList.map(g => [String(g.id), g.name || g.id]));

                const assigneeType = String(match.assignee_type || '').toLowerCase();
                const u = (match.assigned_user_ids || []).map(id => userMap[String(id)] || id);
                const r = (match.assigned_role_ids || []).map(id => roleMap[String(id)] || id);
                const g = (match.assigned_group_ids || []).map(id => groupMap[String(id)] || id);
                let assignedTo = 'Anyone';
                if (assigneeType === 'user' && u.length) assignedTo = u.join(', ');
                else if (assigneeType === 'role' && r.length) assignedTo = `Role(s): ${r.join(', ')}`;
                else if (assigneeType === 'group' && g.length) assignedTo = `Group(s): ${g.join(', ')}`;
                else if ((u.length || r.length || g.length) && assigneeType) {
                    assignedTo = (u.length ? u.join(', ') : r.length ? `Role(s): ${r.join(', ')}` : `Group(s): ${g.join(', ')}`);
                }

                const urgency = match.urgency || match.priority || 'normal';
                const title = match.title || match.step_name || match.node_name || 'Approval';
                const desc = match.description || '';
                const reviewData = match.details_to_review || match.review_data || match.detailsToReview || {};

                const renderReviewData = (rd) => {
                    if (!rd) return '';
                    if (typeof rd === 'string') {
                        try { rd = JSON.parse(rd); } catch (_) { return `<div class="text-sm text-gray-200 whitespace-pre-wrap">${escHtml(rd)}</div>`; }
                    }
                    if (typeof rd !== 'object' || rd === null) return '';
                    const entries = Object.entries(rd).filter(([k, v]) => v !== undefined && v !== null && v !== '');
                    if (!entries.length) return '';
                    const rows = entries.slice(0, 24).map(([k, v]) => `
                        <tr class="border-b border-gray-700/50">
                            <td class="py-2 pr-4 text-gray-400 font-medium whitespace-nowrap">${escHtml(humanizeFieldLabel(k) || k)}</td>
                            <td class="py-2 text-gray-200">${escHtml(_renderReportValue(v))}</td>
                        </tr>
                    `).join('');
                    return `<div class="overflow-x-auto"><table class="w-full text-sm"><tbody>${rows}</tbody></table></div>`;
                };

                const reviewHtml = renderReviewData(reviewData);
                detailsEl.innerHTML = `
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="font-semibold text-gray-100">${escHtml(title)}</div>
                            ${desc ? `<div class="text-sm text-gray-300 mt-1">${escHtml(desc)}</div>` : ''}
                            <div class="text-xs text-gray-500 mt-2">Assigned to: <span class="text-gray-300">${escHtml(assignedTo)}</span></div>
                        </div>
                        <span class="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">${escHtml(humanizeUrgency(urgency))}</span>
                    </div>
                    ${reviewHtml ? `
                        <div class="mt-4 p-4 rounded-lg bg-gray-900/40 border border-gray-700/60">
                            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details to review</div>
                            ${reviewHtml}
                        </div>
                    ` : ''}
                `;
            } catch (e) {
                detailsEl.innerHTML = `<div class="text-red-300">Could not load approval details.</div>`;
            } finally {
                _inlineApproval._loading = false;
            }
        }

        async function approveInlineApproval() {
            const approvalId = _inlineApproval.approvalId;
            if (!approvalId) {
                showToast('Approval details are not ready yet. Please wait a moment.', 'warning');
                return;
            }
            const comments = (document.getElementById('process-inline-approval-comments')?.value || '').trim();
            try {
                const response = await fetch(API + `/process/approvals/${approvalId}/decide`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ decision: 'approved', comments })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    const rawMsg = (err && err.detail) ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : '';
                    showToast(friendlyErrorMessage(rawMsg, 'Could not approve this request. Please try again.'), 'error');
                    return;
                }
                showToast('Approved. Continuing workflow…', 'success');
                // Clear inline approval state; polling will update UI
                _inlineApproval.approvalId = null;
                const c = document.getElementById('process-inline-approval-comments');
                if (c) c.value = '';
            } catch (e) {
                showToast('Could not approve request', 'error');
            }
        }

        async function rejectInlineApproval() {
            const approvalId = _inlineApproval.approvalId;
            if (!approvalId) {
                showToast('Approval details are not ready yet. Please wait a moment.', 'warning');
                return;
            }
            const comments = (document.getElementById('process-inline-approval-comments')?.value || '').trim();
            if (!comments) {
                const ok = confirm('Reject without a comment?');
                if (!ok) return;
            }
            try {
                const response = await fetch(API + `/process/approvals/${approvalId}/decide`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ decision: 'rejected', comments: comments || 'Rejected' })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    const rawMsg = (err && err.detail) ? (typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail)) : '';
                    showToast(friendlyErrorMessage(rawMsg, 'Could not reject this request. Please try again.'), 'error');
                    return;
                }
                showToast('Rejected.', 'success');
                _inlineApproval.approvalId = null;
                const c = document.getElementById('process-inline-approval-comments');
                if (c) c.value = '';
            } catch (e) {
                showToast('Could not reject request', 'error');
            }
        }
        
        // Open Process Execution Modal
        async function openProcessExecution(agentId) {
            try {
                // Fetch agent details
                const response = await fetch(API + '/api/agents/' + agentId, {
                    headers: getAuthHeaders()
                });
                
                if (!response.ok) {
                    showToast('Could not load workflow', 'error');
                    return;
                }
                
                currentProcessAgent = await response.json();
                
                // Update modal header
                document.getElementById('process-modal-title').textContent = currentProcessAgent.name || 'Workflow';
                document.getElementById('process-modal-subtitle').textContent = currentProcessAgent.goal || 'Submit data to run this workflow';
                
                // Try LLM-enriched form fields (professional labels from process context)
                let enrichedFields = null;
                try {
                    const enrichRes = await fetch(API + '/process/enrich-form-fields', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                        body: JSON.stringify({ agent_id: agentId })
                    });
                    if (enrichRes.ok) {
                        const data = await enrichRes.json();
                        if (data.fields && data.fields.length) enrichedFields = data.fields;
                    }
                } catch (_) { /* use fallback */ }
                
                // Build dynamic form (use enriched labels if available)
                buildProcessForm(currentProcessAgent, enrichedFields);
                
                // Show trigger form, hide status
                document.getElementById('process-trigger-form').classList.remove('hidden');
                document.getElementById('process-execution-status').classList.add('hidden');
                document.getElementById('process-pending-approval').classList.add('hidden');
                try { closeProcessTestReport(); } catch (_) {}
                try { closeProcessPlaybackModal(); } catch (_) {}
                
                // Show modal
                document.getElementById('process-execution-modal').classList.remove('hidden');
                
            } catch(e) {
                console.error('Error opening process execution:', e);
                showToast('Could not load workflow: ' + e.message, 'error');
            }
        }
        
        // Build Dynamic Form from Process Definition (optionally with LLM-enriched labels)
        function humanizeFieldLabel(key) {
            if (!key) return '';
            const raw = String(key).trim();
            if (!raw) return '';
            // Map well-known technical keys to business-friendly labels
            const knownLabels = {
                'trigger_input': 'Submitted Information',
                'requested_by': 'Requested By',
                'requester_email': 'Requester Email',
                'requester_name': 'Requester Name',
                'requester_id': 'Requester',
                'manager_id': 'Manager',
                'manager_name': 'Manager Name',
                'manager_email': 'Manager Email',
                'department_id': 'Department',
                'department_name': 'Department',
                'employee_id': 'Employee ID',
                'job_title': 'Job Title',
                'org_id': 'Organization',
                'user_id': 'User',
                'created_at': 'Submitted On',
                'updated_at': 'Last Updated',
                'start_date': 'Start Date',
                'end_date': 'End Date',
                'due_date': 'Due Date',
                'total_amount': 'Total Amount',
                'is_manager': 'Is Manager',
                'group_ids': 'Groups',
                'role_ids': 'Roles',
                '_user_context': null,
            };
            const lower = raw.toLowerCase();
            if (lower in knownLabels) {
                return knownLabels[lower] === null ? '' : knownLabels[lower];
            }
            let s = raw;
            s = s.replace(/_/g, ' ');
            s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
            s = s.replace(/\s+/g, ' ').trim();
            if (!s) return '';
            return s.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
        }

        /** Map technical node/step types to business-friendly labels */
        function humanizeNodeType(type) {
            const map = {
                'human_task': 'Task',
                'approval': 'Approval',
                'condition': 'Decision',
                'notification': 'Notification',
                'email': 'Email',
                'trigger': 'Start',
                'form': 'Form',
                'start': 'Start',
                'end': 'Complete',
                'tool': 'Automated Action',
                'script': 'Automated Action',
                'api_call': 'Integration',
                'webhook': 'Integration',
                'delay': 'Wait',
                'timer': 'Scheduled',
                'parallel': 'Parallel Steps',
                'loop': 'Repeated Step',
                'subprocess': 'Sub-Process',
            };
            const key = String(type || '').toLowerCase().trim();
            return map[key] || humanizeFieldLabel(key) || 'Step';
        }

        /** Map technical urgency values to business-friendly labels */
        function humanizeUrgency(urgency) {
            const map = {
                'high': 'Urgent',
                'critical': 'Critical',
                'normal': 'Normal',
                'medium': 'Normal',
                'low': 'Low Priority',
            };
            const key = String(urgency || '').toLowerCase().trim();
            return map[key] || urgency || 'Normal';
        }

        /** Sanitize error messages — hide technical details from business users */
        function friendlyErrorMessage(rawMsg, fallback) {
            const msg = String(rawMsg || '').trim();
            const fb = fallback || 'Something went wrong. Please try again.';
            if (!msg) return fb;
            if (/traceback|stack trace|internal server/i.test(msg)) return fb;
            if (/sqlalchemy|database|sql|connection refused|errno/i.test(msg)) return 'A system error occurred. Please try again or contact support.';
            if (/500|502|503|504/.test(msg) && msg.length < 20) return fb;
            if (/keyerror|typeerror|attributeerror|valueerror|importerror/i.test(msg)) return fb;
            if (/null|undefined|NoneType/i.test(msg) && msg.length < 50) return fb;
            return msg;
        }

        function _splitArgs(argStr) {
            const s = String(argStr || '');
            const out = [];
            let cur = '';
            let q = null;
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (q) {
                    if (ch === q) { q = null; cur += ch; continue; }
                    cur += ch;
                    continue;
                }
                if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
                if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
                cur += ch;
            }
            if (cur.trim()) out.push(cur.trim());
            return out;
        }

        function _resolveArgToken(token, values) {
            const t = String(token || '').trim();
            if (!t) return '';
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
            if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
            const key = t.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
            return (values && key in values) ? values[key] : '';
        }

        function evaluateDerivedExpression(expression, values) {
            const expr = String(expression || '').trim();
            if (!expr) return '';
            if (/^[A-Za-z][A-Za-z0-9_]*$/.test(expr)) return (values && expr in values) ? values[expr] : '';
            const m = expr.match(/^([A-Za-z][A-Za-z0-9_]*)\s*\((.*)\)\s*$/);
            if (!m) return '';
            const fn = m[1];
            const args = _splitArgs(m[2]).map(a => _resolveArgToken(a, values));
            const toNum = (v) => {
                if (typeof v === 'number') return v;
                const n = parseFloat(String(v || '').trim());
                return Number.isFinite(n) ? n : 0;
            };
            const toStr = (v) => (v == null ? '' : String(v));
            const toDate = (v) => {
                const s = String(v || '').trim();
                if (!s) return null;
                const d = new Date(s);
                return isNaN(d.getTime()) ? null : d;
            };
            switch (fn) {
                case 'daysBetween': {
                    const d1 = toDate(args[0]);
                    const d2 = toDate(args[1]);
                    if (!d1 || !d2) return '';
                    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
                    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
                    return Math.floor((utc2 - utc1) / 86400000) + 1;
                }
                case 'concat':
                    return args.map(toStr).join('');
                case 'sum':
                    return args.reduce((acc, v) => acc + toNum(v), 0);
                case 'round': {
                    const n = toNum(args[0]);
                    const p = Math.max(0, Math.min(8, Math.floor(toNum(args[1] ?? 0))));
                    const f = Math.pow(10, p);
                    return Math.round(n * f) / f;
                }
                case 'toNumber':
                    return toNum(args[0]);
                default:
                    return '';
            }
        }

        function collectProcessFormValues(triggerInputs) {
            const values = {};
            (triggerInputs || []).forEach(input => {
                const el = document.getElementById(`pf-${input.id}`);
                values[input.id] = el ? el.value : '';
            });
            return values;
        }

        function recomputeProcessDerivedFields(triggerInputs) {
            const derivedInputs = (triggerInputs || []).filter(i => i && i.derived && i.derived.expression);
            if (!derivedInputs.length) return;
            const values = collectProcessFormValues(triggerInputs);
            derivedInputs.forEach(di => {
                const el = document.getElementById(`pf-${di.id}`);
                if (!el) return;
                const v = evaluateDerivedExpression(di.derived.expression, values);
                const text = (v == null) ? '' : String(v);
                el.value = text;
                values[di.id] = text;
            });
        }

        /**
         * DYNAMIC user prefill resolver — works with ANY attribute.
         * Instead of a hardcoded list, this searches through:
         *   1. Direct properties on currentUser (from /auth/me)
         *   2. currentUser.profile (nested profile data)
         *   3. currentUser.custom_attributes (HR/LDAP custom fields)
         *   4. currentUser.department (nested department object)
         * Supports camelCase keys (from AI) mapped to snake_case data.
         */
        function getCurrentUserPrefillValue(key) {
            const k = String(key || '').trim();
            if (!currentUser) return '';

            const aliases = {
                'name': ['full_name', 'name', 'display_name'],
                'firstName': ['first_name'],
                'lastName': ['last_name'],
                'orgId': ['org_id'],
                'managerId': ['manager_id'],
                'managerName': ['manager_name'],
                'managerEmail': ['manager_email'],
                'departmentId': ['department_id'],
                'departmentName': ['department_name'],
                'jobTitle': ['job_title'],
                'employeeId': ['employee_id'],
                'isManager': ['is_manager'],
                'roleNames': ['role_names'],
                'groupNames': ['group_names'],
                'groupIds': ['group_ids'],
                'roleIds': ['role_ids'],
                'directReportCount': ['direct_report_count'],
                'hireDate': ['hire_date'],
                'officeLocation': ['office_location'],
                'costCenter': ['cost_center'],
                'nationalId': ['national_id'],
                'badgeNumber': ['badge_number'],
            };

            const toSnake = s => s.replace(/([A-Z])/g, '_$1').toLowerCase();
            const snakeKey = toSnake(k);
            const candidates = [k, snakeKey, ...(aliases[k] || [])];

            const layers = [
                currentUser,
                currentUser.profile || {},
                currentUser.custom_attributes || {},
                currentUser.department || {},
            ];

            for (const candidate of candidates) {
                for (const layer of layers) {
                    const val = layer[candidate];
                    if (val !== undefined && val !== null && val !== '') {
                        return _formatPrefillValue(val);
                    }
                }
            }

            if (k === 'roles' || k === 'roleNames') {
                const arr = currentUser.role_names || currentUser.roles;
                if (Array.isArray(arr)) return arr.map(r => r?.name || r?.id || r).filter(Boolean).join(', ');
            }
            if (k === 'groups' || k === 'groupNames') {
                const arr = currentUser.group_names || currentUser.groups;
                if (Array.isArray(arr)) return arr.map(g => g?.name || g?.id || g).filter(Boolean).join(', ');
            }

            return '';
        }

        function _formatPrefillValue(val) {
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return String(val);
            if (typeof val === 'number') return String(val);
            if (Array.isArray(val)) return val.map(v => (typeof v === 'object' && v !== null) ? (v.name || v.label || v.id || JSON.stringify(v)) : String(v)).filter(Boolean).join(', ');
            if (typeof val === 'object') return val.name || val.label || val.id || JSON.stringify(val);
            return String(val);
        }

        function applyProcessPrefill(triggerInputs) {
            (triggerInputs || []).forEach(input => {
                if (!input || !input.prefill || input.prefill.source !== 'currentUser') return;
                const el = document.getElementById(`pf-${input.id}`);
                if (!el) return;
                const v = getCurrentUserPrefillValue(input.prefill.key);
                if (v !== '') el.value = v;
            });
        }

        function setupProcessDerivedFields(triggerInputs) {
            const derivedInputs = (triggerInputs || []).filter(i => i && i.derived && i.derived.expression);
            if (!derivedInputs.length) return;

            const recompute = () => recomputeProcessDerivedFields(triggerInputs);

            (triggerInputs || []).forEach(input => {
                if (!input || (input.derived && input.derived.expression) || input.readOnly) return;
                const el = document.getElementById(`pf-${input.id}`);
                if (!el) return;
                // Avoid duplicate listeners if this is called multiple times
                if (el.dataset && el.dataset.pbDerivedWired === '1') return;
                el.addEventListener('input', recompute);
                el.addEventListener('change', recompute);
                if (el.dataset) el.dataset.pbDerivedWired = '1';
            });

            recompute();
        }

        function buildProcessForm(agent, enrichedFields) {
            const formContainer = document.getElementById('process-form-fields');
            let triggerInputs = [];
            const startFieldMap = {};

            // Normalize: API may return process_definition as JSON string (e.g. from DB)
            let processDef = agent.process_definition;
            if (typeof processDef === 'string') {
                try { processDef = processDef ? JSON.parse(processDef) : null; } catch (_) { processDef = null; }
            }
            if (!processDef || typeof processDef !== 'object') processDef = {};

            // Process Builder: trigger or form node with config.fields (source of truth for ordering + derived fields)
            if (processDef.nodes && Array.isArray(processDef.nodes)) {
                const triggerNode = processDef.nodes.find(n => (n.type === 'trigger' || n.type === 'form' || n.type === 'start'));
                if (triggerNode) {
                    const config = triggerNode.config || {};
                    const typeConfig = config.type_config || config;
                    const fields = typeConfig.fields || config.fields || [];
                    if (Array.isArray(fields) && fields.length) {
                        triggerInputs = fields
                            .filter(f => f && (f.name || f.id))
                            .map(f => {
                                const id = f.name || f.id;
                                const label = f.label || humanizeFieldLabel(id) || id;
                                const derived = (f.derived && f.derived.expression) ? { expression: String(f.derived.expression).trim() } : null;
                                const prefill = (f.prefill && f.prefill.source === 'currentUser' && f.prefill.key)
                                    ? { source: 'currentUser', key: String(f.prefill.key).trim() }
                                    : null;
                                const readOnly = !!f.readOnly || !!derived || !!prefill;
                                const required = !!f.required && !readOnly;
                                const options = Array.isArray(f.options) ? f.options : undefined;
                                const placeholder = f.placeholder || (label ? `Enter ${label}...` : '');
                                const out = {
                                    id,
                                    label,
                                    type: f.type || 'text',
                                    required,
                                    placeholder,
                                    options,
                                    description: f.description,
                                    derived,
                                    prefill,
                                    readOnly
                                };
                                startFieldMap[id] = out;
                                return out;
                            });
                    }
                }
            }

            // Legacy: processDef.trigger.inputs
            if (!triggerInputs.length && processDef && processDef.trigger && processDef.trigger.inputs) {
                triggerInputs = processDef.trigger.inputs;
            }

            // Fallback: Use LLM-enriched fields when available (business-friendly labels)
            if (!triggerInputs.length && enrichedFields && enrichedFields.length) {
                triggerInputs = enrichedFields.map(f => ({
                    id: f.id,
                    label: f.label || humanizeFieldLabel(f.id) || f.id,
                    type: f.type || 'text',
                    required: !!f.required,
                    placeholder: f.placeholder || '',
                    options: f.options,
                    description: f.description
                }));
            }

            // Overlay enriched labels/descriptions while preserving derived/readOnly from definition
            if (enrichedFields && enrichedFields.length && triggerInputs.length) {
                const enrichedById = new Map(enrichedFields.map(f => [f.id, f]));
                triggerInputs = triggerInputs.map(base => {
                    const e = enrichedById.get(base.id);
                    if (!e) return base;
                    return {
                        ...base,
                        label: e.label || base.label || humanizeFieldLabel(base.id) || base.id,
                        placeholder: e.placeholder || base.placeholder || '',
                        description: e.description || base.description,
                        required: (e.required != null) ? (!!e.required && !(base.readOnly || (base.derived && base.derived.expression))) : base.required,
                        options: e.options || base.options
                    };
                });
            }
            
            // If no inputs defined, create a minimal business-friendly form (no hard-coded patterns)
            if (!triggerInputs.length) {
                triggerInputs = [
                    { id: 'details', label: 'Details', type: 'textarea', required: true, placeholder: 'Enter details…' }
                ];
            }
            
            // Build form HTML (with optional description from LLM)
            formContainer.innerHTML = triggerInputs.map(input => {
                const required = input.required ? '<span style="color: var(--danger);">*</span>' : '';
                const fieldId = `pf-${input.id}`;
                const descHtml = input.description ? `<p class="text-xs mt-0.5 mb-1" style="color: var(--text-muted);">${input.description}</p>` : '';
                const isReadOnly = !!(input.readOnly || (input.derived && input.derived.expression));
                const isPrefilled = !!input.prefill;
                const isDerived = !!(input.derived && input.derived.expression);
                const roStyle = isReadOnly ? 'style="opacity: 0.7; cursor: not-allowed; background: rgba(255,255,255,0.03);"' : '';
                
                let fieldHtml = '';
                switch(input.type) {
                    case 'textarea':
                        fieldHtml = `<textarea id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" rows="3" placeholder="${input.placeholder || ''}" ${input.required ? 'required' : ''} ${isReadOnly ? 'readonly' : ''} ${roStyle}></textarea>`;
                        break;
                    case 'select':
                        fieldHtml = `<select id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" ${input.required ? 'required' : ''} ${isReadOnly ? 'disabled' : ''} ${roStyle}>
                            <option value="">Select...</option>
                            ${(input.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>`;
                        break;
                    case 'file':
                        const multiFile = input.multiple ? 'multiple' : '';
                        fieldHtml = `<input type="file" id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" ${input.required ? 'required' : ''} ${multiFile}>`;
                        break;
                    case 'number':
                        fieldHtml = `<input type="number" id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" placeholder="${input.placeholder || ''}" ${input.required ? 'required' : ''} ${isReadOnly ? 'readonly' : ''} ${roStyle}>`;
                        break;
                    case 'date':
                        fieldHtml = `<input type="date" id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" ${input.required ? 'required' : ''} ${isReadOnly ? 'readonly' : ''} ${roStyle}>`;
                        break;
                    case 'email':
                        fieldHtml = `<input type="email" id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" placeholder="${input.placeholder || ''}" ${input.required ? 'required' : ''} ${isReadOnly ? 'readonly' : ''} ${roStyle}>`;
                        break;
                    default:
                        fieldHtml = `<input type="text" id="${fieldId}" class="input-field w-full rounded-lg px-4 py-3" placeholder="${input.placeholder || ''}" ${input.required ? 'required' : ''} ${isReadOnly ? 'readonly' : ''} ${roStyle}>`;
                }

                // Helper text for read-only fields
                let readOnlyHint = '';
                if (isPrefilled) {
                    readOnlyHint = `<span class="flex items-center gap-1 text-xs mt-1" style="color: var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Auto-filled from your profile</span>`;
                } else if (isDerived) {
                    readOnlyHint = `<span class="flex items-center gap-1 text-xs mt-1" style="color: var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Automatically calculated</span>`;
                }
                
                return `
                    <div>
                        <label class="text-sm mb-1 block" style="color: var(--text-secondary);">${input.label} ${required}</label>
                        ${descHtml}
                        ${fieldHtml}
                        ${readOnlyHint}
                    </div>
                `;
            }).join('');
            
            // Wire derived fields (auto-calculated) and store input config for later
            applyProcessPrefill(triggerInputs);
            setupProcessDerivedFields(triggerInputs);
            window._processInputs = triggerInputs;
        }
        
        async function uploadProcessRunFile(fileObj) {
            const tokenHeaders = getAuthHeaders();
            if (!tokenHeaders || !tokenHeaders.Authorization) {
                throw new Error('You are not signed in.');
            }
            const fd = new FormData();
            fd.append('file', fileObj);
            const res = await fetch(API + '/process/uploads', {
                method: 'POST',
                headers: {
                    ...tokenHeaders
                },
                body: fd
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) {
                const msg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : (res.statusText || 'Failed to upload file');
                throw new Error(String(msg || 'Failed to upload file'));
            }
            const f = (data && data.file) ? data.file : data;
            if (!f || !f.id) throw new Error('File upload failed.');
            return f;
        }

        // Execute the Process
        async function executeProcess() {
            if (!currentProcessAgent) {
                showToast('No workflow selected', 'error');
                return;
            }
            
            // Collect form data
            const triggerData = {};
            const inputs = window._processInputs || [];

            // Ensure derived fields are up to date before collecting values
            recomputeProcessDerivedFields(inputs);
            
            for (const input of inputs) {
                const field = document.getElementById(`pf-${input.id}`);
                if (field) {
                    if (input.type === 'file') {
                        const fileList = field.files || [];
                        if (input.required && fileList.length === 0) {
                            showToast(`Please upload: ${input.label}`, 'error');
                            field.focus();
                            return;
                        }
                        if (fileList.length > 0) {
                            try {
                                showToast(`Uploading: ${input.label}`, 'info');
                            } catch (_) {}
                            if (input.multiple && fileList.length > 1) {
                                const uploaded = [];
                                for (let fi = 0; fi < fileList.length; fi++) {
                                    uploaded.push(await uploadProcessRunFile(fileList[fi]));
                                }
                                triggerData[input.id] = uploaded;
                            } else {
                                triggerData[input.id] = await uploadProcessRunFile(fileList[0]);
                            }
                        } else {
                            triggerData[input.id] = null;
                        }
                        continue;
                    }
                    const value = (field.value || '').trim();
                    if (input.required && !value) {
                        showToast(`Please fill in: ${input.label}`, 'error');
                        field.focus();
                        return;
                    }
                    triggerData[input.id] = input.type === 'number' ? (parseFloat(value) || 0) : value;
                }
            }
            
            // Switch to execution status view
            document.getElementById('process-trigger-form').classList.add('hidden');
            document.getElementById('process-execution-status').classList.remove('hidden');
            // Reset approval UI state (this run may or may not require approvals)
            try {
                _inlineApproval.approvalId = null;
                _inlineApproval.executionId = null;
                _inlineApproval._loading = false;
                _inlineApproval._lastFetchAt = 0;
                const detailsEl = document.getElementById('process-inline-approval-details');
                if (detailsEl) detailsEl.innerHTML = `<div class="text-gray-500">Loading approval details…</div>`;
                const c = document.getElementById('process-inline-approval-comments');
                if (c) c.value = '';
            } catch (_) {}
            
            // Update status badge
            updateExecutionStatus('running', 'Processing...', 'Your workflow is running');
            
            try {
                // Call execution API
                const response = await fetch(API + '/process/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        agent_id: currentProcessAgent.id,
                        trigger_input: triggerData,
                        trigger_type: 'manual'
                    })
                });
                
                if (!response.ok) {
                    const errBody = await response.json().catch(() => ({}));
                    const d = errBody.detail;
                    const msg = typeof d === 'string' ? d : (d && (d.detail || d.message || d.msg)) ? (d.detail || d.message || d.msg) : (d ? JSON.stringify(d) : 'Execution failed');
                    throw new Error(msg);
                }
                
                const execution = await response.json();
                currentExecutionId = execution.id || execution.execution_id;
                
                if (!currentExecutionId) {
                    updateExecutionStatus('failed', 'Execution Failed', 'No execution ID returned from server.');
                    return;
                }
                // Hide result section until completed; reset submitted-data toggle
                const outEl = document.getElementById('process-output');
                if (outEl) outEl.classList.add('hidden');
                const toggle = document.getElementById('process-submitted-data-toggle');
                if (toggle) { const s = toggle.querySelector('span'); if (s) s.textContent = '▼'; }
                const submittedPre = document.getElementById('process-submitted-data-content');
                if (submittedPre) submittedPre.classList.add('hidden');
                // Start polling for status
                startExecutionPolling(currentExecutionId);
                
                // Show initial steps
                if (execution.nodes) {
                    updateExecutionSteps(execution.nodes);
                }
                
            } catch(e) {
                console.error('Execution error:', e);
                // Show more helpful error message
                let errorMsg = e.message || 'Something went wrong';
                if (errorMsg.includes('not found') || errorMsg.includes('404')) {
                    errorMsg = 'Workflow execution service is starting up. Please try again in a moment.';
                } else if (errorMsg.includes('Failed to fetch')) {
                    errorMsg = 'Could not connect to server. Please check your connection.';
                }
                updateExecutionStatus('failed', 'Execution Failed', errorMsg);
            }
        }
        
        // Build a lookup from node id → { name, type, typeLabel } from current process definition
        function getProcessNodeLookup() {
            const agent = currentProcessAgent;
            if (!agent) return {};
            let def = agent.process_definition;
            if (typeof def === 'string') {
                try { def = def ? JSON.parse(def) : {}; } catch (_) { def = {}; }
            }
            if (!def || !Array.isArray(def.nodes)) return {};
            const typeLabels = {
                start: 'Start', trigger: 'Start', form: 'Start',
                task: 'Task', condition: 'Decision', approval: 'Approval',
                notification: 'Notification', end: 'End', human_task: 'Review'
            };
            const out = {};
            def.nodes.forEach(n => {
                const type = (n.type || 'task').toLowerCase();
                out[n.id] = {
                    name: n.name || n.id || 'Step',
                    type: type,
                    typeLabel: typeLabels[type] || 'Step'
                };
            });
            return out;
        }
        
        // Resolve step IDs to { name, type, typeLabel, status } using process definition
        function resolveStepsFromIds(completedIds, currentId) {
            const lookup = getProcessNodeLookup();
            const resolve = (id, status) => {
                const info = lookup[id];
                return {
                    name: info ? info.name : id,
                    type: info ? info.type : 'step',
                    typeLabel: info ? info.typeLabel : 'Step',
                    status
                };
            };
            const completed = (completedIds || []).map(id => resolve(id, 'completed'));
            const current = currentId ? [resolve(currentId, 'running')] : [];
            return completed.concat(current);
        }
        
        // Update Execution Status Badge
        function updateExecutionStatus(status, title, subtitle) {
            const badge = document.getElementById('process-status-badge');
            
            const statusStyles = {
                running: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', color: 'text-yellow-400', icon: '<div class="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full"></div>' },
                completed: { bg: 'bg-green-500/10', border: 'border-green-500/30', color: 'text-green-400', icon: '✅' },
                failed: { bg: 'bg-red-500/10', border: 'border-red-500/30', color: 'text-red-400', icon: '❌' },
                pending_approval: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', color: 'text-orange-400', icon: '⏳' },
                paused: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', color: 'text-blue-400', icon: '⏸️' }
            };
            
            const style = statusStyles[status] || statusStyles.running;
            
            badge.className = `mb-4 p-4 rounded-lg ${style.bg} border ${style.border}`;
            badge.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="text-2xl">${style.icon}</div>
                    <div>
                        <p class="font-medium ${style.color}">${title}</p>
                        <p class="text-sm text-gray-400">${subtitle}</p>
                    </div>
                </div>
            `;
            
            // Show pending approval section if needed
            if (status === 'pending_approval') {
                document.getElementById('process-pending-approval').classList.remove('hidden');
            } else {
                document.getElementById('process-pending-approval').classList.add('hidden');
            }
        }
        
        // Update Execution Steps List (node: name, typeLabel, status; typeLabel is business-friendly)
        function updateExecutionSteps(nodes) {
            const container = document.getElementById('process-steps-list');
            
            container.innerHTML = nodes.map((node, i) => {
                const statusIcon = {
                    completed: '✅',
                    running: '🔄',
                    pending: '⏳',
                    failed: '❌',
                    skipped: '⏭️'
                }[node.status] || '⏳';
                
                const statusClass = {
                    completed: 'border-green-500/30 bg-green-500/5',
                    running: 'border-yellow-500/30 bg-yellow-500/5',
                    pending: 'border-gray-600 bg-gray-800/50',
                    failed: 'border-red-500/30 bg-red-500/5',
                    skipped: 'border-gray-600 bg-gray-800/30'
                }[node.status] || 'border-gray-600';
                
                const displayName = node.name || humanizeNodeType(node.type);
                const displayType = node.typeLabel != null ? node.typeLabel : humanizeNodeType(node.type);
                
                return `
                    <div class="p-3 rounded-lg border ${statusClass} transition-all">
                        <div class="flex items-center gap-3">
                            <span class="text-lg">${statusIcon}</span>
                            <div class="flex-1">
                                <p class="font-medium">${escHtml(displayName)}</p>
                                <p class="text-xs text-gray-500">${escHtml(displayType)}</p>
                            </div>
                            ${node.duration_ms ? `<span class="text-xs text-gray-500">${node.duration_ms}ms</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Poll for Execution Status
        function startExecutionPolling(executionId) {
            if (!executionId) return;
            executionPollStopped = false;
            // Clear any existing polling
            if (executionPollInterval) {
                clearInterval(executionPollInterval);
                executionPollInterval = null;
            }
            
            executionPollInterval = setInterval(async () => {
                if (executionPollStopped) return;
                try {
                    const response = await fetch(API + `/process/executions/${executionId}`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401) {
                            executionPollStopped = true;
                            if (executionPollInterval) { clearInterval(executionPollInterval); executionPollInterval = null; }
                            if (typeof showToast === 'function') showToast('Session expired. Please log in again.', 'error');
                            if (typeof updateExecutionStatus === 'function') updateExecutionStatus('failed', 'Session expired', 'Please log in again to view status.');
                        }
                        return;
                    }
                    
                    const execution = await response.json();
                    
                    // Update status (show actual error message when failed)
                    // Backend sends "waiting" when at approval; treat as "Waiting for Approval"
                    const statusTitles = {
                        running: 'Processing...',
                        completed: 'Completed',
                        failed: 'Failed',
                        pending_approval: 'Waiting for Approval',
                        waiting: 'Waiting for Approval',
                        paused: 'Paused'
                    };
                    const displayStatus = execution.status === 'waiting' ? 'pending_approval' : execution.status;
                    let subtitle = execution.current_step || execution.current_node_name || '';
                    if (execution.status === 'failed' && (execution.error && execution.error.message)) {
                        subtitle = friendlyErrorMessage(execution.error.message, 'Process encountered an error.');
                    } else if (execution.status === 'failed' && execution.error_message) {
                        subtitle = friendlyErrorMessage(execution.error_message, 'Process encountered an error.');
                    }
                    updateExecutionStatus(
                        displayStatus,
                        statusTitles[execution.status] || statusTitles[displayStatus] || execution.status,
                        subtitle
                    );
                    
                    // Update steps: use node_executions if present, else build from completed_steps + current_step with resolved names
                    let resolvedStepsForReport = [];
                    if (execution.node_executions && execution.node_executions.length) {
                        const lookup = getProcessNodeLookup();
                        const resolved = execution.node_executions.map(ne => {
                            const info = lookup[ne.node_id || ne.id];
                            return {
                                name: info ? info.name : (ne.node_name || ne.node_id || ne.id || 'Step'),
                                typeLabel: info ? info.typeLabel : humanizeNodeType(ne.type),
                                type: ne.type,
                                status: ne.status || 'completed',
                                duration_ms: ne.duration_ms
                            };
                        });
                        updateExecutionSteps(resolved);
                        resolvedStepsForReport = resolved;
                    } else if (execution.completed_steps || execution.current_step) {
                        const steps = resolveStepsFromIds(execution.completed_steps || [], execution.current_step);
                        updateExecutionSteps(steps);
                        resolvedStepsForReport = steps;
                    }
                    
                    // Milestones: waiting for approval / completed / failed
                    if (execution.status === 'waiting') {
                        if (_markMilestone(executionId, 'waiting')) {
                            try {
                                const lookup = getProcessNodeLookup();
                                const curId = execution?.current_step || execution?.current_node_id || '';
                                const curName = (curId && lookup[curId] && lookup[curId].name) ? lookup[curId].name : 'Approval';
                                const trace = await buildPlaybackTraceForExecution(executionId, execution);
                                requestProcessPlayback(
                                    currentProcessAgent?.id,
                                    trace,
                                    {
                                        subtitle: `Stopped at: ${curName} (Waiting for approval)`,
                                        after: () => {
                                            try { loadInlineApprovalForExecution(executionId); } catch (_) {}
                                            try { closeProcessPlaybackModal(); } catch (_) {}
                                            try {
                                                setTimeout(() => {
                                                    const el = document.getElementById('process-pending-approval');
                                                    if (el && !el.classList.contains('hidden')) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                }, 80);
                                            } catch (_) {}
                                        },
                                        forceOpen: true
                                    }
                                );
                            } catch (_) {
                                // Ignore playback errors (workflow can still be approved and resumed)
                            }
                        } else {
                            // Keep trying to load approval details if not found yet (approval may be created shortly after status flips)
                            try { loadInlineApprovalForExecution(executionId); } catch (_) {}
                        }
                    }

                    if (execution.status === 'completed') {
                        if (executionPollInterval) clearInterval(executionPollInterval);
                        executionPollInterval = null;

                        // Keep the in-modal UI business-friendly (no JSON by default)
                        const outEl = document.getElementById('process-output');
                        const summaryEl = document.getElementById('process-result-summary');
                        const resultBodyEl = document.getElementById('process-result-body');
                        const submittedWrap = document.getElementById('process-submitted-data-wrap');
                        if (outEl) outEl.classList.remove('hidden');
                        if (summaryEl) summaryEl.textContent = 'Completed successfully. A report is ready.';
                        if (resultBodyEl) resultBodyEl.classList.add('hidden');
                        if (submittedWrap) submittedWrap.classList.add('hidden');

                        if (_markMilestone(executionId, 'completed')) {
                            const snap = execution; // capture
                            const stepsSnap = resolvedStepsForReport.slice();
                            try {
                                const trace = await buildPlaybackTraceForExecution(executionId, snap);
                                requestProcessPlayback(
                                    currentProcessAgent?.id,
                                    trace,
                                    {
                                        subtitle: 'Completed path',
                                        after: () => showProcessTestReport(snap, stepsSnap),
                                        forceOpen: true
                                    }
                                );
                            } catch (_) {
                                // Fallback: show report even if playback fails
                                try { showProcessTestReport(snap, stepsSnap); } catch (_) {}
                            }
                        }
                    }

                    if (execution.status === 'failed') {
                        if (_markMilestone(executionId, 'failed')) {
                            const snap = execution;
                            const stepsSnap = resolvedStepsForReport.slice();
                            try {
                                const lookup = getProcessNodeLookup();
                                const curId = snap?.current_step || snap?.current_node_id || '';
                                const curName = (curId && lookup[curId] && lookup[curId].name) ? lookup[curId].name : 'Step';
                                const trace = await buildPlaybackTraceForExecution(executionId, snap);
                                requestProcessPlayback(
                                    currentProcessAgent?.id,
                                    trace,
                                    {
                                        subtitle: `Stopped at: ${curName} (Error)`,
                                        after: () => showProcessTestReport(snap, stepsSnap),
                                        forceOpen: true
                                    }
                                );
                            } catch (_) {
                                try { showProcessTestReport(snap, stepsSnap); } catch (_) {}
                            }
                        }
                    }
                    
                    // Stop polling on terminal states
                    if (['completed', 'failed', 'cancelled'].includes(execution.status)) {
                        if (executionPollInterval) clearInterval(executionPollInterval);
                        executionPollInterval = null;
                    }
                    
                } catch(e) {
                    console.error('Polling error:', e);
                }
            }, 2000); // Poll every 2 seconds
        }
        
        // Close Process Modal
        function closeProcessModal() {
            document.getElementById('process-execution-modal').classList.add('hidden');
            if (executionPollInterval) {
                clearInterval(executionPollInterval);
            }
            try { closeProcessTestReport(); } catch (_) {}
            try { closeProcessPlaybackModal(); } catch (_) {}
            try {
                const frame = document.getElementById('process-playback-frame');
                if (frame) frame.src = 'about:blank';
                _pbPlayer.ready = false;
                _pbPlayer.agentId = null;
                _pbPlayer.playId = null;
                _pbPlayer.pending = null;
                _pbPlayer.last = null;
            } catch (_) {}
            currentProcessAgent = null;
            currentExecutionId = null;
        }
        
        // View Execution History
        async function viewExecutionHistory() {
            if (!currentProcessAgent) return;
            
            try {
                const response = await fetch(API + `/process/executions?agent_id=${currentProcessAgent.id}&limit=10`, {
                    headers: getAuthHeaders()
                });
                
                if (!response.ok) {
                    showToast('Could not load history', 'error');
                    return;
                }
                
                const data = await response.json();
                const executions = data.executions || [];
                
                // Show in a simple alert for now (can be enhanced later)
                if (executions.length === 0) {
                    showToast('No execution history yet', 'info');
                } else {
                    const historyHtml = executions.map(e => 
                        `${e.status === 'completed' ? '✅' : e.status === 'failed' ? '❌' : '🔄'} ${new Date(e.created_at).toLocaleString()} - ${e.status}`
                    ).join('\n');
                    alert('Execution History:\n\n' + historyHtml);
                }
            } catch(e) {
                showToast('Could not load history', 'error');
            }
        }
