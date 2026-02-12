## Repository Inventory (Phase 0)

- Root: `/Users/ahmedhamdy/Documents/agentforge`
- Total files discovered: **263**
- Unread files: **0**

### COMPLETE File Inventory

| Path | File Type | Primary Responsibility | Exports Public Interface? | Security-related? |
|---|---|---|---|---|
| `.DS_Store` | other | Other | no | no |
| `.cursorrules` | config | Other | no | yes |
| `.env` | other | Other | no | no |
| `.env.example` | config | Other | no | yes |
| `.gitignore` | config | Other | no | no |
| `.redeploy-trigger` | other | Other | no | no |
| `.vscode/settings.json` | config | Other | no | no |
| `AgentForge_Logo.png` | other | Other | no | no |
| `Dockerfile` | code | Other | no | yes |
| `PROJECT_STATUS.md` | doc | FastAPI API server / router | no | yes |
| `README.md` | doc | FastAPI API server / router | no | yes |
| `agent-hub.png` | other | Other | no | no |
| `agent-studio.png` | other | Other | no | no |
| `alembic.ini` | config | Other | no | no |
| `alembic/.DS_Store` | other | Alembic migrations | no | no |
| `alembic/env.py` | code | Database schema/models/migrations | yes | no |
| `alembic/script.py.mako` | other | Alembic migrations | no | no |
| `alembic/versions/001_add_website_tooltype.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/002_add_tool_access_control.py` | code | Database schema/models/migrations | yes | yes |
| `alembic/versions/003_add_process_agent_support.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/004_add_process_settings_tables.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/005_add_approval_assigned_group_ids.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/006_add_lab_history_items.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/007_add_lab_mock_apis.py` | code | Database schema/models/migrations | yes | no |
| `alembic/versions/008_add_identity_fields.py` | code | Database schema/models/migrations | yes | no |
| `api/.DS_Store` | other | API application / modules | no | no |
| `api/__init__.py` | code | API application / modules | yes | no |
| `api/health.py` | code | FastAPI API server / router | yes | no |
| `api/main.py` | code | FastAPI API server / router | yes | yes |
| `api/modules/__init__.py` | code | API application / modules | yes | no |
| `api/modules/access_control/__init__.py` | code | API application / modules | yes | no |
| `api/modules/access_control/router.py` | code | FastAPI API server / router | yes | yes |
| `api/modules/access_control/schemas.py` | code | API application / modules | yes | yes |
| `api/modules/access_control/service.py` | code | API application / modules | yes | yes |
| `api/modules/conversations/__init__.py` | code | API application / modules | yes | no |
| `api/modules/conversations/router.py` | code | FastAPI API server / router | yes | no |
| `api/modules/conversations/service.py` | code | API application / modules | yes | yes |
| `api/modules/identity/__init__.py` | code | API application / modules | yes | no |
| `api/modules/identity/router.py` | code | FastAPI API server / router | yes | yes |
| `api/modules/identity/schemas.py` | code | API application / modules | yes | no |
| `api/modules/lab/__init__.py` | code | API application / modules | yes | no |
| `api/modules/lab/router.py` | code | FastAPI API server / router | yes | no |
| `api/modules/lab/schemas.py` | code | API application / modules | yes | no |
| `api/modules/lab/service.py` | code | API application / modules | yes | yes |
| `api/modules/process/__init__.py` | code | API application / modules | yes | no |
| `api/modules/process/router.py` | code | FastAPI API server / router | yes | yes |
| `api/modules/process/schemas.py` | code | API application / modules | yes | yes |
| `api/modules/process/service.py` | code | API application / modules | yes | yes |
| `api/security.py` | code | FastAPI API server / router | yes | yes |
| `core/.DS_Store` | other | Core logic | no | no |
| `core/__init__.py` | code | Core logic | no | no |
| `core/agent/__init__.py` | code | Core logic | no | no |
| `core/agent/engine.py` | code | Core logic | yes | yes |
| `core/agent/generator.py` | code | Core logic | yes | yes |
| `core/feature_flags.py` | code | Core logic | yes | no |
| `core/identity/__init__.py` | code | Core logic | no | no |
| `core/identity/service.py` | code | Core logic | yes | yes |
| `core/llm/.DS_Store` | other | Core logic | no | no |
| `core/llm/__init__.py` | code | Core logic | no | no |
| `core/llm/base.py` | code | Core logic | yes | yes |
| `core/llm/factory.py` | code | Core logic | yes | no |
| `core/llm/instruction_enforcer.py` | code | Core logic | yes | yes |
| `core/llm/providers/__init__.py` | code | Core logic | no | no |
| `core/llm/providers/anthropic.py` | code | Core logic | yes | yes |
| `core/llm/providers/ollama.py` | code | Core logic | yes | yes |
| `core/llm/providers/openai.py` | code | Core logic | yes | yes |
| `core/llm/registry.py` | code | Core logic | yes | no |
| `core/llm/router.py` | code | Core logic | yes | no |
| `core/process/__init__.py` | code | Core logic | no | yes |
| `core/process/engine.py` | code | Core logic | yes | yes |
| `core/process/messages.py` | code | Core logic | yes | yes |
| `core/process/nodes/__init__.py` | code | Core logic | no | no |
| `core/process/nodes/base.py` | code | Core logic | yes | no |
| `core/process/nodes/data.py` | code | Core logic | yes | no |
| `core/process/nodes/flow.py` | code | Core logic | yes | no |
| `core/process/nodes/human.py` | code | Core logic | yes | yes |
| `core/process/nodes/integration.py` | code | Core logic | yes | yes |
| `core/process/nodes/logic.py` | code | Core logic | yes | no |
| `core/process/nodes/task.py` | code | Core logic | yes | yes |
| `core/process/nodes/timing.py` | code | Core logic | yes | no |
| `core/process/platform_knowledge.py` | code | Core logic | yes | no |
| `core/process/result.py` | code | Core logic | yes | yes |
| `core/process/schemas.py` | code | Core logic | yes | yes |
| `core/process/services/__init__.py` | code | Core logic | no | no |
| `core/process/services/approval.py` | code | Core logic | yes | yes |
| `core/process/services/notification.py` | code | Core logic | yes | yes |
| `core/process/state.py` | code | Core logic | yes | yes |
| `core/process/wizard.py` | code | Core logic | yes | yes |
| `core/security/.DS_Store` | other | Core logic | no | yes |
| `core/security/__init__.py` | code | Core logic | no | yes |
| `core/security/engine.py` | code | Core logic | yes | yes |
| `core/security/models.py` | code | Core logic | yes | yes |
| `core/security/services.py` | code | Core logic | yes | yes |
| `core/security/state.py` | code | Core logic | yes | yes |
| `core/tools/.DS_Store` | other | Core logic | no | no |
| `core/tools/__init__.py` | code | Core logic | no | no |
| `core/tools/base.py` | code | Core logic | yes | no |
| `core/tools/builtin/__init__.py` | code | Core logic | no | no |
| `core/tools/builtin/api.py` | code | Core logic | yes | yes |
| `core/tools/builtin/database.py` | code | Core logic | yes | no |
| `core/tools/builtin/rag.py` | code | Core logic | yes | no |
| `data/.DS_Store` | other | Local data snapshots | no | no |
| `data/.gitkeep` | other | Local data snapshots | no | no |
| `data/agents.json` | config | Local data snapshots | no | no |
| `data/agents/hr_helper.json` | config | Local data snapshots | no | no |
| `data/chunks_index.json` | config | Local data snapshots | no | yes |
| `data/conversations.json` | config | Local data snapshots | no | yes |
| `data/documents.json` | config | Local data snapshots | no | no |
| `data/integrations.json` | config | Local data snapshots | no | no |
| `data/scraped_pages.json` | config | Local data snapshots | no | yes |
| `data/security/audit_logs.json` | config | Local data snapshots | no | yes |
| `data/security/db_permissions.json` | config | Local data snapshots | no | yes |
| `data/security/departments.json` | config | Local data snapshots | no | yes |
| `data/security/groups.json` | config | Local data snapshots | no | yes |
| `data/security/invitations.json` | config | Local data snapshots | no | yes |
| `data/security/kb_permissions.json` | config | Local data snapshots | no | yes |
| `data/security/ldap_configs.json` | config | Local data snapshots | no | yes |
| `data/security/oauth_configs.json` | config | Local data snapshots | no | yes |
| `data/security/organizations.json` | config | Local data snapshots | no | yes |
| `data/security/policies.json` | config | Local data snapshots | no | yes |
| `data/security/roles.json` | config | Local data snapshots | no | yes |
| `data/security/settings.json` | config | Local data snapshots | no | yes |
| `data/security/tool_permissions.json` | config | Local data snapshots | no | yes |
| `data/security/users.json` | config | Local data snapshots | no | yes |
| `data/settings.json` | config | Local data snapshots | no | no |
| `data/tools.json` | config | Local data snapshots | no | no |
| `data/uploads/.DS_Store` | other | Local data snapshots | no | no |
| `data/uploads/1db74aa1_Sample_Invoice.png` | other | Local data snapshots | no | no |
| `data/uploads/392f8e47_Sample_Receipt.png` | other | Local data snapshots | no | no |
| `data/uploads/5fa70fd9_Sample_Receipt.png` | other | Local data snapshots | no | no |
| `data/uploads/62f28d9a_Sample_Invoice.png` | other | Local data snapshots | no | no |
| `data/uploads/8b83506c_invoice_example.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_employee_handbook_including_their_vacation_policie_8ea5b8.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_generated_document_99015b.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_hr_policy_document_0ef476.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_hr_policy_document_8fc7ad.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_invoice_image_570341.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_invoice_image_69abb0.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_mation_714c87.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_ocring_61c89b.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_ocring_demo_1d229f.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_ocring_demo_2b9007.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_retail_company_invoice_8a9313.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_sample_hr_policy_f7858b.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_sample_retail_invoice_243fe5.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_sample_retail_invoice_79d3e5.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_simple_retail_invoice_2a58c0.png` | other | Local data snapshots | no | no |
| `data/uploads/demo_tech_company_7d3e4e.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_tech_company_called_abc_db2797.pdf` | other | Local data snapshots | no | no |
| `data/uploads/demo_tech_company_including_his_salary_and_benefits_330dc6.pdf` | other | Local data snapshots | no | no |
| `data/uploads/ec0a4de3_Sample_Invoice(1).png` | other | Local data snapshots | no | no |
| `data/uploads/f0c1aefb_HR_Policy_Manual.txt` | other | Local data snapshots | no | no |
| `data/uploads/fc32166e_Sample_Invoice.png` | other | Local data snapshots | no | no |
| `database/.DS_Store` | other | Database layer | no | no |
| `database/COMMON_ISSUES.md` | doc | FastAPI API server / router | no | yes |
| `database/README.md` | doc | Database schema/models/migrations | no | yes |
| `database/__init__.py` | code | Database schema/models/migrations | yes | no |
| `database/base.py` | code | FastAPI API server / router | yes | yes |
| `database/column_types.py` | code | Database schema/models/migrations | yes | no |
| `database/config.py` | code | FastAPI API server / router | yes | yes |
| `database/enums.py` | code | Database layer | yes | no |
| `database/init_db.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/__init__.py` | code | Database layer | no | yes |
| `database/models/agent.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/agent_access.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/audit.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/conversation.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/db_permission.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/department.py` | code | Database schema/models/migrations | yes | no |
| `database/models/invitation.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/kb_permission.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/knowledge_base.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/lab_history.py` | code | Database schema/models/migrations | yes | no |
| `database/models/lab_mock_api.py` | code | Database schema/models/migrations | yes | no |
| `database/models/ldap_config.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/oauth_config.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/organization.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/policy.py` | code | Database schema/models/migrations | yes | no |
| `database/models/process_execution.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/process_settings.py` | code | Database schema/models/migrations | yes | no |
| `database/models/role.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/security_settings.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/settings.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/tool.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/tool_permission.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/user.py` | code | Database schema/models/migrations | yes | yes |
| `database/models/user_group.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/__init__.py` | code | Database layer | no | no |
| `database/services/agent_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/audit_service.py` | code | Database layer | yes | yes |
| `database/services/conversation_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/department_service.py` | code | Database layer | yes | yes |
| `database/services/encryption.py` | code | Database layer | yes | yes |
| `database/services/invitation_service.py` | code | Database layer | yes | yes |
| `database/services/organization_service.py` | code | Database layer | yes | yes |
| `database/services/process_execution_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/process_settings_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/role_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/security_settings_service.py` | code | Database layer | yes | yes |
| `database/services/system_settings_service.py` | code | Database layer | yes | yes |
| `database/services/tool_service.py` | code | Database schema/models/migrations | yes | yes |
| `database/services/user_group_service.py` | code | Database layer | yes | yes |
| `database/services/user_service.py` | code | Database schema/models/migrations | yes | yes |
| `docker-compose.yml` | config | Other | no | yes |
| `docs/.DS_Store` | other | Documentation | no | no |
| `docs/MASTER_DOCUMENTATION_UPDATED.md` | doc | FastAPI API server / router | no | yes |
| `docs/PROCESS_APPROVAL_AND_IDENTITY.md` | doc | Documentation | no | yes |
| `docs/PROCESS_BUILDER_KB_DOCUMENTS.md` | doc | Documentation | no | no |
| `docs/PROCESS_BUILDER_KB_IDENTITY.md` | doc | Documentation | no | yes |
| `docs/PROCESS_BUILDER_KB_PROFILE_CONTEXT.md` | doc | Documentation | no | yes |
| `docs/PROCESS_BUILDER_KB_ROUTING.md` | doc | Documentation | no | no |
| `docs/PROCESS_BUILDER_KB_SHAPES.md` | doc | Documentation | no | yes |
| `docs/PROCESS_BUILDER_KB_TAXONOMIES.md` | doc | Documentation | no | no |
| `docs/SECURITY_AND_IDENTITY_ARCHITECTURE.md` | doc | Documentation | no | yes |
| `examples/customer-support.yaml` | config | Examples | no | yes |
| `requirements.txt` | other | Other | no | no |
| `run.py` | code | Other | yes | no |
| `scripts/README.md` | doc | Documentation | no | no |
| `scripts/add_google_oauth_credentials.py` | code | Operational scripts | yes | yes |
| `scripts/add_identity_columns.py` | code | Operational scripts | yes | yes |
| `scripts/add_organization_oauth_columns.py` | code | Operational scripts | yes | yes |
| `scripts/add_role_columns.py` | code | Operational scripts | yes | yes |
| `scripts/add_user_columns.py` | code | Operational scripts | no | yes |
| `scripts/auto-commit.sh` | code | Shell script | no | yes |
| `scripts/comprehensive_db_check.sh` | code | Shell script | no | no |
| `scripts/create_missing_tables.py` | code | Operational scripts | yes | yes |
| `scripts/fix_agent_status_enum.py` | code | Operational scripts | yes | no |
| `scripts/fix_agent_status_to_string.py` | code | Operational scripts | yes | no |
| `scripts/fix_all_enums_to_string.py` | code | Operational scripts | yes | yes |
| `scripts/fix_message_role_to_string.py` | code | Operational scripts | yes | yes |
| `scripts/make_password_hash_nullable.py` | code | Operational scripts | yes | yes |
| `scripts/migrate_to_db_complete.py` | code | Operational scripts | yes | yes |
| `scripts/split_app_features.py` | code | Operational scripts | yes | yes |
| `scripts/split_ui_html_assets.py` | code | Operational scripts | yes | no |
| `scripts/split_ui_index_assets.py` | code | Operational scripts | yes | no |
| `scripts/split_ui_index_js.py` | code | Operational scripts | yes | no |
| `setup_demo_db.sh` | code | Shell script | no | no |
| `tools-icon.png` | other | Other | no | no |
| `ui/.DS_Store` | other | Frontend UI assets | no | no |
| `ui/chat.css` | code | CSS styles | no | yes |
| `ui/chat.html` | code | HTML UI page (title: AgentForge - AI Assistant) | no | yes |
| `ui/chat.js` | code | JavaScript UI logic | no | yes |
| `ui/index.css` | code | CSS styles | no | yes |
| `ui/index.html` | code | HTML UI page (title: AgentForge - AI Agent Builder) | no | yes |
| `ui/index.js` | code | JavaScript UI logic | no | no |
| `ui/index_parts/agent-wizard.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/app-core.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/app-features.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/approvals.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-approvals-page.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-auth-permissions.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-chat.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-demo-tools.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-security-identity.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/features-tools-wizard.js` | code | JavaScript UI logic | no | yes |
| `ui/index_parts/process-playback.js` | code | JavaScript UI logic | no | yes |
| `ui/lab.html` | code | HTML UI page (title: AgentForge Lab - Test Data Generator) | no | yes |
| `ui/process-builder.css` | code | CSS styles | no | no |
| `ui/process-builder.html` | code | HTML UI page (title: AgentForge - Workflow Builder) | no | yes |
| `ui/process-builder.js` | code | JavaScript UI logic | no | yes |
| `ui/theme.css` | code | HTML UI page | no | no |
| `ui/theme.js` | code | JavaScript UI logic | no | no |
| `uploads/.gitkeep` | other | Other | no | no |

