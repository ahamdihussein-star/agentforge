# AgentForge — Code Review (plain-language)

> What this is: a review of the platform's code to find things that are broken, risky, or misleading — written so a non-technical reader can judge **how much each one matters**. Each item says, in plain words, *what goes wrong for a user*. Developer references (file/line) are in the appendix.
>
> How to read the priority: 🔴 **Fix before the demo** · 🟠 **Fix soon** · 🟡 **Polish.**
> A few security items depend on one deployment setting — flagged "confirm" because they couldn't be tested on the live server, only read in the code.

---

## The 60-second summary

The platform's "happy path" works well (we verified it live: building agents, chatting, tools, knowledge base, and a workflow that correctly routes an approval to a manager). The problems below are mostly in three areas:

1. **A few security settings that must be switched on** before showing it to anyone outside the team.
2. **Some workflow building blocks that look like they work but don't actually run** — they finish "green" while doing nothing or only part of the job.
3. **Several places where the system says "done/saved/sent" even when it quietly failed** — so you can't trust the success message.

None of these block a *scripted* demo if we avoid the affected blocks, but the security ones and the "silent success" ones should be addressed because they're the kind of thing that embarrasses you live or after launch.

---

## 🔴 Fix before the demo

**1. Large parts of the system may be reachable without logging in.** *(confirm one setting)*
There's a safety gate in front of the system that has two modes: "just watch" and "actually block." It ships in **"just watch"** by default — meaning unless someone explicitly turned on "actually block" on the server, many internal commands can be reached **without a login**.
→ *Impact:* a curious or malicious person could pull or poke at data without an account. **Action: confirm the server has the "enforce" mode turned on** before any external demo.

**2. Some workflow steps look like they work but don't actually run.**
Four of the "building blocks" in the workflow builder — **"Repeat for each item," "Run in parallel," "Loop while…," and "Call another process"** — are drawn on the screen and report success, but the engine never actually executes them.
→ *Impact:* a workflow that says "process every invoice" would silently handle only one; "do these three things at once" would do only one of them; "run this sub-process" does nothing — **all while showing a green checkmark.** If the demo workflow uses any of these, it will quietly give wrong results. Stick to the blocks we verified (Form, AI step, Decision, Approval, Notification, single tool call) until these are wired.

**3. A misconfigured access rule can silently hand someone full control.**
Old/blank access rules default to **"give this person full admin."** It's a "fail-open" default — when in doubt, it grants *more* access, not less.
→ *Impact:* someone meant to have limited rights over one agent could silently get full control. Risky for a product that sells "enterprise security."

**4. The "preview who can access this agent" feature shows fake data.**
That admin screen always reports **"everyone has full access, no restrictions"** regardless of the real rules (it was never finished).
→ *Impact:* an admin checks access, sees "all good," and ships an agent that's actually misconfigured. False reassurance.

**5. Two access endpoints don't require a login at all.**
The "check access" and "preview access" commands accept whatever user/org you hand them with no authentication.
→ *Impact:* combined with #1, anyone could ask "what can user X see?" about other people. Confirm/secure before exposure.

---

## 🟠 Fix soon (reliability & trust)

**6. The system says "email sent" even when the email failed.**
Approval and notification steps report **success even if the message never went out** (e.g., email isn't configured).
→ *Impact:* the workflow shows the manager was notified, the requester waits, and **no one was actually told.** Very likely to surface in real use.

**7. "Saved" doesn't always mean saved.** *(several places)*
Creating departments/users/invitations/audit entries is wrapped so that **if the database save fails, it still says "success"** and only keeps the change in temporary memory.
→ *Impact:* you make a change, see "success," and it **disappears after the next update/restart.** (We already fixed this for **Departments** — created departments now persist and are visible to approval routing. The same pattern still exists for a few other items.)

**8. Logging out doesn't fully log you out.**
Because sessions are kept only in temporary memory and the server restarts on every update, a logged-out account can be **silently logged back in** after a restart (until its token naturally expires).
→ *Impact:* you can't reliably "kick someone out" — a real concern for a security product. (Related to the "have to re-login after each deploy" behavior you've noticed.)

**9. The AI-model keys shown in Settings may not be the ones actually in use.**
The system can run on keys set on the server (environment) *or* keys typed into Settings. Right now the live system is running on **server keys**, while the Settings screen shows different/old keys.
→ *Impact:* an admin "updates the key" in Settings and **nothing changes**, or Settings shows a key that isn't the real one. Confusing and demo-risky. (This is also why Gemini fails but OpenAI works — only OpenAI has a valid server key.)

