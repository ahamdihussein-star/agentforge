/*
 * Shared AgentForge app sidebar.
 * Gives Lab + Process Builder the SAME left navigation shell as the admin SPA,
 * so the product feels like one app. Self-contained: only depends on theme.css
 * variables (loaded everywhere). Set window.__afActiveNav before this script to
 * highlight the current item (e.g. 'lab', 'create').
 */
(function () {
  'use strict';
  if (window.__afSidebarInstalled) return;
  window.__afSidebarInstalled = true;

  var active = window.__afActiveNav || '';
  var BASE = '/ui/index.html';

  var ITEMS = [
    ['dashboard', 'Dashboard', BASE + '#dashboard', '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'],
    ['agents', 'Agent Hub', BASE + '#agents', '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'],
    ['tools', 'Tools', BASE + '#tools', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    ['chat', 'Conversational Agents', BASE + '#chat', '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
    ['processes', 'Process Agents', BASE + '#processes', '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>'],
    ['settings', 'Settings', BASE + '#settings', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>']
  ];

  var css =
    '#af-shell-sidebar{position:fixed;top:0;left:0;bottom:0;width:256px;z-index:1000;display:flex;flex-direction:column;' +
    'background:var(--sidebar-bg,#16161e);border-right:1px solid var(--border-color,#475569);font-family:Inter,sans-serif;}' +
    '#af-shell-sidebar .afs-brand{display:flex;align-items:center;gap:12px;padding:18px 16px;border-bottom:1px solid var(--border-color,#475569);}' +
    '#af-shell-sidebar .afs-brand img{width:40px;height:40px;border-radius:12px;}' +
    '#af-shell-sidebar .afs-brand b{font-size:1.1rem;font-weight:800;color:var(--accent-primary,#8b5cf6);line-height:1.1;}' +
    '#af-shell-sidebar .afs-brand span{font-size:.7rem;color:var(--text-muted,#6b7280);}' +
    '#af-shell-sidebar .afs-nav{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:4px;}' +
    '#af-shell-sidebar a.afs-item{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;color:var(--text-secondary,#94a3b8);' +
    'text-decoration:none;font-size:.92rem;font-weight:500;transition:background .15s,color .15s;}' +
    '#af-shell-sidebar a.afs-item:hover{background:var(--sidebar-active,rgba(139,92,246,.15));color:var(--text-primary,#f1f5f9);}' +
    '#af-shell-sidebar a.afs-item.active{background:var(--sidebar-active,rgba(139,92,246,.3));color:var(--text-primary,#f1f5f9);font-weight:600;}' +
    '#af-shell-sidebar a.afs-item svg{width:20px;height:20px;flex:none;}' +
    '#af-shell-sidebar .afs-foot{border-top:1px solid var(--border-color,#475569);padding:14px 12px;}' +
    '#af-shell-sidebar .afs-user{display:flex;align-items:center;gap:10px;padding:6px 6px 12px;}' +
    '#af-shell-sidebar .afs-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;}' +
    '#af-shell-sidebar .afs-uname{font-size:.85rem;font-weight:600;color:var(--text-primary,#f1f5f9);}' +
    '#af-shell-sidebar .afs-umail{font-size:.7rem;color:var(--text-muted,#6b7280);}' +
    '#af-shell-sidebar .afs-logout{width:100%;text-align:left;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;gap:10px;' +
    'padding:10px 14px;border-radius:10px;color:var(--text-secondary,#94a3b8);font-size:.85rem;font-family:inherit;}' +
    '#af-shell-sidebar .afs-logout:hover{background:var(--sidebar-active,rgba(139,92,246,.15));color:var(--text-primary,#f1f5f9);}' +
    '@media(min-width:768px){body{padding-left:256px !important;}}' +
    '@media(max-width:767px){#af-shell-sidebar{display:none;}}';

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function userInfo() {
    try {
      var raw = localStorage.getItem('agentforge_user') || sessionStorage.getItem('agentforge_user');
      if (!raw) return { name: '', email: '' };
      var u = JSON.parse(raw);
      return { name: u.name || (u.email ? u.email.split('@')[0] : 'User'), email: u.email || '' };
    } catch (e) { return { name: '', email: '' }; }
  }

  function build() {
    if (document.getElementById('af-shell-sidebar')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var u = userInfo();
    var initial = (u.name || 'U').charAt(0).toUpperCase();
    var nav = ITEMS.map(function (it) {
      var cls = 'afs-item' + (it[0] === active ? ' active' : '');
      return '<a class="' + cls + '" href="' + it[2] + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + it[3] + '</svg>' +
        '<span>' + it[1] + '</span></a>';
    }).join('');

    var aside = document.createElement('aside');
    aside.id = 'af-shell-sidebar';
    aside.innerHTML =
      '<div class="afs-brand"><img src="/AgentForge_Logo.png" alt="AgentForge" onerror="this.style.display=\'none\'"><div><b>AgentForge</b><br><span>AI Agent Builder</span></div></div>' +
      '<nav class="afs-nav">' + nav + '</nav>' +
      '<div class="afs-foot">' +
        '<div class="afs-user"><div class="afs-avatar" id="afs-avatar">' + esc(initial) + '</div>' +
        '<div><div class="afs-uname" id="afs-uname">' + esc(u.name || 'Account') + '</div><div class="afs-umail">' + esc(u.email) + '</div></div></div>' +
        '<button class="afs-logout" id="afs-logout"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><span>Logout</span></button>' +
      '</div>';
    document.body.insertBefore(aside, document.body.firstChild);

    document.getElementById('afs-logout').addEventListener('click', function () {
      try {
        localStorage.removeItem('agentforge_token'); localStorage.removeItem('agentforge_user');
        sessionStorage.removeItem('agentforge_token'); sessionStorage.removeItem('agentforge_user');
      } catch (e) {}
      window.location.href = '/ui/';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