### Documentation Files and Sections

- `PROJECT_STATUS.md`
  - AgentForge Project Status
  -   🎯 Current State: Production-Ready Enterprise AI Platform
  -   ✅ COMPLETED FEATURES (All 100%)
  -     1. Database Layer
  -     2. Admin Portal (`/ui/index.html` - ~32,000 lines)
  -       Authentication & Security
  -       User Management
  -       Groups Management ✨
  -       Agent Management
  -       Access Control System ✨
  -       Tool Management
  -       Settings
  -       Lab Module ✨
  -     7. Process Agents & Visual Process Builder ✨
  -     3. End User Portal (`/ui/chat.html`)
  -     4. LLM Integration (10+ Providers)
  -     5. Conversations & Chat
  -     6. Security Features
  -     8. Identity & User Directory ✨ (NEW)
  -   📁 Key Files Reference
  -     Backend
  -     Frontend
  -     Key Frontend Components in `index.html`:
  -   🔧 Development Commands
  - Start server
  - Database validation
  - Test LLM providers
  - (via API endpoint /api/settings/test-llm)
  -   🚀 Git Workflow (Auto Commit + Push)
  -   🚨 Important Implementation Details
  -     Task Permissions
  -     Access Control Flow
  -     Delegated Admin UI Restrictions
  -     Agent Visibility
  -   🚨 Rules for AI Agents
  -   📋 Checklist for New AI Chat Session
  -     Key Concepts:
  -   📊 Architecture
  -   🔄 Recent Major Updates (Summary)
  -   ⏳ Current Focus / Known Issues
  -     Active Work:
  -     Known Considerations:
- `README.md`
  - 🔥 AgentForge
  -   Enterprise AI Agent Builder Platform
  -   🚀 Quick Start
  - Clone repository
  - Install dependencies
  - Run locally
  - Access
  - UI: http://localhost:8000/ui
  - API Docs: http://localhost:8000/docs
  -   📚 Documentation
  -   📁 Project Structure
  -   ✨ Features
  -     Agent System
  -     Tools (8 Active Types)
  -     Process Builder (Workflows)
  -     Security
  -   🚀 Deployment
  -     Railway (Recommended)
  - Push to main branch - Railway auto-deploys
  -     Docker
  -   🔧 Development
  -     Making Changes
  -     Before Pushing
  - Check Python syntax
  - Check JS syntax (basic)
  - Commit and push
  -   📞 Links
  -   📄 License