**10. People given access via a "role" or "group" can be wrongly denied.**
A naming mismatch in the code means access granted through a role/group is read as empty.
→ *Impact:* a legitimate user who should be able to run a shared workflow is **blocked**.

**11. Right after an update, a real admin can briefly look like a non-admin.**
Permission checks rely on data held in temporary memory that's empty for a moment after each restart.
→ *Impact:* just after a deploy, an admin may lose visibility of approvals/executions until they act again. (Same root cause as #8.)

**12. The same "who should receive this" logic is written twice, slightly differently.**
Approval steps and notification steps resolve recipients with **two separate copies** of the logic.
→ *Impact:* the same recipient (e.g., "department head") can work for a notification but fail for an approval — inconsistent, hard-to-predict routing.

---

## 🟡 Polish (won't break a demo, but rough edges)

- **13. Crash risks on messy real-world data:** summing a column that contains text like "1,200 AED," or a bad date on a session/invitation, can throw an error and break that screen for everyone. Needs simple input-guarding.
- **14. Generated documents with accented names** (e.g., "Müller") or symbols can fail to save depending on the server, because some file-writes don't specify text encoding.
- **15. The health-check always reports "healthy"** even when the database is down — so automated monitoring won't catch an outage.
- **16. Pop-up windows (modals) stay open when you switch pages** and don't close with the Escape key — looks broken.
- **17. "Just now" items show "3 hours ago"** in a couple of places (a time-zone display bug).
- **18. Leftover test junk to delete:** a few "ZZ …" test tools, a test role, and a test department I created while verifying fixes.

---

## ✅ Already fixed and verified this session (for context)

- Tools that hit a web redirect now follow it (were failing). **Verified.**
- Startup error that broke loading saved process templates. **Fixed.**
- The **"Calculate"** workflow block was missing from the builder palette — **added and verified.**
- **Departments created in the Security screen now actually persist** and are visible to approval routing (was a "looks saved but isn't" bug with two root causes). **Verified live.**
- A user's **manager is now editable from the Users screen**, not only the Org Chart.

Full technical detail of these is in `docs/FIXES_APPLIED.md`.

---

## Appendix — developer references (file:line)

| # | Title | Severity | Location |
|---|---|---|---|
| 1 | Auth gate defaults to monitor (API open) | Critical (confirm) | `api/auth_gate.py:100,134` |
| 2 | Loop/Parallel/While/Sub-process not executed | Critical | `core/process/nodes/logic.py:290-570`, `engine.py:571-609` |
| 3 | Empty policy → full_admin (fail-open) | High | `api/modules/access_control/service.py:1002` |
| 4 | "Preview as user" returns mock full access | High | `api/modules/access_control/service.py:695-712` |
| 5 | Access check/preview endpoints unauthenticated | High | `api/modules/access_control/router.py:362-411` |
| 6 | Notification/approval "sent" on failure | High | `core/process/nodes/human.py:2037`; `nodes/notification.py:264` |
| 7 | Save returns success on DB failure | High (Dept FIXED) | `api/security.py:49-83, 3224-3257` |
| 8 | Logged-out token re-accepted after restart | High | `api/security.py:404-417` |
| 9 | Settings LLM key ≠ env key actually used | High | `api/main.py:352, 7676-7708`; `core/llm/registry.py:326` |
| 10 | Role/group access read as empty | Medium | `process/service.py:244,754` vs `process/router.py:143` |
| 11 | Admin treated as non-admin post-restart | Medium | `api/modules/process/router.py:156-169` |
| 12 | Recipient resolution duplicated/divergent | High | `core/process/nodes/human.py:1375 vs 1664` |
| 13 | Unguarded date/number conversions (500s) | Medium | `api/security.py:424…`; `core/process/nodes/data.py:664`, `timing.py:58` |
| 14 | `open()` without encoding (Lab) | Medium | `api/modules/lab/service.py:188…` |
| 15 | /health returns 200 when unhealthy | Low | `api/health.py:57-86` |
| 16 | try_catch/retry node types have no executor | Medium | `core/process/schemas.py:69-70` |
| 17 | Duplicate SubProcessNodeExecutor classes | Medium | `core/process/nodes/logic.py:437 & 506` |
| 18 | normalize_org_id merges non-UUID orgs | High (multi-tenant) | `api/modules/access_control/service.py:27-40` |

*Confidence: items 1, 2, 6, 7, 9 and the engine-dispatch gap were confirmed directly in source; the access-control items were found by a code-review pass and spot-checked. Nothing here was run against the live server except where marked "verified."*
</content>
