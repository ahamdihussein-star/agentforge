## PHASE 4 — Cleanup Proposal (non-destructive)

This is a proposal only; **no files are deleted**.

### Documentation files that reference missing paths

| Doc file | Missing referenced path |
|---|---|
| `PROJECT_STATUS.md` | `/ui/chat.html` |
| `PROJECT_STATUS.md` | `/ui/index.html` |
| `PROJECT_STATUS.md` | `index.html` |
| `database/COMMON_ISSUES.md` | `comprehensive_db_check.sh` |
| `database/COMMON_ISSUES.md` | `database/models/*.py` |
| `database/COMMON_ISSUES.md` | `database/types.py` |
| `database/COMMON_ISSUES.md` | `fix_super_admin_permissions.py` |
| `database/COMMON_ISSUES.md` | `fix_user_roles.py` |
| `database/COMMON_ISSUES.md` | `migrate_to_db_complete.py` |
| `database/COMMON_ISSUES.md` | `python database/init_db.py` |
| `database/COMMON_ISSUES.md` | `scripts/cleanup_duplicate_roles.py` |
| `database/COMMON_ISSUES.md` | `scripts/cleanup_duplicate_roles_v2.py` |
| `database/COMMON_ISSUES.md` | `scripts/fix_super_admin_permissions.py` |
| `database/COMMON_ISSUES.md` | `scripts/update_user_role_ids.py` |
| `database/COMMON_ISSUES.md` | `update_user_role_ids.py` |
| `docs/MASTER_DOCUMENTATION_UPDATED.md` | `database/types.py` |
| `docs/MASTER_DOCUMENTATION_UPDATED.md` | `scripts/migrate_to_db.py` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `/ui/chat.html` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `/ui/index.html` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `comprehensive_db_check.sh` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `index.html` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `migrate_to_db_complete.py` |
| `docs/PHASE0_REPOSITORY_DISCOVERY.md` | `scripts/migrate_to_db.py` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/chat.css` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/chat.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index.css` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/agent-wizard.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/app-core.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/approvals.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-approvals-page.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-auth-permissions.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-chat.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-demo-tools.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-security-identity.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/features-tools-wizard.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/index_parts/process-playback.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/process-builder.css` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/process-builder.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/theme.css` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `/ui/theme.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdn.jsdelivr.net/npm/marked/marked.min.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js` |
| `docs/PHASE1_CODE_TRUTH_REPORT.md` | `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css` |
| `docs/PHASE2_DOCUMENTATION_DRIFT_MATRIX.md` | `scripts/migrate_to_db.py` |
| `scripts/README.md` | `comprehensive_db_check.sh` |
| `scripts/README.md` | `database/types.py` |
| `scripts/README.md` | `migrate_to_db_complete.py` |

### Duplicate headings across docs (possible duplication)

| Heading | Appears in |
|---|---|
| Access | `README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Agent System | `README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Anti-hallucination note | `docs/PROCESS_BUILDER_KB_IDENTITY.md`, `docs/PROCESS_BUILDER_KB_PROFILE_CONTEXT.md` |
| Audit Logging | `database/README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Enterprise AI Agent Builder Platform | `README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Frontend | `PROJECT_STATUS.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Install dependencies | `README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Output: | `database/COMMON_ISSUES.md`, `scripts/README.md` |
| Overview | `docs/MASTER_DOCUMENTATION_UPDATED.md`, `docs/PROCESS_BUILDER_KB_IDENTITY.md`, `docs/SECURITY_AND_IDENTITY_ARCHITECTURE.md`, `scripts/README.md` |
| Security | `README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Settings | `PROJECT_STATUS.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| User Management | `PROJECT_STATUS.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| Verify | `database/README.md`, `docs/MASTER_DOCUMENTATION_UPDATED.md` |
| ✅ CORRECT: | `database/COMMON_ISSUES.md`, `scripts/README.md` |
| ❌ WRONG: | `database/COMMON_ISSUES.md`, `scripts/README.md` |
| 🚀 Quick Start | `README.md`, `database/README.md` |
### Empty / tiny files

**Empty files:**
- `data/.gitkeep`
- `uploads/.gitkeep`

**Very small files (<=32 bytes):**
- `api/__init__.py`
- `core/agent/__init__.py`
- `core/llm/__init__.py`
- `core/llm/providers/__init__.py`
- `core/tools/__init__.py`
- `core/tools/builtin/__init__.py`
- `data/documents.json`
- `data/security/db_permissions.json`
- `data/security/departments.json`
- `data/security/groups.json`
- `data/security/invitations.json`
- `data/security/kb_permissions.json`
- `data/security/ldap_configs.json`
- `data/security/oauth_configs.json`
- `data/security/policies.json`
- `data/security/tool_permissions.json`

### Suggested non-destructive next steps

- Consolidate duplicated doc sections by keeping one canonical section and adding links from duplicates (do not remove duplicates unless explicitly desired).
- For any docs referencing missing code paths, mark the section as **Deprecated — functionality removed from codebase** and link to the replacement (if present).
- Add a short "Documentation status" block at the top of major docs pointing to the Phase 0–4 generated reports.