- `database/COMMON_ISSUES.md`
  - 🚨 Database Common Issues & Pitfalls
  -   ⚠️ CRITICAL - ALWAYS CHECK BEFORE ADDING MODELS
  -   🔥 **RECURRING PATTERNS (CRITICAL - READ FIRST!)**
  -     ⚠️ Pattern #1: **Incomplete Schema Mapping** (Issues #14, #20, #21)
  -       The Problem:
  -       Examples:
  -       Why It Keeps Happening:
  -       The Solution (MANDATORY):
  - 1. Read the Pydantic model first
  - 2. List ALL fields in the Pydantic model
  - Write them down in a checklist
  - 3. Create SQLAlchemy model with ALL fields
  - Check off each field as you add it
  - 4. Write migration script with ALL fields
  - Check off each field as you map it
  - scripts/compare_schemas.py
  - Compares Pydantic vs SQLAlchemy vs JSON vs Migration
  - Flags any missing fields
  - Run schema comparison before every commit
  - In migration script, add comments:
  - Pydantic: id → SQLAlchemy: id
  - Pydantic: name → SQLAlchemy: name
  - Pydantic: permissions → SQLAlchemy: permissions ✅
  - ... document EVERY field mapping
  -       Impact If Ignored:
  -     ⚠️ Pattern #2: **Reserved SQLAlchemy Attribute Names** (Issue #1)
  -       The Problem:
  -       Prevention:
  - Before adding ANY column, check:
  -     ⚠️ Pattern #3: **PostgreSQL-Specific Types** (Issues #6, #8, #9)
  -       The Problem:
  -       Prevention:
  - Check before committing:
  - Should return: nothing!
  -   🛡️ **ZERO-TOLERANCE CHECKLIST (Before ANY Database Work)**
  -     📋 Pre-Work Checklist:
  -     📋 During-Work Checklist (for new models):
  -     📋 Pre-Commit Checklist:
  -   🔴 **RESERVED WORDS IN SQLALCHEMY**
  -     Issue #1: `metadata` is Reserved
  -       Problem:
  - ❌ WRONG - SQLAlchemy reserves 'metadata'
  -       Error:
  -       Solution:
  - ✅ CORRECT - Use alternative name
  - OR
  - OR
  -       Why:
  -       Prevention:
  -   🔴 **FOREIGN KEY ISSUES**
  -     Issue #2: Circular Dependencies in Foreign Keys
  -       Problem:
  -       Error:
  -       Solutions:
  - ✅ Works for now
  - ✅ Deferred constraint creation
  -   🟡 **RELATIONSHIP DEFINITIONS WITHOUT FOREIGN KEYS**
  -     Issue #3: Relationships Require ForeignKeys
  -       Problem:
  - ❌ WRONG - relationship() needs ForeignKey
  -       Error:
  -       Solution:
  -   🟡 **PYDANTIC WARNINGS**
  -     Issue #4: Protected Namespace Warnings
  -       Warning:
  -       Solution:
  -   🔴 **DATA MIGRATION ISSUES**
  -     Issue #5: Duplicate Key Violations on Unique Constraints
  -       Problem:
  - ❌ WRONG - Only checks primary key
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Check ALL unique constraints
  - UPDATE existing record
  - CREATE new record
  -       Best Practices for Migration Scripts:
  - For Organizations:
  - For Users:
  - For Roles:
  - ✅ IDEMPOTENT - Can run multiple times safely
  - Should be safe to run repeatedly
  -       Why This Matters:
  -       Prevention:
  -   🔴 **ENUM TYPE MISMATCHES**
  -     Issue #6: Invalid Enum Value During Migration
  -       Problem:
  - ❌ JSON has: type = "website"
  - ❌ Database Enum: API, DATABASE, RAG, EMAIL, WEB_SCRAPING, WEB_SEARCH...
  - ❌ No "WEBSITE" in enum!
  -       Error:
  -       Root Cause:
  -       Solution - Two Approaches:
  - ✅ Update Enum to include all legacy values
  - ... etc
  - ✅ Normalize/map legacy values during migration
  -       Best Practices for Enums:
  - ... other types ...
  - At top of migration script
  - Pre-migration validation
  -       Why This Matters:
  -       Prevention:
  -       ⚠️ **IMPORTANT: Enterprise-Grade Solution Applied**
  - Single source of truth for all enums
  - ... all types
  - Handles normalization and mapping
  - Centralized legacy mapping
  - ... all legacy mappings
  - Proper way to alter enums in production
  - database/models/tool.py
  - Use centralized logic
  - Not hard-coded TYPE_MAPPING in migration script
  -       ⚠️ **CRITICAL: PostgreSQL Enum Types Are Separate from Python Enums!**
  - alembic/versions/001_add_website_tooltype.py
  - Check if 'website' exists in PostgreSQL enum
  - If not, add it via ALTER TYPE
  - database/init_db.py
  - Run Alembic migrations
  - Already calls init_db.py which now runs migrations
  -   🔴 **IMPORT ERRORS AFTER TYPE CONVERSION**
  -     Issue #7: NameError After Database-Agnostic Conversion
  -       Problem:
  - ❌ WRONG Import Pattern:
  - Code uses:
  - Error: NameError: name 'JSON' is not defined
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT Import Pattern:
  - Now both work:
  -       Best Practices for Type Conversions:
  - Pattern for replacements:
  - Import: Add all needed types
  - Usage: Update column definitions
  - Quick validation
  - Should not raise ImportError
  - Check for undefined names in models
  - Ensure JSON is imported in all files
  -       Why This Matters:
  -       Prevention:
  -   🔴 **INET TYPE - PostgreSQL-Specific**
  -     Issue #8: INET Column Type (PostgreSQL-Specific)
  -       Problem:
  - ❌ WRONG - PostgreSQL-specific:
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Database-agnostic:
  -       Fixed Files:
  -       Why This Matters:
  -       Prevention:
  - Check before committing:
  - Or run comprehensive check:
  -   🔴 **MODEL NAME CONFLICTS - Database vs Core**
  -     Issue #10: Import Name Conflict Between DB and Core Models
  -       Problem:
  - ❌ WRONG - Ambiguous import:
  - Both named "UserMFA" - conflict!
  -       Error:
  -       Root Cause:
  -       Solution Pattern:
  - ✅ CORRECT - Use aliases for DB models:
  - Clear distinction:
  -       Convention Established:
  - ALWAYS use this pattern in services:
  - 1. Import DB models with descriptive alias
  - 2. Import Core models without prefix
  - 3. Conversion function clearly named
  -       Why This Matters:
  -       Prevention:
  - Check for ambiguous imports:
  -   🔴 **POSTGRESQL ENUM TYPE PERSISTS**
  -     Issue #9: Native PostgreSQL Enum in Database Despite Model Fix
  -       Problem:
  - ✅ Model is CORRECT:
  - ❌ But Database has:
  -       Error:
  -       Root Cause:
  -       Solution:
  - scripts/fix_tools_table.py
  - alembic/versions/002_remove_tool_enum.py
  - Create new column
  - Copy data
  - Drop old column and enum
  - Rename column
  - Reverse process
  -       Why This Happened:
  -       Fixed Files:
  -       Prevention:
  - NEVER use native PostgreSQL enums:
  - ALWAYS use String + Python enum validation:
  -       Deployment Strategy:
  -   🔵 **BEST PRACTICES LEARNED**
  -     1. Column Naming Conventions
  - ✅ GOOD
  - ❌ AVOID
  -     2. Reserved Words to NEVER Use
  -     3. Import Order Matters
  - ✅ CORRECT ORDER
  -     4. Index Naming
  - ✅ GOOD - Explicit names
  - ❌ AVOID - Auto-generated names can clash
  -   📋 **PRE-COMMIT CHECKLIST**
  -   🔍 **QUICK SEARCH COMMANDS**
  - Check for 'metadata' usage
  - Check for common reserved words
  - Check for relationship definitions
  - Check for ForeignKey usage
  -   📚 **REFERENCES**
  -   🔴 **PYDANTIC TYPE MISMATCH - DB TO CORE CONVERSION**
  -     Issue #17: Validation Errors - Type Conversion Missing
  -       Problem:
  - ❌ WRONG - Direct assignment without type conversion
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Type conversions for Pydantic validation
  - 1. Convert UUID to string
  - 2. Convert auth_provider to enum (required field!)
  - 3. Parse JSON strings to lists
  - ... rest of fields
  -       Why:
  -       Prevention:
  - Read the Core model first
  - IDE will warn if types don't match
  -       Related Issues:
  -   🔴 **MISSING IMPORTS AFTER CODE CHANGES**
  -     Issue #18: `NameError` - Used Type Without Importing
  -       Problem:
  - ❌ WRONG - Import statement missing AuthProvider
  - ... later in code ...
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Include all used types in import
  -       Why:
  -       Prevention:
  - List all used types in the file
  - Compare with imports
  - Check for undefined names
  -       Related Issues:
  -   🔴 **DATA MIGRATION INCOMPLETE - MISSING FIELDS**
  -     Issue #19: Missing `role_ids` in User Migration
  -       Problem:
  - ❌ WRONG - Migration script missing role_ids
  - ... other fields ...
  - ❌ NO role_ids field!
  -       Error (User-facing):
  -       Root Cause:
  -       Solution:
  - Load role_ids from JSON files
  - Update existing database users
  - ✅ CORRECT - Map role_ids from JSON
  - Try UUID as-is
  - ... other fields ...
  -       Why:
  -       Prevention:
  - Compare DB model with Core model
  - After migration, verify fields
  -       Related Issues:
  -   🔴 **MISSING DATABASE COLUMNS IN ROLE MODEL**
  -     Issue #20: `Role` model missing critical columns (permissions, parent_id, level, created_by)
  -       Problem:
  -       Error:
  -       Root Cause:
  -       Solution:
  - ... existing fields ...
  - Permissions (stored as JSON array of permission strings)
  - Hierarchy
  - Metadata
  - Fetch from DB and convert to core.security.Role
  - Parse permissions JSON, handle type conversions
  -       Why:
  -       Prevention:
  -   🔴 **MISSING ROLE PERMISSIONS IN MIGRATION**
  -     Issue #21: Role migration not storing `permissions` field → Empty user permissions → No UI menu
  -       Problem:
  - ❌ WRONG (scripts/migrate_to_db_complete.py, lines 166-173 before fix):
  - ❌ Missing: permissions, parent_id, level, created_by
  -       Error Chain:
  -       Symptoms:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Store ALL role fields:
  - ✅ CORRECT - Multi-strategy mapping:
  - Legacy string ID mapping (e.g., "role_super_admin" → "Super Admin")
  - Strategy 1: Check if it's already a UUID (from previous migration)
  - Strategy 2: Use legacy mapping (e.g., "role_super_admin" → "Super Admin")
  - Strategy 3: Direct name match (if somehow the name was stored)
  -       Why:
  -       Prevention:
  -   🔴 **EMAIL MISMATCH IN USER LOOKUP**
  -     Issue #22: Using email for user lookup when emails differ between DB and JSON
  -       Problem:
  -       Error Chain:
  -       Root Cause:
  -       Symptoms:
  -       Solution:
  - ❌ WRONG - Email-based lookup:
  - In main():
  - ✅ CORRECT - ID-based lookup:
  - In main():
  -       Why:
  -       Prevention:
  -   🔴 **USER ID MISMATCH BETWEEN DB AND JSON**
  -     Issue #23: Migration script skips existing users without preserving ID mapping
  -       Problem:
  -       Error Chain:
  -       Root Cause:
  -       Code Location:
  - Check if already exists
  -       Symptoms:
  -       Solution:
  - ✅ CORRECT - Email-based lookup:
  - In main():
  - ✅ BETTER - Store ID mapping for existing users:
  -       Why:
  -       Prevention:
  -   🔴 **GENERATING NEW IDS INSTEAD OF PRESERVING ORIGINALS**
  -     Issue #24: Migration script generates new UUIDs instead of using JSON IDs (ROOT CAUSE of #22 & #23)
  -       Problem:
  - ❌ WRONG - Generates new UUIDs:
  -       The Cascade of Issues This Caused:
  -       Root Cause:
  -       Code Location:
  - ❌ WRONG:
  -       Solution:
  - ✅ CORRECT:
  - ❌ WRONG - Check by email:
  - ✅ CORRECT - Check by ID:
  -       Why:
  -       Impact:
  -       Prevention:
  -   🔄 **UPDATE LOG**
  -   🛡️ **AUTOMATED PREVENTION SYSTEM (NEW!)**
  -     System Overview:
  -     Usage:
  - ✅ Pre-commit hook runs automatically
  - ❌ Commit blocked if issues found
  -     What It Checks:
  -   🔴 **CRYPTOGRAPHY LIBRARY API CHANGES**
  -     Issue #11: `PBKDF2` Import Deprecated
  -       Problem:
  - ❌ WRONG - Deprecated in cryptography v43+
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Use PBKDF2HMAC
  -       Why:
  -       Prevention:
  -   🔴 **SCHEMA MISMATCH - DATABASE VS CORE MODELS**
  -     Issue #12: MFA Field Name Mismatch
  -       Problem:
  - ❌ WRONG - Field doesn't exist in UserMFA
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - Match Core model schema
  - Build methods list
  -       Why:
  -       Prevention:
  - Best Practice: Type hints help catch errors
  - Implementation with proper field mapping
  -   🟡 **SYNTAX ERRORS - COPY/PASTE MISTAKES**
  -     Issue #13: Extra Closing Parentheses
  -       Problem:
  - ❌ WRONG - Extra closing parentheses
  -       Error:
  -       Root Cause:
  -       Solution:
  - ✅ CORRECT - One closing paren
  -       Why:
  -       Prevention:
  - In .git/hooks/pre-commit
  -   🔴 **DOUBLE JSON ENCODING - DATABASE SERIALIZATION ISSUE**
  -     Issue #26: Pydantic validation error - `role_ids` is string after parsing (double-encoded)
  -       Problem:
  -       Root Cause:
  -       Error Logs (Debug Output):
  -       Solution:
  - ✅ CORRECT - Handle double JSON encoding
  - 🔥 CRITICAL: If result is STILL a string, parse AGAIN!
  - Final sanity check
  -       Why Double Encoding Happens:
  -       Impact:
  -       Prevention:
  - After running fix script
  - Handle double encoding!
  - In models:
  - In scripts:
  - Test that parsing returns expected types
  -       Related Issues:
  -   🔴 **EMPTY PERMISSIONS - ROLE DATA NOT FULLY MIGRATED**
  -     Issue #27: Super Admin role has empty permissions array
  -       Problem:
  -       Root Cause:
  -       Impact:
  -       Why This Happened:
  -       Error Symptoms:
  -       Solution:
  - ... 40+ permissions total
  - Update Super Admin role in database
  -       Verification:
  - After fix, check permissions in database:
  - Output:
  - Permissions: 40 total
  - ['agents.view', 'agents.create', 'agents.edit', 'agents.delete', 'agents.publish']
  -       Prevention:
  - Add to migration script:
  - In database/init_db.py or migration script:
  - In scripts/comprehensive_db_check.sh:
  -       Related Issues:
  -       Key Takeaway:
  -     Issue #28: Multiple Duplicate Super Admin Roles (Only First One Updated)
  -       Problem:
  -       Root Cause:
  -       Error Pattern:
  - From Railway logs:
  - But user had a DIFFERENT Super Admin role:
  -       Solution:
  - OLD (WRONG):
  - NEW (CORRECT):
  -       Why It Happened:
  -       Prevention:
  - When updating system roles that might have duplicates:
  - Update ALL instances
  - scripts/detect_duplicate_roles.py
  - In database/models/role.py:
  - After migration, consolidate duplicates:
  - Update users to use primary role
  -       Related Issues:
  -       Key Takeaway:
  -     Issue #29: Migration Script Running Multiple Times (132 Duplicate Roles + Wrong Permissions Count)
  -       Problem:
  -       Root Cause:
  -       Solution:
  - Find duplicates
  - Get all instances, ordered by created_at (oldest first)
  - Keep the first one
  - Delete the rest, but first update users
  - Update users who have this duplicate role
  - Delete the duplicate
  - BEFORE (WRONG - 50+ permissions):
  - ... (many more wrong permissions)
  - AFTER (CORRECT - 32 permissions):
  - Agent Management (5)
  - Tool Management (5)
  - Knowledge Base (4)
  - User Management (4)
  - Role Management (4)
  - Organization Management (2)
  - Security & Audit (2)
  - Settings (2)
  - Integration Management (2)
  - Workflow Management (2)
  - TOTAL: 32 permissions (verified!)
  -       Why It Happened:
  -       Prevention:
  - In database/init_db.py or migration script:
  - Check for a marker table or setting
  - In migration script:
  - In Dockerfile or deployment script:
  - Create a central permissions registry
  - In core/security/permissions.py:
  - ... (all valid permissions)
  - In fix_super_admin_permissions.py:
  - In database/models/role.py:
  - Check for duplicate role names
  - Check expected role count
  - In scripts/comprehensive_db_check.sh:
  -       Related Issues:
  -       Key Takeaway:
  -   Issue #30: **Empty Permissions in User API Response (JSON Parsing Bug)**
  -     Problem:
  -     Investigation Path:
  -     Root Cause:
  - ❌ WRONG (Lines 226-235):
  - ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  - BUG: db_role.permissions is a JSON STRING (TEXT column in DB)!
  - isinstance('["users:view", ...]', list) = False
  - Result: permissions = []  ❌
  -     Error (None - Silent Bug!):
  -     Solution:
  - ✅ CORRECT (New implementation):
  -     Why This Happened:
  -     Files Changed:
  -     Prevention Checklist:
  -     Testing Verification:
  - {"permissions": []}  ❌
  - {"permissions": ["users:view", "users:edit", ...]}  ✅ (32 items)
  -     Related Issues:
  -     Key Takeaways:
  -     Architecture Lesson:
  -   Issue #31: **Duplicate Roles in Database (Wrong Cleanup Logic)**
  -     Problem:
  -     Root Cause:
  -     The Flawed Logic:
  - ❌ OLD (WRONG) - Just keeps oldest
  -     The Fix:
  - ✅ NEW (CORRECT) - Keeps BEST role
  - Score = (permissions × 1000) + (users × 10)
  -     Implementation:
  -     Prevention:
  - Priority ranking for choosing "best" record
  -     Files Changed:
  -     Testing:
  - Before fix:
  - SELECT COUNT(*), name FROM roles GROUP BY name;
  - Super Admin: 2
  - Admin: 2
  - Presales: 1
  - After fix:
  - Super Admin: 1 (kept the one with 32 perms, 2 users)
  - Admin: 1 (kept the one with 31 perms)
  - Presales: 1 (only one exists)
  -     Verification:
  -   Issue #32: **MFA Modal Not Showing After OAuth Redirect**
  -     Problem:
  -     Root Cause:
  -     Error Symptoms:
  -     Solution:
  -       1. **Frontend - Add Hash Check in DOMContentLoaded** (`ui/index.html`):
  -       2. **Backend - Add OAuth MFA Verification Endpoint** (`api/security.py`):
  - Get temporary session
  - Get user and verify MFA code
  - Create active session and return access token
  -       3. **Backend - Add OAuth MFA Resend Endpoint** (`api/security.py`):
  - Get session and user
  - Generate and send new code
  - ... save to database and send email
  -       4. **Frontend - Update `verifyLoginMfa()` to Handle Both Types** (`ui/index.html`):
  -       5. **Frontend - Update `resendLoginMfaCode()` to Handle Both Types** (`ui/index.html`):
  -     Files Changed:
  -     Testing:
  -     Prevention:
  -     Related Issues:
- `database/README.md`
  - 🗄️ AgentForge Database Migration Guide
  -   📋 Overview
  -   🎯 Benefits
  -   🚀 Quick Start
  -     1. Choose Your Database
  - SQLite (no setup required)
  - PostgreSQL
  -     2. Start Database (Docker)
  - Start PostgreSQL
  - Verify it's running
  -     3. Generate Encryption Key
  - Generate encryption key for sensitive data
  - Add to .env
  -     4. Install Dependencies
  -     5. Initialize Database
  - Create tables
  - Verify
  -     6. Migrate Data (Optional)
  - Migrate existing JSON data to database
  - Options:
  - --dry-run: Preview without changing anything
  - --backup: Create backup before migration
  - --skip-existing: Skip records that already exist
  -   🔧 Configuration
  -     Supported Databases
  -       PostgreSQL (Recommended)
  -       MySQL
  -       SQLite (Development)
  -       SQL Server
  -       Oracle
  -     Connection Pooling
  -   🔄 Migration Strategy (Parallel Run)
  -     Phase 1: Dual Write (2 weeks)
  -     Phase 2: Database Primary (1 week)
  -     Phase 3: Complete Migration (1 week)
  -   🗃️ Database Schema
  -     Core Tables
  -   🔒 Security Features
  -     Encryption at Rest
  -     Row-Level Security
  -     Audit Logging
  -   📊 Performance
  -     Indexing Strategy
  -     Query Optimization
  -   🛠️ Management Tools
  -     Database CLI
  - Check connection
  - Create tables
  - Run migrations
  - Create migration
  - Rollback
  -     Backup & Restore
  - PostgreSQL
  - MySQL
  - SQLite
  -   🚨 Troubleshooting
  -     Connection Issues
  - Test connection
  - Check logs
  - Verify credentials
  -     Migration Issues
  - Dry run first
  - Create backup
  - Check for conflicts
  -   📈 Monitoring
  -     Health Checks
  -     Alerts
  -   🔄 Rollback Plan
  -   📞 Support
