# Process ↔ Security ↔ Org Chart — Analysis & Restructuring Plan

> Status: **Analysis only — no code changed.** Prepared for Ahmed before any refactor.
> Date: 2026-06-20. Scope: how Process AI agents are built (shapes + properties + KB grounding) and how they integrate with the Security module and the Org Chart / Identity directory, plus the UI/UX. Evidence is cited as `file:line`.

---

## 0. TL;DR

The data model is mostly sound (the `User` row already carries `manager_id`, `department_id`, `role_ids`, `group_ids`, `job_title`). The pain is **fragmentation**: the same concepts are implemented two or three times in different layers that can disagree, the node-type vocabulary lives in four places with no single source of truth, identity is edited in two disconnected UIs, and Departments are stored in **two different places** (DB table vs in-memory state) depending on which screen created them. The result *looks* messy because it *is* split-brained, not because any one piece is wrong.

The headline problems, worst first:

1. **Split-brain Departments** — Security UI writes departments to in-memory state only; the Org-Chart/identity API writes the DB table; process routing reads the **DB**. A department created in the wrong screen is invisible to approvals.
2. **Org placement is editable in two disjoint UIs** — `manager` is only editable inside the Org-Chart department modal (not on the Users screen), `department` is editable in both, `roles/groups` only on the Users screen. No single "edit this person" screen.
3. **Seeding gap** — the default admin has no manager and no department, so any `dynamic_manager` approval fails immediately (this is the pre-flight failure we keep hitting).
4. **Runtime resolution logic is triplicated** (approval vs notification vs human-task) and can diverge.
5. **Node-type vocabulary scattered across 4 layers** with no source of truth; friendly shape names only become executable because one big `if/elif` rewrites them.

---

## 1. How it works today (the intended design)

### 1.1 The three subsystems

| Subsystem | Owns | Key code |
|---|---|---|
| **Security** | Users, roles, groups, RBAC, MFA, auth | `api/security.py`, `core/security/`, `database/models/user.py` |
| **Org Chart / Identity** | Departments, hierarchy (parent/child), each user's manager + job title, runtime identity resolution | `core/identity/service.py`, `api/modules/identity/`, `database/models/department.py` |
| **Process** | Workflow generation, the visual builder, execution + approvals/notifications | `core/process/`, `api/modules/process/`, `ui/process-builder.*` |

The `User` row is the shared anchor: it holds `manager_id` (`database/models/user.py:68`), `department_id` (`:64`), `role_ids` (`:63`), `group_ids` (`:65`), `job_title` (`:48`), `employee_id` (`:69`).

### 1.2 How a process is built (generation + KB grounding)

1. User types a goal → `ProcessWizard.generate_from_goal()` (`core/process/wizard.py:1072`).
2. **KB grounding** — `retrieve_platform_knowledge()` (`core/process/platform_knowledge.py:237`) loads only `docs/PROCESS_BUILDER_KB_*.md`, chunks them by paragraph, and scores with hand-rolled TF-IDF (`_score_chunks` `:123`). **This is keyword retrieval, not vector** (`:8-11`). Because keyword retrieval is weak, the wizard stuffs the query with 6 fixed keyword blocks so identity/approval/tool/parallel chunks are "always" returned (`wizard.py:1196-1204`).
3. **Org-structure injection** — built inline (not from the KB) at `wizard.py:1267-1391`: real departments (+ members + job titles), groups, roles, and explicit instructions telling the LLM exactly which `assignee_source` / `directory_assignee_type` to emit. It also injects identity *capability* hints (`has_managers`, `manager_coverage_pct`, `has_departments`) and tells the LLM "do not use dynamic_manager" when no managers exist (`:1232-1265`).
4. **LLM generates** a process definition (nodes + properties), parsed by `_extract_json` (`:870`), with one repair pass on parse failure (`:1521`) and a second "QA review" LLM pass (`_review_and_fix_process` `:1531`).
5. **Normalization → engine** — `api/modules/process/service.py:2778-2812` rewrites friendly shape types into engine `NodeType` values, compiles Decision `rules[]` into a Python boolean `expression` string (`:2822-2920`), and rewrites approval/notification config.
6. **Execution** — the real engine `core/process/engine.py` runs the nodes via the executor registry. (Note: the builder "Test run" is partly a client-side simulation; the **end-user portal** uses the real engine via `POST /process/execute`.)

### 1.3 The 11 shapes and the 28 node types

The builder/KB expose **11 business-friendly shapes**: Start, Finish, Collect Information (`form`), Send Message (`notification`), Request Approval (`approval`), AI Step (`ai`), Decision (`condition`), Run in Parallel (`parallel`), Call Process (`call_process`), Calculate (`calculate`), Connect to System (`tool`).

