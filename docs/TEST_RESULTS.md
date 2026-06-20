# AgentForge — Live Test Results & Findings

Comprehensive, in-order test pass driven from the live UI (production: agentforge2.up.railway.app).
For each scenario: **Result** (✅ pass / ⚠️ issue / ❌ fail), plus notes on **UX**, **performance**, **LLM quality (hallucination)**, **security/permissions**.

Legend severity: 🔴 demo-blocker · 🟠 important · 🟡 minor.

---

## Dimensions tracked on every step
- Functionality (does the button/feature work)
- UX / UI look & friction
- Performance / latency (esp. LLM calls)
- LLM output quality — any hallucination ("تهييس")
- Instruction adherence (does the agent obey its configured instructions/guardrails)
- Security & permissions (who can do what; tested with multiple users)
- RAG / knowledge base actually used or not
- End-user portal parity after publish

---

## A. Create Agent — Conversational (Generate with AI)  [DONE]
- ✅ Type select → Build method → Describe → Generate. Generation ~13–15s.
- ✅ Setup step renders & populates (was the nesting bug — FIXED & deployed).
- ✅ All 7 steps render (Setup, Tasks, Tools, Access, Safety, Preview, Test&Deploy).
- ✅ Test-chat works (the earlier "HTTP 401" was just an expired session token).
- ✅ Deploy → agent shows as `published` in Agent Hub.
- ⚠️ 🟡 LLM hallucination: with NO knowledge base/tools, the agent invented a specific "30-day return policy" + "print shipping label". Needs guardrails/grounding. (to retest after guardrails)
- ⚠️ 🟡 UX: wizard modal hard to close — X scrolls out of view, Escape is a no-op.
- ⚠️ 🟡 UX: "Continue" button position shifts after scroll.

## B. Chat page (published agent)
- ✅ Opening a published agent card → Chat page with agent selected; history persists.
- ⚠️ 🟡 UX: header still says "Select an Agent / Choose an agent to start chatting" while an agent IS selected and a conversation is open.
- ⚠️ 🟡 Bug: history timestamp shows "4h ago" for a minutes-old conversation (wrong relative time / timezone).
- (in progress: +New, Edit, attachment, multi-turn, instruction adherence)

---

## Pending areas (in order)
- B. Chat page (finish) · C. Agent Hub management (Drafts, Select, edit/delete/duplicate)
- D. Tools — create a tool + agent actually invokes it
- E. RAG / Knowledge base — is it really used
- F. Guardrails — actually enforced?
- G. Instruction adherence — does the agent obey
- H. Access control + Security with MULTIPLE users (who can edit / who can't)
- I. End-user portal parity after publish
- J. Build Manually (conversational + process) · K. Process agent end-to-end
- L. Settings · Security pages · AgentForge Studio · Lab
