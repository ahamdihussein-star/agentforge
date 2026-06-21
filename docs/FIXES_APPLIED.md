# Fixes Applied (test-and-fix session) — for Ahmed to review

All changes are small and surgical. Each was syntax-checked (`py_compile` / `node --check`) and, where noted, verified live after deploy. Findings that were investigated but NOT fixed (too big / need your input) are listed at the end.

## Code fixes (deployed)

1. **Redirect-following across ALL tool-execution paths** — tool calls that hit an HTTP 301/302 were failing instead of following the redirect. Added `follow_redirects=True` to every HTTP client used for tool execution:
   - `api/main.py` (execute_tool, test_tool), `api/modules/process/service.py` (builder test executor), `core/tools/builtin/api.py` (canonical APITool + WebhookTool — used by the real engine + agent chat).
   - **Verified live:** the process "Auto-Approve" step error advanced from `HTTP 301` → `HTTP 404` after deploy (redirect now followed; the residual 404 is a dead test-tool URL, separate).

2. **Startup ReferenceError: `authToken is not defined`** (`ui/index_parts/app-core.js`, `loadDynamicProcessTemplates`) — the function ran at init before the implicit global existed. Made the read defensive: `(typeof authToken !== 'undefined' ? authToken : null) || localStorage…`.

3. **"Calculate" shape missing from the manual Process-Builder palette** (`ui/process-builder.html`) — the shape was fully implemented (default config, icon, property panel, engine normalization) but had no palette entry, so users couldn't add it manually. Added a **Data → Calculate** palette item.
   - **Verified live:** Calculate now drags onto the canvas and opens its full property panel (operation / formula / name-this-result).

4. **Department split-brain — FIXED + VERIFIED LIVE.** The Security UI's `POST/DELETE /departments` wrote **only** to in-memory state, while process routing / identity resolution read the **DB**, so a department created from the Security UI was invisible to approval routing. Root cause had **two layers**:
   (a) `create_department`/`delete_department` never called the DB service — now they call `DepartmentService.save_department(...)` / a new `DepartmentService.delete_department(...)` (`api/security.py` + `database/services/department_service.py`), mirroring how `create_group` already persisted.
   (b) The Security `Department` model generated a **non-UUID id** (`"dept_xxxxx"`) while the DB `departments.id` is a **UUID** column, so the DB insert silently failed (caught by the try/except). Changed `Department.id` to generate a proper `str(uuid.uuid4())` (`core/security/models.py`), matching `UserGroup` (whose comment already says "proper UUID for database compatibility"). Nothing depends on the old `dept_` id prefix (the `dept_manager:`/`dept_head:` strings are routing recipients, unrelated).
   **Verified live after deploy:** a department created via `POST /api/security/departments` now gets a UUID id and **appears in the DB-backed `GET /api/identity/departments`** list (which approval routing reads). Split-brain closed for departments. (Left a junk `ZZ SplitBrainCheck` dept — add to cleanup.)

5. **Manager not editable from the Security → Users update path** (`api/security.py`) — `UpdateUserRequest` was missing `manager_id`/`employee_id`, so a user's direct manager could only be set from the Org-Chart "reports to" dropdown (org placement scattered across two UIs). Added both fields to `UpdateUserRequest` and applied them in `update_user` (admin-gated, same pattern as `department_id`).

## Findings investigated but NOT fixed (need your input or are larger)

- **Settings LLM keys are stale/invalid; runtime uses ENV keys.** "Test Connection" for both Google **and** OpenAI returns invalid-key errors, yet OpenAI agents work — so the runtime reads env-var keys, not the Settings-stored ones. **Fix = yours:** set a valid `GOOGLE_API_KEY` env (or drop Gemini); the OpenAI default already works. Also a deeper "config source of truth" cleanup.
- **Auto-deploy-on-every-commit → transient 502s.** The watch-deploy watcher redeploys on every file change; any request during the restart window 502s (caused several false "bugs" this session). **For a live demo, pause the watcher.**
- **Call Process (sub_process) is not wired in the engine.** The `SubProcessNodeExecutor` returns metadata (`is_sub_process`, …) but nothing in `core/process/engine.py` consumes it — nested process execution isn't implemented. (Also two duplicate `SubProcessNodeExecutor` classes register the same node type; cosmetic given the above.) Larger feature work.
- **Agent does not retrieve from its attached Knowledge Base** (RAG-into-agent gap) — KB "Ask" works standalone but the agent doesn't surface KB content. Needs one Railway log line to confirm whether the tool is invoked / scores. (The LLM DOES call API tools, so it's specific to the knowledge path.)
- **Permission resolution & org placement** still partly split between `security_state` (in-memory) and the DB — the Department fix above is Phase-A step 1; users/roles hydration on the rehydration path is the remaining piece.
- **Minor:** modals persist across page navigation and ignore Escape; `formatTimeAgo` shows "3h ago" for brand-new items in some views; junk test artifacts to delete (ZZ tools, ZZ Probe Role).
</content>