The engine `NodeType` enum (`core/process/schemas.py:25-71`) has **~28 raw types** (`ai_task`, `tool_call`, `human_task`, `condition`, `switch`, `loop`, `while`, `sub_process`, `merge`, `transform`, `validate`, `delay`, `schedule`, `try_catch`, `retry`, …). The friendly→engine mapping is what glues them together — and it is the single most fragile seam (see §3).

### 1.4 How approvals resolve to a real person (the seam)

An approval node's config (`PROCESS_BUILDER_KB_SHAPES.md` §5) has `assignee_source` (`platform_user` | `user_directory` | `platform_role` | `platform_group` | `tool`) and, for `user_directory`, a `directory_assignee_type`:

| `directory_assignee_type` | Resolves to |
|---|---|
| `dynamic_manager` | requester's **direct** manager (`User.manager_id`) |
| `department_manager` | **head** of a department (`Department.manager_id`) |
| `management_chain` | Nth-level manager |
| `role` / `group` | platform role / group members |
| `department_members` | everyone in a department |
| `expression` / `static` | from a form field / fixed IDs |

At runtime `ApprovalNodeExecutor` (`core/process/nodes/human.py:78`) calls `UserDirectoryService.resolve_process_assignee` (`core/identity/service.py:789`), which maps the above to concrete user IDs. `get_manager` (`:269`) reads `User.manager_id` and **falls back to the department head** when the user has no direct manager (`:285-288`). When neither exists → `[]` → the node strict-fails with `NO_APPROVER` and a "go assign a manager" message (`human.py:301-352`). That is the pre-flight failure.

---

## 2. UI/UX review (observed in the browser)

> Verified live on the admin portal (`/ui/#security` → Organization) and the process builder.

### 2.1 Security → Users
- The Users table has columns **User, Roles, Status, MFA, Last Login, Actions** — but **no Department and no Manager column**. You cannot see or set a person's org placement from the screen that is literally called "Users".
- Headers use emojis (🔐 Security Center, 👥 Users, 🎭 Roles…). Fine for a demo, off-brand for an enterprise/government "Civil Servant Standard" product.

### 2.2 Security → Organization → Org Chart
- Despite the name "Org Chart", departments render as **flat cards in a row** (Supply Chain, Engineering, Finance) with no visual hierarchy/tree, even though parent/child is supported via drag.
- The toolbar is a row of cryptic buttons: `+ Department`, `+`, `−`, `Reset`, `Discard`, `Save`. The bare `+` / `−` (zoom?) are unlabeled; the `Discard`/`Save` "unsaved edits" model is unusual for managing a directory and easy to lose work in.
- Department cards show "No head" / "0 members" inconsistently (Engineering has no head; Supply Chain 0 members).

### 2.3 The place org placement is actually set (Department modal)
- Double-clicking a department opens **Edit Department**, and *this* is the only place you set a member's **job title (free text)** and **"reports to" (manager)** — e.g. "Mohamed Ali — Finance Manager — reports to Ahmed Yahoo".
- So a person's **manager is configured as a per-department "reports to" dropdown buried two clicks deep**, completely disconnected from the Users screen. Adding a brand-new user (via Create User) does **not** place them in the org; someone must separately open the right department and "+ Add Person".

### 2.4 What is actually good
- The **Approval node property panel** in the builder is clean and business-friendly: "Who should approve? **Currently: Their direct manager** → Choose approver…", a deadline field, and an "Insert data…/Browse all…" variable picker. This is the model the rest of the identity UX should follow.

### 2.5 UI/UX verdict
The messiness is not the node-property panels — it's that **identity/org placement has no single, obvious home**. It is scattered between the Users tab (roles/groups), the Org-Chart cards (hierarchy), and the Department modal (manager + title), with two different "save" models and no person-centric view.

---

## 3. Structural problems (backend, with evidence)