- `docs/MASTER_DOCUMENTATION_UPDATED.md`
  - 🔥 AgentForge Master Documentation
  -   Enterprise AI Agent Builder Platform
  - 📑 Table of Contents
  -   Part 1: Platform Overview
  -   Part 2: Features & Components
  -   Part 3: Technical Assessment
  -   Part 4: Modernization & Best Practices
  -   Part 5: Deployment & Operations
  -   Part 6: Maintenance
  - 📊 Executive Summary
  -   Platform Overview
  -   Assessment Scores
  -   Key Strengths
  -   Critical Issues Requiring Immediate Attention
  - 🆕 Recent Changes (January 2026)
  -   Tools UX Overhaul
  -   Security Cleanup
  -   UI/UX Improvements
  -   Database Migration (Phase 3 Complete ✅ - Database-First Architecture)
  -     ✅ **COMPLETED: Full Database Migration (January 2026)**
  -       Phase 1 & 2: Setup & Data Migration ✅
  -       Phase 3: Database-First Architecture ✅ **COMPLETED**
  -       Migration Statistics:
  -       Database Configuration:
  -   Backend Improvements
  -   Deployment
  - 🏗️ System Architecture
  -   Current Architecture (Database-First Monolithic)
  -   Target Architecture (Microservices-Ready Modular)
  -   Tech Stack Comparison
  - 📁 Folder Structure
  -   Current Structure
  -   Target Structure
  - ✨ Features - Complete List
  -   Feature Status Legend
  -   Features Matrix
  -     Agent System
  -     LLM Providers
  -     Tools
  -     Process Agents / Workflow Builder
  -     Security
  -     Infrastructure
  - 🔌 LLM Providers
  -   Provider Configuration
  - api/main.py (simplified)
  -   Adding New Provider
  -     A) Add provider to the monolith runtime (current path)
  -     B) Add provider to the core LLM layer (for engines/modules)
  - 🛠️ Tools System
  -   Two Tool Runtimes (Important)
  -   Tool Interface
  -   Tool Types (Implementation Status)
  -   Coming Soon Tools (12 Types - UI Only)
  -   Auto Re-processing on Config Change
  - 📚 Knowledge Base / RAG
  -   RAG Pipeline
  -   Current Implementation (What is Real)
  -     Chat RAG (Monolith Path)
  -     Database Models (Schema Exists)
  -     Core RAG Tool (Process/Engine Path)
  - 🔒 Security Module
  -   Overview
  -   Architecture
  -   Database Integration
  - In SecurityState.load_from_disk()
  - Fallback to JSON files
  - ... load from users.json
  - In SecurityState.save_to_disk()
  - Still save to JSON as backup
  - ... save to users.json
  -   Authentication Flow
  -   Authorization (RBAC)
  -   User Management
  -   MFA (Multi-Factor Authentication)
  -   OAuth Integration
  -   Audit Logging
  -   Security Architecture
  -   Permissions System (32 Total)
  - Location: core/security/permissions.py
  - Agent Management (4)
  - Tool Management (4)
  - User Management (3)
  - Role Management (3)
  - Security Management (5)
  - Knowledge Base (3)
  - Settings (2)
  - Integrations (3)
  - Demo (2)
  - Invitations (2)
  - Analytics (1)
  -   Default Roles
  -   MFA Implementation
  -   Security Endpoints
  -   Known Security Gaps (Must Be Addressed)
  -   User Profile Page (UI)
  -     Access
  -     Features
  -     UI Components
  - 🧪 Demo Lab
  -   What is implemented (verified in code)
  -   Operational notes
  - 🔄 Process Builder & Workflow Engine
  -   UX Flow (Prompt → Cinematic Build → Edit)
  -   Business-friendly inputs (Label ↔ Key mapping)
  -   Derived fields (auto-calculation)
  -   Profile context / prefill (logged-in user)
  -   Documents (Upload + Generate)
  -     Upload (input)
  -     Generate (output)
  -   Layout & routing rules
  -     Goals (business readability)
  -     Implementation
  -   Testing (business-friendly)
  -     Testing modes (Simulation vs Real Engine)
  -     Notification templates (what variables resolve)
  -     Troubleshooting: “Notification doesn’t send during Test”
  -   Generation grounding (anti-hallucination)
  -   What is NOT fully implemented yet (must be explicit)
  - 📊 Platform Assessment
  -   Current State Analysis
  - 📋 Gap Analysis
  -   Implementation Status Summary
  - 💻 Code Quality
  -   Current Issues
  - 🔄 Code Modernization Strategy
  -   Overview
  -   Migration Principles
  -   Phase 1: Foundation (Weeks 1-2)
  -     1.1 Setup Project Structure
  - Create new directory structure alongside existing code
  -     1.2 Add Development Tools
  - Add linting and formatting
  - pyproject.toml
  - Add pre-commit hooks
  - .pre-commit-config.yaml
  -     1.3 Add CI/CD Pipeline
  - .github/workflows/ci.yml
  -   Phase 2: Backend Modularization (Weeks 3-6)
  -     2.1 Extract Shared Models
  - packages/shared/models/agent.py
  -     2.2 Create Service Interfaces
  - packages/shared/interfaces/agent_service.py
  -     2.3 Extract Services from main.py (Step by Step)
  - packages/agent-service/src/services/agent_service.py
  - Validation
  - Generate ID if not provided
  - Save
  - ... other methods
  - packages/agent-service/src/api/agents.py
  - packages/shared/config/feature_flags.py
  - In main.py (existing)
  - Use existing inline code
  - ... existing code
  -     2.4 Migration Order
  -   Phase 3: Frontend Modernization (Weeks 7-12)
  -     3.1 Setup React Project
  - Create React app with Vite
  - Install dependencies
  -     3.2 Project Structure
  -     3.3 Component Migration Strategy
  -     3.4 Migration Timeline
  - 🗄️ Database Migration Plan
  -   Overview
  -   Migration Strategy
  -   Phase 1: Database Setup
  -     1.1 Docker Compose Update
  - infrastructure/docker/docker-compose.yml
  -     1.2 Database Schema
  - packages/shared/db/models.py
  - Relationships
  - Relationships
  - Relationships
  -     1.3 Alembic Migrations
  - packages/shared/db/migrations/versions/001_initial.py
  - Tenants table
  - Users table
  - Agents table
  - ... other tables
  -     1.4 Repository Pattern with Dual Storage
  - packages/shared/db/repository.py
  - Always write to both
  - Usage in service
  - Phase 3: Read from DB, write to both
  - Phase 2: Read from JSON, write to both
  - Phase 1: JSON only
  -     1.5 Data Migration Script
  - scripts/migrate_data.py
  - Configuration
  - Create engine and session
  - Create tables
  - Create default tenant
  - Migrate data
  - ... migrate other entities
  -   Migration Checklist
  -   Database Migration Checklist
  -     Pre-Migration
  -     Phase 1: Setup ✅ COMPLETED
  -     Phase 2: Data Migration ✅ COMPLETED
  -     Phase 3: Database-First Architecture ✅ **COMPLETED (January 2026)**
  -     Phase 4: Cutover (Optional)
  -     Post-Migration
  -   Implementation Details
  -     Completed Components
  -       1. Database Schema (`database/models/`)
  -         Security & Access Control Models
  - Primary Key
  - Purpose: Unique identifier for organization/tenant
  - Populated: Auto-generated UUID on creation
  - Basic Info
  - Purpose: Organization display name
  - Populated: From JSON migration or user input
  - Purpose: URL-friendly identifier (e.g., "acme-corp")
  - Populated: Generated from name or user input
  - Plan & Settings
  - Purpose: Subscription plan tier
  - Populated: From JSON migration or admin configuration
  - Purpose: Organization-specific settings (JSON object)
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as dict in OrganizationService
  - Auth Settings
  - Purpose: List of allowed authentication providers (e.g., ["local", "google", "microsoft"])
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as list in OrganizationService
  - Purpose: Whether MFA is required for all users
  - Populated: From JSON migration or admin configuration
  - Code Usage: Converted to boolean in OrganizationService
  - Purpose: List of allowed email domains for registration (e.g., ["@company.com"])
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as list in OrganizationService
  - OAuth Credentials (should be encrypted in production)
  - Purpose: Google OAuth Client ID
  - Populated: From environment variables or admin configuration
  - Code Usage: Used in OAuthService.get_authorization_url()
  - Purpose: Google OAuth Client Secret
  - Populated: From environment variables or admin configuration
  - Code Usage: Used in OAuthService.exchange_code()
  - Purpose: Microsoft OAuth credentials
  - Populated: From environment variables or admin configuration
  - LDAP/AD Settings
  - Purpose: Reference to LDAP configuration
  - Populated: From admin configuration
  - Limits
  - Purpose: Resource limits for organization
  - Populated: From JSON migration or admin configuration
  - Code Usage: Converted to int in OrganizationService
  - Status
  - Purpose: Organization status
  - Populated: From JSON migration or admin configuration
  - Domain & Branding
  - Purpose: Custom domain for organization
  - Populated: From admin configuration
  - Purpose: Organization logo URL
  - Populated: From admin configuration
  - Metadata
  - Purpose: Timestamps for audit and tracking
  - Populated: Auto-set by SQLAlchemy
  - Primary Key
  - Purpose: Unique identifier for user
  - Populated: Auto-generated UUID on creation (or from JSON migration)
  - Authentication
  - Purpose: User email (unique, indexed for fast lookups)
  - Populated: From JSON migration or user registration
  - Code Usage: Used in UserService.get_user_by_email()
  - Purpose: Hashed password (nullable for OAuth users)
  - Populated: From PasswordService.hash_password() or None for OAuth
  - Code Usage: Verified in PasswordService.verify_password()
  - Profile
  - Purpose: User profile information
  - Populated: From JSON migration (profile object) or user input
  - Code Usage: Mapped to UserProfile Pydantic model in UserService
  - Status
  - Purpose: User account status (active, inactive, pending, suspended)
  - Populated: From JSON migration or admin action
  - Code Usage: Enum converted in UserService
  - Purpose: Whether email is verified
  - Populated: From JSON migration or email verification flow
  - MFA
  - Purpose: Whether MFA is enabled for user
  - Populated: From JSON migration or user action
  - Code Usage: Checked in login flow and MFA verification
  - Purpose: Primary MFA method (totp, email, none)
  - Populated: From JSON migration or user configuration
  - Code Usage: Used in MFA verification flow
  - Purpose: Encrypted TOTP secret (if TOTP enabled)
  - Populated: From MFAService.generate_totp_secret()
  - Code Usage: Used in TOTP verification
  - Organization (Multi-tenancy)
  - Purpose: Organization/tenant identifier
  - Populated: From JSON migration or user assignment
  - Code Usage: Used for multi-tenant data isolation
  - RBAC - Roles & Permissions
  - Purpose: List of role UUIDs assigned to user (stored as JSON array)
  - Populated: From JSON migration or admin assignment
  - Code Usage: Parsed as list in UserService, used in permission checks
  - Purpose: Department identifier
  - Populated: From JSON migration or admin assignment
  - Purpose: List of user group UUIDs (stored as JSON array)
  - Populated: From JSON migration or admin assignment
  - Code Usage: Parsed as list in UserService
  - External Auth
  - Purpose: Authentication provider (local, google, microsoft, ldap, saml)
  - Populated: From JSON migration or OAuth registration
  - Code Usage: Used in authentication flow
  - Purpose: External system user ID (e.g., Google user ID)
  - Populated: From OAuth registration
  - Code Usage: Used for OAuth user lookup
  - Security
  - Purpose: Security tracking fields
  - Populated: From security policies or admin action
  - Activity Tracking
  - Purpose: Track user activity
  - Populated: Updated on login and activity
  - Code Usage: Updated in get_current_user() endpoint
  - Metadata
  - Purpose: Timestamps for audit and tracking
  - Populated: Auto-set by SQLAlchemy
  - Additional data
  - Purpose: Flexible JSON field for additional user data
  - Populated: From JSON migration or custom fields
  - Code Usage: Parsed as dict in UserService
  - Primary Key
  - Purpose: Unique identifier for role
  - Populated: Auto-generated UUID on creation (or from JSON migration)
  - Role Info
  - Purpose: Role display name (e.g., "Super Admin", "Admin", "User")
  - Populated: From JSON migration or admin creation
  - Purpose: Role description
  - Populated: From JSON migration or admin input
  - Permissions
  - Purpose: List of permission strings (e.g., ["users:view", "users:edit", "agents:create"])
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as list in RoleService, used in permission checks
  - Important: Stored as JSON array, may be double-encoded (handled in RoleService)
  - Hierarchy
  - Purpose: Parent role for inheritance (not currently used)
  - Populated: From JSON migration or admin configuration
  - Purpose: Role hierarchy level (lower = more privileged, 0 = super admin)
  - Populated: From JSON migration or admin configuration
  - Code Usage: Converted to int in role hierarchy checks
  - Important: Stored as string for database-agnostic design
  - System vs Custom
  - Purpose: Whether role is system role (cannot be deleted)
  - Populated: From JSON migration or admin creation
  - Code Usage: Used in role deletion checks
  - Organization (Multi-tenancy)
  - Purpose: Organization/tenant identifier
  - Populated: From JSON migration or admin creation
  - Code Usage: Used for multi-tenant data isolation
  - Metadata
  - Purpose: Timestamps and creator tracking
  - Populated: Auto-set by SQLAlchemy or admin action
  - Primary Key
  - Purpose: Unique identifier for session
  - Populated: Auto-generated UUID on login
  - User Reference
  - Purpose: User identifier (no FK for simplicity)
  - Populated: From logged-in user
  - Code Usage: Used for session lookup and cleanup
  - Session Data
  - Purpose: Hashed access token (unique, indexed)
  - Populated: From TokenService.create_access_token()
  - Code Usage: Used for session validation
  - Purpose: Client IP address
  - Populated: From request.client.host
  - Purpose: Client user agent string
  - Populated: From request.headers.get("user-agent")
  - Expiry
  - Purpose: Session expiration time
  - Populated: Calculated from current time + token lifetime
  - Purpose: Session revocation tracking
  - Populated: From logout or admin action
  - Timestamps
  - Purpose: Session tracking
  - Populated: Auto-set by SQLAlchemy, updated on activity
  - Primary Key
  - Purpose: Unique identifier for invitation
  - Populated: Auto-generated UUID on creation
  - Invitation Details
  - Purpose: Invited user email
  - Populated: From admin invitation
  - Purpose: Organization identifier
  - Populated: From admin invitation
  - Purpose: List of role UUIDs for invited user
  - Populated: From admin invitation
  - Code Usage: Parsed as list in InvitationService
  - Status
  - Purpose: Invitation status
  - Populated: Updated on acceptance or expiration
  - Metadata
  - Purpose: User who sent invitation
  - Populated: From admin user
  - Purpose: Invitation expiration time
  - Populated: Calculated from creation time
  - Purpose: Timestamps
  - Populated: Auto-set by SQLAlchemy
  - Primary Key
  - Purpose: Unique identifier for settings
  - Populated: Auto-generated UUID on creation
  - Organization Reference
  - Purpose: Organization identifier (one settings per org)
  - Populated: From organization creation
  - Settings (stored as JSON)
  - Purpose: All security settings as JSON object
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as SecuritySettings Pydantic model in SecuritySettingsService
  - Contains: mfa_enforcement, password_policy, session_timeout, etc.
  - Metadata
  - Purpose: Timestamps
  - Populated: Auto-set by SQLAlchemy
  - Primary Key
  - Purpose: Unique identifier for audit log entry
  - Populated: Auto-generated UUID on creation
  - Organization & User
  - Purpose: Organization and user identifiers
  - Populated: From request context
  - Action Details
  - Purpose: Action type (e.g., "LOGIN", "USER_CREATE", "ROLE_UPDATE")
  - Populated: From ActionType enum
  - Purpose: Resource information
  - Populated: From action context
  - Details
  - Purpose: Additional action details (JSON object)
  - Populated: From action context
  - Code Usage: Parsed as dict in AuditService
  - Request Info
  - Purpose: Request tracking
  - Populated: From request headers
  - Timestamps
  - Purpose: Action timestamp (indexed for fast queries)
  - Populated: Auto-set by SQLAlchemy
  -         Platform Models
  - Primary Key
  - Setting Key
  - Purpose: Setting key (e.g., "system_settings", "llm_providers")
  - Populated: From JSON migration or system initialization
  - Setting Value
  - Purpose: Setting value as JSON object
  - Populated: From JSON migration or admin configuration
  - Code Usage: Parsed as SystemSettings Pydantic model in SystemSettingsService
  - Contains: LLM config, vector DB config, theme, etc.
  - Metadata
  - Purpose: Timestamps
  - Populated: Auto-set by SQLAlchemy
  - Primary Key
  - Purpose: Unique identifier for tool
  - Populated: Auto-generated UUID on creation
  - Tool Info
  - Purpose: Tool type (e.g., "website", "api", "database")
  - Populated: From JSON migration or user creation
  - Code Usage: Used in ToolType.from_legacy() for normalization
  - Configuration
  - Purpose: Tool-specific configuration (JSON object)
  - Populated: From JSON migration or user configuration
  - Code Usage: Parsed as dict, validated per tool type
  - Status
  - Purpose: Whether tool is active
  - Populated: From JSON migration or user action
  - Organization
  - Purpose: Organization identifier
  - Populated: From JSON migration or user creation
  - Metadata
  - Purpose: Timestamps
  - Populated: Auto-set by SQLAlchemy
  -       2. Database Configuration (`database/config.py`)
  - Database type (default: PostgreSQL)
  - Supported: postgresql, mysql, sqlite, sqlserver, oracle
  - Connection parameters
  - Railway automatic DATABASE_URL (highest priority)
  - If DATABASE_URL is set, it overrides all other settings
  - Railway uses postgres:// but SQLAlchemy 2.0 needs postgresql://
  - Automatically converted in get_database_url()
  - Connection pooling
  - SSL/TLS settings
  -       3. Database Services (`database/services/`)
  - In UserService.save_user()
  - Check if user exists by ID
  - If not found by ID, try finding by email (for OAuth users)
  - Update user ID to match database
  - Update existing
  - Create new
  -       4. Database Initialization (`database/init_db.py`)
  -       2. Migration Script (`scripts/migrate_to_db.py`)
  -       3. Deployment Integration (`Dockerfile`)
  - Automatic on startup:
  -       4. Database Configuration (`database/config.py`)
  -       5. Health Monitoring (`api/health.py`)
  -     Known Limitations (Temporary)
  - 🎨 UI/UX Modernization
  -   Current Issues
  -     1. Monolithic Architecture
  -     2. No State Management
  -     3. Poor Code Organization
  -     4. No Type Safety
  -     5. Accessibility Issues
  -     6. Mobile Experience
  -   Design System
  -     Color Palette
  -     Typography
  -     Spacing
  -     Component Library
  -     Accessibility Requirements
  -     Responsive Breakpoints
  -     UI/UX Checklist
  -   UI/UX Quality Checklist
  -     Visual Design
  -     Accessibility
  -     Responsiveness
  -     Performance
  - 🚀 Deployment Architecture
  -   Deployment Models
  -     1. Single-Tenant Dedicated
  -     2. Multi-Tenant SaaS
  -     3. Hybrid (Multi-Tenant with Dedicated Options)
  - ☁️ Multi-Cloud Deployment Guide
  -   Supported Platforms
  -   Infrastructure as Code
  -     AWS Deployment (Terraform)
  - infrastructure/terraform/aws/main.tf
  - Variables
  - VPC
  - EKS Cluster
  - RDS PostgreSQL
  - ElastiCache Redis
  - S3 for file storage
  - Outputs
  -     Azure Deployment (Terraform)
  - infrastructure/terraform/azure/main.tf
  - Resource Group
  - AKS Cluster
  - PostgreSQL Flexible Server
  - Redis Cache
  - Storage Account
  -     Google Cloud Deployment (Terraform)
  - infrastructure/terraform/gcp/main.tf
  - GKE Cluster
  - Cloud SQL PostgreSQL
  - Memorystore Redis
  - Cloud Storage
  -     On-Premise / Docker Compose (Production)
  - infrastructure/docker/docker-compose.prod.yml
  - Nginx Load Balancer
  - Frontend
  - API Gateway
  - Auth Service
  - Agent Service
  - LLM Service
  - RAG Service
  - PostgreSQL
  - Redis
  - ChromaDB
  -     Kubernetes Deployment (Helm)
  - infrastructure/kubernetes/helm/agentforge/values.yaml
  - Global settings
  - Frontend
  - API Gateway
  - Auth Service
  - Agent Service
  - LLM Service
  - RAG Service
  - PostgreSQL (use external in production)
  - Redis (use external in production)
  - Ingress
  - Autoscaling
  - 🧙 Installation Wizard & CLI
  -   AgentForge CLI
  -     Installation
  - Install via pip
  - Or install from source
  -     CLI Commands
  - Initialize new AgentForge installation
  - Configure existing installation
  - Deploy to various targets
  - Database operations
  - Health checks
  - View logs
  - Scale services
  -     Interactive Setup Wizard
  - tools/cli/agentforge/commands/init.py
  - Use defaults
  - Generate configuration files
  - Step 1: Deployment Type
  - Step 2: Multi-tenancy
  - Step 3: Database
  - Step 4: LLM Providers
  - Get API keys for selected providers
  - Step 5: Authentication
  - Step 6: Domain & SSL
  - Step 7: Monitoring
  - Generate .env file
  - Generate docker-compose.yml
  - Generate Kubernetes manifests
  - Generate Terraform files
  - Generate values.yaml for Helm
  -     Deploy Command
  - tools/cli/agentforge/commands/deploy.py
  - Similar progress tracking...
  - 🏢 Multi-Tenancy Architecture
  -   Overview
  -   Tenant Isolation Strategies
  -     1. Database-Level Isolation (Recommended for SaaS)
  -     2. Schema-Level Isolation
  -     3. Database-Level Isolation (Enterprise)
  -   Implementation
  -     Tenant Middleware
  - packages/shared/middleware/tenant.py
  - Get tenant from various sources
  - Verify tenant exists and is active
  - Set tenant in request state
  - Method 1: From subdomain (tenant.agentforge.com)
  - Method 2: From header (X-Tenant-ID)
  - Method 3: From JWT token (tenant_id claim)
  - Method 4: From query parameter (for API calls)
  -     Tenant-Scoped Queries
  - packages/shared/db/tenant_scope.py
  - Context variable to hold current tenant
  - Check if model has tenant_id column
  - Usage in repository
  - Automatically filtered by tenant
  - Automatically set tenant_id
  -     Tenant Configuration
  - packages/shared/config/tenant_config.py
  - Customization
  - Features
  - Limits (override plan defaults)
  - Settings
  -     Tenant Provisioning
  - packages/auth-service/src/services/tenant_service.py
  - 1. Create tenant record
  - 2. Create default roles
  - 3. Create admin user
  - 4. Initialize default settings
  - 5. Send welcome email
  -   Configuration Options
  - config/multi-tenant.yaml
  - Tenant identification method
  - Isolation level
  - Default tenant (for single-tenant mode)
  - Tenant limits
  - Provisioning
  - Cleanup
  - 📡 API Reference
  -   Main Endpoints
  -     Agents (Chat Agents)
  -     Tools
  -     Settings
  -     Security (Auth/MFA/OAuth/RBAC)
  -     Access Control (Delegated Admin)
  -     Demo Lab
  -     Process Execution (Workflows)
  - 📚 Repository File Reference
  -   Root (project-level files)
  -   `alembic/` (database migrations)
  -   `api/` (FastAPI application)
  -     `api/modules/access_control/`
  -     `api/modules/conversations/`
  -     `api/modules/lab/`
  -     `api/modules/process/`
  -   `core/` (engines and reusable libraries)
  -     `core/agent/`
  -     `core/llm/`
  -     `core/security/`
  -     `core/tools/`
  -     `core/process/` (workflow engine + wizard)
  -   `database/` (DB layer)
  -     `database/models/` (SQLAlchemy models)
  -     `database/services/` (service layer)
  -   `ui/` (frontend)
  -   `scripts/` (maintenance)
  -   `docs/` (documentation + runtime KB files)
  -   `examples/` (example assets)
  -   `data/` and `uploads/` (local storage)
  - 🗺️ Recommendations & Roadmap
  -   Implementation Priority
  -     ✅ Phase 1: Foundation - **COMPLETED (January 2026)**
  -     Phase 2: Backend Modularization (Weeks 5-10)
  -     Phase 3: Frontend Modernization (Weeks 11-16)
  -     Phase 4: Enterprise Features (Weeks 17-24)
  -   Estimated Timeline
  - 📝 Documentation Maintenance
  -   Update Triggers
  -   Version History
  -   Optional: GitHub CLI Setup (for automated push workflows)
  - Install (macOS)
  - Login
  - Verify
  -   AI Auto Push Policy (Project Preference)
  - 👥 Support
  - 🚀 Next Steps & Future Development
  -   Immediate Next Steps (Priority Order)
  -     1. **Security Hardening (Authorization Gaps + Rate Limiting)** (Critical)
  -     2. **Process Builder End-to-End Triggers + Files** (High)
  -     3. **Unify Tool Runtimes (Chat vs Process)** (High)
  -     4. **Knowledge Base DB-Backed Pipeline** (Medium)
  -     5. **Testing + CI** (Medium)
  -     6. **Observability & Reliability** (Medium)
  -     7. **Frontend Modernization (Long-term)** (High effort)
  -     8. **Backend Modularization (Long-term)** (High effort)
  -   Code Agent Guidelines
