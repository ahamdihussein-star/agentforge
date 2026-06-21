/*
 * AgentForge centralized icon system.
 * Replaces emoji glyphs in the rendered UI with professional, brand-coordinated
 * SVG icons (gradient stroke for brand/feature icons, semantic colors for status).
 * Works across all pages + dynamically rendered content (MutationObserver).
 * Skips inputs, code, scripts, and anything marked data-no-icon.
 *
 * Safe to remove emojis everywhere visible without editing 1,800 call sites.
 */
(function () {
  'use strict';
  if (window.__afIconsInstalled) return;
  window.__afIconsInstalled = true;

  // ---- 1. Brand gradient defs (inject once; themed via CSS accent vars) ----
  function ensureDefs() {
    if (document.getElementById('afGrad')) return;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML =
      '<defs>' +
      '<linearGradient id="afGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="var(--accent-primary, #6d5efc)"/>' +
      '<stop offset="100%" stop-color="var(--accent-secondary, #18b6c9)"/>' +
      '</linearGradient></defs>';
    (document.body || document.documentElement).appendChild(svg);
  }

  // ---- 2. Icon library: emoji (base char, no VS16) -> [paths, mode] ----
  // mode: undefined = gradient stroke; 'cc' = currentColor stroke;
  //       'g:#hex' = colored stroke; 'f:#hex' = filled dot (status).
  var G = 'url(#afGrad)';
  var I = {
    // status / feedback (semantic colors)
    '✅': ['<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', 'g:#16a34a'],
    '✓': ['<path d="M20 6 9 17l-5-5"/>', 'g:#16a34a'],
    '✔': ['<path d="M20 6 9 17l-5-5"/>', 'g:#16a34a'],
    '❌': ['<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>', 'g:#dc2626'],
    '✗': ['<path d="M18 6 6 18M6 6l12 12"/>', 'g:#dc2626'],
    '✘': ['<path d="M18 6 6 18M6 6l12 12"/>', 'g:#dc2626'],
    '✕': ['<path d="M18 6 6 18M6 6l12 12"/>', 'cc'],
    '⚠': ['<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', 'g:#d97706'],
    '⏳': ['<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>'],
    '⏰': ['<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3"/>'],
    '🟢': ['<circle cx="12" cy="12" r="7"/>', 'f:#16a34a'],
    '🔴': ['<circle cx="12" cy="12" r="7"/>', 'f:#dc2626'],
    '🟡': ['<circle cx="12" cy="12" r="7"/>', 'f:#eab308'],
    '🟠': ['<circle cx="12" cy="12" r="7"/>', 'f:#f97316'],
    '🔵': ['<circle cx="12" cy="12" r="7"/>', 'f:#3b82f6'],
    '🟣': ['<circle cx="12" cy="12" r="7"/>', 'f:#8b5cf6'],
    '🟤': ['<circle cx="12" cy="12" r="7"/>', 'f:#92400e'],
    '⚪': ['<circle cx="12" cy="12" r="7.5"/>', 'cc'],
    '⚫': ['<circle cx="12" cy="12" r="7"/>', 'f:#374151'],
    '🔶': ['<path d="M12 3 21 12 12 21 3 12z"/>', 'f:#f97316'],
    '🔷': ['<path d="M12 3 21 12 12 21 3 12z"/>', 'f:#3b82f6'],
    '🔸': ['<path d="M12 5 19 12 12 19 5 12z"/>', 'f:#f97316'],
    '🔹': ['<path d="M12 5 19 12 12 19 5 12z"/>', 'f:#3b82f6'],
    // navigation / arrows (neutral)
    '→': ['<path d="M5 12h14M13 6l6 6-6 6"/>', 'cc'],
    '←': ['<path d="M19 12H5M11 18l-6-6 6-6"/>', 'cc'],
    '↑': ['<path d="M12 19V5M6 11l6-6 6 6"/>', 'cc'],
    '↓': ['<path d="M12 5v14M6 13l6 6 6-6"/>', 'cc'],
    '⬇': ['<path d="M12 5v14M6 13l6 6 6-6"/>', 'cc'],
    '⬆': ['<path d="M12 19V5M6 11l6-6 6 6"/>', 'cc'],
    '⏭': ['<path d="M5 4 15 12 5 20zM19 5v14"/>', 'cc'],
    '▶': ['<path d="M6 4 20 12 6 20z"/>', 'cc'],
    '↺': ['<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', 'cc'],
    // brand / feature icons (gradient)
    '🔐': ['<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'],
    '🔒': ['<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'],
    '🔓': ['<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'],
    '🔑': ['<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>'],
    '🛡': ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'],
    '👥': ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'],
    '👤': ['<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'],
    '👁': ['<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'],
    '📋': ['<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>'],
    '🔍': ['<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'],
    '📄': ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>'],
    '📃': ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/>'],
    '📑': ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/>'],
    '📝': ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M11 18l5-5 2 2-5 5h-2z"/>'],
    '✏': ['<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'],
    '✍': ['<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'],
    '✨': ['<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>'],
    '⭐': ['<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'],
    '🌟': ['<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.6 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'],
    '🤖': ['<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>'],
    '🔧': ['<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    '🛠': ['<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    '⚙': ['<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'],
    '📊': ['<path d="M3 3v18h18"/><rect width="4" height="7" x="7" y="10" rx="1"/><rect width="4" height="11" x="14" y="6" rx="1"/>'],
    '📈': ['<path d="M3 3v18h18"/><path d="m7 13 3-3 3 3 5-5"/>'],
    '🗑': ['<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>'],
    '💬': ['<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
    '💭': ['<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'],
    '🔄': ['<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'],
    '🌐': ['<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>'],
    '🌍': ['<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>'],
    '📧': ['<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'],
    '📨': ['<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'],
    '📮': ['<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'],
    '🧪': ['<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>'],
    '🔌': ['<path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>'],
    '🎭': ['<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/>'],
    '🔗': ['<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'],
    '💡': ['<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>'],
    '🚀': ['<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2 2 0 0 0-3 0z"/><path d="M12 15 9 12a13 13 0 0 1 8-9 13 13 0 0 1 4 4 13 13 0 0 1-9 8z"/><path d="M9 12H4s.5-3 2-4 5 0 5 0"/><path d="M12 15v5s3-.5 4-2 0-5 0-5"/>'],
    '🎯': ['<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'],
    '🖼': ['<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'],
    '📷': ['<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>'],
    '💾': ['<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'],
    '📚': ['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'],
    '📖': ['<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'],
    '📘': ['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>'],
    '📙': ['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>'],
    '📗': ['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>'],
    '📕': ['<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/>'],
    '📦': ['<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'],
    '🧩': ['<path d="M19.4 12a2 2 0 1 0 0-4h-1V6a2 2 0 0 0-2-2h-2V3a2 2 0 1 0-4 0v1H8a2 2 0 0 0-2 2v2H5a2 2 0 1 0 0 4h1v2a2 2 0 0 0 2 2h2v1a2 2 0 1 0 4 0v-1h2a2 2 0 0 0 2-2v-2z"/>'],
    '🧠': ['<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/>'],
    '🏢': ['<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>'],
    '🏗': ['<path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>'],
    '⚡': ['<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'],
    '🗄': ['<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'],
    '🗃': ['<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>'],
    '📅': ['<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>'],
    '📆': ['<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/>'],
    '📤': ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 16V4M7 9l5-5 5 5"/>'],
    '📥': ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M12 4v12M7 11l5 5 5-5"/>'],
    '📭': ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M3 15h4l2 3h6l2-3h4"/>'],
    '📎': ['<path d="m21.4 11.1-9.2 9.2a5 5 0 0 1-7-7l9.1-9.2a3.3 3.3 0 0 1 4.7 4.7l-9.2 9.1a1.7 1.7 0 0 1-2.3-2.3l8.5-8.5"/>'],
    '🏷': ['<path d="M12.6 2.7a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2 2 0 0 0 2.8 0l6.9-6.9a2 2 0 0 0 0-2.8z"/><circle cx="7.5" cy="7.5" r="1"/>'],
    '🧾': ['<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M8 7h8M8 11h8M8 15h5"/>'],
    '🖥': ['<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>'],
    '💻': ['<rect width="18" height="12" x="3" y="4" rx="2"/><path d="M2 20h20"/>'],
    '📁': ['<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>'],
    '📂': ['<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>'],
    '🎨': ['<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>'],
    '➕': ['<path d="M12 5v14M5 12h14</path>', 'cc'],
    '➖': ['<path d="M5 12h14"/>', 'cc'],
    '☁': ['<path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.7 1.6A4 4 0 0 0 6 19z"/>'],
    '📐': ['<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2"/>'],
    '🎛': ['<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>'],
    '🔀': ['<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'],
    '📽': ['<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 9h20M7 5l3 4M12 5l3 4"/>'],
    '📹': ['<path d="m22 8-6 4 6 4z"/><rect width="14" height="12" x="2" y="6" rx="2"/>'],
    '🎤': ['<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>'],
    '🔊': ['<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/>'],
    '👑': ['<path d="m2 7 5 5 5-7 5 7 5-5-2 13H4z"/>'],
    '🦙': ['<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>'],
    '🟩': ['<rect width="16" height="16" x="4" y="4" rx="2"/>', 'f:#16a34a'],
    '⏸': ['<rect width="4" height="14" x="6" y="5" rx="1"/><rect width="4" height="14" x="14" y="5" rx="1"/>', 'cc']
  };

  var keys = Object.keys(I).sort(function (a, b) { return b.length - a.length; });
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var SPLIT = new RegExp('(' + keys.map(esc).join('|') + ')\\uFE0F?', 'g');
  var TEST = new RegExp('(' + keys.map(esc).join('|') + ')', '');

  function svgFor(emo) {
    var def = I[emo]; if (!def) return null;
    var paths = def[0], mode = def[1] || '';
    var stroke = G, fill = 'none', strip = '';
    if (mode === 'cc') stroke = 'currentColor';
    else if (mode.indexOf('g:') === 0) stroke = mode.slice(2);
    else if (mode.indexOf('f:') === 0) { fill = mode.slice(2); stroke = 'none'; }
    return '<svg class="afi" viewBox="0 0 24 24" width="1em" height="1em" fill="' + fill +
      '" stroke="' + stroke + '" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="display:inline-block;vertical-align:-0.14em;flex:none" aria-hidden="true" focusable="false">' +
      paths + '</svg>';
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, OPTION: 1, SELECT: 1, NOSCRIPT: 1, SVG: 1 };

  function shouldSkip(el) {
    while (el && el.nodeType === 1) {
      var t = el.nodeName;
      if (SKIP_TAGS[t] || (t && t.toLowerCase() === 'svg')) return true;
      if (el.isContentEditable) return true;
      if (el.hasAttribute && el.hasAttribute('data-no-icon')) return true;
      el = el.parentNode;
    }
    return false;
  }

  function replaceNode(textNode) {
    var v = textNode.nodeValue;
    if (!v || !TEST.test(v)) return;
    SPLIT.lastIndex = 0;
    var frag = document.createDocumentFragment();
    var last = 0, m, any = false;
    while ((m = SPLIT.exec(v)) !== null) {
      var emo = m[1];
      var html = svgFor(emo);
      if (!html) continue;
      any = true;
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      var span = document.createElement('span');
      span.className = 'afi-w';
      span.setAttribute('data-afi', '1');
      span.innerHTML = html;
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (!any) return;
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!shouldSkip(root.parentNode)) replaceNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && shouldSkip(root)) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var batch = [], n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue && TEST.test(n.nodeValue) && !shouldSkip(n.parentNode)) batch.push(n);
    }
    for (var i = 0; i < batch.length; i++) replaceNode(batch[i]);
  }

  var queued = false, pending = [];
  function flush() {
    queued = false;
    var nodes = pending; pending = [];
    for (var i = 0; i < nodes.length; i++) {
      try { scan(nodes[i]); } catch (e) { /* never break the app over an icon */ }
    }
  }
  function enqueue(node) {
    pending.push(node);
    if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(flush, 16); }
  }

  function start() {
    ensureDefs();
    try { scan(document.body); } catch (e) {}
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === 'characterData') { enqueue(mu.target); continue; }
        for (var j = 0; j < mu.addedNodes.length; j++) {
          var an = mu.addedNodes[j];
          if (an.nodeType === 1 && an.getAttribute && an.getAttribute('data-afi')) continue;
          enqueue(an);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.__afIconObserver = obs;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