1. **Split-brain Department storage / dual CRUD.**
   - Security router `POST/DELETE /departments` writes **only** in-memory `security_state.departments` + `save_to_disk()` (`api/security.py:3198-3210`) — **not** the DB table.
   - Identity router `POST/PUT/DELETE /departments` writes the **DB `departments` table** (`api/modules/identity/router.py:339-469`).
   - Routing/resolution reads the **DB** (`core/identity/service.py:846, 1450`).
   - ⇒ A department created from the Security UI is invisible to process routing. Two `CreateDepartmentRequest` classes exist (`api/security.py:295` + identity router's own).

2. **`manager_id` not editable from the Security Users update path.** `UpdateUserRequest` omits `manager_id` (`api/security.py:166-179`); only `PUT /users/{id}/manager` (`api/modules/identity/router.py:181`) can change it. (`CreateUserRequest` *does* have it, `:158`, applied `:2122` — settable at create, not on edit.) `department_id` is editable in **both** paths (`api/security.py:2254` and identity router `:224`), which write **different layers** (security mutates `security_state.users`; identity writes the DB + cache) → divergence risk.

3. **Seeding gap.** The super admin is created with no `manager_id`, `department_id`, or `job_title` (`core/security/state.py:82-94`). Any `dynamic_manager` approval for the admin hits `NO_APPROVER` (`core/process/nodes/human.py:301-352`).

4. **Triplicated runtime resolution.** Manager/dept/role/group → recipient is implemented three times: `resolve_process_assignee` (IDs, `core/identity/service.py:789`), `NotificationNodeExecutor` (emails, reads `_user_context` then re-queries, `core/process/nodes/human.py:1642-1960`), and `HumanTaskNodeExecutor` (shortcut handling `:1399-1416`). Different primary sources → can disagree.

5. **Node-type vocabulary scattered across 4+ places, no source of truth.** Frontend cosmetic maps (`ui/process-builder.js:1040-1073`), backend normalization (`api/modules/process/service.py:2778-2812`), wizard generation catalog (`core/process/wizard.py:3598-3676`), label dict (`core/process/messages.py:40-55`). Friendly types (`form`, `tool`, `ai`, `calculate`, `read_document`) only execute because of one big `if/elif`.

6. **Duplicate executor registration.** Two `SubProcessNodeExecutor` classes both `@register_executor(NodeType.SUB_PROCESS)` (`core/process/nodes/logic.py:437` and `:506`) — the later silently shadows the former.

7. **Dead enum members.** `NodeType.TRY_CATCH` and `NodeType.RETRY` (`core/process/schemas.py:68-70`) have no executor; any process using them → `NO_EXECUTOR` (`core/process/engine.py:489-491`).

8. **Generation safety gaps.** KB retrieval failure is swallowed → ungrounded generation (`core/process/wizard.py:1205-1206`); the LLM "QA review" output is trusted with no schema validation and is non-blocking on exception (`:1601, 1612-1614`); the prompt instructs the LLM to emit routing config for **non-existent** departments by name (`:1382-1388`); Decision `rules → Python expression` compilation (`api/modules/process/service.py:2822-2920`) is never validated against an executable grammar at generation time.

9. **"RAG" is keyword TF-IDF.** `core/process/platform_knowledge.py:8-11, 123-158` over `PROCESS_BUILDER_KB_*.md` only; the query is keyword-stuffed (`wizard.py:1196-1204`) so nearly everything is "retrieved" regardless of the goal.

10. **Read/write asymmetry.** Reads go through the DB `users` table (`_get_user_internal` `core/identity/service.py:1265`); security writes mutate `security_state.users` then attempt `save_user_to_db` with a disk fallback (`api/security.py:49-59`) — if the DB write fails, the resolver and the UI silently diverge.

---

## 4. Restructuring plan (phased, no behavior guesswork)

> Principle: **one source of truth per concept, one place to edit it, one resolver to read it.** Do it in safe, independently-shippable phases. Each phase ends green before the next.

### Phase A — Stop the bleeding (data integrity) — highest ROI, lowest risk
- **A1. One Department store.** Make the Security `/departments` endpoints write the **DB table** (delegate to the identity `DepartmentService`), or remove them and point the Security UI at the identity API. Kill the in-memory-only write path. Collapse the two `CreateDepartmentRequest` classes into one.
- **A2. Seed org placement.** On first-run/seed, give the admin (and demo users) a department + manager so `dynamic_manager` resolves. Add a guard: when an org has 0 managers, the builder already warns — surface the same in the portal pre-flight (already present) and in seeding.
- **A3. Single write path for identity attributes.** Route all `manager_id` / `department_id` writes through one service (`UserDirectoryService` / identity `DepartmentService`) that updates the DB and invalidates the cache. Security's user-update should call it rather than mutating `security_state.users` directly.

### Phase B — One source of truth for node types
- **B1. Central node-type registry.** A single module that defines, for each of the 11 shapes: friendly id, engine `NodeType`, icon, label, default config, and validator. Generate the frontend cosmetic map, the `service.py` normalization, the wizard catalog, and `messages.py` labels **from this one registry** (or have them import it). No more 4-place drift.
- **B2. Validate after normalization.** After `service.py` rewrites a node, validate its config against the shape's schema; reject/repair invalid nodes instead of letting them reach `NO_EXECUTOR`.
- **B3. Remove dead/ambiguous types.** Delete `TRY_CATCH`/`RETRY` (or implement executors); fix the duplicate `SubProcessNodeExecutor` registration.

### Phase C — Unify runtime resolution
- **C1. One resolver.** Make `NotificationNodeExecutor` and `HumanTaskNodeExecutor` call the same `resolve_process_assignee` (returning a small struct with user IDs + emails) instead of re-implementing manager/dept/role/group logic. Single place to fix routing bugs.
- **C2. Consistent source.** Decide that the DB `users`/`departments` tables are authoritative; `_user_context` is a cache derived from them at process start. Document and enforce.

### Phase D — UI/UX: a person-centric, standard identity experience
- **D1. Add Department + Manager columns** to Security → Users, with inline edit (writing through the Phase-A single path).
- **D2. One "Edit Person" panel** that shows roles, groups, department, manager, and job title together — instead of splitting them between the Users tab and the Department modal.
- **D3. Real org chart.** Render the hierarchy as an actual tree (parent/child), not flat cards; replace the cryptic `+ / − / Reset / Discard / Save` toolbar with labeled actions (zoom controls separated from "Add department", autosave or an explicit clearly-labeled edit mode).
- **D4. House style.** Drop emoji section headers for a consistent enterprise icon set; align spacing/typography with the (already clean) builder property panels.
- **D5. Generation grounding upgrade (optional/bigger).** Swap the keyword KB for the existing vector store used elsewhere, and stop keyword-stuffing the query.

### Sequencing
A → B → C can each ship independently; D depends on A (single write path). Recommend **A first** (fixes the split-brain + the approval failures you keep seeing), then **D1/D2** (the visible UX win), then **B**, then **C**.

---

## 5. Verification plan (after Phase A + a routing fix)

Concrete end-to-end test Ahmed asked for — *prove approvals reach the right person*:

1. Seed/confirm: a requester user with `manager_id` set and a `department` whose `manager_id` (head) is set; a distinct platform **role** (e.g. "Finance Approver") with a member.
2. Build a process with two approval steps: step 1 `dynamic_manager`, step 2 `role` (Finance Approver).
3. Run it (real engine via the end-user portal, not just the builder simulation) with an amount that forces the manager path.
4. Assert from the execution record / `ProcessApprovalRequest` rows that step 1's assignee == the requester's `manager_id`, and step 2's assignees == the role's members.
5. Repeat for `department_manager` (head of a named department) to prove it differs from `dynamic_manager`.
6. Confirm notifications resolve to the same people (since notification resolution is currently a separate path — this is also the test that would catch the Phase-C divergence).

---

## 5b. Verification result (done 2026-06-20)

**Manager routing now works end-to-end.** After adding the admin (`admin@agentforge.app`) to the Finance department with manager = Rania ElHadidi (via Org Chart → Edit Department → Add Person → reports-to), re-running the Employee Expense process with amount 800:
- No more "no manager assigned" pre-flight error (it went straight to "Running real test").
- AI Validate matched 800 vs the 800 receipt ("no discrepancies").
- The Decision routed to the **manager** path (800 ≥ 500).
- The **Manager Approval step paused as "Waiting for approval"** with the resolved **Manager ID `4852a347-…`** (admin's direct manager) + Department ID (Finance) + a live Approve/Reject gate.

⇒ This confirms `dynamic_manager` resolution works once org placement exists — i.e. the recurring failure was **purely the seeding gap**, not the routing logic. Still to verify: `role`-based routing (the current test process has no role-assignee step) and clean post-approval completion (the "Record Outcome" step still points at the dead tool — separate issue). Minor UX bug observed: after "Approve & continue", the final report did not re-surface (playback paused at Validate).

## 6. Appendix — file index

- Generation: `core/process/wizard.py`, `core/process/platform_knowledge.py`, `docs/PROCESS_BUILDER_KB_*.md`
- Normalization: `api/modules/process/service.py:2778+`, `ui/process-builder.js:1040+`, `core/process/messages.py`
- Schema: `core/process/schemas.py` (`NodeType`)
- Execution: `core/process/engine.py`, `core/process/nodes/{human,logic,integration}.py`
- Identity: `core/identity/service.py`, `api/modules/identity/{router,schemas}.py`, `database/models/department.py`
- Security: `api/security.py`, `core/security/{state,models,services}.py`, `database/models/user.py`
</content>
</invoke>