- `docs/PROCESS_APPROVAL_AND_IDENTITY.md`
  - Process Approval & Identity: How the Business Uses It
  -   Who is "the user" when a process runs?
  -   How does the process "know" who the manager is?
  -     1. Pass manager in when starting the process (recommended for HR/portal)
  -     2. Look up manager inside the process (first step calls HR)
  -   Exposing the process through a portal
  -   Summary
- `docs/PROCESS_BUILDER_KB_DOCUMENTS.md`
  - Process Builder Knowledge Base — Documents (Upload & Generate) (v1)
  -   Uploading documents (input)
  -   Generating documents (output)
- `docs/PROCESS_BUILDER_KB_IDENTITY.md`
  - Process Builder Knowledge Base — Identity & User Directory (v1)
  -   Overview
  -   Identity Sources (configured per organization)
  -   Extended User Context (available at runtime)
  -   How to Use in Workflows
  -     1) Auto-fill user fields with prefill (recommended)
  -     2) Dynamic manager approval (recommended for HR workflows)
  -     3) Department manager approval
  -     4) Management chain approval
  -     5) Available directory_assignee_type options
  -     6) Expression-based dynamic routing
  -     7) Sequential multi-level approvals
  -     8) Prefill keys — FULLY DYNAMIC
  -     9) Smart notification recipients
  -   Best Practices for Identity-Aware Workflows
  -   Anti-hallucination note
- `docs/PROCESS_BUILDER_KB_PROFILE_CONTEXT.md`
  - Process Builder Knowledge Base — User/Profile Context (v1)
  -   Available runtime context (engine)
  -     Basic profile (always available)
  -     Extended profile (from Identity Directory — available when org has identity configured)
  -   How to use it in a workflow
  -     1) Prefill start form fields (recommended)
  -     2) Avoid asking the user to re-type profile information
  -     3) Identity-aware approval routing
  -   Anti-hallucination note
- `docs/PROCESS_BUILDER_KB_ROUTING.md`
  - Process Builder Knowledge Base — Layout & Routing Rules (v1)
  -   Core layout rules
  -   Connection routing rules (critical)
  -   Platform behavior
  -   Implications for generation
- `docs/PROCESS_BUILDER_KB_SHAPES.md`
  - Process Builder Knowledge Base — Shapes & Capabilities (v1)
  -   Guiding principles (anti-hallucination)
  -   Visual Builder shapes (business-friendly)
  -     1) Start (Trigger/Form) — `trigger`
  -     2) Decision (If/Else) — `condition`
  -     3) AI Step — `ai`
  -     4) Tool Step — `tool`
  -     5) Approval — `approval`
  -     6) Notification — `notification`
  -     7) Wait — `delay`
  -     8) End — `end`
  -     9) Advanced Action (internal) — `action`
  -   Notes on tools and dropdown options
- `docs/PROCESS_BUILDER_KB_TAXONOMIES.md`
  - Process Builder Knowledge Base — Safe Taxonomies (Dropdown Options) (v1)
  -   When to use a dropdown
  -   Common taxonomies
  -     Leave Type
  -     Request Priority
  -     Notification Channel
  -     Approval Outcome (when modeled as user input)
  -   Notes
- `docs/SECURITY_AND_IDENTITY_ARCHITECTURE.md`
  - Security & Identity Architecture
  -   Overview
  -   Security Layers
  -     Layer 1: Platform Access Control (Authentication & Authorization)
  -     Layer 2: Agent Access Control (Who Can Use Which Agent)
  -     Layer 3: Process Execution Security
  -     Layer 4: Identity & User Directory
  -   Identity Integration Scenarios
  -     Scenario 1: Built-in Org Chart (Internal)
  -     Scenario 2: LDAP / Azure AD
  -     Scenario 3: External HR System API
  -     Scenario 4: Hybrid (Internal + External)
  -   Process Approval Flow
  -     How Dynamic Assignees Work
  -     Example: HR Vacation Request Process
  -   API Endpoints
  -     Identity & Org Chart API (`/api/identity/`)
  -   Database Schema Changes
  -     users table additions:
  -     organizations table additions:
  -   Configuration Per Agent
  -     Conversational Agent
  -     Process Agent
  -   Security Best Practices Applied
- `scripts/README.md`
  - 🛡️ Database Validation Scripts
  -   Overview
  -   Scripts
  -     1. `comprehensive_db_check.sh` ⭐ **RECOMMENDED**
  -     2. `migrate_to_db_complete.py`
  -   Pre-Commit Hook
  - Should show: -rwxr-xr-x (executable)
  - Try to commit - should run validation
  - Output:
  - 🔍 Running Pre-Commit Database Validation...
  - ...
  - ✅ Pre-commit validation passed!
  -   Usage Workflow
  -     Before Creating/Modifying Database Models:
  - Pre-commit hook runs automatically ✅
  -   Common Errors & Fixes
  -     Error: PostgreSQL-specific imports found
  - ❌ WRONG:
  - ✅ CORRECT:
  -     Error: Found ARRAY usage
  - ❌ WRONG:
  - ✅ CORRECT:
  -     Error: Found metadata column
  - ❌ WRONG:
  - ✅ CORRECT:
  - OR: user_metadata, custom_data, etc.
  -   References
  -   Troubleshooting
  -     Pre-commit hook not running?
  - Check if installed:
  - Re-install:
  - Test manually:
  -     Validation script fails to run?
  - Make executable:
  - Run with bash:

### API Endpoints Found (Phase 0, decorator-level)

