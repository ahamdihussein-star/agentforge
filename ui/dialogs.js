// AgentForge reusable dialogs + toasts (single source of truth).
// Styling is controlled from ui/theme.css (AF component classes + variables).

(function () {
  'use strict';

  function _qsRootVar(name, fallback) {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name);
      const s = (v || '').trim();
      return s || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function _ensureHost(id, className) {
    let host = document.getElementById(id);
    if (host) return host;
    host = document.createElement('div');
    host.id = id;
    host.className = className;
    document.body.appendChild(host);
    return host;
  }

  function _toastHost() {
    return _ensureHost('af-toast-host', 'af-toast-host');
  }

  function afToast(message, type = 'info', opts = {}) {
    const host = _toastHost();
    const el = document.createElement('div');
    const t = String(type || 'info').toLowerCase();
    el.className = `af-toast af-toast--${t}`;

    const icon = document.createElement('div');
    icon.className = 'af-toast__icon';
    icon.textContent = t === 'success' ? '✓' : t === 'warning' ? '!' : t === 'error' || t === 'danger' ? '!' : 'i';

    const body = document.createElement('div');
    body.className = 'af-toast__body';
    body.textContent = String(message || '');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'af-toast__close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss');

    const remove = () => {
      try { el.remove(); } catch (_) {}
    };
    close.addEventListener('click', (e) => { e.stopPropagation(); remove(); });
    el.addEventListener('click', () => remove());

    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(close);
    host.appendChild(el);

    const duration = Math.max(1200, Math.min(12000, parseInt(opts.duration, 10) || (t === 'error' || t === 'danger' ? 5200 : t === 'warning' ? 4200 : 2600)));
    setTimeout(remove, duration);
  }

  function _modalHost() {
    return _ensureHost('af-modal-host', 'af-modal-host');
  }

  function _openModal(opts = {}) {
    const host = _modalHost();
    host.innerHTML = '';
    host.classList.add('af-modal-host--open');

    const variant = String(opts.variant || 'confirm'); // confirm | alert | prompt
    const title = String(opts.title || (variant === 'alert' ? 'Notice' : 'Confirm'));
    const message = String(opts.message || '');
    const danger = !!opts.danger;
    const confirmText = String(opts.confirmText || (variant === 'alert' ? 'OK' : 'Confirm'));
    const cancelText = String(opts.cancelText || 'Cancel');
    const multiline = !!opts.multiline;
    const placeholder = String(opts.placeholder || '');
    const defaultValue = (opts.defaultValue != null) ? String(opts.defaultValue) : '';
    const required = !!opts.required;

    const prevActive = document.activeElement;

    const overlay = document.createElement('div');
    overlay.className = 'af-overlay';

    const modal = document.createElement('div');
    modal.className = 'af-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'af-modal__header';

    const hTitle = document.createElement('div');
    hTitle.className = 'af-modal__title';
    hTitle.textContent = title;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'af-modal__close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');

    header.appendChild(hTitle);
    header.appendChild(close);

    const body = document.createElement('div');
    body.className = 'af-modal__body';

    const p = document.createElement('div');
    p.className = 'af-modal__message';
    p.textContent = message;
    body.appendChild(p);

    let inputEl = null;
    if (variant === 'prompt') {
      inputEl = document.createElement(multiline ? 'textarea' : 'input');
      inputEl.className = 'af-modal__input';
      if (!multiline) inputEl.type = 'text';
      if (multiline) inputEl.rows = 3;
      inputEl.placeholder = placeholder;
      inputEl.value = defaultValue;
      body.appendChild(inputEl);
    }

    const footer = document.createElement('div');
    footer.className = 'af-modal__footer';

    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.className = 'af-btn af-btn--secondary';
    btnCancel.textContent = cancelText;

    const btnConfirm = document.createElement('button');
    btnConfirm.type = 'button';
    btnConfirm.className = `af-btn ${danger ? 'af-btn--danger' : 'af-btn--primary'}`;
    btnConfirm.textContent = confirmText;

    if (variant !== 'alert') footer.appendChild(btnCancel);
    footer.appendChild(btnConfirm);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);

    host.appendChild(overlay);
    host.appendChild(modal);

    const cleanup = () => {
      try { host.classList.remove('af-modal-host--open'); } catch (_) {}
      try { host.innerHTML = ''; } catch (_) {}
      try { document.removeEventListener('keydown', onKey, true); } catch (_) {}
      try { prevActive && prevActive.focus && prevActive.focus(); } catch (_) {}
    };

    const resolveAndClose = (val, resolve) => {
      cleanup();
      resolve(val);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // prompt: null. others: false
        _pendingResolve && _pendingResolve(variant === 'prompt' ? null : false);
        return;
      }
      if (e.key === 'Enter') {
        if (variant === 'prompt' && multiline && e.target === inputEl) return;
        e.preventDefault();
        btnConfirm.click();
      }
    };
    document.addEventListener('keydown', onKey, true);

    let _pendingResolve = null;
    return new Promise((resolve) => {
      _pendingResolve = (val) => resolveAndClose(val, resolve);

      overlay.addEventListener('click', () => _pendingResolve(variant === 'prompt' ? null : false));
      close.addEventListener('click', () => _pendingResolve(variant === 'prompt' ? null : false));
      btnCancel.addEventListener('click', () => _pendingResolve(variant === 'prompt' ? null : false));

      btnConfirm.addEventListener('click', () => {
        if (variant === 'alert' || variant === 'confirm') {
          _pendingResolve(true);
          return;
        }
        const val = inputEl ? String(inputEl.value || '').trim() : '';
        if (required && !val) {
          try { inputEl.focus(); } catch (_) {}
          return;
        }
        _pendingResolve(val);
      });

      setTimeout(() => {
        try { (inputEl || btnConfirm).focus(); } catch (_) {}
      }, 0);
    });
  }

  async function afConfirm(message, options = {}) {
    return !!(await _openModal({
      variant: 'confirm',
      title: options.title || 'Confirm',
      message: String(message || ''),
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      danger: !!options.danger
    }));
  }

  async function afAlert(message, options = {}) {
    await _openModal({
      variant: 'alert',
      title: options.title || 'Notice',
      message: String(message || ''),
      confirmText: options.buttonText || options.confirmText || 'OK',
      danger: false
    });
    return true;
  }

  async function afPrompt(message, options = {}) {
    const out = await _openModal({
      variant: 'prompt',
      title: options.title || 'Add a note',
      message: String(message || ''),
      confirmText: options.confirmText || 'Save',
      cancelText: options.cancelText || 'Cancel',
      danger: !!options.danger,
      defaultValue: options.defaultValue || '',
      placeholder: options.placeholder || '',
      multiline: options.multiline !== false,
      required: !!options.required
    });
    return out === null ? null : String(out);
  }

  // Expose globals
  try {
    window.afToast = afToast;
    window.afConfirm = afConfirm;
    window.afAlert = afAlert;
    window.afPrompt = afPrompt;

    // Backward compatible aliases used in the codebase
    window.uiConfirm = window.uiConfirm || afConfirm;
    window.uiAlert = window.uiAlert || afAlert;
    window.uiPrompt = window.uiPrompt || afPrompt;
    window.pbToast = window.pbToast || afToast;
    window.pbConfirm = window.pbConfirm || afConfirm;
    window.pbAlert = window.pbAlert || afAlert;
  } catch (_) { /* ignore */ }
})();

