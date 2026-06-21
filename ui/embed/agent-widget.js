/*!
 * AgentForge embeddable chat widget.
 * One-line embed:
 *   <script src="https://YOUR_HOST/ui/embed/agent-widget.js"
 *           data-agent-id="AGENT_ID" data-api-key="af_pub_xxx"
 *           data-title="Support" data-accent="#6366f1"></script>
 * Renders a floating chat bubble that talks to the agent's public API,
 * running the SAME chat engine (guardrails, tasks, tools, knowledge base)
 * as inside the platform.
 */
(function () {
  "use strict";
  var s = document.currentScript;
  if (!s) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || "").indexOf("agent-widget.js") !== -1) { s = all[i]; break; }
    }
  }
  if (!s) return;

  var agentId = s.getAttribute("data-agent-id");
  var apiKey = s.getAttribute("data-api-key");
  if (!agentId || !apiKey) { console.error("[AgentForge] data-agent-id and data-api-key are required"); return; }

  // Base URL = origin of the script src
  var base;
  try { base = new URL(s.src, location.href).origin; } catch (e) { base = ""; }
  var endpoint = base + "/api/public/agents/" + encodeURIComponent(agentId) + "/chat";

  var title = s.getAttribute("data-title") || "Chat with us";
  var accent = s.getAttribute("data-accent") || "#6366f1";
  var greeting = s.getAttribute("data-greeting") || "Hi! How can I help you today?";
  var convId = null;

  if (window.__afWidgetLoaded) return; window.__afWidgetLoaded = true;

  var css = [
    ".afw-btn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:" + accent + ";color:#fff;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.22);z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s;}",
    ".afw-btn:hover{transform:scale(1.06);}",
    ".afw-btn svg{width:28px;height:28px;}",
    ".afw-panel{position:fixed;bottom:92px;right:20px;width:374px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.28);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Inter,sans-serif;}",
    ".afw-panel.open{display:flex;}",
    ".afw-head{background:" + accent + ";color:#fff;padding:14px 16px;font-weight:600;font-size:15px;display:flex;align-items:center;justify-content:space-between;}",
    ".afw-head button{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;}",
    ".afw-body{flex:1;overflow-y:auto;padding:14px;background:#f6f7f9;display:flex;flex-direction:column;gap:10px;}",
    ".afw-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}",
    ".afw-bot{background:#fff;color:#1f2937;align-self:flex-start;border:1px solid #e5e7eb;}",
    ".afw-user{background:" + accent + ";color:#fff;align-self:flex-end;}",
    ".afw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid #eceef1;background:#fff;}",
    ".afw-foot input{flex:1;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;color:#1f2937;}",
    ".afw-foot input:focus{border-color:" + accent + ";}",
    ".afw-foot button{background:" + accent + ";color:#fff;border:none;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer;}",
    ".afw-foot button:disabled{opacity:.5;cursor:default;}",
    ".afw-typing{color:#94a3b8;font-size:13px;align-self:flex-start;padding:4px 6px;}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement("button");
  btn.className = "afw-btn"; btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(btn);

  var panel = document.createElement("div");
  panel.className = "afw-panel";
  panel.innerHTML =
    '<div class="afw-head"><span></span><button aria-label="Close">×</button></div>' +
    '<div class="afw-body"></div>' +
    '<div class="afw-foot"><input type="text" placeholder="Type your message…" /><button>Send</button></div>';
  document.body.appendChild(panel);
  panel.querySelector(".afw-head span").textContent = title;

  var body = panel.querySelector(".afw-body");
  var input = panel.querySelector(".afw-foot input");
  var sendBtn = panel.querySelector(".afw-foot button");
  var closeBtn = panel.querySelector(".afw-head button");
  var greeted = false;

  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  function addMsg(text, who) {
    var m = document.createElement("div");
    m.className = "afw-msg " + (who === "user" ? "afw-user" : "afw-bot");
    m.innerHTML = esc(text);
    body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
  }
  function toggle(open) {
    panel.classList.toggle("open", open);
    if (open && !greeted) { greeted = true; addMsg(greeting, "bot"); input.focus(); }
  }
  btn.addEventListener("click", function () { toggle(!panel.classList.contains("open")); });
  closeBtn.addEventListener("click", function () { toggle(false); });

  async function send() {
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = ""; addMsg(text, "user");
    sendBtn.disabled = true;
    var typing = document.createElement("div");
    typing.className = "afw-typing"; typing.textContent = "Typing…";
    body.appendChild(typing); body.scrollTop = body.scrollHeight;
    try {
      var r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ message: text, conversation_id: convId })
      });
      var data = await r.json();
      typing.remove();
      if (!r.ok) { addMsg(data && data.error ? data.error : "Sorry, something went wrong.", "bot"); }
      else { convId = data.conversation_id || convId; addMsg(data.response || "(no response)", "bot"); }
    } catch (e) {
      typing.remove(); addMsg("Connection error. Please try again.", "bot");
    } finally {
      sendBtn.disabled = false; input.focus();
    }
  }
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
})();
