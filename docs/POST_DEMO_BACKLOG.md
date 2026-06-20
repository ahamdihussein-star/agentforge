# Post-Demo Backlog (Phase 2 / rearchitect)

Issues found during the 2026-06-20 review. Each item is tagged:
- **[DEMO]** = should be handled BEFORE the demo (kept here for tracking, but not deferred).
- **[DEFER]** = safe to do AFTER the demo (Phase 2 / rearchitect).
- Severity: 🔴 high · 🟠 medium · 🟡 low.

Status of Phase 1 (security hardening): **DONE & live** — single API auth gate (`enforce`),
debug endpoints closed, provider keys masked, fail-open prevented.

---

## A. Architecture (the core rearchitect — Phase 2/3)

1. 🔴 **[DEFER] Dual storage = no single source of truth.** The app keeps agents/tools/etc.
   both in memory (`app_state`) and in the DB, and periodically writes memory → DB.
   This is the ROOT cause of: data "coming back from the dead" (seen during cleanup —
   74 agents + 10 tools got re-written after a direct DB delete), disappearing agents,
   duplicates, and `org_id` drift. **Fix:** make the database the single source of truth;
   app reads/writes through the DB with a cache that invalidates correctly.

2. 🔴 **[DEFER] Unify the agent definition into one versioned config schema.** Authoring
   (the AI generator) should only PRODUCE an editable config; the runtime executes that
   config deterministically. (Rearchitect layers 1–3.)

3. 🟠 **[DEFER] `org_id` normalization conflict** — dynamic DB lookup in `agent_service.py`
   vs a fixed UUID elsewhere → permissions fail intermittently. Resolve once storage is unified.

4. 🟠 **[DEFER] Monolith size** — `api/main.py` ≈ 16.5K lines, `ui/process-builder.js` ≈ 10K.
   Extract modules incrementally (start with the auth/admin/agents/process boundaries).

5. 🟠 **[DEFER] Fail-open patterns** — DB error falls back to in-memory; if the security module
   fails to import the app ran with no auth. The auth gate now mitigates the auth case; remove
   the remaining silent fallbacks during the storage rework.

---

## B. Security follow-ups (Phase 1 done; these remain)

6. 🟠 **[DEFER] CORS** is `allow_origins=["*"]` with `allow_credentials=True` (invalid/unsafe combo).
   Set explicit allowed origins via env once the channels/embed story is defined.

7. 🟠 **[DEFER] Process condition uses string-built Python expressions** (`{{field}} > 3`) that get
   evaluated → expression-injection / unsafe-eval surface. Replace with a safe expression evaluator.

8. 🟠 **[DEMO] Remove or env-gate the maintenance tools** before a real customer demo:
   `POST /api/admin/reset-workspace` and the `/admin/maintenance` page were added for cleanup.
   Hide behind `ENABLE_WORKSPACE_RESET=true` or delete after the workspace is clean.

9. 🟡 **[DEFER] Routes outside `/api/`** (e.g. `/process/*`) rely on per-route auth only; the gate
   covers `/api/*`. Audit them and move under the gate or confirm each has its own auth.

10. 🟡 **[DEFER] `/api/settings` read access** — masking is done, but restrict full settings reads
    to admins (non-admins shouldn't see provider/config structure).

---

## C. Process / workflow bugs (fix before demo ONLY if the demo uses a process agent)

11. 🔴 **[DEMO?] `leaveduration` derived field is never computed** from start/end dates, so the
    `greater_than 3` manager-approval branch is silently skipped → every request "auto-approves".
    Fix the derived-field computation (days-between) if the demo shows approval routing.

12. 🟠 **[DEMO?] `{{email}}` / recipients not auto-resolved** from the user profile → a process can
    die before step 1 if the field isn't filled. Add identity enrichment + a clear error if missing.

13. 🟠 **[DEMO?] Approval node `assignee_ids` empty** → no approver assigned even if the branch runs.

14. 🟠 **[DEMO] `BASE_URL` env points to the wrong domain** (`agentforge` vs `agentforge2`) → OAuth
    callbacks and verification/MFA emails point to a dead domain. Fix the Railway variable.

---

## D. Reliability / code quality

15. 🟠 **[DEFER] Zero automated tests.** Add 5–6 smoke tests covering the demo path (login →
    create agent → chat → process run) before relying on the platform.

16. 🟠 **[DEFER] Error handling** — 62 bare `except:`, 693 broad `except Exception`, and ~7 endpoints
    return `str(e)` / raw 422 JSON to users. Add a global error handler with plain-language messages.

17. 🟡 **[DEFER] ~980 `print()` statements** instead of structured logging → no real observability.
    Introduce logging + basic tracing/metrics.

18. 🟡 **[DEFER] Confusing login message** — email login is rejected with "Please sign in using your
    username". Clarify or accept email.

---

## E. Missing enterprise capabilities (strategic — for the market story)

19. 🟠 **[DEFER]** Observability/tracing, complete audit trail, deeper multi-tenant isolation,
    agent versioning/rollback, guardrails, rate limiting, retries/idempotency, and **data residency**
    (important for the du sovereign-cloud narrative). These are the "missing capabilities" gap vs
    mature market platforms (n8n, Dify, Copilot Studio, etc.).

---

## Pre-demo (NOT deferred — these block a good demo)

- Fix the bugs that block **creating an AI agent** end-to-end (conversational + process).
- Build the **Channels/Expose** capability (per-agent API key + embeddable web widget + public
  endpoint + webhook) — the core of the demo.
- Seed one clean conversational agent and one clean process agent; rehearse the scenario.
- Decide on items 11–14 above depending on what the demo actually shows.
