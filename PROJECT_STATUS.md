# AgentForge Project Status
> Last Updated: January 18, 2026

## 🎯 Current State: Production-Ready Enterprise AI Platform

AgentForge is a **fully functional enterprise AI agent platform** with:
- PostgreSQL database (database-agnostic design)
- Comprehensive access control & delegated admin system
- Multi-provider LLM support (10+ providers)
- Full MFA authentication (Email, TOTP)
- OAuth integration (Google)
- End User Portal with personalization

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

### 2. Admin Portal (`/ui/index.html` - ~25,000 lines)

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
| `api/main.py` | Main FastAPI app (~2000 lines) |
| `api/security.py` | Auth, MFA, Users endpoints |
| `api/modules/access_control/` | Delegated admin permissions API |
| `api/modules/lab/` | Lab module (test data generator) |
| `database/models/` | All SQLAlchemy models |
| `database/services/` | All CRUD service classes |
| `database/enums.py` | Centralized enums |
| `database/column_types.py` | Database-agnostic types |

### Frontend
| File | Size | Purpose |
|------|------|---------|
| `ui/index.html` | ~25,000 lines | Admin portal (monolithic) |
| `ui/chat.html` | ~2,000 lines | End User portal |
| `ui/lab.html` | ~500 lines | Lab interface |

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
4. [ ] Understand: `ui/index.html` is ~25K lines - read only needed sections
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
- (Add current task here)

### Known Considerations:
1. **Large UI File** - `index.html` is 25K lines
2. **Debug Logging** - Some console.log may remain in code
3. **Task ID vs Name** - Always use NAME for matching

---

**Platform is production-ready. All core features complete.**
