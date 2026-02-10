# AgentForge Project Status
> Last Updated: February 10, 2026

## 🎯 Current State: Production-Ready Enterprise AI Platform

AgentForge is a **fully functional enterprise AI agent platform** with:
- PostgreSQL database (database-agnostic design)
- Comprehensive access control & delegated admin system
- Multi-provider LLM support (10+ providers)
- Full MFA authentication (Email, TOTP)
- OAuth integration (Google)
- End User Portal with personalization
- **AI-powered Process Builder** (generate workflows from a prompt into a visual, editable builder)

---

## ✅ COMPLETED FEATURES (All 100%)

### 1. Database Layer
- PostgreSQL with database-agnostic design
- All ENUMs → VARCHAR(20)
- All ARRAYs → JSONB
- Services layer for all entities:
  - `AgentService`, `UserService`, `RoleService`
  - `ConversationService`, `ToolService`
  - `OrganizationService`, `DepartmentService`
  - `AuditService`, `SecuritySettingsService`

### 2. Admin Portal (`/ui/index.html` - ~32,000 lines)

#### Authentication & Security
- Login/Register with validation
- OAuth (Google) integration
- MFA support (Email, TOTP)
- Session management

#### User Management
- Full CRUD for users
- Role-based access control (RBAC)
- Invitations system
- Portal access types (Admin/End User)

#### Groups Management ✨
- Groups tab in Security Center
- Full CRUD for groups
- Member management
- Group-based permissions

#### Agent Management
- **5-Step Wizard**:
  1. Basic Info (name, description, LLM)
  2. System Prompt & Instructions
  3. Tools & Integrations
  4. **Access Control** (entities, task permissions)
  5. Deploy
- Clickable wizard steps
- Auto-save functionality
- Test chat in wizard
- **Process Agents Wizard**:
  - Prompt → generate a process workflow definition
  - Opens `ui/process-builder.html` immediately for cinematic build animation
  - Sends draft via `postMessage` + sessionStorage fallback

#### Access Control System ✨
- **Entity-based**: Users, Groups, Departments
- **Task Permissions Matrix**: Per-entity granular permissions
- **Agents PRIVATE by default** - Only owner can see
- **Owner always has full access**
- **Delegated Admin System**:
  - Assign specific permissions to other admins
  - Frontend UI restrictions based on permissions
  - Chat permissions for delegated admins

#### Tool Management
- API Kit configuration
- Knowledge Base setup
- Database tools
- RAG integration

#### Settings
- LLM Providers configuration
- Security settings
- Organization settings (branding, OAuth)

#### Lab Module ✨
- Standalone test data generator
- **Image Generator** - AI-powered content generation
- API testing interface

### 7. Process Agents & Visual Process Builder ✨

**Goal:** enable non-technical business users to generate and edit workflows visually, then test them with a business-friendly report.

**Key capabilities (implemented):**
- **Prompt → Visual workflow** via `/process/wizard/generate` with `output_format=visual_builder`
- **Grounded generation** (anti-hallucination) using a curated platform KB + tool context
  - `core/process/platform_knowledge.py` retrieves relevant KB chunks
  - Dropdowns are **only allowed** when options match safe taxonomies
- **Business-friendly inputs**: fields have `label` (shown to user) and `name` (internal lowerCamelCase key)
- **Derived fields**: auto-calculated trigger fields (e.g., `daysBetween(startDate, endDate)`)
- **Profile prefill**: read-only fields can prefill from logged-in user (email/name)
- **File inputs (UI + API)**: `type: "file"` supported in Start/Form and run modals
  - Files are uploaded via `POST /process/uploads` and stored server-side; trigger input stores a **file reference object**.
  - Builder simulation mode still uses local metadata only; engine test mode uploads files for real.
- **Document generation (engine)**: Action “Generate Document” maps to `file_operation` with `operation=generate_document` and supports docx/pdf/xlsx/pptx (fallback txt)
- **Test UX** (builder): step-by-step trace + animated path playback on the canvas
- **Test notifications** (builder): Test run is simulation by default; can optionally send real email notifications (SendGrid) via `POST /process/test/send-notification`
- **Auto-layout for AI drafts**: the builder applies a deterministic layout before the cinematic build animation

