// Extracted from ui/index_parts/app-features.js
// Chunk: features-tools-wizard.js
// Loaded via defer in ui/index.html; do not reorder.

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
                    await fetch(API+'/api/tools/'+tid+'/scrape',{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},body:JSON.stringify({url,recursive:rec,max_pages:max})});
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
                    await fetch(API+'/api/tools/'+tid+'/scrape',{method:'POST',headers:{'Content-Type':'application/json',...getAuthHeaders()},body:JSON.stringify({url,recursive:rec,max_pages:max})});
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
                const r = await fetch(API + '/api/tools/' + id, { headers: getAuthHeaders() });
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
                const r = await fetch(API + '/api/tools/' + toolId, { headers: getAuthHeaders() });
                const tool = await r.json();
                const newTool = {
                    name: tool.name + ' (Copy)',
                    description: tool.description,
                    type: tool.type,
                    config: tool.config
                };
                const resp = await fetch(API + '/api/tools', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', ...getAuthHeaders()},
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
        const r = await fetch(API + '/api/tools/' + toolId, { headers: getAuthHeaders() });
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
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
        const r = await fetch(API + '/api/tools/' + toolId, { headers: getAuthHeaders() });
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
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
                const r = await fetch(API + '/api/tools/' + toolId + '/data', { headers: getAuthHeaders() });
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
                
                const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...getAuthHeaders()},body:JSON.stringify({type:toolType,name,description:desc,config,api_config})});
                
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
                        await fetch(API+'/api/tools/'+d.tool_id+'/documents',{method:'POST',headers:getAuthHeaders(),body:fd});
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
                            headers:{'Content-Type':'application/json',...getAuthHeaders()},
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
                
                // Filter out empty conversations (created but never had messages)
                chatConversations = (d.conversations || []).filter(c => (c.message_count || 0) > 0);
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
        
