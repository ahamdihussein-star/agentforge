# Decision Log

Record important architectural and implementation decisions.

## Format

### [YYYY-MM-DD] Decision Title
**Context**: Why this decision was needed
**Decision**: What was decided
**Rationale**: Why this approach was chosen
**Alternatives Considered**: Other options and why they were rejected
**Impact**: What this affects
**Status**: Active | Deprecated | Superseded

---

## Example Entry

### [2026-01-15] Database-Only Architecture
**Context**: System was using dual-write (database + JSON files) which caused sync issues and complexity

**Decision**: Remove all JSON file persistence, use PostgreSQL as single source of truth

**Rationale**: 
- Eliminates sync bugs between DB and JSON
- Simplifies codebase (no dual-write logic)
- Better for concurrent access and ACID guarantees
- Industry standard for production systems

**Alternatives Considered**:
- Keep dual-write: Rejected due to sync complexity
- JSON-only: Rejected due to scalability and concurrency issues

**Impact**:
- `core/security/state.py`: Removed JSON fallback in load_from_disk()
- All services use database only
- Backup strategy changed to PostgreSQL dumps

**Status**: Active

---

## Decisions

### [2026-03-08] AI Context System with RAG
**Context**: Large codebase makes it difficult for AI to maintain context and find relevant patterns

**Decision**: Implement RAG system with automatic code indexing and Windsurf integration

**Rationale**:
- AI can search for similar code patterns before writing new code
- Reduces code duplication
- Maintains consistency with existing patterns
- Auto-updates on every commit

**Alternatives Considered**:
- Manual documentation only: Too hard to keep updated
- No RAG system: AI would miss existing patterns

**Impact**:
- Created `.ai/context/` folder with indexing scripts
- Created `.windsurfrules` for Windsurf auto-loading
- Created `project-brain/` for organized knowledge
- Git hooks auto-update embeddings

**Status**: Active

---

### [2026-06-20] Rearchitect direction: 4-layer separation (no rewrite)
**Context**: The platform was built to "generate ANY agent at runtime from a prompt," which conflated build-time and run-time. Result: instability (heavy knowledge-base dependency at runtime) and no room for org customization. Goal: a logical, practical structure WITHOUT starting from scratch.

**Decision**: Separate the system into 4 clean layers:
1. Authoring (build-time, AI-assisted) — the generator (`core/agent/generator.py`) only PRODUCES an editable agent config; it is not the runtime. Orgs can also build/edit config manually (customization restored).
2. Agent definition — one versioned config schema = single source of truth (both conversational and process agents are just config).
3. Runtime — executes config deterministically; fast, no heavy KB dependency (stability).
4. Channels/Expose (NEW) — every published agent gets a per-agent API key + public REST endpoint + embeddable web chat widget + webhook. Same mechanism for both agent types.

**Rationale**: Runtime stability comes from executing explicit config, not from live LLM generation. Keeps existing assets (data model, LLM abstraction, process engine, chat runtime, generator-as-authoring).

**Alternatives Considered**: Full rewrite — rejected (too costly, loses working engine). Keep dynamic-runtime generation — rejected (root cause of instability).

**Impact**: Phased delivery. Phase 1 done; Phases 2–4 pending.

**Status**: Active

---

### [2026-06-20] Phase 1: Single API auth gate (close mass-unauthenticated surface)
**Context**: Audit found only ~20 of 121 routes in `api/main.py` required auth. `PUT /api/settings` was unauthenticated (config tampering); `llm_providers[]` API keys were returned in plaintext; `/api/debug/*` leaked agent/tool/settings data; and if the security module failed to import, the whole app ran with NO auth (fail-open).

**Decision**: Add one coarse-grained middleware (`api/auth_gate.py`, `AuthGateMiddleware`) requiring a valid bearer token on every `/api/*` route except an explicit public allowlist (login funnel + `/api/health` + reserved `/api/public/*` channel namespace). Block `/api/debug/*` unless `ENABLE_DEBUG_ENDPOINTS=true`. Fail-CLOSED when the token layer is unavailable. Also mask `llm_providers[]` keys in `GET /api/settings`.

**Rationale**: Closes ~90 exposed routes in one place instead of editing every route. Fine-grained per-user/permission checks stay in each route's `Depends()`. Rolls out safely via `AUTH_GATE_MODE=monitor` (logs would-be blocks, blocks nothing) → `enforce`.

**Alternatives Considered**: Add `Depends(require_auth)` to all 121 routes — rejected (error-prone, easy to miss new routes).

**Impact**:
- New file `api/auth_gate.py`.
- `api/main.py`: registers `AuthGateMiddleware` after CORS; masks per-provider keys in `get_settings()`.
- Env: `AUTH_GATE_MODE` (monitor|enforce, default monitor), `ENABLE_DEBUG_ENDPOINTS` (default false).

**Status**: Active (code complete; deploy in monitor mode, verify logs, then set enforce)

---

### [2026-06-20] DOC DRIFT NOTE (not a decision)
The 2026-01-15 "Database-Only Architecture" entry says JSON/dual-write was removed and Postgres is the single source of truth. Audit (2026-06-20) found `api/main.py` still uses a DB + in-memory fallback (e.g. `app_state.agents` fallback on DB error, ~main.py:4734–4764). This dual-storage is the root cause behind disappearing agents / org_id drift / duplicate agents and is slated for Phase 2. Treat the older entry as aspirational, not current reality, until Phase 2 removes the fallback.

---

[Add your decisions below]
