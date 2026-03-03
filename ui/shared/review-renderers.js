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
        const skip = [
            'user_context', 'org_id', 'orgid', 'org', 'current_user', 'currentuser',
            'submitted_information', 'submittedinformation', 'download_url', 'path',
            'content_type', 'contenttype', 'trigger_input', 'triggerinput',
            'approval_decision', 'approvaldecision',
            'execution_id', 'executionid', 'process_id', 'processid',
            'node_id', 'nodeid', 'step_id', 'stepid',
        ];
        if (skip.includes(nk)) return true;
        if (/^(uploaded|upload|fileinput|fileupload)/i.test(nk) || /upload$/i.test(nk)) return true;
        return false;
    }

    function _isFileMetadataObj(v) {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
        var keys = Object.keys(v);
        var fileHints = ['filename', 'format', 'size', 'title'];
        var matched = 0;
        for (var i = 0; i < keys.length; i++) {
            if (fileHints.indexOf(keys[i].toLowerCase()) !== -1) matched++;
        }
        return matched >= 2 && (v.filename || v.Filename);
    }

    function _isDuplicateFileRef(k, v, allEntries) {
        if (!_isUploadedFile(v)) return false;
        var vName = String(v && v.name || '').toLowerCase();
        if (!vName) return false;
        for (var i = 0; i < allEntries.length; i++) {
            var ek = allEntries[i][0], ev = allEntries[i][1];
            if (ek === k) continue;
            if (_isUploadedFile(ev) && String(ev && ev.name || '').toLowerCase() === vName) return true;
            if (Array.isArray(ev) && ev.some(function (x) { return _isUploadedFile(x) && String(x && x.name || '').toLowerCase() === vName; })) return true;
        }
        return false;
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

    function _renderFileMetadata(v) {
        var fname = v.filename || v.Filename || v.name || v.title || 'File';
        var fmt = v.format || v.Format || '';
        var sz = (typeof v.size === 'number') ? (v.size > 1024 ? Math.round(v.size / 1024) + ' KB' : v.size + ' B') : '';
        var meta = [fmt ? fmt.toUpperCase() : '', sz].filter(Boolean).join(' \u00b7 ');
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;">'
            + '<div style="min-width:0;"><div style="color:var(--text-primary,var(--pb-text,#eee));font-weight:700;word-break:break-word;">' + _esc(fname) + '</div>'
            + (meta ? '<div style="margin-top:2px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">' + _esc(meta) + '</div>' : '')
            + '</div></div>';
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
                if (arr.length > 0 && arr[0] && typeof arr[0] === 'object' && !_isUploadedFile(arr[0])) {
                    const allKeys = Object.keys(arr[0]);
                    const primKeys = allKeys.filter(k => { const v0 = arr[0][k]; return v0 !== null && v0 !== undefined && typeof v0 !== 'object'; });
                    const showKeys = primKeys.slice(0, 6);
                    if (showKeys.length > 0) {
                        const headerCells = showKeys.map(k => `<th style="padding:5px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 40%, transparent);">${_esc(_humanize(k))}</th>`).join('');
                        const bodyRows = arr.slice(0, 8).map(it => {
                            const cells = showKeys.map(k => {
                                const cv = it[k]; return `<td style="padding:5px 8px;font-size:12px;color:var(--text-primary,var(--pb-text,#eee));border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 20%, transparent);">${_esc(cv != null ? String(cv) : '')}</td>`;
                            }).join('');
                            return `<tr>${cells}</tr>`;
                        }).join('');
                        const moreRow = arr.length > 8 ? `<div style="margin-top:6px;color:var(--text-secondary,var(--pb-muted,#999));font-size:11px;">+ ${arr.length - 8} more items</div>` : '';
                        return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>${moreRow}</div>`;
                    }
                }
                const items = arr.slice(0, 6).map((it, idx) => {
                    if (typeof it === 'string' || typeof it === 'number' || typeof it === 'boolean') {
                        const r = _renderValue(it, depth + 1); return r ? `<div style="color:var(--text-primary,var(--pb-text,#eee));">\u2022 ${r}</div>` : '';
                    }
                    if (it && typeof it === 'object') {
                        const objKeys = Object.keys(it).filter(k => it[k] != null && it[k] !== '' && typeof it[k] !== 'object');
                        const parts = objKeys.slice(0, 3).map(k => _esc(String(it[k])));
                        return `<div style="color:var(--text-primary,var(--pb-text,#eee));">\u2022 ${parts.length ? parts.join(' \u2014 ') : ('Item ' + (idx + 1))}</div>`;
                    }
                    return '';
                }).filter(Boolean).join('');
                const more = arr.length > 6 ? `<div style="margin-top:8px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">+ ${arr.length - 6} more</div>` : '';
                return items ? `<div>${items}${more}</div>` : _esc(`${arr.length} item${arr.length !== 1 ? 's' : ''}`);
            }
            if (typeof v === 'object') {
                if (_isUploadedFile(v)) return _renderFileLine(v);
                if (_isFileMetadataObj(v)) return _renderFileMetadata(v);
                if (depth >= 2) return '';
                const entries = Object.entries(v).filter(([k]) => !_isInternalKey(k)).filter(([, val]) => val != null && val !== '');
                if (!entries.length) return '';
                var bracketRx = /^(.+)\[(\d+)\]\.(.+)$/;
                var hasBracket = entries.some(([k]) => bracketRx.test(k));
                if (hasBracket) {
                    var groups = {}, cols = [], maxIdx = -1;
                    entries.forEach(([k, val]) => {
                        var m = k.match(bracketRx);
                        if (m) {
                            var idx = parseInt(m[2], 10);
                            var field = m[3];
                            if (!groups[idx]) groups[idx] = {};
                            groups[idx][field] = val;
                            if (cols.indexOf(field) === -1) cols.push(field);
                            if (idx > maxIdx) maxIdx = idx;
                        }
                    });
                    if (cols.length > 0 && maxIdx >= 0) {
                        var showCols = cols.slice(0, 7);
                        var thCells = showCols.map(c => `<th style="padding:5px 8px;text-align:left;font-size:11px;font-weight:700;color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 40%, transparent);white-space:nowrap;">${_esc(_humanize(c))}</th>`).join('');
                        var trRows = [];
                        for (var gi = 0; gi <= maxIdx && gi < 10; gi++) {
                            if (!groups[gi]) continue;
                            var tds = showCols.map(c => {
                                var cv = groups[gi][c]; return `<td style="padding:5px 8px;font-size:12px;color:var(--text-primary,var(--pb-text,#eee));border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 20%, transparent);word-break:break-word;">${_esc(cv != null ? String(cv) : '')}</td>`;
                            }).join('');
                            trRows.push(`<tr>${tds}</tr>`);
                        }
                        var moreNote = (maxIdx >= 10) ? `<div style="margin-top:6px;color:var(--text-secondary,var(--pb-muted,#999));font-size:11px;">+ ${maxIdx - 9} more items</div>` : '';
                        var extraCols = cols.length > 7 ? `<div style="margin-top:4px;color:var(--text-secondary,var(--pb-muted,#999));font-size:11px;">+ ${cols.length - 7} more fields</div>` : '';
                        return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr>${thCells}</tr></thead><tbody>${trRows.join('')}</tbody></table>${moreNote}${extraCols}</div>`;
                    }
                }
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
        const summaryOnly = !!opts.summaryOnly;
        if (!rd) return '';
        rd = _tryParseJson(rd);
        if (typeof rd === 'string') {
            const s = rd.trim();
            if (!s) return '';
            return `<div style="color:var(--text-secondary,var(--pb-muted,#999));font-size:13px;line-height:1.5;">${_esc(s.length > 320 ? s.slice(0, 320) + '\u2026' : s)}</div>`;
        }
        if (typeof rd !== 'object' || rd === null) return '';

        var allEntries = Object.entries(rd);
        var summaryHtml = '';
        if (rd._approval_summary && typeof rd._approval_summary === 'string') {
            var summaryLines = rd._approval_summary.split('\n').filter(function (l) { return l.trim(); });
            summaryHtml = '<div style="background:linear-gradient(135deg,color-mix(in srgb, var(--primary,#6366f1) 8%, var(--bg-card,#1a1a2e)),color-mix(in srgb, var(--primary,#6366f1) 4%, var(--bg-card,#1a1a2e)));border:1px solid color-mix(in srgb, var(--primary,#6366f1) 25%, var(--border-color,#333));border-radius:12px;padding:16px 20px;margin-bottom:16px;">'
                + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:.9rem;color:var(--text-primary,var(--pb-text,#eee));">'
                + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary,#6366f1)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
                + 'Summary</div>'
                + '<div style="color:var(--text-primary,var(--pb-text,#eee));font-size:13px;line-height:1.7;">'
                + summaryLines.map(function (l) {
                    var trimmed = l.replace(/^[\s\u2022\-\*]+/, '').trim();
                    // Strip common markdown artifacts the LLM may output
                    trimmed = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/__/g, '');
                    if (!trimmed) return '';
                    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:2px 0;"><span style="color:var(--primary,#6366f1);font-size:16px;line-height:1.3;">\u2022</span><span>' + _esc(trimmed) + '</span></div>';
                }).filter(Boolean).join('')
                + '</div></div>';
        }

        // Summary-only mode: if backend provided an approval summary, hide the raw tables.
        // Still show any attached/generated documents (so approvers can download) inside the same Summary box.
        if (summaryOnly && !summaryHtml) {
            // Frontend fallback summary (generic): keep the approval experience business-friendly
            // even if backend summary wasn't available for any reason.
            try {
                var lines = [];
                allEntries.forEach(function (kv) {
                    if (!kv || kv.length !== 2) return;
                    var k = kv[0], v = kv[1];
                    if (!k || _isInternalKey(k) || k === '_approval_summary') return;
                    if (v === undefined || v === null || v === '') return;
                    if (typeof v === 'string' && v.length > 240) v = v.slice(0, 240) + '…';
                    if (typeof v === 'object') {
                        if (_isUploadedFile(v) || _isFileMetadataObj(v) || (v && v.path && v.filename)) {
                            lines.push('Attachment: ' + (v.filename || v.name || 'file'));
                            return;
                        }
                        // Summarize small dicts by primitive pairs
                        if (!Array.isArray(v)) {
                            var pairs = [];
                            Object.keys(v).slice(0, 6).forEach(function (kk) {
                                var vv = v[kk];
                                if (vv === undefined || vv === null || vv === '' || typeof vv === 'object') return;
                                pairs.push(_humanize(kk) + ': ' + String(vv));
                            });
                            if (pairs.length) lines.push(_humanize(k) + ': ' + pairs.join(', '));
                            return;
                        }
                        lines.push(_humanize(k) + ': ' + (Array.isArray(v) ? (v.length + ' item(s)') : 'details'));
                        return;
                    }
                    lines.push(_humanize(k) + ': ' + String(v));
                });
                var summaryLines2 = lines.slice(0, 14);
                summaryHtml = '<div style="background:linear-gradient(135deg,color-mix(in srgb, var(--primary,#6366f1) 8%, var(--bg-card,#1a1a2e)),color-mix(in srgb, var(--primary,#6366f1) 4%, var(--bg-card,#1a1a2e)));border:1px solid color-mix(in srgb, var(--primary,#6366f1) 25%, var(--border-color,#333));border-radius:12px;padding:16px 20px;margin-bottom:16px;">'
                    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:700;font-size:.9rem;color:var(--text-primary,var(--pb-text,#eee));">'
                    + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary,#6366f1)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
                    + 'Summary</div>'
                    + '<div style="color:var(--text-primary,var(--pb-text,#eee));font-size:13px;line-height:1.7;">'
                    + summaryLines2.map(function (t) {
                        return '<div style="display:flex;gap:8px;align-items:flex-start;padding:2px 0;"><span style="color:var(--primary,#6366f1);font-size:16px;line-height:1.3;">\u2022</span><span>' + _esc(String(t)) + '</span></div>';
                    }).join('')
                    + '</div></div>';
            } catch (_) {}
        }

        if (summaryOnly && summaryHtml) {
            // Optional: render side-by-side comparison tables (generic) when provided by backend
            var cmpList = rd._approval_comparisons;
            var cmp = rd._approval_comparison;
            var cmpHtml = '';
            try {
                if (cmpList && cmpList.items && Array.isArray(cmpList.items) && cmpList.items.length) {
                    var blocks = cmpList.items.slice(0, 12).map(function (it, idx) {
                        var title = _esc(String(it.itemLabel || ('Item ' + (idx + 1))));
                        if (it.unmatched) {
                            return '<div style="margin-top:10px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--warning,#f59e0b) 35%, transparent);border-radius:12px;background:color-mix(in srgb, var(--warning,#f59e0b) 8%, transparent);">'
                                + '<div style="font-weight:900;color:var(--text-primary,var(--pb-text,#eee));margin-bottom:6px;">' + title + ' — No matching system record</div>'
                                + '<div style="color:color-mix(in srgb, var(--pb-text,#eee) 88%, var(--pb-muted,#999));font-size:12px;line-height:1.5;">'
                                + _esc(String(it.reason || 'A system match could not be confirmed, so comparison was skipped to avoid incorrect results.'))
                                + '</div></div>';
                        }
                        var lLabel = _humanize(it.leftLabel || cmpList.leftLabel || 'Document');
                        var rLabel = _humanize(it.rightLabel || cmpList.rightLabel || 'System');
                        var rows = (it.rows && Array.isArray(it.rows)) ? it.rows : [];
                        if (!rows.length) return '';
                        var rowsHtml = rows.slice(0, 24).map(function (row) {
                            var f = _esc(_humanize(row.field || 'Field'));
                            var lv = _esc(row.left == null ? '' : String(row.left));
                            var rv = _esc(row.right == null ? '' : String(row.right));
                            var ok = !!row.match;
                            var badge = ok
                                ? '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;background:color-mix(in srgb, var(--success,#22c55e) 18%, transparent);color:color-mix(in srgb, var(--success,#22c55e) 90%, white);">Match</span>'
                                : '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;background:color-mix(in srgb, var(--danger,#ef4444) 18%, transparent);color:color-mix(in srgb, var(--danger,#ef4444) 90%, white);">Diff</span>';
                            return '<tr>'
                                + '<td style="padding:8px 10px;font-weight:750;color:var(--text-secondary,var(--pb-muted,#999));white-space:nowrap;vertical-align:top;">' + f + '</td>'
                                + '<td style="padding:8px 10px;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;word-break:break-word;">' + lv + '</td>'
                                + '<td style="padding:8px 10px;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;word-break:break-word;">' + rv + '</td>'
                                + '<td style="padding:8px 10px;vertical-align:top;">' + badge + '</td>'
                                + '</tr>';
                        }).join('');
                        return '<div style="margin-top:10px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);border-radius:12px;background:color-mix(in srgb, var(--bg-card,#1a1a2e) 92%, transparent);">'
                            + '<div style="font-weight:900;color:var(--text-primary,var(--pb-text,#eee));margin-bottom:8px;">' + title + '</div>'
                            + '<div style="overflow-x:auto;">'
                            + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
                            + '<thead><tr>'
                            + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">Field</th>'
                            + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">' + _esc(lLabel) + '</th>'
                            + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">' + _esc(rLabel) + '</th>'
                            + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">Status</th>'
                            + '</tr></thead>'
                            + '<tbody>' + rowsHtml + '</tbody>'
                            + '</table></div></div>';
                    }).filter(Boolean).join('');
                    if (blocks) {
                        cmpHtml =
                            '<div style="margin-top:-4px;margin-bottom:16px;">'
                            + '<div style="font-weight:800;font-size:12px;letter-spacing:.3px;text-transform:uppercase;color:var(--text-secondary,var(--pb-muted,#999));margin-bottom:8px;">Comparison (same formatting)</div>'
                            + blocks
                            + '</div>';
                    }
                } else
                if (cmp && cmp.unmatched && (!cmp.rows || !cmp.rows.length)) {
                    cmpHtml =
                        '<div style="margin-top:-4px;margin-bottom:16px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--warning,#f59e0b) 35%, transparent);border-radius:12px;background:color-mix(in srgb, var(--warning,#f59e0b) 8%, transparent);">'
                        + '<div style="font-weight:900;color:var(--text-primary,var(--pb-text,#eee));margin-bottom:6px;">No matching system record</div>'
                        + '<div style="color:color-mix(in srgb, var(--pb-text,#eee) 88%, var(--pb-muted,#999));font-size:12px;line-height:1.5;">'
                        + _esc(String(cmp.reason || 'A system match could not be confirmed, so comparison was skipped to avoid incorrect results.'))
                        + '</div></div>';
                } else if (cmp && cmp.rows && Array.isArray(cmp.rows) && cmp.rows.length) {
                    var lLabel = _humanize(cmp.leftLabel || 'Document');
                    var rLabel = _humanize(cmp.rightLabel || 'System');
                    var rowsHtml = cmp.rows.slice(0, 24).map(function (row) {
                        var f = _esc(_humanize(row.field || 'Field'));
                        var lv = _esc(row.left == null ? '' : String(row.left));
                        var rv = _esc(row.right == null ? '' : String(row.right));
                        var ok = !!row.match;
                        var badge = ok
                            ? '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;background:color-mix(in srgb, var(--success,#22c55e) 18%, transparent);color:color-mix(in srgb, var(--success,#22c55e) 90%, white);">Match</span>'
                            : '<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:800;background:color-mix(in srgb, var(--danger,#ef4444) 18%, transparent);color:color-mix(in srgb, var(--danger,#ef4444) 90%, white);">Diff</span>';
                        return '<tr>'
                            + '<td style="padding:8px 10px;font-weight:750;color:var(--text-secondary,var(--pb-muted,#999));white-space:nowrap;vertical-align:top;">' + f + '</td>'
                            + '<td style="padding:8px 10px;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;word-break:break-word;">' + lv + '</td>'
                            + '<td style="padding:8px 10px;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;word-break:break-word;">' + rv + '</td>'
                            + '<td style="padding:8px 10px;vertical-align:top;">' + badge + '</td>'
                            + '</tr>';
                    }).join('');
                    cmpHtml =
                        '<div style="margin-top:-4px;margin-bottom:16px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);border-radius:12px;background:color-mix(in srgb, var(--bg-card,#1a1a2e) 92%, transparent);">'
                        + '<div style="font-weight:800;font-size:12px;letter-spacing:.3px;text-transform:uppercase;color:var(--text-secondary,var(--pb-muted,#999));margin-bottom:8px;">Comparison (same formatting)</div>'
                        + '<div style="overflow-x:auto;">'
                        + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
                        + '<thead><tr>'
                        + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">Field</th>'
                        + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">' + _esc(lLabel) + '</th>'
                        + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">' + _esc(rLabel) + '</th>'
                        + '<th style="text-align:left;padding:8px 10px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);color:var(--text-secondary,var(--pb-muted,#999));text-transform:uppercase;letter-spacing:.3px;font-size:11px;">Status</th>'
                        + '</tr></thead>'
                        + '<tbody>' + rowsHtml + '</tbody>'
                        + '</table></div></div>';
                }
            } catch (_) { cmpHtml = ''; }

            function _isFileRefLike(v) {
                if (!v || typeof v !== 'object') return false;
                if (_isUploadedFile(v) || _isFileMetadataObj(v)) return true;
                // Generated document refs are often {title,format,path,filename,size} or similar
                return !!(v.path && v.filename);
            }
            var files = allEntries
                .filter(function (kv) { return kv && kv.length === 2; })
                .filter(function ([k, v]) {
                    if (!k || _isInternalKey(k) || k === '_approval_summary') return false;
                    if (_isDuplicateFileRef(k, v, allEntries)) return false;
                    return _isFileRefLike(v);
                })
                .slice(0, 6);
            var filesHtml = '';
            if (files.length) {
                filesHtml = '<div style="margin-top:-4px;margin-bottom:16px;padding:12px 14px;border:1px solid color-mix(in srgb, var(--border-color,#333) 35%, transparent);border-radius:12px;background:color-mix(in srgb, var(--bg-card,#1a1a2e) 92%, transparent);">'
                    + '<div style="font-weight:800;font-size:12px;letter-spacing:.3px;text-transform:uppercase;color:var(--text-secondary,var(--pb-muted,#999));margin-bottom:8px;">Attachments</div>'
                    + files.map(function ([k, v]) {
                        var rv = _renderValue(v, 0);
                        if (!rv) return '';
                        return '<div style="padding:6px 0;border-top:1px solid color-mix(in srgb, var(--border-color,#333) 20%, transparent);">' + rv + '</div>';
                    }).filter(Boolean).join('')
                    + '</div>';
            }
            return summaryHtml + cmpHtml + filesHtml;
        }

        const entries = allEntries.filter(([k, v]) => {
            if (_isInternalKey(k)) return false;
            if (k === '_approval_summary') return false;
            if (v === undefined || v === null || v === '') return false;
            if (typeof v === 'string' && _looksLikeUuid(v) && /(^|_|\s)(id|uuid)(_|$)/i.test(String(k))) return false;
            if (typeof v === 'string' && _looksLikeUuid(v.trim())) return false;
            if (_isDuplicateFileRef(k, v, allEntries)) return false;
            if (v && typeof v === 'object' && !Array.isArray(v) && !_isUploadedFile(v) && !_isFileMetadataObj(v)) {
                var vals = Object.values(v);
                if (vals.length > 0 && vals.every(function (x) { return x === 0 || x === '0' || x === '' || x === null; })) return false;
            }
            if (Array.isArray(v) && v.length > 5 && v.some(function (x) { return x && typeof x === 'object' && !_isUploadedFile(x); })) return false;
            return true;
        });
        if (!entries.length && !summaryHtml) return '';
        const rows = entries.slice(0, maxRows).map(([k, v]) => {
            const rendered = _renderValue(v, 0);
            if (!rendered) return '';
            return `<tr style="border-bottom:1px solid color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 22%, transparent);"><td style="padding:10px 14px 10px 0;color:var(--text-secondary,var(--pb-muted,#999));font-weight:750;white-space:nowrap;vertical-align:top;">${_esc(_humanize(k) || k)}</td><td style="padding:10px 0;color:var(--text-primary,var(--pb-text,#eee));vertical-align:top;">${rendered}</td></tr>`;
        }).filter(Boolean).join('');
        const more = entries.length > maxRows ? `<div style="margin-top:10px;color:var(--text-secondary,var(--pb-muted,#999));font-size:12px;">Showing ${maxRows} fields. Ask your administrator if you need more details.</div>` : '';
        var tableHtml = rows ? `<div style="overflow-x:auto;"><table style="width:100%;font-size:13px;"><tbody>${rows}</tbody></table></div>${more}` : '';
        return summaryHtml + tableHtml;
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
.er-doc-viewer{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:200px;background:var(--bg-secondary,var(--pb-bg,#16161e))}
.er-file-preview{width:100%}
.er-doc-loadable{min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;width:100%}
.er-pdf-toolbar{display:flex;justify-content:center;gap:8px;padding:6px 12px;background:rgba(0,0,0,.45);border-radius:8px;margin-bottom:8px;align-items:center;position:sticky;top:0;z-index:5}
.er-pdf-toolbar button{width:32px;height:32px;border:none;background:rgba(255,255,255,.15);color:#fff;border-radius:6px;cursor:pointer;font-size:18px;font-weight:700;transition:background .2s}
.er-pdf-toolbar button:hover{background:rgba(255,255,255,.3)}
.er-pdf-toolbar span{color:#fff;font-size:13px;line-height:32px;min-width:44px;text-align:center}
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
.er-table-input{width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.82rem;transition:border-color .2s,background .2s}
.er-table-input:hover{border-color:color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 60%, transparent)}
.er-table-input:focus{border-color:var(--primary,var(--pb-primary,#6366f1));background:var(--bg-input,var(--pb-bg,#2d2d3d));outline:none;box-shadow:0 0 0 2px color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 20%, transparent)}
.er-table-input--edited{border-color:var(--warning,#f59e0b) !important;background:color-mix(in srgb, var(--warning,#f59e0b) 6%, transparent) !important}
.er-card{background:var(--bg-input,var(--pb-bg,#2d2d3d));border:1px solid var(--border-color,var(--pb-border,#333));border-radius:10px;margin-bottom:12px;overflow:hidden;transition:border-color .2s}
.er-card:hover{border-color:color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 40%, var(--border-color,#333))}
.er-card-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 8%, var(--bg-input,#2d2d3d));border-bottom:1px solid var(--border-color,var(--pb-border,#333))}
.er-card-title{font-weight:700;font-size:.85rem;color:var(--text-primary,var(--pb-text,#f1f5f9));display:flex;align-items:center;gap:8px}
.er-card-badge{padding:2px 10px;border-radius:20px;font-size:.7rem;font-weight:700;letter-spacing:.3px;text-transform:uppercase}
.er-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:color-mix(in srgb, var(--border-color,var(--pb-border,#333)) 40%, transparent)}
@media(max-width:500px){.er-card-grid{grid-template-columns:1fr}}
.er-card-cell{padding:8px 12px;background:var(--bg-input,var(--pb-bg,#2d2d3d))}
.er-card-cell-label{font-size:.7rem;font-weight:650;color:var(--text-secondary,var(--pb-muted,#94a3b8));text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px}
.er-card-cell input.er-card-input{width:100%;box-sizing:border-box;padding:4px 0;border:none;border-bottom:1px solid transparent;background:transparent;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.84rem;font-weight:500;transition:border-color .2s}
.er-card-cell input.er-card-input:hover{border-bottom-color:color-mix(in srgb, var(--border-color,#333) 80%, transparent)}
.er-card-cell input.er-card-input:focus{border-bottom-color:var(--primary,var(--pb-primary,#6366f1));outline:none}
.er-card-cell input.er-card-input.er-card-input--edited{border-bottom-color:var(--warning,#f59e0b)}
.er-card-sub{padding:0 12px 10px}
.er-card-sub-title{font-size:.72rem;font-weight:700;color:var(--text-secondary,var(--pb-muted,#94a3b8));text-transform:uppercase;letter-spacing:.3px;padding:8px 0 4px}
.er-card-sub-table{width:100%;border-collapse:collapse;font-size:.78rem}
.er-card-sub-table th{text-align:left;padding:4px 8px;font-weight:700;font-size:.7rem;color:var(--text-secondary,var(--pb-muted,#94a3b8));text-transform:uppercase;letter-spacing:.3px;border-bottom:1px solid var(--border-color,var(--pb-border,#333))}
.er-card-sub-table td{padding:4px 8px;border-bottom:1px solid color-mix(in srgb, var(--border-color,#333) 30%, transparent);color:var(--text-primary,var(--pb-text,#f1f5f9))}
.er-card-sub-table input.er-card-input{width:100%;box-sizing:border-box;padding:2px 0;border:none;border-bottom:1px solid transparent;background:transparent;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.78rem;transition:border-color .2s}
.er-card-sub-table input.er-card-input:focus{border-bottom-color:var(--primary,var(--pb-primary,#6366f1));outline:none}
.er-card-sub-table input.er-card-input.er-card-input--edited{border-bottom-color:var(--warning,#f59e0b)}
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
        var rawExtracted = details._extracted_data || {};
        const outputVariable = details._output_variable || '';

        // --- Robust extraction-data resolution ---
        // The backend sets _extracted_data = output AND also does review_payload.update(output),
        // so data may live under _extracted_data, or directly as top-level keys in `details`.
        function _isMetaKey(k) { return /^_/.test(k) || /^(download_url|path|content_type|id|run_id|step_name|status|title|description|details_to_review|urgency|approvers_needed|approvals_received|assignee_type|assigned_user_ids|assigned_role_ids|assigned_group_ids|decided_by|decided_at|decision|comments|due_by|created_at|node_id|node_name|review_data|process_execution_id|priority|min_approvals|approval_count|deadline_at|decision_comments)$/.test(k); }
        function _dataKeys(o) {
            if (!o || typeof o !== 'object' || Array.isArray(o)) return [];
            return Object.keys(o).filter(function (k) { return !_isMetaKey(k); });
        }
        function _unwrapSingleKey(obj, ov) {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            var dk = _dataKeys(obj);
            if (dk.length === 1) {
                var inner = obj[dk[0]];
                if (inner && typeof inner === 'object' && !Array.isArray(inner) && _dataKeys(inner).length > 0) {
                    return inner;
                }
            }
            if (ov && obj[ov] && typeof obj[ov] === 'object' && !Array.isArray(obj[ov])) {
                return obj[ov];
            }
            return obj;
        }

        var extractedData = _unwrapSingleKey(rawExtracted, outputVariable);

        // Fallback: if _extracted_data produced nothing useful, try top-level details keys
        if (_dataKeys(extractedData).length === 0) {
            var topLevel = {};
            Object.keys(details).forEach(function (k) { if (!_isMetaKey(k)) topLevel[k] = details[k]; });
            if (_dataKeys(topLevel).length > 0) {
                extractedData = _unwrapSingleKey(topLevel, outputVariable);
                try { console.log('[afRenderExtractionReview] extractedData: fell back to top-level details keys', { keys: Object.keys(extractedData) }); } catch (_) {}
            }
        }

        const outputFields = details._output_fields || [];
        const stepName = details._step_name || 'AI Extraction';
        try { console.log('[afRenderExtractionReview] _extracted_data keys:', Object.keys(rawExtracted), 'extractedData keys:', Object.keys(extractedData), 'outputFields:', outputFields.length, 'outputVariable:', outputVariable, 'sourceFiles:', sourceFiles.length); } catch (_) {}
        try { console.log('[afRenderExtractionReview] extractedData:', JSON.stringify(extractedData).slice(0, 800)); } catch (_) {}
        try { console.log('[afRenderExtractionReview] FULL details keys:', Object.keys(details)); } catch (_) {}

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

        var _cellVal = function (v) {
            if (v === null || v === undefined) return '';
            if (typeof v !== 'object') return _esc(String(v));
            if (Array.isArray(v)) {
                return v.map(function (item, ii) {
                    if (item && typeof item === 'object') {
                        var parts = [];
                        Object.keys(item).slice(0, 5).forEach(function (k) {
                            if (item[k] != null && item[k] !== '' && typeof item[k] !== 'object') parts.push('<b>' + _esc(_humanize(k)) + ':</b> ' + _esc(String(item[k])));
                        });
                        return '<div style="padding:3px 0;' + (ii > 0 ? 'border-top:1px solid rgba(148,163,184,.15);margin-top:3px;' : '') + '">' + (parts.join(', ') || _esc('Item ' + (ii + 1))) + '</div>';
                    }
                    return '<div>' + _esc(String(item != null ? item : '')) + '</div>';
                }).join('');
            }
            var parts = [];
            Object.keys(v).slice(0, 5).forEach(function (k) {
                if (v[k] != null && v[k] !== '' && typeof v[k] !== 'object') parts.push('<b>' + _esc(_humanize(k)) + ':</b> ' + _esc(String(v[k])));
            });
            return parts.join('<br>') || _esc(JSON.stringify(v).slice(0, 120));
        };
        function _findCardTitle(row, idx) {
            var keys = Object.keys(row);
            var nk;
            for (var i = 0; i < keys.length; i++) {
                nk = keys[i].toLowerCase().replace(/[\s_\-]+/g, '');
                if (/name|title|label|subject/.test(nk) && row[keys[i]] != null && row[keys[i]] !== '' && typeof row[keys[i]] !== 'object') return String(row[keys[i]]);
            }
            for (var j = 0; j < keys.length; j++) {
                nk = keys[j].toLowerCase().replace(/[\s_\-]+/g, '');
                if (/number|code|ref|id$/.test(nk) && row[keys[j]] != null && row[keys[j]] !== '' && typeof row[keys[j]] !== 'object') return String(row[keys[j]]);
            }
            for (var k = 0; k < keys.length; k++) {
                var v = row[keys[k]];
                if (typeof v === 'string' && v.trim() && v.length < 60) return v;
            }
            return 'Item ' + (idx + 1);
        }

        var renderArray = function (arr, fieldKey) {
            if (!arr || !arr.length) return '<em>empty</em>';
            if (typeof arr[0] !== 'object') return arr.map(function (v) { return '<div>' + _esc(String(v)) + '</div>'; }).join('');
            var fk = fieldKey || '';
            var hasNested = arr.some(function (row) { return Object.values(row).some(function (v) { return Array.isArray(v); }); });
            if (!hasNested && Object.keys(arr[0]).length <= 4) {
                var cols = Object.keys(arr[0]);
                return '<table class="er-table" data-er-field="' + _esc(fk) + '"><thead><tr>' + cols.map(function (c) { return '<th>' + _esc(_humanize(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' + arr.map(function (row, ri) {
                    return '<tr data-row-idx="' + ri + '">' + cols.map(function (c) {
                        var v = row[c];
                        if (v !== null && v !== undefined && typeof v !== 'object') {
                            var erKey = fk + '[' + ri + '].' + c;
                            return '<td><input class="er-table-input" type="text" value="' + _esc(String(v)) + '" data-er-key="' + _esc(erKey) + '" data-er-type="text" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" /></td>';
                        }
                        return '<td>' + _cellVal(v) + '</td>';
                    }).join('') + '</tr>';
                }).join('') + '</tbody></table>';
            }
            return '<div data-er-field="' + _esc(fk) + '">' + arr.map(function (row, ri) {
                var title = _findCardTitle(row, ri);
                var simpleFields = [];
                var nestedFields = [];
                Object.keys(row).forEach(function (c) {
                    var v = row[c];
                    if (typeof v === 'string' && v.length > 2 && (v[0] === '[' || v[0] === '{')) {
                        try {
                            var parsed = JSON.parse(v);
                            if (parsed && typeof parsed === 'object') { v = parsed; row[c] = parsed; }
                        } catch (_) {}
                    }
                    if (Array.isArray(v)) nestedFields.push({ key: c, val: v });
                    else if (v !== null && v !== undefined && typeof v === 'object') {
                        var objArr = Array.isArray(v) ? v : [v];
                        nestedFields.push({ key: c, val: objArr });
                    }
                    else simpleFields.push({ key: c, val: v });
                });
                var gridHtml = simpleFields.map(function (sf) {
                    var erKey = fk + '[' + ri + '].' + sf.key;
                    var displayVal = (sf.val == null) ? '' : (typeof sf.val === 'object' ? JSON.stringify(sf.val) : String(sf.val));
                    if (displayVal.length > 120) {
                        return '<div class="er-card-cell" style="grid-column:1/-1;"><div class="er-card-cell-label">' + _esc(_humanize(sf.key)) + '</div>'
                            + '<textarea class="er-card-input" rows="3" data-er-key="' + _esc(erKey) + '" data-er-type="text" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" style="resize:vertical;width:100%;box-sizing:border-box;padding:6px;border:none;border-bottom:1px solid transparent;background:transparent;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.82rem;font-family:inherit;">' + _esc(displayVal) + '</textarea>'
                            + '</div>';
                    }
                    return '<div class="er-card-cell"><div class="er-card-cell-label">' + _esc(_humanize(sf.key)) + '</div>'
                        + '<input class="er-card-input" type="text" value="' + _esc(displayVal) + '" data-er-key="' + _esc(erKey) + '" data-er-type="text" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" />'
                        + '</div>';
                }).join('');
                var nestedHtml = nestedFields.map(function (nf) {
                    if (!nf.val || !nf.val.length) return '';
                    if (typeof nf.val[0] !== 'object') {
                        // Primitive arrays (often line items) — try to render as a table by splitting strings
                        // into parts (comma/pipe separated). Keep a "Raw" editable column that maps to the
                        // actual state key, to avoid inventing new structured keys.
                        var rows = nf.val.map(function (v, vi) {
                            var s = (v == null) ? '' : String(v);
                            var parts = null;
                            var sepUsed = '';
                            if (s && typeof s === 'string') {
                                var trimmed = s.trim();
                                // Prefer pipe/semicolon first (less ambiguous), then commas.
                                var sep = trimmed.indexOf('|') >= 0 ? '|' : (trimmed.indexOf(';') >= 0 ? ';' : (trimmed.indexOf(',') >= 0 ? ',' : null));
                                if (sep) {
                                    sepUsed = sep;
                                    var ps = trimmed.split(sep).map(function (x) { return String(x || '').trim(); }).filter(function (x) { return x !== ''; });
                                    if (ps.length >= 2) parts = ps;
                                }
                            }
                            return { vi: vi, raw: s, parts: parts || [], sep: sepUsed };
                        });
                        var maxParts = rows.reduce(function (m, r) { return Math.max(m, r.parts.length); }, 0);
                        // Only use parts-table if we actually have meaningful splitting (2+ parts) for at least 2 rows
                        var partRowsCount = rows.filter(function (r) { return r.parts.length >= 2; }).length;
                        if (maxParts >= 2 && partRowsCount >= Math.min(2, rows.length)) {
                            var showCols = Math.min(maxParts, 6);
                            // Infer business-friendly column names when possible (generic heuristics).
                            function _toNum(s) {
                                if (s == null) return null;
                                var t = String(s).trim();
                                if (!t) return null;
                                t = t.replace(/[, ]+/g, '').replace(/[^0-9.\-]/g, '');
                                if (!t) return null;
                                var n = parseFloat(t);
                                return isFinite(n) ? n : null;
                            }
                            var colStats = [];
                            for (var ci0 = 0; ci0 < showCols; ci0++) {
                                var vals = rows.map(function (r) { return (r.parts[ci0] == null) ? '' : String(r.parts[ci0]).trim(); }).filter(function (x) { return x !== ''; });
                                var nums = vals.map(_toNum).filter(function (x) { return typeof x === 'number'; });
                                var numRatio = vals.length ? (nums.length / vals.length) : 0;
                                var intRatio = nums.length ? (nums.filter(function (n) { return Math.abs(n - Math.round(n)) < 1e-9; }).length / nums.length) : 0;
                                var avgAbs = nums.length ? (nums.reduce(function (a, n) { return a + Math.abs(n); }, 0) / nums.length) : 0;
                                var avgLen = vals.length ? (vals.reduce(function (a, s) { return a + s.length; }, 0) / vals.length) : 0;
                                colStats.push({ numRatio: numRatio, intRatio: intRatio, avgAbs: avgAbs, avgLen: avgLen });
                            }
                            var labels = [];
                            for (var li = 0; li < showCols; li++) labels.push('Part ' + (li + 1));
                            // Column 0: likely a text label/description
                            if (showCols >= 2 && colStats[0].numRatio < 0.25 && colStats[0].avgLen >= 6) {
                                labels[0] = 'Description';
                            } else if (showCols >= 2 && colStats[0].numRatio < 0.25) {
                                labels[0] = 'Item';
                            }
                            // Try to find Quantity + Unit + Total (numeric pattern) without hardcoding domain:
                            // pick a likely quantity column (mostly integers, relatively small magnitudes)
                            var qtyIdx = -1;
                            for (var qi = 1; qi < showCols; qi++) {
                                if (colStats[qi].numRatio > 0.85 && colStats[qi].intRatio > 0.85 && colStats[qi].avgAbs > 0 && colStats[qi].avgAbs <= 100000) {
                                    // Prefer smaller average magnitude as quantity
                                    if (qtyIdx === -1 || colStats[qi].avgAbs < colStats[qtyIdx].avgAbs) qtyIdx = qi;
                                }
                            }
                            function _matchScore(qi, ui, ti) {
                                var ok = 0, tot = 0;
                                for (var ri0 = 0; ri0 < rows.length; ri0++) {
                                    var r0 = rows[ri0];
                                    var q = _toNum(r0.parts[qi]);
                                    var u = _toNum(r0.parts[ui]);
                                    var t = _toNum(r0.parts[ti]);
                                    if (q == null || u == null || t == null) continue;
                                    tot += 1;
                                    var prod = q * u;
                                    var rel = Math.abs(prod - t) / Math.max(Math.abs(t), 1);
                                    if (rel <= 0.02) ok += 1;
                                }
                                return tot ? (ok / tot) : 0;
                            }
                            if (qtyIdx !== -1 && showCols >= 4) {
                                var best = { score: 0, unitIdx: -1, totalIdx: -1 };
                                for (var ui0 = 1; ui0 < showCols; ui0++) {
                                    if (ui0 === qtyIdx) continue;
                                    for (var ti0 = 1; ti0 < showCols; ti0++) {
                                        if (ti0 === qtyIdx || ti0 === ui0) continue;
                                        var sc0 = _matchScore(qtyIdx, ui0, ti0);
                                        if (sc0 > best.score) best = { score: sc0, unitIdx: ui0, totalIdx: ti0 };
                                    }
                                }
                                if (best.score >= 0.6) {
                                    labels[qtyIdx] = 'Quantity';
                                    labels[best.unitIdx] = 'Unit value';
                                    labels[best.totalIdx] = 'Total value';
                                }
                            }
                            // Fallback labeling for other numeric columns
                            var vCounter = 1;
                            for (var li2 = 1; li2 < showCols; li2++) {
                                if (labels[li2].indexOf('Part') === 0) {
                                    if (colStats[li2].numRatio > 0.85) {
                                        labels[li2] = 'Value ' + vCounter;
                                        vCounter += 1;
                                    }
                                }
                            }
                            var headers = '';
                            for (var ci = 0; ci < showCols; ci++) headers += '<th>' + _esc(labels[ci]) + '</th>';
                            var body = rows.map(function (r) {
                                var tds = '';
                                for (var ci2 = 0; ci2 < showCols; ci2++) {
                                    var pv = r.parts[ci2] || '';
                                    tds += '<td><input class="er-lineitem-part-input" type="text" value="' + _esc(pv) + '" data-part-idx="' + ci2 + '" onchange="window._afErLineItemPartsChanged&&window._afErLineItemPartsChanged(this)" style="width:100%;box-sizing:border-box;padding:2px 0;border:none;border-bottom:1px solid transparent;background:transparent;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.78rem;font-family:inherit;" /></td>';
                                }
                                var erKey = fk + '[' + ri + '].' + nf.key + '[' + r.vi + ']';
                                // Hidden raw value bound to the real state key (this is what we actually submit)
                                tds += '<td style="display:none;"><input type="hidden" class="er-card-input" value="' + _esc(String(r.raw || '')) + '" data-er-key="' + _esc(erKey) + '" data-er-type="text" data-er-lineitem-hidden="1" data-er-sep="' + _esc(String(r.sep || ',')) + '" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" /></td>';
                                return '<tr>' + tds + '</tr>';
                            }).join('');
                            return '<div class="er-card-sub"><div class="er-card-sub-title">' + _esc(_humanize(nf.key)) + ' (' + nf.val.length + ')</div>'
                                + '<table class="er-card-sub-table"><thead><tr>' + headers + '</tr></thead><tbody>' + body + '</tbody></table></div>';
                        }
                        // Fallback — simple editable list
                        return '<div class="er-card-sub"><div class="er-card-sub-title">' + _esc(_humanize(nf.key)) + ' (' + nf.val.length + ')</div><div style="padding:4px 8px 8px;color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.82rem;">'
                            + nf.val.map(function (v, vi) {
                                var erKey = fk + '[' + ri + '].' + nf.key + '[' + vi + ']';
                                return '<div style="display:flex;gap:6px;align-items:center;padding:2px 0;' + (vi > 0 ? 'border-top:1px solid color-mix(in srgb, var(--border-color,#333) 30%, transparent);margin-top:2px;' : '') + '">'
                                    + '<span style="color:var(--text-secondary,var(--pb-muted,#94a3b8));font-size:.72rem;min-width:18px;">' + (vi + 1) + '.</span>'
                                    + '<input class="er-card-input" type="text" value="' + _esc(String(v)) + '" data-er-key="' + _esc(erKey) + '" data-er-type="text" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" />'
                                    + '</div>';
                            }).join('') + '</div></div>';
                    }
                    var subColSet = {};
                    nf.val.forEach(function (sr) { if (sr && typeof sr === 'object') { Object.keys(sr).forEach(function (sk) { subColSet[sk] = 1; }); } });
                    var subCols = Object.keys(subColSet);
                    return '<div class="er-card-sub"><div class="er-card-sub-title">' + _esc(_humanize(nf.key)) + ' (' + nf.val.length + ')</div>'
                        + '<table class="er-card-sub-table"><thead><tr>' + subCols.map(function (sc) { return '<th>' + _esc(_humanize(sc)) + '</th>'; }).join('') + '</tr></thead><tbody>'
                        + nf.val.map(function (sr, si) {
                            return '<tr>' + subCols.map(function (sc) {
                                var sv = sr[sc];
                                if (sv !== null && sv !== undefined && typeof sv !== 'object') {
                                    var subKey = fk + '[' + ri + '].' + nf.key + '[' + si + '].' + sc;
                                    return '<td><input class="er-card-input" type="text" value="' + _esc(String(sv)) + '" data-er-key="' + _esc(subKey) + '" data-er-type="text" onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" /></td>';
                                }
                                return '<td>' + _cellVal(sv) + '</td>';
                            }).join('') + '</tr>';
                        }).join('') + '</tbody></table></div>';
                }).join('');
                return '<div class="er-card" data-row-idx="' + ri + '"><div class="er-card-header"><div class="er-card-title"><span style="color:var(--primary,var(--pb-primary,#6366f1));font-size:1.1rem;">\u2756</span> ' + _esc(title) + '</div><span class="er-card-badge" style="background:color-mix(in srgb, var(--primary,var(--pb-primary,#6366f1)) 15%, transparent);color:var(--primary,var(--pb-primary,#6366f1));">#' + (ri + 1) + '</span></div><div class="er-card-grid">' + gridHtml + '</div>' + nestedHtml + '</div>';
            }).join('') + '</div>';
        };

        function _isDatePlaceholder(s) {
            if (!s || typeof s !== 'string') return true;
            var t = String(s).trim().toLowerCase();
            if (!t) return true;
            var ph = ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd', 'dd-mm-yyyy', 'mm-dd-yyyy', 'dd.mm.yyyy', 'mm.dd.yyyy', 'dd/mm/yy', 'mm/dd/yy', 'dd-mm-yy', 'mm-dd-yy'];
            if (ph.indexOf(t) >= 0) return true;
            if (/^dd[\/\-\.]mm[\/\-\.]yyyy$/i.test(t) || /^mm[\/\-\.]dd[\/\-\.]yyyy$/i.test(t) || /^yyyy[\/\-\.]mm[\/\-\.]dd$/i.test(t) || /^dd\/mm\/yy$/i.test(t)) return true;
            if (/dd\s*[\/\-\.]\s*mm\s*[\/\-\.]\s*yyyy/i.test(t) || /mm\s*[\/\-\.]\s*dd\s*[\/\-\.]\s*yyyy/i.test(t)) return true;
            return false;
        }
        function _normalizeKey(s) { return String(s || '').toLowerCase().replace(/[\s_\-]+/g, ''); }
        function _findInObj(obj, k) {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return undefined;
            if (obj[k] !== undefined) return obj[k];
            var objKeys = Object.keys(obj);
            var kLow = k.toLowerCase();
            for (var ci = 0; ci < objKeys.length; ci++) {
                if (objKeys[ci].toLowerCase() === kLow) return obj[objKeys[ci]];
            }
            var snake = k.replace(/([A-Z])/g, function (m) { return '_' + m.toLowerCase(); });
            var camel = k.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); });
            if (snake !== k && obj[snake] !== undefined) return obj[snake];
            if (camel !== k && obj[camel] !== undefined) return obj[camel];
            var kNorm = _normalizeKey(k);
            for (var ni = 0; ni < objKeys.length; ni++) {
                if (_normalizeKey(objKeys[ni]) === kNorm) return obj[objKeys[ni]];
            }
            return undefined;
        }
        function _getNestedVal(obj, key) {
            if (!obj || key == null) return undefined;
            var k = String(key).trim();
            if (!k) return undefined;
            // Direct and fuzzy match at top level
            var found = _findInObj(obj, k);
            if (found !== undefined) return found;
            // Dot-path traversal
            if (k.indexOf('.') >= 0) {
                var parts = k.split('.');
                var cur = obj;
                for (var i = 0; i < parts.length && cur != null; i++) cur = cur[parts[i]];
                if (cur !== undefined) return cur;
            }
            // Search ONE level deeper: look inside nested objects
            var objKeys = Object.keys(obj);
            for (var di = 0; di < objKeys.length; di++) {
                var child = obj[objKeys[di]];
                if (child && typeof child === 'object' && !Array.isArray(child)) {
                    var deepVal = _findInObj(child, k);
                    if (deepVal !== undefined) return deepVal;
                }
            }
            return undefined;
        }
        function _topLevelKeys(o) {
            if (!o || typeof o !== 'object' || Array.isArray(o)) return [];
            return Object.keys(o).filter(function (k) { return !_isMetaKey(k); });
        }
        var fieldsToRender = outputFields.length ? outputFields : _topLevelKeys(extractedData).map(function (k) { return { name: k, label: _humanize(k), type: 'text' }; });
        var _missingFields = [];
        var _renderField = function (field) {
            var key = field.name || field;
            var label = field.label || _humanize(key);
            var val = _getNestedVal(extractedData, key);
            if (val === undefined || val === null) _missingFields.push(key);
            var fieldType = field.type || 'text';
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                var subEntries = Object.entries(val).filter(function (e) { return e[1] != null && e[1] !== ''; });
                if (subEntries.length) {
                    var subRows = subEntries.map(function (e) {
                        return '<div style="display:flex;gap:10px;align-items:baseline;padding:2px 0;">' +
                            '<span style="min-width:100px;font-size:.76rem;font-weight:600;color:var(--text-secondary,var(--pb-muted,#94a3b8));">' + _esc(_humanize(e[0])) + '</span>' +
                            '<span style="color:var(--text-primary,var(--pb-text,#f1f5f9));font-size:.85rem;">' + _esc(String(e[1])) + '</span></div>';
                    }).join('');
                    return '<div class="er-field er-field--full" data-field-key="' + _esc(key) + '"><div class="er-field-label">' + _esc(label) + '</div><div class="er-field-value" style="display:flex;flex-direction:column;gap:2px;">' + subRows + '</div></div>';
                }
            }
            if (Array.isArray(val)) {
                var tableHtml = renderArray(val, key);
                return '<div class="er-field er-field--full" data-field-key="' + _esc(key) + '"><div class="er-field-label">' + _esc(label) + '</div><div class="er-field-value er-field-value--table" style="overflow-x:auto;">' + tableHtml + '</div></div>';
            }
            var displayVal = (val == null) ? '' : String(val);
            if ((fieldType === 'date' || /date/i.test(key)) && _isDatePlaceholder(displayVal)) displayVal = '';
            var isDateField = fieldType === 'date' || /date/i.test(key);
            var inputType = (fieldType === 'number' || fieldType === 'currency') ? 'number' : (isDateField && displayVal) ? 'date' : 'text';
            var ro = opts.readonly ? 'readonly' : '';
            var ph = isDateField && !displayVal ? ' placeholder="— Not extracted"' : '';
            return '<div class="er-field" data-field-key="' + _esc(key) + '"><div class="er-field-label">' + _esc(label) + '</div><input class="er-field-input" type="' + inputType + '" value="' + _esc(displayVal) + '" data-er-key="' + _esc(key) + '" data-er-type="' + _esc(fieldType) + '" ' + ro + ph + ' onchange="window._afErFieldChanged&&window._afErFieldChanged(this)" /></div>';
        };
        var dataRowsHtml = fieldsToRender.map(_renderField).join('');
        if (_missingFields.length > 0) {
            try { console.warn('[afRenderExtractionReview] Fields with no value:', _missingFields, '| extractedData keys:', Object.keys(extractedData), '| rawExtracted keys:', Object.keys(rawExtracted)); } catch (_) {}
        }
        // Fallback: if ALL configured fields are empty, show raw data so it's not a blank panel
        if (_missingFields.length === fieldsToRender.length && fieldsToRender.length > 0 && _topLevelKeys(extractedData).length > 0) {
            try { console.warn('[afRenderExtractionReview] ALL fields empty – falling back to raw data view'); } catch (_) {}
            var fallbackFields = _topLevelKeys(extractedData).map(function (k) { return { name: k, label: _humanize(k), type: 'text' }; });
            _missingFields = [];
            dataRowsHtml = fallbackFields.map(_renderField).join('');
        }

        function _hasAnomalyVal(obj) {
            if (!obj || typeof obj !== 'object') return false;
            var keys = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];
                if (/anomal|discrepanc|flag|risk|fraud|mismatch|warning/i.test(k) && obj[k]) return true;
                if (typeof obj[k] === 'object' && obj[k] !== null && _hasAnomalyVal(obj[k])) return true;
            }
            return false;
        }
        var hasAnomalies = _hasAnomalyVal(extractedData) || _hasAnomalyVal(rawExtracted);
        var anomalyHtml = '';
        if (hasAnomalies) {
            function _collectAnomalies(obj, out) {
                if (!obj || typeof obj !== 'object') return;
                Object.keys(obj).forEach(function (k) {
                    var v = obj[k];
                    if (!/anomal|discrepanc|flag|risk|fraud|mismatch|warning/i.test(k) || !v) return;
                    if (Array.isArray(v)) v.forEach(function (item) { out.push(typeof item === 'object' ? item : { detail: String(item) }); });
                    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) _collectAnomalies(v, out);
                    else out.push({ detail: String(v) });
                });
            }
            var items = [];
            _collectAnomalies(extractedData, items);
            _collectAnomalies(rawExtracted, items);
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
            if (el.getAttribute('data-er-loaded') === '1') return;
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
                    el.setAttribute('data-er-loaded', '1');
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
                            el.setAttribute('data-er-loaded', '1');
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
                            el.setAttribute('data-er-loaded', '1');
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
                            el.setAttribute('data-er-loaded', '1');
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
                        var imgToolbar = document.createElement('div');
                        imgToolbar.className = 'er-pdf-toolbar';
                        var imgZoomOut = document.createElement('button'); imgZoomOut.textContent = '\u2212'; imgZoomOut.title = 'Zoom out';
                        var imgZoomLabel = document.createElement('span'); imgZoomLabel.textContent = '100%';
                        var imgZoomIn = document.createElement('button'); imgZoomIn.textContent = '+'; imgZoomIn.title = 'Zoom in';
                        imgToolbar.appendChild(imgZoomOut); imgToolbar.appendChild(imgZoomLabel); imgToolbar.appendChild(imgZoomIn);
                        el.appendChild(imgToolbar);

                        var imgWrap = document.createElement('div');
                        imgWrap.style.cssText = 'width:100%;overflow:auto;text-align:center;border-radius:8px;';
                        var blobUrl = URL.createObjectURL(blob);
                        var img = document.createElement('img');
                        img.src = blobUrl;
                        img.alt = fName;
                        img.className = 'er-doc-image er-doc-image--loaded';
                        img.style.cssText = 'max-width:100%;border-radius:8px;';
                        img.onload = function () { img.classList.add('er-doc-image--loaded'); _log('loadable[' + idx + '] image loaded'); };
                        imgWrap.appendChild(img);
                        el.appendChild(imgWrap);

                        var imgZoom = 1;
                        imgZoomOut.onclick = function () { imgZoom = Math.max(0.5, imgZoom - 0.25); img.style.maxWidth = (100 / imgZoom) + '%'; img.style.width = (100 * imgZoom) + '%'; imgZoomLabel.textContent = Math.round(imgZoom * 100) + '%'; };
                        imgZoomIn.onclick = function () { imgZoom = Math.min(3, imgZoom + 0.25); img.style.maxWidth = (100 / imgZoom) + '%'; img.style.width = (100 * imgZoom) + '%'; imgZoomLabel.textContent = Math.round(imgZoom * 100) + '%'; };

                        el.style.display = 'block';
                        el.style.minHeight = '';
                        el.setAttribute('data-er-loaded', '1');
                    } else if (isPdf) {
                        var showPdfFallback = function () {
                            var reader = new FileReader();
                            reader.onload = function () {
                                var dataUrl = reader.result;
                                var iframe = document.createElement('iframe');
                                iframe.src = dataUrl;
                                iframe.className = 'er-doc-pdf';
                                iframe.style.cssText = 'width:100%;min-height:500px;border:none;border-radius:8px;background:#fff;';
                                el.appendChild(iframe);
                                el.setAttribute('data-er-loaded', '1');
                                _log('loadable[' + idx + '] PDF displayed (data URL fallback)');
                            };
                            reader.onerror = function () {
                                var blobUrl = URL.createObjectURL(blob);
                                var obj = document.createElement('object');
                                obj.data = blobUrl;
                                obj.type = 'application/pdf';
                                obj.className = 'er-doc-pdf';
                                obj.style.cssText = 'width:100%;min-height:500px;border:none;border-radius:8px;';
                                el.appendChild(obj);
                                el.setAttribute('data-er-loaded', '1');
                                _log('loadable[' + idx + '] PDF displayed (blob URL fallback)');
                            };
                            reader.readAsDataURL(blob);
                        };
                        _loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(function () {
                            var pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
                            if (!pdfjsLib || !pdfjsLib.getDocument) return Promise.reject(new Error('PDF.js not loaded'));
                            if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                            return blob.arrayBuffer();
                        }).then(function (ab) {
                            var pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
                            return pdfjsLib.getDocument({ data: ab }).promise;
                        }).then(function (pdfDoc) {
                            el.innerHTML = '';
                            el.style.display = 'block';
                            el.style.minHeight = '';

                            var toolbar = document.createElement('div');
                            toolbar.className = 'er-pdf-toolbar';
                            var zoomOut = document.createElement('button'); zoomOut.textContent = '\u2212'; zoomOut.title = 'Zoom out';
                            var zoomLabel = document.createElement('span'); zoomLabel.textContent = '100%';
                            var zoomIn = document.createElement('button'); zoomIn.textContent = '+'; zoomIn.title = 'Zoom in';
                            toolbar.appendChild(zoomOut); toolbar.appendChild(zoomLabel); toolbar.appendChild(zoomIn);
                            el.appendChild(toolbar);

                            var wrap = document.createElement('div');
                            wrap.className = 'er-doc-pdf-wrap';
                            wrap.style.cssText = 'width:100%;background:#525659;padding:12px;border-radius:8px;overflow:auto;';
                            el.appendChild(wrap);

                            var currentZoom = 1;
                            var _applyPdfZoom = function () {
                                var canvases = wrap.querySelectorAll('canvas');
                                canvases.forEach(function (c) { c.style.width = (100 * currentZoom) + '%'; c.style.maxWidth = 'none'; });
                                zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
                            };
                            zoomOut.onclick = function () { currentZoom = Math.max(0.5, currentZoom - 0.25); _applyPdfZoom(); };
                            zoomIn.onclick = function () { currentZoom = Math.min(3, currentZoom + 0.25); _applyPdfZoom(); };

                            var containerWidth = wrap.clientWidth || el.clientWidth || 500;
                            var numPages = Math.min(pdfDoc.numPages, 50);
                            var renderNext = function (pageNum) {
                                if (pageNum > numPages) {
                                    if (pdfDoc.numPages > 50) {
                                        var more = document.createElement('div');
                                        more.style.cssText = 'text-align:center;color:#94a3b8;font-size:12px;padding:8px;';
                                        more.textContent = '\u2026 Showing first 50 of ' + pdfDoc.numPages + ' pages. Use Download for full file.';
                                        wrap.appendChild(more);
                                    }
                                    el.setAttribute('data-er-loaded', '1');
                                    _log('loadable[' + idx + '] PDF displayed (PDF.js), pages=' + numPages);
                                    return;
                                }
                                return pdfDoc.getPage(pageNum).then(function (page) {
                                    var desiredWidth = Math.max(containerWidth - 24, 450);
                                    var defaultViewport = page.getViewport({ scale: 1 });
                                    var scale = Math.max(1.5, desiredWidth / defaultViewport.width);
                                    var viewport = page.getViewport({ scale: scale });
                                    var canvas = document.createElement('canvas');
                                    var ctx = canvas.getContext('2d');
                                    canvas.height = viewport.height;
                                    canvas.width = viewport.width;
                                    canvas.style.cssText = 'display:block;margin:0 auto 12px;max-width:100%;height:auto;box-shadow:0 2px 8px rgba(0,0,0,.3);border-radius:4px;';
                                    wrap.appendChild(canvas);
                                    return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () { return renderNext(pageNum + 1); });
                                });
                            };
                            return renderNext(1);
                        }).catch(function (err) {
                            _log('loadable[' + idx + '] PDF.js FAILED, using fallback', { error: err && err.message });
                            el.innerHTML = '';
                            showPdfFallback();
                        });
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
        var totalTabs = document.querySelectorAll('.er-file-tab').length;
        if (totalTabs > 1) {
            document.querySelectorAll('.er-table[data-er-field]').forEach(function (table) {
                var rows = table.querySelectorAll('tbody tr[data-row-idx]');
                if (rows.length === totalTabs) {
                    rows.forEach(function (row) {
                        row.style.display = (parseInt(row.getAttribute('data-row-idx'), 10) === idx) ? '' : 'none';
                    });
                }
            });
            document.querySelectorAll('[data-er-field] > .er-card[data-row-idx]').forEach(function (card) {
                var cardParent = card.parentElement;
                var cards = cardParent.querySelectorAll('.er-card[data-row-idx]');
                if (cards.length === totalTabs) {
                    card.style.display = (parseInt(card.getAttribute('data-row-idx'), 10) === idx) ? '' : 'none';
                }
            });
        }
    };

    window._afErFieldChanged = function (el) {
        if (!el) return;
        if (el.classList.contains('er-card-input')) el.classList.add('er-card-input--edited');
        else if (el.classList.contains('er-table-input')) el.classList.add('er-table-input--edited');
        else el.classList.add('er-field-input--edited');
    };

    // Editable line items parts table: update the underlying hidden raw value (real state key)
    // whenever a user edits any "Part" input.
    window._afErLineItemPartsChanged = function (el) {
        try {
            if (!el) return;
            el.style.borderBottomColor = 'var(--warning,#f59e0b)';
            var tr = el.closest('tr');
            if (!tr) return;
            var hidden = tr.querySelector('input[data-er-lineitem-hidden="1"][data-er-key]');
            if (!hidden) return;
            var sep = (hidden.getAttribute('data-er-sep') || ',').trim() || ',';
            var joiner = ', ';
            if (sep === '|') joiner = ' | ';
            else if (sep === ';') joiner = '; ';
            else if (sep === ',') joiner = ', ';
            else joiner = sep + ' ';
            var parts = Array.prototype.slice.call(tr.querySelectorAll('input.er-lineitem-part-input')).map(function (p) {
                return (p && p.value != null) ? String(p.value).trim() : '';
            });
            // Trim empty trailing parts so we don't generate noisy separators at the end
            while (parts.length && !parts[parts.length - 1]) parts.pop();
            var raw = parts.join(joiner);
            hidden.value = raw;
            if (window._afErFieldChanged) window._afErFieldChanged(hidden);
        } catch (_) { /* ignore */ }
    };

    window.afRenderReviewData = afRenderReviewData;
    window.afRenderExtractionReview = afRenderExtractionReview;
    window.afLoadExtractionReviewMedia = afLoadExtractionReviewMedia;
    window.afDownloadProcessUploadFile = afDownloadProcessUploadFile;
    _afErSetupObserver();
})();