**Known gaps (explicit):**
- **Schedule/Webhook triggers**: configurable in Start node UI, but automatic scheduling/webhook trigger infrastructure is not fully implemented end-to-end yet.
- **File uploads (persistence)**: supported for process runs via `POST /process/uploads` (returns a file reference object that is embedded in `trigger_input`).
  - **Text extraction**: supported via Action `actionType="extractDocumentText"` → engine `file_operation` `operation="extract_text"` for pdf/docx/xlsx/pptx/txt/csv.
  - **Image OCR**: not implemented yet (image uploads are stored, but extracting text from images requires OCR/vision integration).
- **Generated document download**: documents are written to server storage; no dedicated API/UI download link for process outputs yet.
- **Advanced engine nodes** (switch/parallel/transform/etc.): exist in the engine, but are not exposed in the builder palette and may need additional normalization/UI work.

### 3. End User Portal (`/ui/chat.html`)

- Modern chat interface
- Login with MFA verification
- Agent selection (filtered by access control)
- File attachments
- **Profile page**: Name, password, MFA settings
- **Settings**: Theme toggle
- **Organization branding**: Logo, colors
- Responsive design (mobile-friendly)
- **Personalized welcome messages** with user context
- **Privacy**: Users only see their own conversations

### 4. LLM Integration (10+ Providers)

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4, GPT-4-turbo, GPT-3.5 |
| Anthropic | Claude Opus 4.5 ✨, Sonnet 4, Haiku 3.5 |
| Google | Gemini 2.0 Flash, 1.5 Pro (with function calling ✨) |
| Groq | Llama 3.3, Gemma2 |
| Mistral | Large, Small, Codestral |
| Perplexity | Sonar models |
| Cohere | Command models |

**Features:**
- Parallel LLM testing (all models at once)
- Auto-detect provider from model name
- Smart model selection for tool-using agents
- **Embedded Security Tool** - LLM can check permissions
- **User Context** - Name, role, groups for personalization

### 5. Conversations & Chat

- Full database persistence
- Messages with tool calls/results
- Test conversations separated (`is_test` flag)
- Conversation history per agent
- Sources and citations
- Clear/delete conversation support

### 6. Security Features

- **Access Control API** with proper authorization
- **Privacy controls** - Users only see own data
- **Audit logging** for security events
- **Anti-hallucination** for denied tasks
- **Owner priority** - Creator always has full access

---

## 📁 Key Files Reference

### Backend
| File | Purpose |
|------|---------|
| `api/main.py` | Main FastAPI app (~16,000 lines) |
| `api/security.py` | Auth, MFA, Users endpoints (~3,700 lines) |
| `api/modules/process/` | Process agents API (wizard, publish/run, executions) |
| `api/modules/access_control/` | Delegated admin permissions API |
| `api/modules/lab/` | Lab module (test data generator) |
| `database/models/` | All SQLAlchemy models |
| `database/services/` | All CRUD service classes |
| `database/enums.py` | Centralized enums |
| `database/column_types.py` | Database-agnostic types |
| `core/process/` | Process engine, node executors, wizard, platform knowledge |

### Frontend
| File | Size | Purpose |
|------|------|---------|
| `ui/index.html` | ~32,000 lines | Admin portal (monolithic) |
| `ui/chat.html` | ~2,000 lines | End User portal |
| `ui/lab.html` | ~500 lines | Lab interface |
| `ui/process-builder.html` | ~6,800 lines | Visual workflow builder + test/playback |

### Key Frontend Components in `index.html`:
| Component | Description |
|-----------|-------------|
| Agent Wizard | 5-step agent creation/editing |
| Access Control UI | Entity + task permissions matrix |
| Groups Management | Security Center tab |
| Settings Modals | LLM, Security, Organization |
| Test Chat | In-wizard agent testing |

---

## 🔧 Development Commands

```bash
# Start server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8080

# Database validation
./scripts/comprehensive_db_check.sh

# Test LLM providers
# (via API endpoint /api/settings/test-llm)
```

## 🚀 Git Workflow (Auto Commit + Push)

**Owner preference:** AI assistants should **auto-commit and auto-push** changes to `origin/main` without asking for confirmation.

If pushes fail due to authentication on a new machine, run:

```bash
gh auth login
gh auth status
git push origin main
```

---

## 🚨 Important Implementation Details

### Task Permissions
- **Match by NAME, not ID** - IDs change on each wizard load
- Saved in `agent_action_policies` table
- Frontend uses checkboxes for each task per entity