| File | Decorator | Method | Path |
|---|---|---|---|
| `api/health.py` | `router` | GET | `/` |
| `api/health.py` | `router` | GET | `/db` |
| `api/main.py` | `app` | DELETE | `/api/agents/{agent_id}` |
| `api/main.py` | `app` | DELETE | `/api/agents/{agent_id}/memory` |
| `api/main.py` | `app` | DELETE | `/api/conversations/{conversation_id}` |
| `api/main.py` | `app` | DELETE | `/api/demo-kits/{kit_id}` |
| `api/main.py` | `app` | DELETE | `/api/demo/items/clear` |
| `api/main.py` | `app` | DELETE | `/api/demo/items/{item_id}` |
| `api/main.py` | `app` | DELETE | `/api/documents/{doc_id}` |
| `api/main.py` | `app` | DELETE | `/api/scraped-pages/{page_id}` |
| `api/main.py` | `app` | DELETE | `/api/tools/all` |
| `api/main.py` | `app` | DELETE | `/api/tools/{tool_id}` |
| `api/main.py` | `app` | DELETE | `/api/tools/{tool_id}/demo-document/{source}` |
| `api/main.py` | `app` | DELETE | `/demo-api/_cache` |
| `api/main.py` | `app` | GET | `/` |
| `api/main.py` | `app` | GET | `/AgentForge_Logo.png` |
| `api/main.py` | `app` | GET | `/admin` |
| `api/main.py` | `app` | GET | `/admin/` |
| `api/main.py` | `app` | GET | `/agent-hub.png` |
| `api/main.py` | `app` | GET | `/agent-studio.png` |
| `api/main.py` | `app` | GET | `/api/agents` |
| `api/main.py` | `app` | GET | `/api/agents/accessible` |
| `api/main.py` | `app` | GET | `/api/agents/{agent_id}` |
| `api/main.py` | `app` | GET | `/api/agents/{agent_id}/conversations` |
| `api/main.py` | `app` | GET | `/api/agents/{agent_id}/memory` |
| `api/main.py` | `app` | GET | `/api/agents/{agent_id}/my-permissions` |
| `api/main.py` | `app` | GET | `/api/conversations/{conversation_id}` |
| `api/main.py` | `app` | GET | `/api/debug/agents-ownership` |
| `api/main.py` | `app` | GET | `/api/demo-assets/{asset_id}/download` |
| `api/main.py` | `app` | GET | `/api/demo-kits` |
| `api/main.py` | `app` | GET | `/api/demo-kits/tools/all` |
| `api/main.py` | `app` | GET | `/api/demo-kits/{kit_id}` |
| `api/main.py` | `app` | GET | `/api/demo/assets/{filename}` |
| `api/main.py` | `app` | GET | `/api/demo/files/{filename}` |
| `api/main.py` | `app` | GET | `/api/demo/items` |
| `api/main.py` | `app` | GET | `/api/demo/test-document` |
| `api/main.py` | `app` | GET | `/api/documents/{doc_id}/content` |
| `api/main.py` | `app` | GET | `/api/documents/{doc_id}/download` |
| `api/main.py` | `app` | GET | `/api/oauth/google/callback` |
| `api/main.py` | `app` | GET | `/api/oauth/google/email/url` |
| `api/main.py` | `app` | GET | `/api/oauth/microsoft/email/url` |
| `api/main.py` | `app` | GET | `/api/organization/branding` |
| `api/main.py` | `app` | GET | `/api/scraped-pages/{page_id}` |
| `api/main.py` | `app` | GET | `/api/scraped-pages/{page_id}/data` |
| `api/main.py` | `app` | GET | `/api/settings` |
| `api/main.py` | `app` | GET | `/api/settings/integrations` |
| `api/main.py` | `app` | GET | `/api/settings/providers` |
| `api/main.py` | `app` | GET | `/api/tools` |
| `api/main.py` | `app` | GET | `/api/tools/accessible` |
| `api/main.py` | `app` | GET | `/api/tools/{tool_id}` |
| `api/main.py` | `app` | GET | `/api/tools/{tool_id}/data` |
| `api/main.py` | `app` | GET | `/api/tools/{tool_id}/debug-ownership` |
| `api/main.py` | `app` | GET | `/api/tools/{tool_id}/table-entry/{source}` |
| `api/main.py` | `app` | GET | `/chat` |
| `api/main.py` | `app` | GET | `/chat/` |
| `api/main.py` | `app` | GET | `/chat/{path:path}` |
| `api/main.py` | `app` | GET | `/demo` |
| `api/main.py` | `app` | GET | `/demo-api` |
| `api/main.py` | `app` | GET | `/demo-api/_cache` |
| `api/main.py` | `app` | GET | `/frontend` |
| `api/main.py` | `app` | GET | `/frontend/` |
| `api/main.py` | `app` | GET | `/frontend/{path:path}` |
| `api/main.py` | `app` | GET | `/health` |
| `api/main.py` | `app` | GET | `/lab` |
| `api/main.py` | `app` | GET | `/lab/` |
| `api/main.py` | `app` | GET | `/monitor` |
| `api/main.py` | `app` | GET | `/monitor/` |
| `api/main.py` | `app` | GET | `/process/approvals` |
| `api/main.py` | `app` | GET | `/process/executions` |
| `api/main.py` | `app` | GET | `/tools-icon.png` |
| `api/main.py` | `app` | GET | `/ui` |
| `api/main.py` | `app` | GET | `/ui/` |
| `api/main.py` | `app` | GET | `/ui/{path:path}` |
| `api/main.py` | `app` | POST | `/api/agents` |
| `api/main.py` | `app` | POST | `/api/agents/configure-tools` |
| `api/main.py` | `app` | POST | `/api/agents/generate-config` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/chat` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/chat-with-files` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/chat/stream` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/start-chat` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/test-chat` |
| `api/main.py` | `app` | POST | `/api/agents/{agent_id}/test-chat-with-files` |
| `api/main.py` | `app` | POST | `/api/demo-kits/generate` |
| `api/main.py` | `app` | POST | `/api/demo-kits/{kit_id}/api/{api_id}/test` |
| `api/main.py` | `app` | POST | `/api/demo-kits/{kit_id}/assets/{asset_id}/generate` |
| `api/main.py` | `app` | POST | `/api/demo-lab/generate-for-agent` |
| `api/main.py` | `app` | POST | `/api/demo/create-tool` |
| `api/main.py` | `app` | POST | `/api/demo/generate` |
| `api/main.py` | `app` | POST | `/api/demo/refine-unified` |
| `api/main.py` | `app` | POST | `/api/demo/unified-setup` |
| `api/main.py` | `app` | POST | `/api/settings/integrations` |
| `api/main.py` | `app` | POST | `/api/settings/reindex` |
| `api/main.py` | `app` | POST | `/api/settings/test-embedding` |
| `api/main.py` | `app` | POST | `/api/settings/test-llm` |
| `api/main.py` | `app` | POST | `/api/tools` |
| `api/main.py` | `app` | POST | `/api/tools/cleanup-duplicates` |
| `api/main.py` | `app` | POST | `/api/tools/generate-code` |
| `api/main.py` | `app` | POST | `/api/tools/parse-openapi` |
| `api/main.py` | `app` | POST | `/api/tools/test` |
| `api/main.py` | `app` | POST | `/api/tools/test-api` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/analyze-params` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/ask` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/auto-fill-test` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/demo-document` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/documents` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/extract-param` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/generate-param` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/scrape` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/search` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/send-email` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/table-entry` |
| `api/main.py` | `app` | POST | `/api/tools/{tool_id}/test` |
| `api/main.py` | `app` | POST | `/process/execute` |
| `api/main.py` | `app` | PUT | `/api/agents/{agent_id}` |
| `api/main.py` | `app` | PUT | `/api/agents/{agent_id}/memory/toggle` |
| `api/main.py` | `app` | PUT | `/api/demo-kits/{kit_id}/api/{api_id}` |
| `api/main.py` | `app` | PUT | `/api/demo-kits/{kit_id}/asset/{asset_id}` |
| `api/main.py` | `app` | PUT | `/api/demo-kits/{kit_id}/kb/{kb_id}` |
| `api/main.py` | `app` | PUT | `/api/demo/items/{item_id}` |
| `api/main.py` | `app` | PUT | `/api/organization/branding` |
| `api/main.py` | `app` | PUT | `/api/settings` |
| `api/main.py` | `app` | PUT | `/api/tools/{tool_id}` |
| `api/main.py` | `app` | PUT | `/api/tools/{tool_id}/demo-document` |
| `api/main.py` | `app` | PUT | `/api/tools/{tool_id}/table-entry/{source}` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/access` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/admins` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/check-permission` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/full` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/management` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/my-permissions` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/tasks` |
| `api/modules/access_control/router.py` | `router` | GET | `/agents/{agent_id}/tools` |
| `api/modules/access_control/router.py` | `router` | GET | `/check/{agent_id}` |
| `api/modules/access_control/router.py` | `router` | GET | `/preview/{agent_id}` |
| `api/modules/access_control/router.py` | `router` | GET | `/templates` |
| `api/modules/access_control/router.py` | `router` | POST | `/agents/{agent_id}/apply-template` |
| `api/modules/access_control/router.py` | `router` | PUT | `/agents/{agent_id}/access` |
| `api/modules/access_control/router.py` | `router` | PUT | `/agents/{agent_id}/admins` |
| `api/modules/access_control/router.py` | `router` | PUT | `/agents/{agent_id}/management` |
| `api/modules/access_control/router.py` | `router` | PUT | `/agents/{agent_id}/tasks` |
| `api/modules/access_control/router.py` | `router` | PUT | `/agents/{agent_id}/tools` |
| `api/modules/conversations/router.py` | `router` | DELETE | `/agent/{agent_id}/all` |
| `api/modules/conversations/router.py` | `router` | DELETE | `/bulk` |
| `api/modules/conversations/router.py` | `router` | DELETE | `/{conversation_id}` |
| `api/modules/conversations/router.py` | `router` | GET | `/agent/{agent_id}` |
| `api/modules/conversations/router.py` | `router` | GET | `/agent/{agent_id}/stats` |
| `api/modules/conversations/router.py` | `router` | PATCH | `/{conversation_id}/title` |
| `api/modules/identity/router.py` | `router` | DELETE | `/departments/{department_id}` |
| `api/modules/identity/router.py` | `router` | GET | `/departments` |
| `api/modules/identity/router.py` | `router` | GET | `/departments/{department_id}` |
| `api/modules/identity/router.py` | `router` | GET | `/departments/{department_id}/members` |
| `api/modules/identity/router.py` | `router` | GET | `/directory-config` |
| `api/modules/identity/router.py` | `router` | GET | `/org-chart` |
| `api/modules/identity/router.py` | `router` | GET | `/users/{user_id}` |
| `api/modules/identity/router.py` | `router` | GET | `/users/{user_id}/direct-reports` |
| `api/modules/identity/router.py` | `router` | GET | `/users/{user_id}/management-chain` |
| `api/modules/identity/router.py` | `router` | GET | `/users/{user_id}/manager` |
| `api/modules/identity/router.py` | `router` | POST | `/departments` |
| `api/modules/identity/router.py` | `router` | POST | `/org-chart/bulk-update` |
| `api/modules/identity/router.py` | `router` | POST | `/resolve-assignees` |
| `api/modules/identity/router.py` | `router` | PUT | `/departments/{department_id}` |
| `api/modules/identity/router.py` | `router` | PUT | `/directory-config` |
| `api/modules/identity/router.py` | `router` | PUT | `/users/{user_id}/employee-id` |
| `api/modules/identity/router.py` | `router` | PUT | `/users/{user_id}/manager` |
| `api/modules/lab/router.py` | `router` | DELETE | `/history` |
| `api/modules/lab/router.py` | `router` | DELETE | `/history/{item_id}` |
| `api/modules/lab/router.py` | `router` | GET | `/download/{item_id}` |
| `api/modules/lab/router.py` | `router` | GET | `/health` |
| `api/modules/lab/router.py` | `router` | GET | `/history` |
| `api/modules/lab/router.py` | `router` | GET | `/image/{item_id}` |
| `api/modules/lab/router.py` | `router` | GET | `/mock/{item_id}` |
| `api/modules/lab/router.py` | `router` | PATCH | `/history/{item_id}` |
| `api/modules/lab/router.py` | `router` | POST | `/generate/api` |
| `api/modules/lab/router.py` | `router` | POST | `/generate/document` |
| `api/modules/lab/router.py` | `router` | POST | `/generate/image` |
| `api/modules/lab/router.py` | `router` | POST | `/history` |
| `api/modules/process/router.py` | `router` | GET | `/approvals` |
| `api/modules/process/router.py` | `router` | GET | `/approvals/{approval_id}` |
| `api/modules/process/router.py` | `router` | GET | `/config/node-types` |
| `api/modules/process/router.py` | `router` | GET | `/config/settings` |
| `api/modules/process/router.py` | `router` | GET | `/config/templates` |
| `api/modules/process/router.py` | `router` | GET | `/executions` |
| `api/modules/process/router.py` | `router` | GET | `/executions/{execution_id}` |
| `api/modules/process/router.py` | `router` | GET | `/executions/{execution_id}/steps` |
| `api/modules/process/router.py` | `router` | GET | `/stats` |
| `api/modules/process/router.py` | `router` | GET | `/uploads/{file_id}/download` |
| `api/modules/process/router.py` | `router` | POST | `/approvals/{approval_id}/decide` |
| `api/modules/process/router.py` | `router` | POST | `/config/templates` |
| `api/modules/process/router.py` | `router` | POST | `/config/templates/{template_id}/use` |
| `api/modules/process/router.py` | `router` | POST | `/enrich-form-fields` |
| `api/modules/process/router.py` | `router` | POST | `/execute` |
| `api/modules/process/router.py` | `router` | POST | `/executions/{execution_id}/cancel` |
| `api/modules/process/router.py` | `router` | POST | `/executions/{execution_id}/resume` |
| `api/modules/process/router.py` | `router` | POST | `/test/send-notification` |
| `api/modules/process/router.py` | `router` | POST | `/uploads` |
| `api/modules/process/router.py` | `router` | POST | `/webhook/{agent_id}` |
| `api/modules/process/router.py` | `router` | POST | `/wizard/generate` |
| `api/modules/process/router.py` | `router` | POST | `/wizard/suggest-settings` |
| `api/modules/process/router.py` | `router` | PUT | `/config/settings` |
| `api/security.py` | `router` | DELETE | `/departments/{dept_id}` |
| `api/security.py` | `router` | DELETE | `/groups/{group_id}` |
| `api/security.py` | `router` | DELETE | `/invitations/{invitation_id}` |
| `api/security.py` | `router` | DELETE | `/ldap/{config_id}` |
| `api/security.py` | `router` | DELETE | `/permissions/db/{perm_id}` |
| `api/security.py` | `router` | DELETE | `/permissions/kb/{perm_id}` |
| `api/security.py` | `router` | DELETE | `/permissions/tools/{perm_id}` |
| `api/security.py` | `router` | DELETE | `/policies/{policy_id}` |
| `api/security.py` | `router` | DELETE | `/roles/cleanup-string-ids` |
| `api/security.py` | `router` | DELETE | `/roles/{role_id}` |
| `api/security.py` | `router` | DELETE | `/roles/{role_id}/force` |
| `api/security.py` | `router` | DELETE | `/users/{user_id}` |
| `api/security.py` | `router` | DELETE | `/users/{user_id}/sessions/{session_id}` |
| `api/security.py` | `router` | GET | `/audit-logs` |
| `api/security.py` | `router` | GET | `/audit-logs/export` |
| `api/security.py` | `router` | GET | `/auth/me` |
| `api/security.py` | `router` | GET | `/departments` |
| `api/security.py` | `router` | GET | `/groups` |
| `api/security.py` | `router` | GET | `/invitations` |
| `api/security.py` | `router` | GET | `/ldap` |
| `api/security.py` | `router` | GET | `/mfa/backup-codes` |
| `api/security.py` | `router` | GET | `/oauth/providers` |
| `api/security.py` | `router` | GET | `/oauth/{provider}/callback` |
| `api/security.py` | `router` | GET | `/oauth/{provider}/login` |
| `api/security.py` | `router` | GET | `/permissions` |
| `api/security.py` | `router` | GET | `/permissions/db` |
| `api/security.py` | `router` | GET | `/permissions/kb` |
| `api/security.py` | `router` | GET | `/permissions/tools` |
| `api/security.py` | `router` | GET | `/policies` |
| `api/security.py` | `router` | GET | `/policies/{policy_id}` |
| `api/security.py` | `router` | GET | `/roles` |
| `api/security.py` | `router` | GET | `/roles/{role_id}` |
| `api/security.py` | `router` | GET | `/settings` |
| `api/security.py` | `router` | GET | `/stats` |
| `api/security.py` | `router` | GET | `/users` |
| `api/security.py` | `router` | GET | `/users/{user_id}` |
| `api/security.py` | `router` | GET | `/users/{user_id}/sessions` |
| `api/security.py` | `router` | POST | `/auth/accept-invitation` |
| `api/security.py` | `router` | POST | `/auth/change-password` |
| `api/security.py` | `router` | POST | `/auth/first-login-password-change` |
| `api/security.py` | `router` | POST | `/auth/forgot-password` |
| `api/security.py` | `router` | POST | `/auth/login` |
| `api/security.py` | `router` | POST | `/auth/logout` |
| `api/security.py` | `router` | POST | `/auth/refresh` |
| `api/security.py` | `router` | POST | `/auth/register` |
| `api/security.py` | `router` | POST | `/auth/resend-verification` |
| `api/security.py` | `router` | POST | `/auth/reset-password` |
| `api/security.py` | `router` | POST | `/auth/verify-email` |
| `api/security.py` | `router` | POST | `/check-access` |
| `api/security.py` | `router` | POST | `/departments` |
| `api/security.py` | `router` | POST | `/groups` |
| `api/security.py` | `router` | POST | `/invitations/{invitation_id}/resend` |
| `api/security.py` | `router` | POST | `/ldap` |
| `api/security.py` | `router` | POST | `/ldap/{config_id}/sync` |
| `api/security.py` | `router` | POST | `/ldap/{config_id}/test` |
| `api/security.py` | `router` | POST | `/mfa/disable` |
| `api/security.py` | `router` | POST | `/mfa/enable` |
| `api/security.py` | `router` | POST | `/mfa/send-login-code` |
| `api/security.py` | `router` | POST | `/mfa/user-toggle` |
| `api/security.py` | `router` | POST | `/mfa/verify` |
| `api/security.py` | `router` | POST | `/oauth/configure` |
| `api/security.py` | `router` | POST | `/oauth/mfa/resend` |
| `api/security.py` | `router` | POST | `/oauth/mfa/verify` |
| `api/security.py` | `router` | POST | `/permissions/db` |
| `api/security.py` | `router` | POST | `/permissions/kb` |
| `api/security.py` | `router` | POST | `/permissions/tools` |
| `api/security.py` | `router` | POST | `/policies` |
| `api/security.py` | `router` | POST | `/roles` |
| `api/security.py` | `router` | POST | `/roles/fix-levels` |
| `api/security.py` | `router` | POST | `/roles/reload-from-database` |
| `api/security.py` | `router` | POST | `/roles/reset-defaults` |
| `api/security.py` | `router` | POST | `/users` |
| `api/security.py` | `router` | POST | `/users/bulk-invite` |
| `api/security.py` | `router` | POST | `/users/invite` |
| `api/security.py` | `router` | POST | `/users/{user_id}/resend-verification` |
| `api/security.py` | `router` | PUT | `/groups/{group_id}` |
| `api/security.py` | `router` | PUT | `/permissions/db/{perm_id}` |
| `api/security.py` | `router` | PUT | `/permissions/kb/{perm_id}` |
| `api/security.py` | `router` | PUT | `/permissions/tools/{perm_id}` |
| `api/security.py` | `router` | PUT | `/policies/{policy_id}` |
| `api/security.py` | `router` | PUT | `/roles/{role_id}` |
| `api/security.py` | `router` | PUT | `/settings` |
| `api/security.py` | `router` | PUT | `/users/{user_id}` |
| `database/config.py` | `app` | GET | `/items` |

### Exported Symbols Index (Python top-level)

- `alembic/env.py`
  - Functions: `run_migrations_offline`, `run_migrations_online`
- `alembic/versions/001_add_website_tooltype.py`
  - Functions: `upgrade`, `downgrade`
- `alembic/versions/002_add_tool_access_control.py`
  - Functions: `column_exists`, `index_exists`, `upgrade`, `downgrade`
- `alembic/versions/003_add_process_agent_support.py`
  - Functions: `column_exists`, `table_exists`, `index_exists`, `upgrade`, `downgrade`
- `alembic/versions/004_add_process_settings_tables.py`
  - Functions: `table_exists`, `upgrade`, `downgrade`
- `alembic/versions/005_add_approval_assigned_group_ids.py`
  - Functions: `column_exists`, `upgrade`, `downgrade`
- `alembic/versions/006_add_lab_history_items.py`
  - Functions: `table_exists`, `upgrade`, `downgrade`
- `alembic/versions/007_add_lab_mock_apis.py`
  - Functions: `table_exists`, `upgrade`, `downgrade`
- `alembic/versions/008_add_identity_fields.py`
  - Functions: `upgrade`, `downgrade`
- `api/main.py`
  - Classes: `LLMProvider`, `EmbeddingProvider`, `VectorDBProvider`, `LLMConfig`, `EmbeddingConfig`, `VectorDBConfig`, `GoogleConfig`, `LLMProviderConfig`, `SystemSettings`, `BaseLLMProvider`, `BaseEmbeddingProvider`, `BaseVectorDB`, `OpenAILLM`, `AzureOpenAILLM`, `AnthropicLLM`, `OllamaLLM`, `CustomLLM`, `OpenAICompatibleLLM`, `GoogleLLM`, `CohereLLM`, `OpenAIEmbedding`, `SentenceTransformersEmbedding`, `OllamaEmbedding`, `MemoryVectorDB`, `ChromaVectorDB`, `ProviderFactory`, `APIInputParameter`, `APIEndpointConfig`, `KnowledgeBaseEmbeddingConfig`, `KnowledgeBaseVectorDBConfig`, `KnowledgeBaseConfig`, `ToolConfiguration`, `TaskInstruction`, `TaskDefinition`, `AgentPersonality`, `AgentGuardrails`, `AgentData`, `ConversationMessage`, `ConversationAccessCache`, `Conversation`, `Document`, `ScrapedPage`, `ChatRequest`, `ChatResponse`, `CreateAgentRequest`, `UpdateAgentRequest`, `CreateToolRequest`, `ScrapeRequest`, `APITestRequest`, `DocumentProcessor`, `WebsiteScraper`, `OpenAPIParser`, `DemoAPITool`, `DemoKnowledgeBase`, `DemoAsset`, `DemoKit`, `GenerateDemoKitRequest`, `AppState`, `EmailService`, `GenerateAgentConfigRequest`, `OpenAIDirectLLM`, `AnthropicDirectLLM`, `ConfigureToolsRequest`, `DemoDataRequest`, `UpdateDemoAPIRequest`, `UpdateDemoKBRequest`, `UpdateDemoAssetRequest`, `UnifiedDemoRequest`, `UpdateDemoDocRequest`, `TableEntryRequest`, `CodeGenerationRequest`, `ToolTestRequest`, `KnowledgeSearchRequest`, `ApiTestRequest`, `ExtractParamRequest`, `GenerateParamRequest`, `SendEmailRequest`, `UpdateToolRequest`, `StartChatRequest`, `ChatSessionResponse`, `StreamingChatRequest`, `DemoItem`, `DemoGenerateRequest`, `DemoCreateToolRequest`
  - Functions: `debug_log`, `should_use_playwright`, `resolve_tool_id`, `get_agent_tools`, `search_documents_keyword`, `search_documents`, `build_tool_definitions`, `get_current_datetime_for_user`, `get_language_instruction`, `extract_text_from_pdf`, `extract_text_from_docx`, `build_security_tool_definition`, `execute_security_tool`, `generate_hr_demo_data`, `generate_ecommerce_demo_data`, `generate_support_demo_data`, `generate_test_prompts`, `get_user_group_ids`, `check_tool_access`, `generate_auto_response`
- `api/modules/access_control/router.py`
  - Classes: `AgentAdminUpdate`
  - Functions: `check_agent_management_permission`, `is_agent_owner`
- `api/modules/access_control/schemas.py`
  - Classes: `AccessType`, `EntityType`, `AccessEntity`, `AgentAccessCreate`, `AgentAccessUpdate`, `AgentAccessResponse`, `TaskPermission`, `TaskAccessConfig`, `TaskAccessUpdate`, `ToolPermission`, `ToolAccessConfig`, `ToolAccessUpdate`, `AccessCheckResult`, `UserAccessPreview`, `FullAccessConfig`, `QuickTemplate`, `AgentPermissionType`, `AgentAdminPermission`, `AgentManagementConfig`, `AgentManagementUpdate`, `PermissionCheckResult`
- `api/modules/access_control/service.py`
  - Classes: `AccessControlService`
  - Functions: `normalize_org_id`, `is_valid_uuid`
- `api/modules/conversations/router.py`
  - Classes: `BulkDeleteRequest`, `BulkDeleteResponse`, `ConversationListResponse`, `ConversationStatsResponse`, `UpdateTitleRequest`
- `api/modules/conversations/service.py`
  - Classes: `ConversationTitleService`, `ConversationManagementService`
- `api/modules/identity/router.py`
  - Functions: `get_directory_service`, `_extract_user_context`
- `api/modules/identity/schemas.py`
  - Classes: `UpdateManagerRequest`, `UpdateEmployeeIdRequest`, `BulkOrgChartUpdate`, `BulkOrgChartRequest`, `BulkOrgChartResponse`, `UserAttributesResponse`, `OrgChartNodeResponse`, `DepartmentResponse`, `CreateDepartmentRequest`, `UpdateDepartmentRequest`, `DirectorySourceConfig`, `ResolveAssigneeRequest`, `ResolveAssigneeResponse`
- `api/modules/lab/router.py`
  - Functions: `_normalize_api_result`, `_user_can_access_mock`, `_require_user`, `_user_id`
- `api/modules/lab/schemas.py`
  - Classes: `DocumentFormat`, `ImageFormat`, `DocumentType`, `APIGenerateRequest`, `APIGenerateResponse`, `DocumentGenerateRequest`, `DocumentGenerateResponse`, `ImageGenerateRequest`, `ImageGenerateResponse`, `LabHistoryAddRequest`, `LabHistoryItemResponse`, `LabItem`, `LabHistoryUpdateRequest`, `LabHistoryResponse`
- `api/modules/lab/service.py`
  - Classes: `LabService`
- `api/modules/process/router.py`
  - Classes: `ProcessTestSendNotificationRequest`
  - Functions: `_get_llm_registry`, `get_service`, `_user_to_dict`, `_is_platform_admin`, `_is_approval_visible_to_user`, `_process_upload_base_dir`, `_safe_filename`
- `api/modules/process/schemas.py`
  - Classes: `ProcessExecutionCreate`, `StatusInfo`, `ErrorInfo`, `ProcessExecutionResponse`, `ProcessExecutionListResponse`, `StepExecutionResponse`, `ApprovalRequestResponse`, `ApprovalDecisionRequest`, `ApprovalListResponse`, `ProcessResumeRequest`, `ProcessCancelRequest`, `ProcessStatsResponse`, `ProcessEventResponse`, `EnrichFormFieldsRequest`, `EnrichedFormField`, `EnrichFormFieldsResponse`
- `api/modules/process/service.py`
  - Classes: `ProcessAPIService`
  - Functions: `_approvers_to_ids`
- `api/security.py`
  - Classes: `RegisterRequest`, `LoginRequest`, `ChangePasswordRequest`, `ResetPasswordRequest`, `FirstLoginPasswordChangeRequest`, `AcceptInvitationRequest`, `ConfirmResetPasswordRequest`, `EnableMFARequest`, `VerifyMFARequest`, `DisableMFARequest`, `CreateUserRequest`, `UpdateUserRequest`, `InviteUserRequest`, `BulkInviteRequest`, `CreateRoleRequest`, `UpdateRoleRequest`, `PolicyConditionRequest`, `PolicyRuleRequest`, `CreatePolicyRequest`, `UpdatePolicyRequest`, `ToolPermissionRequest`, `KBPermissionRequest`, `DBPermissionRequest`, `CreateDepartmentRequest`, `CreateGroupRequest`, `UpdateSecuritySettingsRequest`, `LDAPConfigRequest`, `OAuthConfigRequest`, `AuthResponse`, `VerifyEmailRequest`, `ResendVerificationRequest`
  - Functions: `save_user_to_db`, `save_invitation_to_db`, `save_audit_log_to_db`, `check_ip_whitelist`
- `core/agent/engine.py`
  - Classes: `AgentEvent`, `AgentResponse`, `ModelSelectionMode`, `AgentConfig`, `Memory`, `AgentEngine`
- `core/agent/generator.py`
  - Classes: `GeneratedPersonality`, `GeneratedTask`, `SuggestedTool`, `SampleResponse`, `GeneratedAgent`, `AgentGenerator`
- `core/feature_flags.py`
  - Classes: `FeatureFlags`
- `core/identity/service.py`
  - Classes: `UserAttributes`, `OrgChartNode`, `DepartmentInfo`, `UserDirectoryService`
- `core/llm/base.py`
  - Classes: `MessageRole`, `Message`, `ToolCall`, `LLMResponse`, `LLMCapability`, `LLMStrength`, `LLMConfig`, `BaseLLM`
- `core/llm/factory.py`
  - Classes: `LLMFactory`
  - Functions: `_init_providers`
- `core/llm/instruction_enforcer.py`
  - Classes: `InstructionEnforcer`
- `core/llm/providers/anthropic.py`
  - Classes: `AnthropicLLM`
- `core/llm/providers/ollama.py`
  - Classes: `OllamaLLM`
- `core/llm/providers/openai.py`
  - Classes: `OpenAILLM`, `AzureOpenAILLM`
- `core/llm/registry.py`
  - Classes: `LLMRegistry`
- `core/llm/router.py`
  - Classes: `OptimizeFor`, `PromptAnalysis`, `RoutingDecision`, `PromptAnalyzer`, `LLMRouter`
- `core/process/engine.py`
  - Classes: `ProcessEvent`, `ProcessEngine`
- `core/process/messages.py`
  - Classes: `ErrorCode`
  - Functions: `get_business_term`, `get_node_type_display`, `get_error_message`, `format_error_for_user`, `problem_details_rfc9457`, `get_success_message`, `get_status_info`, `get_help_text`, `get_validation_message`, `sanitize_for_user`
- `core/process/nodes/base.py`
  - Classes: `ExecutorDependencies`, `BaseNodeExecutor`, `NodeExecutorRegistry`
  - Functions: `register_executor`
- `core/process/nodes/data.py`
  - Classes: `TransformNodeExecutor`, `ValidateNodeExecutor`, `FilterNodeExecutor`, `MapNodeExecutor`, `AggregateNodeExecutor`
- `core/process/nodes/flow.py`
  - Classes: `StartNodeExecutor`, `EndNodeExecutor`, `MergeNodeExecutor`
- `core/process/nodes/human.py`
  - Classes: `ApprovalNodeExecutor`, `HumanTaskNodeExecutor`, `NotificationNodeExecutor`
  - Functions: `_to_assignee_id_list`
- `core/process/nodes/integration.py`
  - Classes: `HTTPRequestNodeExecutor`, `DatabaseQueryNodeExecutor`, `FileOperationNodeExecutor`, `MessageQueueNodeExecutor`
- `core/process/nodes/logic.py`
  - Classes: `ConditionNodeExecutor`, `SwitchNodeExecutor`, `LoopNodeExecutor`, `WhileNodeExecutor`, `ParallelNodeExecutor`
- `core/process/nodes/task.py`
  - Classes: `AITaskNodeExecutor`, `ToolCallNodeExecutor`, `ScriptNodeExecutor`, `SecurityError`
- `core/process/nodes/timing.py`
  - Classes: `DelayNodeExecutor`, `ScheduleNodeExecutor`, `EventWaitNodeExecutor`
- `core/process/platform_knowledge.py`
  - Classes: `KBChunk`
  - Functions: `_repo_root`, `_read_text`, `_extract_title`, `_to_camel_key`, `_chunk_markdown`, `_tokenize`, `_score_chunks`, `load_platform_kb_chunks`, `load_safe_taxonomies`, `retrieve_platform_knowledge`
- `core/process/result.py`
  - Classes: `ExecutionStatus`, `ErrorCategory`, `ExecutionError`, `NodeResult`, `ProcessResult`
- `core/process/schemas.py`
  - Classes: `NodeType`, `TriggerType`, `VariableType`, `ProcessVariable`, `WebhookTriggerConfig`, `ScheduleTriggerConfig`, `EventTriggerConfig`, `ProcessTrigger`, `Position`, `RetryConfig`, `TimeoutConfig`, `NodeConfig`, `ProcessEdge`, `ProcessNode`, `ProcessSettings`, `ProcessDefinition`, `AITaskConfig`, `HTTPRequestConfig`, `DatabaseQueryConfig`, `ConditionConfig`, `SwitchConfig`, `LoopConfig`, `ParallelConfig`, `ApprovalConfig`, `TransformConfig`, `DelayConfig`, `ToolCallConfig`
- `core/process/services/approval.py`
  - Classes: `ApprovalService`
- `core/process/services/notification.py`
  - Classes: `NotificationService`
- `core/process/state.py`
  - Classes: `VariableChange`, `ProcessContext`, `ProcessState`
- `core/process/wizard.py`
  - Classes: `ProcessWizard`
- `core/security/engine.py`
  - Classes: `PolicyEngine`
- `core/security/models.py`
  - Classes: `AuthProvider`, `MFAMethod`, `UserStatus`, `Permission`, `ActionType`, `ResourceType`, `DataClassification`, `TenancyMode`, `RegistrationMode`, `MFAEnforcement`, `AuditLogLevel`, `Organization`, `Department`, `UserGroup`, `UserMFA`, `UserProfile`, `User`, `Session`, `Invitation`, `Role`, `PolicyCondition`, `PolicyRule`, `Policy`, `ToolPermission`, `KnowledgeBasePermission`, `DatabasePermission`, `AuditLog`, `LDAPConfig`, `OAuthConfig`, `SecuritySettings`
- `core/security/services.py`
  - Classes: `PasswordService`, `MFAService`, `TokenService`, `EmailService`, `LDAPService`, `OAuthService`
- `core/security/state.py`
  - Classes: `SecurityState`
- `core/tools/base.py`
  - Classes: `ToolCategory`, `ToolDefinition`, `ToolResult`, `ToolConfig`, `BaseTool`, `ToolRegistry`
- `core/tools/builtin/api.py`
  - Classes: `APITool`, `GraphQLTool`, `WebhookTool`
- `core/tools/builtin/database.py`
  - Classes: `DatabaseTool`
- `core/tools/builtin/rag.py`
  - Classes: `RAGTool`
- `database/__init__.py`
  - Functions: `__getattr__`
- `database/base.py`
  - Functions: `get_engine`, `get_session_factory`, `get_session`, `get_db_session`, `init_db`, `check_connection`
- `database/column_types.py`
  - Classes: `GUID`, `JSON`, `JSONArray`
- `database/config.py`
  - Classes: `DatabaseType`, `DatabaseConfig`
  - Functions: `get_engine`, `get_session_factory`, `get_db`, `get_db_session`
- `database/enums.py`
  - Classes: `AgentType`, `ProcessStatus`, `ProcessExecutionStatus`, `ProcessNodeType`, `ProcessTriggerType`, `ProcessNodeStatus`, `ToolType`, `AgentStatus`, `ConversationStatus`, `KBStatus`, `DocumentStatus`
  - Functions: `validate_enum_value`, `get_all_enum_values`
- `database/init_db.py`
  - Functions: `main`
- `database/models/agent.py`
  - Classes: `Agent`
- `database/models/agent_access.py`
  - Classes: `AgentAccessPolicy`, `AgentDataPolicy`, `AgentActionPolicy`, `AgentDeployment`, `EndUserSession`
- `database/models/audit.py`
  - Classes: `AuditLog`, `SecurityEvent`, `DataExport`, `ComplianceReport`
- `database/models/conversation.py`
  - Classes: `MessageRole`, `Conversation`, `Message`, `ConversationShare`
- `database/models/db_permission.py`
  - Classes: `DatabasePermission`
- `database/models/department.py`
  - Classes: `Department`
- `database/models/invitation.py`
  - Classes: `Invitation`
- `database/models/kb_permission.py`
  - Classes: `KnowledgeBasePermission`
- `database/models/knowledge_base.py`
  - Classes: `DocumentStatus`, `DocumentType`, `KnowledgeBase`, `Document`, `DocumentChunk`, `KBQuery`
- `database/models/lab_history.py`
  - Classes: `LabHistoryItem`
- `database/models/lab_mock_api.py`
  - Classes: `LabMockAPI`
- `database/models/ldap_config.py`
  - Classes: `LDAPConfig`
- `database/models/oauth_config.py`
  - Classes: `OAuthConfig`
- `database/models/organization.py`
  - Classes: `Organization`
- `database/models/policy.py`
  - Classes: `Policy`
- `database/models/process_execution.py`
  - Classes: `ProcessExecution`, `ProcessNodeExecution`, `ProcessApprovalRequest`
- `database/models/process_settings.py`
  - Classes: `ProcessOrgSettings`, `ProcessNodeType`, `ProcessTemplate`
- `database/models/role.py`
  - Classes: `Role`, `Permission`
- `database/models/security_settings.py`
  - Classes: `SecuritySettings`
- `database/models/settings.py`
  - Classes: `SystemSetting`, `OrganizationSetting`, `APIKey`, `Integration`, `UserIntegration`
- `database/models/tool.py`
  - Classes: `Tool`, `ToolExecution`
- `database/models/tool_permission.py`
  - Classes: `ToolPermission`
- `database/models/user.py`
  - Classes: `UserStatus`, `MFAMethod`, `User`, `UserSession`, `MFASetting`, `PasswordHistory`
- `database/models/user_group.py`
  - Classes: `UserGroup`
- `database/services/agent_service.py`
  - Classes: `AgentService`
- `database/services/audit_service.py`
  - Classes: `AuditService`
- `database/services/conversation_service.py`
  - Classes: `ConversationService`
- `database/services/department_service.py`
  - Classes: `DepartmentService`
- `database/services/encryption.py`
  - Classes: `EncryptionService`
  - Functions: `get_encryption_service`
- `database/services/invitation_service.py`
  - Classes: `InvitationService`
- `database/services/organization_service.py`
  - Classes: `OrganizationService`
- `database/services/process_execution_service.py`
  - Classes: `ProcessExecutionService`
- `database/services/process_settings_service.py`
  - Classes: `ProcessSettingsService`
- `database/services/role_service.py`
  - Classes: `RoleService`
- `database/services/security_settings_service.py`
  - Classes: `SecuritySettingsService`
- `database/services/system_settings_service.py`
  - Classes: `SystemSettingsService`
- `database/services/tool_service.py`
  - Classes: `ToolService`
- `database/services/user_group_service.py`
  - Classes: `UserGroupService`
- `database/services/user_service.py`
  - Classes: `UserService`, `SessionService`
- `run.py`
  - Functions: `main`
- `scripts/add_google_oauth_credentials.py`
  - Functions: `add_google_oauth_credentials`
- `scripts/add_identity_columns.py`
  - Functions: `_column_exists`, `add_identity_columns`
- `scripts/add_organization_oauth_columns.py`
  - Functions: `add_organization_oauth_columns`
- `scripts/add_role_columns.py`
  - Functions: `add_missing_role_columns`
- `scripts/create_missing_tables.py`
  - Functions: `create_missing_tables`, `fix_jsonarray_column_types`, `add_missing_columns`
- `scripts/fix_agent_status_enum.py`
  - Functions: `fix_agent_status_enum`
- `scripts/fix_agent_status_to_string.py`
  - Functions: `fix_agent_status_column`
- `scripts/fix_all_enums_to_string.py`
  - Functions: `fix_all_enums`
- `scripts/fix_message_role_to_string.py`
  - Functions: `fix_message_role_to_string`
- `scripts/make_password_hash_nullable.py`
  - Functions: `make_password_hash_nullable`
- `scripts/migrate_to_db_complete.py`
  - Functions: `load_json_file`, `migrate_organizations`, `migrate_roles`, `migrate_users`, `migrate_agents`, `migrate_agents_direct`, `migrate_tools`, `migrate_settings`, `verify_migration`, `main`
- `scripts/split_app_features.py`
  - Functions: `_node_check`, `_line_start_offsets`, `_safe_boundary_positions`, `_choose_split_near`, `_write_chunks`, `_update_index_html`, `_shrink_source_stub`, `main`
- `scripts/split_ui_html_assets.py`
  - Functions: `_extract_head_and_rest`, `_extract_head_styles`, `_insert_css_link`, `_extract_first_inline_script`, `main`
- `scripts/split_ui_index_assets.py`
  - Functions: `_extract_head_and_rest`, `_extract_all_head_styles`, `_insert_css_link`, `_extract_inline_app_script`, `main`
- `scripts/split_ui_index_js.py`
  - Classes: `ScanState`
  - Functions: `_is_safe_split_point`, `_scan_for_safe_newline_boundaries`, `_node_check_syntax`, `_choose_splits_validated`, `_write_parts`, `_rewrite_index_html`, `_write_index_js_stub`, `_read_source_js`, `main`

### Configuration Sources (Phase 0)

**Environment variables referenced in Python (`os.environ` / `os.getenv`)**

- `ACCESS_TOKEN_EXPIRE_HOURS`
- `ANTHROPIC_API_KEY`
- `APP_URL`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `BASE_URL`
- `DATABASE_URL`
- `DATA_PATH`
- `DB_ECHO_SQL`
- `DB_HOST`
- `DB_MAX_OVERFLOW`
- `DB_NAME`
- `DB_PASSWORD`
- `DB_POOL_RECYCLE`
- `DB_POOL_SIZE`
- `DB_POOL_TIMEOUT`
- `DB_PORT`
- `DB_SSL_CA`
- `DB_SSL_CERT`
- `DB_SSL_KEY`
- `DB_SSL_MODE`
- `DB_TYPE`
- `DB_USER`
- `DEBUG`
- `DEBUG_MODE`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `ENCRYPTION_KEY`
- `ENCRYPTION_SALT`
- `FEATURE_NEW_AGENT_MODULE`
- `FEATURE_NEW_FRONTEND_COMPONENTS`
- `FEATURE_NEW_KNOWLEDGE_MODULE`
- `FEATURE_NEW_SERVICE_LAYER`
- `FEATURE_NEW_SETTINGS_MODULE`
- `FEATURE_NEW_TOOLS_MODULE`
- `FEATURE_USE_MODULAR_API`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `HOST`
- `JWT_SECRET_KEY`
- `MFA_ISSUER`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `OLLAMA_HOST`
- `OLLAMA_URL`
- `OPENAI_API_KEY`
- `PORT`
- `PROCESS_OUTPUT_PATH`
- `PUBLIC_URL`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `SENDGRID_API_KEY`
- `SQLITE_PATH`
- `UPLOAD_PATH`

**Keys in `.env.example`**

- `APP_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`

### UNREAD FILES

None.
