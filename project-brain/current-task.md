# Current Task

## Task Description
Pragmatic rearchitect of AgentForge into 4 layers (Authoring / Agent-config / Runtime / Channels) without a rewrite, plus a stable, demo-ready experience. See decision-log 2026-06-20.

## Context
Original design generated agents at runtime from a prompt → unstable + no customization. We separate build-time from run-time, harden security, and add an Expose/Channels layer so agents can be embedded on a website / mobile / any app (the core demo).

## Approach (phased)
- Phase 1 — Single API auth gate + close debug + kill fail-open. **DONE (code).**
- Phase 2 — Unify agent definition into one versioned config schema (remove DB+in-memory dual storage).
- Phase 3 — Channels/Expose: per-agent API key + public REST + embeddable web widget + webhook.
- Phase 4 — Stabilize demo scenario (fix `leaveduration` derived field / approval routing; seed clean agents).

## Progress
- [x] Phase 1 code: `api/auth_gate.py` + wiring in `api/main.py` + provider-key masking
- [ ] Phase 1 deploy in monitor mode → review logs → set `AUTH_GATE_MODE=enforce`
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4

## Blockers
None. Phase 1 awaits deploy + monitor-log review before enforcing.

## Testing Plan
Deploy to Railway with `AUTH_GATE_MODE=monitor`. Use the app normally; watch logs for `auth_gate[monitor]: would BLOCK ...`. If only unauthenticated/debug noise appears, set `AUTH_GATE_MODE=enforce` and redeploy. Verify `/api/debug/agents-ownership` and `/api/tools` return 404/401 without a token.

## Files Modified
- `api/auth_gate.py` (new)
- `api/main.py`
- `project-brain/decision-log.md`, `module-map.md`, `regression-watchlist.md`

## Related
- decision-log.md → 2026-06-20 entries

---

**Template Instructions:**
1. Update this file when starting a new task
2. Keep it updated as you make progress
3. Clear it when task is complete
4. Use it to maintain context across sessions
