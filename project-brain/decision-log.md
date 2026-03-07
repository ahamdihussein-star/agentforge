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

[Add your decisions below]
