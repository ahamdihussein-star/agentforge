// ===== STATE =====
        const state = {
            nodes: [],
            connections: [],
            selectedNode: null,
            selectedLabelNodeId: null,
            selectedNodeIds: [],
            goal: '',
            zoom: 1,
            panX: 0,
            panY: 0,
            isDragging: false,
            isConnecting: false,
            connectionStart: null,
            draggingEdgeEnd: null,
            draggingEdgeStart: null,
            draggingBendPoint: null,
            justDropped: false,
            consumeNextClick: false,
            flowDirection: 'vertical',
            draggingLabel: null,
            draggingConnectionLabel: null,
            boxSelect: null,
            connectionDebugLog: typeof window !== 'undefined' && (window.processBuilderConnDebug === true || /[?&]connDebug=1/.test(window.location.search || '')),
            lastDragDelta: null,
            justBoxSelected: false,
            labelFontSize: Math.min(24, Math.max(9, parseInt(localStorage.getItem('pb-label-font-size'), 10) || 11)),
            tools: [],
            agentId: null,
            undoStack: [],
            redoStack: [],
            connectionHoverNode: null,
            connectionHoverPort: null,
            connectionHoverPoint: null,
            connectionCompleted: false,
            processSettings: {}
        };
        
        // Node ID counter
        let nodeIdCounter = 1;
        
        function escapeHtml(s) {
            if (s == null) return '';
            const div = document.createElement('div');
            div.textContent = String(s);
            return div.innerHTML;
        }

        // ===== BUSINESS-FRIENDLY LABELS & FIELD KEYS =====
        function humanizeFieldLabel(key) {
            if (!key) return '';
            let s = String(key);
            // snake_case -> spaces
            s = s.replace(/_/g, ' ');
            // camelCase -> spaces
            s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
            // cleanup
            s = s.replace(/\s+/g, ' ').trim();
            if (!s) return '';
            // Title Case
            return s.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
        }

        function toFieldKey(label) {
            if (!label) return '';
            let s = String(label).trim();
            if (!s) return '';
            // Keep alphanumerics and spaces only
            s = s.replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (!s) return '';
            const parts = s.split(' ').filter(Boolean);
            const first = parts.shift() || 'field';
            let key = first[0].toLowerCase() + first.slice(1);
            key += parts.map(p => p ? (p[0].toUpperCase() + p.slice(1)) : '').join('');
            // Ensure starts with a letter
            if (!/^[A-Za-z]/.test(key)) key = 'field' + key;
            return key;
        }

        function ensureUniqueKey(fields, desiredKey, fieldIndex) {
            const base = desiredKey || 'field';
            const used = new Set((fields || []).map((f, idx) => idx !== fieldIndex ? (f && (f.name || f.id)) : null).filter(Boolean));
            if (!used.has(base)) return base;
            let i = 2;
            while (used.has(`${base}${i}`)) i++;
            return `${base}${i}`;
        }

        function _isPlayerMode() {
            try {
                const params = new URLSearchParams(window.location.search || '');
                const v = String(params.get('player') || '').toLowerCase();
                const m = String(params.get('mode') || '').toLowerCase();
                return v === '1' || v === 'true' || m === 'player' || /[?&]player=1/.test(window.location.search || '');
            } catch (_) {
                return false;
            }
        }

        function _postToParent(msg) {
            try {
                if (!msg) return;
                if (!window.parent || window.parent === window) return;
                window.parent.postMessage(msg, window.location.origin);
            } catch (_) {
                // ignore
            }
        }

        function initPlayerMode() {
            const on = _isPlayerMode();
            state.playerMode = on;
            if (on) {
                try { document.body.classList.add('pb-player-mode'); } catch (_) {}
            }
        }

        function initPlayerMessaging() {
            window.addEventListener('message', async (event) => {
                try {
                    if (event.origin !== window.location.origin) return;
                } catch (_) { /* ignore */ }
                const data = event.data || {};
                if (!data || typeof data !== 'object') return;

                if (data.type === 'PB_PLAYER_PLAY_TRACE') {
                    const playId = data.playId || null;
                    try {
                        const trace = Array.isArray(data.trace) ? data.trace : [];
                        await playTestPlayback(trace);
                    } catch (_) {
                        // ignore playback errors in player mode
                    } finally {
                        _postToParent({ type: 'PB_PLAYER_PLAY_DONE', playId });
                    }
                    return;
                }

                if (data.type === 'PB_PLAYER_CLEAR') {
                    try { clearPlaybackHighlights(); } catch (_) {}
                    try { _hideBuildCursor(); } catch (_) {}
                    _postToParent({ type: 'PB_PLAYER_CLEARED' });
                    return;
                }
            });
        }
        
        // ===== INITIALIZATION =====
        document.addEventListener('DOMContentLoaded', () => {
            initPlayerMode();
            loadPlatformTheme();
            initCanvas();
            initPalette();
            initPaletteShapes();
            initDraftMessaging();
            initPlayerMessaging();
            loadTools();
            loadWorkflowFromUrl();
            updateFlowButtons();
            applyLabelFontSize();
            updateLabelFontSizeDisplay(state.labelFontSize);
        });

        // Receive generated workflows from the main app (prevents popup blockers + enables instant cinematic build)
        function initDraftMessaging() {
            window.addEventListener('message', (event) => {
                try {
                    if (event.origin !== window.location.origin) return;
                } catch (_) { /* ignore origin mismatch in some environments */ }
                const data = event.data || {};
                if (!data || data.type !== 'agentforge.workflow_draft') return;
                const workflow = data.workflow;
                const meta = data.meta || {};
                if (!workflow || typeof workflow !== 'object') return;
                try { stopDraftWaitPolling(); } catch (_) {}
                // Persist as a fallback (refresh-safe)
                try {
                    sessionStorage.setItem('agentforge_process_builder_draft', JSON.stringify(workflow));
                    sessionStorage.setItem('agentforge_process_builder_draft_meta', JSON.stringify({
                        goal: meta.goal || '',
                        name: meta.name || workflow.name || 'My Workflow',
                        animate: true
                    }));
                } catch (_) { /* ignore */ }
                // Start cinematic build immediately
                try { startBuildAnimation(workflow, { goal: meta.goal || '', name: meta.name || workflow.name || 'My Workflow' }); } catch (e) {
                    // Fallback: just apply definition
                    try { applyWorkflowDefinition(workflow, { goal: meta.goal || '', name: meta.name || workflow.name || 'My Workflow' }); } catch (_) {}
                }
            });
        }
        
        function setLabelFontSize(delta) {
            const clamp = (v) => Math.min(24, Math.max(9, v));
            const nodeForLabel = state.selectedNode || (state.selectedLabelNodeId ? state.nodes.find(n => n.id === state.selectedLabelNodeId) : null);
            if (nodeForLabel) {
                const node = nodeForLabel;
                const current = node.labelFontSize != null ? node.labelFontSize : state.labelFontSize;
                node.labelFontSize = clamp(current + delta);
                updateLabelFontSizeDisplay(node.labelFontSize);
                refreshNode(node);
                saveToUndo();
                return;
            }
            if (stateSelectedConnIndex !== null && state.connections[stateSelectedConnIndex] && (state.connections[stateSelectedConnIndex].type === 'yes' || state.connections[stateSelectedConnIndex].type === 'no')) {
                const conn = state.connections[stateSelectedConnIndex];
                const current = conn.labelFontSize != null ? conn.labelFontSize : state.labelFontSize;
                conn.labelFontSize = clamp(current + delta);
                updateLabelFontSizeDisplay(conn.labelFontSize);
                renderConnections();
                saveToUndo();
                return;
            }
            state.labelFontSize = clamp(state.labelFontSize + delta);
            localStorage.setItem('pb-label-font-size', String(state.labelFontSize));
            applyLabelFontSize();
            updateLabelFontSizeDisplay(state.labelFontSize);
        }
        function updateLabelFontSizeDisplay(px) {
            const el = document.getElementById('label-font-size-display');
            if (el) el.textContent = px + 'px';
        }
        /* تطبيق حجم الخط الافتراضي على كل التسميات (عند عدم تحديد عقدة/ربط) */
        function applyLabelFontSize() {
            const container = document.getElementById('canvas-container');
            if (container) container.style.setProperty('--label-font-size', state.labelFontSize + 'px');
            state.nodes.forEach(n => {
                const nodeEl = document.getElementById(n.id);
                if (!nodeEl) {
                    renderNode(n);
                    return;
                }
                const labelEl = nodeEl.querySelector('.node-label');
                if (labelEl) {
                    const fontSize = n.labelFontSize != null ? n.labelFontSize : state.labelFontSize;
                    labelEl.style.fontSize = fontSize + 'px';
                }
            });
            renderConnections();
        }
        
        function setFlowDirection(dir) {
            state.flowDirection = dir;
            updateFlowButtons();
            applyAutoLayout(dir);
            renderConnections();
        }
        
        function applyAutoLayout(direction) {
            if (state.nodes.length === 0) return;
            // Vertical (↕) = تدفق من أعلى لأسفل: المستوى يزيد مع y، والعقد في نفس المستوى جنب بعض (x يتغير)
            // Horizontal (↔) = تدفق من يسار ليمين: المستوى يزيد مع x، والعقد في نفس المستوى فوق بعض (y يتغير)
            const NODE_W = 72, NODE_H = 90, GAP_X = 100, GAP_Y = 80;
            const nodeIds = new Set(state.nodes.map(n => n.id));
            const incoming = {};
            const outgoing = {};
            state.nodes.forEach(n => { incoming[n.id] = []; outgoing[n.id] = []; });
            state.connections.forEach(c => {
                if (nodeIds.has(c.from) && nodeIds.has(c.to)) {
                    outgoing[c.from].push(c.to);
                    incoming[c.to].push(c.from);
                }
            });
            const startNodes = state.nodes.filter(n => incoming[n.id].length === 0);
            if (startNodes.length === 0) startNodes.push(state.nodes[0]);
            const levels = {};
            const queue = startNodes.map(n => ({ id: n.id, level: 0 }));
            queue.forEach(({ id, level }) => { levels[id] = Math.max(levels[id] || 0, level); });
            let i = 0;
            while (i < queue.length) {
                const { id, level } = queue[i++];
                outgoing[id].forEach(toId => {
                    const next = level + 1;
                    if (next > (levels[toId] || 0)) {
                        levels[toId] = next;
                        queue.push({ id: toId, level: next });
                    }
                });
            }
            state.nodes.forEach(n => { if (levels[n.id] === undefined) levels[n.id] = 0; });
            // ENFORCE: End nodes always on the deepest level
            let maxNonEndLevel = 0;
            state.nodes.forEach(n => {
                if (n.type !== 'end' && (levels[n.id] || 0) > maxNonEndLevel) maxNonEndLevel = levels[n.id];
            });
            state.nodes.forEach(n => {
                if (n.type === 'end') levels[n.id] = maxNonEndLevel + 1;
            });
            const byLevel = {};
            state.nodes.forEach(n => {
                const L = levels[n.id];
                if (!byLevel[L]) byLevel[L] = [];
                byLevel[L].push(n.id);
            });
            const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
            const baseX = 400, baseY = 80;
            for (let L = 0; L <= maxLevel; L++) {
                const ids = byLevel[L] || [];
                const count = ids.length;
                const totalW = count * NODE_W + Math.max(0, count - 1) * GAP_X;
                const totalH = count * NODE_H + Math.max(0, count - 1) * GAP_Y;
                const startX = baseX - (totalW - NODE_W) / 2;
                const startY = baseY - (totalH - NODE_H) / 2;
                ids.forEach((id, idx) => {
                    const node = state.nodes.find(n => n.id === id);
                    if (!node) return;
                    if (direction === 'vertical') {
                        // Vertical: المستويات صفوف (y يزيد مع المستوى)، نفس المستوى = نفس الصف (x يختلف)
                        node.x = Math.round((startX + idx * (NODE_W + GAP_X)) / 20) * 20;
                        node.y = Math.round((baseY + L * (NODE_H + GAP_Y)) / 20) * 20;
                    } else {
                        // Horizontal: المستويات أعمدة (x يزيد مع المستوى)، نفس المستوى = نفس العمود (y يختلف)
                        node.x = Math.round((baseX + L * (NODE_W + GAP_X)) / 20) * 20;
                        node.y = Math.round((startY + idx * (NODE_H + GAP_Y)) / 20) * 20;
                    }
                });
            }
            // توسيط الـ process في الشاشة حسب الاتجاه (vertical/horizontal)
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            state.nodes.forEach(n => {
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + NODE_W);
                maxY = Math.max(maxY, n.y + NODE_H);
            });
            const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
            const container = document.getElementById('canvas-container');
            if (container) {
                state.panX = container.clientWidth / 2 - centerX * state.zoom;
                state.panY = container.clientHeight / 2 - centerY * state.zoom;
            }
            /* إعادة تموضع تسميات Yes/No على الخطوط بعد تحريك العقد */
            state.connections.forEach(c => {
                if (c.type === 'yes' || c.type === 'no') delete c.labelOffset;
            });
            saveToUndo();
            document.getElementById('canvas').innerHTML = '';
            state.nodes.forEach(n => renderNode(n));
            updateConnectionsToClosestPorts();
            renderConnections();
            updateEmptyState();
            updateCanvasTransform();
        }
        
        function updateConnectionsToClosestPorts() {
            state.connections.forEach(conn => {
                const fromNode = document.getElementById(conn.from);
                const toNode = document.getElementById(conn.to);
                if (!fromNode || !toNode) return;
                const outKind = conn.type === 'yes' ? 'output-yes' : conn.type === 'no' ? 'output-no' : 'output';
                const pair = getClosestPortPair(fromNode, toNode, outKind);
                conn.fromPort = pair.fromSide;
                conn.toPort = pair.toSide;
            });
        }
        
        function alignProcess() {
            applyAutoLayout(state.flowDirection);
        }
        
        function updateFlowButtons() {
            const v = document.getElementById('flow-vertical');
            const h = document.getElementById('flow-horizontal');
            if (v) v.classList.toggle('active', state.flowDirection === 'vertical');
            if (h) h.classList.toggle('active', state.flowDirection === 'horizontal');
        }
        
        function initPaletteShapes() {
            document.querySelectorAll('.palette-item[data-type]').forEach(item => {
                const type = item.dataset.type;
                const iconEl = item.querySelector('.palette-icon');
                if (!iconEl) return;
                const shapeClass = getShapeClass(type);
                iconEl.innerHTML = getTypeSvgIcon(type);
                iconEl.classList.add('palette-shape-' + shapeClass.replace('shape-', ''));
            });
        }
        
        function loadPlatformTheme() {
            const theme = localStorage.getItem('agentforge-theme') || 'dark';
            if (theme !== 'dark') {
                document.documentElement.setAttribute('data-theme', theme);
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
        
        function initCanvas() {
            const container = document.getElementById('canvas-container');
            const canvas = document.getElementById('canvas');
            const connectionsInteractiveSvg = document.getElementById('connections-interactive-svg');
            
            /* تمرير النقر على المناطق الفارغة في طبقة المقابض/التسميات للـ canvas عشان العُقد تستقبل (سحب، تحديد) */
            function forwardSvgPointerToCanvas(e) {
                const t = e.target;
                if (t !== connectionsInteractiveSvg && t && (!t.nodeName || t.nodeName.toLowerCase() !== 'svg')) return;
                const prev = connectionsInteractiveSvg.style.pointerEvents;
                connectionsInteractiveSvg.style.pointerEvents = 'none';
                const under = document.elementFromPoint(e.clientX, e.clientY);
                connectionsInteractiveSvg.style.pointerEvents = prev;
                if (under && (under === canvas || canvas.contains(under))) {
                    const ev = new MouseEvent(e.type, { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, button: e.button, buttons: e.buttons, relatedTarget: e.relatedTarget });
                    under.dispatchEvent(ev);
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
            if (connectionsInteractiveSvg) {
                connectionsInteractiveSvg.addEventListener('mousedown', forwardSvgPointerToCanvas);
                connectionsInteractiveSvg.addEventListener('mouseup', forwardSvgPointerToCanvas);
                connectionsInteractiveSvg.addEventListener('click', forwardSvgPointerToCanvas);
            }
            
            // Pan (middle mouse) and box selection (left drag on empty area)
            let isPanning = false;
            let startX, startY;
            
            /** BPMN-style: box selection فقط على المساحة الفارغة فعلياً – استبعاد العُقد والمنافذ وخطوط الربط */
            function isEmptyArea(e) {
                if (state.isConnecting || state.connectionPreview) return false;
                const t = e.target;
                if (t !== container && t.id !== 'canvas' && t !== connectionsInteractiveSvg) return false;
                if (t.closest && (t.closest('.connection-hit-path') || t.closest('.connection-handles') || t.closest('.connection-label-badge'))) return false;
                const prev = connectionsInteractiveSvg ? connectionsInteractiveSvg.style.pointerEvents : '';
                if (connectionsInteractiveSvg) connectionsInteractiveSvg.style.pointerEvents = 'none';
                const under = document.elementFromPoint(e.clientX, e.clientY);
                if (connectionsInteractiveSvg) connectionsInteractiveSvg.style.pointerEvents = prev;
                if (under && under.closest && under.closest('.workflow-node')) return false;
                if (under && under.closest && under.closest('.port')) return false;
                return true;
            }
            
            container.addEventListener('mousedown', (e) => {
                if (e.button === 1) {
                    isPanning = true;
                    startX = e.clientX - state.panX;
                    startY = e.clientY - state.panY;
                    container.style.cursor = 'grabbing';
                } else if (e.button === 0 && isEmptyArea(e)) {
                    state.boxSelect = { startClientX: e.clientX, startClientY: e.clientY, addToSelection: e.ctrlKey || e.metaKey };
                    container.style.cursor = 'crosshair';
                    const box = document.getElementById('selection-box');
                    if (box) {
                        const r = container.getBoundingClientRect();
                        box.style.left = (e.clientX - r.left) + 'px';
                        box.style.top = (e.clientY - r.top) + 'px';
                        box.style.width = '0';
                        box.style.height = '0';
                        box.style.display = 'block';
                    }
                }
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isPanning) {
                    state.panX = e.clientX - startX;
                    state.panY = e.clientY - startY;
                    updateCanvasTransform();
                } else if (state.boxSelect) {
                    const box = document.getElementById('selection-box');
                    if (!box) return;
                    const r = container.getBoundingClientRect();
                    const x1 = Math.min(state.boxSelect.startClientX, e.clientX);
                    const y1 = Math.min(state.boxSelect.startClientY, e.clientY);
                    const x2 = Math.max(state.boxSelect.startClientX, e.clientX);
                    const y2 = Math.max(state.boxSelect.startClientY, e.clientY);
                    box.style.left = (x1 - r.left) + 'px';
                    box.style.top = (y1 - r.top) + 'px';
                    box.style.width = (x2 - x1) + 'px';
                    box.style.height = (y2 - y1) + 'px';
                }
            });
            
            document.addEventListener('mouseup', (e) => {
                if (e.button === 1) {
                    isPanning = false;
                    container.style.cursor = '';
                } else if (e.button === 0 && state.boxSelect) {
                    container.style.cursor = '';
                    const box = document.getElementById('selection-box');
                    if (box) box.style.display = 'none';
                    const x1 = Math.min(state.boxSelect.startClientX, e.clientX);
                    const y1 = Math.min(state.boxSelect.startClientY, e.clientY);
                    const x2 = Math.max(state.boxSelect.startClientX, e.clientX);
                    const y2 = Math.max(state.boxSelect.startClientY, e.clientY);
                    if (x2 - x1 > 4 || y2 - y1 > 4) {
                        const r = container.getBoundingClientRect();
                        const c1 = clientToCanvas(x1, y1);
                        const c2 = clientToCanvas(x2, y2);
                        const minX = Math.min(c1.x, c2.x), maxX = Math.max(c1.x, c2.x);
                        const minY = Math.min(c1.y, c2.y), maxY = Math.max(c1.y, c2.y);
                        const NODE_W = 72, NODE_H = 90;
                        const selected = state.nodes.filter(n => {
                            const nR = n.x + NODE_W;
                            const nB = n.y + NODE_H;
                            return n.x < maxX && nR > minX && n.y < maxY && nB > minY;
                        });
                        if (selected.length > 0) {
                            state.justBoxSelected = true;
                            setTimeout(() => { state.justBoxSelected = false; }, 0);
                            const addTo = state.boxSelect.addToSelection;
                            const newIds = selected.map(n => n.id);
                            if (addTo) {
                                const cur = new Set(state.selectedNodeIds.length ? state.selectedNodeIds : (state.selectedNode ? [state.selectedNode.id] : state.selectedLabelNodeId ? [state.selectedLabelNodeId] : []));
                                newIds.forEach(id => cur.add(id));
                                state.selectedNodeIds = Array.from(cur);
                            } else {
                                state.selectedNodeIds = newIds;
                            }
                            state.selectedNode = state.selectedNodeIds.length === 1 ? state.nodes.find(n => n.id === state.selectedNodeIds[0]) : null;
                            state.selectedLabelNodeId = null;
                            stateSelectedConnIndex = null;
                            updateSelectionUI();
                            if (state.selectedNodeIds.length === 1) showProperties(state.nodes.find(n => n.id === state.selectedNodeIds[0]));
                            else closeProperties();
                        }
                    }
                    state.boxSelect = null;
                }
            });
            
            // Trackpad / mouse wheel: PAN the canvas (Mac-friendly).
            // Zoom is intentionally handled via the on-canvas buttons (no wheel-to-zoom).
            const wheelPan = { raf: null, dx: 0, dy: 0 };
            container.addEventListener('wheel', (e) => {
                // Prevent page zoom/scroll (esp. pinch generates wheel+ctrlKey in Chrome)
                e.preventDefault();

                // Normalize deltas to pixels
                const mode = e.deltaMode; // 0=pixels, 1=lines, 2=pages
                const linePx = 16;
                const pagePx = Math.max(600, container.clientHeight || 800);
                const factor = mode === 1 ? linePx : mode === 2 ? pagePx : 1;

                let dx = (e.deltaX || 0) * factor;
                let dy = (e.deltaY || 0) * factor;

                // Common mouse behavior: Shift + wheel scrolls horizontally
                if (!dx && e.shiftKey) {
                    dx = dy;
                    dy = 0;
                }

                wheelPan.dx += dx;
                wheelPan.dy += dy;

                if (wheelPan.raf) return;
                wheelPan.raf = requestAnimationFrame(() => {
                    // Translate is in screen pixels. Use inverse deltas so scrolling "moves the view".
                    state.panX -= wheelPan.dx;
                    state.panY -= wheelPan.dy;
                    wheelPan.dx = 0;
                    wheelPan.dy = 0;
                    wheelPan.raf = null;
                    updateCanvasTransform();
                });
            }, { passive: false });
            
            // منع النقرة الأولى بعد الـ drop فقط (سبب ظهور properties الـ Start)
            document.addEventListener('click', (e) => {
                if (state.consumeNextClick) {
                    e.stopPropagation();
                    e.preventDefault();
                    state.consumeNextClick = false;
                }
            }, true);
            
            // Click on canvas to deselect
            container.addEventListener('click', (e) => {
                if (state.justDropped || state.justBoxSelected) return;
                if (e.target === container || e.target.id === 'canvas' || e.target === connectionsInteractiveSvg) {
                    deselectAll();
                    deselectConnection();
                }
            });
            
            // Keyboard: Undo, Redo, Delete, Select All
            document.addEventListener('keydown', (e) => {
                if (e.target.closest('input') || e.target.closest('textarea') || e.target.closest('select')) return;
                const ctrl = e.ctrlKey || e.metaKey;
                if (ctrl && e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redoAction();
                    else undoAction();
                    return;
                }
                if (ctrl && e.key === 'y') {
                    e.preventDefault();
                    redoAction();
                    return;
                }
                if (ctrl && e.key === 'a') {
                    e.preventDefault();
                    selectAllNodes();
                    return;
                }
                if (e.key !== 'Delete' && e.key !== 'Backspace') return;
                if (state.isDragging || state.draggingEdgeEnd || state.draggingEdgeStart || state.draggingBendPoint || state.draggingLabel || state.draggingConnectionLabel) return;
                e.preventDefault();
                if (stateSelectedConnIndex !== null) {
                    deleteConnection(stateSelectedConnIndex);
                } else {
                    deleteSelectedNodes();
                }
            });
        }
        
        function updateCanvasTransform() {
            const canvas = document.getElementById('canvas');
            const svg = document.getElementById('connections-svg');
            const svgInteractive = document.getElementById('connections-interactive-svg');
            canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
            svg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
            if (svgInteractive) svgInteractive.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
            renderConnections();
        }
        
        function initPalette() {
            const items = document.querySelectorAll('.palette-item[draggable="true"]');
            const canvas = document.getElementById('canvas');
            const container = document.getElementById('canvas-container');
            
            items.forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('nodeType', item.dataset.type);
                    e.dataTransfer.setData('toolId', item.dataset.toolId || '');
                });
            });
            
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                const type = e.dataTransfer.getData('nodeType');
                const toolId = e.dataTransfer.getData('toolId');
                
                if (type) {
                    const rect = container.getBoundingClientRect();
                    const x = (e.clientX - rect.left - state.panX) / state.zoom;
                    const y = (e.clientY - rect.top - state.panY) / state.zoom;
                    
                    state.justDropped = true;
                    state.consumeNextClick = true;
                    const node = createNode(type, x, y, toolId);
                    if (node) {
                        const newNodeId = node.id;
                        requestAnimationFrame(() => selectNode(newNodeId));
                        setTimeout(() => selectNode(newNodeId), 25);
                    }
                    setTimeout(() => { state.justDropped = false; }, 150);
                }
            });
        }
        
        // ===== NODE MANAGEMENT =====
        function createNode(type, x, y, toolId = null) {
            const id = 'node_' + nodeIdCounter++;
            
            const nodeConfig = getNodeConfig(type, toolId);
            
            const node = {
                id,
                type,
                name: nodeConfig.name,
                x: Math.round(x / 20) * 20, // Snap to grid
                y: Math.round(y / 20) * 20,
                config: nodeConfig.config,
                toolId
            };
            
            state.nodes.push(node);
            renderNode(node);
            saveToUndo();
            updateEmptyState();
            
            // Select the new node
            selectNode(id);
            
            return node;
        }
        
        function getNodeConfig(type, toolId = null) {
            const configs = {
                trigger: { name: 'Start', config: { triggerType: 'manual', formTitle: 'Request details', submitText: 'Submit', fields: [] } },
                schedule: { name: 'Schedule', config: { cron: '0 9 * * *', timezone: 'UTC' } },
                webhook: { name: 'Webhook', config: { method: 'POST', path: '/trigger' } },
                action: { name: 'Action', config: { description: '', actionType: 'custom' } },
                condition: { name: 'Condition', config: { field: '', operator: 'equals', value: '' } },
                loop: { name: 'For Each', config: { collection: '', itemVar: 'item' } },
                delay: { name: 'Wait', config: { duration: 5, unit: 'minutes' } },
                approval: { name: 'Approval', config: { assignee_source: 'platform_user', assignee_type: 'user', assignee_ids: [], timeout_hours: 24, message: '' } },
                form: { name: 'Form', config: { fields: [] } },
                notification: { name: 'Send Notification', config: { channel: 'email', template: '' } },
                tool: { name: 'Use Tool', config: { toolId: toolId || '', params: {} } },
                ai: { name: 'AI Task', config: { prompt: '', model: 'gpt-4o' } },
                end: { name: 'End', config: { output: '' } }
            };
            
            // If it's a tool node with toolId, get tool name
            if (type === 'tool' && toolId) {
                const tool = state.tools.find(t => t.id === toolId);
                if (tool) {
                    return { name: tool.name, config: { toolId, params: {} } };
                }
            }
            
            return configs[type] || { name: type, config: {} };
        }
        
        function getShapeClass(type) {
            if (['trigger', 'schedule', 'webhook'].includes(type)) return 'shape-start';
            if (type === 'end') return 'shape-end';
            if (type === 'condition') return 'shape-gateway';
            return 'shape-task';
        }
        
        function renderNode(node) {
            const canvas = document.getElementById('canvas');
            
            const nodeEl = document.createElement('div');
            const shapeClass = getShapeClass(node.type);
            // Defensive: drafts or engine-format payloads may have missing/invalid coordinates.
            const _x = Number(node && node.x);
            const _y = Number(node && node.y);
            const safeX = Number.isFinite(_x) ? _x : 0;
            const safeY = Number.isFinite(_y) ? _y : 0;
            node.x = safeX;
            node.y = safeY;

            const hasCustomLabel = !!(node.labelOffset && Number.isFinite(Number(node.labelOffset.x)) && Number.isFinite(Number(node.labelOffset.y)));
            nodeEl.className = 'workflow-node ' + shapeClass + (hasCustomLabel ? ' label-custom' : ' label-below');
            nodeEl.id = node.id;
            nodeEl.style.left = safeX + 'px';
            nodeEl.style.top = safeY + 'px';
            
            const typeClass = getTypeClass(node.type);
            const svgIcon = getTypeSvgIcon(node.type);
            const labelFontSize = Number.isFinite(Number(node.labelFontSize)) ? Number(node.labelFontSize) : null;
            const labelStyle = (hasCustomLabel ? `left:${Number(node.labelOffset.x)}px;top:${Number(node.labelOffset.y)}px;` : '') + (labelFontSize != null ? `font-size:${labelFontSize}px;` : '');
            const labelStyleAttr = labelStyle ? `style="${labelStyle}"` : '';
            const ports4 = ['top','right','bottom','left'].map(s => `<div class="port input input-${s}" data-side="${s}"></div>`).join('');
            /* عقدة القرار: Yes من اليسار، No من اليمين (default) – وكلاهما يدعم الأربع حواف */
            const outPorts = node.type === 'condition'
                ? '<div class="port output-yes output-yes-left" data-side="left"></div><div class="port output-no output-no-right" data-side="right"></div><div class="port output-yes output-yes-top" data-side="top"></div><div class="port output-yes output-yes-bottom" data-side="bottom"></div><div class="port output-yes output-yes-right" data-side="right"></div><div class="port output-no output-no-left" data-side="left"></div><div class="port output-no output-no-top" data-side="top"></div><div class="port output-no output-no-bottom" data-side="bottom"></div>'
                : node.type !== 'end' ? ['top','right','bottom','left'].map(s => `<div class="port output output-${s}" data-side="${s}"></div>`).join('') : '';
            nodeEl.innerHTML = `
                ${ports4}
                <div class="node-shape-wrap ${typeClass}">
                    <div class="node-shape">${svgIcon}</div>
                </div>
                <div class="node-label node-label-draggable" title="Drag to move label • Font size: use +/- in toolbar" ${labelStyleAttr}>${escapeHtml(node.name)}</div>
                <button class="node-menu-btn" onclick="event.stopPropagation(); showNodeMenu('${node.id}')">⋮</button>
                <div class="node-body">
                    <div class="node-config-preview">${getConfigPreview(node)}</div>
                </div>
                ${outPorts}
            `;
            
            // Make draggable
            makeDraggable(nodeEl, node);
            
            // Click: Ctrl+Click = toggle في الـ selection. بدون Ctrl: shape→selectNode، label→selectLabelOnly
            nodeEl.addEventListener('click', (e) => {
                if (e.target.closest('.port') || e.target.closest('.node-menu-btn')) return;
                e.stopPropagation();
                if (state.justDropped) return;
                if (e.ctrlKey || e.metaKey) {
                    toggleNodeInSelection(node.id, true);
                    return;
                }
                if (e.target.closest('.node-label')) {
                    selectLabelOnly(node.id);
                    return;
                }
                selectNode(node.id);
            }, true);
            
            // Double click to edit
            nodeEl.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                showProperties(node);
            });
            
            // Setup port connections
            setupPorts(nodeEl, node);
            
            const labelEl = nodeEl.querySelector('.node-label');
            if (labelEl) {
                labelEl.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    startDragLabel(node.id, e);
                });
            }
            
            canvas.appendChild(nodeEl);
        }
        
        function startDragLabel(nodeId, e) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            const nodeEl = document.getElementById(nodeId);
            const labelEl = nodeEl && nodeEl.querySelector('.node-label');
            if (!labelEl || !nodeEl) return;
            const nodeRect = nodeEl.getBoundingClientRect();
            const labelRect = labelEl.getBoundingClientRect();
            const zoom = state.zoom;
            const startLabelX = (labelRect.left - nodeRect.left) / zoom;
            const startLabelY = (labelRect.top - nodeRect.top) / zoom;
            const startFontSize = node.labelFontSize != null ? node.labelFontSize : state.labelFontSize;
            state.draggingLabel = { nodeId, startClientX: e.clientX, startClientY: e.clientY, startLabelX, startLabelY };
            if (!node.labelOffset) node.labelOffset = { x: startLabelX, y: startLabelY };
            nodeEl.classList.add('label-custom');
            nodeEl.classList.remove('label-below');
            labelEl.style.position = 'absolute';
            labelEl.style.transform = 'none';
            labelEl.style.left = startLabelX + 'px';
            labelEl.style.top = startLabelY + 'px';
            labelEl.style.fontSize = startFontSize + 'px';
            let didMove = false;
            const onMove = (e) => {
                if (!state.draggingLabel || state.draggingLabel.nodeId !== nodeId) return;
                const dx = (e.clientX - state.draggingLabel.startClientX) / state.zoom;
                const dy = (e.clientY - state.draggingLabel.startClientY) / state.zoom;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didMove = true;
                const x = state.draggingLabel.startLabelX + dx;
                const y = state.draggingLabel.startLabelY + dy;
                node.labelOffset = { x, y };
                labelEl.style.left = x + 'px';
                labelEl.style.top = y + 'px';
            };
            const onUp = () => {
                if (state.draggingLabel && state.draggingLabel.nodeId === nodeId) {
                    if (didMove) saveToUndo();
                    else selectLabelOnly(nodeId);
                    state.draggingLabel = null;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        
        function clientToCanvas(clientX, clientY) {
            const container = document.getElementById('canvas-container');
            if (!container) return { x: 0, y: 0 };
            const r = container.getBoundingClientRect();
            return {
                x: (clientX - r.left - state.panX) / state.zoom,
                y: (clientY - r.top - state.panY) / state.zoom
            };
        }
        
        function startDragConnectionLabel(connIndex, conn, startLx, startLy, startFontSize, e) {
            if (conn.type !== 'yes' && conn.type !== 'no') return;
            state.draggingConnectionLabel = {
                connIndex, conn,
                startClientX: e.clientX, startClientY: e.clientY,
                startLx, startLy
            };
            const onMove = (ev) => {
                if (!state.draggingConnectionLabel || state.draggingConnectionLabel.connIndex !== connIndex) return;
                const pt = clientToCanvas(ev.clientX, ev.clientY);
                const startPt = clientToCanvas(state.draggingConnectionLabel.startClientX, state.draggingConnectionLabel.startClientY);
                const dx = pt.x - startPt.x;
                const dy = pt.y - startPt.y;
                conn.labelOffset = { x: state.draggingConnectionLabel.startLx + dx, y: state.draggingConnectionLabel.startLy + dy };
                renderConnections();
            };
            const onUp = () => {
                if (state.draggingConnectionLabel && state.draggingConnectionLabel.connIndex === connIndex) {
                    saveToUndo();
                    state.draggingConnectionLabel = null;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                }
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        
        function getTypeClass(type) {
            const classes = {
                trigger: 'trigger', schedule: 'trigger', webhook: 'trigger',
                action: 'action', tool: 'tool', ai: 'ai', notification: 'notification',
                condition: 'condition',
                loop: 'loop',
                delay: 'delay',
                approval: 'approval', form: 'form',
                end: 'end'
            };
            return classes[type] || 'action';
        }
        
        function getTypeIcon(type) {
            const icons = {
                trigger: '🎯', schedule: '⏰', webhook: '🔗',
                action: '⚡', tool: '🔧', ai: '🤖', notification: '📧',
                condition: '🔀',
                loop: '🔁',
                delay: '⏳',
                approval: '✅', form: '📝',
                end: '🏁'
            };
            return icons[type] || '📦';
        }
        
        function getTypeSvgIcon(type) {
            const icons = {
                trigger: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>',
                schedule: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>',
                webhook: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
                action: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 3v6h8l-8 12v-6H5l8-12z"/></svg>',
                tool: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>',
                ai: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
                notification: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>',
                condition: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 12l10 10 10-10L12 2zm0 15.5L4.5 12 12 4.5 19.5 12 12 19.5z"/></svg>',
                loop: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
                delay: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
                approval: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/><path d="M18.5 10.5L16 13l-1.5-1.5 1-1L16 11l2.5-2.5 1 2z"/></svg>',
                form: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
                end: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/></svg>'
            };
            return icons[type] || icons.action;
        }
        
        function getNodeDescription(node) {
            const descs = {
                trigger: 'Workflow starts here',
                schedule: 'Runs on schedule',
                webhook: 'Triggered by API',
                action: 'Performs an operation',
                tool: 'Executes a platform tool',
                ai: 'AI-powered processing',
                condition: 'Branch based on condition',
                loop: 'Iterate over collection',
                delay: 'Wait before continuing',
                approval: 'Wait for approval',
                form: 'Collect user input',
                notification: 'Send notification',
                end: 'Workflow ends here'
            };
            return descs[node.type] || '';
        }
        
        function getConfigPreview(node) {
            const cfg = node.config || {};
            let html = '';
            
            switch (node.type) {
                case 'condition':
                    html = `<div class="node-config-item"><span class="config-label">If</span><span class="config-value">${cfg.field || 'field'} ${cfg.operator || '='} ${cfg.value || 'value'}</span></div>`;
                    break;
                case 'delay':
                    html = `<div class="node-config-item"><span class="config-label">Wait</span><span class="config-value">${cfg.duration || 5} ${cfg.unit || 'minutes'}</span></div>`;
                    break;
                case 'approval':
                    const src = cfg.assignee_source || (cfg.approvers && cfg.approvers.length ? 'platform_user' : '');
                    const cnt = (cfg.assignee_ids || cfg.approvers || []).length;
                    const toolName = (cfg.assignee_source === 'tool' && cfg.assignee_tool_id && state.tools) ? (state.tools.find(t => t.id === cfg.assignee_tool_id) || {}).name : '';
                    const dirLabel = {'dynamic_manager':'Direct Manager','department_manager':'Dept Head','management_chain':'Mgmt Chain'}[cfg.directory_assignee_type] || '';
                    const approverSummary = src === 'user_directory' ? ('Auto: ' + (dirLabel || 'Directory')) : src === 'tool' ? (toolName ? 'Tool: ' + toolName : 'Tool') : (src ? (cnt + ' selected') : 'Not set');
                    html = `<div class="node-config-item"><span class="config-label">Approvers</span><span class="config-value">${src === 'user_directory' ? approverSummary : (src ? (src.replace('platform_','') + ': ' + approverSummary) : approverSummary)}</span></div>`;
                    break;
                case 'tool':
                    const tool = state.tools.find(t => t.id === cfg.toolId);
                    html = `<div class="node-config-item"><span class="config-label">Tool</span><span class="config-value">${tool ? tool.name : 'Select tool...'}</span></div>`;
                    break;
                case 'notification':
                    html = `<div class="node-config-item"><span class="config-label">Channel</span><span class="config-value">${cfg.channel || 'email'}</span></div>`;
                    break;
                case 'form':
                case 'trigger':
                    const fieldCount = (cfg.fields || []).length;
                    html = `<div class="node-config-item"><span class="config-label">Fields</span><span class="config-value">${fieldCount} input${fieldCount !== 1 ? 's' : ''}</span></div>`;
                    break;
                case 'schedule':
                    html = `<div class="node-config-item"><span class="config-label">Cron</span><span class="config-value">${cfg.cron || '0 9 * * *'}</span></div>`;
                    break;
                case 'webhook':
                    html = `<div class="node-config-item"><span class="config-label">Method</span><span class="config-value">${cfg.method || 'POST'} ${cfg.path || '/trigger'}</span></div>`;
                    break;
                case 'loop':
                    html = `<div class="node-config-item"><span class="config-label">Each</span><span class="config-value">${cfg.itemVar || 'item'} in ${cfg.collection || '...'}</span></div>`;
                    break;
                case 'ai':
                    html = `<div class="node-config-item"><span class="config-label">Model</span><span class="config-value">${cfg.model || 'gpt-4o'}</span></div>`;
                    break;
                case 'end':
                    html = `<div class="node-config-item"><span class="config-label">Output</span><span class="config-value">${cfg.output || 'result'}</span></div>`;
                    break;
                case 'action':
                    html = `<div class="node-config-item"><span class="config-label">Type</span><span class="config-value">${cfg.actionType || 'custom'}</span></div>`;
                    break;
                default:
                    html = '<div class="node-config-item"><span class="config-value" style="color:#6b7280;">Click to configure</span></div>';
            }
            
            return html;
        }
        
        function makeDraggable(nodeEl, node) {
            let startX, startY;
            
            nodeEl.addEventListener('mousedown', (e) => {
                if (e.target.closest('.port') || e.target.closest('.node-menu-btn')) return;
                
                state.isDragging = true;
                nodeEl.classList.add('dragging');
                
                startX = e.clientX;
                startY = e.clientY;
                const ids = getSelectedNodeIds();
                const movingIds = ids.includes(node.id) ? ids : [node.id];
                if (!ids.includes(node.id)) {
                    state.selectedNode = node;
                    state.selectedLabelNodeId = null;
                    state.selectedNodeIds = [node.id];
                    updateSelectionUI();
                }
                const startPositions = {};
                movingIds.forEach(id => {
                    const n = state.nodes.find(x => x.id === id);
                    if (n) startPositions[id] = { x: n.x, y: n.y };
                });
                state.connections.forEach(conn => {
                    if (conn.labelOffset && (conn.type === 'yes' || conn.type === 'no') && movingIds.includes(conn.from) && movingIds.includes(conn.to)) {
                        conn.labelOffset._dragStartX = conn.labelOffset.x;
                        conn.labelOffset._dragStartY = conn.labelOffset.y;
                    }
                });
                
                const onMove = (e) => {
                    if (!state.isDragging) return;
                    const dx = Math.round(((e.clientX - startX) / state.zoom) / 20) * 20;
                    const dy = Math.round(((e.clientY - startY) / state.zoom) / 20) * 20;
                    state.lastDragDelta = { dx, dy, nodeIds: movingIds };
                    movingIds.forEach(id => {
                        const n = state.nodes.find(x => x.id === id);
                        const start = startPositions[id];
                        if (!n || !start) return;
                        n.x = start.x + dx;
                        n.y = start.y + dy;
                        const el = document.getElementById(id);
                        if (el) {
                            el.style.left = n.x + 'px';
                            el.style.top = n.y + 'px';
                        }
                    });
                    
                    state.connections.forEach(conn => {
                        if (conn.labelOffset && conn.labelOffset._dragStartX !== undefined) {
                            conn.labelOffset.x = conn.labelOffset._dragStartX + dx;
                            conn.labelOffset.y = conn.labelOffset._dragStartY + dy;
                        }
                    });
                    
                    renderConnections();
                };
                
                const onUp = () => {
                    state.connections.forEach(conn => {
                        if (conn.labelOffset) {
                            delete conn.labelOffset._dragStartX;
                            delete conn.labelOffset._dragStartY;
                        }
                    });
                    state.isDragging = false;
                    state.lastDragDelta = null;
                    nodeEl.classList.remove('dragging');
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    if (movingIds.length > 0) saveToUndo();
                };
                
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
        
        function getSideToward(fromEl, toEl) {
            const fr = fromEl.getBoundingClientRect();
            const tr = toEl.getBoundingClientRect();
            const dx = (tr.left + tr.width/2) - (fr.left + fr.width/2);
            const dy = (tr.top + tr.height/2) - (fr.top + fr.height/2);
            if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
            return dy > 0 ? 'bottom' : 'top';
        }
        /** نقطة على حافة مستطيل الشكل – لو forceSide معطى نرجع مركز تلك الحافة، وإلا نقطة الخروج في اتجاه النقطة الأخرى */
        function getShapeEdgePoint(shapeRect, otherCenterX, otherCenterY, forceSide) {
            const L = shapeRect.left, R = shapeRect.left + shapeRect.width;
            const T = shapeRect.top, B = shapeRect.top + shapeRect.height;
            const cx = (L + R) / 2, cy = (T + B) / 2;
            if (forceSide === 'top') return { x: cx, y: T };
            if (forceSide === 'bottom') return { x: cx, y: B };
            if (forceSide === 'left') return { x: L, y: cy };
            if (forceSide === 'right') return { x: R, y: cy };
            const dx = otherCenterX - cx;
            const dy = otherCenterY - cy;
            let bestT = Infinity;
            let x = cx, y = cy;
            if (dx !== 0) {
                let t = (L - cx) / dx;
                if (t > 0.001) { const py = cy + t * dy; if (py >= T && py <= B) { bestT = t; x = L; y = py; } }
                t = (R - cx) / dx;
                if (t > 0.001 && t < bestT) { const py = cy + t * dy; if (py >= T && py <= B) { bestT = t; x = R; y = py; } }
            }
            if (dy !== 0) {
                let t = (T - cy) / dy;
                if (t > 0.001 && t < bestT) { const px = cx + t * dx; if (px >= L && px <= R) { bestT = t; x = px; y = T; } }
                t = (B - cy) / dy;
                if (t > 0.001 && t < bestT) { const px = cx + t * dx; if (px >= L && px <= R) { bestT = t; x = px; y = B; } }
            }
            return { x, y };
        }
        /** أقرب منفذ إدخال لنقطة (BPMN-style: الربط يتبع المنفذ الأقرب للمؤشر) */
        function getClosestInputPortToPoint(nodeEl, clientX, clientY) {
            const sides = ['top', 'right', 'bottom', 'left'];
            let bestSide = 'bottom';
            let bestDist = Infinity;
            for (const s of sides) {
                const port = nodeEl.querySelector('.port.input-' + s);
                if (!port) continue;
                const r = port.getBoundingClientRect();
                const px = r.left + r.width / 2;
                const py = r.top + r.height / 2;
                const d = (clientX - px) ** 2 + (clientY - py) ** 2;
                if (d < bestDist) { bestDist = d; bestSide = s; }
            }
            return bestSide;
        }
        /** احتياطي: جهة من الشكل حسب الزاوية (للتوافق مع كود قديم) */
        function getSideOfPointFromShape(nodeEl, clientX, clientY) {
            return getClosestInputPortToPoint(nodeEl, clientX, clientY);
        }
        /** أقرب منفذ إخراج لنقطة – يُستعمل عند سحب بداية خط إلى عقدة أخرى */
        function getClosestOutputPortToPoint(nodeEl, clientX, clientY) {
            const sel = '.port.output-top, .port.output-right, .port.output-bottom, .port.output-left, .port.output-yes-top, .port.output-yes-right, .port.output-yes-bottom, .port.output-yes-left, .port.output-no-top, .port.output-no-right, .port.output-no-bottom, .port.output-no-left';
            const ports = nodeEl.querySelectorAll(sel);
            let best = { side: 'bottom', portType: 'default' };
            let bestDist = Infinity;
            for (const p of ports) {
                const r = p.getBoundingClientRect();
                const px = r.left + r.width / 2, py = r.top + r.height / 2;
                const d = (clientX - px) ** 2 + (clientY - py) ** 2;
                if (d >= bestDist) continue;
                bestDist = d;
                best = {
                    side: p.getAttribute('data-side') || 'bottom',
                    portType: p.classList.contains('output-yes') || (p.className && String(p.className).includes('output-yes')) ? 'yes' :
                              p.classList.contains('output-no') || (p.className && String(p.className).includes('output-no')) ? 'no' : 'default'
                };
            }
            return best;
        }
        /** مسح تمييز المنفذ المستهدف من كل العُقد */
        function clearConnectionTargetPort() {
            document.querySelectorAll('.port.connection-target-port').forEach(p => p.classList.remove('connection-target-port'));
        }
        /** تمييز منفذ إدخال معين كهدف ربط */
        function setConnectionTargetPort(nodeEl, toPort) {
            clearConnectionTargetPort();
            if (!nodeEl || !toPort) return;
            const portEl = getPortForSide(nodeEl, 'input', toPort);
            if (portEl) portEl.classList.add('connection-target-port');
        }
        /** مركز المنفذ في إحداثيات الـ canvas */
        function getPortCenterInCanvas(nodeEl, portKind, side) {
            const portEl = getPortForSide(nodeEl, portKind, side);
            if (!portEl) return null;
            const r = portEl.getBoundingClientRect();
            return clientToCanvas(r.left + r.width / 2, r.top + r.height / 2);
        }
        function getPortForSide(nodeEl, portKind, side) {
            if (portKind === 'input') return nodeEl.querySelector('.port.input-' + side);
            /* عقدة القرار: Yes على top/bottom فقط، No على left/right فقط – منفذ واحد لكل جهة */
            if (portKind === 'output-yes') {
                const p = nodeEl.querySelector('.port.output-yes-' + side);
                if (p) return p;
                return nodeEl.querySelector('.port.output-yes-left') || nodeEl.querySelector('.port.output-yes-right') || nodeEl.querySelector('.port.output-yes-top') || nodeEl.querySelector('.port.output-yes-bottom');
            }
            if (portKind === 'output-no') {
                const p = nodeEl.querySelector('.port.output-no-' + side);
                if (p) return p;
                return nodeEl.querySelector('.port.output-no-right') || nodeEl.querySelector('.port.output-no-left') || nodeEl.querySelector('.port.output-no-top') || nodeEl.querySelector('.port.output-no-bottom');
            }
            return nodeEl.querySelector('.port.output-' + side);
        }
        /** أقرب نقطتي ربط بين عقدتين – لاستخدامها بعد المحاذاة أو عند الرسم */
        function getClosestPortPair(fromNodeEl, toNodeEl, outKind) {
            const outSides = outKind === 'output-yes' ? ['left', 'right', 'top', 'bottom'] : outKind === 'output-no' ? ['right', 'left', 'top', 'bottom'] : ['top', 'right', 'bottom', 'left'];
            const inSides = ['top', 'right', 'bottom', 'left'];
            let bestDist = Infinity, bestFrom = outSides[0], bestTo = inSides[0];
            for (const fs of outSides) {
                const fp = getPortForSide(fromNodeEl, outKind, fs);
                if (!fp) continue;
                const fr = fp.getBoundingClientRect();
                const fx = fr.left + fr.width / 2, fy = fr.top + fr.height / 2;
                for (const ts of inSides) {
                    const tp = getPortForSide(toNodeEl, 'input', ts);
                    if (!tp) continue;
                    const tr = tp.getBoundingClientRect();
                    const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
                    const d = (fx - tx) * (fx - tx) + (fy - ty) * (fy - ty);
                    if (d < bestDist) { bestDist = d; bestFrom = fs; bestTo = ts; }
                }
            }
            return { fromSide: bestFrom, toSide: bestTo };
        }
        function completeConnection(toNodeId, toPort) {
            if (!state.isConnecting || !state.connectionStart) return false;
            if (state.connectionStart.nodeId === toNodeId) return false;
            let connType = state.connectionStart.portType;
            const fromNode = state.nodes.find(n => n.id === state.connectionStart.nodeId);
            /* عقدة القرار: أول فرع دائماً Yes، الفرع التاني No – ممنوع فرعين No */
            if (fromNode && fromNode.type === 'condition') {
                const existingFromCondition = state.connections.filter(c => c.from === state.connectionStart.nodeId);
                if (existingFromCondition.length === 0) {
                    connType = 'yes';
                } else if (existingFromCondition.length === 1) {
                    connType = 'no';
                }
                /* لو فيه فرعين فعلاً (yes و no) واليوزر بيضيف تالت نترك النوع من البورت */
            }
            const conn = {
                from: state.connectionStart.nodeId,
                to: toNodeId,
                type: connType,
                fromPort: state.connectionStart.fromPort,
                toPort: toPort
            };
            /* استبدال الربط القديم لنفس المنفذ فقط – السماح بعدة أطراف من نفس العقدة */
            state.connections = state.connections.filter(c => 
                !(c.from === conn.from && c.type === conn.type && (c.fromPort || '') === (conn.fromPort || ''))
            );
            state.connections.push(conn);
            renderConnections();
            saveToUndo();
            state.connectionCompleted = true;
            state.connectionHoverNode = null;
            state.connectionHoverPort = null;
            state.connectionHoverPoint = null;
            return true;
        }
        function endConnectingMode() {
            state.isConnecting = false;
            state.connectionStart = null;
            state.connectionPreview = null;
            document.body.classList.remove('connecting');
            clearConnectionTargetPort();
            const svgInteractive = document.getElementById('connections-interactive-svg');
            const preview = svgInteractive && svgInteractive.querySelector('.connection-preview-path');
            if (preview) preview.remove();
            state.connectionHoverNode = null;
            state.connectionHoverPort = null;
            state.connectionHoverPoint = null;
            state.connectionCompleted = false;
        }
        function setupPorts(nodeEl, node) {
            const ports = nodeEl.querySelectorAll('.port.output, .port.output-top, .port.output-right, .port.output-bottom, .port.output-left, .port.output-yes, .port.output-no, .port.output-yes-top, .port.output-yes-right, .port.output-yes-bottom, .port.output-yes-left, .port.output-no-top, .port.output-no-right, .port.output-no-bottom, .port.output-no-left');
            ports.forEach(port => {
                port.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    state.isConnecting = true;
                    const fromPort = port.getAttribute('data-side') || undefined;
                    state.connectionStart = {
                        nodeId: node.id,
                        portType: port.classList.contains('output-yes') || (port.className && port.className.includes('output-yes')) ? 'yes' :
                                  port.classList.contains('output-no') || (port.className && port.className.includes('output-no')) ? 'no' : 'default',
                        fromPort
                    };
                    state.connectionHoverNode = null;
                    state.connectionHoverPort = null;
                    state.connectionHoverPoint = null;
                    state.connectionCompleted = false;
                    document.body.classList.add('connecting');
                    startConnectionPreview(node.id, fromPort, state.connectionStart.portType, e);
                });
            });
            const inputPorts = nodeEl.querySelectorAll('.port.input, .port.input-top, .port.input-right, .port.input-bottom, .port.input-left');
            inputPorts.forEach(inputPort => {
                inputPort.addEventListener('mouseup', (e) => {
                    if (state.reconnectEdge) {
                        const from = state.reconnectEdge.from;
                        const type = state.reconnectEdge.type;
                        const fromPort = state.reconnectEdge.fromPort;
                        if (from !== node.id) {
                            const toPort = (e.currentTarget.getAttribute && e.currentTarget.getAttribute('data-side')) || getSideOfPointFromShape(nodeEl, e.clientX, e.clientY);
                            state.connections.push({ from, to: node.id, type, fromPort, toPort });
                            saveToUndo();
                            renderConnections();
                        }
                        state.reconnectEdge = null;
                        document.body.classList.remove('connecting');
                        return;
                    }
                    if (state.isConnecting && state.connectionStart) {
                        const toPort = (e.currentTarget.getAttribute && e.currentTarget.getAttribute('data-side')) || getSideOfPointFromShape(nodeEl, e.clientX, e.clientY);
                        if (completeConnection(node.id, toPort)) { }
                        endConnectingMode();
                        return;
                    }
                });
            });
            /* إفلات على أي جزء من العقدة يكمل الربط (أسهل من استهداف المنفذ الصغير) */
            nodeEl.addEventListener('mouseup', (e) => {
                if (e.target.closest('.port')) return;
                if (state.reconnectEdge) {
                    if (state.reconnectEdge.from !== node.id) {
                        const fromNodeEl = document.getElementById(state.reconnectEdge.from);
                        const toPort = fromNodeEl ? getSideToward(nodeEl, fromNodeEl) : 'bottom';
                        state.connections.push({
                            from: state.reconnectEdge.from,
                            to: node.id,
                            type: state.reconnectEdge.type,
                            fromPort: state.reconnectEdge.fromPort,
                            toPort
                        });
                        saveToUndo();
                        renderConnections();
                    }
                    state.reconnectEdge = null;
                    document.body.classList.remove('connecting');
                    return;
                }
                if (state.isConnecting && state.connectionStart && state.connectionStart.nodeId !== node.id) {
                    const fromNodeEl = document.getElementById(state.connectionStart.nodeId);
                    const toPort = fromNodeEl ? getSideToward(nodeEl, fromNodeEl) : 'bottom';
                    if (completeConnection(node.id, toPort)) { }
                }
                endConnectingMode();
            });
        }
        
        // ===== CONNECTIONS =====
        let stateSelectedConnIndex = null;
        
        function renderConnections() {
            const svg = document.getElementById('connections-svg');
            const svgInteractive = document.getElementById('connections-interactive-svg');
            svg.innerHTML = '';
            if (svgInteractive) svgInteractive.innerHTML = '';
            
            const ns = 'http://www.w3.org/2000/svg';
            state.connections.forEach((conn, idx) => {
                const fromNode = document.getElementById(conn.from);
                const toNode = document.getElementById(conn.to);
                
                if (!fromNode || !toNode) return;
                
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                const outKind = conn.type === 'yes' ? 'output-yes' : conn.type === 'no' ? 'output-no' : 'output';
                let fromSide = conn.fromPort;
                let toSide = conn.toPort;
                if (fromSide == null || toSide == null) {
                    const pair = getClosestPortPair(fromNode, toNode, outKind);
                    fromSide = fromSide ?? pair.fromSide;
                    toSide = toSide ?? pair.toSide;
                    conn.fromPort = pair.fromSide;
                    conn.toPort = pair.toSide;
                }
                /* عقدة القرار: Yes و No يدعمان الأربع حواف – لا تصحيح */
                if (toSide == null) toSide = getSideToward(toNode, fromNode);
                const fromPortEl = getPortForSide(fromNode, outKind, fromSide);
                const toPortEl = getPortForSide(toNode, 'input', toSide);
                /* خطوط الربط لا تتصل إلا بنقط الربط (عناصر المنافذ) فقط – لا بحافة الشكل */
                if (!fromPortEl || !toPortEl) return;
                const fromRect = fromPortEl.getBoundingClientRect();
                const toRect = toPortEl.getBoundingClientRect();
                const x1 = (fromRect.left + fromRect.width / 2 - canvasRect.left) / state.zoom;
                const y1 = (fromRect.top + fromRect.height / 2 - canvasRect.top) / state.zoom;
                const x2 = (toRect.left + toRect.width / 2 - canvasRect.left) / state.zoom;
                const y2 = (toRect.top + toRect.height / 2 - canvasRect.top) / state.zoom;
                
                const pathInfo = getConnectionPathData(x1, y1, x2, y2, fromSide, toSide, conn, fromNode, toNode, canvasRect);
                const pathD = pathInfo.pathD;
                const midX = pathInfo.bendX;
                const midY = pathInfo.bendY;
                const isStraight = pathInfo.straightLine === true;
                const isTwoBend = pathInfo.twoBend === true;
                logConnectionDebug(idx, conn, pathInfo, x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect);
                const path = document.createElementNS(ns, 'path');
                const t = String(conn.type || '').trim();
                const classes = ['connection-path'];
                if (t) classes.push(t);
                if (stateSelectedConnIndex === idx) classes.push('selected');
                if (conn && conn._playActive === true) classes.push('play-visited');
                if (conn && conn._playCurrent === true) classes.push('play-flow');
                path.setAttribute('class', classes.join(' '));
                path.setAttribute('data-conn-index', String(idx));
                path.setAttribute('d', pathD);
                
                svg.appendChild(path);

                /* Cinematic build: animate newly added edges (stroke draw) */
                if (conn && conn._animate === true) {
                    try {
                        const len = path.getTotalLength();
                        path.style.strokeDasharray = String(len);
                        path.style.strokeDashoffset = String(len);
                        path.style.transition = 'stroke-dashoffset 650ms ease';
                        path.style.willChange = 'stroke-dashoffset';
                        requestAnimationFrame(() => {
                            path.style.strokeDashoffset = '0';
                        });
                    } catch (_) { /* ignore */ }
                    // Mark as done so re-renders don't re-animate
                    conn._animate = false;
                }
                
                /* مسار شفاف في الطبقة التفاعلية لتحديد الخط بالنقر عليه */
                const hitPath = document.createElementNS(ns, 'path');
                hitPath.setAttribute('class', 'connection-hit-path');
                hitPath.setAttribute('data-conn-index', String(idx));
                hitPath.setAttribute('d', pathD);
                hitPath.style.pointerEvents = 'stroke';
                hitPath.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectConnection(idx);
                });
                if (svgInteractive) svgInteractive.appendChild(hitPath);
                
                const gHandle = document.createElementNS(ns, 'g');
                gHandle.setAttribute('class', `connection-handles ${conn.type || ''}${stateSelectedConnIndex === idx ? ' selected' : ''}`);
                gHandle.setAttribute('data-conn-index', String(idx));
                const startHandle = document.createElementNS(ns, 'circle');
                startHandle.setAttribute('class', 'connection-start-handle');
                startHandle.setAttribute('cx', x1);
                startHandle.setAttribute('cy', y1);
                startHandle.setAttribute('r', 10);
                startHandle.setAttribute('title', 'Drag to change connection start point');
                startHandle.style.pointerEvents = 'all';
                startHandle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDragEdgeStart(idx, conn, x1, y1, x2, y2);
                });
                gHandle.appendChild(startHandle);
                const endHandle = document.createElementNS(ns, 'circle');
                endHandle.setAttribute('class', 'connection-end-handle');
                endHandle.setAttribute('cx', x2);
                endHandle.setAttribute('cy', y2);
                endHandle.setAttribute('r', 10);
                endHandle.setAttribute('title', 'Drag to change connection end point');
                endHandle.style.pointerEvents = 'all';
                endHandle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDragEdgeEnd(idx, conn, x1, y1, x2, y2);
                });
                gHandle.appendChild(endHandle);
                if (!isStraight && !isTwoBend) {
                    const bendHandle = document.createElementNS(ns, 'circle');
                    bendHandle.setAttribute('class', 'connection-bend-handle');
                    bendHandle.setAttribute('cx', midX);
                    bendHandle.setAttribute('cy', midY);
                    bendHandle.setAttribute('r', 6);
                    bendHandle.setAttribute('title', 'Drag to adjust bend • Double-click to reset');
                    bendHandle.style.pointerEvents = 'all';
                    bendHandle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        startDragBendPoint(idx, conn, x1, y1, x2, y2);
                    });
                    bendHandle.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        if (conn.bendPoint) {
                            delete conn.bendPoint;
                            saveToUndo();
                            renderConnections();
                        }
                    });
                    gHandle.appendChild(bendHandle);
                }
                if (svgInteractive) svgInteractive.appendChild(gHandle);
                
                const labelX = midX;
                const labelY = midY;
                if (conn.type === 'yes' || conn.type === 'no') {
                    const fontSize = conn.labelFontSize != null ? conn.labelFontSize : state.labelFontSize;
                    const offset = conn.labelOffset ? 0 : 18;
                    const lx = conn.labelOffset ? conn.labelOffset.x : labelX;
                    const ly = conn.labelOffset ? conn.labelOffset.y : (labelY - offset);
                    const badgeW = Math.max(28, Math.round(fontSize * 2.2));
                    const badgeH = Math.max(14, Math.round(fontSize * 1.2));
                    const rx = 6;
                    const g = document.createElementNS(ns, 'g');
                    g.setAttribute('class', `connection-label-badge ${conn.type}${stateSelectedConnIndex === idx ? ' selected' : ''}`);
                    g.setAttribute('data-conn-index', String(idx));
                    g.setAttribute('title', 'Drag to move label • Font size: use +/- in toolbar');
                    const rect = document.createElementNS(ns, 'rect');
                    rect.setAttribute('x', lx - badgeW / 2);
                    rect.setAttribute('y', ly - badgeH / 2);
                    rect.setAttribute('width', badgeW);
                    rect.setAttribute('height', badgeH);
                    rect.setAttribute('rx', rx);
                    g.appendChild(rect);
                    const text = document.createElementNS(ns, 'text');
                    text.setAttribute('x', lx);
                    text.setAttribute('y', ly);
                    text.setAttribute('font-size', fontSize);
                    text.textContent = conn.type === 'yes' ? 'Yes' : 'No';
                    g.appendChild(text);
                    g.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        selectConnection(idx);
                        startDragConnectionLabel(idx, conn, lx, ly, fontSize, e);
                    });
                    if (svgInteractive) svgInteractive.appendChild(g);
                }
            });
            
            if (state.draggingEdgeEnd) {
                const d = state.draggingEdgeEnd;
                let endX = d.currentX, endY = d.currentY;
                if (d.hoverNode && d.hoverPort) {
                    const targetEl = document.getElementById(d.hoverNode);
                    const pc = targetEl ? getPortCenterInCanvas(targetEl, 'input', d.hoverPort) : null;
                    if (pc) { endX = pc.x; endY = pc.y; }
                }
                const pathD = getDragPreviewPathD(d.fromX, d.fromY, endX, endY);
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('class', `connection-path ${d.type} connection-preview selected`);
                path.setAttribute('d', pathD);
                path.setAttribute('stroke-dasharray', '6 4');
                if (svgInteractive) svgInteractive.appendChild(path);
                d.previewPath = path;
            }
            if (state.draggingEdgeStart) {
                const d = state.draggingEdgeStart;
                const pathD = getDragPreviewPathD(d.currentX, d.currentY, d.toX, d.toY);
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('class', `connection-path ${d.type} connection-preview selected`);
                path.setAttribute('d', pathD);
                path.setAttribute('stroke-dasharray', '6 4');
                if (svgInteractive) svgInteractive.appendChild(path);
                d.previewPath = path;
            }
        }
        /** مستطيل العقدة في إحداثيات الـ canvas */
        function getNodeRectInCanvas(nodeEl, canvasRect) {
            const r = nodeEl.getBoundingClientRect();
            return {
                left: (r.left - canvasRect.left) / state.zoom,
                right: (r.right - canvasRect.left) / state.zoom,
                top: (r.top - canvasRect.top) / state.zoom,
                bottom: (r.bottom - canvasRect.top) / state.zoom
            };
        }
        /** هل النقطة داخل المستطيل (مع هامش) */
        function pointInRect(px, py, r, margin) {
            margin = margin || 0;
            return px >= r.left - margin && px <= r.right + margin && py >= r.top - margin && py <= r.bottom + margin;
        }
        /** هل خط عمودي عند x من ya لـ yb يمر عبر المستطيل */
        function verticalSegmentCrossesRect(x, ya, yb, r, pad) {
            const yMin = Math.min(ya, yb), yMax = Math.max(ya, yb);
            return x >= r.left - pad && x <= r.right + pad && yMin <= r.bottom + pad && yMax >= r.top - pad;
        }
        /** هل خط أفقي عند y من xa لـ xb يمر عبر المستطيل */
        function horizontalSegmentCrossesRect(y, xa, xb, r, pad) {
            const xMin = Math.min(xa, xb), xMax = Math.max(xa, xb);
            return y >= r.top - pad && y <= r.bottom + pad && xMin <= r.right + pad && xMax >= r.left - pad;
        }
        /** هل مسار الانحناء (bx,by) يمر عبر r1 أو r2. القطعة الأولى تربط r1 فلا نتحقق منها ضد r1، والقطعة الأخيرة تربط r2 فلا نتحقق منها ضد r2. */
        function bendPathCrossesNodes(bx, by, x1, y1, x2, y2, fromH, toH, r1, r2, pad) {
            const checkH = (y, xa, xb, skipR1, skipR2) =>
                (!skipR1 && horizontalSegmentCrossesRect(y, xa, xb, r1, pad)) || (!skipR2 && horizontalSegmentCrossesRect(y, xa, xb, r2, pad));
            const checkV = (x, ya, yb, skipR1, skipR2) =>
                (!skipR1 && verticalSegmentCrossesRect(x, ya, yb, r1, pad)) || (!skipR2 && verticalSegmentCrossesRect(x, ya, yb, r2, pad));
            if (fromH && toH) {
                return checkH(y1, x1, bx, false, true) || checkV(bx, y1, y2, false, false) || checkH(y2, bx, x2, true, false);
            }
            if (!fromH && !toH) {
                return checkV(x1, y1, by, true, false) || checkH(by, x1, x2, false, false) || checkV(x2, by, y2, false, true);
            }
            if (fromH && !toH) {
                return checkH(y1, x1, bx, false, true) || checkV(bx, y1, by, false, false) || checkH(by, bx, x2, false, false) || checkV(x2, by, y2, true, false);
            }
            return checkV(x1, y1, by, true, false) || checkH(by, x1, bx, false, false) || checkV(bx, by, y2, false, false) || checkH(y2, bx, x2, false, true);
        }
        /** هل قطعة الخط من (x1,y1) إلى (x2,y2) تمر عبر المستطيل (نقاط داخلية فقط) */
        function lineSegmentCrossesRect(x1, y1, x2, y2, r, pad) {
            for (let t = 0.1; t < 1; t += 0.1) {
                const px = x1 + t * (x2 - x1);
                const py = y1 + t * (y2 - y1);
                if (pointInRect(px, py, r, pad)) return true;
            }
            return false;
        }
        /** فحص الجزء الأوسط فقط (25%-75%) لتجنب false positive عند بداية/نهاية المنفذ */
        function lineSegmentCrossesRectMid(x1, y1, x2, y2, r, pad) {
            for (let t = 0.25; t <= 0.75; t += 0.05) {
                const px = x1 + t * (x2 - x1);
                const py = y1 + t * (y2 - y1);
                if (pointInRect(px, py, r, pad)) return true;
            }
            return false;
        }
        /** استخراج نقاط المسار من pathD وحساب الطول الإجمالي */
        function parsePathSegments(pathD) {
            const pts = pathD.replace(/M|L/g, ' ').trim().split(/\s+/).map(Number);
            const points = [];
            for (let i = 0; i < pts.length; i += 2) points.push({ x: pts[i], y: pts[i + 1] });
            let length = 0;
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                length += Math.hypot(b.x - a.x, b.y - a.y);
            }
            return { points, length, segments: points.length - 1 };
        }
        /** تسجيل تصحيح الربط: فحص كل القطع بـ pad=0, كشف العبور والانحناء غير المنطقي والانحناء على النفس */
        function logConnectionDebug(connIdx, conn, pathInfo, x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect) {
            if (!state.connectionDebugLog && window.processBuilderConnDebug !== true) return;
            const r1 = fromNode ? getNodeRectInCanvas(fromNode, canvasRect) : null;
            const r2 = toNode ? getNodeRectInCanvas(toNode, canvasRect) : null;
            const directDist = Math.hypot(x2 - x1, y2 - y1);
            const { points, length: pathLength } = parsePathSegments(pathInfo.pathD);
            const ratio = directDist > 0.1 ? pathLength / directDist : 1;
            let minSegLen = Infinity;
            const segLens = [];
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                const len = Math.hypot(b.x - a.x, b.y - a.y);
                segLens.push(len);
                minSegLen = Math.min(minSegLen, len);
            }
            if (points.length < 2) minSegLen = 0;
            const kink = minSegLen < 15 && minSegLen > 0;
            const fmt = (n) => Math.round(n).toString();
            // --- Rule 1: خط الربط يعدي من داخل الشكل ---
            // القطعة الأولى تخرج من r1 (متوقع إنها تعبر r1) فنفحصها ضد r2 فقط
            // القطعة الأخيرة تدخل r2 (متوقع إنها تعبر r2) فنفحصها ضد r1 فقط
            // القطع الوسيطة نفحصها ضد كلتا العقدتين
            const crossDetails = [];
            if (r1 && r2 && points.length >= 2) {
                const isSingle = points.length === 2;
                for (let i = 0; i < points.length - 1; i++) {
                    const a = points[i], b = points[i + 1];
                    const isFirst = (i === 0);
                    const isLast = (i === points.length - 2);
                    // القطعة الأولى تخرج من r1 (متوقع) فنتجاهلها ضد r1. القطعة الأخيرة تدخل r2 فنتجاهلها ضد r2.
                    // للخط المستقيم (قطعة واحدة): نفحص المنتصف فقط ضد كلتا العقدتين.
                    const checkR1 = isSingle || !isFirst;
                    const checkR2 = isSingle || !isLast;
                    if (checkR1 && lineSegmentCrossesRectMid(a.x, a.y, b.x, b.y, r1, 0)) crossDetails.push(`seg${i}⊘r1`);
                    if (checkR2 && lineSegmentCrossesRectMid(a.x, a.y, b.x, b.y, r2, 0)) crossDetails.push(`seg${i}⊘r2`);
                }
            }
            const crosses = crossDetails.length > 0;
            // --- Rule 2: الانحناء غير المنطقي (بس لما المنافذ متقابلة ومتحاذية) ---
            const portsFaceV = (fromSide === 'top' && toSide === 'bottom') || (fromSide === 'bottom' && toSide === 'top');
            const portsFaceH = (fromSide === 'left' && toSide === 'right') || (fromSide === 'right' && toSide === 'left');
            const portsFace = portsFaceV || portsFaceH;
            const dxLog = Math.abs(x2 - x1), dyLog = Math.abs(y2 - y1);
            const alignedForStraight = portsFace && (portsFaceV
                ? (dxLog < 30 || (dyLog > 0 && dxLog / dyLog < 0.35))
                : (dyLog < 30 || (dxLog > 0 && dyLog / dxLog < 0.35)));
            const unnecessaryBend = !pathInfo.straightLine && alignedForStraight;
            const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
            const bendOffMid = pathInfo.straightLine ? 0 : Math.hypot(pathInfo.bendX - midX, pathInfo.bendY - midY);
            const weirdBend = !pathInfo.straightLine && portsFace && bendOffMid > Math.min(80, directDist * 0.5);
            // --- Rule 3: الخط ينحني على نفسه (backtrack) ---
            // aroundPath و sameDir و twoBend: القطع الوسيطة بتروح في اتجاهات مختلفة طبيعياً — مش backtrack
            const skipR3Middle = pathInfo.twoBend === true || pathInfo.pathSource === 'aroundPath' || pathInfo.pathSource === 'sameDir';
            const portDirX = { left: -1, right: 1, top: 0, bottom: 0 };
            const portDirY = { left: 0, right: 0, top: -1, bottom: 1 };
            const overallDX = x2 - x1, overallDY = y2 - y1;
            let backtrack = false;
            let backtrackDetail = '';
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                const sdx = b.x - a.x, sdy = b.y - a.y;
                const segLen = segLens[i];
                if (segLen < 5) continue;
                const isFirst = (i === 0), isLast = (i === points.length - 2);
                // القطعة الأولى: نتحقق من اتجاه المنفذ مش الاتجاه العام
                if (isFirst) {
                    const pdx = portDirX[fromSide], pdy = portDirY[fromSide];
                    if (pdx !== 0 && sdx * pdx < 0 && Math.abs(sdx) > 40) { backtrack = true; backtrackDetail += `seg${i}:backPortX(${fmt(sdx)}) `; }
                    if (pdy !== 0 && sdy * pdy < 0 && Math.abs(sdy) > 40) { backtrack = true; backtrackDetail += `seg${i}:backPortY(${fmt(sdy)}) `; }
                    continue;
                }
                // القطعة الأخيرة: نتحقق من اتجاه المنفذ الهدف
                if (isLast) {
                    const pdx = -portDirX[toSide], pdy = -portDirY[toSide];
                    if (pdx !== 0 && sdx * pdx < 0 && Math.abs(sdx) > 40) { backtrack = true; backtrackDetail += `seg${i}:backPortX(${fmt(sdx)}) `; }
                    if (pdy !== 0 && sdy * pdy < 0 && Math.abs(sdy) > 40) { backtrack = true; backtrackDetail += `seg${i}:backPortY(${fmt(sdy)}) `; }
                    continue;
                }
                // القطع الوسيطة: نتحقق من الاتجاه العام (بس مش لـ aroundPath/twoBend)
                if (skipR3Middle) continue;
                const dotX = sdx * overallDX, dotY = sdy * overallDY;
                if (Math.abs(overallDX) > 5 && dotX < 0 && Math.abs(sdx) > 40) {
                    backtrack = true;
                    backtrackDetail += `seg${i}:backX(${fmt(sdx)}) `;
                }
                if (Math.abs(overallDY) > 5 && dotY < 0 && Math.abs(sdy) > 40) {
                    backtrack = true;
                    backtrackDetail += `seg${i}:backY(${fmt(sdy)}) `;
                }
            }
            const drag = state.lastDragDelta;
            const manualBend = !!(conn && conn.bendPoint);
            const parts = [
                `[Conn#${connIdx}] ${conn?.from?.slice(0, 8)}→${conn?.to?.slice(0, 8)}`,
                `${fromSide}→${toSide}`,
                pathInfo.straightLine ? 'STRAIGHT' : (pathInfo.twoBend ? '2-BEND' : '1-BEND'),
                pathInfo.pathSource || '-',
                manualBend ? 'HAS_MANUAL_BEND' : '',
                crosses ? `❌ R1-CROSSES[${crossDetails.join(',')}]` : '✓ R1-no-cross',
                unnecessaryBend ? '❌ R2-UNNECESSARY-BEND' : '✓ R2-bend-ok',
                backtrack ? `❌ R3-BACKTRACK[${backtrackDetail.trim()}]` : '✓ R3-no-backtrack',
                weirdBend ? '⚠ weirdBend' : '',
                kink ? `⚠ kink(${fmt(minSegLen)}px)` : '',
                `len=${fmt(pathLength)} dist=${fmt(directDist)} ratio=${ratio.toFixed(2)}`,
                `segs=[${segLens.map(l => fmt(l)).join(',')}]`,
                `p1(${fmt(x1)},${fmt(y1)}) p2(${fmt(x2)},${fmt(y2)})`,
                !pathInfo.straightLine ? `bend(${fmt(pathInfo.bendX)},${fmt(pathInfo.bendY)})` : '',
                `path=[${points.map(p => `(${fmt(p.x)},${fmt(p.y)})`).join('→')}]`,
                r1 ? `r1[L${fmt(r1.left)},R${fmt(r1.right)},T${fmt(r1.top)},B${fmt(r1.bottom)}]` : '',
                r2 ? `r2[L${fmt(r2.left)},R${fmt(r2.right)},T${fmt(r2.top)},B${fmt(r2.bottom)}]` : '',
                `zoom=${state.zoom.toFixed(2)}`
            ];
            if (drag) parts.push(`drag: dx=${drag.dx} dy=${drag.dy} nodes=[${(drag.nodeIds || []).map(id => id.slice(0, 8)).join(',')}]`);
            const hasIssue = crosses || unnecessaryBend || backtrack || weirdBend || ratio > 2.5 || kink;
            const msg = parts.filter(Boolean).join(' | ');
            if (hasIssue) console.warn('🔗', msg);
            else console.warn('🔗✅', msg);
        }
        /** نقطة انحناء خارج العُقد – الخط لا يمر أبداً من داخل الشكل. الأولوية لاتجاه الدخول/الخروج */
        function getBendOutsideNodes(x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect) {
            const pad = 20;
            const gapPad = 5; // هامش أصغر لكشف الفجوات بين العقد
            const horSides = ['left', 'right'];
            const fromH = horSides.includes(fromSide), toH = horSides.includes(toSide);
            let bx = (x1 + x2) / 2, by = (y1 + y2) / 2;
            if (!fromNode || !toNode) return { x: bx, y: by };
            const r1 = getNodeRectInCanvas(fromNode, canvasRect);
            const r2 = getNodeRectInCanvas(toNode, canvasRect);
            const leftOfBoth = Math.min(r1.left, r2.left) - pad;
            const rightOfBoth = Math.max(r1.right, r2.right) + pad;
            const aboveBoth = Math.min(r1.top, r2.top) - pad;
            const belowBoth = Math.max(r1.bottom, r2.bottom) + pad;
            const gapX = r1.right + gapPad <= r2.left - gapPad ? (r1.right + r2.left) / 2 : null;
            const gapX2 = r2.right + gapPad <= r1.left - gapPad ? (r2.right + r1.left) / 2 : null;
            const gapY = r1.bottom + gapPad <= r2.top - gapPad ? (r1.bottom + r2.top) / 2 : null;
            const gapY2 = r2.bottom + gapPad <= r1.top - gapPad ? (r2.bottom + r1.top) / 2 : null;
            if (fromH && toH) {
                if (gapX != null && (fromSide !== 'right' || gapX >= r2.right + pad)) { bx = gapX; }
                else if (gapX2 != null && (fromSide !== 'left' || gapX2 <= r2.left - pad)) { bx = gapX2; }
                else { bx = fromSide === 'left' ? leftOfBoth : rightOfBoth; }
                const yLo = Math.min(r1.top, r2.top) - pad, yHi = Math.max(r1.bottom, r2.bottom) + pad;
                by = Math.max(yLo, Math.min(yHi, (y1 + y2) / 2));
                if (verticalSegmentCrossesRect(bx, y1, y2, r1, pad) || verticalSegmentCrossesRect(bx, y1, y2, r2, pad)) {
                    bx = bx <= (r1.left + r2.left) / 2 ? leftOfBoth : rightOfBoth;
                }
            } else if (!fromH && !toH) {
                const portsFaceEachOther = (fromSide === 'top' && toSide === 'bottom') || (fromSide === 'bottom' && toSide === 'top');
                let usedMidpoint = false;
                if (portsFaceEachOther) {
                    if (r1.bottom < r2.top) { by = (r1.bottom + r2.top) / 2; usedMidpoint = true; }
                    else if (r2.bottom < r1.top) { by = (r2.bottom + r1.top) / 2; usedMidpoint = true; }
                    else { by = gapY != null ? gapY : gapY2 != null ? gapY2 : (fromSide === 'top' ? aboveBoth : belowBoth); }
                } else {
                    by = fromSide === 'top' ? aboveBoth : belowBoth;
                }
                const xLo = Math.min(r1.left, r2.left) - pad, xHi = Math.max(r1.right, r2.right) + pad;
                bx = Math.max(xLo, Math.min(xHi, (x1 + x2) / 2));
                if (!usedMidpoint && (horizontalSegmentCrossesRect(by, x1, x2, r1, pad) || horizontalSegmentCrossesRect(by, x1, x2, r2, pad))) {
                    by = fromSide === 'top' ? aboveBoth : belowBoth;
                }
            } else if (fromH && !toH) {
                // أفقي→عمودي (مثل right→top, left→bottom)
                // bx: اتجاه الخروج من المنفذ الأفقي
                bx = fromSide === 'left' ? (gapX2 != null ? gapX2 : leftOfBoth) : (gapX != null ? gapX : rightOfBoth);
                // by: الهدف أسفل (y2>y1) → نزول؛ الهدف فوق (y2<y1) → صعود. تجنب aboveBoth للهدف الأسفل
                if (toSide === 'top') {
                    by = gapY != null ? gapY : gapY2 != null ? gapY2 : (y2 > y1 ? (r1.bottom + r2.top) / 2 : aboveBoth);
                } else {
                    by = gapY2 != null ? gapY2 : gapY != null ? gapY : (y2 < y1 ? (r2.bottom + r1.top) / 2 : belowBoth);
                }
                if (verticalSegmentCrossesRect(bx, y1, by, r1, pad) || verticalSegmentCrossesRect(bx, y1, by, r2, pad) ||
                    verticalSegmentCrossesRect(bx, by, y2, r1, pad) || verticalSegmentCrossesRect(bx, by, y2, r2, pad)) {
                    bx = fromSide === 'left' ? leftOfBoth : rightOfBoth;
                }
                if (horizontalSegmentCrossesRect(by, bx, x2, r1, pad) || horizontalSegmentCrossesRect(by, bx, x2, r2, pad)) {
                    by = toSide === 'top' ? aboveBoth : belowBoth;
                }
            } else {
                // عمودي→أفقي (مثل bottom→right, top→left)
                // by: اتجاه الخروج من المنفذ العمودي - نبحث عن الفجوة أولاً
                if (fromSide === 'bottom') {
                    by = gapY != null ? gapY : gapY2 != null ? gapY2 : belowBoth;
                } else {
                    by = gapY2 != null ? gapY2 : gapY != null ? gapY : aboveBoth;
                }
                // bx: اتجاه الدخول للمنفذ الأفقي
                bx = toSide === 'left' ? (gapX != null ? gapX : leftOfBoth) : (gapX2 != null ? gapX2 : rightOfBoth);
                if (horizontalSegmentCrossesRect(by, x1, bx, r1, pad) || horizontalSegmentCrossesRect(by, x1, bx, r2, pad) ||
                    horizontalSegmentCrossesRect(by, bx, x2, r1, pad) || horizontalSegmentCrossesRect(by, bx, x2, r2, pad)) {
                    by = fromSide === 'top' ? aboveBoth : belowBoth;
                }
                if (verticalSegmentCrossesRect(bx, by, y2, r1, pad) || verticalSegmentCrossesRect(bx, by, y2, r2, pad)) {
                    bx = toSide === 'left' ? leftOfBoth : rightOfBoth;
                }
            }
            if (pointInRect(bx, by, r1, pad) || pointInRect(bx, by, r2, pad)) {
                bx = leftOfBoth;
                by = (y1 + y2) / 2;
                if (pointInRect(bx, by, r1, pad) || pointInRect(bx, by, r2, pad)) {
                    bx = rightOfBoth;
                    if (pointInRect(bx, by, r1, pad) || pointInRect(bx, by, r2, pad)) {
                        by = aboveBoth;
                        if (pointInRect(bx, by, r1, pad) || pointInRect(bx, by, r2, pad)) by = belowBoth;
                    }
                }
            }
            return { x: bx, y: by };
        }
        /** يضمن عدم مرور مسار الانحناء عبر العقد: إذا مرّ، يجرّب مواضع بديلة حتى يجد واحداً صالحاً */
        function ensureBendOutsideNodes(bx, by, x1, y1, x2, y2, fromH, toH, r1, r2, pad) {
            if (!bendPathCrossesNodes(bx, by, x1, y1, x2, y2, fromH, toH, r1, r2, pad))
                return { x: bx, y: by };
            const placePad = 20, gapPad = 5;
            const leftOfBoth = Math.min(r1.left, r2.left) - placePad;
            const rightOfBoth = Math.max(r1.right, r2.right) + placePad;
            const aboveBoth = Math.min(r1.top, r2.top) - placePad;
            const belowBoth = Math.max(r1.bottom, r2.bottom) + placePad;
            const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
            const gapX = r1.right + gapPad <= r2.left - gapPad ? (r1.right + r2.left) / 2 : null;
            const gapX2 = r2.right + gapPad <= r1.left - gapPad ? (r2.right + r1.left) / 2 : null;
            const gapY = r1.bottom + gapPad <= r2.top - gapPad ? (r1.bottom + r2.top) / 2 : null;
            const gapY2 = r2.bottom + gapPad <= r1.top - gapPad ? (r2.bottom + r1.top) / 2 : null;
            const candidates = [];
            // أولوية عالية: نقاط في الفجوات ونقاط اقتراب فوق/تحت r2 (لتجنب المرور من داخل الشكل)
            const approachAboveR2 = r2.top - placePad - 2, approachBelowR2 = r2.bottom + placePad + 2;
            const approachAboveR1 = r1.top - placePad - 2, approachBelowR1 = r1.bottom + placePad + 2;
            if (gapY != null) candidates.push({ x: midX, y: gapY }, { x: leftOfBoth, y: gapY }, { x: rightOfBoth, y: gapY });
            if (gapY2 != null) candidates.push({ x: midX, y: gapY2 }, { x: leftOfBoth, y: gapY2 }, { x: rightOfBoth, y: gapY2 });
            if (gapX != null) candidates.push({ x: gapX, y: midY }, { x: gapX, y: aboveBoth }, { x: gapX, y: belowBoth });
            if (gapX2 != null) candidates.push({ x: gapX2, y: midY }, { x: gapX2, y: aboveBoth }, { x: gapX2, y: belowBoth });
            candidates.push({ x: rightOfBoth, y: approachAboveR2 }, { x: rightOfBoth, y: approachBelowR2 }, { x: leftOfBoth, y: approachAboveR2 }, { x: leftOfBoth, y: approachBelowR2 });
            candidates.push({ x: rightOfBoth, y: approachAboveR1 }, { x: rightOfBoth, y: approachBelowR1 }, { x: leftOfBoth, y: approachAboveR1 }, { x: leftOfBoth, y: approachBelowR1 });
            // أولوية متوسطة: نقاط على الحواف مع المنتصف
            candidates.push(
                { x: midX, y: aboveBoth }, { x: midX, y: belowBoth },
                { x: leftOfBoth, y: midY }, { x: rightOfBoth, y: midY },
                // أركان
                { x: leftOfBoth, y: aboveBoth }, { x: leftOfBoth, y: belowBoth },
                { x: rightOfBoth, y: aboveBoth }, { x: rightOfBoth, y: belowBoth },
                { x: midX, y: midY }
            );
            // نختار أقصر مسار من كل الـ candidates الصالحة (مش أول واحد بس)
            let best = null, bestCost = Infinity;
            for (const c of candidates) {
                if (!bendPathCrossesNodes(c.x, c.y, x1, y1, x2, y2, fromH, toH, r1, r2, pad)) {
                    // تكلفة المسار ≈ مجموع المسافات Manhattan من الـ bend لكلا المنفذين
                    const cost = Math.abs(c.x - x1) + Math.abs(c.y - y1) + Math.abs(c.x - x2) + Math.abs(c.y - y2);
                    if (cost < bestCost) { best = c; bestCost = cost; }
                }
            }
            return best;
        }
        /** يضبط نقطة الانحناء المرسومة من المستخدم لأقرب موضع صالح مع احترام R1,R2,R3. يُستخدم عند السحب. */
        function getValidBendNearestTo(rawX, rawY, x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect) {
            const pad = 0;
            if (!fromNode || !toNode) return { x: rawX, y: rawY };
            const r1 = getNodeRectInCanvas(fromNode, canvasRect);
            const r2 = getNodeRectInCanvas(toNode, canvasRect);
            const horSides = ['left', 'right'];
            const fromH = horSides.includes(fromSide), toH = horSides.includes(toSide);
            let bx = rawX, by = rawY;
            // R3: منع self-fold للـ V-H-V
            if (!fromH && !toH && (bx - x1) * (x2 - bx) < 0) bx = (x1 + x2) / 2;
            if (!bendPathCrossesNodes(bx, by, x1, y1, x2, y2, fromH, toH, r1, r2, pad))
                return { x: bx, y: by };
            // موضع غير صالح: شبكة كثيفة حول الموضع المرسوم أولاً لحركة سلسة، ثم مرشحو الحواف
            const step = 8;
            const candidates = [];
            for (let di = -3; di <= 3; di++) {
                for (let dj = -3; dj <= 3; dj++) {
                    candidates.push({ x: rawX + di * step, y: rawY + dj * step });
                }
            }
            const placePad = 20, gapPad = 5;
            const leftOfBoth = Math.min(r1.left, r2.left) - placePad;
            const rightOfBoth = Math.max(r1.right, r2.right) + placePad;
            const aboveBoth = Math.min(r1.top, r2.top) - placePad;
            const belowBoth = Math.max(r1.bottom, r2.bottom) + placePad;
            const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
            const gapX = r1.right + gapPad <= r2.left - gapPad ? (r1.right + r2.left) / 2 : null;
            const gapX2 = r2.right + gapPad <= r1.left - gapPad ? (r2.right + r1.left) / 2 : null;
            const gapY = r1.bottom + gapPad <= r2.top - gapPad ? (r1.bottom + r2.top) / 2 : null;
            const gapY2 = r2.bottom + gapPad <= r1.top - gapPad ? (r2.bottom + r1.top) / 2 : null;
            const approachAboveR2 = r2.top - placePad - 2, approachBelowR2 = r2.bottom + placePad + 2;
            const approachAboveR1 = r1.top - placePad - 2, approachBelowR1 = r1.bottom + placePad + 2;
            if (gapY != null) candidates.push({ x: midX, y: gapY }, { x: leftOfBoth, y: gapY }, { x: rightOfBoth, y: gapY });
            if (gapY2 != null) candidates.push({ x: midX, y: gapY2 }, { x: leftOfBoth, y: gapY2 }, { x: rightOfBoth, y: gapY2 });
            if (gapX != null) candidates.push({ x: gapX, y: midY }, { x: gapX, y: aboveBoth }, { x: gapX, y: belowBoth });
            if (gapX2 != null) candidates.push({ x: gapX2, y: midY }, { x: gapX2, y: aboveBoth }, { x: gapX2, y: belowBoth });
            candidates.push({ x: rightOfBoth, y: approachAboveR2 }, { x: rightOfBoth, y: approachBelowR2 }, { x: leftOfBoth, y: approachAboveR2 }, { x: leftOfBoth, y: approachBelowR2 });
            candidates.push({ x: rightOfBoth, y: approachAboveR1 }, { x: rightOfBoth, y: approachBelowR1 }, { x: leftOfBoth, y: approachAboveR1 }, { x: leftOfBoth, y: approachBelowR1 });
            candidates.push({ x: midX, y: aboveBoth }, { x: midX, y: belowBoth }, { x: leftOfBoth, y: midY }, { x: rightOfBoth, y: midY });
            candidates.push({ x: leftOfBoth, y: aboveBoth }, { x: leftOfBoth, y: belowBoth }, { x: rightOfBoth, y: aboveBoth }, { x: rightOfBoth, y: belowBoth }, { x: midX, y: midY });
            candidates.push({ x: rawX, y: rawY }, { x: rawX, y: y1 }, { x: rawX, y: y2 }, { x: x1, y: rawY }, { x: x2, y: rawY });
            let best = null, bestDist = Infinity;
            for (const c of candidates) {
                let cx = c.x, cy = c.y;
                if (!fromH && !toH && (cx - x1) * (x2 - cx) < 0) cx = (x1 + x2) / 2;
                if (!bendPathCrossesNodes(cx, cy, x1, y1, x2, y2, fromH, toH, r1, r2, pad)) {
                    const cost = Math.abs(cx - x1) + Math.abs(cy - y1) + Math.abs(cx - x2) + Math.abs(cy - y2);
                    const dist = Math.hypot(cx - rawX, cy - rawY) + cost * 0.01;
                    if (dist < bestDist) { best = { x: cx, y: cy }; bestDist = dist; }
                }
            }
            return best || { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
        }
        /** مسار بـ 2 انحناءات يلتف حول العقد عند استحالة المسار الواحد. يُستخدم كملاذ أخير. */
        function tryAroundPath(x1, y1, x2, y2, fromSide, toSide, r1, r2, pad) {
            const extra = 5; // هامش إضافي لتجنب ملامسة حد الـ pad بالظبط
            const leftOfBoth = Math.min(r1.left, r2.left) - pad - extra;
            const rightOfBoth = Math.max(r1.right, r2.right) + pad + extra;
            const aboveBoth = Math.min(r1.top, r2.top) - pad - extra;
            const belowBoth = Math.max(r1.bottom, r2.bottom) + pad + extra;
            const horSides = ['left', 'right'];
            const fromH = horSides.includes(fromSide), toH = horSides.includes(toSide);
            const checkPad = 0;  // لا عبور فعلي — مثل bendPathCrossesNodes
            const checkH = (y, xa, xb, skipR1, skipR2) =>
                (!skipR1 && horizontalSegmentCrossesRect(y, xa, xb, r1, checkPad)) || (!skipR2 && horizontalSegmentCrossesRect(y, xa, xb, r2, checkPad));
            const checkV = (x, ya, yb, skipR1, skipR2) =>
                (!skipR1 && verticalSegmentCrossesRect(x, ya, yb, r1, checkPad)) || (!skipR2 && verticalSegmentCrossesRect(x, ya, yb, r2, checkPad));
            const routes = [];
            if (!fromH && toH) {
                if (fromSide === 'bottom' && toSide === 'top') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${rightOfBoth} ${belowBoth} L ${rightOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: (belowBoth + aboveBoth) / 2 });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${leftOfBoth} ${belowBoth} L ${leftOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: (belowBoth + aboveBoth) / 2 });
                } else if (fromSide === 'top' && toSide === 'bottom') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${rightOfBoth} ${aboveBoth} L ${rightOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${leftOfBoth} ${aboveBoth} L ${leftOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                } else if (fromSide === 'bottom' && (toSide === 'left' || toSide === 'right')) {
                    const bx = toSide === 'right' ? rightOfBoth : leftOfBoth;
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${bx} ${belowBoth} L ${bx} ${y2} L ${x2} ${y2}`, bendX: bx, bendY: belowBoth });
                } else if (fromSide === 'top' && (toSide === 'left' || toSide === 'right')) {
                    const bx = toSide === 'right' ? rightOfBoth : leftOfBoth;
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${bx} ${aboveBoth} L ${bx} ${y2} L ${x2} ${y2}`, bendX: bx, bendY: aboveBoth });
                }
            } else if (fromH && !toH) {
                const gapYLocal = r1.bottom + 5 <= r2.top - 5 ? (r1.bottom + r2.top) / 2 : null;
                const gapY2Local = r2.bottom + 5 <= r1.top - 5 ? (r2.bottom + r1.top) / 2 : null;
                const approachTop = r2.top - pad - extra;  // فوق r2 مباشرة — تجنب المرور من داخل الشكل
                const approachBottom = r2.bottom + pad + extra;
                if (fromSide === 'right' && toSide === 'top') {
                    // أقصر مسار: يمين → نزول فوق r2 → دخول من الأعلى (لا يمر من داخل الشكل)
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${approachTop} L ${x2} ${approachTop} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: approachTop });
                    if (gapYLocal != null) routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${gapYLocal} L ${x2} ${gapYLocal} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: gapYLocal });
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: aboveBoth });
                } else if (fromSide === 'left' && toSide === 'top') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${approachTop} L ${x2} ${approachTop} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: approachTop });
                    if (gapYLocal != null) routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${gapYLocal} L ${x2} ${gapYLocal} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: gapYLocal });
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: aboveBoth });
                } else if (fromSide === 'right' && toSide === 'bottom') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${approachBottom} L ${x2} ${approachBottom} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: approachBottom });
                    if (gapY2Local != null) routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${gapY2Local} L ${x2} ${gapY2Local} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: gapY2Local });
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: belowBoth });
                } else if (fromSide === 'left' && toSide === 'bottom') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${approachBottom} L ${x2} ${approachBottom} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: approachBottom });
                    if (gapY2Local != null) routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${gapY2Local} L ${x2} ${gapY2Local} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: gapY2Local });
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: belowBoth });
                }
            } else if (fromH && toH) {
                const goLeftFirst = fromSide === 'left', goRightFirst = fromSide === 'right';
                if (goLeftFirst) {
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${aboveBoth} L ${rightOfBoth} ${aboveBoth} L ${rightOfBoth} ${y2} L ${x2} ${y2}`, bendX: (leftOfBoth + rightOfBoth) / 2, bendY: aboveBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${belowBoth} L ${rightOfBoth} ${belowBoth} L ${rightOfBoth} ${y2} L ${x2} ${y2}`, bendX: (leftOfBoth + rightOfBoth) / 2, bendY: belowBoth });
                } else {
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${aboveBoth} L ${leftOfBoth} ${aboveBoth} L ${leftOfBoth} ${y2} L ${x2} ${y2}`, bendX: (leftOfBoth + rightOfBoth) / 2, bendY: aboveBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${belowBoth} L ${leftOfBoth} ${belowBoth} L ${leftOfBoth} ${y2} L ${x2} ${y2}`, bendX: (leftOfBoth + rightOfBoth) / 2, bendY: belowBoth });
                }
            } else if (!fromH && !toH) {
                const sameDir = fromSide === toSide;
                if (sameDir && fromSide === 'bottom') {
                    // bottom→bottom: نزول تحت r1 → جنب → تحت r2 → صعود (5 نقاط)
                    const exitY = r1.bottom + pad + 5;
                    if (Math.abs(x1 - x2) > 40) {
                        // العقد مش على نفس المحور: مسار بسيط
                        routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: (x1 + x2) / 2, bendY: belowBoth });
                    }
                    // مسارات بتروح للجنب (شمال أو يمين)
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${exitY} L ${leftOfBoth} ${exitY} L ${leftOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: belowBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${exitY} L ${rightOfBoth} ${exitY} L ${rightOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: belowBoth });
                } else if (sameDir && fromSide === 'top') {
                    // top→top: صعود فوق r1 → جنب → فوق r2 → نزول (5 نقاط)
                    const exitY = r1.top - pad - 5;
                    if (Math.abs(x1 - x2) > 40) {
                        routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: (x1 + x2) / 2, bendY: aboveBoth });
                    }
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${exitY} L ${leftOfBoth} ${exitY} L ${leftOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: aboveBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${exitY} L ${rightOfBoth} ${exitY} L ${rightOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: aboveBoth });
                } else if (sameDir && fromSide === 'left') {
                    // left→left: شمال → فوق/تحت → شمال (U-shape أفقي)
                    if (Math.abs(y1 - y2) > 10) {
                        routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${y2} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: (y1 + y2) / 2 });
                    }
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${aboveBoth} L ${leftOfBoth} ${y2} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: aboveBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${leftOfBoth} ${y1} L ${leftOfBoth} ${belowBoth} L ${leftOfBoth} ${y2} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: belowBoth });
                } else if (sameDir && fromSide === 'right') {
                    // right→right: يمين → فوق/تحت → يمين (U-shape أفقي)
                    if (Math.abs(y1 - y2) > 10) {
                        routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${y2} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: (y1 + y2) / 2 });
                    }
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${aboveBoth} L ${rightOfBoth} ${y2} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: aboveBoth });
                    routes.push({ pathD: `M ${x1} ${y1} L ${rightOfBoth} ${y1} L ${rightOfBoth} ${belowBoth} L ${rightOfBoth} ${y2} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: belowBoth });
                } else if (fromSide === 'top') {
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${leftOfBoth} ${aboveBoth} L ${leftOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${aboveBoth} L ${rightOfBoth} ${aboveBoth} L ${rightOfBoth} ${belowBoth} L ${x2} ${belowBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                } else {
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${leftOfBoth} ${belowBoth} L ${leftOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: leftOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                    routes.push({ pathD: `M ${x1} ${y1} L ${x1} ${belowBoth} L ${rightOfBoth} ${belowBoth} L ${rightOfBoth} ${aboveBoth} L ${x2} ${aboveBoth} L ${x2} ${y2}`, bendX: rightOfBoth, bendY: (aboveBoth + belowBoth) / 2 });
                }
            }
            // نختار أقصر route صالح (مش أول واحد) — فحص كل القطع بما فيها الأولى والأخيرة
            let bestRoute = null, bestLen = Infinity;
            for (const r of routes) {
                const pts = r.pathD.replace(/M|L/g, ' ').trim().split(/\s+/).map(Number);
                const numSegs = pts.length / 2 - 1;
                let ok = true;
                for (let i = 0; i < numSegs; i++) {
                    const xa = pts[i * 2], ya = pts[i * 2 + 1], xb = pts[(i + 1) * 2], yb = pts[(i + 1) * 2 + 1];
                    const isFirst = (i === 0), isLast = (i === numSegs - 1);
                    const skipR1 = isFirst, skipR2 = isLast;  // الأولى تخرج من r1، الأخيرة تدخل r2
                    if (xa === xb) { if (checkV(xa, Math.min(ya, yb), Math.max(ya, yb), skipR1, skipR2)) { ok = false; break; } }
                    else { if (checkH(ya, Math.min(xa, xb), Math.max(xa, xb), skipR1, skipR2)) { ok = false; break; } }
                }
                if (ok) {
                    let len = 0;
                    for (let i = 0; i < pts.length - 2; i += 2) len += Math.abs(pts[i+2]-pts[i]) + Math.abs(pts[i+3]-pts[i+1]);
                    if (len < bestLen) { bestRoute = r; bestLen = len; }
                }
            }
            return bestRoute ? { ...bestRoute, twoBend: true } : null;
        }
        /** مسار الربط الذكي والديناميكي
         * Rules: الخط لا يمر من داخل الـ shape؛ الانحناء يتناسب مع المسافة؛ تجنب القطاعات القصيرة جداً (kinks)
         * Paths recalculate on node move (renderConnections in makeDraggable mousemove) */
        function getConnectionPathData(x1, y1, x2, y2, fromSide, toSide, conn, fromNode, toNode, canvasRect) {
            const placePad = 20;
            const checkPad = 0;
            const useManualBend = conn && conn.bendPoint && typeof conn.bendPoint.x === 'number' && typeof conn.bendPoint.y === 'number';
            const r1 = fromNode ? getNodeRectInCanvas(fromNode, canvasRect) : null;
            const r2 = toNode ? getNodeRectInCanvas(toNode, canvasRect) : null;
            // خط مستقيم مسموح فقط عندما المنافذ متقابلة والعقد تقريباً على نفس المحور
            const portsFaceVertical = (fromSide === 'bottom' && toSide === 'top') || (fromSide === 'top' && toSide === 'bottom');
            const portsFaceHorizontal = (fromSide === 'left' && toSide === 'right') || (fromSide === 'right' && toSide === 'left');
            const portsFaceEachOther = portsFaceVertical || portsFaceHorizontal;
            if (!useManualBend && fromNode && toNode && portsFaceEachOther && r1 && r2) {
                const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
                // المحاذاة: الفرق العمودي/الأفقي صغير نسبياً (زاوية < ~20 درجة عن اتجاه المنفذ)
                const aligned = portsFaceVertical
                    ? (dx < 30 || (dy > 0 && dx / dy < 0.35))
                    : (dy < 30 || (dx > 0 && dy / dx < 0.35));
                if (aligned) {
                    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                    return { pathD: `M ${x1} ${y1} L ${x2} ${y2}`, bendX: midX, bendY: midY, useHVH: false, straightLine: true, pathSource: 'straight' };
                }
            }
            const horSides = ['left', 'right'];
            const fromH = horSides.includes(fromSide), toH = horSides.includes(toSide);
            // منافذ بنفس الاتجاه (bottom→bottom, top→top, ...): مسار U-shape دائماً — لا نستخدم manual bend أبداً
            const sameDirection = fromSide === toSide;
            if (sameDirection && r1 && r2) {
                if (conn && conn.bendPoint) delete conn.bendPoint;
                const around = tryAroundPath(x1, y1, x2, y2, fromSide, toSide, r1, r2, placePad);
                if (around) return { pathD: around.pathD, bendX: around.bendX, bendY: around.bendY, useHVH: fromH, straightLine: false, twoBend: true, pathSource: 'sameDir' };
                // لو tryAroundPath فشل: نبني U-shape مباشرة بدون validation
                // لازم يروح للجنب عشان ميعديش من جوا العقدة التانية
                const spad = placePad + 10;
                const sBlw = Math.max(r1.bottom, r2.bottom) + spad, sAbv = Math.min(r1.top, r2.top) - spad;
                const sLft = Math.min(r1.left, r2.left) - spad, sRgt = Math.max(r1.right, r2.right) + spad;
                let uPath;
                const eY1 = r1.bottom + spad, eY2 = r1.top - spad;
                const eX1 = r1.right + spad, eX2 = r1.left - spad;
                if (fromSide === 'bottom') {
                    uPath = `M ${x1} ${y1} L ${x1} ${eY1} L ${sLft} ${eY1} L ${sLft} ${sBlw} L ${x2} ${sBlw} L ${x2} ${y2}`;
                } else if (fromSide === 'top') {
                    uPath = `M ${x1} ${y1} L ${x1} ${eY2} L ${sLft} ${eY2} L ${sLft} ${sAbv} L ${x2} ${sAbv} L ${x2} ${y2}`;
                } else if (fromSide === 'left') {
                    uPath = `M ${x1} ${y1} L ${eX2} ${y1} L ${eX2} ${sAbv} L ${sLft} ${sAbv} L ${sLft} ${y2} L ${x2} ${y2}`;
                } else {
                    uPath = `M ${x1} ${y1} L ${eX1} ${y1} L ${eX1} ${sAbv} L ${sRgt} ${sAbv} L ${sRgt} ${y2} L ${x2} ${y2}`;
                }
                const sBx = (x1 + x2) / 2, sBy = (y1 + y2) / 2;
                return { pathD: uPath, bendX: sBx, bendY: sBy, useHVH: fromH, straightLine: false, twoBend: true, pathSource: 'sameDir' };
            }
            const def = getBendOutsideNodes(x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect);
            let bendX = def.x, bendY = def.y;
            if (useManualBend && r1 && r2) {
                if (!bendPathCrossesNodes(conn.bendPoint.x, conn.bendPoint.y, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad)) {
                    bendX = conn.bendPoint.x;
                    bendY = conn.bendPoint.y;
                }
            }
            let pathSource = 'ensureValid';
            if (useManualBend && bendX === conn.bendPoint.x && bendY === conn.bendPoint.y) pathSource = 'manualBend';
            if (r1 && r2) {
                const valid = ensureBendOutsideNodes(bendX, bendY, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad);
                if (valid) {
                    bendX = valid.x;
                    bendY = valid.y;
                    if (!(useManualBend && bendX === conn.bendPoint.x && bendY === conn.bendPoint.y)) pathSource = 'ensureValid';
                } else {
                    const around = tryAroundPath(x1, y1, x2, y2, fromSide, toSide, r1, r2, placePad);
                    if (around) return { pathD: around.pathD, bendX: around.bendX, bendY: around.bendY, useHVH: fromH, straightLine: false, twoBend: true, pathSource: 'aroundPath' };
                    bendX = (x1 + x2) / 2;
                    bendY = (y1 + y2) / 2;
                    pathSource = 'fallback';
                }
            }
            // --- فرض اتجاه المنفذ: القطعة الأولى لازم تمشي في اتجاه خروج المنفذ ---
            if (r1 && r2) {
                const abv = Math.min(r1.top, r2.top) - placePad;
                const blw = Math.max(r1.bottom, r2.bottom) + placePad;
                const lft = Math.min(r1.left, r2.left) - placePad;
                const rgt = Math.max(r1.right, r2.right) + placePad;
                // القطعة الأولى: اتجاه fromSide
                if (!fromH) {
                    if (fromSide === 'bottom' && bendY < y1) bendY = blw;
                    if (fromSide === 'top' && bendY > y1) bendY = abv;
                } else {
                    if (fromSide === 'right' && bendX < x1) bendX = rgt;
                    if (fromSide === 'left' && bendX > x1) bendX = lft;
                }
                // القطعة الأخيرة: اتجاه toSide (الخط يدخل من الاتجاه الصحيح)
                if (!toH) {
                    if (toSide === 'top' && bendY > y2) bendY = Math.min(bendY, y2 > abv ? (r1.bottom < r2.top ? (r1.bottom + r2.top) / 2 : abv) : abv);
                    if (toSide === 'bottom' && bendY < y2) bendY = blw;
                } else {
                    if (toSide === 'left' && bendX > x2) bendX = lft;
                    if (toSide === 'right' && bendX < x2) bendX = rgt;
                }
            }
            // --- إعادة التحقق بعد التعديلات: لو صار المسار يمر من العقد نرجع لـ ensureBendOutsideNodes ---
            if (r1 && r2 && bendPathCrossesNodes(bendX, bendY, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad)) {
                const valid = ensureBendOutsideNodes(bendX, bendY, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad);
                if (valid) {
                    bendX = valid.x;
                    bendY = valid.y;
                }
            }
            // --- منع self-folding: التأكد إن المسار مبيرجعش على نفسه ---
            // V-H-V: المسار (x1,y1)→(x1,bendY)→(bendX,bendY)→(x2,bendY)→(x2,y2)
            //   seg1 = x1→bendX, seg2 = bendX→x2. لو اتجاههم عكس بعض → fold → نخلي bendX = midX
            // H-V-H: المسار (x1,y1)→(bendX,y1)→(bendX,bendY)→(bendX,y2)→(x2,y2)
            //   seg1 = y1→bendY (ده عمودي واحد) — مفيش fold ممكن
            if (!fromH && !toH) {
                // seg1: x1→bendX, seg2: bendX→x2. fold لو (bendX-x1) و (x2-bendX) اتجاههم عكس بعض
                if ((bendX - x1) * (x2 - bendX) < 0) bendX = (x1 + x2) / 2;
            }
            if (r1 && r2 && bendPathCrossesNodes(bendX, bendY, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad)) {
                const valid = ensureBendOutsideNodes(bendX, bendY, x1, y1, x2, y2, fromH, toH, r1, r2, checkPad);
                if (valid) { bendX = valid.x; bendY = valid.y; }
            }
            if (fromH && !toH) {
                // seg2: bendY→y2. fold لو y direction changes between seg1(y1→bendY) and seg2(bendY→y2) — not applicable (different axes)
                // But seg0: x1→bendX (horizontal). fold لو seg3: bendY→y2 folds — different axis, OK.
            }
            if (!fromH && toH) {
                // seg2: bendX→y2 at bendY level — different axis, OK.
            }
            let pathD;
            if (fromH && toH) {
                pathD = `M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${bendY} L ${bendX} ${y2} L ${x2} ${y2}`;
            } else if (!fromH && !toH) {
                pathD = `M ${x1} ${y1} L ${x1} ${bendY} L ${bendX} ${bendY} L ${x2} ${bendY} L ${x2} ${y2}`;
            } else if (fromH && !toH) {
                pathD = `M ${x1} ${y1} L ${bendX} ${y1} L ${bendX} ${bendY} L ${x2} ${bendY} L ${x2} ${y2}`;
            } else {
                pathD = `M ${x1} ${y1} L ${x1} ${bendY} L ${bendX} ${bendY} L ${bendX} ${y2} L ${x2} ${y2}`;
            }
            return { pathD, bendX, bendY, useHVH: fromH, straightLine: false, pathSource };
        }
        function getDragPreviewPathD(fromX, fromY, currentX, currentY) {
            const midY = (fromY + currentY) / 2;
            const midX = (fromX + currentX) / 2;
            return state.flowDirection === 'horizontal'
                ? `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${currentY} L ${currentX} ${currentY}`
                : `M ${fromX} ${fromY} L ${fromX} ${midY} L ${currentX} ${midY} L ${currentX} ${currentY}`;
        }
        function startConnectionPreview(fromNodeId, fromPort, portType, e) {
            const fromNodeEl = document.getElementById(fromNodeId);
            if (!fromNodeEl) return;
            const outKind = portType === 'yes' ? 'output-yes' : portType === 'no' ? 'output-no' : 'output';
            const side = fromPort || 'bottom';
            const fromPortEl = getPortForSide(fromNodeEl, outKind, side);
            if (!fromPortEl) return;
            const canvasRect = document.getElementById('canvas').getBoundingClientRect();
            const fromRect = fromPortEl.getBoundingClientRect();
            const fromX = (fromRect.left + fromRect.width/2 - canvasRect.left) / state.zoom;
            const fromY = (fromRect.top + fromRect.height/2 - canvasRect.top) / state.zoom;
            const svgInteractive = document.getElementById('connections-interactive-svg');
            const ns = 'http://www.w3.org/2000/svg';
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('class', `connection-path ${portType} connection-preview-path`);
            path.setAttribute('stroke-dasharray', '6 4');
            if (svgInteractive) svgInteractive.appendChild(path);
            state.connectionPreview = { path, fromX, fromY };
            const onMove = (ev) => {
                if (!state.connectionPreview) return;
                const inputPort = getInputPortAtPoint(ev.clientX, ev.clientY);
                let hoveredId = null;
                let hoverPort = null;
                if (inputPort && inputPort.nodeId !== fromNodeId) {
                    hoveredId = inputPort.nodeId;
                    hoverPort = inputPort.toPort;
                } else {
                    for (let i = 0; i < state.nodes.length; i++) {
                        const n = state.nodes[i];
                        if (n.id === fromNodeId) continue;
                        const el = document.getElementById(n.id);
                        if (!el) continue;
                        const r = el.getBoundingClientRect();
                        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
                            hoveredId = n.id;
                            hoverPort = getClosestInputPortToPoint(el, ev.clientX, ev.clientY);
                            break;
                        }
                    }
                }
                const hoveredEl = hoveredId ? document.getElementById(hoveredId) : null;
                setConnectionTargetPort(hoveredEl, hoverPort);
                let endX, endY;
                if (hoveredEl && hoverPort) {
                    const pc = getPortCenterInCanvas(hoveredEl, 'input', hoverPort);
                    endX = pc ? pc.x : (clientToCanvas(ev.clientX, ev.clientY)).x;
                    endY = pc ? pc.y : (clientToCanvas(ev.clientX, ev.clientY)).y;
                } else {
                    const pt = clientToCanvas(ev.clientX, ev.clientY);
                    endX = pt.x;
                    endY = pt.y;
                }
                path.setAttribute('d', getDragPreviewPathD(fromX, fromY, endX, endY));
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (!el) return;
                    if (n.id === fromNodeId) {
                        el.classList.remove('connection-drop-target');
                        return;
                    }
                    el.classList.toggle('connection-drop-target', hoveredId === n.id);
                });
                if (hoveredId) {
                    state.connectionHoverNode = hoveredId;
                    state.connectionHoverPort = { toPort: hoverPort };
                    state.connectionHoverPoint = { clientX: ev.clientX, clientY: ev.clientY };
                } else {
                    state.connectionHoverNode = null;
                    state.connectionHoverPort = null;
                    state.connectionHoverPoint = null;
                }
            };
            const onUp = (ev) => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                clearConnectionTargetPort();
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (el) el.classList.remove('connection-drop-target');
                });
                if (state.connectionPreview && state.connectionPreview.path) {
                    state.connectionPreview.path.remove();
                }
                state.connectionPreview = null;
                if (state.isConnecting && !state.connectionCompleted && state.connectionHoverNode && state.connectionHoverNode !== fromNodeId) {
                    const hoveredEl = document.getElementById(state.connectionHoverNode);
                    const lastPoint = state.connectionHoverPoint || { clientX: ev.clientX, clientY: ev.clientY };
                    let toPort = state.connectionHoverPort ? state.connectionHoverPort.toPort : null;
                    if (!toPort && hoveredEl) {
                        toPort = getClosestInputPortToPoint(hoveredEl, lastPoint.clientX, lastPoint.clientY);
                    }
                    completeConnection(state.connectionHoverNode, toPort);
                }
                if (state.isConnecting) endConnectingMode();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            onMove(e);
        }
        function updateDragPreview() {
            if (!state.draggingEdgeEnd || !state.draggingEdgeEnd.previewPath) return;
            const d = state.draggingEdgeEnd;
            let endX = d.currentX, endY = d.currentY;
            if (d.hoverNode && d.hoverPort) {
                const targetEl = document.getElementById(d.hoverNode);
                const pc = targetEl ? getPortCenterInCanvas(targetEl, 'input', d.hoverPort) : null;
                if (pc) { endX = pc.x; endY = pc.y; }
            }
            d.previewPath.setAttribute('d', getDragPreviewPathD(d.fromX, d.fromY, endX, endY));
        }
        
        function getOutputPortAtPoint(clientX, clientY) {
            const el = document.elementFromPoint(clientX, clientY);
            if (!el) return null;
            const port = el.closest ? el.closest('.port[class*="output"]') : null;
            if (!port) return null;
            const nodeEl = port.closest('.workflow-node');
            if (!nodeEl || !nodeEl.id) return null;
            const side = port.getAttribute('data-side') || undefined;
            const portType = (port.classList.contains('output-yes') || (port.className && port.className.includes && port.className.includes('output-yes'))) ? 'yes' :
                (port.classList.contains('output-no') || (port.className && port.className.includes && port.className.includes('output-no'))) ? 'no' : 'default';
            if (state.nodes.some(n => n.id === nodeEl.id && n.type === 'end')) return null;
            return { nodeId: nodeEl.id, fromPort: side, portType };
        }
        function getInputPortAtPoint(clientX, clientY) {
            const el = document.elementFromPoint(clientX, clientY);
            if (!el) return null;
            const port = el.closest ? el.closest('.port[class*="input"]') : null;
            if (!port) return null;
            const nodeEl = port.closest('.workflow-node');
            if (!nodeEl || !nodeEl.id) return null;
            const side = port.getAttribute('data-side') || undefined;
            return { nodeId: nodeEl.id, toPort: side };
        }
        function startDragEdgeEnd(connIndex, conn, fromX, fromY, startX, startY) {
            saveToUndo();
            const origConn = { ...conn };
            state.connections.splice(connIndex, 1);
            state.draggingEdgeEnd = {
                connIndex,
                from: conn.from,
                type: conn.type,
                fromX, fromY,
                currentX: startX,
                currentY: startY,
                origConn,
                hoverNode: null,
                hoverPort: null,
                hoverPoint: null
            };
            stateSelectedConnIndex = null;
            
            function nodeUnderCursor(clientX, clientY, excludeId) {
                let found = null;
                state.nodes.forEach(n => {
                    if (excludeId && n.id === excludeId) return;
                    const el = document.getElementById(n.id);
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom)
                        found = n.id;
                });
                return found;
            }
            
            const onMove = (e) => {
                if (!state.draggingEdgeEnd) return;
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                state.draggingEdgeEnd.currentX = (e.clientX - canvasRect.left) / state.zoom;
                state.draggingEdgeEnd.currentY = (e.clientY - canvasRect.top) / state.zoom;
                const inputPort = getInputPortAtPoint(e.clientX, e.clientY);
                let hoveredId = null;
                let hoverPort = null;
                if (inputPort && inputPort.nodeId !== state.draggingEdgeEnd.from) {
                    hoveredId = inputPort.nodeId;
                    hoverPort = inputPort.toPort;
                } else {
                    const candidate = nodeUnderCursor(e.clientX, e.clientY, state.draggingEdgeEnd.from);
                    if (candidate && candidate !== state.draggingEdgeEnd.from) {
                        hoveredId = candidate;
                        const el = document.getElementById(candidate);
                        hoverPort = el ? getSideOfPointFromShape(el, e.clientX, e.clientY) : null;
                    }
                }
                const hoveredEl = hoveredId ? document.getElementById(hoveredId) : null;
                setConnectionTargetPort(hoveredEl, hoverPort);
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (!el) return;
                    if (n.id === state.draggingEdgeEnd.from) {
                        el.classList.remove('connection-drop-target');
                        return;
                    }
                    el.classList.toggle('connection-drop-target', hoveredId === n.id);
                });
                state.draggingEdgeEnd.hoverNode = hoveredId;
                state.draggingEdgeEnd.hoverPort = hoverPort;
                state.draggingEdgeEnd.hoverPoint = hoveredId ? { clientX: e.clientX, clientY: e.clientY } : null;
                updateDragPreview();
            };
            const onUp = (e) => {
                if (!state.draggingEdgeEnd) return;
                clearConnectionTargetPort();
                const inputPort = getInputPortAtPoint(e.clientX, e.clientY);
                let newTo = inputPort ? inputPort.nodeId : nodeUnderCursor(e.clientX, e.clientY, state.draggingEdgeEnd.from);
                let toPort = inputPort ? inputPort.toPort : (newTo ? getSideOfPointFromShape(document.getElementById(newTo), e.clientX, e.clientY) : undefined);
                if ((!newTo || newTo === state.draggingEdgeEnd.from) && state.draggingEdgeEnd.hoverNode && state.draggingEdgeEnd.hoverNode !== state.draggingEdgeEnd.from) {
                    newTo = state.draggingEdgeEnd.hoverNode;
                    const hoverPoint = state.draggingEdgeEnd.hoverPoint || { clientX: e.clientX, clientY: e.clientY };
                    const targetEl = document.getElementById(newTo);
                    toPort = state.draggingEdgeEnd.hoverPort || (targetEl ? getSideOfPointFromShape(targetEl, hoverPoint.clientX, hoverPoint.clientY) : undefined);
                }
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (el) el.classList.remove('connection-drop-target');
                });
                if (newTo && newTo !== state.draggingEdgeEnd.from) {
                    state.connections.push({
                        from: state.draggingEdgeEnd.from,
                        to: newTo,
                        type: state.draggingEdgeEnd.type,
                        fromPort: origConn.fromPort,
                        toPort
                    });
                    saveToUndo();
                } else {
                    state.connections.push(origConn);
                }
                state.draggingEdgeEnd = null;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                renderConnections();
            };
            renderConnections();
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        function startDragBendPoint(connIndex, conn, x1, y1, x2, y2) {
            saveToUndo();
            if (!conn.bendPoint) conn.bendPoint = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
            state.draggingBendPoint = true;
            const fromNode = document.getElementById(conn.from);
            const toNode = document.getElementById(conn.to);
            let fromSide = conn.fromPort;
            let toSide = conn.toPort;
            if (fromSide == null || toSide == null) {
                const outKind = conn.type === 'yes' ? 'output-yes' : conn.type === 'no' ? 'output-no' : 'output';
                const pair = getClosestPortPair(fromNode, toNode, outKind);
                fromSide = fromSide ?? pair.fromSide;
                toSide = toSide ?? pair.toSide;
            }
            const startClientX = event.clientX, startClientY = event.clientY;
            const startBX = conn.bendPoint.x, startBY = conn.bendPoint.y;
            const onMove = (e) => {
                const dx = (e.clientX - startClientX) / state.zoom;
                const dy = (e.clientY - startClientY) / state.zoom;
                const rawX = startBX + dx, rawY = startBY + dy;
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                const valid = getValidBendNearestTo(rawX, rawY, x1, y1, x2, y2, fromSide, toSide, fromNode, toNode, canvasRect);
                conn.bendPoint.x = valid.x;
                conn.bendPoint.y = valid.y;
                renderConnections();
            };
            const onUp = () => {
                state.draggingBendPoint = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        function updateDragPreviewStart() {
            if (!state.draggingEdgeStart || !state.draggingEdgeStart.previewPath) return;
            const d = state.draggingEdgeStart;
            d.previewPath.setAttribute('d', getDragPreviewPathD(d.currentX, d.currentY, d.toX, d.toY));
        }
        function startDragEdgeStart(connIndex, conn, startX, startY, toX, toY) {
            saveToUndo();
            const origConn = { ...conn };
            state.connections.splice(connIndex, 1);
            state.draggingEdgeStart = {
                connIndex,
                to: conn.to,
                toPort: conn.toPort,
                type: conn.type,
                toX, toY,
                currentX: startX,
                currentY: startY,
                origConn,
                hoverNode: null,
                hoverData: null
            };
            stateSelectedConnIndex = null;
            
            function nodeUnderCursor(clientX, clientY, excludeId) {
                let found = null;
                state.nodes.forEach(n => {
                    if (excludeId && n.id === excludeId) return;
                    const el = document.getElementById(n.id);
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom)
                        found = n.id;
                });
                return found;
            }
            
            const onMove = (e) => {
                if (!state.draggingEdgeStart) return;
                const canvasRect = document.getElementById('canvas').getBoundingClientRect();
                state.draggingEdgeStart.currentX = (e.clientX - canvasRect.left) / state.zoom;
                state.draggingEdgeStart.currentY = (e.clientY - canvasRect.top) / state.zoom;
                const outputPort = getOutputPortAtPoint(e.clientX, e.clientY);
                let hoveredId = null;
                let hoverData = null;
                if (outputPort && outputPort.nodeId !== state.draggingEdgeStart.to) {
                    hoveredId = outputPort.nodeId;
                    hoverData = { fromPort: outputPort.fromPort, portType: outputPort.portType };
                } else {
                    const candidate = nodeUnderCursor(e.clientX, e.clientY, state.draggingEdgeStart.to);
                    if (candidate && candidate !== state.draggingEdgeStart.to) {
                        hoveredId = candidate;
                        const el = document.getElementById(candidate);
                        const out = el ? getClosestOutputPortToPoint(el, e.clientX, e.clientY) : { side: 'bottom', portType: 'default' };
                        hoverData = { fromPort: out.side, portType: out.portType };
                    }
                }
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (!el) return;
                    if (n.id === state.draggingEdgeStart.to) {
                        el.classList.remove('connection-drop-target');
                        return;
                    }
                    el.classList.toggle('connection-drop-target', hoveredId === n.id);
                });
                state.draggingEdgeStart.hoverNode = hoveredId;
                state.draggingEdgeStart.hoverData = hoveredId ? { ...hoverData, point: { clientX: e.clientX, clientY: e.clientY } } : null;
                updateDragPreviewStart();
            };
            const onUp = (e) => {
                if (!state.draggingEdgeStart) return;
                const outputPort = getOutputPortAtPoint(e.clientX, e.clientY);
                let newFrom = outputPort ? outputPort.nodeId : nodeUnderCursor(e.clientX, e.clientY, state.draggingEdgeStart.to);
                let data = outputPort ? { fromPort: outputPort.fromPort, portType: outputPort.portType } : null;
                if ((!newFrom || newFrom === state.draggingEdgeStart.to) && state.draggingEdgeStart.hoverNode && state.draggingEdgeStart.hoverNode !== state.draggingEdgeStart.to) {
                    newFrom = state.draggingEdgeStart.hoverNode;
                    data = state.draggingEdgeStart.hoverData ? { fromPort: state.draggingEdgeStart.hoverData.fromPort, portType: state.draggingEdgeStart.hoverData.portType, point: state.draggingEdgeStart.hoverData.point } : null;
                }
                state.nodes.forEach(n => {
                    const el = document.getElementById(n.id);
                    if (el) el.classList.remove('connection-drop-target');
                });
                if (newFrom && newFrom !== state.draggingEdgeStart.to) {
                    const fromNodeEl = document.getElementById(newFrom);
                    let fromPort, portType;
                    if (data && data.fromPort && data.portType) {
                        fromPort = data.fromPort;
                        portType = data.portType;
                    } else if (fromNodeEl) {
                        const out = getClosestOutputPortToPoint(fromNodeEl, e.clientX, e.clientY);
                        fromPort = out.side || 'bottom';
                        portType = out.portType || 'default';
                    } else {
                        fromPort = 'bottom';
                        portType = 'default';
                    }
                    state.connections.push({
                        from: newFrom,
                        to: state.draggingEdgeStart.to,
                        type: portType,
                        fromPort,
                        toPort: state.draggingEdgeStart.toPort
                    });
                    saveToUndo();
                } else {
                    state.connections.push(origConn);
                }
                state.draggingEdgeStart = null;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                renderConnections();
            };
            renderConnections();
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }
        
        function selectConnection(idx) {
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = [];
            updateSelectionUI();
            closeProperties();
            stateSelectedConnIndex = idx;
            const conn = state.connections[idx];
            const px = (conn && (conn.type === 'yes' || conn.type === 'no')) ? (conn.labelFontSize != null ? conn.labelFontSize : state.labelFontSize) : state.labelFontSize;
            updateLabelFontSizeDisplay(px);
            renderConnections();
        }
        
        function deselectConnection() {
            stateSelectedConnIndex = null;
            updateLabelFontSizeDisplay(state.labelFontSize);
            renderConnections();
        }
        
        function deleteConnection(connIndex) {
            if (connIndex >= 0 && connIndex < state.connections.length) {
                state.connections.splice(connIndex, 1);
                saveToUndo();
                deselectConnection();
                renderConnections();
            }
        }
        
        // ===== SELECTION =====
        function getSelectedNodeIds() {
            if (state.selectedNodeIds.length > 0) return state.selectedNodeIds.filter(id => state.nodes.some(n => n.id === id));
            if (state.selectedNode) return [state.selectedNode.id];
            if (state.selectedLabelNodeId) return [state.selectedLabelNodeId];
            return [];
        }
        function selectNode(id) {
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = [];
            stateSelectedConnIndex = null;
            updateSelectionUI();
            const node = state.nodes.find(n => n.id === id);
            if (node) {
                state.selectedNode = node;
                state.selectedNodeIds = [id];
                const el = document.getElementById(id);
                if (el) el.classList.add('selected');
                updateLabelFontSizeDisplay(node.labelFontSize != null ? node.labelFontSize : state.labelFontSize);
                showProperties(node);
            } else {
                closeProperties();
            }
        }
        function selectLabelOnly(nodeId) {
            state.selectedNode = null;
            state.selectedLabelNodeId = nodeId;
            state.selectedNodeIds = [nodeId];
            stateSelectedConnIndex = null;
            updateSelectionUI();
            const el = document.getElementById(nodeId);
            if (el) el.classList.add('label-selected');
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) updateLabelFontSizeDisplay(node.labelFontSize != null ? node.labelFontSize : state.labelFontSize);
            closeProperties();
        }
        function toggleNodeInSelection(nodeId, ctrlKey) {
            if (!ctrlKey) {
                selectNode(nodeId);
                return;
            }
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            stateSelectedConnIndex = null;
            const idx = state.selectedNodeIds.indexOf(nodeId);
            if (idx >= 0) {
                state.selectedNodeIds.splice(idx, 1);
            } else {
                state.selectedNodeIds.push(nodeId);
            }
            if (state.selectedNodeIds.length === 1) {
                const node = state.nodes.find(n => n.id === state.selectedNodeIds[0]);
                if (node) {
                    state.selectedNode = node;
                    updateLabelFontSizeDisplay(node.labelFontSize != null ? node.labelFontSize : state.labelFontSize);
                    showProperties(node);
                }
            } else {
                closeProperties();
                if (state.selectedNodeIds.length > 0) updateLabelFontSizeDisplay(state.labelFontSize);
            }
            updateSelectionUI();
        }
        function selectAllNodes() {
            if (state.nodes.length === 0) return;
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = state.nodes.map(n => n.id);
            stateSelectedConnIndex = null;
            updateSelectionUI();
            closeProperties();
        }
        function updateSelectionUI() {
            document.querySelectorAll('.workflow-node').forEach(n => {
                n.classList.remove('selected', 'label-selected', 'multi-selected');
                const id = n.id;
                if (state.selectedNodeIds.includes(id)) {
                    n.classList.add(state.selectedNodeIds.length > 1 ? 'multi-selected' : (state.selectedLabelNodeId === id ? 'label-selected' : 'selected'));
                } else if (state.selectedLabelNodeId === id) {
                    n.classList.add('label-selected');
                }
            });
        }
        function deselectAll() {
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = [];
            stateSelectedConnIndex = null;
            updateSelectionUI();
            closeProperties();
            updateLabelFontSizeDisplay(state.labelFontSize);
        }
        function deleteSelectedNodes() {
            const ids = getSelectedNodeIds();
            if (ids.length === 0) return;
            if (!confirm(ids.length > 1 ? `Delete ${ids.length} selected nodes?` : 'Delete this node?')) return;
            ids.forEach(id => {
                state.connections = state.connections.filter(c => c.from !== id && c.to !== id);
                state.nodes = state.nodes.filter(n => n.id !== id);
                document.getElementById(id)?.remove();
            });
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = [];
            closeProperties();
            renderConnections();
            updateEmptyState();
            saveToUndo();
        }
        
        // ===== PROPERTIES PANEL =====
        function showProperties(node) {
            const panel = document.getElementById('properties-panel');
            const icon = document.getElementById('prop-icon');
            const title = document.getElementById('prop-title');
            const type = document.getElementById('prop-type');
            const body = document.getElementById('prop-body');
            
            icon.className = 'properties-icon ' + getTypeClass(node.type);
            icon.textContent = getTypeIcon(node.type);
            title.textContent = node.name;
            type.textContent = node.type.charAt(0).toUpperCase() + node.type.slice(1);
            
            body.innerHTML = generatePropertiesForm(node);
            panel.classList.add('active');
        }
        
        // Helper function to get all available fields from trigger/form nodes
        function getAvailableFields() {
            const fields = [];
            state.nodes.forEach(n => {
                if ((n.type === 'trigger' || n.type === 'form') && n.config.fields) {
                    n.config.fields.forEach(f => {
                        const key = f.name || f.id;
                        const label = f.label || humanizeFieldLabel(key);
                        if (key) {
                            fields.push({
                                name: key,
                                label: label || key,
                                type: f.type,
                                required: f.required || false,
                                source: n.name
                            });
                        }
                    });
                }
            });
            return fields;
        }
        
        // Sources for mapping: form/start fields + output from other steps. Used in Tool params and similar.
        function getMappingSources(currentNodeId) {
            const sources = [];
            const availableFields = getAvailableFields();
            availableFields.forEach(f => {
                sources.push({ label: `From form: ${f.label || f.name}`, value: `{{${f.name}}}`, group: 'form' });
            });
            state.nodes.forEach(n => {
                if (n.id === currentNodeId || n.type === 'end') return;
                const name = n.name || n.type || n.id;
                sources.push({ label: `From step: ${name}`, value: `{{steps.${n.id}.output}}`, group: 'step' });
            });
            return sources;
        }
        
        function generatePropertiesForm(node) {
            let html = `
                <div class="property-group">
                    <label class="property-label">Step name</label>
                    <input type="text" class="property-input" value="${escapeHtml(node.name)}" 
                           placeholder="e.g. Send confirmation"
                           onchange="updateNodeProperty('${node.id}', 'name', this.value)">
                    <p class="property-hint">You can drag the label on the canvas to reposition it.</p>
                </div>
            `;
            
            // Get available fields for dropdowns
            const availableFields = getAvailableFields();
            
            switch (node.type) {
                case 'condition':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Field to Check</label>
                            ${availableFields.length > 0 ? `
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'field', this.value)">
                                    <option value="">-- Select Field --</option>
                                    ${availableFields.map(f => `
                                        <option value="${f.name}" ${node.config.field === f.name ? 'selected' : ''}>
                                            ${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)} (${escapeHtml(f.type || '')})
                                        </option>
                                    `).join('')}
                                    <option value="_custom" ${node.config.field && !availableFields.find(f => f.name === node.config.field) ? 'selected' : ''}>
                                        ✏️ Custom field...
                                    </option>
                                </select>
                                ${(node.config.field && !availableFields.find(f => f.name === node.config.field)) || node.config.field === '_custom' ? `
                                    <input type="text" class="property-input" style="margin-top:8px;" placeholder="Enter custom field name" 
                                           value="${node.config.field === '_custom' ? '' : (node.config.field || '')}"
                                           onchange="updateNodeConfig('${node.id}', 'field', this.value)">
                                ` : ''}
                            ` : `
                                <input type="text" class="property-input" placeholder="e.g., amount, status" 
                                       value="${node.config.field || ''}"
                                       onchange="updateNodeConfig('${node.id}', 'field', this.value)">
                                <div style="font-size:11px;color:#f59e0b;margin-top:4px;">
                                    💡 Tip: Add fields to your Start/Form node first
                                </div>
                            `}
                        </div>
                        <div class="property-group">
                            <label class="property-label">Operator</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'operator', this.value)">
                                <option value="equals" ${node.config.operator === 'equals' ? 'selected' : ''}>Equals</option>
                                <option value="not_equals" ${node.config.operator === 'not_equals' ? 'selected' : ''}>Not Equals</option>
                                <option value="greater_than" ${node.config.operator === 'greater_than' ? 'selected' : ''}>Greater Than</option>
                                <option value="less_than" ${node.config.operator === 'less_than' ? 'selected' : ''}>Less Than</option>
                                <option value="contains" ${node.config.operator === 'contains' ? 'selected' : ''}>Contains</option>
                                <option value="is_empty" ${node.config.operator === 'is_empty' ? 'selected' : ''}>Is Empty</option>
                            </select>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Value</label>
                            <input type="text" class="property-input" placeholder="Compare value" 
                                   value="${node.config.value || ''}"
                                   onchange="updateNodeConfig('${node.id}', 'value', this.value)">
                        </div>
                    `;
                    break;
                    
                case 'delay':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Wait Duration</label>
                            <div style="display:flex;gap:8px;">
                                <input type="number" class="property-input" style="width:100px;" 
                                       value="${node.config.duration || 5}"
                                       onchange="updateNodeConfig('${node.id}', 'duration', parseInt(this.value))">
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'unit', this.value)">
                                    <option value="seconds" ${node.config.unit === 'seconds' ? 'selected' : ''}>Seconds</option>
                                    <option value="minutes" ${node.config.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
                                    <option value="hours" ${node.config.unit === 'hours' ? 'selected' : ''}>Hours</option>
                                    <option value="days" ${node.config.unit === 'days' ? 'selected' : ''}>Days</option>
                                </select>
                            </div>
                        </div>
                    `;
                    break;
                    
                case 'tool':
                    const selTool = state.tools.find(t => t.id === node.config.toolId);
                    const inputParams = (selTool && selTool.api_config && selTool.api_config.input_parameters) ? selTool.api_config.input_parameters : [];
                    const toolParams = node.config.params || {};
                    const mappingSources = getMappingSources(node.id);
                    html += `
                        <div class="property-group">
                            <label class="property-label">Tool</label>
                            <div class="tool-selector">
                                ${state.tools.length ? state.tools.map(t => `
                                    <div class="tool-option ${node.config.toolId === t.id ? 'selected' : ''}" 
                                         onclick="selectTool('${node.id}', '${t.id}')">
                                        <div class="tool-option-icon">${getToolIcon(t.type)}</div>
                                        <div class="tool-option-info">
                                            <div class="tool-option-name">${escapeHtml(t.name)}</div>
                                            <div class="tool-option-type">${escapeHtml(t.type)}</div>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="tool-selector-empty">
                                        <span class="tool-selector-empty-icon">🔧</span>
                                        <p class="tool-selector-empty-text">No tools in the platform yet. Add tools in Settings, then refresh.</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                    if (inputParams.length > 0) {
                        const formSources = mappingSources.filter(s => s.group === 'form');
                        const stepSources = mappingSources.filter(s => s.group === 'step');
                        html += `
                        <div class="prop-section">
                            <h4 class="prop-section-title">What to send</h4>
                            <p class="prop-section-hint">Map each field to data from your form, a previous step, or enter a fixed value.</p>
                            ${inputParams.map((p, idx) => {
                                const paramName = (p.name || ('param_' + idx)).replace(/'/g, "\\'");
                                const currentVal = toolParams[p.name || paramName] || '';
                                const isFromSource = currentVal && String(currentVal).startsWith('{{') && String(currentVal).endsWith('}}');
                                const fixedVal = isFromSource ? '' : (currentVal || '');
                                const sourceVal = isFromSource ? currentVal : '_fixed_';
                                return `
                                <div class="tool-param-card tool-param-row">
                                    <div class="param-name">${escapeHtml(p.name)}${p.required ? ' <span style="color:#f87171;">*</span>' : ''}</div>
                                    ${p.description ? `<div class="param-desc">${escapeHtml(p.description)}</div>` : ''}
                                    <span class="value-from-label">Value from</span>
                                    <div class="value-from-row">
                                        <select class="property-select tool-param-source" data-node-id="${node.id}" data-param-name="${escapeHtml(paramName)}" onchange="onToolParamSourceChange(this)">
                                            <option value="_fixed_" ${sourceVal === '_fixed_' ? 'selected' : ''}>Type a fixed value</option>
                                            ${formSources.length ? `<optgroup label="From form / start">${formSources.map(s => `<option value="${escapeHtml(s.value)}" ${sourceVal === s.value ? 'selected' : ''}>${escapeHtml(s.label.replace('From form: ',''))}</option>`).join('')}</optgroup>` : ''}
                                            ${stepSources.length ? `<optgroup label="From a previous step">${stepSources.map(s => `<option value="${escapeHtml(s.value)}" ${sourceVal === s.value ? 'selected' : ''}>${escapeHtml(s.label.replace('From step: ',''))}</option>`).join('')}</optgroup>` : ''}
                                        </select>
                                        <input type="text" class="property-input tool-param-fixed" placeholder="Enter value" 
                                               data-node-id="${node.id}" data-param-name="${escapeHtml(paramName)}"
                                               value="${escapeHtml(fixedVal)}"
                                               onchange="updateToolParamFromInput(this)"
                                               ${isFromSource ? 'style="display:none;"' : ''}>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    `;
                    } else if (selTool && (selTool.type === 'api' || selTool.type === 'website' || selTool.type === 'knowledge')) {
                        html += `<div class="prop-section"><p class="property-hint">This tool doesn’t need extra fields here — use it as is or configure it in the platform.</p></div>`;
                    } else if (!node.config.toolId) {
                        html += `<div class="prop-section"><p class="property-hint">Select a tool above. If it needs data to send, you’ll see fields to map from your form or previous steps.</p></div>`;
                    }
                    break;
                    
                case 'approval':
                    const aCfg = node.config || {};
                    const aSrc = aCfg.assignee_source || (aCfg.approvers && aCfg.approvers.length ? 'platform_user' : 'platform_user');
                    const aIds = aCfg.assignee_ids || aCfg.approvers || [];
                    const aToolId = aCfg.assignee_tool_id || '';
                    const timeoutVal = aCfg.timeout_hours != null ? aCfg.timeout_hours : (aCfg.timeout != null ? aCfg.timeout : 24);
                    const dirTypeLabel = {'dynamic_manager':'Direct Manager','department_manager':'Dept Head','management_chain':'Mgmt Chain'}[aCfg.directory_assignee_type] || '';
                    const approverLabel = aSrc === 'user_directory' ? ('Auto: ' + (dirTypeLabel || 'Directory')) : aSrc === 'tool' ? (state.tools.find(t => t.id === aToolId) || {}).name || 'Tool' : (aSrc.replace('platform_','') + ': ' + aIds.length + ' selected');
                    html += `
                        <div class="property-group">
                            <label class="property-label">Approval Message</label>
                            <textarea class="property-textarea" placeholder="Message to show approvers..."
                                      onchange="updateNodeConfig('${node.id}', 'message', this.value)">${aCfg.message || ''}</textarea>
                            ${availableFields.length > 0 ? `
                                <div class="field-chips">
                                    <span class="field-chips-label">Insert from form:</span>
                                    <div style="display:flex;flex-wrap:wrap;">
                                        ${availableFields.map(f => `
                                            <button type="button" onclick="insertFieldRef('${node.id}', 'message', '{{${f.name}}}')" class="field-chip">${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="property-group">
                            <label class="property-label">Approvers</label>
                            <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">From: ${approverLabel}</div>
                            <button type="button" onclick="openApprovalConfigModal('${node.id}')" class="property-input" style="cursor:pointer;text-align:left;">
                                Configure approvers (Platform User / Role / Group / Tool)
                            </button>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Timeout (hours)</label>
                            <input type="number" class="property-input" value="${timeoutVal}" min="1"
                                   onchange="updateNodeConfig('${node.id}', 'timeout_hours', parseInt(this.value) || 24)">
                        </div>
                    `;
                    break;
                    
                case 'notification':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Channel</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'channel', this.value)">
                                <option value="email" ${node.config.channel === 'email' ? 'selected' : ''}>Email</option>
                                <option value="slack" ${node.config.channel === 'slack' ? 'selected' : ''}>Slack</option>
                                <option value="teams" ${node.config.channel === 'teams' ? 'selected' : ''}>Microsoft Teams</option>
                                <option value="sms" ${node.config.channel === 'sms' ? 'selected' : ''}>SMS</option>
                            </select>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Recipient</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'recipient', this.value)">
                                <option value="">-- Select Recipient --</option>
                                <option value="requester" ${node.config.recipient === 'requester' ? 'selected' : ''}>👤 Requester (person who submitted)</option>
                                <option value="manager" ${node.config.recipient === 'manager' ? 'selected' : ''}>👔 Manager (requester's direct manager)</option>
                                ${availableFields.filter(f => f.type === 'email' || f.type === 'text').map(f => `
                                    <option value="{{${f.name}}}" ${node.config.recipient === '{{' + f.name + '}}' ? 'selected' : ''}>
                                        📧 ${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)} (form field)
                                    </option>
                                `).join('')}
                                <option value="_custom" ${node.config.recipient && node.config.recipient !== 'requester' && node.config.recipient !== 'manager' && !node.config.recipient.startsWith('{{') ? 'selected' : ''}>✏️ Custom email...</option>
                            </select>
                            <input type="text" class="property-input" style="margin-top:8px;${node.config.recipient && node.config.recipient !== 'requester' && node.config.recipient !== 'manager' && !node.config.recipient.startsWith('{{') ? '' : 'display:none;'}" 
                                   placeholder="email@example.com" 
                                   value="${node.config.recipient && node.config.recipient !== 'requester' && node.config.recipient !== 'manager' && !node.config.recipient.startsWith('{{') ? (node.config.recipient || '') : ''}"
                                   onchange="updateNodeConfig('${node.id}', 'recipient', this.value)">
                            <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                ${node.config.recipient === 'requester' ? '✅ Will auto-send to the employee who submitted the form' : 
                                  node.config.recipient === 'manager' ? '✅ Will auto-send to the submitter\'s direct manager' :
                                  node.config.recipient && node.config.recipient.startsWith('{{') ? '✅ Will use the email from the form field' :
                                  node.config.recipient ? '✅ Will send to: ' + escapeHtml(node.config.recipient) :
                                  '⚠️ No recipient set — notification won\'t be sent'}
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Message Template</label>
                            <textarea class="property-textarea" placeholder="Enter message template..."
                                      onchange="updateNodeConfig('${node.id}', 'template', this.value)">${node.config.template || ''}</textarea>
                            ${availableFields.length > 0 ? `
                                <div class="field-chips">
                                    <span class="field-chips-label">Insert from form:</span>
                                    <div style="display:flex;flex-wrap:wrap;">
                                        ${availableFields.map(f => `
                                            <button type="button" onclick="insertFieldRef('${node.id}', 'template', '{{${f.name}}}')" class="field-chip">${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    break;
                    
                case 'ai':
                    html += `
                        <div class="property-group">
                            <label class="property-label">AI Prompt</label>
                            <textarea class="property-textarea" style="min-height:120px;" 
                                      placeholder="Describe what the AI should do..."
                                      onchange="updateNodeConfig('${node.id}', 'prompt', this.value)">${node.config.prompt || ''}</textarea>
                            ${availableFields.length > 0 ? `
                                <div class="field-chips">
                                    <span class="field-chips-label">Insert from form:</span>
                                    <div style="display:flex;flex-wrap:wrap;">
                                        ${availableFields.map(f => `
                                            <button type="button" onclick="insertFieldRef('${node.id}', 'prompt', '{{${f.name}}}')" class="field-chip">${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="property-group">
                            <label class="property-label">AI Model</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'model', this.value)">
                                <option value="gpt-4o" ${node.config.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Fast)</option>
                                <option value="gpt-4o-mini" ${node.config.model === 'gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini</option>
                                <option value="claude-sonnet-4-20250514" ${node.config.model === 'claude-sonnet-4-20250514' ? 'selected' : ''}>Claude Sonnet</option>
                            </select>
                        </div>
                    `;
                    break;
                
                case 'form':
                case 'trigger':
                    // Form fields editor
                    const fields = node.config.fields || [];
                    const triggerType = (node.config.triggerType || 'manual');
                    html += `
                        <div class="property-group">
                            <label class="property-label">Start method</label>
                            <select class="property-select" onchange="setTriggerType('${node.id}', this.value)">
                                <option value="manual" ${triggerType === 'manual' ? 'selected' : ''}>Manual (Form)</option>
                                <option value="schedule" ${triggerType === 'schedule' ? 'selected' : ''}>Schedule</option>
                                <option value="webhook" ${triggerType === 'webhook' ? 'selected' : ''}>Webhook</option>
                            </select>
                            <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                Choose how this workflow starts. Manual uses a form; Schedule runs automatically; Webhook starts from an API call.
                            </div>
                        </div>
                        
                        ${triggerType === 'schedule' ? `
                            <div class="property-group">
                                <label class="property-label">Schedule (Cron)</label>
                                <input type="text" class="property-input" placeholder="0 9 * * *"
                                       value="${escapeHtml(node.config.cron || '0 9 * * *')}"
                                       onchange="updateNodeConfig('${node.id}', 'cron', this.value)">
                                <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                    Example: <code>0 9 * * *</code> runs every day at 9:00
                                </div>
                            </div>
                            <div class="property-group">
                                <label class="property-label">Timezone</label>
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'timezone', this.value)">
                                    <option value="UTC" ${(node.config.timezone || 'UTC') === 'UTC' ? 'selected' : ''}>UTC</option>
                                    <option value="Africa/Cairo" ${(node.config.timezone || '') === 'Africa/Cairo' ? 'selected' : ''}>Cairo</option>
                                    <option value="Asia/Dubai" ${(node.config.timezone || '') === 'Asia/Dubai' ? 'selected' : ''}>Dubai</option>
                                    <option value="Europe/London" ${(node.config.timezone || '') === 'Europe/London' ? 'selected' : ''}>London</option>
                                </select>
                            </div>
                        ` : ''}
                        
                        ${triggerType === 'webhook' ? `
                            <div class="property-group">
                                <label class="property-label">HTTP Method</label>
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'method', this.value)">
                                    <option value="POST" ${(node.config.method || 'POST') === 'POST' ? 'selected' : ''}>POST</option>
                                    <option value="GET" ${(node.config.method || '') === 'GET' ? 'selected' : ''}>GET</option>
                                </select>
                            </div>
                            <div class="property-group">
                                <label class="property-label">Webhook path</label>
                                <input type="text" class="property-input" placeholder="/trigger"
                                       value="${escapeHtml(node.config.path || '/trigger')}"
                                       onchange="updateNodeConfig('${node.id}', 'path', this.value)">
                                <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                    The platform will expose a webhook endpoint for this workflow.
                                </div>
                            </div>
                        ` : ''}
                        
                        ${triggerType === 'manual' ? `
                        <div class="property-group">
                            <label class="property-label">Form title</label>
                            <input type="text" class="property-input" placeholder="e.g., Submit Expense Report" 
                                   value="${escapeHtml(node.config.formTitle || node.config.title || '')}"
                                   onchange="updateNodeConfig('${node.id}', 'formTitle', this.value)">
                        </div>
                        <div class="property-group">
                            <label class="property-label">Input Fields</label>
                            <div id="form-fields-list" style="margin-bottom:12px;">
                                ${fields.length === 0 ? '<div style="color:#6b7280;font-size:12px;padding:8px;">No fields yet. Add some below.</div>' : ''}
                                ${fields.map((f, idx) => `
                                    <div class="tool-param-card" style="padding:10px;margin-bottom:10px;">
                                        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                            <div class="param-name">Field</div>
                                            <button type="button" onclick="removeFormField('${node.id}', ${idx})"
                                                style="background:#ef4444;border:none;color:white;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px;">
                                                Remove
                                            </button>
                                        </div>
                                        
                                        <label class="property-label" style="margin-top:8px;">Label</label>
                                        <input type="text" class="property-input" placeholder="e.g., Employee Email"
                                               value="${escapeHtml(f.label || humanizeFieldLabel(f.name || f.id) || '')}"
                                               onchange="updateFormFieldLabel('${node.id}', ${idx}, this.value)">
                                        
                                        <div style="display:flex;gap:10px;align-items:flex-end;margin-top:10px;">
                                            <div style="flex:1;">
                                                <label class="property-label">Type</label>
                                                <select class="property-select" onchange="updateFormField('${node.id}', ${idx}, 'type', this.value)">
                                                    <option value="text" ${f.type === 'text' ? 'selected' : ''}>Text</option>
                                                    <option value="number" ${f.type === 'number' ? 'selected' : ''}>Number</option>
                                                    <option value="email" ${f.type === 'email' ? 'selected' : ''}>Email</option>
                                                    <option value="date" ${f.type === 'date' ? 'selected' : ''}>Date</option>
                                                    <option value="textarea" ${f.type === 'textarea' ? 'selected' : ''}>Long Text</option>
                                                    <option value="select" ${f.type === 'select' ? 'selected' : ''}>Dropdown</option>
                                                    <option value="file" ${f.type === 'file' ? 'selected' : ''}>File Upload</option>
                                                </select>
                                            </div>
                                            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--pb-muted);white-space:nowrap;">
                                                <input type="checkbox" ${f.required ? 'checked' : ''} 
                                                       onchange="updateFormField('${node.id}', ${idx}, 'required', this.checked)">
                                                Required
                                            </label>
                                        </div>
                                        
                                        <label class="property-label" style="margin-top:10px;">Placeholder</label>
                                        <input type="text" class="property-input" placeholder="e.g., Enter your email"
                                               value="${escapeHtml(f.placeholder || '')}"
                                               onchange="updateFormField('${node.id}', ${idx}, 'placeholder', this.value)">

                                        <div style="margin-top:10px;">
                                            <label class="property-label">Prefill from user profile</label>
                                            <select class="property-select" onchange="setFieldPrefill('${node.id}', ${idx}, this.value)">
                                                <option value="" ${!f.prefill ? 'selected' : ''}>None</option>
                                                <option value="email" ${(f.prefill && f.prefill.source === 'currentUser' && f.prefill.key === 'email') ? 'selected' : ''}>Email</option>
                                                <option value="name" ${(f.prefill && f.prefill.source === 'currentUser' && f.prefill.key === 'name') ? 'selected' : ''}>Name</option>
                                            </select>
                                            <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                                This saves time by auto-filling known information for the logged-in user.
                                            </div>
                                        </div>
                                        
                                        ${(f.type === 'file') ? `
                                            <div style="margin-top:10px;">
                                                <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--pb-muted);">
                                                    <input type="checkbox" ${f.multiple ? 'checked' : ''} 
                                                           onchange="updateFormField('${node.id}', ${idx}, 'multiple', this.checked)">
                                                    Allow multiple files
                                                </label>
                                                <div style="font-size:11px;color:var(--pb-muted);margin-top:4px;">
                                                    When enabled, the user can upload more than one file at a time.
                                                </div>
                                            </div>
                                        ` : ''}
                                        
                                        ${(f.type === 'select') ? `
                                            <div style="margin-top:10px;">
                                                <label class="property-label">Dropdown Options</label>
                                                <div style="display:flex;flex-direction:column;gap:8px;">
                                                    ${(Array.isArray(f.options) ? f.options : []).map((opt, oIdx) => `
                                                        <div style="display:flex;gap:8px;align-items:center;">
                                                            <input type="text" class="property-input" style="flex:1;margin:0;" placeholder="Option"
                                                                value="${escapeHtml(opt || '')}"
                                                                onchange="updateSelectOption('${node.id}', ${idx}, ${oIdx}, this.value)">
                                                            <button type="button" onclick="removeSelectOption('${node.id}', ${idx}, ${oIdx})"
                                                                style="background:#334155;border:none;color:white;width:34px;height:34px;border-radius:10px;cursor:pointer;">×</button>
                                                        </div>
                                                    `).join('')}
                                                    <button type="button" onclick="addSelectOption('${node.id}', ${idx})"
                                                        style="width:100%;padding:9px;background:#334155;border:none;border-radius:10px;color:white;cursor:pointer;font-size:12px;">
                                                        + Add option
                                                    </button>
                                                </div>
                                                <div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">
                                                    These options will appear to end users when running the workflow.
                                                </div>
                                            </div>
                                        ` : ''}
                                        
                                        <div style="margin-top:12px;padding-top:10px;border-top:1px dashed rgba(148,163,184,0.22);">
                                            <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--pb-muted);">
                                                <input type="checkbox" ${(f.derived && f.derived.expression) || f.readOnly ? 'checked' : ''} 
                                                       onchange="toggleDerivedField('${node.id}', ${idx}, this.checked)">
                                                Auto-calculate this field (derived)
                                            </label>
                                            ${(f.derived || f.readOnly) ? `
                                                <label class="property-label" style="margin-top:10px;">Formula</label>
                                                <input type="text" class="property-input" placeholder="e.g., daysBetween(startDate, endDate)"
                                                    value="${escapeHtml((f.derived && f.derived.expression) ? f.derived.expression : '')}"
                                                    onchange="updateDerivedExpression('${node.id}', ${idx}, this.value)">
                                                <div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">
                                                    Supported examples: <code>daysBetween(startDate, endDate)</code>, <code>concat(firstName, ' ', lastName)</code>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button onclick="addFormField('${node.id}')" 
                                    style="width:100%;padding:10px;background:#22c55e;border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;">
                                + Add Input Field
                            </button>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Submit Button Text</label>
                            <input type="text" class="property-input" placeholder="Submit" 
                                   value="${node.config.submitText || 'Submit'}"
                                   onchange="updateNodeConfig('${node.id}', 'submitText', this.value)">
                        </div>
                        ` : ''}
                    `;
                    break;
                
                case 'schedule':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Schedule (Cron Expression)</label>
                            <input type="text" class="property-input" placeholder="0 9 * * *" 
                                   value="${node.config.cron || '0 9 * * *'}"
                                   onchange="updateNodeConfig('${node.id}', 'cron', this.value)">
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                                Format: minute hour day month weekday<br>
                                Examples: "0 9 * * *" (daily 9AM), "0 */4 * * *" (every 4 hours)
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Timezone</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'timezone', this.value)">
                                <option value="UTC" ${node.config.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                                <option value="America/New_York" ${node.config.timezone === 'America/New_York' ? 'selected' : ''}>Eastern (US)</option>
                                <option value="America/Los_Angeles" ${node.config.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific (US)</option>
                                <option value="Europe/London" ${node.config.timezone === 'Europe/London' ? 'selected' : ''}>London</option>
                                <option value="Europe/Paris" ${node.config.timezone === 'Europe/Paris' ? 'selected' : ''}>Paris</option>
                                <option value="Asia/Dubai" ${node.config.timezone === 'Asia/Dubai' ? 'selected' : ''}>Dubai</option>
                                <option value="Africa/Cairo" ${node.config.timezone === 'Africa/Cairo' ? 'selected' : ''}>Cairo</option>
                                <option value="Asia/Tokyo" ${node.config.timezone === 'Asia/Tokyo' ? 'selected' : ''}>Tokyo</option>
                            </select>
                        </div>
                    `;
                    break;
                
                case 'webhook':
                    html += `
                        <div class="property-group">
                            <label class="property-label">HTTP Method</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'method', this.value)">
                                <option value="POST" ${node.config.method === 'POST' ? 'selected' : ''}>POST</option>
                                <option value="GET" ${node.config.method === 'GET' ? 'selected' : ''}>GET</option>
                                <option value="PUT" ${node.config.method === 'PUT' ? 'selected' : ''}>PUT</option>
                                <option value="PATCH" ${node.config.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                            </select>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Webhook Path</label>
                            <input type="text" class="property-input" placeholder="/trigger" 
                                   value="${node.config.path || '/trigger'}"
                                   onchange="updateNodeConfig('${node.id}', 'path', this.value)">
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                                Full URL: /api/webhooks/process/{id}${node.config.path || '/trigger'}
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Authentication</label>
                            <select class="property-select" onchange="updateNodeConfig('${node.id}', 'auth', this.value)">
                                <option value="none" ${node.config.auth === 'none' ? 'selected' : ''}>None</option>
                                <option value="api_key" ${node.config.auth === 'api_key' ? 'selected' : ''}>API Key</option>
                                <option value="bearer" ${node.config.auth === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                            </select>
                        </div>
                    `;
                    break;
                
                case 'loop':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Collection to Iterate</label>
                            ${availableFields.length > 0 ? `
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'collection', this.value)">
                                    <option value="">-- Select Field --</option>
                                    ${availableFields.map(f => `
                                        <option value="${f.name}" ${node.config.collection === f.name ? 'selected' : ''}>
                                            ${escapeHtml(f.label || humanizeFieldLabel(f.name) || f.name)} (${escapeHtml(f.type || '')})
                                        </option>
                                    `).join('')}
                                    <option value="_custom" ${node.config.collection && !availableFields.find(f => f.name === node.config.collection) ? 'selected' : ''}>
                                        ✏️ Custom...
                                    </option>
                                </select>
                                ${(node.config.collection && !availableFields.find(f => f.name === node.config.collection)) ? `
                                    <input type="text" class="property-input" style="margin-top:8px;" placeholder="e.g., items, data.results" 
                                           value="${node.config.collection || ''}"
                                           onchange="updateNodeConfig('${node.id}', 'collection', this.value)">
                                ` : ''}
                            ` : `
                                <input type="text" class="property-input" placeholder="e.g., items, users, data.results" 
                                       value="${node.config.collection || ''}"
                                       onchange="updateNodeConfig('${node.id}', 'collection', this.value)">
                            `}
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                                The array/list to iterate over
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Item Variable Name</label>
                            <input type="text" class="property-input" placeholder="item" 
                                   value="${node.config.itemVar || 'item'}"
                                   onchange="updateNodeConfig('${node.id}', 'itemVar', this.value)">
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                                Access current item with: {{${node.config.itemVar || 'item'}}}
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Max Iterations</label>
                            <input type="number" class="property-input" placeholder="100" 
                                   value="${node.config.maxIterations || 100}"
                                   onchange="updateNodeConfig('${node.id}', 'maxIterations', parseInt(this.value))">
                        </div>
                    `;
                    break;
                
                case 'end':
                    html += `
                        <div class="property-group">
                            <label class="property-label">Output Variable</label>
                            <input type="text" class="property-input" placeholder="e.g., result, response" 
                                   value="${node.config.output || ''}"
                                   onchange="updateNodeConfig('${node.id}', 'output', this.value)">
                            <div style="font-size:11px;color:#6b7280;margin-top:4px;">
                                The variable to return as workflow result
                            </div>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Success Message</label>
                            <textarea class="property-textarea" placeholder="Workflow completed successfully"
                                      onchange="updateNodeConfig('${node.id}', 'successMessage', this.value)">${node.config.successMessage || ''}</textarea>
                        </div>
                    `;
                    break;
                
                case 'action':
                    const actionType = (node.config.actionType || 'custom');
                    html += `
                        <div class="property-group">
                            <label class="property-label">Action Description</label>
                            <textarea class="property-textarea" placeholder="Describe what this action does..."
                                      onchange="updateNodeConfig('${node.id}', 'description', this.value)">${node.config.description || ''}</textarea>
                        </div>
                        <div class="property-group">
                            <label class="property-label">Action Type</label>
                            <select class="property-select" onchange="setActionType('${node.id}', this.value)">
                                <option value="custom" ${actionType === 'custom' ? 'selected' : ''}>Custom</option>
                                <option value="generateDocument" ${actionType === 'generateDocument' ? 'selected' : ''}>Generate Document</option>
                                <option value="extractDocumentText" ${actionType === 'extractDocumentText' ? 'selected' : ''}>Extract Document Text</option>
                                <option value="httpRequest" ${actionType === 'httpRequest' ? 'selected' : ''}>HTTP Request (Advanced)</option>
                                <option value="runScript" ${actionType === 'runScript' ? 'selected' : ''}>Run Script (Advanced)</option>
                                <option value="transformData" ${actionType === 'transformData' ? 'selected' : ''}>Transform Data (Advanced)</option>
                                <option value="fileOperation" ${actionType === 'fileOperation' ? 'selected' : ''}>File Operation (Advanced)</option>
                            </select>
                        </div>
                        ${actionType === 'generateDocument' ? `
                            <div class="property-group">
                                <label class="property-label">Document title</label>
                                <input type="text" class="property-input" placeholder="e.g., Leave Request Summary"
                                       value="${escapeHtml(node.config.documentTitle || '')}"
                                       onchange="updateNodeConfig('${node.id}', 'documentTitle', this.value)">
                            </div>
                            <div class="property-group">
                                <label class="property-label">Format</label>
                                <select class="property-select" onchange="updateNodeConfig('${node.id}', 'documentFormat', this.value)">
                                    <option value="docx" ${(node.config.documentFormat || 'docx') === 'docx' ? 'selected' : ''}>Word (.docx)</option>
                                    <option value="pdf" ${(node.config.documentFormat || '') === 'pdf' ? 'selected' : ''}>PDF (.pdf)</option>
                                    <option value="xlsx" ${(node.config.documentFormat || '') === 'xlsx' ? 'selected' : ''}>Excel (.xlsx)</option>
                                    <option value="pptx" ${(node.config.documentFormat || '') === 'pptx' ? 'selected' : ''}>PowerPoint (.pptx)</option>
                                    <option value="txt" ${(node.config.documentFormat || '') === 'txt' ? 'selected' : ''}>Text (.txt)</option>
                                </select>
                            </div>
                            <div class="property-group">
                                <label class="property-label">Content instructions</label>
                                <textarea class="property-textarea" placeholder="What should this document contain?"
                                          onchange="updateNodeConfig('${node.id}', 'documentInstructions', this.value)">${escapeHtml(node.config.documentInstructions || '')}</textarea>
                                <div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">
                                    You can reference form fields like <code>{{employeeName}}</code> or <code>{{startDate}}</code>.
                                </div>
                            </div>
                        ` : ''}
                        ${actionType === 'extractDocumentText' ? (() => {
                            const fileFields = (getStartFileFieldsForAction() || []);
                            const source = String(node.config.sourceField || '').trim();
                            const outVar = String(node.output_variable || '').trim();
                            return `
                            <div class="property-group">
                                <label class="property-label">Source document</label>
                                <select class="property-select" onchange="setExtractDocumentSourceField('${node.id}', this.value)">
                                    <option value="">Select…</option>
                                    ${fileFields.map(f => `<option value="${escapeHtml(f.name)}" ${(source === f.name) ? 'selected' : ''}>${escapeHtml(f.label || f.name)}</option>`).join('')}
                                </select>
                                <div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">
                                    Picks a file uploaded in the Start/Form step.
                                </div>
                            </div>
                            <div class="property-group">
                                <label class="property-label">Save extracted text as</label>
                                <input type="text" class="property-input" placeholder="e.g., expenseDocumentText"
                                       value="${escapeHtml(outVar)}"
                                       onchange="updateNodeProperty('${node.id}', 'output_variable', this.value)">
                                <div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">
                                    Next steps can reference it like <code>{{${escapeHtml(outVar || 'yourVariable')}}}</code>.
                                </div>
                            </div>
                            `;
                        })() : ''}
                    `;
                    break;
                    
                default:
                    html += `
                        <div class="property-group">
                            <label class="property-label">Description</label>
                            <textarea class="property-textarea" placeholder="What does this step do?"
                                      onchange="updateNodeConfig('${node.id}', 'description', this.value)">${node.config.description || ''}</textarea>
                        </div>
                    `;
            }
            
            html += `
                <div class="prop-actions">
                    <button type="button" onclick="deleteNode('${node.id}')" class="btn-delete-node">
                        Remove this step
                    </button>
                </div>
            `;
            
            return html;
        }
        
        function closeProperties() {
            document.getElementById('properties-panel').classList.remove('active');
        }

        // ================================================================
        // AI SETTINGS — Workflow-level AI behavior configuration
        // ================================================================

        function _getAISettings() {
            if (!state.processSettings) state.processSettings = {};
            if (!state.processSettings.ai) state.processSettings.ai = {};
            return state.processSettings.ai;
        }

        function _setAISetting(key, value) {
            const ai = _getAISettings();
            ai[key] = value;
        }

        function showAISettings() {
            const panel = document.getElementById('properties-panel');
            const icon = document.getElementById('prop-icon');
            const title = document.getElementById('prop-title');
            const type = document.getElementById('prop-type');
            const body = document.getElementById('prop-body');

            icon.className = 'properties-icon type-ai';
            icon.textContent = '🧠';
            title.textContent = 'AI Settings';
            type.textContent = 'Workflow';

            const ai = _getAISettings();
            const instructions = ai.instructions || '';
            const creativity = ai.creativity ?? 3;
            const confidence = ai.confidence ?? 7;

            const creativityLabels = {
                1: 'Very strict — extracts only exactly what it sees, never infers',
                2: 'Strict — minimal inference, sticks to explicit data',
                3: 'Balanced — follows data closely with light inference',
                4: 'Moderate — makes reasonable inferences from context',
                5: 'Creative — infers missing data from context and patterns',
            };
            const confidenceLabels = {
                1: 'Very cautious — marks anything uncertain as empty',
                2: 'Cautious — only fills in values it is fairly sure about',
                3: 'Balanced — reasonable confidence in extracted data',
                4: 'Confident — makes best-guess decisions when data is ambiguous',
                5: 'Very confident — always provides a value, even with limited data',
            };

            body.innerHTML = `
                <div style="padding:2px 0;">
                    <!-- Instructions -->
                    <div class="property-group">
                        <label class="property-label" style="display:flex;align-items:center;gap:6px;">
                            <span>📝</span> AI Instructions
                        </label>
                        <div style="font-size:11px;color:var(--pb-muted);margin-bottom:6px;">
                            Custom rules that ALL AI steps in this workflow must follow.<br>
                            These are added to the AI's system prompt automatically.
                        </div>
                        <textarea class="property-textarea" id="ai-settings-instructions"
                                  style="min-height:120px;font-size:13px;"
                                  placeholder="Examples:\n• Always extract amounts in AED currency\n• If vendor name is unclear, use 'Unknown Vendor'\n• Ignore expenses under 10 AED\n• Report dates in DD/MM/YYYY format"
                                  onchange="_setAISetting('instructions', this.value)">${escapeHtml(instructions)}</textarea>
                        <div style="font-size:10px;color:var(--pb-muted);margin-top:4px;">
                            💡 These instructions override the AI-generated defaults. Use them to fine-tune how the AI extracts data, makes decisions, or formats output.
                        </div>
                    </div>

                    <!-- Creativity Slider -->
                    <div class="property-group">
                        <label class="property-label" style="display:flex;align-items:center;gap:6px;">
                            <span>🎨</span> Creativity
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:11px;color:var(--pb-muted);min-width:42px;">Strict</span>
                            <input type="range" min="1" max="5" value="${creativity}" 
                                   style="flex:1;accent-color:var(--pb-primary);"
                                   oninput="document.getElementById('ai-creativity-val').textContent=this.value;document.getElementById('ai-creativity-desc').textContent=({1:'Very strict — extracts only exactly what it sees, never infers',2:'Strict — minimal inference, sticks to explicit data',3:'Balanced — follows data closely with light inference',4:'Moderate — makes reasonable inferences from context',5:'Creative — infers missing data from context and patterns'})[this.value];_setAISetting('creativity',parseInt(this.value));">
                            <span style="font-size:11px;color:var(--pb-muted);min-width:50px;text-align:right;">Creative</span>
                            <span id="ai-creativity-val" style="font-size:13px;font-weight:700;color:var(--pb-primary);min-width:18px;text-align:center;">${creativity}</span>
                        </div>
                        <div id="ai-creativity-desc" style="font-size:11px;color:var(--pb-muted);margin-top:4px;padding-left:4px;">
                            ${creativityLabels[creativity] || ''}
                        </div>
                    </div>

                    <!-- Confidence Slider -->
                    <div class="property-group">
                        <label class="property-label" style="display:flex;align-items:center;gap:6px;">
                            <span>🎯</span> Confidence
                        </label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:11px;color:var(--pb-muted);min-width:42px;">Cautious</span>
                            <input type="range" min="1" max="5" value="${confidence}"
                                   style="flex:1;accent-color:var(--pb-primary);"
                                   oninput="document.getElementById('ai-confidence-val').textContent=this.value;document.getElementById('ai-confidence-desc').textContent=({1:'Very cautious — marks anything uncertain as empty',2:'Cautious — only fills in values it is fairly sure about',3:'Balanced — reasonable confidence in extracted data',4:'Confident — makes best-guess decisions when data is ambiguous',5:'Very confident — always provides a value, even with limited data'})[this.value];_setAISetting('confidence',parseInt(this.value));">
                            <span style="font-size:11px;color:var(--pb-muted);min-width:50px;text-align:right;">Confident</span>
                            <span id="ai-confidence-val" style="font-size:13px;font-weight:700;color:var(--pb-primary);min-width:18px;text-align:center;">${confidence}</span>
                        </div>
                        <div id="ai-confidence-desc" style="font-size:11px;color:var(--pb-muted);margin-top:4px;padding-left:4px;">
                            ${confidenceLabels[confidence] || ''}
                        </div>
                    </div>

                    <!-- Info box -->
                    <div style="margin-top:12px;padding:10px 12px;background:color-mix(in srgb, var(--pb-primary) 8%, transparent);border:1px solid color-mix(in srgb, var(--pb-primary) 20%, transparent);border-radius:10px;">
                        <div style="font-size:12px;font-weight:600;color:var(--pb-primary);margin-bottom:4px;">How these settings work</div>
                        <div style="font-size:11px;color:var(--pb-muted);line-height:1.5;">
                            <strong>Instructions</strong> are injected as rules into every AI step's system prompt. Use them to enforce business rules the AI must follow.<br><br>
                            <strong>Creativity</strong> controls how much the AI infers beyond the explicit data. Lower = safer for data extraction. Higher = better for content generation.<br><br>
                            <strong>Confidence</strong> controls how the AI handles uncertainty. Lower = leaves ambiguous fields empty. Higher = makes best-guess decisions.
                        </div>
                    </div>
                </div>
            `;

            // Deselect any node
            state.selectedNode = null;
            state.selectedNodeIds = [];
            updateSelectionUI();
            panel.classList.add('active');
        }

        function updateNodeProperty(nodeId, prop, value) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                node[prop] = value;
                refreshNode(node);
                saveToUndo();
            }
        }
        
        function updateNodeConfig(nodeId, key, value) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                // Special handling: notification recipient dropdown
                if (key === 'recipient' && value === '_custom') {
                    node.config[key] = '';
                    refreshNode(node);
                    showProperties(node); // Re-render to show text input
                    saveToUndo();
                    return;
                }
                node.config[key] = value;
                refreshNode(node);
                // Re-render properties for recipient changes to update hint text
                if (key === 'recipient' && node.type === 'notification') {
                    showProperties(node);
                }
                saveToUndo();
            }
        }

        function setTriggerType(nodeId, triggerType) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            node.config.triggerType = triggerType;
            if (triggerType === 'schedule') {
                if (!node.config.cron) node.config.cron = '0 9 * * *';
                if (!node.config.timezone) node.config.timezone = 'UTC';
            } else if (triggerType === 'webhook') {
                if (!node.config.method) node.config.method = 'POST';
                if (!node.config.path) node.config.path = '/trigger';
            } else {
                // manual
                if (!node.config.fields) node.config.fields = [];
                if (!node.config.submitText) node.config.submitText = 'Submit';
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function setActionType(nodeId, actionType) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            node.config.actionType = actionType;
            if (actionType === 'generateDocument') {
                if (!node.config.documentFormat) node.config.documentFormat = 'docx';
                if (!node.config.documentTitle) node.config.documentTitle = node.name || 'Document';
            } else if (actionType === 'extractDocumentText') {
                // Default: pick first file field from Start/Form, and store text in <fieldName>Text
                const files = getStartFileFieldsForAction() || [];
                if (!node.config.sourceField && files.length) {
                    node.config.sourceField = files[0].name;
                }
                if (node.config.sourceField) {
                    node.config.path = `{{${node.config.sourceField}.path}}`;
                    if (!node.output_variable) {
                        node.output_variable = `${node.config.sourceField}Text`;
                    }
                }
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function getStartFileFieldsForAction() {
            const startNode = getStartNodeForTest();
            const fields = getStartFieldDefs(startNode) || [];
            return fields.filter(f => String(f.type || '').toLowerCase() === 'file');
        }

        function setExtractDocumentSourceField(nodeId, fieldName) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            const f = String(fieldName || '').trim();
            node.config.sourceField = f;
            if (f) {
                node.config.path = `{{${f}.path}}`;
                if (!node.output_variable) {
                    node.output_variable = `${f}Text`;
                }
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }
        
        function selectTool(nodeId, toolId) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                const tool = state.tools.find(t => t.id === toolId);
                node.config.toolId = toolId;
                if (tool) node.name = tool.name;
                if (!node.config.params) node.config.params = {};
                refreshNode(node);
                showProperties(node); // Refresh panel
                saveToUndo();
            }
        }
        
        function updateToolParam(nodeId, paramName, value) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            if (!node.config.params) node.config.params = {};
            node.config.params[paramName] = value;
            saveToUndo();
        }
        
        function onToolParamSourceChange(selectEl) {
            const nodeId = selectEl.dataset.nodeId;
            const paramName = selectEl.dataset.paramName;
            const row = selectEl.closest('.tool-param-row');
            const input = row ? row.querySelector('.tool-param-fixed') : null;
            const value = selectEl.value;
            if (value === '_fixed_') {
                if (input) { input.style.display = ''; updateToolParam(nodeId, paramName, input.value); }
            } else {
                if (input) input.style.display = 'none';
                updateToolParam(nodeId, paramName, value);
            }
        }
        
        function updateToolParamFromInput(inputEl) {
            const nodeId = inputEl.dataset.nodeId;
            const paramName = inputEl.dataset.paramName;
            updateToolParam(nodeId, paramName, inputEl.value);
        }
        
        // Approval config modal (Approvers from Platform User / Role / Group / Tool)
        let approvalConfigNodeId = null;
        async function openApprovalConfigModal(nodeId) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node) return;
            approvalConfigNodeId = nodeId;
            const modal = document.getElementById('approval-config-modal');
            const cfg = node.config || {};
            let source = cfg.assignee_source || '';
            if (!source && (cfg.approvers || []).length) source = 'platform_user';
            if (!source) source = 'platform_user';
            const assigneeIds = cfg.assignee_ids || cfg.approvers || [];
            const assigneeToolId = cfg.assignee_tool_id || '';
            const token = getAuthToken();
            const headers = { 'Authorization': 'Bearer ' + token };
            let users = [], roles = [], groups = [], tools = [];
            try {
                const [uRes, rRes, gRes, tRes] = await Promise.all([
                    fetch('/api/security/users', { headers }),
                    fetch('/api/security/roles', { headers }),
                    fetch('/api/security/groups', { headers }),
                    fetch('/api/tools/accessible', { headers })
                ]);
                if (uRes.ok) { const d = await uRes.json(); users = Array.isArray(d) ? d : (d.users || []); }
                if (rRes.ok) { const d = await rRes.json(); roles = Array.isArray(d) ? d : (d.roles || []); }
                if (gRes.ok) { const d = await gRes.json(); groups = Array.isArray(d) ? d : (d.groups || []); }
                if (tRes.ok) { const d = await tRes.json(); tools = d.tools || []; }
            } catch (e) { console.error('Load approval options:', e); }
            const userOpts = users.map(u => '<option value="' + u.id + '"' + (assigneeIds.includes(u.id) ? ' selected' : '') + '>' + (u.name || u.email || u.id).substring(0, 40) + '</option>').join('');
            const roleOpts = roles.map(r => '<option value="' + r.id + '"' + (assigneeIds.includes(r.id) ? ' selected' : '') + '>' + (r.name || r.id).substring(0, 40) + '</option>').join('');
            const groupOpts = groups.map(g => '<option value="' + g.id + '"' + (assigneeIds.includes(g.id) ? ' selected' : '') + '>' + (g.name || g.id).substring(0, 40) + '</option>').join('');
            const toolOpts = tools.map(t => '<option value="' + t.id + '"' + (assigneeToolId === t.id ? ' selected' : '') + '>' + (t.name || t.id).substring(0, 40) + '</option>').join('');
            document.getElementById('approval-config-source').value = source;
            document.getElementById('approval-config-user-list').innerHTML = userOpts;
            document.getElementById('approval-config-role-list').innerHTML = roleOpts;
            document.getElementById('approval-config-group-list').innerHTML = groupOpts;
            document.getElementById('approval-config-tool').innerHTML = '<option value="">— None —</option>' + toolOpts;
            document.getElementById('approval-config-tool').value = assigneeToolId;
            // Restore user_directory config
            if (source === 'user_directory') {
                document.getElementById('approval-config-directory-type').value = cfg.directory_assignee_type || 'dynamic_manager';
                document.getElementById('approval-config-mgmt-level').value = cfg.management_level || 2;
            }
            // Add change listener for directory type to toggle management level
            document.getElementById('approval-config-directory-type').onchange = function() {
                document.getElementById('approval-config-mgmt-level-wrap').classList.toggle('hidden', this.value !== 'management_chain');
            };
            onApprovalConfigSourceChange();
            modal.classList.add('show');
        }
        function onApprovalConfigSourceChange() {
            const v = document.getElementById('approval-config-source').value;
            document.getElementById('approval-config-platform-user-wrap').classList.toggle('hidden', v !== 'platform_user');
            document.getElementById('approval-config-platform-role-wrap').classList.toggle('hidden', v !== 'platform_role');
            document.getElementById('approval-config-platform-group-wrap').classList.toggle('hidden', v !== 'platform_group');
            document.getElementById('approval-config-user-directory-wrap').classList.toggle('hidden', v !== 'user_directory');
            document.getElementById('approval-config-tool-wrap').classList.toggle('hidden', v !== 'tool');
            // Show management level input only for management_chain type
            if (v === 'user_directory') {
                const dirType = document.getElementById('approval-config-directory-type').value;
                document.getElementById('approval-config-mgmt-level-wrap').classList.toggle('hidden', dirType !== 'management_chain');
            }
        }
        function saveApprovalConfig() {
            if (!approvalConfigNodeId) return;
            const node = state.nodes.find(n => n.id === approvalConfigNodeId);
            if (!node) { approvalConfigNodeId = null; return; }
            const source = document.getElementById('approval-config-source').value;
            const userList = document.getElementById('approval-config-user-list');
            const roleList = document.getElementById('approval-config-role-list');
            const groupList = document.getElementById('approval-config-group-list');
            const toolSelect = document.getElementById('approval-config-tool');
            const assigneeIds = [];
            if (source === 'platform_user') { for (let i = 0; i < userList.options.length; i++) if (userList.options[i].selected) assigneeIds.push(userList.options[i].value); }
            else if (source === 'platform_role') { for (let i = 0; i < roleList.options.length; i++) if (roleList.options[i].selected) assigneeIds.push(roleList.options[i].value); }
            else if (source === 'platform_group') { for (let i = 0; i < groupList.options.length; i++) if (groupList.options[i].selected) assigneeIds.push(groupList.options[i].value); }
            const assigneeType = source === 'platform_user' ? 'user' : source === 'platform_role' ? 'role' : source === 'platform_group' ? 'group' : 'user';
            node.config.assignee_source = source;
            node.config.assignee_type = assigneeType;
            node.config.assignee_ids = assigneeIds;
            node.config.assignee_tool_id = source === 'tool' ? (toolSelect.value || '') : undefined;
            // User Directory config
            if (source === 'user_directory') {
                node.config.directory_assignee_type = document.getElementById('approval-config-directory-type').value || 'dynamic_manager';
                node.config.management_level = node.config.directory_assignee_type === 'management_chain' ? parseInt(document.getElementById('approval-config-mgmt-level').value) || 2 : undefined;
            } else {
                delete node.config.directory_assignee_type;
                delete node.config.management_level;
            }
            if (node.config.approvers !== undefined) delete node.config.approvers;
            document.getElementById('approval-config-modal').classList.remove('show');
            approvalConfigNodeId = null;
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }
        function closeApprovalConfigModal() {
            document.getElementById('approval-config-modal').classList.remove('show');
            approvalConfigNodeId = null;
        }
        
        // Form field management functions
        function addFormField(nodeId) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                if (!node.config.fields) node.config.fields = [];
                node.config.fields.push({
                    name: '',
                    label: '',
                    type: 'text',
                    required: false,
                    placeholder: '',
                    options: [],
                    readOnly: false,
                    derived: null,
                    _autoKey: true
                });
                refreshNode(node);
                showProperties(node);
                saveToUndo();
            }
        }
        
        function updateFormField(nodeId, fieldIndex, key, value) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node && node.config.fields && node.config.fields[fieldIndex]) {
                node.config.fields[fieldIndex][key] = value;
                if (key === 'type') {
                    const f = node.config.fields[fieldIndex];
                    if (String(value).toLowerCase() === 'select' && !Array.isArray(f.options)) {
                        f.options = [];
                    }
                }
                refreshNode(node);
                saveToUndo();
            }
        }

        function updateFormFieldLabel(nodeId, fieldIndex, labelValue) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            f.label = String(labelValue || '').trim();
            const desiredKey = toFieldKey(f.label || '');
            if (!f.name || f._autoKey === true) {
                f.name = ensureUniqueKey(node.config.fields, desiredKey, fieldIndex);
                f._autoKey = true;
            }
            // Auto-placeholder if empty (business-friendly)
            if (!f.placeholder && f.label) {
                f.placeholder = `Enter ${f.label}...`;
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function addSelectOption(nodeId, fieldIndex) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            if (!Array.isArray(f.options)) f.options = [];
            f.options.push('');
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function updateSelectOption(nodeId, fieldIndex, optionIndex, value) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            if (!Array.isArray(f.options)) f.options = [];
            f.options[optionIndex] = String(value || '');
            saveToUndo();
        }

        function removeSelectOption(nodeId, fieldIndex, optionIndex) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            if (!Array.isArray(f.options)) f.options = [];
            f.options.splice(optionIndex, 1);
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function toggleDerivedField(nodeId, fieldIndex, enabled) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            if (enabled) {
                f.readOnly = true;
                if (!f.derived || typeof f.derived !== 'object') f.derived = {};
                if (!f.derived.expression) f.derived.expression = '';
            } else {
                f.readOnly = false;
                f.derived = null;
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function setFieldPrefill(nodeId, fieldIndex, key) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            const k = String(key || '').trim();
            if (!k) {
                delete f.prefill;
                if (!f.derived) f.readOnly = false;
            } else {
                f.prefill = { source: 'currentUser', key: k };
                f.readOnly = true;
                // Prefill and derived should not conflict; prefer prefill
                f.derived = null;
                if (k === 'email' && (!f.type || f.type === 'text')) f.type = 'email';
            }
            refreshNode(node);
            showProperties(node);
            saveToUndo();
        }

        function updateDerivedExpression(nodeId, fieldIndex, expr) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (!node || !node.config.fields || !node.config.fields[fieldIndex]) return;
            const f = node.config.fields[fieldIndex];
            f.readOnly = true;
            if (!f.derived || typeof f.derived !== 'object') f.derived = {};
            f.derived.expression = String(expr || '').trim();
            saveToUndo();
        }
        
        function removeFormField(nodeId, fieldIndex) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node && node.config.fields) {
                node.config.fields.splice(fieldIndex, 1);
                refreshNode(node);
                showProperties(node);
                saveToUndo();
            }
        }
        
        // Helper to insert field references into textareas
        function insertFieldRef(nodeId, configKey, fieldRef) {
            const node = state.nodes.find(n => n.id === nodeId);
            if (node) {
                const currentValue = node.config[configKey] || '';
                node.config[configKey] = currentValue + (currentValue ? ' ' : '') + fieldRef;
                refreshNode(node);
                showProperties(node);
                saveToUndo();
            }
        }
        
        function refreshNode(node) {
            const oldEl = document.getElementById(node.id);
            if (oldEl) {
                oldEl.remove();
                renderNode(node);
                const el = document.getElementById(node.id);
                if (el) {
                    if (state.selectedNodeIds.includes(node.id)) el.classList.add(state.selectedNodeIds.length > 1 ? 'multi-selected' : (state.selectedLabelNodeId === node.id ? 'label-selected' : 'selected'));
                    else if (state.selectedLabelNodeId === node.id) el.classList.add('label-selected');
                }
                renderConnections();
            }
        }
        
        function deleteNode(nodeId) {
            if (!confirm('Delete this node?')) return;
            
            if (state.selectedNode && state.selectedNode.id === nodeId) state.selectedNode = null;
            if (state.selectedLabelNodeId === nodeId) state.selectedLabelNodeId = null;
            state.connections = state.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
            state.nodes = state.nodes.filter(n => n.id !== nodeId);
            document.getElementById(nodeId)?.remove();
            closeProperties();
            renderConnections();
            updateEmptyState();
            saveToUndo();
        }
        
        function showNodeMenu(nodeId) {
            // Simple delete for now
            if (confirm('Delete this node?')) {
                deleteNode(nodeId);
            }
        }
        
        // ===== TOOLS =====
        function getAuthToken() {
            return localStorage.getItem('agentforge_token') || sessionStorage.getItem('agentforge_token');
        }
        
        function loadTools() {
            const token = getAuthToken();
            fetch('/api/tools', {
                headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            })
            .then(r => {
                if (!r.ok) {
                    return r.json().then(d => Promise.reject({ status: r.status, detail: d })).catch(() => Promise.reject({ status: r.status }));
                }
                return r.json();
            })
            .then(data => {
                // API returns { tools: [...] }; support alternate shapes
                state.tools = Array.isArray(data.tools) ? data.tools : (Array.isArray(data) ? data : []);
                renderToolsPalette(null);
            })
            .catch(e => {
                console.error('Failed to load tools:', e);
                state.tools = [];
                renderToolsPalette(e);
            });
        }
        
        function renderToolsPalette(loadError) {
            const container = document.getElementById('platform-tools-list');
            if (!container) return;
            
            if (loadError) {
                const msg = loadError.status === 401 || loadError.status === 403
                    ? 'Sign in to see your tools'
                    : 'Could not load tools. Check connection and try again.';
                container.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:8px;">' + msg + '</div>';
                return;
            }
            
            if (!state.tools.length) {
                container.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:8px;">No tools yet. Add tools in the platform, then refresh this page.</div>';
                return;
            }
            
            container.innerHTML = state.tools.map(t => `
                <div class="palette-item" draggable="true" data-type="tool" data-tool-id="${escapeHtml(t.id)}">
                    <div class="palette-icon tool palette-shape-task">${getTypeSvgIcon(t.type || 'tool')}</div>
                    <div class="palette-info">
                        <div class="palette-name">${escapeHtml(t.name || 'Tool')}</div>
                        <div class="palette-desc">${escapeHtml(t.type || '')}</div>
                    </div>
                </div>
            `).join('');
            
            container.querySelectorAll('.palette-item').forEach(item => {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('nodeType', 'tool');
                    e.dataTransfer.setData('toolId', item.dataset.toolId || '');
                });
            });
        }
        
        function getToolIcon(type) {
            const icons = {
                api: '🌐',
                database: '🗄️',
                knowledge_base: '📚',
                email: '📧',
                website: '🔗'
            };
            return icons[type] || '🔧';
        }
        
        // ===== ZOOM =====
        function zoomIn() {
            state.zoom = Math.min(state.zoom * 1.2, 2);
            updateCanvasTransform();
            document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        }
        
        function zoomOut() {
            state.zoom = Math.max(state.zoom * 0.8, 0.25);
            updateCanvasTransform();
            document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        }
        
        function zoomReset() {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
            updateCanvasTransform();
            document.getElementById('zoom-level').textContent = '100%';
        }
        
        function zoomFit() {
            if (state.nodes.length === 0) return;
            const container = document.getElementById('canvas-container');
            const padding = 80;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            state.nodes.forEach(n => {
                const el = document.getElementById(n.id);
                if (!el) return;
                const w = el.offsetWidth || 200, h = el.offsetHeight || 80;
                minX = Math.min(minX, n.x);
                minY = Math.min(minY, n.y);
                maxX = Math.max(maxX, n.x + w);
                maxY = Math.max(maxY, n.y + h);
            });
            const cw = container.clientWidth, ch = container.clientHeight;
            const bw = maxX - minX + padding * 2, bh = maxY - minY + padding * 2;
            const scale = Math.min(cw / bw, ch / bh, 2);
            state.zoom = Math.max(0.25, scale);
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            state.panX = cw / 2 - cx * state.zoom;
            state.panY = ch / 2 - cy * state.zoom;
            updateCanvasTransform();
            document.getElementById('zoom-level').textContent = Math.round(state.zoom * 100) + '%';
        }
        
        // ===== UNDO/REDO =====
        function saveToUndo() {
            state.undoStack.push(JSON.stringify({ nodes: state.nodes, connections: state.connections }));
            state.redoStack = [];
        }
        
        function undoAction() {
            if (state.undoStack.length > 1) {
                state.redoStack.push(state.undoStack.pop());
                const prev = JSON.parse(state.undoStack[state.undoStack.length - 1]);
                restoreState(prev);
            }
        }
        
        function redoAction() {
            if (state.redoStack.length > 0) {
                const next = JSON.parse(state.redoStack.pop());
                state.undoStack.push(JSON.stringify(next));
                restoreState(next);
            }
        }
        
        function restoreState(data) {
            state.nodes = data.nodes;
            state.connections = data.connections;
            
            // Clear and re-render
            document.getElementById('canvas').innerHTML = '';
            state.nodes.forEach(n => renderNode(n));
            renderConnections();
            updateEmptyState();
        }
        
        // ===== SAVE/LOAD =====
        function loadWorkflowFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const agentId = params.get('agent');
            const draft = params.get('draft');
            
            if (agentId) {
                state.agentId = agentId;
                loadWorkflow(agentId);
            } else if (draft) {
                // Load a generated draft passed from the main wizard (sessionStorage/localStorage)
                const ok = loadDraftWorkflowFromStorage();
                if (!ok) {
                    // If we're in "wait" mode, don't create a default workflow (we'll receive it via postMessage)
                    if (String(draft).toLowerCase() === 'wait') {
                        // Keep canvas empty and show a friendly waiting overlay
                        try { _clearCanvasState(); } catch (_) {}
                        try { _showBuildOverlay('Generating your workflow…', 8, ''); } catch (_) {}
                        try { startDraftWaitPolling(); } catch (_) {}
                        return;
                    }
                    // Otherwise fallback to a new workflow
                    createNode('trigger', 400, 100);
                }
            } else {
                // New workflow - add start node
                createNode('trigger', 400, 100);
            }
        }

        const PROCESS_BUILDER_DRAFT_KEY = 'agentforge_process_builder_draft';
        const PROCESS_BUILDER_DRAFT_META_KEY = 'agentforge_process_builder_draft_meta';
        let _draftWaitInterval = null;

        function startDraftWaitPolling() {
            stopDraftWaitPolling();
            const startedAt = Date.now();
            _draftWaitInterval = setInterval(() => {
                // Give the opener a moment to store the draft / send postMessage
                if (Date.now() - startedAt > 30000) {
                    stopDraftWaitPolling();
                    return;
                }
                const ok = loadDraftWorkflowFromStorage();
                if (ok) stopDraftWaitPolling();
            }, 300);
        }

        function stopDraftWaitPolling() {
            if (_draftWaitInterval) {
                clearInterval(_draftWaitInterval);
                _draftWaitInterval = null;
            }
        }

        function loadDraftWorkflowFromStorage() {
            try {
                const raw = sessionStorage.getItem(PROCESS_BUILDER_DRAFT_KEY) || localStorage.getItem(PROCESS_BUILDER_DRAFT_KEY);
                if (!raw) return false;
                const draft = JSON.parse(raw);
                const metaRaw = sessionStorage.getItem(PROCESS_BUILDER_DRAFT_META_KEY) || localStorage.getItem(PROCESS_BUILDER_DRAFT_META_KEY);
                let meta = {};
                try { meta = metaRaw ? JSON.parse(metaRaw) : {}; } catch(_) { meta = {}; }
                const goal = meta.goal || draft.description || '';
                const name = draft.name || meta.name || 'My Workflow';
                const shouldAnimate = meta.animate === true || /[?&]animate=1/.test(window.location.search || '');
                if (shouldAnimate) {
                    // One-time cinematic build: clear draft keys so reload doesn't re-play automatically
                    try {
                        sessionStorage.removeItem(PROCESS_BUILDER_DRAFT_KEY);
                        sessionStorage.removeItem(PROCESS_BUILDER_DRAFT_META_KEY);
                        localStorage.removeItem(PROCESS_BUILDER_DRAFT_KEY);
                        localStorage.removeItem(PROCESS_BUILDER_DRAFT_META_KEY);
                    } catch (_) {}
                    startBuildAnimation(draft, { goal, name });
                } else {
                    applyWorkflowDefinition(draft, { goal, name });
                }
                return true;
            } catch (e) {
                console.error('Draft load error:', e);
                return false;
            }
        }

        function applyWorkflowDefinition(def, opts = {}) {
            const name = opts.name || def?.name || 'My Workflow';
            const goal = opts.goal || opts.originalGoal || '';
            document.getElementById('workflow-name').value = name;
            if (goal) state.goal = goal;

            // Load AI settings if present in the definition (e.g., from wizard)
            if (def?._suggested_settings && typeof def._suggested_settings === 'object') {
                state.processSettings = { ...state.processSettings, ...def._suggested_settings };
            }

            const nodes = def?.nodes || [];
            const edges = def?.edges || def?.connections || [];
            state.nodes = Array.isArray(nodes) ? nodes : [];
            state.connections = Array.isArray(edges) ? edges : [];

            // Avoid node ID collisions for new nodes
            let maxNum = 0;
            state.nodes.forEach(n => {
                const m = (n.id || '').match(/^node_(\d+)$/);
                if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
            });
            nodeIdCounter = maxNum + 1;

            // Clear and re-render
            document.getElementById('canvas').innerHTML = '';
            state.nodes.forEach(n => renderNode(n));
            renderConnections();
            updateEmptyState();

            // Reset undo history to this as baseline
            state.undoStack = [JSON.stringify({ nodes: state.nodes, connections: state.connections })];
            state.redoStack = [];

            // Make it look organized and visible
            try { alignProcess(); } catch (_) {}
            try { zoomFit(); } catch (_) {}
        }

        // =========================================================================
        // CINEMATIC BUILD (ANIMATED WORKFLOW CONSTRUCTION)
        // =========================================================================

        const buildAnim = {
            running: false,
            token: 0,
            lastDefinition: null,
            lastMeta: null,
        };

        function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

        function _showBuildOverlay(subtitle, progress = 0, stepText = '') {
            const overlay = document.getElementById('build-overlay');
            const sub = document.getElementById('build-subtitle');
            const bar = document.getElementById('build-progress-bar');
            const counter = document.getElementById('build-step-counter');
            if (sub) sub.textContent = subtitle || '';
            if (bar) bar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            if (counter) counter.textContent = stepText || '';
            if (overlay) {
                overlay.style.display = 'block';
                requestAnimationFrame(() => overlay.classList.add('show'));
            }
        }

        function _hideBuildOverlay() {
            const overlay = document.getElementById('build-overlay');
            if (!overlay) return;
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 220);
        }

        function _showBuildCursor() {
            const cur = document.getElementById('build-cursor');
            if (!cur) return;
            cur.classList.add('show');
        }

        function _hideBuildCursor() {
            const cur = document.getElementById('build-cursor');
            if (!cur) return;
            cur.classList.remove('show');
        }

        function _cursorClick() {
            const cur = document.getElementById('build-cursor');
            if (!cur) return;
            cur.classList.remove('click');
            // force reflow
            void cur.offsetWidth;
            cur.classList.add('click');
        }

        function _resetViewForBuild() {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
            updateCanvasTransform();
            const zl = document.getElementById('zoom-level');
            if (zl) zl.textContent = '100%';
        }

        function _nodeCanvasCenter(node) {
            const x = (typeof node.x === 'number' ? node.x : 400) + 36;
            const y = (typeof node.y === 'number' ? node.y : 100) + 28;
            return { x, y };
        }

        function _canvasToScreen(pt) {
            // Convert canvas coords to container coords based on current pan/zoom
            return {
                x: state.panX + pt.x * state.zoom,
                y: state.panY + pt.y * state.zoom
            };
        }

        function _moveCursorToCanvasPoint(ptCanvas, transitionMs = null) {
            const cur = document.getElementById('build-cursor');
            const container = document.getElementById('canvas-container');
            if (!cur || !container) return;
            if (transitionMs != null && Number.isFinite(Number(transitionMs))) {
                const ms = Math.max(0, Math.min(1200, Number(transitionMs)));
                cur.style.transition = `left ${ms}ms cubic-bezier(.2,.9,.2,1), top ${ms}ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease`;
            } else {
                // Revert to CSS defaults
                cur.style.transition = '';
            }
            const pt = _canvasToScreen(ptCanvas);
            cur.style.left = `${pt.x}px`;
            cur.style.top = `${pt.y}px`;
        }

        function _clearCanvasState() {
            state.selectedNode = null;
            state.selectedLabelNodeId = null;
            state.selectedNodeIds = [];
            state.nodes = [];
            state.connections = [];
            state.undoStack = [];
            state.redoStack = [];
            closeProperties();
            document.getElementById('canvas').innerHTML = '';
            renderConnections();
            updateEmptyState();
        }

        function _sortNodesForBuild(nodes) {
            const weight = (t) => (t === 'trigger' || t === 'form') ? -100 : (t === 'end') ? 100 : 0;
            return [...nodes].sort((a, b) => {
                const wa = weight(String(a.type || '').toLowerCase());
                const wb = weight(String(b.type || '').toLowerCase());
                if (wa !== wb) return wa - wb;
                const ay = (typeof a.y === 'number') ? a.y : 0;
                const by = (typeof b.y === 'number') ? b.y : 0;
                if (ay !== by) return ay - by;
                const ax = (typeof a.x === 'number') ? a.x : 0;
                const bx = (typeof b.x === 'number') ? b.x : 0;
                return ax - bx;
            });
        }

        // Auto-layout for AI-generated drafts (keeps diagrams readable for business users)
        function autoLayoutWorkflowDefinition(def, opts = {}) {
            const nodes = Array.isArray(def?.nodes) ? def.nodes : [];
            const edges = Array.isArray(def?.edges) ? def.edges : (Array.isArray(def?.connections) ? def.connections : []);
            if (!nodes.length) return def;

            const nodeById = new Map(nodes.map(n => [String(n.id), n]));
            const out = new Map();
            const inDeg = new Map();
            nodes.forEach(n => { out.set(String(n.id), []); inDeg.set(String(n.id), 0); });
            edges.forEach(e => {
                const from = String(e.from || e.source || '');
                const to = String(e.to || e.target || '');
                if (!from || !to) return;
                if (!out.has(from)) out.set(from, []);
                out.get(from).push({ to, type: e.type || e.edge_type || 'default' });
                inDeg.set(to, (inDeg.get(to) || 0) + 1);
            });

            const start = nodes.find(n => n.type === 'trigger' || n.type === 'form')
                || nodes.find(n => (inDeg.get(String(n.id)) || 0) === 0)
                || nodes[0];

            const depth = new Map();
            const q = [String(start.id)];
            depth.set(String(start.id), 0);
            while (q.length) {
                const id = q.shift();
                const d = depth.get(id) || 0;
                (out.get(id) || []).forEach(ed => {
                    const next = String(ed.to);
                    if (!nodeById.has(next)) return;
                    if (!depth.has(next)) {
                        depth.set(next, d + 1);
                        q.push(next);
                    }
                });
            }

            let maxDepth = 0;
            depth.forEach(v => { if (v > maxDepth) maxDepth = v; });
            nodes.forEach(n => {
                const id = String(n.id);
                if (!depth.has(id)) { maxDepth += 1; depth.set(id, maxDepth); }
            });

            // ENFORCE: End nodes must always be on the deepest layer (below everything).
            // Recalculate maxDepth excluding end nodes, then place end nodes at max+1.
            let maxNonEndDepth = 0;
            depth.forEach((v, id) => {
                const nd = nodeById.get(id);
                if (nd && nd.type !== 'end' && v > maxNonEndDepth) maxNonEndDepth = v;
            });
            nodes.forEach(n => {
                if (n.type === 'end') {
                    depth.set(String(n.id), maxNonEndDepth + 1);
                }
            });
            // Update maxDepth after moving end nodes
            maxDepth = maxNonEndDepth + 1;

            const layers = new Map();
            nodes.forEach(n => {
                const d = depth.get(String(n.id)) || 0;
                if (!layers.has(d)) layers.set(d, []);
                layers.get(d).push(n);
            });

            // Preserve any existing left-to-right intent
            layers.forEach(layer => layer.sort((a, b) => ((a?.x ?? 0) - (b?.x ?? 0))));

            // Condition: keep YES on the left, NO on the right when in same layer
            nodes.filter(n => n.type === 'condition').forEach(cond => {
                const cid = String(cond.id);
                const outs = out.get(cid) || [];
                const yes = outs.find(e => e.type === 'yes');
                const no = outs.find(e => e.type === 'no');
                if (!yes || !no) return;
                const dy = depth.get(String(yes.to));
                const dn = depth.get(String(no.to));
                if (dy == null || dn == null || dy !== dn) return;
                const layer = layers.get(dy);
                if (!layer) return;
                const yi = layer.findIndex(n => String(n.id) === String(yes.to));
                const ni = layer.findIndex(n => String(n.id) === String(no.to));
                if (yi > -1 && ni > -1 && yi > ni) {
                    const tmp = layer[yi]; layer[yi] = layer[ni]; layer[ni] = tmp;
                }
            });

            const centerX = (typeof opts.centerX === 'number') ? opts.centerX : 420;
            const topY = (typeof opts.topY === 'number') ? opts.topY : 120;
            const vGap = (typeof opts.vGap === 'number') ? opts.vGap : 200;
            const hGap = (typeof opts.hGap === 'number') ? opts.hGap : 300;

            const newNodes = nodes.map(n => ({ ...n }));
            const newById = new Map(newNodes.map(n => [String(n.id), n]));

            Array.from(layers.keys()).sort((a, b) => a - b).forEach(d => {
                const layer = layers.get(d) || [];
                const count = layer.length || 1;
                layer.forEach((orig, i) => {
                    const nn = newById.get(String(orig.id));
                    if (!nn) return;
                    const offset = i - (count - 1) / 2;
                    nn.x = Math.round((centerX + offset * hGap) / 20) * 20;
                    nn.y = Math.round((topY + d * vGap) / 20) * 20;
                });
            });

            return { ...def, nodes: newNodes, edges: edges.map(e => ({ ...e })) };
        }

        async function startBuildAnimation(def, opts = {}) {
            const token = ++buildAnim.token;
            buildAnim.running = true;
            def = autoLayoutWorkflowDefinition(def);
            buildAnim.lastDefinition = def;
            buildAnim.lastMeta = opts || {};

            const nodes = Array.isArray(def?.nodes) ? def.nodes : [];
            const edges = Array.isArray(def?.edges) ? def.edges : (Array.isArray(def?.connections) ? def.connections : []);
            const orderedNodes = _sortNodesForBuild(nodes);
            
            // Avoid ID collisions for new nodes after animation
            let maxNum = 0;
            orderedNodes.forEach(n => {
                const m = String(n?.id || '').match(/^node_(\d+)$/);
                if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
            });
            nodeIdCounter = maxNum + 1;

            state.goal = (opts.goal || state.goal || '').trim();
            document.getElementById('workflow-name').value = (opts.name || def?.name || 'My Workflow');

            _resetViewForBuild();
            _clearCanvasState();
            _showBuildCursor();
            _moveCursorToCanvasPoint({ x: 420, y: 120 });

            const totalSteps = Math.max(1, orderedNodes.length + edges.length + 2);
            let done = 0;
            _showBuildOverlay('Preparing canvas…', 0, '');
            await _sleep(220);

            // Place nodes
            for (let i = 0; i < orderedNodes.length; i++) {
                if (token !== buildAnim.token) return;
                const n = orderedNodes[i];
                const label = n?.name || n?.type || `Step ${i + 1}`;
                done++;
                _showBuildOverlay(`Placing: ${label}`, Math.round((done / totalSteps) * 100), `${i + 1}/${orderedNodes.length}`);
                _moveCursorToCanvasPoint(_nodeCanvasCenter(n));
                await _sleep(240);
                _cursorClick();

                state.nodes.push(n);
                renderNode(n);
                const el = document.getElementById(n.id);
                if (el) {
                    el.classList.add('build-node-enter');
                    setTimeout(() => el.classList.remove('build-node-enter'), 300);
                }
                updateEmptyState();
                await _sleep(160);
            }

            // Connect edges
            done++;
            _showBuildOverlay('Connecting steps…', Math.round((done / totalSteps) * 100), '');
            await _sleep(220);

            for (let i = 0; i < edges.length; i++) {
                if (token !== buildAnim.token) return;
                const e = edges[i] || {};
                const from = e.from || e.source;
                const to = e.to || e.target;
                if (!from || !to) continue;
                const conn = {
                    from: String(from),
                    to: String(to),
                    type: e.type,
                    fromPort: e.fromPort,
                    toPort: e.toPort,
                    _animate: true
                };
                const fromNode = state.nodes.find(n => n.id === conn.from);
                const toNode = state.nodes.find(n => n.id === conn.to);
                const edgeLabel = (conn.type === 'yes' ? 'YES' : conn.type === 'no' ? 'NO' : '→');

                done++;
                _showBuildOverlay(
                    `Connecting: ${(fromNode?.name || conn.from)} ${edgeLabel} ${(toNode?.name || conn.to)}`,
                    Math.round((done / totalSteps) * 100),
                    `${i + 1}/${edges.length}`
                );

                if (fromNode) _moveCursorToCanvasPoint(_nodeCanvasCenter(fromNode));
                await _sleep(140);
                if (toNode) _moveCursorToCanvasPoint(_nodeCanvasCenter(toNode));
                await _sleep(140);
                _cursorClick();

                state.connections.push(conn);
                renderConnections();
                await _sleep(220);
            }

            // Finishing touches
            done++;
            _showBuildOverlay('Finishing touches…', Math.round((done / totalSteps) * 100), '');
            try { zoomFit(); } catch (_) {}
            await _sleep(260);

            // Reset undo baseline after build
            state.undoStack = [JSON.stringify({ nodes: state.nodes, connections: state.connections })];
            state.redoStack = [];

            buildAnim.running = false;
            _hideBuildCursor();
            _showBuildOverlay('Done. You can edit any step now.', 100, '');
            setTimeout(_hideBuildOverlay, 2200);
        }

        async function loadWorkflow(agentId) {
            try {
                const token = getAuthToken();
                const response = await fetch('/api/agents/' + agentId, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (!response.ok) throw new Error('Failed to load');
                
                const agent = await response.json();
                document.getElementById('workflow-name').value = agent.name || 'My Workflow';
                if (agent.goal) state.goal = agent.goal;
                
                // Load process settings (AI instructions, creativity, confidence)
                if (agent.process_settings && typeof agent.process_settings === 'object') {
                    state.processSettings = agent.process_settings;
                }

                if (agent.process_definition) {
                    applyWorkflowDefinition(agent.process_definition, {
                        name: agent.name || 'My Workflow',
                        goal: agent.goal || state.goal || ''
                    });
                }

                // Notify parent iframe host that the player is ready for playback
                if (state.playerMode) {
                    try { zoomFit(); } catch (_) {}
                    setTimeout(() => {
                        try { _postToParent({ type: 'PB_PLAYER_READY' }); } catch (_) {}
                    }, 80);
                }
            } catch (e) {
                console.error('Load error:', e);
                alert('Could not load workflow');
            }
        }
        
        async function saveWorkflow() {
            const name = document.getElementById('workflow-name').value;
            const goal = (state.goal && String(state.goal).trim()) ? String(state.goal).trim() : (name || 'Workflow automation');
            const def = {
                nodes: state.nodes,
                edges: state.connections
            };
            
            const token = getAuthToken();
            if (!token) {
                alert('❌ Please sign in first. Save and Publish require authentication.\n\nIf you opened the Workflow Builder in a new tab, try opening it from the main app (Create → Workflow → Visual Builder) after signing in.');
                return;
            }
            
            try {
                const method = state.agentId ? 'PUT' : 'POST';
                const url = state.agentId ? '/api/agents/' + state.agentId : '/api/agents';
                
                const body = state.agentId ? {
                    name,
                    goal,
                    process_definition: def,
                    process_settings: state.processSettings || {},
                    status: 'draft'
                } : {
                    name,
                    goal,
                    agent_type: 'process',
                    personality: {},
                    tasks: [],
                    tool_ids: [],
                    model_id: 'gpt-4o',
                    process_definition: def,
                    process_settings: state.processSettings || {},
                    status: 'draft'
                };
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(body)
                });
                
                let errMsg = 'Could not save workflow';
                if (!response.ok) {
                    try {
                        const errBody = await response.json();
                        errMsg = errBody.detail || errBody.message || errMsg;
                        if (Array.isArray(errMsg)) errMsg = errMsg.map(d => d.msg || JSON.stringify(d)).join('; ');
                    } catch (_) {
                        errMsg = await response.text() || response.statusText || errMsg;
                    }
                    throw new Error(errMsg);
                }
                
                const data = await response.json();
                if (!state.agentId) {
                    state.agentId = data.agent_id || data.id;
                    window.history.replaceState({}, '', '?agent=' + state.agentId);
                }
                
                alert('✅ Workflow saved!');
            } catch (e) {
                console.error('Save error:', e);
                alert('❌ ' + (e.message || 'Could not save workflow'));
            }
        }
        
        async function publishWorkflow() {
            if (!state.agentId) {
                await saveWorkflow();
                if (!state.agentId) return;
            } else {
                await saveWorkflow();
            }
            
            const token = getAuthToken();
            if (!token) {
                alert('❌ Please sign in first.');
                return;
            }
            
            try {
                const response = await fetch('/api/agents/' + state.agentId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ status: 'published', is_published: true })
                });
                
                let errMsg = 'Could not publish workflow';
                if (!response.ok) {
                    try {
                        const errBody = await response.json();
                        errMsg = errBody.detail || errBody.message || errMsg;
                        if (Array.isArray(errMsg)) errMsg = errMsg.map(d => d.msg || JSON.stringify(d)).join('; ');
                    } catch (_) {
                        errMsg = await response.text() || response.statusText || errMsg;
                    }
                    throw new Error(errMsg);
                }
                
                alert('🚀 Workflow published!');
            } catch (e) {
                console.error('Publish error:', e);
                alert('❌ ' + (e.message || 'Could not publish workflow'));
            }
        }
        
        // ===== TEST (BUSINESS-FRIENDLY, WITH PATH PLAYBACK) =====
        function getStartNodeForTest() {
            return state.nodes.find(n => n.type === 'trigger' || n.type === 'form')
                || state.nodes.find(n => n.type === 'schedule' || n.type === 'webhook')
                || null;
        }

        function getStartFieldDefs(startNode) {
            if (!startNode || typeof startNode !== 'object') return [];
            const cfg = (startNode.config && typeof startNode.config === 'object') ? startNode.config : {};
            const rawFields = cfg.fields || (cfg.type_config && cfg.type_config.fields) || [];
            if (!Array.isArray(rawFields)) return [];
            return rawFields
                .filter(f => f && typeof f === 'object')
                .map(f => {
                    const key = String(f.name || f.id || '').trim();
                    if (!key) return null;
                    const label = String(f.label || humanizeFieldLabel(key) || key).trim();
                    const type = String(f.type || 'text').toLowerCase();
                    const options = Array.isArray(f.options) ? f.options : [];
                    const derived = (f.derived && typeof f.derived === 'object' && String(f.derived.expression || '').trim())
                        ? { expression: String(f.derived.expression || '').trim() }
                        : null;
                    const prefill = (f.prefill && typeof f.prefill === 'object' && String(f.prefill.source || '').trim() === 'currentUser' && String(f.prefill.key || '').trim())
                        ? { source: 'currentUser', key: String(f.prefill.key || '').trim() }
                        : null;
                    const readOnly = !!f.readOnly || !!derived || !!prefill;
                    const required = !!f.required && !readOnly;
                    const placeholder = String(f.placeholder || (label ? `Enter ${label}...` : '')).trim();
                    const multiple = !!f.multiple;
                    return { name: key, label, type, required, placeholder, options, derived, prefill, readOnly, multiple };
                })
                .filter(Boolean);
        }

        let _pbMeCache = null;
        async function getCurrentUserProfile() {
            if (_pbMeCache) return _pbMeCache;
            const token = getAuthToken();
            if (!token) return null;
            try {
                const res = await fetch('/api/security/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
                if (!res.ok) return null;
                const data = await res.json();
                _pbMeCache = data;
                return data;
            } catch (_) {
                return null;
            }
        }

        async function applyPrefillToTestForm(fieldDefs) {
            const me = await getCurrentUserProfile();
            if (!me) return;
            const lookup = {
                id: me.id,
                name: me.name,
                email: me.email,
                orgId: me.org_id,
                roles: Array.isArray(me.roles) ? me.roles.map(r => r?.name || r?.id || r).filter(Boolean).join(', ') : '',
                groups: Array.isArray(me.groups) ? me.groups.map(g => g?.name || g?.id || g).filter(Boolean).join(', ') : ''
            };
            (fieldDefs || []).forEach(f => {
                if (!f || !f.prefill || f.prefill.source !== 'currentUser') return;
                const val = lookup[f.prefill.key];
                const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                if (el && val != null) el.value = String(val);
            });
        }

        async function testWorkflow() {
            const startNode = getStartNodeForTest();
            if (!startNode) {
                alert('No start node found. Add a Start/Form node first.');
                return;
            }
            const fieldDefs = getStartFieldDefs(startNode);
            if (!fieldDefs.length) {
                alert('No input fields found. Add fields to your Start/Form node first.');
                return;
            }
            
            // Create test modal (business-friendly)
            const modal = document.createElement('div');
            modal.id = 'test-workflow-modal';
            modal.style.cssText = `
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.78); display: flex; align-items: center; 
                justify-content: center; z-index: 10000; padding: 18px;
            `;
            modal.addEventListener('click', (e) => { if (e.target === modal) closeTestModal(); });
            
            modal.innerHTML = `
                <div style="background:var(--pb-panel); color:var(--pb-text); border:1px solid rgba(148,163,184,0.18); border-radius:16px; width:720px; max-width:100%; max-height:86vh; overflow:auto;">
                    <div style="padding:18px 18px 14px; border-bottom:1px solid rgba(148,163,184,0.16);">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                            <div>
                                <h2 style="margin:0; font-size:18px;">Test run</h2>
                                <p style="margin:6px 0 0; color:var(--pb-muted); font-size:13px;">Fill the fields and we’ll play back the workflow path on the canvas.</p>
                                <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                                    <label style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--pb-muted);cursor:pointer;user-select:none;">
                                        <input id="test-send-real-emails" type="checkbox" checked style="width:16px;height:16px;accent-color: var(--success);">
                                        Send email notifications for real (SendGrid)
                                    </label>
                                    <label style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--pb-muted);cursor:pointer;user-select:none;">
                                        <input id="test-run-real-engine" type="checkbox" style="width:16px;height:16px;accent-color: var(--tb-btn-primary-bg);">
                                        Run using the real engine (shows extracted/API results)
                                    </label>
                                    <div style="font-size:11px;color:var(--pb-muted);margin-left:26px;">
                                        Engine mode runs tools and steps for real (it may send real notifications).
                                    </div>
                                </div>
                            </div>
                            <button type="button" onclick="closeTestModal()" style="background:transparent;border:none;color:var(--pb-muted);font-size:22px;line-height:1;cursor:pointer;">×</button>
                        </div>
                    </div>
                    <div style="padding:18px;">
                        <form id="test-workflow-form" onsubmit="event.preventDefault(); runWorkflowTest();">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                ${fieldDefs.map(f => {
                                    const required = f.required ? '<span style="color:var(--danger);">*</span>' : '';
                                    const ro = f.readOnly ? 'readonly' : '';
                                    const dis = f.readOnly ? 'disabled' : '';
                                    const hint = f.prefill
                                        ? `<div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">Auto-filled from profile</div>`
                                        : (f.derived ? `<div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">Auto-calculated</div>` : (f.readOnly ? `<div style="font-size:11px;color:var(--pb-muted);margin-top:6px;">Read-only</div>` : ''));
                                    const baseStyle = `width:100%; padding:10px; background:var(--bg-input); border:1.5px solid var(--input-border); border-radius:10px; color:var(--text-primary);`;
                                    const labelHtml = `<label style="display:block; margin-bottom:7px; font-size:13px; color:var(--pb-text);">${escapeHtml(f.label)} ${required}</label>`;
                                    let inputHtml = '';
                                    if (f.type === 'textarea') {
                                        inputHtml = `<textarea data-field-key="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}" style="${baseStyle} min-height:90px;" placeholder="${escapeHtml(f.placeholder || '')}" ${f.required ? 'required' : ''} ${ro}></textarea>`;
                                    } else if (f.type === 'select') {
                                        inputHtml = `
                                            <select data-field-key="${escapeHtml(f.name)}" name="${escapeHtml(f.name)}" style="${baseStyle}" ${f.required ? 'required' : ''} ${dis}>
                                                <option value="">Select…</option>
                                                ${(f.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('')}
                                            </select>
                                        `;
                                    } else if (f.type === 'file') {
                                        const multiAttr = f.multiple ? 'multiple' : '';
                                        inputHtml = `<input data-field-key="${escapeHtml(f.name)}" type="file" name="${escapeHtml(f.name)}" style="${baseStyle}" ${f.required ? 'required' : ''} ${multiAttr}>`;
                                    } else {
                                        const inputType = (f.type === 'number') ? 'number' : (f.type === 'email') ? 'email' : (f.type === 'date') ? 'date' : 'text';
                                        inputHtml = `<input data-field-key="${escapeHtml(f.name)}" type="${inputType}" name="${escapeHtml(f.name)}" style="${baseStyle}" placeholder="${escapeHtml(f.placeholder || '')}" ${f.required ? 'required' : ''} ${ro}>`;
                                    }
                                    return `
                                        <div style="min-width:0;">
                                            ${labelHtml}
                                            ${inputHtml}
                                            ${hint}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid rgba(148,163,184,0.16);">
                                <button type="button" onclick="closeTestModal()" style="padding:10px 16px; background:var(--tb-btn-secondary-bg); border:1px solid var(--tb-btn-secondary-border); border-radius:10px; color:var(--tb-btn-secondary-text); cursor:pointer;">
                                    Cancel
                                </button>
                                <button type="submit" style="padding:10px 16px; background:var(--success); border:none; border-radius:10px; color:white; cursor:pointer; font-weight:600;">
                                    Run test
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            window._testRunContext = { startNodeId: startNode.id, fieldDefs };
            setupTestFormDerived(fieldDefs);
            await applyPrefillToTestForm(fieldDefs);
            applyDerivedToForm(fieldDefs);
        }
        
        function closeTestModal() {
            const modal = document.getElementById('test-workflow-modal');
            if (modal) modal.remove();
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
            // quoted string
            if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
                return t.slice(1, -1);
            }
            // number literal
            if (/^-?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
            // field ref (allow {{key}} or key)
            const key = t.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
            return (values && key in values) ? values[key] : '';
        }

        function evaluateDerivedExpression(expression, values) {
            const expr = String(expression || '').trim();
            if (!expr) return '';
            // direct ref
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
                    const diff = Math.floor((utc2 - utc1) / 86400000) + 1;
                    return diff;
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

        function collectTestFormValues(fieldDefs) {
            const values = {};
            (fieldDefs || []).forEach(f => {
                const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                values[f.name] = el ? el.value : '';
            });
            return values;
        }

        function applyDerivedToForm(fieldDefs) {
            const values = collectTestFormValues(fieldDefs);
            // Evaluate derived fields
            (fieldDefs || []).forEach(f => {
                if (f && f.derived && f.derived.expression) {
                    const v = evaluateDerivedExpression(f.derived.expression, values);
                    values[f.name] = (v == null) ? '' : String(v);
                    const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                    if (el) el.value = values[f.name];
                }
            });
            return values;
        }

        function setupTestFormDerived(fieldDefs) {
            // Attach listeners to recompute derived fields
            (fieldDefs || []).forEach(f => {
                if (!f || f.readOnly) return;
                const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                if (!el) return;
                el.addEventListener('input', () => applyDerivedToForm(fieldDefs));
                el.addEventListener('change', () => applyDerivedToForm(fieldDefs));
            });
            // Initial compute
            applyDerivedToForm(fieldDefs);
        }

        // =====================================================================
        // PRE-FLIGHT VALIDATION SYSTEM
        // =====================================================================
        async function _runPreflightCheck() {
            const token = getAuthToken();
            if (!token) return null;
            try {
                const res = await fetch('/process/preflight-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ agent_id: state.agentId })
                });
                if (!res.ok) return null;
                return await res.json();
            } catch (_) {
                return null;
            }
        }
        
        function _showPreflightModal(preflightResult) {
            return new Promise((resolve) => {
                const issues = preflightResult.issues || [];
                const errors = issues.filter(i => i.severity === 'error');
                const warnings = issues.filter(i => i.severity === 'warning');
                const profile = preflightResult.user_profile_summary || {};
                
                const modal = document.createElement('div');
                modal.id = 'preflight-modal';
                modal.style.cssText = `
                    position:fixed;inset:0;background:rgba(0,0,0,0.78);display:flex;align-items:center;
                    justify-content:center;z-index:10001;padding:18px;
                `;
                modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); resolve('cancel'); } });
                
                // Build profile summary card
                const profileHtml = `
                    <div style="background:var(--bg-input);border:1px solid rgba(148,163,184,0.15);border-radius:12px;padding:14px;margin-bottom:16px;">
                        <div style="font-size:12px;color:var(--pb-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Your Profile</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                            <div><span style="color:var(--pb-muted);">Name:</span> ${escapeHtml(profile.name || '—')}</div>
                            <div><span style="color:var(--pb-muted);">Email:</span> ${escapeHtml(profile.email || '—')}</div>
                            <div><span style="color:var(--pb-muted);">Manager:</span> ${profile.has_manager ? escapeHtml(profile.manager_name || profile.manager_email || 'Assigned') : '<span style="color:var(--danger);">Not assigned</span>'}</div>
                            <div><span style="color:var(--pb-muted);">Department:</span> ${profile.department ? escapeHtml(profile.department) : '<span style="color:var(--warning);">Not set</span>'}</div>
                        </div>
                        <div style="margin-top:8px;font-size:11px;color:var(--pb-muted);">Identity Source: ${escapeHtml(preflightResult.identity_source || 'Built-in')}</div>
                    </div>
                `;
                
                // Build issues cards
                const issueCards = issues.map(issue => {
                    const isError = issue.severity === 'error';
                    const borderColor = isError ? 'var(--danger)' : 'var(--warning)';
                    const bgColor = isError
                        ? 'color-mix(in srgb, var(--danger) 8%, transparent)'
                        : 'color-mix(in srgb, var(--warning) 8%, transparent)';
                    const icon = isError ? '🔴' : '🟡';
                    const action = issue.action || {};
                    const actionBtn = action.label ? `
                        <button type="button" class="preflight-fix-btn" data-action-type="${escapeHtml(action.type || '')}" data-action-target="${escapeHtml(action.target || '')}" data-action-field="${escapeHtml(action.field || '')}" data-manager-id="${escapeHtml(action.manager_id || '')}"
                            style="margin-top:10px;padding:7px 14px;background:var(--tb-btn-primary-bg);color:var(--tb-btn-primary-text);border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
                            ${escapeHtml(action.label)}
                        </button>
                    ` : '';
                    
                    return `
                        <div style="border:1px solid ${borderColor};background:${bgColor};border-radius:10px;padding:12px;margin-bottom:10px;">
                            <div style="font-weight:600;font-size:14px;">${icon} ${escapeHtml(issue.title)}</div>
                            <div style="font-size:13px;color:var(--pb-text);margin-top:6px;white-space:pre-wrap;">${escapeHtml(issue.message)}</div>
                            ${actionBtn}
                        </div>
                    `;
                }).join('');
                
                const hasErrors = errors.length > 0;
                
                modal.innerHTML = `
                    <div style="background:var(--pb-panel);color:var(--pb-text);border:1px solid rgba(148,163,184,0.18);border-radius:16px;width:680px;max-width:100%;max-height:86vh;overflow:auto;">
                        <div style="padding:18px 18px 14px;border-bottom:1px solid rgba(148,163,184,0.16);display:flex;align-items:center;justify-content:space-between;">
                            <div>
                                <h2 style="margin:0;font-size:18px;">${hasErrors ? '⚠️ Pre-flight Check' : '✅ Pre-flight Check'}</h2>
                                <p style="margin:6px 0 0;color:var(--pb-muted);font-size:13px;">${hasErrors ? 'Some issues need your attention before running this test.' : 'Minor warnings detected — you can proceed or fix them first.'}</p>
                            </div>
                            <button type="button" id="preflight-close-btn" style="background:transparent;border:none;color:var(--pb-muted);font-size:22px;line-height:1;cursor:pointer;">×</button>
                        </div>
                        <div style="padding:18px;">
                            ${profileHtml}
                            <div style="font-size:13px;font-weight:600;margin-bottom:10px;">${issues.length} issue${issues.length !== 1 ? 's' : ''} found</div>
                            ${issueCards}
                        </div>
                        <div style="padding:14px 18px;border-top:1px solid rgba(148,163,184,0.16);display:flex;gap:12px;justify-content:flex-end;">
                            <button type="button" id="preflight-cancel-btn" style="padding:10px 16px;background:var(--tb-btn-secondary-bg);border:1px solid var(--tb-btn-secondary-border);border-radius:10px;color:var(--tb-btn-secondary-text);cursor:pointer;">
                                Cancel
                            </button>
                            <button type="button" id="preflight-continue-btn" style="padding:10px 16px;background:${hasErrors ? 'var(--warning)' : 'var(--success)'};border:none;border-radius:10px;color:white;cursor:pointer;font-weight:600;">
                                ${hasErrors ? 'Continue anyway' : 'Continue with test'}
                            </button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Wire up buttons
                modal.querySelector('#preflight-close-btn').addEventListener('click', () => { modal.remove(); resolve('cancel'); });
                modal.querySelector('#preflight-cancel-btn').addEventListener('click', () => { modal.remove(); resolve('cancel'); });
                modal.querySelector('#preflight-continue-btn').addEventListener('click', () => { modal.remove(); resolve('continue'); });
                
                // Wire up fix action buttons
                modal.querySelectorAll('.preflight-fix-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const actionType = btn.dataset.actionType;
                        const actionTarget = btn.dataset.actionTarget;
                        const actionField = btn.dataset.actionField;
                        const managerId = btn.dataset.managerId;
                        _handlePreflightFixAction(actionType, actionTarget, actionField, managerId);
                    });
                });
            });
        }
        
        function _handlePreflightFixAction(actionType, target, field, managerId) {
            // Open the appropriate page/modal based on the action
            const baseUrl = window.location.origin;
            
            if (actionType === 'open_settings') {
                if (target === 'identity') {
                    window.open(baseUrl + '/dashboard#settings/identity', '_blank');
                } else if (target === 'departments') {
                    window.open(baseUrl + '/dashboard#departments', '_blank');
                } else {
                    window.open(baseUrl + '/dashboard#settings', '_blank');
                }
            } else if (actionType === 'open_profile') {
                if (target === 'user_management') {
                    // For manager assignment or department — go to user management
                    if (managerId) {
                        window.open(baseUrl + '/dashboard#users/' + encodeURIComponent(managerId), '_blank');
                    } else {
                        window.open(baseUrl + '/dashboard#users', '_blank');
                    }
                } else {
                    // Open own profile
                    window.open(baseUrl + '/dashboard#profile', '_blank');
                }
            }
        }
        
        async function runWorkflowTest() {
            const ctx = window._testRunContext || {};
            const fieldDefs = ctx.fieldDefs || [];
            const values = applyDerivedToForm(fieldDefs);
            // Basic required validation (business-friendly)
            for (const f of fieldDefs) {
                if (f.required && String(f.type || '').toLowerCase() !== 'file' && !String(values[f.name] || '').trim()) {
                    alert(`Please fill in: ${f.label}`);
                    const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                    if (el) el.focus();
                    return;
                }
            }

            const runWithEngine = !!document.getElementById('test-run-real-engine')?.checked;
            if (runWithEngine) {
                // Upload file fields (so the real engine/extraction steps can use the actual document)
                for (const f of fieldDefs) {
                    if (!f || String(f.type || '').toLowerCase() !== 'file') continue;
                    const el = document.querySelector(`#test-workflow-form [data-field-key="${CSS.escape(f.name)}"]`);
                    const fileList = el && el.files ? el.files : [];
                    if (f.required && fileList.length === 0) {
                        alert(`Please upload: ${f.label}`);
                        if (el) el.focus();
                        return;
                    }
                    if (fileList.length > 0) {
                        try {
                            if (f.multiple && fileList.length > 1) {
                                // Upload all files for multiple-file fields
                                const uploaded = [];
                                for (let fi = 0; fi < fileList.length; fi++) {
                                    uploaded.push(await uploadPbTestRunFile(fileList[fi]));
                                }
                                values[f.name] = uploaded;
                            } else {
                                values[f.name] = await uploadPbTestRunFile(fileList[0]);
                            }
                        } catch (e) {
                            alert(`Could not upload "${f.label}". Please try again.`);
                            return;
                        }
                    } else {
                        values[f.name] = null;
                    }
                }
            }
            const sendRealEmails = !!document.getElementById('test-send-real-emails')?.checked;
            let currentUser = null;
            try {
                const me = await getCurrentUserProfile();
                if (me) {
                    currentUser = {
                        id: me.id,
                        name: me.name,
                        email: me.email,
                        orgId: me.org_id,
                        roles: Array.isArray(me.roles) ? me.roles.map(r => r?.name || r?.id || r).filter(Boolean) : [],
                        groups: Array.isArray(me.groups) ? me.groups.map(g => g?.name || g?.id || g).filter(Boolean) : [],
                    };
                }
            } catch (_) {
                currentUser = null;
            }
            closeTestModal();
            if (runWithEngine) {
                await runWorkflowTestWithEngine(values, { fieldDefs, currentUser });
            } else {
                await simulateWorkflow(values, { fieldDefs, sendRealEmails, currentUser });
            }
        }

        async function uploadPbTestRunFile(fileObj) {
            const token = getAuthToken();
            if (!token) throw new Error('Not signed in');
            const fd = new FormData();
            fd.append('file', fileObj);
            const res = await fetch('/process/uploads', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token
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
            if (!f || !f.id) throw new Error('File upload failed');
            return f;
        }

        function _engineStatusBadge(status) {
            const s = String(status || '').toLowerCase();
            if (s === 'completed') return `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--success) 18%, transparent);border:1px solid color-mix(in srgb, var(--success) 45%, transparent);color:var(--success);font-weight:800;font-size:12px;">Completed</span>`;
            if (s === 'failed') return `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--danger) 18%, transparent);border:1px solid color-mix(in srgb, var(--danger) 45%, transparent);color:var(--danger);font-weight:800;font-size:12px;">Failed</span>`;
            if (s === 'waiting') return `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--warning) 18%, transparent);border:1px solid color-mix(in srgb, var(--warning) 45%, transparent);color:var(--warning);font-weight:800;font-size:12px;">Waiting</span>`;
            return `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--tb-btn-primary-bg) 18%, transparent);border:1px solid color-mix(in srgb, var(--tb-btn-primary-bg) 45%, transparent);color:var(--tb-btn-primary-text);font-weight:800;font-size:12px;">Running</span>`;
        }

        function _renderUploadedFile(f) {
            const name = f.name || 'Uploaded file';
            const typ = f.file_type ? String(f.file_type).toUpperCase() : '';
            const size = (typeof f.size === 'number') ? `${Math.round(f.size / 1024)} KB` : '';
            const meta = [typ, size].filter(Boolean).join(' · ');
            const btn = f.id ? `<button type="button" class="toolbar-btn btn-secondary" style="padding:4px 8px;border-radius:8px;font-size:11px;white-space:nowrap;"
                data-upload-file-id="${escapeHtml(String(f.id))}"
                data-upload-file-name="${escapeHtml(String(name))}"
            >Download</button>` : '';
            return `<div style="display:flex;align-items:center;gap:5px;margin:4px 0;flex-wrap:wrap;">
                <span style="font-size:14px;flex-shrink:0;">📎</span>
                <span style="font-size:13px;word-break:break-word;">${escapeHtml(name)}</span>
                ${meta ? `<span style="color:var(--pb-muted);font-size:11px;white-space:nowrap;">(${escapeHtml(meta)})</span>` : ''}
                ${btn ? `<span>${btn}</span>` : ''}
            </div>`;
        }
        
        function _renderEngineValue(v) {
            if (v == null) return '—';
            if (typeof v === 'string') return v.trim() ? escapeHtml(v) : '—';
            if (typeof v === 'number' || typeof v === 'boolean') return escapeHtml(String(v));
            if (typeof v === 'object') {
                // Single uploaded file
                if (v.kind === 'uploadedFile' && (v.name || v.id)) {
                    return _renderUploadedFile(v);
                }
                // Array of uploaded files (multiple file upload)
                if (Array.isArray(v) && v.length > 0 && v[0] && v[0].kind === 'uploadedFile') {
                    return v.map(f => _renderUploadedFile(f)).join('');
                }
                // Array of simple values
                if (Array.isArray(v)) {
                    if (v.length === 0) return '—';
                    // Array of objects → format as readable list
                    if (v.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
                        return v.map((item, i) => {
                            const parts = Object.entries(item)
                                .filter(([k, val]) => !k.startsWith('_') && val != null)
                                .map(([k, val]) => {
                                    // camelCase/snake_case → Title Case
                                    const label = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
                                        .replace(/\b\w/g, c => c.toUpperCase());
                                    return `<strong>${escapeHtml(label)}</strong>: ${escapeHtml(String(val))}`;
                                }).join(', ');
                            return `<div style="margin:2px 0;font-size:13px;">${i + 1}. ${parts}</div>`;
                        }).join('');
                    }
                    // Array of simple values → comma-separated
                    return escapeHtml(v.map(String).join(', '));
                }
                // Single object → readable key-value
                if (!Array.isArray(v)) {
                    const parts = Object.entries(v)
                        .filter(([k, val]) => !k.startsWith('_') && val != null)
                        .map(([k, val]) => {
                            const label = k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
                                .replace(/\b\w/g, c => c.toUpperCase());
                            return `<strong>${escapeHtml(label)}</strong>: ${escapeHtml(String(val))}`;
                        });
                    if (parts.length > 0) {
                        return parts.join('<br>');
                    }
                }
            }
            try {
                const s = JSON.stringify(v);
                const t = s && s.length > 1400 ? (s.slice(0, 1400) + '…') : (s || '');
                return t ? escapeHtml(t) : '—';
            } catch (_) {
                const s = String(v);
                const t = s.length > 1400 ? (s.slice(0, 1400) + '…') : s;
                return escapeHtml(t);
            }
        }

        async function downloadProcessUploadFile(fileId, filename) {
            const id = String(fileId || '').trim();
            if (!id) return;
            const name = String(filename || '').trim() || `upload-${id}`;
            const token = getAuthToken();
            if (!token) {
                alert('❌ Please sign in first.');
                return;
            }
            try {
                const res = await fetch('/process/uploads/' + encodeURIComponent(id) + '/download', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (!res.ok) {
                    let msg = res.statusText || 'Failed to download file';
                    try {
                        const data = await res.json().catch(() => null);
                        if (data && (data.detail || data.message || data.error)) msg = data.detail || data.message || data.error;
                    } catch (_) {}
                    alert('❌ ' + String(msg || 'Failed to download file'));
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
                alert('❌ Unable to download file. Please try again.');
            }
        }

        function _openEngineRunModal() {
            const modal = document.createElement('div');
            modal.id = 'engine-test-running-modal';
            modal.style.cssText = `
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.78); display: flex; align-items: center;
                justify-content: center; z-index: 10000; padding: 18px;
            `;
            modal.addEventListener('click', (e) => { if (e.target === modal) { /* keep open */ } });
            modal.innerHTML = `
                <div style="background:var(--pb-panel); color:var(--pb-text); border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); border-radius:16px; width:760px; max-width:100%; box-shadow: var(--shadow-md); overflow:hidden;">
                    <div style="padding:16px 18px; border-bottom:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                        <div>
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                                <h2 style="margin:0; font-size:18px;">Running real test</h2>
                                <span id="engine-test-status-badge">${_engineStatusBadge('running')}</span>
                            </div>
                            <div id="engine-test-status-text" style="margin-top:6px; font-size:13px; color: var(--pb-muted);">Starting…</div>
                        </div>
                        <button type="button" id="engine-test-close-btn" class="toolbar-btn btn-secondary" style="padding:10px 12px;border-radius:12px;">Hide</button>
                    </div>
                    <div id="engine-test-approval" style="display:none;padding:18px;border-bottom:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);">
                        <div style="display:flex;gap:12px;align-items:flex-start;">
                            <div style="width:36px;height:36px;border-radius:12px;background: color-mix(in srgb, var(--warning) 18%, transparent); border:1px solid color-mix(in srgb, var(--warning) 45%, transparent); display:flex;align-items:center;justify-content:center;font-size:18px;">⏳</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:900;font-size:15px;">Waiting for approval</div>
                                <div id="engine-test-approval-title" style="margin-top:4px;color:var(--pb-muted);font-size:13px;">Approval</div>
                                <div id="engine-test-approval-desc" style="margin-top:8px;font-size:13px;line-height:1.4;color:color-mix(in srgb, var(--pb-text) 88%, var(--pb-muted));"></div>
                                <div style="margin-top:14px;display:flex;gap:10px;">
                                    <button type="button" id="engine-test-approve-btn" class="toolbar-btn btn-primary" style="flex:1; padding:12px 12px; border-radius:12px;">Approve & continue</button>
                                    <button type="button" id="engine-test-reject-btn" class="toolbar-btn btn-secondary" style="flex:1; padding:12px 12px; border-radius:12px; border:1px solid color-mix(in srgb, var(--danger) 45%, transparent); color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent);">Reject</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding:18px;">
                        <div style="display:flex;gap:10px;align-items:center;color:var(--pb-muted);font-size:13px;">
                            <div style="width:18px;height:18px;border-radius:999px;border:2px solid color-mix(in srgb, var(--tb-btn-primary-bg) 60%, transparent);border-top-color:transparent;animation: spin 0.9s linear infinite;"></div>
                            <div>We’ll show a full report when it finishes.</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            const closeBtn = modal.querySelector('#engine-test-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => { try { modal.remove(); } catch (_) {} });
            return modal;
        }

        async function _ensureWorkflowSavedSilently() {
            const token = getAuthToken();
            if (!token) throw new Error('Please sign in first.');
            const name = document.getElementById('workflow-name')?.value || 'Workflow';
            const goal = (state.goal && String(state.goal).trim()) ? String(state.goal).trim() : (name || 'Workflow automation');
            const def = { nodes: state.nodes, edges: state.connections };
            const method = state.agentId ? 'PUT' : 'POST';
            const url = state.agentId ? '/api/agents/' + state.agentId : '/api/agents';
            const body = state.agentId ? {
                name,
                goal,
                process_definition: def,
                process_settings: state.processSettings || {},
                status: 'draft'
            } : {
                name,
                goal,
                agent_type: 'process',
                personality: {},
                tasks: [],
                tool_ids: [],
                model_id: 'gpt-4o',
                process_definition: def,
                process_settings: state.processSettings || {},
                status: 'draft'
            };
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body)
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) {
                const msg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : (res.statusText || 'Could not save workflow');
                throw new Error(String(msg || 'Could not save workflow'));
            }
            if (!state.agentId) {
                state.agentId = data?.agent_id || data?.id || state.agentId;
                if (state.agentId) {
                    try { window.history.replaceState({}, '', '?agent=' + state.agentId); } catch (_) {}
                }
            }
            return state.agentId;
        }

        async function _fetchExecution(executionId) {
            const token = getAuthToken();
            const res = await fetch('/process/executions/' + encodeURIComponent(String(executionId)), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) return null;
            return data;
        }

        async function _fetchStepsIo(executionId) {
            const token = getAuthToken();
            const res = await fetch('/process/executions/' + encodeURIComponent(String(executionId)) + '/steps?include_io=1', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) return [];
            const steps = data?.steps || [];
            return Array.isArray(steps) ? steps : [];
        }

        async function _fetchPendingApprovalForExecution(executionId) {
            const token = getAuthToken();
            const res = await fetch('/process/approvals?status=pending', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) return null;
            const items = data?.items || data?.approvals || [];
            const execId = String(executionId || '');
            return (items || []).find(a => String(a?.process_execution_id || a?.run_id || a?.execution_id || a?.executionId || '') === execId) || null;
        }

        async function _decideApproval(approvalId, decision) {
            const token = getAuthToken();
            const res = await fetch('/process/approvals/' + encodeURIComponent(String(approvalId)) + '/decide', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ decision })
            });
            let data = null;
            try { data = await res.json(); } catch (_) { data = null; }
            if (!res.ok) {
                const msg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : (res.statusText || 'Failed to submit decision');
                throw new Error(String(msg || 'Failed to submit decision'));
            }
            return data;
        }

        function _showEngineTestReport(execution, triggerInput, fieldDefs, steps) {
            const modal = document.createElement('div');
            modal.id = 'engine-test-report-modal';
            modal.style.cssText = `
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.78); display: flex; align-items: center;
                justify-content: center; z-index: 10000; padding: 18px;
            `;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    try { clearPlaybackHighlights(); } catch (_) {}
                }
            });

            const fieldLabelByKey = {};
            (fieldDefs || []).forEach(f => { if (f && f.name) fieldLabelByKey[f.name] = f.label || humanizeFieldLabel(f.name) || f.name; });

            const inputRows = Object.keys(triggerInput || {}).map(k => {
                const label = fieldLabelByKey[k] || humanizeFieldLabel(k) || k;
                return `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed color-mix(in srgb, var(--pb-muted) 28%, transparent);">
                    <div style="color:var(--pb-muted);font-size:13px;">${escapeHtml(label)}</div>
                    <div style="color:var(--pb-text);font-size:13px;font-weight:700;max-width:62%;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_renderEngineValue(triggerInput[k])}</div>
                </div>`;
            }).join('') || `<div style="color:var(--pb-muted);font-size:13px;">No inputs.</div>`;

            const status = String(execution?.status || '').toLowerCase();
            const badge = _engineStatusBadge(status);
            const headline = status === 'completed'
                ? 'Workflow completed successfully.'
                : status === 'failed'
                    ? (execution?.error_message || execution?.error?.message || 'The workflow failed.')
                    : status === 'waiting'
                        ? 'Workflow is waiting for approval.'
                        : 'Workflow is running.';

            // Track if any step has a non-user-fixable error (for IT guidance banner)
            let _hasNonFixableError = false;

            const stepsCards = (steps || []).slice(0, 80).map((s) => {
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
                const name = s.step_name || 'Step';
                const out = s.output || {};
                const outPreview = (out && typeof out === 'object' && ('variables_update' in out || 'output' in out))
                    ? _renderEngineValue(out.variables_update && Object.keys(out.variables_update || {}).length ? out.variables_update : out.output)
                    : _renderEngineValue(out);

                // --- Error display: business-friendly + technical ---
                const errorMsg = s.error ? String(s.error) : '';
                // Extract business_message from error object or from output
                const errorObj = s.error_detail || s.error_obj || {};
                const bizMsg = errorObj.business_message
                    || (out && typeof out === 'object' ? (out.business_message || out.business_error) : '')
                    || '';
                const isUserFixable = errorObj.is_user_fixable !== undefined ? errorObj.is_user_fixable
                    : (out && typeof out === 'object' ? out.is_user_fixable : undefined);
                const actionHint = errorObj.action_hint
                    || (out && typeof out === 'object' ? out.action_hint : '')
                    || (isUserFixable === false ? 'This appears to be a technical issue. Please share the Technical view details with your IT team for investigation.' : '')
                    || '';

                if (stKey === 'failed' && isUserFixable === false) {
                    _hasNonFixableError = true;
                }

                let errorHtml = '';
                if (errorMsg || bizMsg) {
                    // Show business message first (if available), then technical error in a collapsible
                    const bizHtml = bizMsg
                        ? `<div style="font-size:13px;color:#fca5a5;line-height:1.45;margin-bottom:4px;">${escapeHtml(bizMsg)}</div>`
                        : '';
                    const hintHtml = actionHint
                        ? `<div style="margin-top:6px;padding:6px 10px;background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.25);border-radius:8px;font-size:12px;color:#fbbf24;line-height:1.35;">💡 ${escapeHtml(actionHint)}</div>`
                        : '';
                    const techHtml = errorMsg && bizMsg
                        ? `<details style="margin-top:6px;"><summary style="font-size:11px;color:var(--pb-muted);cursor:pointer;">Show technical details</summary><pre style="margin:4px 0 0;white-space:pre-wrap;word-break:break-word;color:var(--pb-muted);font-size:11px;line-height:1.3;">${escapeHtml(errorMsg)}</pre></details>`
                        : errorMsg ? `<div style="font-size:12px;color:#fca5a5;line-height:1.4;">${escapeHtml(errorMsg)}</div>` : '';
                    errorHtml = `<div style="margin-top:6px;padding:8px 12px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;">⚠️ ${bizHtml}${techHtml}${hintHtml}</div>`;
                }
                // Also show soft errors from notification outputs that succeeded but didn't send
                if (!errorHtml && out && typeof out === 'object' && out.sent === false && out.error) {
                    const softBiz = out.business_message || out.business_error || '';
                    const softHint = out.action_hint || '';
                    const softMsg = softBiz || String(out.error);
                    errorHtml = `<div style="margin-top:6px;padding:8px 12px;background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.25);border-radius:10px;font-size:12px;color:#fbbf24;line-height:1.4;">⚠️ ${escapeHtml(softMsg)}${softHint ? `<div style="margin-top:4px;font-size:11px;color:var(--pb-muted);">💡 ${escapeHtml(softHint)}</div>` : ''}</div>`;
                }

                return `
                    <details style="padding:12px;background:var(--bg-input);border:1px solid ${stKey === 'failed' ? 'rgba(239,68,68,0.3)' : 'color-mix(in srgb, var(--pb-muted) 22%, transparent)'};border-radius:14px;margin-bottom:10px;" ${stKey === 'failed' ? 'open' : ''}>
                        <summary style="cursor:pointer;user-select:none;display:flex;gap:12px;align-items:flex-start;">
                            <div style="width:30px;height:30px;border-radius:10px;background:color-mix(in srgb, var(--tb-btn-primary-bg) 18%, transparent);display:flex;align-items:center;justify-content:center;color:var(--tb-btn-primary-text);font-weight:900;">
                                ${icon}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                    <div style="font-weight:800;color:var(--pb-text);">${escapeHtml(name)}</div>
                                    <div style="font-size:12px;color:var(--pb-muted);">${escapeHtml(s.step_type || '')}</div>
                                </div>
                                <div style="margin-top:6px;font-size:13px;color:color-mix(in srgb, var(--pb-text) 86%, var(--pb-muted));line-height:1.35;">${outPreview}</div>
                                ${errorHtml}
                            </div>
                        </summary>
                        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                            <div style="padding:10px;border-radius:12px;border:1px solid color-mix(in srgb, var(--pb-muted) 18%, transparent);background:rgba(0,0,0,0.12);">
                                <div style="font-weight:800;font-size:12px;color:var(--pb-text);margin-bottom:8px;">Inputs</div>
                                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:var(--pb-muted);font-size:12px;line-height:1.35;">${escapeHtml(JSON.stringify(s.input || {}, null, 2) || '')}</pre>
                            </div>
                            <div style="padding:10px;border-radius:12px;border:1px solid color-mix(in srgb, var(--pb-muted) 18%, transparent);background:rgba(0,0,0,0.12);">
                                <div style="font-weight:800;font-size:12px;color:var(--pb-text);margin-bottom:8px;">Outputs</div>
                                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;color:var(--pb-muted);font-size:12px;line-height:1.35;">${escapeHtml(JSON.stringify(s.output || {}, null, 2) || '')}</pre>
                            </div>
                        </div>
                    </details>
                `;
            }).join('') || `<div style="color:var(--pb-muted);">No steps.</div>`;

            const executionId = execution?.id || execution?.execution_id || '';

            modal.innerHTML = `
                <div style="background:var(--pb-panel); color:var(--pb-text); border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); border-radius:16px; width:1100px; max-width:100%; max-height:88vh; overflow:auto; box-shadow: var(--shadow-md);">
                    <div style="padding:18px; border-bottom:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <h2 style="margin:0; font-size:18px;">Test report (real run)</h2>
                                ${badge}
                            </div>
                            <p style="margin:6px 0 0; color:var(--pb-muted); font-size:13px;">${escapeHtml(headline)}</p>
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <!-- Business / Technical toggle -->
                            <div id="report-view-toggle" style="display:inline-flex;border-radius:12px;border:1px solid color-mix(in srgb, var(--pb-muted) 32%, transparent);overflow:hidden;font-size:13px;">
                                <button id="report-view-business" type="button" style="padding:8px 16px;border:none;cursor:pointer;font-weight:700;background:var(--tb-btn-primary-bg);color:var(--tb-btn-primary-text);transition:all .2s;">Business</button>
                                <button id="report-view-technical" type="button" style="padding:8px 16px;border:none;cursor:pointer;font-weight:600;background:transparent;color:var(--pb-muted);transition:all .2s;">Technical</button>
                            </div>
                            <button type="button" class="toolbar-btn btn-secondary" onclick="document.getElementById('engine-test-report-modal')?.remove(); clearPlaybackHighlights();" style="padding:10px 12px;border-radius:12px;">
                                Close
                            </button>
                        </div>
                    </div>
                    <!-- BUSINESS VIEW (default) -->
                    <div id="report-business-view" style="padding:18px; display:grid;grid-template-columns: 360px 1fr; gap:16px;">
                        <div>
                            <div style="padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:900;color:var(--pb-text);margin-bottom:10px;">Submitted information</div>
                                <div>${inputRows}</div>
                            </div>
                            <div style="margin-top:12px;padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:900;color:var(--pb-text);margin-bottom:8px;">Outcome</div>
                                <div style="color:color-mix(in srgb, var(--pb-text) 86%, var(--pb-muted));font-size:13px;line-height:1.35;">${escapeHtml(headline)}</div>
                            </div>
                        </div>
                        <div>
                            <div id="business-summary-content" style="padding:18px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;min-height:120px;">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                                    <div style="font-weight:900;color:var(--pb-text);font-size:15px;">What happened</div>
                                </div>
                                <div id="business-summary-body" style="color:color-mix(in srgb, var(--pb-text) 92%, var(--pb-muted));font-size:14px;line-height:1.6;">
                                    <div style="display:flex;align-items:center;gap:10px;padding:24px 0;justify-content:center;color:var(--pb-muted);">
                                        <div class="spinner" style="width:20px;height:20px;border:2px solid color-mix(in srgb, var(--pb-muted) 40%, transparent);border-top-color:var(--tb-btn-primary-bg);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                                        Generating business summary...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- TECHNICAL VIEW (hidden by default) -->
                    <div id="report-technical-view" style="padding:18px; display:none; grid-template-columns: 360px 1fr; gap:16px;">
                        <div>
                            <div style="padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:900;color:var(--pb-text);margin-bottom:10px;">Submitted information</div>
                                <div>${inputRows}</div>
                            </div>
                            <div style="margin-top:12px;padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:900;color:var(--pb-text);margin-bottom:8px;">Outcome</div>
                                <div style="color:color-mix(in srgb, var(--pb-text) 86%, var(--pb-muted));font-size:13px;line-height:1.35;">${escapeHtml(headline)}</div>
                            </div>
                        </div>
                        <div>
                            ${_hasNonFixableError ? `
                            <div style="margin-bottom:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.22);border-radius:12px;display:flex;gap:10px;align-items:flex-start;">
                                <span style="font-size:18px;flex-shrink:0;">🔧</span>
                                <div>
                                    <div style="font-weight:800;font-size:13px;color:#fca5a5;margin-bottom:4px;">Technical issue detected</div>
                                    <div style="font-size:12px;color:var(--pb-muted);line-height:1.4;">One or more steps failed due to a technical issue that cannot be fixed through workflow configuration. Please share this Technical view (screenshot or copy the details below) with your IT team for investigation.</div>
                                </div>
                            </div>` : ''}
                            <div style="font-weight:900;color:var(--pb-text);margin-bottom:10px;">Step inputs & outputs</div>
                            ${stepsCards}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Toggle logic
            const businessBtn = modal.querySelector('#report-view-business');
            const technicalBtn = modal.querySelector('#report-view-technical');
            const businessView = modal.querySelector('#report-business-view');
            const technicalView = modal.querySelector('#report-technical-view');
            const activeBtnStyle = 'padding:8px 16px;border:none;cursor:pointer;font-weight:700;background:var(--tb-btn-primary-bg);color:var(--tb-btn-primary-text);transition:all .2s;';
            const inactiveBtnStyle = 'padding:8px 16px;border:none;cursor:pointer;font-weight:600;background:transparent;color:var(--pb-muted);transition:all .2s;';

            if (businessBtn) businessBtn.addEventListener('click', () => {
                businessBtn.style.cssText = activeBtnStyle;
                technicalBtn.style.cssText = inactiveBtnStyle;
                businessView.style.display = 'grid';
                technicalView.style.display = 'none';
            });
            if (technicalBtn) technicalBtn.addEventListener('click', () => {
                technicalBtn.style.cssText = activeBtnStyle;
                businessBtn.style.cssText = inactiveBtnStyle;
                technicalView.style.display = 'grid';
                businessView.style.display = 'none';
            });

            // Fetch business summary from LLM
            if (executionId) {
                _fetchBusinessSummary(executionId, modal);
            } else {
                // No execution ID — show a fallback in the business view
                const body = modal.querySelector('#business-summary-body');
                if (body) body.innerHTML = `<div style="color:var(--pb-muted);font-size:13px;">${escapeHtml(headline)}</div>`;
            }

            // Wire up authenticated downloads for uploaded file buttons
            try {
                modal.querySelectorAll('button[data-upload-file-id]').forEach(btn => {
                    btn.addEventListener('click', async (ev) => {
                        try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
                        const id = btn.getAttribute('data-upload-file-id') || '';
                        const name = btn.getAttribute('data-upload-file-name') || '';
                        await downloadProcessUploadFile(id, name);
                    });
                });
            } catch (_) {}
        }

        /**
         * Fetch business-friendly summary from LLM and render it in the report modal.
         */
        async function _fetchBusinessSummary(executionId, modal) {
            const body = modal.querySelector('#business-summary-body');
            if (!body) return;
            try {
                const token = getAuthToken();
                const res = await fetch(`/process/executions/${encodeURIComponent(executionId)}/business-summary`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? ('Bearer ' + token) : ''
                    }
                });
                const data = await res.json();
                if (data && data.success && data.summary) {
                    body.innerHTML = _formatBusinessSummary(data.summary);
                } else {
                    // LLM unavailable or error — show fallback
                    const errMsg = (data && data.error) ? data.error : 'Could not generate business summary.';
                    body.innerHTML = `<div style="color:var(--pb-muted);font-size:13px;">${escapeHtml(errMsg)}<br><span style="font-size:12px;">Switch to the <b>Technical</b> view for full details.</span></div>`;
                }
            } catch (e) {
                body.innerHTML = `<div style="color:var(--pb-muted);font-size:13px;">Could not load summary. Switch to the <b>Technical</b> view for full details.</div>`;
            }
        }

        /**
         * Format the LLM's plain-text business summary into styled HTML.
         * Handles OUTCOME:, SUMMARY:, KEY DETAILS: sections and bullet points.
         */
        function _formatBusinessSummary(text) {
            if (!text) return '';
            let html = '';
            const lines = String(text).split('\n');
            let currentSection = '';
            const sectionIcons = { 'OUTCOME': '🎯', 'SUMMARY': '📋', 'KEY DETAILS': '📊' };
            const sectionColors = { 'OUTCOME': 'var(--tb-btn-primary-bg)', 'SUMMARY': 'var(--pb-text)', 'KEY DETAILS': 'var(--pb-text)' };

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Section headers
                const sectionMatch = trimmed.match(/^(OUTCOME|SUMMARY|KEY DETAILS)\s*:\s*(.*)/i);
                if (sectionMatch) {
                    const sectionKey = sectionMatch[1].toUpperCase();
                    const afterColon = (sectionMatch[2] || '').trim();
                    currentSection = sectionKey;
                    const icon = sectionIcons[sectionKey] || '';
                    if (sectionKey === 'OUTCOME' && afterColon) {
                        html += `<div style="padding:12px 16px;background:color-mix(in srgb, var(--tb-btn-primary-bg) 12%, transparent);border:1px solid color-mix(in srgb, var(--tb-btn-primary-bg) 30%, transparent);border-radius:12px;margin-bottom:16px;font-size:15px;font-weight:700;color:var(--pb-text);line-height:1.4;">${icon} ${escapeHtml(afterColon)}</div>`;
                    } else {
                        html += `<div style="font-weight:800;font-size:13px;color:var(--pb-muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:14px;margin-bottom:8px;">${icon} ${escapeHtml(sectionKey)}</div>`;
                        if (afterColon) {
                            html += `<div style="font-size:14px;color:var(--pb-text);line-height:1.5;margin-bottom:4px;">${escapeHtml(afterColon)}</div>`;
                        }
                    }
                    continue;
                }

                // Bullet points
                const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)/);
                if (bulletMatch) {
                    html += `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:14px;line-height:1.5;color:color-mix(in srgb, var(--pb-text) 92%, var(--pb-muted));">
                        <span style="color:var(--tb-btn-primary-bg);font-weight:700;flex-shrink:0;">●</span>
                        <span>${escapeHtml(bulletMatch[1])}</span>
                    </div>`;
                    continue;
                }

                // Regular text
                html += `<div style="font-size:14px;color:color-mix(in srgb, var(--pb-text) 92%, var(--pb-muted));line-height:1.5;margin-bottom:4px;">${escapeHtml(trimmed)}</div>`;
            }
            return html;
        }

        async function runWorkflowTestWithEngine(triggerInput, ctx) {
            const token = getAuthToken();
            if (!token) {
                alert('❌ Please sign in first to run the real engine test.');
                return;
            }

            // Save current workflow definition so the engine runs the latest canvas version
            try {
                await _ensureWorkflowSavedSilently();
            } catch (e) {
                alert('❌ ' + (e?.message || 'Could not save workflow for test.'));
                return;
            }

            // ── PRE-FLIGHT CHECK ──────────────────────────────────────
            // Analyze the process AFTER saving (so agent_id exists) to catch
            // identity/profile issues that would cause runtime failures.
            try {
                const preflight = await _runPreflightCheck();
                if (preflight && preflight.issues && preflight.issues.length > 0) {
                    const decision = await _showPreflightModal(preflight);
                    if (decision !== 'continue') return;
                }
            } catch (_pfErr) {
                // Preflight is advisory — never block the test if the check itself fails
                console.warn('[Preflight] Check failed, proceeding:', _pfErr);
            }
            // ── END PRE-FLIGHT ────────────────────────────────────────

            const runningModal = _openEngineRunModal();
            const setBadge = (status) => {
                const b = runningModal.querySelector('#engine-test-status-badge');
                if (b) b.innerHTML = _engineStatusBadge(status);
            };
            const setText = (txt) => {
                const t = runningModal.querySelector('#engine-test-status-text');
                if (t) t.textContent = txt || '';
            };

            let executionId = null;
            try {
                setText('Starting workflow…');
                const res = await fetch('/process/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        agent_id: state.agentId,
                        trigger_input: triggerInput || {},
                        trigger_type: 'manual'
                    })
                });
                let data = null;
                try { data = await res.json(); } catch (_) { data = null; }
                if (!res.ok) {
                    const msg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : (res.statusText || 'Failed to start workflow');
                    throw new Error(String(msg || 'Failed to start workflow'));
                }
                executionId = data?.id || data?.execution_id || data?.executionId;
                if (!executionId) throw new Error('No execution id returned.');
            } catch (e) {
                try { runningModal.remove(); } catch (_) {}
                alert('❌ ' + (e?.message || 'Failed to start workflow'));
                return;
            }

            let lastStatus = 'running';
            let finishedExecution = null;
            let approvalHandled = false;
            const approvalBox = runningModal.querySelector('#engine-test-approval');
            const approveBtn = runningModal.querySelector('#engine-test-approve-btn');
            const rejectBtn = runningModal.querySelector('#engine-test-reject-btn');

            const showApproval = (approval) => {
                if (!approvalBox) return;
                const title = runningModal.querySelector('#engine-test-approval-title');
                const desc = runningModal.querySelector('#engine-test-approval-desc');
                approvalBox.style.display = '';
                if (title) title.textContent = approval?.title || approval?.step_name || 'Approval';
                if (desc) desc.textContent = approval?.description || 'This step requires approval to continue.';
            };
            const hideApproval = () => { if (approvalBox) approvalBox.style.display = 'none'; };

            const decide = async (decision) => {
                if (approvalHandled) return;
                approvalHandled = true;
                try {
                    const appr = await _fetchPendingApprovalForExecution(executionId);
                    if (!appr || !appr.id) throw new Error('Approval request not found.');
                    setText(decision === 'approved' ? 'Approved. Continuing…' : 'Rejected. Continuing…');
                    await _decideApproval(appr.id, decision);
                    hideApproval();
                } catch (e) {
                    approvalHandled = false;
                    alert('❌ ' + (e?.message || 'Could not submit approval decision.'));
                }
            };

            if (approveBtn) approveBtn.addEventListener('click', () => decide('approved'));
            if (rejectBtn) rejectBtn.addEventListener('click', () => decide('rejected'));

            // Poll execution until terminal (or waiting for approval)
            const maxMs = 4 * 60 * 1000; // 4 minutes for test runs
            const startedAt = Date.now();
            while (Date.now() - startedAt < maxMs) {
                const ex = await _fetchExecution(executionId);
                if (!ex) {
                    setText('Could not read workflow status. Please try again.');
                    setBadge('failed');
                    break;
                }
                const st = String(ex.status || '').toLowerCase();
                lastStatus = st || lastStatus;
                setBadge(st);

                if (st === 'waiting') {
                    setText('Waiting for approval…');
                    const appr = await _fetchPendingApprovalForExecution(executionId);
                    showApproval(appr);
                    // keep polling; decision will auto-resume via API
                } else if (st === 'completed' || st === 'failed') {
                    finishedExecution = ex;
                    break;
                } else {
                    const cur = ex.current_node_id || ex.current_node || '';
                    const node = cur ? state.nodes.find(n => n.id === cur) : null;
                    setText(node ? `Running: ${node.name || 'Step'}` : 'Running…');
                    hideApproval();
                    approvalHandled = false;
                }

                await _sleep(1200);
            }

            try { runningModal.remove(); } catch (_) {}

            if (!finishedExecution) {
                alert('Test run is taking longer than expected. You can check it from Runs in the portal.');
                return;
            }

            // Fetch step I/O and animate the path, then show report
            let steps = [];
            try { steps = await _fetchStepsIo(executionId); } catch (_) { steps = []; }
            steps.sort((a, b) => (a.order || 0) - (b.order || 0));

            const trace = steps
                .filter(s => s && s.node_id)
                .map((s, idx, arr) => {
                    const nodeId = String(s.node_id);
                    const prevId = (idx > 0 && arr[idx - 1] && arr[idx - 1].node_id) ? String(arr[idx - 1].node_id) : null;
                    let edgeType = null;
                    if (prevId && prevId !== nodeId) {
                        // Infer edge type from canvas connections (helps yes/no branch highlighting)
                        const ci = findConnectionIndex(prevId, nodeId, null);
                        if (ci >= 0) {
                            const c = state.connections[ci];
                            const t = c && c.type ? String(c.type) : '';
                            edgeType = (t && t !== 'default') ? t : null;
                        }
                    }
                    return {
                        nodeId,
                        edgeType,
                        type: (s.node_type || '').toLowerCase(),
                        title: s.step_name || 'Step',
                        status: s.status || null,
                        error: s.error || null
                    };
                });

            window._lastTestTrace = trace;
            try { await playTestPlayback(trace); } catch (_) {}

            _showEngineTestReport(finishedExecution, triggerInput || {}, (ctx && ctx.fieldDefs) ? ctx.fieldDefs : [], steps);
        }

        function _resolveTemplatePath(values, path) {
            if (!values) return '';
            const raw = String(path || '').trim();
            if (!raw) return '';
            try {
                if (Object.prototype.hasOwnProperty.call(values, raw)) return values[raw];
            } catch (_) { /* ignore */ }
            const norm = raw.replace(/\[(\d+)\]/g, '.$1');
            const parts = norm.split('.').filter(Boolean);
            let cur = values;
            for (const part of parts) {
                if (cur && typeof cur === 'object') {
                    if (Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
                    else return '';
                } else {
                    return '';
                }
            }
            return cur;
        }

        function interpolateTemplate(template, values) {
            let t = String(template || '');
            t = t.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
                const k = String(key || '').trim();
                const v = _resolveTemplatePath(values, k);
                if (v == null) return '';
                if (typeof v === 'object') {
                    try { return JSON.stringify(v); } catch (_) { return String(v); }
                }
                return String(v);
            });
            return t;
        }

        /**
         * Populate tplValues with a mock/placeholder object for an AI or extraction node's output_variable.
         * Scans all nodes to discover what nested fields are referenced (e.g. parsedData.totalAmount in conditions/notifications)
         * and builds a placeholder object like { totalAmount: "(simulated)", currency: "(simulated)" }.
         * This ensures downstream notification templates show meaningful placeholders instead of empty strings.
         */
        function _populateSimulatedOutputVariable(outVar, tplValues, allNodes) {
            if (!outVar || tplValues[outVar] != null) return; // already populated (e.g. from a previous run)
            const nestedFields = new Set();
            const varPrefix = outVar + '.';
            const tplRegex = /\{\{\s*([^}]+)\s*\}\}/g;
            (allNodes || []).forEach(n => {
                // Check condition fields
                const cfg = n.config || {};
                const condField = String(cfg.field || '').trim();
                if (condField.startsWith(varPrefix)) nestedFields.add(condField.slice(varPrefix.length));
                // Check notification message/template for {{outVar.xxx}} references
                const msgSources = [cfg.message, cfg.template, cfg.title].filter(Boolean);
                msgSources.forEach(src => {
                    let m;
                    while ((m = tplRegex.exec(String(src))) !== null) {
                        const k = String(m[1]).trim();
                        if (k.startsWith(varPrefix)) nestedFields.add(k.slice(varPrefix.length));
                    }
                });
            });
            if (nestedFields.size > 0) {
                // Build a mock object with placeholder values for each referenced field
                const mock = {};
                nestedFields.forEach(f => { mock[f] = '(simulated)'; });
                tplValues[outVar] = mock;
            } else {
                // No dotted references found — set as a simple placeholder string
                tplValues[outVar] = '(simulated)';
            }
        }

        function _splitRecipientList(value) {
            if (Array.isArray(value)) {
                return value.map(v => String(v || '').trim()).filter(Boolean);
            }
            const s = String(value || '').trim();
            if (!s) return [];
            return s.split(/[\s,;]+/g).map(x => x.trim()).filter(Boolean);
        }

        async function sendTestNotification(payload) {
            const token = getAuthToken();
            if (!token) return { ok: false, error: 'Please sign in first.' };
            try {
                const res = await fetch('/process/test/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify(payload || {})
                });
                let data = null;
                try { data = await res.json(); } catch (_) { data = null; }
                if (!res.ok) {
                    const msg = (data && (data.detail || data.message || data.error)) ? (data.detail || data.message || data.error) : (res.statusText || 'Failed to send notification');
                    return { ok: false, error: String(msg || 'Failed to send notification') };
                }
                return { ok: true, data };
            } catch (e) {
                return { ok: false, error: String(e?.message || e || 'Failed to send notification') };
            }
        }

        function clearPlaybackHighlights() {
            // Nodes
            state.nodes.forEach(n => {
                const el = document.getElementById(n.id);
                if (el) {
                    el.classList.remove('play-active');
                    el.classList.remove('play-waiting');
                    el.classList.remove('play-failed');
                }
            });
            // Edges
            state.connections.forEach(c => {
                delete c._playActive;
                delete c._playCurrent;
            });
            renderConnections();
        }

        function setNodePlayActive(nodeId, statusKey) {
            const st = String(statusKey || '').toLowerCase();
            const isFailed = st === 'failed' || st === 'error' || st === 'timed_out' || st === 'cancelled' || st === 'rejected';
            const isWaiting = st === 'waiting' || st === 'pending' || st === 'paused' || st === 'stopped';
            state.nodes.forEach(n => {
                const el = document.getElementById(n.id);
                if (el) {
                    const active = n.id === nodeId;
                    el.classList.toggle('play-active', active);
                    el.classList.toggle('play-failed', active && isFailed);
                    el.classList.toggle('play-waiting', active && !isFailed && isWaiting);
                }
            });
        }

        function findConnectionIndex(fromId, toId, edgeType) {
            const f = String(fromId || '');
            const t = String(toId || '');
            if (!f || !t) return -1;
            const et = edgeType == null ? null : String(edgeType);
            let idx = state.connections.findIndex(c => c && c.from === f && c.to === t && (!et || c.type === et));
            if (idx >= 0) return idx;
            idx = state.connections.findIndex(c => c && c.from === f && c.to === t);
            return idx;
        }

        function setEdgePlayActive(fromId, toId, edgeType) {
            // Only one "flowing" edge at a time for clarity
            state.connections.forEach(c => { if (c) delete c._playCurrent; });

            const idx = findConnectionIndex(fromId, toId, edgeType);
            if (idx >= 0) {
                const conn = state.connections[idx];
                conn._playActive = true;   // visited path
                conn._playCurrent = true;  // animated flow
            }
            renderConnections();
            return idx;
        }

        function getTestIcon(type) {
            const t = String(type || '').toLowerCase();
            if (t === 'trigger' || t === 'form') return '▶';
            if (t === 'condition') return '◆';
            if (t === 'approval') return '✔';
            if (t === 'notification') return '✉';
            if (t === 'delay') return '⏳';
            if (t === 'tool') return '🔧';
            if (t === 'ai') return '✨';
            if (t === 'end') return '🏁';
            return '•';
        }

        function prettyOperator(op) {
            const o = String(op || '').toLowerCase();
            const map = {
                equals: 'equals',
                not_equals: 'does not equal',
                greater_than: 'is greater than',
                less_than: 'is less than',
                contains: 'contains',
                is_empty: 'is empty'
            };
            return map[o] || o || 'equals';
        }

        async function getUserLookup() {
            if (window._pbUserLookup) return window._pbUserLookup;
            const token = getAuthToken();
            if (!token) return {};
            try {
                const res = await fetch('/api/security/users', { headers: { 'Authorization': 'Bearer ' + token } });
                if (!res.ok) return {};
                const data = await res.json();
                const users = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
                const map = {};
                users.forEach(u => {
                    if (!u) return;
                    const id = u.id || u.user_id;
                    if (!id) return;
                    map[id] = u.name || u.full_name || u.email || u.username || String(id);
                });
                window._pbUserLookup = map;
                return map;
            } catch (_) {
                return {};
            }
        }

        async function _moveCursorAlongConnectionIndex(connIdx, durationMs = 560) {
            const idx = Number(connIdx);
            if (!Number.isFinite(idx) || idx < 0) return;
            const pathEl = document.querySelector(`#connections-svg path.connection-path[data-conn-index="${idx}"]`);
            if (!pathEl || typeof pathEl.getTotalLength !== 'function' || typeof pathEl.getPointAtLength !== 'function') return;
            let len = 0;
            try { len = pathEl.getTotalLength(); } catch (_) { len = 0; }
            if (!Number.isFinite(len) || len <= 0) return;

            const steps = Math.max(14, Math.min(52, Math.round(len / 16)));
            const total = Math.max(160, Number(durationMs) || 560);
            const stepDelay = Math.max(10, Math.floor(total / steps));

            for (let i = 0; i <= steps; i++) {
                const p = pathEl.getPointAtLength((i / steps) * len);
                if (!p) continue;
                _moveCursorToCanvasPoint({ x: p.x, y: p.y }, Math.min(140, stepDelay + 30));
                await _sleep(stepDelay);
            }
        }

        function _playbackStatusKey(step) {
            if (!step || typeof step !== 'object') return '';
            const raw = (
                step.status_key ??
                step.statusKey ??
                step.step_status ??
                step.stepStatus ??
                step.status ??
                ''
            );
            if (!raw) return '';
            if (typeof raw === 'string') return raw.toLowerCase();
            if (typeof raw === 'object') {
                const key = raw.key || raw.status || raw.value;
                if (key) return String(key).toLowerCase();
                const color = raw.color ? String(raw.color).toLowerCase() : '';
                if (color) {
                    if (color === 'green') return 'completed';
                    if (color === 'red') return 'failed';
                    if (color === 'yellow') return 'waiting';
                    if (color === 'orange') return 'paused';
                    if (color === 'blue') return 'running';
                    if (color === 'gray' || color === 'grey') return 'pending';
                }
                const label = raw.label ? String(raw.label).toLowerCase() : '';
                if (label) {
                    if (label.includes('error') || label.includes('fail')) return 'failed';
                    if (label.includes('waiting')) return 'waiting';
                    if (label.includes('paused')) return 'paused';
                    if (label.includes('completed')) return 'completed';
                    if (label.includes('running')) return 'running';
                }
            }
            try { return String(raw).toLowerCase(); } catch (_) { return ''; }
        }

        function _isTerminalPlaybackStatus(statusKey) {
            const s = String(statusKey || '').toLowerCase();
            if (!s) return false;
            if (s === 'failed' || s === 'error' || s === 'timed_out' || s === 'cancelled' || s === 'rejected') return true;
            if (s === 'waiting' || s === 'pending' || s === 'paused' || s === 'stopped') return true;
            // Fuzzy
            if (s.includes('fail') || s.includes('error') || s.includes('waiting') || s.includes('paused')) return true;
            return false;
        }

        async function playTestPlayback(trace) {
            if (!Array.isArray(trace) || trace.length === 0) return;
            clearPlaybackHighlights();
            try { _resetViewForBuild(); } catch (_) {}
            try { _showBuildCursor(); } catch (_) {}
            for (let i = 0; i < trace.length; i++) {
                const step = trace[i];
                if (!step || !step.nodeId) continue;
                const nodeId = step.nodeId;
                const node = state.nodes.find(n => n.id === nodeId);
                if (!node) continue;
                const statusKey = _playbackStatusKey(step);

                if (i === 0) {
                    // First node: land on shape
                    setNodePlayActive(nodeId, statusKey);
                    try {
                        _moveCursorToCanvasPoint(_nodeCanvasCenter(node));
                        await _sleep(220);
                        _cursorClick();
                    } catch (_) {}
                    await _sleep(520);
                    if (step.terminal === true || _isTerminalPlaybackStatus(statusKey)) break;
                    continue;
                }

                // Move along the connection path (more cinematic than jumping)
                const prev = trace[i - 1] || {};
                const prevId = prev.nodeId;
                if (prevId && prevId !== nodeId) {
                    const connIdx = setEdgePlayActive(prevId, nodeId, step.edgeType);
                    try { await _moveCursorAlongConnectionIndex(connIdx, 560); } catch (_) {}
                }

                // Stop on the shape itself
                setNodePlayActive(nodeId, statusKey);
                try {
                    _moveCursorToCanvasPoint(_nodeCanvasCenter(node), 180);
                    await _sleep(180);
                    _cursorClick();
                } catch (_) {}
                await _sleep(520);
                if (step.terminal === true || _isTerminalPlaybackStatus(statusKey)) break;
            }

            // Keep visited edges highlighted, but stop the moving dash at the end
            state.connections.forEach(c => { if (c) delete c._playCurrent; });
            renderConnections();

            await _sleep(320);
            try { _hideBuildCursor(); } catch (_) {}
        }

        // Continue playback from a specific index without clearing existing highlights.
        // Useful for approval pauses (animate up to approval, then resume after user approves).
        async function playTestPlaybackIncremental(trace, startIndex) {
            if (!Array.isArray(trace) || trace.length === 0) return;
            const start = Math.max(0, Math.min(trace.length - 1, Number(startIndex) || 0));
            if (start <= 0) {
                return await playTestPlayback(trace);
            }
            try { _showBuildCursor(); } catch (_) {}
            for (let i = start; i < trace.length; i++) {
                const step = trace[i];
                if (!step || !step.nodeId) continue;
                const nodeId = step.nodeId;
                const node = state.nodes.find(n => n.id === nodeId);
                if (!node) continue;
                const statusKey = _playbackStatusKey(step);

                const prev = trace[i - 1] || {};
                const prevId = prev.nodeId;
                if (prevId && prevId !== nodeId) {
                    const connIdx = setEdgePlayActive(prevId, nodeId, step.edgeType);
                    try { await _moveCursorAlongConnectionIndex(connIdx, 560); } catch (_) {}
                }

                setNodePlayActive(nodeId, statusKey);
                try {
                    _moveCursorToCanvasPoint(_nodeCanvasCenter(node), 180);
                    await _sleep(180);
                    _cursorClick();
                } catch (_) {}
                await _sleep(520);
                if (step.terminal === true || _isTerminalPlaybackStatus(statusKey)) break;
            }

            state.connections.forEach(c => { if (c) delete c._playCurrent; });
            renderConnections();

            await _sleep(220);
            try { _hideBuildCursor(); } catch (_) {}
        }

        async function simulateWorkflow(inputData, ctx) {
            // Build label lookup for nicer explanations
            const fieldDefs = (ctx && ctx.fieldDefs) ? ctx.fieldDefs : [];
            const fieldLabelByKey = {};
            fieldDefs.forEach(f => { if (f && f.name) fieldLabelByKey[f.name] = f.label || humanizeFieldLabel(f.name) || f.name; });

            const sendRealEmails = !!(ctx && ctx.sendRealEmails);
            // Template values support both direct keys and nested references (e.g. {{currentUser.email}}, {{trigger_input.requesterEmail}})
            const tplValues = Object.assign({}, inputData || {});
            tplValues.trigger_input = inputData || {};
            tplValues.triggerInput = inputData || {};
            if (ctx && ctx.currentUser) tplValues.currentUser = ctx.currentUser;
            
            const startNode = getStartNodeForTest();
            if (!startNode) {
                alert('No start node found');
                return;
            }
            
            const trace = [];
            const nodeById = {};
            state.nodes.forEach(n => { nodeById[n.id] = n; });
            
            const outgoing = {};
            state.connections.forEach(c => {
                if (!outgoing[c.from]) outgoing[c.from] = [];
                outgoing[c.from].push(c);
            });
            
            const maxSteps = 30;
            let steps = 0;
            let current = startNode;
            let outcome = { status: 'completed', headline: 'Workflow completed successfully.' };
            let lastPlaybackIndex = 0;

            const playNewTrace = async () => {
                // Play only what hasn't been animated yet (supports approval pauses)
                if (trace.length <= lastPlaybackIndex) return;
                if (lastPlaybackIndex <= 0) {
                    await playTestPlayback(trace);
                } else {
                    await playTestPlaybackIncremental(trace, lastPlaybackIndex);
                }
                lastPlaybackIndex = trace.length;
            };

            const promptApprovalDecision = (info) => {
                const title = (info && info.title) ? String(info.title) : 'Approval';
                const who = (info && info.who) ? String(info.who) : '';
                const message = (info && info.message) ? String(info.message) : 'This step requires approval to continue.';
                return new Promise((resolve) => {
                    let done = false;
                    const modal = document.createElement('div');
                    modal.id = 'test-approval-modal';
                    modal.style.cssText = `
                        position: fixed; inset: 0;
                        background: rgba(0,0,0,0.78); display: flex; align-items: center;
                        justify-content: center; z-index: 10001; padding: 18px;
                    `;
                    const finish = (v) => {
                        if (done) return;
                        done = true;
                        try { modal.remove(); } catch (_) {}
                        resolve(v);
                    };
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) finish('pending');
                    });
                    modal.innerHTML = `
                        <div style="background:var(--pb-panel); color:var(--pb-text); border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); border-radius:16px; width:720px; max-width:100%; box-shadow: var(--shadow-md); overflow:hidden;">
                            <div style="padding:16px 18px; border-bottom:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
                                <div>
                                    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                                        <div style="width:36px; height:36px; border-radius:12px; background: color-mix(in srgb, var(--warning) 18%, transparent); border:1px solid color-mix(in srgb, var(--warning) 45%, transparent); display:flex; align-items:center; justify-content:center; font-size:18px;">⏳</div>
                                        <div>
                                            <div style="font-weight:900; font-size:16px;">Waiting for approval</div>
                                            <div style="margin-top:2px; font-size:13px; color: var(--pb-muted);">${escapeHtml(title)}</div>
                                        </div>
                                    </div>
                                </div>
                                <button id="test-approval-close" type="button" class="toolbar-btn btn-secondary" style="padding:10px 12px;border-radius:12px;">Close</button>
                            </div>
                            <div style="padding:18px;">
                                <div style="font-size:13px; color: color-mix(in srgb, var(--pb-text) 88%, var(--pb-muted)); line-height:1.45;">${escapeHtml(message)}</div>
                                ${who ? `<div style="margin-top:10px; font-size:12px; color: var(--pb-muted);">Approver(s): <span style="color:var(--pb-text); font-weight:700;">${escapeHtml(who)}</span></div>` : ''}
                                <div style="margin-top:16px; display:flex; gap:10px;">
                                    <button id="test-approval-approve" type="button" class="toolbar-btn btn-primary" style="flex:1; padding:12px 12px; border-radius:12px;">Approve & continue</button>
                                    <button id="test-approval-reject" type="button" class="toolbar-btn btn-secondary" style="flex:1; padding:12px 12px; border-radius:12px; border:1px solid color-mix(in srgb, var(--danger) 45%, transparent); color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent);">Reject</button>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);
                    const closeBtn = modal.querySelector('#test-approval-close');
                    const approveBtn = modal.querySelector('#test-approval-approve');
                    const rejectBtn = modal.querySelector('#test-approval-reject');
                    if (closeBtn) closeBtn.addEventListener('click', () => finish('pending'));
                    if (approveBtn) approveBtn.addEventListener('click', () => finish('approved'));
                    if (rejectBtn) rejectBtn.addEventListener('click', () => finish('rejected'));
                });
            };
            
            // Start
            trace.push({
                nodeId: current.id,
                edgeType: null,
                type: current.type,
                title: current.name || 'Start',
                message: 'Started with the provided information.'
            });
            
            while (current && steps < maxSteps) {
                steps++;
                if (current.type === 'end') break;
                const conns = outgoing[current.id] || [];
                if (!conns.length) break;
                
                // Decide next
                let nextConn = conns[0];
                
                if (current.type === 'condition') {
                    const cfg = current.config || {};
                    const fieldKey = String(cfg.field || '').trim();
                    const operator = String(cfg.operator || 'equals').trim();
                    const compareValue = cfg.value;

                    // Check if the field references a nested/dotted variable from an upstream AI/extraction step
                    let fieldResolvable = !!(fieldKey && fieldKey in inputData);
                    if (!fieldResolvable && fieldKey && fieldKey.includes('.')) {
                        const baseVar = fieldKey.split('.')[0];
                        fieldResolvable = !!(baseVar in tplValues);
                    }

                    const inputValue = fieldResolvable ? inputData[fieldKey] : undefined;
                    
                    let result = null; // null = unknown (unresolvable in simulation)
                    if (fieldResolvable || !fieldKey) {
                        const val = fieldResolvable ? inputValue : '';
                        switch (operator) {
                            case 'equals': result = val == compareValue; break;
                            case 'not_equals': result = val != compareValue; break;
                            case 'greater_than': result = parseFloat(val) > parseFloat(compareValue); break;
                            case 'less_than': result = parseFloat(val) < parseFloat(compareValue); break;
                            case 'contains': result = String(val || '').includes(String(compareValue || '')); break;
                            case 'is_empty': result = !val || String(val).trim() === ''; break;
                            default: result = val == compareValue;
                        }
                    }

                    const label = fieldLabelByKey[fieldKey] || humanizeFieldLabel(fieldKey) || fieldKey || 'Field';

                    if (result === null) {
                        // Cannot evaluate — depends on upstream AI/extraction step output
                        nextConn = conns[0]; // take first connection as default path
                        trace.push({
                            nodeId: current.id,
                            edgeType: null,
                            type: current.type,
                            title: current.name || 'Decision',
                            message: `⚠️ Cannot evaluate in simulation — '${fieldKey}' requires the real engine to populate from upstream AI/extraction steps. Use "Run using real engine" mode for accurate testing. Taking default path (uncertain).`,
                            status_key: 'warning'
                        });
                    } else {
                        nextConn = conns.find(c => c.type === (result ? 'yes' : 'no')) || conns[0];
                        trace.push({
                            nodeId: current.id,
                            edgeType: null,
                            type: current.type,
                            title: current.name || 'Decision',
                            message: `${label} ${prettyOperator(operator)} ${compareValue != null && String(compareValue) !== '' ? `"${String(compareValue)}"` : ''} → ${result ? 'Yes' : 'No'}`
                        });
                    }
                } else if (current.type !== 'trigger' && current.type !== 'form') {
                    // Regular step summary
                    const cfg = current.config || {};
                    let msg = 'Step executed.';
                    let pushedCurrent = false;
                    if (current.type === 'notification') {
                        const channel = String(cfg.channel || 'email').trim() || 'email';
                        const subject = String(cfg.title || current.name || 'Notification').trim() || 'Notification';
                        let recipientTpl = cfg.recipient || (Array.isArray(cfg.recipients) ? cfg.recipients.join(', ') : '');
                        // Resolve engine shortcuts for simulation display
                        if (recipientTpl === 'requester' || recipientTpl === 'submitter' || recipientTpl === 'initiator') {
                            recipientTpl = (ctx && ctx.currentUser && ctx.currentUser.email) ? ctx.currentUser.email : 'requester (auto-resolved at runtime)';
                        } else if (recipientTpl === 'manager' || recipientTpl === 'supervisor') {
                            recipientTpl = 'manager (auto-resolved at runtime)';
                        }
                        const bodyTpl = cfg.message || cfg.template || '';
                        const recipientResolved = interpolateTemplate(recipientTpl || '', tplValues).trim();
                        const bodyResolved = interpolateTemplate(bodyTpl || '', tplValues);
                        const recipients = _splitRecipientList(recipientResolved);
                        const shortBody = bodyResolved ? (bodyResolved.length > 80 ? (bodyResolved.slice(0, 80) + '…') : bodyResolved) : '';

                        if (channel.toLowerCase() === 'email') {
                            if (!recipientResolved) {
                                msg = 'Email notification skipped (no recipient configured).';
                            } else if (!bodyResolved || !String(bodyResolved).trim()) {
                                msg = `Email notification skipped (no message configured) to ${recipientResolved}.`;
                            } else if (sendRealEmails) {
                                const sendRes = await sendTestNotification({
                                    channel: 'email',
                                    recipients: (recipients.length ? recipients : [recipientResolved]),
                                    title: subject,
                                    message: bodyResolved
                                });
                                if (sendRes.ok && sendRes.data && sendRes.data.success) {
                                    const sentCount = Number(sendRes.data.sent_count || sendRes.data.sentCount || 0);
                                    msg = sentCount > 1
                                        ? `EMAIL notification sent to ${sentCount} recipients.`
                                        : `EMAIL notification sent to ${recipientResolved}.`;
                                } else if (sendRes.ok && sendRes.data) {
                                    let err = sendRes.data.error || sendRes.data.note || '';
                                    if (err && typeof err === 'object') try { err = JSON.stringify(err); } catch (_) { err = '(see console)'; }
                                    msg = `EMAIL notification could not be sent to ${recipientResolved}.` + (err ? ` Reason: ${String(err)}` : '');
                                } else {
                                    let sErr = sendRes.error || '';
                                    if (sErr && typeof sErr === 'object') try { sErr = JSON.stringify(sErr); } catch (_) { sErr = '(see console)'; }
                                    msg = `EMAIL notification could not be sent to ${recipientResolved}.` + (sErr ? ` Reason: ${String(sErr)}` : '');
                                }
                                if (shortBody) msg += ` Message: “${shortBody}”`;
                            } else {
                                msg = `EMAIL notification (simulated) to ${recipientResolved || 'recipient'}.`;
                                if (shortBody) msg += ` Message: “${shortBody}”`;
                            }
                        } else {
                            // Non-email channels are simulated (no provider configured in builder test)
                            msg = `${channel.toUpperCase()} notification (simulated).`;
                            if (recipientResolved) msg += ` Recipient: ${recipientResolved}.`;
                            if (shortBody) msg += ` Message: “${shortBody}”`;
                        }
                    } else if (current.type === 'delay') {
                        msg = `Waited ${cfg.duration || 0} ${cfg.unit || 'minutes'}.`;
                    } else if (current.type === 'ai') {
                        const outVar = current.output_variable || '';
                        msg = `AI step will generate an output based on your inputs.`;
                        if (outVar) msg += ` Output stored in {{${outVar}}}.`;
                        msg += ` ⚠️ Simulation cannot run AI — use "Run using real engine" for real results.`;
                        // Populate tplValues with placeholder so downstream notifications can interpolate
                        if (outVar) _populateSimulatedOutputVariable(outVar, tplValues, state.nodes);
                    } else if (current.type === 'action') {
                        const at = (cfg.actionType || '').toLowerCase();
                        if (at.includes('extract')) {
                            const outVar = current.output_variable || '';
                            msg = `Document extraction step (simulated).`;
                            if (outVar) msg += ` Output stored in {{${outVar}}}.`;
                            msg += ` ⚠️ Simulation cannot extract real data — use "Run using real engine" for real results.`;
                            // Populate tplValues with placeholder so downstream notifications can interpolate
                            if (outVar) _populateSimulatedOutputVariable(outVar, tplValues, state.nodes);
                        } else {
                            msg = `Action step executed (simulated).`;
                        }
                    } else if (current.type === 'tool') {
                        const tool = (state.tools || []).find(t => t.id === cfg.toolId);
                        msg = `Ran tool: ${tool ? tool.name : 'Tool'}.`;
                    } else if (current.type === 'approval') {
                        // Approvals pause until the tester decides (Approve/Reject).
                        const ac = cfg || {};
                        const src = ac.assignee_source || (ac.approvers && ac.approvers.length ? 'platform_user' : '');
                        const ids = ac.assignee_ids || ac.approvers || [];
                        let who = '';
                        if (src === 'platform_user') {
                            const lookup = await getUserLookup();
                            const names = ids.map(id => lookup[id] || id).filter(Boolean);
                            who = names.length ? names.join(', ') : (ids.length ? ids.join(', ') : '');
                        } else if (src) {
                            who = ids.length ? `${ids.length} selected` : '';
                        }
                        msg = `Waiting for approval${who ? ` (${who})` : ''}.`;
                        const approvalTraceIndex = trace.length;
                        trace.push({
                            nodeId: current.id,
                            edgeType: null,
                            type: current.type,
                            title: current.name || 'Approval',
                            message: msg,
                            status_key: 'waiting'
                        });
                        pushedCurrent = true;

                        // Show playback up to this approval (so user sees where it stopped),
                        // then ask for decision.
                        try { await playNewTrace(); } catch (_) {}
                        const decision = await promptApprovalDecision({
                            title: current.name || 'Approval',
                            who,
                            message: msg
                        });

                        if (decision === 'approved') {
                            // Update the message for the report (no need to add a new node in the trace)
                            if (trace[approvalTraceIndex]) {
                                trace[approvalTraceIndex].message = `Approved. Continuing the workflow.`;
                                trace[approvalTraceIndex].status_key = 'completed';
                            }
                            // Continue normally (use the default outgoing edge)
                        } else if (decision === 'rejected') {
                            if (trace[approvalTraceIndex]) {
                                trace[approvalTraceIndex].message = `Rejected. The workflow will stop here.`;
                                trace[approvalTraceIndex].status_key = 'failed';
                            }
                            outcome = {
                                status: 'failed',
                                headline: `Rejected at: ${current.name || 'Approval'}.`
                            };
                            break;
                        } else {
                            // User closed the approval dialog: treat as pending (test stops here)
                            if (trace[approvalTraceIndex]) {
                                trace[approvalTraceIndex].status_key = 'waiting';
                            }
                            outcome = {
                                status: 'pending',
                                headline: `Waiting for approval at: ${current.name || 'Approval'}.`,
                                detail: who ? `Approver(s): ${who}` : ''
                            };
                            break;
                        }
                    }
                    if (!pushedCurrent) {
                        trace.push({
                            nodeId: current.id,
                            edgeType: null,
                            type: current.type,
                            title: current.name || 'Step',
                            message: msg
                        });
                    }
                }
                
                const next = nodeById[nextConn.to];
                if (!next) break;
                trace.push({
                    nodeId: next.id,
                    edgeType: nextConn.type || null,
                    type: next.type,
                    title: next.name || 'Step',
                    message: (next.type === 'end') ? 'Reached the end of the workflow.' : ''
                });
                current = next;
                if (current.type === 'end') break;
            }

            // Check if any trace steps had warnings (unresolvable conditions, etc.)
            const hasWarnings = trace.some(t => t.status_key === 'warning' || (t.message && t.message.includes('⚠️')));
            if (hasWarnings && outcome.status === 'completed') {
                outcome.headline = 'Workflow completed (with warnings). Some steps could not be fully evaluated in simulation mode — use "Run using real engine" for accurate results.';
            }

            // Auto-play on the canvas FIRST (so the user can see the path animation),
            // then show the final report modal.
            window._lastTestTrace = trace;
            try { await playNewTrace(); } catch (_) {}
            
            // Build results modal (business-friendly report)
            const modal = document.createElement('div');
            modal.id = 'test-results-modal';
            modal.style.cssText = `
                position: fixed; inset: 0;
                background: rgba(0,0,0,0.78); display: flex; align-items: center; 
                justify-content: center; z-index: 10000; padding: 18px;
            `;
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    try { clearPlaybackHighlights(); } catch (_) {}
                }
            });
            
            const inputRows = Object.keys(inputData || {}).map(k => {
                const label = fieldLabelByKey[k] || humanizeFieldLabel(k) || k;
                const v = inputData[k];
                const text = (v == null || String(v).trim() === '') ? '—' : String(v);
                return `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed color-mix(in srgb, var(--pb-muted) 28%, transparent);">
                    <div style="color:var(--pb-muted);font-size:13px;">${escapeHtml(label)}</div>
                    <div style="color:var(--pb-text);font-size:13px;font-weight:600;max-width:60%;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(text)}</div>
                </div>`;
            }).join('');
            
            const traceCards = trace
                .filter((t, idx) => idx === 0 || t.message) // keep start + meaningful messages
                .map((t, idx) => {
                    const sk = (t.status_key || '').toLowerCase();
                    const isWarning = sk === 'warning' || (t.message && t.message.includes('⚠️'));
                    const isFailed = sk === 'failed';
                    const cardBorder = isWarning ? 'border:1px solid color-mix(in srgb, var(--warning) 55%, transparent);' : (isFailed ? 'border:1px solid color-mix(in srgb, var(--danger) 55%, transparent);' : 'border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);');
                    const cardBg = isWarning ? 'background:color-mix(in srgb, var(--warning) 8%, var(--bg-input));' : (isFailed ? 'background:color-mix(in srgb, var(--danger) 8%, var(--bg-input));' : 'background:var(--bg-input);');
                    return `
                    <div style="display:flex;gap:12px;padding:12px;${cardBg}${cardBorder}border-radius:14px;margin-bottom:10px;">
                        <div style="width:30px;height:30px;border-radius:10px;background:color-mix(in srgb, var(--tb-btn-primary-bg) 18%, transparent);display:flex;align-items:center;justify-content:center;color:var(--tb-btn-primary-text);font-weight:700;">
                            ${isWarning ? '⚠️' : getTestIcon(t.type)}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                <div style="font-weight:700;color:var(--pb-text);">${escapeHtml(t.title || 'Step')}</div>
                                <div style="font-size:12px;color:var(--pb-muted);">${escapeHtml(String(t.type || '').toUpperCase())}</div>
                            </div>
                            <div style="margin-top:6px;font-size:13px;color:color-mix(in srgb, var(--pb-text) 86%, var(--pb-muted));line-height:1.35;">${escapeHtml(t.message || '')}</div>
                        </div>
                    </div>`;
                }).join('');
            
            const statusBadge = outcome.status === 'pending'
                ? `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--warning) 18%, transparent);border:1px solid color-mix(in srgb, var(--warning) 45%, transparent);color:var(--warning);font-weight:700;font-size:12px;">Pending</span>`
                : outcome.status === 'failed'
                    ? `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--danger) 18%, transparent);border:1px solid color-mix(in srgb, var(--danger) 45%, transparent);color:var(--danger);font-weight:700;font-size:12px;">Stopped</span>`
                    : `<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb, var(--success) 18%, transparent);border:1px solid color-mix(in srgb, var(--success) 45%, transparent);color:var(--success);font-weight:700;font-size:12px;">Completed</span>`;
            
            modal.innerHTML = `
                <div style="background:var(--pb-panel); color:var(--pb-text); border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); border-radius:16px; width:980px; max-width:100%; max-height:88vh; overflow:auto; box-shadow: var(--shadow-md);">
                    <div style="padding:18px; border-bottom:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent); display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <h2 style="margin:0; font-size:18px;">Test report</h2>
                                ${statusBadge}
                            </div>
                            <p style="margin:6px 0 0; color:var(--pb-muted); font-size:13px;">${escapeHtml(outcome.headline || '')}${outcome.detail ? ' ' + escapeHtml(outcome.detail) : ''}</p>
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <button type="button" class="toolbar-btn btn-secondary" onclick="document.getElementById('test-results-modal')?.remove(); clearPlaybackHighlights();" style="padding:10px 12px;border-radius:12px;">
                                Close
                            </button>
                        </div>
                    </div>
                    <div style="padding:18px; display:grid;grid-template-columns: 340px 1fr; gap:16px;">
                        <div>
                            <div style="padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:800;color:var(--pb-text);margin-bottom:10px;">Submitted information</div>
                                <div>${inputRows || '<div style="color:var(--pb-muted);font-size:13px;">No inputs.</div>'}</div>
                            </div>
                            <div style="margin-top:12px;padding:14px;background:var(--bg-input);border:1px solid color-mix(in srgb, var(--pb-muted) 22%, transparent);border-radius:16px;">
                                <div style="font-weight:800;color:var(--pb-text);margin-bottom:8px;">Outcome</div>
                                <div style="color:color-mix(in srgb, var(--pb-text) 86%, var(--pb-muted));font-size:13px;line-height:1.35;">
                                    ${escapeHtml(outcome.headline || '')}
                                    ${outcome.detail ? `<div style="margin-top:6px;color:var(--pb-muted);">${escapeHtml(outcome.detail)}</div>` : ''}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style="font-weight:800;color:var(--pb-text);margin-bottom:10px;">What happened (step-by-step)</div>
                            ${traceCards || '<div style="color:var(--pb-muted);">No steps.</div>'}
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        function updateEmptyState() {
            const empty = document.getElementById('empty-state');
            empty.style.display = state.nodes.length === 0 ? 'block' : 'none';
        }
