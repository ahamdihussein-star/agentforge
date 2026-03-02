/**
 * Shared review rendering utilities for process approvals.
 * Loaded on pages that need to display extraction reviews and approval details
 * (process-builder.html, index.html via app-core.js, chat.html).
 *
 * Exposes to window:
 *   - afRenderReviewData(rd, opts)
 *   - afRenderExtractionReview(details, opts)
 *   - afDownloadProcessUploadFile(fileId, filename)
 */
(function () {
    'use strict';

    if (window.__afReviewRenderersLoaded) return;
    window.__afReviewRenderersLoaded = true;

    const _esc = (function () {
        if (typeof window.escHtml === 'function') return window.escHtml;
        if (typeof window.escapeHtml === 'function') return window.escapeHtml;
        return function (text) {
            if (text === null || text === undefined) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        };
    })();

    function _looksLikeUuid(s) {
        try {
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '').trim());
        } catch (_) { return false; }
    }

    function _keyNorm(k) {
        try { return String(k || '').trim().toLowerCase().replace(/\s+/g, '_'); } catch (_) { return ''; }
    }

    function _isInternalKey(k) {
        const nk = _keyNorm(k);
        if (!nk || nk.startsWith('_')) return true;
        const skip = ['user_context', 'org_id', 'orgid', 'org', 'current_user', 'currentuser',
            'submitted_information', 'submittedinformation', 'download_url', 'path', 'content_type', 'contenttype'];
        return skip.includes(nk);
    }

    function _humanize(k) {
        if (typeof window.humanizeFieldLabel === 'function') {
            try { const r = window.humanizeFieldLabel(k); if (r) return String(r); } catch (_) {}
        }
        return String(k || '').trim()
            .replace(/[_\-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^\w/, c => c.toUpperCase());
    }

    function _tryParseJson(v) {
        try {
            if (typeof v !== 'string') return v;
            const s = v.trim();
            if (!s || s.length > 20000) return v;
            if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) return JSON.parse(s);
            return v;
        } catch (_) { return v; }
    }

    function _isUploadedFile(v) {
        try {
            if (!v || typeof v !== 'object') return false;
            const kind = String(v.kind || '').toLowerCase();
            if (kind === 'uploadedfile' || kind === 'uploaded_file') return true;
            return !!(v.name && (v.id || v.file_type || v.content_type || v.download_url || v.path));
        } catch (_) { return false; }
    }

    function _renderFileLine(file) {
        try {
            const name = String(file?.name || 'Uploaded file');
            const typ = file?.file_type ? String(file.file_type).toUpperCase() : '';
            const size = (typeof file?.size === 'number') ? `${Math.round(file.size / 1024)} KB` : '';
            const meta = [typ, size].filter(Boolean).join(' \u00b7 ');
            const id = file?.id ? String(file.id) : '';
            const btn = id ? `<button type="button" onclick="afDownloadProcessUploadFile('${_esc(id)}','${_esc(name)}')" style="margin-left:10px;padding:6px 10px;border-radius:10px;border:1px solid color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 55%, transparent);background:color-mix(in srgb, var(--bg-card,var(--pb-card-bg,#1a1a2e)) 40%, transparent);color:var(--text-primary,var(--pb-text,#eee));font-size:12px;font-weight:700;cursor:pointer;">Download</button>` : '';
            return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 22%, transparent);"><div style="min-width:0;"><div style="color:var(--text-primary,var(--pb-text,#eee));font-weight:750;word-break:break-word;">${_esc(name)}</div>${meta ? `<div style="margin-top:2px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">${_esc(meta)}</div>` : ''}</div><div style="flex-shrink:0;">${btn}</div></div>`;
        } catch (_) { return ''; }
    }

    function _renderValue(v, depth) {
        if (depth === undefined) depth = 0;
        try {
            if (v === undefined || v === null || v === '') return '';
            v = _tryParseJson(v);
            if (typeof v === 'boolean') return _esc(v ? 'Yes' : 'No');
            if (typeof v === 'number') return _esc(String(v));
            if (typeof v === 'string') {
                const s = v.trim();
                if (!s) return '';
                if (_looksLikeUuid(s)) return '';
                return _esc(s.length > 260 ? s.slice(0, 260) + '\u2026' : s);
            }
            if (Array.isArray(v)) {
                const arr = v.filter(x => x !== undefined && x !== null && x !== '');
                if (!arr.length) return '';
                if (arr.every(_isUploadedFile)) return `<div>${arr.slice(0, 10).map(_renderFileLine).join('')}${arr.length > 10 ? `<div style="margin-top:8px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">Showing 10 of ${arr.length} files.</div>` : ''}</div>`;
                const items = arr.slice(0, 6).map((it, idx) => {
                    if (typeof it === 'string' || typeof it === 'number' || typeof it === 'boolean') {
                        const r = _renderValue(it, depth + 1); return r ? `<div style="color:var(--text-primary,var(--pb-text,#eee));">\u2022 ${r}</div>` : '';
                    }
                    if (it && typeof it === 'object') {
                        const pick = ['name','title','type','category','date','amount','total','vendor','status','decision'];
                        const parts = [];
                        for (const k of pick) { if (it[k] != null && it[k] !== '') { const r = _renderValue(it[k], depth + 1); if (r) parts.push(r); } if (parts.length >= 3) break; }
                        return `<div style="color:var(--text-primary,var(--pb-text,#eee));">\u2022 ${parts.length ? parts.join(' \u2014 ') : ('Item ' + (idx + 1))}</div>`;
                    }
                    return '';
                }).filter(Boolean).join('');
                const more = arr.length > 6 ? `<div style="margin-top:8px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">+ ${arr.length - 6} more</div>` : '';
                return items ? `<div>${items}${more}</div>` : _esc(`${arr.length} item${arr.length !== 1 ? 's' : ''}`);
            }
            if (typeof v === 'object') {
                if (_isUploadedFile(v)) return _renderFileLine(v);
                if (depth >= 2) return '';
                const entries = Object.entries(v).filter(([k]) => !_isInternalKey(k)).filter(([, val]) => val != null && val !== '');
                if (!entries.length) return '';
                const rows = entries.slice(0, 8).map(([k, val]) => {
                    const r = _renderValue(val, depth + 1);
                    return r ? `<div style="display:flex;gap:10px;align-items:flex-start;"><div style="min-width:140px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;font-weight:650;">${_esc(_humanize(k))}</div><div style="color:var(--text-primary,var(--pb-text,#eee));font-size:13px;line-height:1.5;word-break:break-word;">${r}</div></div>` : '';
                }).filter(Boolean).join('');
                const more = entries.length > 8 ? `<div style="margin-top:8px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">+ ${entries.length - 8} more details</div>` : '';
                return rows ? `<div style="display:flex;flex-direction:column;gap:8px;">${rows}${more}</div>` : '';
            }
            return '';
        } catch (_) { return ''; }
    }

    function afRenderReviewData(rd, opts) {
        opts = opts || {};
        const maxRows = (typeof opts.maxRows === 'number') ? opts.maxRows : 24;
        if (!rd) return '';
        rd = _tryParseJson(rd);
        if (typeof rd === 'string') {
            const s = rd.trim();
            if (!s) return '';
            return `<div style="color:var(--text-secondary,var(--pb-muted,#999));font-size:13px;line-height:1.5;">${_esc(s.length > 320 ? s.slice(0, 320) + '\u2026' : s)}</div>`;
        }
        if (typeof rd !== 'object' || rd === null) return '';
        const entries = Object.entries(rd).filter(([k, v]) => {
            if (_isInternalKey(k)) return false;
            if (v === undefined || v === null || v === '') return false;
            if (typeof v === 'string' && _looksLikeUuid(v) && /(^|_|\s)(id|uuid)(_|$)/i.test(String(k))) return false;
            return true;
        });
        if (!entries.length) return '';
        const rows = entries.slice(0, maxRows).map(([k, v]) => {
            const rendered = _renderValue(v, 0);
            if (!rendered) return '';
            return `<tr style="border-bottom:1px solid color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 22%, transparent);"><td style="padding:10px 14px 10px 0;color:var(--text-secondary,var(--pb-muted,#999));font-weight:750;white-space:nowrap;vertical-align:top;">${_esc(_humanize(k) || k)}</td><td style="padding:10px 0;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;">${rendered}</td></tr>`;
        }).filter(Boolean).join('');
        if (!rows) return '';
        const more = entries.length > maxRows ? `<div style="margin-top:10px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">Showing ${maxRows} fields. Ask your administrator if you need more details.</div>` : '';
        return `<div style="overflow-x:auto;"><table style="width:100%;font-size:13px;"><tbody>${rows}</tbody></table></div>${more}`;
    }

    function afRenderExtractionReview(details, opts) {
        if (!details || details._review_type !== 'extraction_review') return null;
        opts = opts || {};

        if (!document.getElementById('er-shared-styles')) {
            const s = document.createElement('style');
            s.id = 'er-shared-styles';
            s.textContent = `
.er-split{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px;min-height:380px}
@media(max-width:860px){.er-split{grid-template-columns:1fr}}
.er-split-left,.er-split-right{background:var(--bg-card,var(--pb-panel,#1e1e2e));border:1px solid var(--border-color,var(--pb-border,#333));border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.er-panel-header{display:flex;align-items:center;gap:8px;padding:12px 16px;font-weight:700;font-size:.88rem;color:var(--text-primary,var(--pb-text,#f1f5f9));border-bottom:1px solid var(--border-color,var(--pb-border,#333))}
.er-file-tabs{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--border-color,var(--pb-border,#333));flex-wrap:wrap}
.er-file-tab{padding:5px 12px;border-radius:6px;border:1px solid var(--border-color,var(--pb-border,#333));background:transparent;cursor:pointer;font-size:.78rem;color:var(--text-secondary,var(--pb-muted,#94a3b8));transition:all .2s}
.er-file-tab:hover{background:color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 15%, transparent);color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-file-tab--active{background:var(--primary,var(--pb-primary,#6366f1));color:#fff;border-color:var(--primary,var(--pb-primary,#6366f1))}
.er-doc-viewer{flex:1;overflow:auto;padding:12px;display:flex;align-items:center;justify-content:center;min-height:200px;background:var(--bg-secondary,var(--pb-bg,#16161e))}
.er-doc-loadable{min-height:200px;display:flex;align-items:center;justify-content:center;position:relative}
.er-doc-loading{color:var(--text-muted,var(--pb-muted,#94a3b8));font-size:.9rem}
.er-doc-image{max-width:100%;border-radius:8px;opacity:0;transform:scale(.97);transition:all .5s ease}
.er-doc-image--loaded{opacity:1;transform:scale(1)}
.er-doc-pdf{width:100%;min-height:500px;border:none;border-radius:8px}
.er-doc-fallback{display:flex;flex-direction:column;align-items:center;gap:4px;padding:24px;color:var(--text-secondary,var(--pb-muted,#94a3b8));text-align:center}
.er-download-btn{margin-top:8px;padding:6px 14px;border-radius:6px;border:1px solid var(--primary,var(--pb-primary,#6366f1));background:transparent;color:var(--primary,var(--pb-primary,#6366f1));cursor:pointer;font-size:.82rem}
.er-fields{flex:1;overflow-y:auto;padding:12px 16px;background:var(--bg-card,var(--pb-panel,#1e1e2e))}
.er-field{margin-bottom:10px}
.er-field--full{margin-bottom:14px}
.er-field-label{font-size:.78rem;font-weight:650;color:var(--text-secondary,var(--pb-muted,#94a3b8));margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}
.er-field-input{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--border-color,var(--pb-border,#333));background:var(--bg-input,var(--pb-bg,#2d2d3d));color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.88rem;transition:all .2s}
.er-field-input:focus{outline:none;border-color:var(--primary,var(--pb-primary,#6366f1));box-shadow:0 0 0 3px color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 20%, transparent)}
.er-field-input--edited{border-color:var(--warning,#f59e0b);background:color-mix(in srgb, var(--warning,#f59e0b) 6%, var(--bg-input,#2d2d3d))}
.er-field-value,.er-field-value--table{color:var(--text-primary,var(--pb-text,#f1f5f9));background:var(--bg-input,var(--pb-bg,#2d2d3d));padding:8px 10px;border-radius:6px;border:1px solid var(--border-color,var(--pb-border,#333))}
.er-table{width:100%;border-collapse:collapse;font-size:.82rem;color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-table th{text-align:left;padding:6px 8px;border-bottom:2px solid var(--border-color,var(--pb-border,#333));font-weight:700;text-transform:uppercase;font-size:.72rem;letter-spacing:.3px;color:var(--text-secondary,var(--pb-muted,#94a3b8))}
.er-table td{padding:6px 8px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 50%, transparent);color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-confirm-section{padding:12px 16px;border-top:1px solid var(--border,var(--pb-border,#333));flex-shrink:0}
.er-confirm-actions{display:flex;gap:10px;margin-top:10px}
.er-anomaly-banner{background:color-mix(in srgb, var(--warning,#f59e0b) 8%, var(--bg-card,var(--pb-panel,#1e1e2e)));border:1px solid color-mix(in srgb, var(--warning,#f59e0b) 40%, var(--border-color,#333));border-radius:12px;padding:14px 16px;margin-bottom:12px;animation:erBannerSlideIn .5s ease;color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-anomaly-header{display:flex;align-items:center;gap:8px;font-weight:700;font-size:.92rem;margin-bottom:10px}
.er-anomaly-list{display:flex;flex-direction:column;gap:6px}
.er-anomaly-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;animation:erBannerSlideIn .5s ease}
.er-anomaly--critical{background:color-mix(in srgb, var(--error,#ef4444) 12%, transparent);border-left:3px solid var(--error,#ef4444)}
.er-anomaly--warning{background:color-mix(in srgb, var(--warning,#f59e0b) 10%, transparent);border-left:3px solid var(--warning,#f59e0b)}
.er-anomaly--info{background:color-mix(in srgb, var(--primary,#6366f1) 8%, transparent);border-left:3px solid var(--primary,#6366f1)}
.er-anomaly-badge{padding:2px 8px;border-radius:4px;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
.er-anomaly--critical .er-anomaly-badge{background:var(--error,#ef4444);color:#fff}
.er-anomaly--warning .er-anomaly-badge{background:var(--warning,#f59e0b);color:#000}
.er-anomaly--info .er-anomaly-badge{background:var(--primary,#6366f1);color:#fff}
@keyframes erBannerSlideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
.er-doc-word p,.er-doc-word li,.er-doc-word td,.er-doc-word th{color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-doc-word table{border-collapse:collapse;width:100%;margin:8px 0}
.er-doc-word th,.er-doc-word td{border:1px solid var(--border-color,var(--pb-border,#333));padding:6px 8px;text-align:left}
.er-doc-word h1,.er-doc-word h2,.er-doc-word h3{color:var(--text-primary,var(--pb-text,#f1f5f9));margin:12px 0 6px}
`;
            document.head.appendChild(s);
        }

        const API_BASE = (typeof API !== 'undefined' ? API : '');
        const sourceFiles = details._source_files || [];
        const extractedData = details._extracted_data || {};
        const outputFields = details._output_fields || [];
        const stepName = details._step_name || 'AI Extraction';
        try { console.log('[afRenderExtractionReview] sourceFiles', sourceFiles.length, sourceFiles); } catch (_) {}

        function _extractFileId(fileObj) {
            var id = fileObj.id || fileObj.file_id || fileObj.upload_id || '';
            if (id) return String(id).trim();
            var dl = fileObj.download_url || fileObj.downloadUrl || '';
            if (typeof dl === 'string' && dl.indexOf('/uploads/') >= 0) {
                var m = dl.match(/\/uploads\/([a-fA-F0-9-]+)(?:\/|$)/);
                if (m) return m[1];
            }
            return '';
        }

        const filesInfo = sourceFiles.map(function (f, i) {
            const fId = _extractFileId(f);
            const fName = f.name || ('File ' + (i + 1));
            const fType = (f.file_type || f.content_type || '').toLowerCase();
            const isImage = /\b(png|jpg|jpeg|gif|webp|bmp|tiff|heic|svg)\b/.test(fType);
            const isPdf = /pdf/.test(fType);
            const isTxt = /\b(txt|text|plain)\b/.test(fType) || /^text\/plain/.test(fType);
            const isCsv = /\bcsv\b/.test(fType) || /^text\/csv/.test(fType);
            const isTextLike = isTxt || isCsv;
            const isWord = /\b(doc|docx)\b/.test(fType) || /wordprocessingml|msword/.test(fType);
            const isExcel = /\b(xls|xlsx)\b/.test(fType) || /spreadsheetml|ms-excel/.test(fType);
            const isPpt = /\b(ppt|pptx)\b/.test(fType) || /presentationml|ms-powerpoint/.test(fType);
            const isOfficePreview = isWord || isExcel || isPpt;
            return { fId: fId, fName: fName, fType: fType, isImage: isImage, isPdf: isPdf, isTextLike: isTextLike, isCsv: isCsv, isWord: isWord, isExcel: isExcel, isPpt: isPpt, isOfficePreview: isOfficePreview, idx: i };
        });
        try { console.log('[afRenderExtractionReview] filesInfo', filesInfo); } catch (_) {}

        var fileTabsHtml = filesInfo.length > 1
            ? '<div class="er-file-tabs">' + filesInfo.map(function (f) {
                return '<button class="er-file-tab ' + (f.idx === 0 ? 'er-file-tab--active' : '') + '" data-file-idx="' + f.idx + '" onclick="window._afErSwitchFile(' + f.idx + ')">' + _esc(f.fName) + '</button>';
            }).join('') + '</div>'
            : '';

        var filePreviews = filesInfo.map(function (f) {
            var viewer = '';
            if (f.fId && (f.isImage || f.isPdf || f.isTextLike || f.isOfficePreview)) {
                viewer = '<div class="er-doc-loadable" data-file-id="' + _esc(f.fId) + '" data-file-name="' + _esc(f.fName) + '" data-is-image="' + (f.isImage ? '1' : '0') + '" data-is-pdf="' + (f.isPdf ? '1' : '0') + '" data-is-textlike="' + (f.isTextLike ? '1' : '0') + '" data-is-csv="' + (f.isCsv ? '1' : '0') + '" data-is-word="' + (f.isWord ? '1' : '0') + '" data-is-excel="' + (f.isExcel ? '1' : '0') + '" data-is-ppt="' + (f.isPpt ? '1' : '0') + '"><div class="er-doc-loading">Loading document…</div></div>';
            } else if (f.fId) {
                viewer = '<div class="er-doc-fallback"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div style="margin-top:8px;font-weight:600;">' + _esc(f.fName) + '</div><button type="button" class="er-download-btn er-doc-dl-btn" data-er-file-id="' + _esc(f.fId) + '" data-er-file-name="' + _esc(f.fName) + '">Download</button></div>';
            } else {
                viewer = '<div class="er-doc-fallback" style="padding:24px;">No file reference</div>';
            }
            return '<div class="er-file-preview" data-file-idx="' + f.idx + '" style="' + (f.idx > 0 ? 'display:none;' : '') + '">' + viewer + '</div>';
        }).join('') || '<div style="padding:24px;text-align:center;color:var(--text-muted,var(--pb-muted,#94a3b8));">No source documents attached</div>';

        var renderArray = function (arr) {
            if (!arr || !arr.length) return '<em>empty</em>';
            if (typeof arr[0] !== 'object') return arr.map(function (v) { return '<div>' + _esc(String(v)) + '</div>'; }).join('');
            var cols = Object.keys(arr[0]);
            return '<table class="er-table"><thead><tr>' + cols.map(function (c) { return '<th>' + _esc(_humanize(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' + arr.map(function (row) { return '<tr>' + cols.map(function (c) { return '<td>' + _esc(String(row[c] != null ? row[c] : '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        };

        function _isDatePlaceholder(s) {
            if (!s || typeof s !== 'string') return true;
            var t = s.trim().toLowerCase();
            return !t || /^dd[\/\-\.]mm[\/\-\.]yyyy$/i.test(t) || /^mm[\/\-\.]dd[\/\-\.]yyyy$/i.test(t) || /^yyyy[\/\-\.]mm[\/\-\.]dd$/i.test(t) || /^dd\/mm\/yy$/i.test(t) || t === 'dd/mm/yyyy' || t === 'mm/dd/yyyy' || t === 'yyyy-mm-dd';
        }
        var fieldsToRender = outputFields.length ? outputFields : Object.keys(extractedData).map(function (k) { return { name: k, label: _humanize(k), type: 'text' }; });
        var dataRowsHtml = fieldsToRender.map(function (field) {
            var key = field.name || field;
            var label = field.label || _humanize(key);
            var val = extractedData[key];
            var fieldType = field.type || 'text';
            if (Array.isArray(val)) {
                return '<div class="er-field er-field--full" data-field-key="' + _esc(key) + '"><div class="er-field-label">' + _esc(label) + '</div><div class="er-field-value er-field-value--table">' + renderArray(val, key) + '</div></div>';
            }
            var displayVal = (val == null) ? '' : String(val);
            if ((fieldType === 'date' || /date/i.test(key)) && _isDatePlaceholder(displayVal)) displayVal = '';
            var isDateField = fieldType === 'date' || /date/i.test(key);
            var inputType = (fieldType === 'number' || fieldType === 'currency') ? 'number' : (isDateField && displayVal) ? 'date' : 'text';
            var ro = opts.readonly ? 'readonly' : '';
            var ph = isDateField && !displayVal ? ' placeholder="— Not extracted"' : '';
            return '<div class="er-field" data-field-key="' + _esc(key) + '"><div class="er-field-label">' + _esc(label) + '</div><input class="er-field-input" type="' + inputType + '" value="' + _esc(displayVal) + '" data-er-key="' + _esc(key) + '" data-er-type="' + _esc(fieldType) + '" ' + ro + ph + ' onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" /></div>';
        }).join('');

        var hasAnomalies = Object.keys(extractedData).some(function (k) { return /anomal|discrepanc|flag|risk|fraud|mismatch|warning/i.test(k) && extractedData[k]; });
        var anomalyHtml = '';
        if (hasAnomalies) {
            var anomalyKeys = Object.keys(extractedData).filter(function (k) { return /anomal|discrepanc|flag|risk|fraud|mismatch|warning/i.test(k) && extractedData[k]; });
            var items = [];
            anomalyKeys.forEach(function (k) {
                var v = extractedData[k];
                if (Array.isArray(v)) v.forEach(function (item) { items.push(typeof item === 'object' ? item : { detail: String(item) }); });
                else if (typeof v === 'object' && v !== null) items.push(v);
                else items.push({ detail: String(v) });
            });
            if (items.length) {
                anomalyHtml = '<div class="er-anomaly-banner"><div class="er-anomaly-header"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning,#f59e0b)" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>' + items.length + ' Anomal' + (items.length === 1 ? 'y' : 'ies') + ' Detected</span></div><div class="er-anomaly-list">' + items.map(function (item, idx) {
                    var sev = item.severity || item.level || '';
                    var sevCls = /high|critical/i.test(sev) ? 'er-anomaly--critical' : /medium/i.test(sev) ? 'er-anomaly--warning' : 'er-anomaly--info';
                    var detail = item.detail || item.details || item.description || item.anomalyType || item.type || JSON.stringify(item);
                    return '<div class="er-anomaly-item ' + sevCls + '" style="animation-delay:' + (idx * 0.12) + 's"><span class="er-anomaly-badge">' + _esc(sev || 'Flag') + '</span><span class="er-anomaly-text">' + _esc(typeof detail === 'string' ? detail : JSON.stringify(detail)) + '</span></div>';
                }).join('') + '</div></div>';
            }
        }

        return anomalyHtml +
            '<div class="er-split">' +
            '<div class="er-split-left">' +
            '<div class="er-panel-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Source Documents</div>' +
            fileTabsHtml +
            '<div class="er-doc-viewer">' + filePreviews + '</div>' +
            '</div>' +
            '<div class="er-split-right">' +
            '<div class="er-panel-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Extracted Data \u2014 ' + _esc(stepName) + '</div>' +
            '<div class="er-fields">' + dataRowsHtml + '</div>' +
            '</div>' +
            '</div>';
    }

    function afLoadExtractionReviewMedia(container) {
        _afErSetupObserver();
        var _log = function (msg, data) { try { console.log('[afLoadExtractionReviewMedia] ' + msg, data !== undefined ? data : ''); } catch (_) {} };
        container = container || document.body;
        _log('called', { hasContainer: !!container, containerId: container && container.id, containerTag: container && container.tagName });
        if (!container || !container.querySelector) { _log('early return: no container or querySelector'); return; }
        var getToken = window.getAuthToken || (typeof getAuthToken === 'function' ? getAuthToken : null);
        var token = (getToken && getToken()) || (typeof localStorage !== 'undefined' && localStorage.getItem('agentforge_token')) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('agentforge_token')) || '';
        _log('auth', { hasToken: !!token, tokenLen: token ? token.length : 0 });
        var API_BASE = (typeof API !== 'undefined' ? API : '') || '';
        var loadables = container.querySelectorAll('.er-doc-loadable');
        _log('loadables found', { count: loadables.length });
        function _loadScript(src) {
            if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
            var s = document.createElement('script');
            s.src = src;
            document.head.appendChild(s);
            return new Promise(function (res, rej) { s.onload = res; s.onerror = rej; });
        }

        loadables.forEach(function (el, idx) {
            var fileId = el.getAttribute('data-file-id');
            var fName = el.getAttribute('data-file-name') || 'document';
            var isImage = el.getAttribute('data-is-image') === '1';
            var isPdf = el.getAttribute('data-is-pdf') === '1';
            var isTextLike = el.getAttribute('data-is-textlike') === '1';
            var isCsv = el.getAttribute('data-is-csv') === '1';
            var isWord = el.getAttribute('data-is-word') === '1';
            var isExcel = el.getAttribute('data-is-excel') === '1';
            var isPpt = el.getAttribute('data-is-ppt') === '1';
            var isOfficePreview = isWord || isExcel || isPpt;
            _log('loadable[' + idx + ']', { fileId: fileId || '(empty)', fName: fName, isImage: isImage, isPdf: isPdf, isTextLike: isTextLike, isWord: isWord, isExcel: isExcel, isPpt: isPpt, willFetch: !!(fileId && token) });
            if (!fileId || !token) {
                _log('loadable[' + idx + '] SKIP', { reason: !fileId ? 'no fileId' : 'no token' });
                if (!fileId) el.innerHTML = '<div class="er-doc-fallback"><span>No file ID in review data.</span></div>';
                else if (!token) el.innerHTML = '<div class="er-doc-fallback"><span>Not authenticated. Please log in.</span></div>';
                return;
            }
            var url = API_BASE + '/process/uploads/' + encodeURIComponent(fileId) + '/download';
            _log('loadable[' + idx + '] fetching', { url: url });
            var fetchOpts = { headers: { 'Authorization': 'Bearer ' + token } };
            var promise = fetch(url, fetchOpts).then(function (r) {
                _log('loadable[' + idx + '] response', { status: r.status, statusText: r.statusText, ok: r.ok });
                if (!r.ok) return Promise.reject(new Error('HTTP ' + r.status + ' ' + r.statusText));
                if (isTextLike) return r.text();
                if (isOfficePreview) return r.arrayBuffer();
                return r.blob();
            });
            if (isTextLike) {
                promise.then(function (text) {
                    _log('loadable[' + idx + '] text received', { len: text && text.length });
                    el.innerHTML = '';
                    var wrap = document.createElement('div');
                    wrap.className = 'er-doc-text';
                    wrap.style.cssText = 'max-height:500px;overflow:auto;padding:12px;background:var(--bg-input,var(--pb-bg,#0d0d1a));border-radius:8px;border:1px solid var(--border-color,var(--pb-border,#333));font-family:monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:var(--text-primary,var(--pb-text,#eee));text-align:left;';
                    if (isCsv) {
                        var rows = (text || '').split(/\r?\n/).filter(function (r) { return r.trim(); });
                        var table = document.createElement('table');
                        table.className = 'er-table';
                        table.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;';
                        rows.forEach(function (row, ri) {
                            var tr = document.createElement('tr');
                            var cells = row.split(',').map(function (c) { return c.replace(/^["\s]+|["\s]+$/g, '').replace(/""/g, '"'); });
                            cells.forEach(function (cell) {
                                var td = document.createElement(ri === 0 ? 'th' : 'td');
                                td.textContent = cell;
                                td.style.cssText = 'padding:6px 8px;border:1px solid var(--border-color,var(--pb-border,#333));text-align:left;';
                                tr.appendChild(td);
                            });
                            table.appendChild(tr);
                        });
                        wrap.appendChild(table);
                    } else {
                        var pre = document.createElement('pre');
                        pre.textContent = (text || '').slice(0, 50000);
                        if ((text || '').length > 50000) pre.textContent += '\n\n… (truncated, use Download for full file)';
                        pre.style.cssText = 'margin:0;';
                        wrap.appendChild(pre);
                    }
                    el.appendChild(wrap);
                    _log('loadable[' + idx + '] text displayed');
                }).catch(function (err) {
                    _log('loadable[' + idx + '] FAILED', { error: err && err.message, fileId: fileId });
                    el.innerHTML = '<div class="er-doc-fallback"><span>Could not load document.</span><button type="button" class="er-download-btn er-doc-dl-btn" data-er-file-id="' + (fileId || '') + '" data-er-file-name="' + (fName || '') + '">Download</button></div>';
                });
            } else if (isOfficePreview) {
                promise.then(function (ab) {
                    _log('loadable[' + idx + '] arrayBuffer received', { size: ab && ab.byteLength });
                    var failHtml = '<div class="er-doc-fallback"><span>Could not load document.</span><button type="button" class="er-download-btn er-doc-dl-btn" data-er-file-id="' + (fileId || '') + '" data-er-file-name="' + (fName || '') + '">Download</button></div>';
                    if (isWord) {
                        _loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js').then(function () {
                            return (window.mammoth || {}).convertToHtml ? window.mammoth.convertToHtml({ arrayBuffer: ab }) : Promise.reject(new Error('Mammoth not loaded'));
                        }).then(function (result) {
                            el.innerHTML = '';
                            var wrap = document.createElement('div');
                            wrap.className = 'er-doc-word';
                            wrap.style.cssText = 'max-height:500px;overflow:auto;padding:16px;background:var(--bg-input,var(--pb-bg,#0d0d1a));border-radius:8px;border:1px solid var(--border-color,var(--pb-border,#333));color:var(--text-primary,var(--pb-text,#eee));font-size:14px;line-height:1.6;';
                            wrap.innerHTML = (result && result.value) || '';
                            el.appendChild(wrap);
                            _log('loadable[' + idx + '] Word displayed');
                        }).catch(function (err) {
                            _log('loadable[' + idx + '] Word FAILED', { error: err && err.message });
                            el.innerHTML = failHtml;
                        });
                    } else if (isExcel) {
                        _loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').then(function () {
                            var X = window.XLSX;
                            if (!X || !X.read) return Promise.reject(new Error('XLSX not loaded'));
                            var wb = X.read(ab, { type: 'array' });
                            var first = wb.SheetNames && wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : null;
                            if (!first) return Promise.reject(new Error('No sheet'));
                            var rows = X.utils.sheet_to_json(first, { header: 1, defval: '' });
                            el.innerHTML = '';
                            var wrap = document.createElement('div');
                            wrap.className = 'er-doc-excel';
                            wrap.style.cssText = 'max-height:500px;overflow:auto;padding:12px;';
                            var table = document.createElement('table');
                            table.className = 'er-table';
                            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
                            (rows || []).forEach(function (row, ri) {
                                var tr = document.createElement('tr');
                                var arr = Array.isArray(row) ? row : [row];
                                arr.forEach(function (cell) {
                                    var td = document.createElement(ri === 0 ? 'th' : 'td');
                                    td.textContent = cell != null ? String(cell) : '';
                                    td.style.cssText = 'padding:6px 8px;border:1px solid var(--border-color,var(--pb-border,#333));text-align:left;';
                                    tr.appendChild(td);
                                });
                                table.appendChild(tr);
                            });
                            wrap.appendChild(table);
                            el.appendChild(wrap);
                            _log('loadable[' + idx + '] Excel displayed');
                        }).catch(function (err) {
                            _log('loadable[' + idx + '] Excel FAILED', { error: err && err.message });
                            el.innerHTML = failHtml;
                        });
                    } else if (isPpt) {
                        _loadScript('https://unpkg.com/pptx-viewer@0.1.0/dist/pptx-viewer.umd.js').then(function () {
                            var Pv = window.PPTXViewer;
                            var ViewerClass = (Pv && (Pv.PPTXViewer || Pv.default || Pv)) || Pv;
                            if (!ViewerClass) return Promise.reject(new Error('PPTXViewer not loaded'));
                            el.innerHTML = '';
                            var wrap = document.createElement('div');
                            wrap.style.cssText = 'width:100%;min-height:400px;';
                            el.appendChild(wrap);
                            var viewer = new ViewerClass(wrap);
                            return (viewer.load && viewer.load(ab)) || (viewer.load && viewer.load(new Uint8Array(ab))) || Promise.reject(new Error('load failed'));
                        }).then(function () {
                            _log('loadable[' + idx + '] PowerPoint displayed');
                        }).catch(function (err) {
                            _log('loadable[' + idx + '] PowerPoint FAILED', { error: err && err.message });
                            el.innerHTML = failHtml;
                        });
                    }
                }).catch(function (err) {
                    _log('loadable[' + idx + '] Office fetch FAILED', { error: err && err.message, fileId: fileId });
                    el.innerHTML = '<div class="er-doc-fallback"><span>Could not load document.</span><button type="button" class="er-download-btn er-doc-dl-btn" data-er-file-id="' + (fileId || '') + '" data-er-file-name="' + (fName || '') + '">Download</button></div>';
                });
            } else {
                promise.then(function (blob) {
                    _log('loadable[' + idx + '] blob received', { size: blob && blob.size });
                    el.innerHTML = '';
                    if (isImage) {
                        var blobUrl = URL.createObjectURL(blob);
                        var img = document.createElement('img');
                        img.src = blobUrl;
                        img.alt = fName;
                        img.className = 'er-doc-image er-doc-image--loaded';
                        img.style.maxWidth = '100%';
                        img.style.borderRadius = '8px';
                        img.onload = function () { img.classList.add('er-doc-image--loaded'); _log('loadable[' + idx + '] image loaded'); };
                        el.appendChild(img);
                    } else if (isPdf) {
                        var reader = new FileReader();
                        reader.onload = function () {
                            var dataUrl = reader.result;
                            var iframe = document.createElement('iframe');
                            iframe.src = dataUrl;
                            iframe.className = 'er-doc-pdf';
                            iframe.style.cssText = 'width:100%;min-height:500px;border:none;border-radius:8px;background:#fff;';
                            el.appendChild(iframe);
                            _log('loadable[' + idx + '] PDF displayed (data URL)');
                        };
                        reader.onerror = function () {
                            var blobUrl = URL.createObjectURL(blob);
                            var obj = document.createElement('object');
                            obj.data = blobUrl;
                            obj.type = 'application/pdf';
                            obj.className = 'er-doc-pdf';
                            obj.style.cssText = 'width:100%;min-height:500px;border:none;border-radius:8px;';
                            el.appendChild(obj);
                            _log('loadable[' + idx + '] PDF fallback (blob URL)');
                        };
                        reader.readAsDataURL(blob);
                    }
                }).catch(function (err) {
                    _log('loadable[' + idx + '] FAILED', { error: err && err.message, fileId: fileId });
                    el.innerHTML = '<div class="er-doc-fallback"><span>Could not load document.</span><button type="button" class="er-download-btn er-doc-dl-btn" data-er-file-id="' + (fileId || '') + '" data-er-file-name="' + (fName || '') + '">Download</button></div>';
                });
            }
        });
        if (!window._afErDlDelegated) {
            window._afErDlDelegated = true;
            document.addEventListener('click', function (e) {
                var btn = e.target && e.target.closest && e.target.closest('.er-doc-dl-btn');
                if (btn) {
                    var fid = btn.getAttribute('data-er-file-id');
                    var fname = btn.getAttribute('data-er-file-name') || 'download';
                    if (fid && typeof afDownloadProcessUploadFile === 'function') afDownloadProcessUploadFile(fid, fname);
                }
            });
        }
    }

    function _afErSetupObserver() {
        if (typeof MutationObserver === 'undefined' || window._afErObserver) return;
        window._afErObserver = true;
        var mo = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var nodes = mutations[i].addedNodes;
                for (var j = 0; j < nodes.length; j++) {
                    var n = nodes[j];
                    if (n.nodeType !== 1) continue;
                    if (n.querySelector && n.querySelector('.er-doc-loadable')) afLoadExtractionReviewMedia(n);
                    else if (n.classList && n.classList.contains('er-doc-loadable')) afLoadExtractionReviewMedia(n.parentElement || document.body);
                }
            }
        });
        if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    }

    function afDownloadProcessUploadFile(fileId, filename) {
        var id = String(fileId || '').trim();
        if (!id) return;
        var name = String(filename || '').trim() || ('upload-' + id);
        var headers = {};
        if (typeof window.getAuthHeaders === 'function') headers = window.getAuthHeaders();
        else if (typeof window.getAuthToken === 'function') {
            var t = window.getAuthToken();
            if (t) headers['Authorization'] = 'Bearer ' + t;
        }
        var API_BASE = (typeof API !== 'undefined' ? API : '');
        fetch(API_BASE + '/process/uploads/' + encodeURIComponent(id) + '/download', { headers: headers })
            .then(function (res) {
                if (!res.ok) throw new Error(res.statusText || 'Failed to download file');
                return res.blob();
            })
            .then(function (blob) {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1500);
            })
            .catch(function (e) {
                try { if (typeof window.showToast === 'function') window.showToast('Unable to download file', 'error'); } catch (_) {}
                try { if (typeof window.pbToast === 'function') window.pbToast('Unable to download file', 'error'); } catch (_) {}
            });
    }

    window._afErSwitchFile = function (idx) {
        document.querySelectorAll('.er-file-tab').forEach(function (t) { t.classList.remove('er-file-tab--active'); });
        document.querySelectorAll('.er-file-preview').forEach(function (p) { p.style.display = 'none'; });
        var tab = document.querySelector('.er-file-tab[data-file-idx="' + idx + '"]');
        var preview = document.querySelector('.er-file-preview[data-file-idx="' + idx + '"]');
        if (tab) tab.classList.add('er-file-tab--active');
        if (preview) preview.style.display = '';
    };

    window._afErFieldChanged = function (el) {
        if (el) el.classList.add('er-field-input--edited');
    };

    window.afRenderReviewData = afRenderReviewData;
    window.afRenderExtractionReview = afRenderExtractionReview;
    window.afLoadExtractionReviewMedia = afLoadExtractionReviewMedia;
    window.afDownloadProcessUploadFile = afDownloadProcessUploadFile;
    _afErSetupObserver();
})();
