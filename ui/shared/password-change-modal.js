(function () {
  const MODAL_ID = 'af-password-change-modal';

  const DEFAULT_POLICY = {
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_symbols: true,
  };

  function _safeToast(message, type) {
    try {
      if (typeof window.showToast === 'function') return window.showToast(message, type);
      if (typeof window.NotificationSystem?.show === 'function') return window.NotificationSystem.show(message, type);
      if (typeof window.alert === 'function' && type === 'error') return window.alert(String(message || ''));
    } catch (_) {}
  }

  function _getToken(tokenGetter) {
    try {
      const t = tokenGetter ? tokenGetter() : '';
      if (t) return t;
    } catch (_) {}
    try {
      return (
        localStorage.getItem('agentforge_token') ||
        sessionStorage.getItem('agentforge_token') ||
        ''
      );
    } catch (_) {
      return '';
    }
  }

  async function _fetchPolicy(apiBase, token) {
    const base = apiBase || '';
    const res = await fetch(`${base}/api/security/auth/password-policy`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const txt = await res.text();
    let obj = {};
    try {
      obj = txt ? JSON.parse(txt) : {};
    } catch (_) {
      obj = {};
    }
    if (!res.ok) throw new Error(obj?.detail || 'Unable to load password rules');
    return { ...DEFAULT_POLICY, ...(obj || {}) };
  }

  function _hasUpper(s) {
    return /[A-Z]/.test(s);
  }
  function _hasLower(s) {
    return /[a-z]/.test(s);
  }
  function _hasNumber(s) {
    return /[0-9]/.test(s);
  }
  function _hasSymbol(s) {
    return /[^a-zA-Z0-9]/.test(s);
  }

  function _buildChecks(policy, password) {
    const minLen = Number(policy?.password_min_length || 8);
    const checks = [
      { id: 'len', label: `At least ${minLen} characters`, ok: (password || '').length >= minLen },
    ];
    if (policy?.password_require_uppercase) checks.push({ id: 'upper', label: 'At least 1 uppercase letter', ok: _hasUpper(password || '') });
    if (policy?.password_require_lowercase) checks.push({ id: 'lower', label: 'At least 1 lowercase letter', ok: _hasLower(password || '') });
    if (policy?.password_require_numbers) checks.push({ id: 'num', label: 'At least 1 number', ok: _hasNumber(password || '') });
    if (policy?.password_require_symbols) checks.push({ id: 'sym', label: 'At least 1 symbol', ok: _hasSymbol(password || '') });
    return checks;
  }

  function _strengthScore(password) {
    // Generic UX signal (doesn’t replace server validation).
    let score = 0;
    if ((password || '').length >= 8) score++;
    if (_hasUpper(password || '') && _hasLower(password || '')) score++;
    if (_hasNumber(password || '')) score++;
    if (_hasSymbol(password || '')) score++;
    return Math.min(4, score);
  }

  function _setStrengthUI(score) {
    const bars = [
      document.getElementById('af-pass-bar-1'),
      document.getElementById('af-pass-bar-2'),
      document.getElementById('af-pass-bar-3'),
      document.getElementById('af-pass-bar-4'),
    ].filter(Boolean);
    const label = document.getElementById('af-pass-strength-text');
    const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e'];
    const texts = ['Weak', 'Fair', 'Good', 'Strong'];
    bars.forEach((b, idx) => {
      b.style.background = idx < score ? colors[Math.max(0, score - 1)] : 'rgba(148,163,184,0.25)';
    });
    if (label) {
      label.textContent = score > 0 ? texts[score - 1] : '';
      label.style.color = score > 0 ? colors[Math.max(0, score - 1)] : 'rgba(148,163,184,0.75)';
    }
  }

  function _renderChecks(checks) {
    const box = document.getElementById('af-pass-checklist');
    if (!box) return;
    box.innerHTML = checks
      .map((c) => {
        const color = c.ok ? 'rgba(34,197,94,1)' : 'rgba(148,163,184,0.9)';
        const bg = c.ok ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.10)';
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:${bg};">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:${c.ok ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.18)'};color:${color};font-weight:700;font-size:12px;">
              ${c.ok ? '✓' : '•'}
            </span>
            <span style="color:${color};font-size:13px;">${c.label}</span>
          </div>
        `;
      })
      .join('');
  }

  function _togglePassword(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.textContent = isHidden ? 'Hide' : 'Show';
  }

  function _removeModal() {
    try {
      document.getElementById(MODAL_ID)?.remove();
    } catch (_) {}
  }

  async function _submitChange({ apiBase, token, newPass, confirmPass }) {
    const base = apiBase || '';
    const res = await fetch(`${base}/api/security/auth/first-login-password-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_password: newPass, confirm_password: confirmPass }),
    });
    const txt = await res.text();
    let obj = {};
    try {
      obj = txt ? JSON.parse(txt) : {};
    } catch (_) {
      obj = {};
    }
    if (!res.ok) {
      const msg =
        (obj && typeof obj.detail === 'object' ? (obj.detail.message || JSON.stringify(obj.detail)) : obj.detail) ||
        'Unable to change password';
      throw new Error(msg);
    }
    return obj;
  }

  window.afShowFirstLoginPasswordModal = async function afShowFirstLoginPasswordModal(options) {
    const apiBase = options?.apiBase || '';
    const token = _getToken(options?.tokenGetter);
    if (!token) {
      _safeToast('You are not signed in. Please sign in again.', 'error');
      return;
    }

    _removeModal();

    let policy = { ...DEFAULT_POLICY };
    try {
      policy = await _fetchPolicy(apiBase, token);
    } catch (e) {
      // Non-blocking — we can still rely on server-side validation.
      policy = { ...DEFAULT_POLICY };
    }

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div id="af-pass-backdrop" style="position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px)"></div>
      <div style="position:relative;background:var(--bg-card, #111827);border-radius:16px;padding:24px;width:100%;max-width:520px;margin:16px;border:1px solid rgba(148,163,184,0.18);">
        <div style="text-align:center;margin-bottom:16px;">
          <h3 style="font-size:1.25rem;font-weight:800;margin-bottom:6px;color:var(--text-primary, #fff);">Change Your Password</h3>
          <p style="color:var(--text-muted, rgba(148,163,184,0.9));font-size:0.95rem;line-height:1.4;">
            For security, you must change your temporary password.
          </p>
        </div>

        <form id="af-pass-form">
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="display:block;font-size:0.85rem;color:var(--text-muted, rgba(148,163,184,0.9));margin-bottom:6px;">New Password</label>
              <div style="display:flex;gap:10px;align-items:center;">
                <input type="password" id="af-new-pass" autocomplete="new-password" required
                  style="flex:1;padding:12px;border-radius:10px;background:var(--bg-input, rgba(17,24,39,0.65));border:1px solid var(--border-color, rgba(148,163,184,0.25));color:var(--text-primary, #fff);outline:none;">
                <button type="button" id="af-toggle-new" style="padding:10px 12px;border-radius:10px;background:rgba(148,163,184,0.12);border:1px solid rgba(148,163,184,0.18);color:var(--text-primary, #fff);cursor:pointer;">
                  Show
                </button>
              </div>
            </div>

            <div>
              <label style="display:block;font-size:0.85rem;color:var(--text-muted, rgba(148,163,184,0.9));margin-bottom:6px;">Confirm Password</label>
              <div style="display:flex;gap:10px;align-items:center;">
                <input type="password" id="af-confirm-pass" autocomplete="new-password" required
                  style="flex:1;padding:12px;border-radius:10px;background:var(--bg-input, rgba(17,24,39,0.65));border:1px solid var(--border-color, rgba(148,163,184,0.25));color:var(--text-primary, #fff);outline:none;">
                <button type="button" id="af-toggle-confirm" style="padding:10px 12px;border-radius:10px;background:rgba(148,163,184,0.12);border:1px solid rgba(148,163,184,0.18);color:var(--text-primary, #fff);cursor:pointer;">
                  Show
                </button>
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:10px;margin-top:2px;">
              <div style="flex:1;display:flex;gap:6px;">
                <div id="af-pass-bar-1" style="height:6px;border-radius:999px;background:rgba(148,163,184,0.25);flex:1"></div>
                <div id="af-pass-bar-2" style="height:6px;border-radius:999px;background:rgba(148,163,184,0.25);flex:1"></div>
                <div id="af-pass-bar-3" style="height:6px;border-radius:999px;background:rgba(148,163,184,0.25);flex:1"></div>
                <div id="af-pass-bar-4" style="height:6px;border-radius:999px;background:rgba(148,163,184,0.25);flex:1"></div>
              </div>
              <div id="af-pass-strength-text" style="min-width:70px;text-align:right;font-size:12px;color:rgba(148,163,184,0.75)"></div>
            </div>

            <div id="af-pass-checklist" style="display:flex;flex-direction:column;gap:8px;margin-top:6px;"></div>

            <div id="af-pass-error" style="display:none;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.35);color:#fecaca;padding:10px 12px;border-radius:10px;font-size:0.85rem;"></div>

            <button type="submit" id="af-pass-submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:var(--accent, #7c3aed);color:white;font-weight:800;cursor:pointer;opacity:0.95;">
              Change Password
            </button>

            <button type="button" id="af-pass-cancel" style="width:100%;padding:10px;border:none;border-radius:10px;background:rgba(148,163,184,0.12);color:var(--text-primary, #fff);font-weight:600;cursor:pointer;">
              Not now
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const backdrop = document.getElementById('af-pass-backdrop');
    if (backdrop) backdrop.onclick = () => _removeModal();

    const btnCancel = document.getElementById('af-pass-cancel');
    if (btnCancel) btnCancel.onclick = () => _removeModal();

    const btnToggleNew = document.getElementById('af-toggle-new');
    const btnToggleConfirm = document.getElementById('af-toggle-confirm');
    if (btnToggleNew) btnToggleNew.onclick = () => _togglePassword('af-new-pass', 'af-toggle-new');
    if (btnToggleConfirm) btnToggleConfirm.onclick = () => _togglePassword('af-confirm-pass', 'af-toggle-confirm');

    const newInput = document.getElementById('af-new-pass');
    const confirmInput = document.getElementById('af-confirm-pass');
    const errorBox = document.getElementById('af-pass-error');
    const submitBtn = document.getElementById('af-pass-submit');

    function setError(msg) {
      if (!errorBox) return;
      if (!msg) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
        return;
      }
      errorBox.style.display = 'block';
      errorBox.textContent = String(msg);
    }

    function updateUI() {
      const p = (newInput?.value || '').trim();
      const c = (confirmInput?.value || '').trim();
      const checks = _buildChecks(policy, p);
      _renderChecks(checks);
      _setStrengthUI(_strengthScore(p));

      const meets = checks.every((x) => x.ok);
      const matches = p && c && p === c;
      if (submitBtn) {
        submitBtn.disabled = !(meets && matches);
        submitBtn.style.opacity = submitBtn.disabled ? '0.55' : '0.95';
        submitBtn.style.cursor = submitBtn.disabled ? 'not-allowed' : 'pointer';
      }
      if (c && p !== c) setError('Passwords do not match');
      else setError('');
    }

    if (newInput) newInput.oninput = updateUI;
    if (confirmInput) confirmInput.oninput = updateUI;
    updateUI();

    setTimeout(() => {
      try {
        newInput?.focus();
      } catch (_) {}
    }, 40);

    const form = document.getElementById('af-pass-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const p = (newInput?.value || '').trim();
        const c = (confirmInput?.value || '').trim();
        setError('');
        if (!p || !c) return;
        if (p !== c) {
          setError('Passwords do not match');
          return;
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Changing...';
          submitBtn.style.opacity = '0.75';
        }
        try {
          await _submitChange({ apiBase, token, newPass: p, confirmPass: c });
          _removeModal();
          try {
            if (typeof options?.onSuccess === 'function') options.onSuccess();
          } catch (_) {}
          _safeToast('Password changed successfully!', 'success');
        } catch (err) {
          setError(err?.message || 'Unable to change password');
        } finally {
          if (submitBtn) {
            submitBtn.textContent = 'Change Password';
            updateUI();
          }
        }
      };
    }
  };
})();