### Access Control Flow
1. Agent created → Owner set automatically
2. Owner can delegate permissions via Access Control (Step 4)
3. Delegated admins see restricted UI based on permissions
4. End users only see agents they have access to
5. LLM has embedded security tool to check permissions

### Delegated Admin UI Restrictions
- Wizard sections hidden/disabled based on permissions
- Navigation buttons still work when sections restricted
- Test chat permission checked separately

### Agent Visibility
- **Default: PRIVATE** - Only owner can see
- Owner must explicitly grant access to others
- Super Admins can see all agents

---

## 🚨 Rules for AI Agents

1. **Database Agnostic**: NO PostgreSQL-specific types
2. **Use VARCHAR(20) for enums**: NOT SQLEnum
3. **Use JSONB for arrays**: NOT ARRAY type
4. **Task permissions match by NAME** not ID
5. **Read `.cursorrules`** before any database work
6. **Read `database/COMMON_ISSUES.md`** for known issues
7. **Test locally** before committing

---

## 📋 Checklist for New AI Chat Session

Before starting work:
1. [ ] Read this file completely
2. [ ] Read `.cursorrules` for database rules
3. [ ] Read `database/COMMON_ISSUES.md`
4. [ ] Understand: `ui/index.html` is ~32K lines - read only needed sections
5. [ ] Understand the delegated admin permission system
6. [ ] Understand task permissions match by NAME

### Key Concepts:
| Concept | Description |
|---------|-------------|
| **Owner** | Agent creator, always has full access |
| **Delegated Admin** | Admin with limited permissions |
| **Task Permissions** | What actions can be performed per entity |
| **Access Control** | Who can access which agents |
| **Entity** | User, Group, or Department with access |

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├───────────────────────┬───────────────────┬─────────────────────┤
│   Admin Portal        │   End User Portal │   Lab               │
│   (index.html)        │   (chat.html)     │   (lab.html)        │
│   • Agent Wizard      │   • Chat UI       │   • Test Generator  │
│   • Access Control    │   • Profile       │   • Image Gen       │
│   • Groups Mgmt       │   • Settings      │                     │
│   • Settings          │                   │                     │
└───────────────────────┴───────────────────┴─────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
├─────────────────────────────────────────────────────────────────┤
│  api/main.py           • Agents, Conversations, Tools, Settings │
│  api/security.py       • Auth, MFA, Users, Roles, Invitations   │
│  api/modules/          • Modular features                        │
│    ├── access_control/ • Delegated admin permissions             │
│    └── lab/            • Test data generator                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  database/models/      • SQLAlchemy models (database-agnostic)  │
│  database/services/    • CRUD operations                         │
│  database/enums.py     • Centralized enums                       │
│  database/column_types.py • UUID, JSON, JSONArray types         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL                                 │
│  • users, roles, organizations, departments                      │
│  • agents, conversations, messages                               │
│  • agent_access_policies, agent_action_policies                  │
│  • tools, knowledge_bases                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Recent Major Updates (Summary)

| Feature | Status | Notes |
|---------|--------|-------|
| Delegated Admin System | ✅ Complete | Full frontend + backend |
| Access Control UI | ✅ Complete | Step 4 in wizard |
| Task Permissions | ✅ Complete | Per-entity, match by name |
| Groups Management | ✅ Complete | Security Center tab |
| Lab Module | ✅ Complete | Image generator included |
| LLM Updates | ✅ Complete | Claude Opus 4.5, Gemini 2.0 |
| OAuth (Google) | ✅ Complete | With MFA support |
| End User Portal | ✅ Complete | Full feature set |
| Privacy Controls | ✅ Complete | Users see own data only |
| Performance | ✅ Optimized | Production-ready |

---

## ⏳ Current Focus / Known Issues

(Update this section when starting new work)

### Active Work:
- Documentation consolidation: create a single canonical English documentation source of truth.

### Known Considerations:
1. **Large UI File** - `index.html` is ~32K lines
2. **Debug Logging** - Some console.log may remain in code
3. **Task ID vs Name** - Always use NAME for matching
4. **Process triggers** - Schedule/Webhook start modes are configurable but not fully operational end-to-end yet
5. **Process files** - File upload persistence + output downloads need dedicated endpoints/UI

---

**Platform is production-ready. All core features complete.**
