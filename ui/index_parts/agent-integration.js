/* Agent API & Integration modal — expose an agent on web/mobile/web-app.
 * Conversational agents -> embeddable chat widget + chat API.
 * Process agents -> run (trigger) API + status polling.
 * Self-contained; theme-aware (uses theme.css variables). */
(function () {
  "use strict";

  function authHeaders() { try { return (typeof getAuthHeaders === "function") ? getAuthHeaders() : {}; } catch (e) { return {}; } }
  function esc(t) { var d = document.createElement("div"); d.textContent = (t == null ? "" : String(t)); return d.innerHTML; }
  function toast(m, t) { try { if (typeof showToast === "function") showToast(m, t || "info"); } catch (e) {} }

  function copy(text, btn) {
    try {
      navigator.clipboard.writeText(text).then(function () {
        if (btn) { var o = btn.textContent; btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = o; }, 1400); }
      });
    } catch (e) { toast("Copy failed", "error"); }
  }
  window.__afCopy = copy;

  function block(label, code) {
    var id = "afc_" + Math.random().toString(36).slice(2);
    window["__afsnip_" + id] = code;
    return '<div style="margin:14px 0;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.03em;">' + esc(label) + '</span>' +
      '<button onclick="__afCopy(window[\'__afsnip_' + id + '\'],this)" style="font-size:12px;padding:4px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);cursor:pointer;">Copy</button>' +
      '</div>' +
      '<pre style="margin:0;background:color-mix(in srgb,var(--text-primary) 6%,var(--bg-card));border:1px solid var(--border-color);border-radius:10px;padding:12px;overflow:auto;font-size:12.5px;line-height:1.5;color:var(--text-primary);white-space:pre;"><code>' + esc(code) + '</code></pre>' +
      '</div>';
  }

  function snippets(info) {
    var id = info.agent_id, key = info.api_key || "YOUR_API_KEY", base = info.base_url || "";
    var name = info.agent_name || "Agent";
    if (info.agent_type === "process") {
      var runEp = info.endpoint;
      var statusEp = (info.status_endpoint || "").replace("{execution_id}", "EXECUTION_ID");
      var curl = "curl -X POST " + runEp + " \\\n" +
        "  -H 'Content-Type: application/json' \\\n" +
        "  -H 'X-API-Key: " + key + "' \\\n" +
        "  -d '{\"input\": {\"example_field\": \"value\"}}'";
      var js = "// Trigger the process\n" +
        "const r = await fetch('" + runEp + "', {\n" +
        "  method: 'POST',\n" +
        "  headers: { 'Content-Type': 'application/json', 'X-API-Key': '" + key + "' },\n" +
        "  body: JSON.stringify({ input: { /* your fields */ } })\n" +
        "});\n" +
        "const { execution_id } = await r.json();\n\n" +
        "// Poll status\n" +
        "const s = await fetch(`" + (info.status_endpoint || "").replace("{execution_id}", "${execution_id}") + "`,\n" +
        "  { headers: { 'X-API-Key': '" + key + "' } });\n" +
        "console.log(await s.json());";
      return '<p style="font-size:13px;color:var(--text-secondary);margin:4px 0 8px;">This is a <b>Process</b> agent — trigger a run with input, then poll for status/result.</p>' +
        block("Run (cURL)", curl) + block("Run + poll (JavaScript)", js);
    }
    // Conversational
    var embed = '<script src="' + base + '/ui/embed/agent-widget.js"\n' +
      '        data-agent-id="' + id + '"\n' +
      '        data-api-key="' + key + '"\n' +
      '        data-title="' + name + '"><\/script>';
    var curlc = "curl -X POST " + info.endpoint + " \\\n" +
      "  -H 'Content-Type: application/json' \\\n" +
      "  -H 'X-API-Key: " + key + "' \\\n" +
      "  -d '{\"message\": \"Hello\"}'";
    var jsc = "const r = await fetch('" + info.endpoint + "', {\n" +
      "  method: 'POST',\n" +
      "  headers: { 'Content-Type': 'application/json', 'X-API-Key': '" + key + "' },\n" +
      "  body: JSON.stringify({ message: 'Hello', conversation_id: null })\n" +
      "});\n" +
      "const data = await r.json();\n" +
      "console.log(data.response); // reply  | keep data.conversation_id for follow-ups";
    var swift = "var req = URLRequest(url: URL(string: \"" + info.endpoint + "\")!)\n" +
      "req.httpMethod = \"POST\"\n" +
      "req.setValue(\"application/json\", forHTTPHeaderField: \"Content-Type\")\n" +
      "req.setValue(\"" + key + "\", forHTTPHeaderField: \"X-API-Key\")\n" +
      "req.httpBody = try JSONSerialization.data(withJSONObject: [\"message\": \"Hello\"])\n" +
      "let (data, _) = try await URLSession.shared.data(for: req)";
    return '<p style="font-size:13px;color:var(--text-secondary);margin:4px 0 8px;">Drop this one line on any website to add the chatbot (same engine, guardrails & tools as in-platform).</p>' +
      block("Embed on a website (one line)", embed) +
      block("Web app / backend (JavaScript)", jsc) +
      block("Mobile (Swift)", swift) +
      block("REST (cURL)", curlc);
  }

  function docMarkdown(info) {
    var lines = [];
    lines.push("# " + (info.agent_name || "Agent") + " — Integration Guide");
    lines.push("");
    lines.push("- Agent ID: `" + info.agent_id + "`");
    lines.push("- Type: " + (info.agent_type || "conversational"));
    lines.push("- API key: `" + (info.api_key || "") + "`  (keep this secret)");
    lines.push("- Endpoint: `" + info.endpoint + "`");
    if (info.agent_type === "process" && info.status_endpoint) lines.push("- Status: `" + info.status_endpoint + "`");
    lines.push("");
    lines.push("Authenticate every request with the header `X-API-Key: " + (info.api_key || "") + "`.");
    lines.push("");
    if (info.agent_type === "process") {
      lines.push("## Trigger a run");
      lines.push("```bash");
      lines.push("curl -X POST " + info.endpoint + " -H 'Content-Type: application/json' -H 'X-API-Key: " + (info.api_key || "") + "' -d '{\"input\": {}}'");
      lines.push("```");
    } else {
      lines.push("## Embed on a website (one line)");
      lines.push("```html");
      lines.push('<script src="' + (info.base_url || "") + '/ui/embed/agent-widget.js" data-agent-id="' + info.agent_id + '" data-api-key="' + (info.api_key || "") + '"><\/script>');
      lines.push("```");
      lines.push("");
      lines.push("## Call from code");
      lines.push("```bash");
      lines.push("curl -X POST " + info.endpoint + " -H 'Content-Type: application/json' -H 'X-API-Key: " + (info.api_key || "") + "' -d '{\"message\": \"Hello\"}'");
      lines.push("```");
    }
    return lines.join("\n");
  }
  function downloadDoc(info) {
    var blob = new Blob([docMarkdown(info)], { type: "text/markdown" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (info.agent_name || "agent").replace(/[^a-z0-9]+/gi, "_") + "_integration.md";
    a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function render(info) {
    var modal = document.getElementById("af-integration-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "af-integration-modal";
      modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;";
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) { if (e.target === modal) modal.remove(); });
    }
    var enabled = !!info.enabled;
    var keyView = info.api_key ? (info.api_key.slice(0, 10) + "••••••••" + info.api_key.slice(-4)) : "—";
    var inner =
      '<div style="background:var(--bg-card);color:var(--text-primary);border-radius:16px;max-width:680px;width:100%;max-height:88vh;overflow:auto;border:1px solid var(--border-color);box-shadow:0 18px 50px rgba(0,0,0,.3);">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border-color);">' +
        '<div><div style="font-size:17px;font-weight:600;">API & Integration</div>' +
        '<div style="font-size:13px;color:var(--text-secondary);">' + esc(info.agent_name || "Agent") + ' · ' + esc(info.agent_type || "conversational") + '</div></div>' +
        '<button onclick="document.getElementById(\'af-integration-modal\').remove()" style="background:transparent;border:none;font-size:22px;cursor:pointer;color:var(--text-secondary);">×</button>' +
      '</div>' +
      '<div style="padding:20px;">';

    if (!enabled) {
      inner += '<div style="text-align:center;padding:18px 0;">' +
        '<p style="color:var(--text-secondary);font-size:14px;margin-bottom:14px;">Enable a public API key to expose this agent on your website, web app, or mobile app.</p>' +
        '<button id="af-enable-btn" style="background:var(--accent-primary);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;">Enable public API</button>' +
        '</div>';
    } else {
      inner +=
        '<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:6px;">' +
          '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;">Endpoint</div>' +
          block("", info.endpoint) +
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
            '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;">API key</span>' +
            '<code style="background:color-mix(in srgb,var(--text-primary) 6%,var(--bg-card));border:1px solid var(--border-color);border-radius:8px;padding:4px 8px;font-size:12.5px;">' + esc(keyView) + '</code>' +
            '<button onclick="__afCopy(\'' + esc(info.api_key) + '\',this)" style="font-size:12px;padding:4px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);cursor:pointer;">Copy key</button>' +
            '<button id="af-rotate-btn" style="font-size:12px;padding:4px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);cursor:pointer;">Rotate</button>' +
            '<button id="af-disable-btn" style="font-size:12px;padding:4px 10px;border-radius:8px;border:1px solid color-mix(in srgb,var(--danger,#dc2626) 50%,transparent);background:var(--bg-card);color:var(--danger,#dc2626);cursor:pointer;">Disable</button>' +
          '</div>' +
        '</div>' +
        snippets(info) +
        '<div style="margin-top:14px;text-align:right;">' +
          '<button id="af-doc-btn" style="background:var(--accent-primary);color:#fff;border:none;border-radius:10px;padding:9px 16px;font-weight:600;cursor:pointer;">Download integration doc</button>' +
        '</div>';
    }
    inner += '</div></div>';
    modal.innerHTML = inner;

    var eb = document.getElementById("af-enable-btn");
    if (eb) eb.onclick = function () { setEnable(info.agent_id, "enable"); };
    var rb = document.getElementById("af-rotate-btn");
    if (rb) rb.onclick = function () { if (confirm("Rotate the API key? Existing embeds will stop working until updated.")) setEnable(info.agent_id, "rotate"); };
    var db = document.getElementById("af-disable-btn");
    if (db) db.onclick = function () { setEnable(info.agent_id, "disable"); };
    var dc = document.getElementById("af-doc-btn");
    if (dc) dc.onclick = function () { downloadDoc(info); };
  }

  async function setEnable(agentId, action) {
    try {
      var r = await fetch((typeof API !== "undefined" ? API : "") + "/api/agents/" + agentId + "/integration/" + action, {
        method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, authHeaders())
      });
      var info = await r.json();
      if (!r.ok) { toast(info.detail || "Failed", "error"); return; }
      render(info);
    } catch (e) { toast("Request failed", "error"); }
  }

  window.openAgentIntegration = async function (agentId, agentType) {
    try {
      var r = await fetch((typeof API !== "undefined" ? API : "") + "/api/agents/" + agentId + "/integration", { headers: authHeaders() });
      var info = await r.json();
      if (!info.agent_type && agentType) info.agent_type = agentType;
      render(info);
    } catch (e) { toast("Could not load integration settings", "error"); }
  };
})();
