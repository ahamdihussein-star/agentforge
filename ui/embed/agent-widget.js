/*!
 * AgentForge embeddable chat widget.
 * One-line embed:
 *   <script src="https://YOUR_HOST/ui/embed/agent-widget.js"
 *           data-agent-id="AGENT_ID" data-api-key="af_pub_xxx"
 *           data-title="Support" data-accent="#6366f1"></script>
 * Renders a floating chat bubble that talks to the agent's public API,
 * running the SAME chat engine (guardrails, tasks, tools, knowledge base)
 * as inside the platform. Supports uploading documents & images.
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

  var base;
  try { base = new URL(s.src, location.href).origin; } catch (e) { base = ""; }
  var endpoint = base + "/api/public/agents/" + encodeURIComponent(agentId) + "/chat";

  var title = s.getAttribute("data-title") || "Chat with us";
  var accent = s.getAttribute("data-accent") || "#6366f1";
  var greeting = s.getAttribute("data-greeting") || "Hi! How can I help you today?";
  var convId = null;
  var pending = []; // { name, type, data(base64) }

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
    ".afw-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 10px 6px;background:#fff;}",
    ".afw-chip{display:flex;align-items:center;gap:6px;background:#eef1f6;border:1px solid #dde3ec;border-radius:8px;padding:4px 8px;font-size:12px;color:#334155;max-width:100%;}",
    ".afw-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;}",
    ".afw-chip b{cursor:pointer;color:#94a3b8;font-weight:700;}",
    ".afw-foot{display:flex;gap:8px;align-items:center;padding:10px;border-top:1px solid #eceef1;background:#fff;}",
    ".afw-attach{flex:none;width:38px;height:38px;border-radius:10px;border:1.5px solid #cbd5e1;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b;}",
    ".afw-attach:hover{border-color:" + accent + ";color:" + accent + ";}",
    ".afw-foot input.afw-text{flex:1;border:1.5px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;color:#1f2937;}",
    ".afw-foot input.afw-text:focus{border-color:" + accent + ";}",
    ".afw-send{background:" + accent + ";color:#fff;border:none;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer;}",
    ".afw-send:disabled{opacity:.5;cursor:default;}",
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
    '<div class="afw-chips" style="display:none;"></div>' +
    '<div class="afw-foot">' +
      '<button class="afw-attach" title="Attach a document or image" aria-label="Attach">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
      '</button>' +
      '<input type="file" class="afw-file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.md" style="display:none;" />' +
      '<input type="text" class="afw-text" placeholder="Type your message…" />' +
      '<button class="afw-send">Send</button>' +
    '</div>';
  document.body.appendChild(panel);
  panel.querySelector(".afw-head span").textContent = title;

  var body = panel.querySelector(".afw-body");
  var chips = panel.querySelector(".afw-chips");
  var input = panel.querySelector(".afw-text");
  var sendBtn = panel.querySelector(".afw-send");
  var attachBtn = panel.querySelector(".afw-attach");
  var fileInput = panel.querySelector(".afw-file");
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

  function renderChips() {
    if (!pending.length) { chips.style.display = "none"; chips.innerHTML = ""; return; }
    chips.style.display = "flex";
    chips.innerHTML = pending.map(function (f, i) {
      return '<span class="afw-chip"><span>📎 ' + esc(f.name) + '</span><b data-i="' + i + '">×</b></span>';
    }).join("");
    Array.prototype.forEach.call(chips.querySelectorAll("b"), function (x) {
      x.addEventListener("click", function () { pending.splice(+x.getAttribute("data-i"), 1); renderChips(); });
    });
  }
  attachBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(fileInput.files || []);
    files.slice(0, 5).forEach(function (file) {
      if (file.size > 12 * 1024 * 1024) { addMsg("File too large (max 12MB): " + file.name, "bot"); return; }
      var reader = new FileReader();
      reader.onload = function () {
        pending.push({ name: file.name, type: file.type, data: String(reader.result) });
        renderChips();
      };
      reader.readAsDataURL(file);
    });
    fileInput.value = "";
  });

  async function send() {
    var text = (input.value || "").trim();
    if (!text && !pending.length) return;
    input.value = "";
    var atts = pending.slice(); pending = []; renderChips();
    addMsg((text || "(sent file)") + (atts.length ? "\n📎 " + atts.map(function (a) { return a.name; }).join(", ") : ""), "user");
    sendBtn.disabled = true;
    var typing = document.createElement("div");
    typing.className = "afw-typing"; typing.textContent = "Typing…";
    body.appendChild(typing); body.scrollTop = body.scrollHeight;
    try {
      var r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({ message: text, conversation_id: convId, attachments: atts })
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
