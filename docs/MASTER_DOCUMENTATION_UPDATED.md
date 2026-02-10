# 🔥 AgentForge Master Documentation
## Enterprise AI Agent Builder Platform

**Version:** 3.5  
**Last Updated:** February 10, 2026  
**GitHub:** https://github.com/ahamdihussein-star/agentforge  
**Production:** https://agentforge2.up.railway.app  
**Railway Project:** agentforge2  
**Domain:** agentforge.to

---

> ## ✅ IMPORTANT: This Document is the Canonical Source of Truth
> 
> **For a quick snapshot, read `PROJECT_STATUS.md` first.**
> 
> This master documentation is actively maintained and reflects the **current** architecture and implementation status (including what is real vs placeholder).
> 
> **Quick Reference Files (Updated):**
> - `PROJECT_STATUS.md` - Current state, recent changes, quick reference
> - `.cursorrules` - Development rules (auto-loaded by AI)
> - `database/COMMON_ISSUES.md` - Database patterns & issues
> 
> **This file covers:**
> - Architecture, services, and implementation status (implemented vs planned)
> - Security model and access control
> - Database schema (models + migrations)
> - Platform capabilities and known gaps
> - File-by-file repository reference (what each file contains)

---

# 📑 Table of Contents

## Part 1: Platform Overview
1. [Executive Summary](#-executive-summary)
2. [Recent Changes (January 2026)](#-recent-changes-january-2026)
3. [System Architecture](#-system-architecture)
4. [Folder Structure](#-folder-structure)

## Part 2: Features & Components
5. [Features - Complete List](#-features---complete-list)
6. [LLM Providers](#-llm-providers)
7. [Tools System](#-tools-system)
8. [Knowledge Base / RAG](#-knowledge-base--rag)
9. [Security Module](#-security-module)
10. [Demo Lab](#-demo-lab)
11. [Process Builder & Workflow Engine](#-process-builder--workflow-engine)

## Part 3: Technical Assessment
12. [Platform Assessment](#-platform-assessment)
13. [Gap Analysis](#-gap-analysis)
14. [Code Quality](#-code-quality)

## Part 4: Modernization & Best Practices
15. [Code Modernization Strategy](#-code-modernization-strategy)
16. [Database Migration Plan](#-database-migration-plan)
17. [UI/UX Modernization](#-uiux-modernization)

## Part 5: Deployment & Operations
18. [Deployment Architecture](#-deployment-architecture)
19. [Multi-Cloud Deployment Guide](#-multi-cloud-deployment-guide)
20. [Installation Wizard & CLI](#-installation-wizard--cli)
21. [Multi-Tenancy Architecture](#-multi-tenancy-architecture)

## Part 6: Maintenance
22. [API Reference](#-api-reference)
23. [Repository File Reference](#-repository-file-reference)
24. [Recommendations & Roadmap](#-recommendations--roadmap)
25. [Documentation Maintenance](#-documentation-maintenance)

---

# 📊 Executive Summary

## Platform Overview

AgentForge is an Enterprise AI Agent Builder platform that enables users to create, configure, test, and deploy intelligent AI agents with:
- Custom tools (APIs, databases, knowledge bases)
- Guardrails (anti-hallucination, PII protection)
- Multi-LLM support (OpenAI, Anthropic, Ollama, and more)
- Enterprise security (RBAC, MFA, OAuth, audit logging)

## Assessment Scores

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Core Features** | 7/10 | 9/10 | Minor |
| **Security** | 7/10 | 9/10 | Minor |
| **Code Quality** | 5/10 | 9/10 | **Major** |
| **UI/UX** | 6/10 | 9/10 | Significant |
| **Enterprise Ready** | 5/10 | 9/10 | Significant |
| **Scalability** | 4/10 | 9/10 | **Critical** |
| **Deployment Flexibility** | 4/10 | 9/10 | **Critical** |

## Key Strengths
- ✅ **Database-First Architecture** - PostgreSQL fully operational, enterprise-grade persistence
- ✅ Comprehensive security module with RBAC, MFA, OAuth (fully database-integrated)
- ✅ AI-powered agent generation (fully dynamic)
- ✅ Multi-LLM support with tool calling
- ✅ Demo Lab with realistic data generation
- ✅ Clean core abstractions (LLM, Tools interfaces)
- ✅ Database-agnostic design (PostgreSQL, MySQL, SQLite, SQL Server, Oracle support)

## Critical Issues Requiring Immediate Attention
- 🔴 **Monolithic Code** - ~16,000 lines in `api/main.py`, ~32,000 lines in `ui/index.html`
- ✅ **Database Migration** - **COMPLETED** - PostgreSQL fully operational, JSON backup only
- 🔴 **No Containerization Strategy** - Difficult multi-cloud deployment
- 🟡 **Multi-tenancy** - Database schema supports it, UI needs work
- 🔴 **No CI/CD Pipeline** - Manual deployments
- 🔴 **Access control gaps (must be verified and fixed)** - some endpoints may bypass authorization checks (see Security Module + Gap Analysis)
- 🟡 **Process triggers & file handling gaps** - schedule/webhook automation and file upload persistence need end-to-end implementation (see Process Builder section)

---

# 🆕 Recent Changes (January 2026)

## Tools UX Overhaul
- **Action Bar Pattern:** Replaced three-dots dropdown with enterprise selection pattern
- **Tool Categorization:** 8 active tools vs 12 coming soon (with visual distinction)
- **Edit Panel Enhancement:** Dynamic config fields per tool type, slide-over panel
- **Auto Re-processing:** Website auto re-scrapes on URL change, documents auto re-index on chunk settings change

## Security Cleanup
- Reduced permissions from 42 to 32 (removed unused KB, DB, Policy, Org permissions)
- Reduced default roles to 2 (Super Admin with 32, Admin with 25 permissions)
- Added `tools:edit` permission for tool configuration editing
- Added `/api/security/roles/reset-defaults` endpoint
- Completed Email MFA implementation (SendGrid/SMTP)

## UI/UX Improvements
- **User Profile Page:** Added comprehensive profile management accessible via user avatar click
  - View and edit profile information (name, email)
  - Change password with show/hide toggle (professional SVG icons)
  - MFA settings management (TOTP and Email options)
  - Enterprise-style UX (no sidebar navigation item)
- **Backend Endpoints:** All profile/MFA endpoints already existed in `api/security.py`

## Database Migration (Phase 3 Complete ✅ - Database-First Architecture)

### ✅ **COMPLETED: Full Database Migration (January 2026)**

**Status:** **100% Complete** - Platform now operates **database-first** with JSON as backup only.

#### Phase 1 & 2: Setup & Data Migration ✅
- **PostgreSQL Setup:** Deployed on Railway with automatic initialization
- **Models Created:** Complete enterprise schema (20+ models)
  - Security: User, Role, Organization, Invitation, Department, UserGroup, SecuritySettings, AuditLog
  - Platform: Agent, Tool, Conversation, KnowledgeBase, Document
  - Configuration: SystemSetting, OrganizationSetting, APIKey, Integration
- **Smart Migration Script:** 
  - Handles dict-of-dicts JSON format
  - Auto-generates UUIDs for string IDs
  - Maps entity references (org_id, role_id)
  - Extracts nested data (profile, mfa objects)
  - **UPSERT pattern** - preserves user-modified data during re-deployments
- **Automated Deployment:** Migration runs automatically on Railway startup
- **Health Monitoring:** `/api/health/db` endpoint for database status

#### Phase 3: Database-First Architecture ✅ **COMPLETED**
- **Primary Storage:** PostgreSQL database (all CRUD operations)
- **Backup Storage:** JSON files (read-only backup, written after DB saves)
- **Service Layer:** Complete database services for all entities
  - `UserService`, `RoleService`, `OrganizationService`
  - `InvitationService`, `DepartmentService`, `UserGroupService`
  - `SecuritySettingsService`, `SystemSettingsService`
  - `AuditService`
- **State Management:** `SecurityState.load_from_disk()` prioritizes database
  - Loads from database first
  - Falls back to JSON only if database unavailable
  - Comprehensive error handling and logging
- **API Integration:** All security endpoints use database services directly
  - User management: `UserService.create_user()`, `update_user()`, `delete_user()`
  - Role management: `RoleService.save_role()`, `get_all_roles()`
  - Settings: `SecuritySettingsService.save_settings()`
- **Data Persistence:** All modifications saved to database immediately
  - User profile updates → Database
  - MFA settings → Database
  - Role permissions → Database
  - OAuth configuration → Database
  - Platform settings → Database

#### Migration Statistics:
- **Organizations:** Migrated and operational
- **Roles:** 4 roles (Super Admin, Admin, Presales, User) with full permissions
- **Users:** All users migrated with complete profiles and MFA settings
- **Settings:** 45+ platform settings migrated
- **Tools:** Migrated and operational
- **Invitations:** Migrated and operational
- **Audit Logs:** 17+ logs migrated

#### Database Configuration:
- **Type:** PostgreSQL (database-agnostic design supports MySQL, SQLite, SQL Server, Oracle)
- **Connection:** Railway automatic `DATABASE_URL` with private networking
- **Connection Pooling:** Configured (pool_size=20, max_overflow=10)
- **SSL/TLS:** Enabled (require mode)
- **Schema:** Complete enterprise-grade schema with proper indexes

## Backend Improvements
- `UpdateToolRequest` model includes `is_active` field
- Smart config change detection in `update_tool` endpoint
- Proper async scraping with result tracking

## Deployment

- **Production URL:** https://agentforge2.up.railway.app
- **Railway Project:** agentforge2
- Auto-deploy from main branch
- **Database:** PostgreSQL on Railway
  - Service: `Postgres` (automatically provisioned)
  - Connection: `DATABASE_URL` environment variable
  - Private networking: `${{Postgres.DATABASE_PRIVATE_URL}}`
- **Environment Variables:**
  - `DATABASE_URL`: Automatically set by Railway from Postgres service
  - `PORT`: Set to 8080 by Railway
  - LLM API Keys: OpenAI, Anthropic, Google, etc.
  - Email: SendGrid API Key for MFA emails

---

# 🏗️ System Architecture

## Current Architecture (Database-First Monolithic)

```
┌──────────────────────────────────────────────────────────────────┐
│                  CURRENT ARCHITECTURE (v3.5)                      │
│              (Database-First Monolithic)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ui/index.html (Admin Portal) + ui/process-builder.html      │ │
│  │        (~32,000 lines)           (~6,800 lines)              │ │
│  │  Login │ Hub │ Studio │ Tools │ KB │ Demo │ Settings │ Process│ │
│  │  OAuth │ MFA │ Profile │ Security Center │ Builder │ Test Run │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    api/main.py                               │ │
│  │                   (~16,000 lines)                            │ │
│  │ Agents │ Chat │ Tools │ RAG │ Process │ Demo │ Settings      │ │
│  │                                                             │ │
│  │                    api/security.py                           │ │
│  │                   (~3,700 lines)                             │ │
│  │ Auth │ Users │ Roles │ MFA │ OAuth │ RBAC │ Audit            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              core/security/state.py                           │ │
│  │              (Database-First State Management)                │ │
│  │  load_from_disk() → Database First, JSON Fallback            │ │
│  │  save_to_disk() → Database Primary, JSON Backup              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                    ┌─────────┴─────────┐                         │
│                    │                   │                         │
│                    ▼                   ▼                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│  │   PostgreSQL Database    │  │   JSON Files (Backup)    │     │
│  │   (Primary Storage)       │  │   (Read-Only Backup)     │     │
│  │                           │  │                          │     │
│  │  • Users                  │  │  • users.json           │     │
│  │  • Roles                  │  │  • roles.json           │     │
│  │  • Organizations          │  │  • organizations.json   │     │
│  │  • Settings               │  │  • settings.json        │     │
│  │  • Audit Logs             │  │  • audit_logs.json      │     │
│  │  • Invitations            │  │  • invitations.json     │     │
│  │  • Tools                  │  │  • tools.json           │     │
│  │  • Agents                 │  │  • agents.json          │     │
│  └──────────────────────────┘  └──────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              database/services/                               │ │
│  │  UserService │ RoleService │ OrganizationService            │ │
│  │  (All CRUD operations go through services)                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

Current State:
✅ Database-first architecture (PostgreSQL primary)
✅ JSON files as backup only (written after DB saves)
✅ Complete service layer for all entities
✅ Database-agnostic design (supports multiple DB types)
✅ Comprehensive error handling and fallback
⚠️ Still monolithic (single file structure)
⚠️ Cannot scale horizontally (yet)
⚠️ No separation of concerns (yet)
```

## Target Architecture (Microservices-Ready Modular)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        TARGET ARCHITECTURE                                │
│                    (Modular / Microservices-Ready)                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         FRONTEND                                     │ │
│  │                    (React/Vue + TypeScript)                          │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
│  │  │  Auth   │ │  Agent  │ │  Tools  │ │   KB    │ │ Settings│       │ │
│  │  │ Module  │ │  Module │ │  Module │ │  Module │ │  Module │       │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                              │                                            │
│                         API Gateway                                       │
│                    (Kong / Traefik / Nginx)                              │
│                              │                                            │
│       ┌──────────────────────┼──────────────────────┐                    │
│       │                      │                      │                    │
│       ▼                      ▼                      ▼                    │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐                │
│  │  Auth   │           │  Agent  │           │   RAG   │                │
│  │ Service │           │ Service │           │ Service │                │
│  └────┬────┘           └────┬────┘           └────┬────┘                │
│       │                     │                     │                      │
│       └──────────────────────┼──────────────────────┘                    │
│                              │                                            │
│       ┌──────────────────────┼──────────────────────┐                    │
│       │                      │                      │                    │
│       ▼                      ▼                      ▼                    │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐                │
│  │ PostgreSQL          │  Redis  │           │ Vector  │                │
│  │ (Primary DB)        │ (Cache) │           │   DB    │                │
│  └─────────┘           └─────────┘           └─────────┘                │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      Message Queue                                   │ │
│  │                   (RabbitMQ / Redis)                                 │ │
│  │              Async Jobs │ Events │ Notifications                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

Benefits:
✅ Horizontally scalable
✅ Independent deployments
✅ Technology flexibility
✅ Multi-cloud ready
✅ Multi-tenant capable
✅ Easy to test and maintain
```

## Tech Stack Comparison

| Component | Current | Target | Migration Effort |
|-----------|---------|--------|------------------|
| Frontend | Vanilla JS (Admin: ~32K lines; Builder: ~6.8K lines) | React/Vue + TypeScript | High |
| API | FastAPI monolith (`api/main.py` ~16K lines) + modular routers | Split services / clearer module boundaries | Medium |
| Database | PostgreSQL (primary) + JSON backup | PostgreSQL + optional Redis cache/queue | Medium |
| Vector DB | ProviderFactory-backed (optional; can fall back to keyword search) | ChromaDB/Pinecone/Qdrant (pluggable) | Low |
| Queue | None | Redis/RabbitMQ for async jobs | Medium |
| Cache | None | Redis (optional) | Low |
| Container | Docker | Docker + K8s Ready | Medium |
| CI/CD | None | GitHub Actions | Low |

---

# 📁 Folder Structure

## Current Structure

```
agentforge/                               # Monolith with modular subpackages
├── api/
│   ├── main.py                          # ❌ ~16,000 lines (monolithic API)
│   ├── security.py                      # ✅ ~3,700 lines (auth/MFA/OAuth/users/roles)
│   ├── health.py                        # Health endpoints
│   └── modules/                         # Modular routers/services
│       ├── access_control/              # Delegated admin + agent ACL
│       ├── conversations/               # Conversations API
│       ├── lab/                         # Demo Lab (docs/images/mock APIs)
│       └── process/                     # Process agents (wizard, publish/run, executions)
├── core/                                # Reusable engine modules
│   ├── agent/                           # Conversational agent engine
│   ├── llm/                             # LLM abstractions (used by some modules)
│   ├── process/                         # Workflow engine + wizard + node executors + KB grounding
│   ├── security/                        # RBAC/ABAC engine + token/MFA services
│   └── tools/                           # Tool interfaces + builtin tools (used by process engine)
├── database/                            # SQLAlchemy models + services (DB-first)
│   ├── models/
│   └── services/
├── ui/                                  # Vanilla JS admin + end-user portals
│   ├── index.html                       # ❌ ~32,000 lines (admin portal)
│   ├── process-builder.html             # ✅ ~6,800 lines (visual workflow builder + test playback)
│   ├── chat.html                        # End-user portal
│   └── lab.html                         # Demo Lab UI
├── alembic/                             # Alembic migrations
├── scripts/                             # Maintenance/migration scripts
├── docs/                                # Canonical documentation + process-builder KB files
├── data/                                # JSON backup + demo data (NOT primary storage)
└── uploads/                             # Uploads storage (gitkept)
```

## Target Structure

```
agentforge/
│
├── 📁 packages/                      # Monorepo structure
│   │
│   ├── 📁 frontend/                  # React/Vue Application
│   │   ├── src/
│   │   │   ├── components/           # Reusable components
│   │   │   │   ├── common/           # Buttons, Inputs, Modals
│   │   │   │   ├── agents/           # Agent-specific components
│   │   │   │   ├── tools/            # Tool components
│   │   │   │   └── security/         # Auth components
│   │   │   ├── pages/                # Page components
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── AgentHub.tsx
│   │   │   │   ├── AgentStudio.tsx
│   │   │   │   ├── Tools.tsx
│   │   │   │   ├── KnowledgeBase.tsx
│   │   │   │   ├── DemoLab.tsx
│   │   │   │   ├── Settings.tsx
│   │   │   │   └── SecurityCenter.tsx
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── services/             # API service layer
│   │   │   ├── store/                # State management (Redux/Zustand)
│   │   │   ├── types/                # TypeScript types
│   │   │   └── utils/                # Utilities
│   │   ├── public/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   ├── 📁 api-gateway/               # API Gateway Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── routes.py
│   │   │   ├── middleware/
│   │   │   │   ├── auth.py
│   │   │   │   ├── rate_limit.py
│   │   │   │   └── logging.py
│   │   │   └── config.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📁 auth-service/              # Authentication Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── roles.py
│   │   │   │   └── oauth.py
│   │   │   ├── services/
│   │   │   │   ├── auth_service.py
│   │   │   │   ├── token_service.py
│   │   │   │   ├── mfa_service.py
│   │   │   │   └── email_service.py
│   │   │   ├── models/
│   │   │   │   ├── user.py
│   │   │   │   ├── role.py
│   │   │   │   └── session.py
│   │   │   └── db/
│   │   │       ├── database.py
│   │   │       └── migrations/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📁 agent-service/             # Agent Management Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   ├── agents.py
│   │   │   │   ├── chat.py
│   │   │   │   └── conversations.py
│   │   │   ├── services/
│   │   │   │   ├── agent_service.py
│   │   │   │   ├── chat_service.py
│   │   │   │   └── generator_service.py
│   │   │   ├── engine/
│   │   │   │   ├── agent_engine.py
│   │   │   │   └── tool_executor.py
│   │   │   ├── models/
│   │   │   └── db/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📁 llm-service/               # LLM Provider Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   ├── completions.py
│   │   │   │   └── models.py
│   │   │   ├── providers/
│   │   │   │   ├── base.py
│   │   │   │   ├── openai.py
│   │   │   │   ├── anthropic.py
│   │   │   │   ├── ollama.py
│   │   │   │   ├── google.py
│   │   │   │   └── bedrock.py
│   │   │   ├── router/
│   │   │   │   └── model_router.py
│   │   │   └── models/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📁 rag-service/               # Knowledge Base Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   ├── documents.py
│   │   │   │   ├── search.py
│   │   │   │   └── scraping.py
│   │   │   ├── services/
│   │   │   │   ├── document_service.py
│   │   │   │   ├── embedding_service.py
│   │   │   │   └── search_service.py
│   │   │   ├── vectorstores/
│   │   │   │   ├── base.py
│   │   │   │   ├── chromadb.py
│   │   │   │   ├── pinecone.py
│   │   │   │   └── qdrant.py
│   │   │   └── processors/
│   │   │       ├── pdf.py
│   │   │       ├── docx.py
│   │   │       └── web.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── 📁 tools-service/             # Tools Management Service
│   │   ├── src/
│   │   │   ├── main.py
│   │   │   ├── api/
│   │   │   │   └── tools.py
│   │   │   ├── builtin/
│   │   │   │   ├── api_tool.py
│   │   │   │   ├── database_tool.py
│   │   │   │   └── email_tool.py
│   │   │   └── registry/
│   │   │       └── tool_registry.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── 📁 shared/                    # Shared Libraries
│       ├── models/                   # Shared Pydantic models
│       ├── utils/                    # Shared utilities
│       ├── exceptions/               # Custom exceptions
│       └── constants/                # Shared constants
│
├── 📁 infrastructure/                # Infrastructure as Code
│   ├── docker/
│   │   ├── docker-compose.yml        # Local development
│   │   ├── docker-compose.prod.yml   # Production
│   │   └── Dockerfile.base           # Base image
│   ├── kubernetes/
│   │   ├── base/                     # Base K8s manifests
│   │   ├── overlays/
│   │   │   ├── development/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── helm/                     # Helm charts
│   │       └── agentforge/
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── aws/
│   │   │   ├── azure/
│   │   │   ├── gcp/
│   │   │   └── oracle/
│   │   └── environments/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   └── ansible/                      # Configuration management
│       ├── playbooks/
│       └── roles/
│
├── 📁 scripts/                       # Utility Scripts
│   ├── setup.sh                      # Initial setup
│   ├── install.sh                    # Installation wizard
│   ├── migrate.sh                    # Database migrations
│   └── deploy.sh                     # Deployment helper
│
├── 📁 tools/                         # Development Tools
│   ├── cli/                          # AgentForge CLI
│   │   ├── agentforge/
│   │   │   ├── __main__.py
│   │   │   ├── commands/
│   │   │   │   ├── init.py
│   │   │   │   ├── deploy.py
│   │   │   │   ├── migrate.py
│   │   │   │   └── config.py
│   │   │   └── utils/
│   │   ├── setup.py
│   │   └── README.md
│   └── generators/                   # Code generators
│
├── 📁 docs/                          # Documentation
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   ├── development/
│   └── user-guide/
│
├── 📁 tests/                         # Integration Tests
│   ├── e2e/
│   ├── integration/
│   └── load/
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── cd.yml
│       └── release.yml
│
├── .env.example
├── README.md
└── Makefile
```

---

# ✨ Features - Complete List

## Feature Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and working |
| 🔶 | Partially implemented or UI only |
| 🔴 | Not implemented |

## Features Matrix

### Agent System
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Agent CRUD | ✅ | - | - |
| AI-Powered Config Generation | ✅ | - | - |
| Agent Wizard | ✅ | - | - |
| Agent Chat with Tools | ✅ | - | - |
| Agent Memory | ✅ | - | - |
| Streaming Responses | 🔴 | High | Medium |
| Agent Versioning | 🔴 | Medium | Low |
| Agent Templates Library | 🔶 | Medium | Low |
| Agent Analytics | 🔴 | High | Medium |
| Agent Scheduling | 🔴 | Medium | Medium |

### LLM Providers
| Provider | Status | Priority | Effort |
|----------|--------|----------|--------|
| OpenAI | ✅ | - | - |
| Anthropic | ✅ | - | - |
| Ollama | ✅ | - | - |
| Google Gemini | ✅ | - | - |
| Azure OpenAI | ✅ | - | - |
| Groq (OpenAI-compatible) | ✅ | - | - |
| Mistral (OpenAI-compatible) | ✅ | - | - |
| Perplexity (OpenAI-compatible) | ✅ | - | - |
| Cohere | ✅ | - | - |
| AWS Bedrock | 🔴 | High | Medium |

### Tools
| Tool | Status | Priority | Effort |
|------|--------|----------|--------|
| API Tool | ✅ | - | - |
| Database Tool | 🔶 | High | Medium |
| RAG Tool | ✅ | - | - |
| Email Tool | ✅ | - | - |
| Website Scraping | ✅ | - | - |
| Web Search | 🔶 | High | Medium |
| Slack | ✅ | - | - |
| Webhook | ✅ | - | - |
| Spreadsheet | 🔶 | Medium | Medium |
| Calendar | 🔶 | Low | Medium |
| CRM Integration | 🔶 | Low | High |

### Process Agents / Workflow Builder
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Prompt → Visual workflow generation | ✅ | - | - |
| Business-friendly trigger forms (labels + camelCase keys) | ✅ | - | - |
| Derived fields (auto-calculate) | ✅ | - | - |
| Profile prefill (current user) | ✅ | - | - |
| Cinematic build animation | ✅ | - | - |
| Test run + playback + business report | ✅ | - | - |
| Auto-layout for AI drafts | ✅ | - | - |
| Schedule/Webhook start modes (configuration) | 🔶 | High | Medium |
| Schedule/Webhook automation end-to-end | 🔴 | High | High |
| File upload persistence (store actual files) | 🔴 | High | Medium |
| Output document download links (process outputs) | 🔴 | Medium | Medium |

### Security
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| JWT Auth | ✅ | - | - |
| RBAC (32 permissions) | ✅ | - | - |
| MFA (TOTP) | ✅ | - | - |
| MFA (Email) | ✅ | - | - |
| User Profile Page | ✅ | - | - |
| Change Password | ✅ | - | - |
| Google OAuth | ✅ | - | - |
| Microsoft OAuth | 🔶 | High | Low |
| SAML SSO | 🔴 | High | High |
| API Rate Limiting | 🔴 | Critical | Low |

### Infrastructure
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Docker Deployment | ✅ | - | - |
| PostgreSQL Database | ✅ | - | - |
| Database Migration | ✅ (DB-first) | - | - |
| Dual-Write Strategy (DB + JSON backup) | ✅ | - | - |
| Kubernetes Ready | 🔴 | Critical | High |
| Multi-Cloud Support | 🔴 | Critical | High |
| Multi-Tenancy | 🔶 | Critical | High |
| CI/CD Pipeline | 🔴 | Critical | Medium |

---

# 🔌 LLM Providers

## Provider Configuration

AgentForge currently has **two LLM integration layers**:

1) **Monolith API LLM layer** (used by the main chat runtime)
- Location: `api/main.py`
- Key models:

```python
# api/main.py (simplified)
class LLMProvider(str, Enum): ...

class LLMConfig(BaseModel):
    provider: LLMProvider
    model: str
    api_key: str = ""
    base_url: str = ""
    temperature: float = 0.7
    max_tokens: int = 4096

class LLMProviderConfig(BaseModel):
    provider: str              # e.g. "openai", "anthropic", "google", "groq", "mistral"
    name: str
    api_key: str = ""
    base_url: str = ""
    is_active: bool = True
```

2) **Core LLM abstraction** (used by internal engines such as the Process Wizard)
- Location: `core/llm/`
- Key interface: `core/llm/base.py::BaseLLM.chat()` with `Message` / `MessageRole`

## Adding New Provider

### A) Add provider to the monolith runtime (current path)
1. **Implement provider** in `api/main.py` (either a new provider class or via `OpenAICompatibleLLM`).
2. **Expose provider in UI** (`ui/index.html` provider selector + settings).
3. **Store credentials** in system/org settings (`llm_providers` list / provider-specific config).

### B) Add provider to the core LLM layer (for engines/modules)
1. Add provider implementation in `core/llm/providers/`.
2. Register it in `core/llm/factory.py`.
3. Ensure `core/llm/registry.py` can list it as an active model/provider.

---

# 🛠️ Tools System

## Two Tool Runtimes (Important)

AgentForge currently has **two tool execution paths**:

1) **Chat runtime (monolith)**  
- Location: `api/main.py` (`build_tool_definitions()`, `execute_tool()`)  
- Tool configs live in `app_state.tools` (with DB-backed loading in some flows).  

2) **Process runtime (workflow engine)**  
- Location: `core/tools/` + `core/process/nodes/task.py::ToolCallNodeExecutor`  
- Uses `core/tools/base.py::ToolRegistry` and builtin tool implementations under `core/tools/builtin/`.

This split is intentional to document because “Tool is configured” does **not automatically** mean it is executable in both runtimes.

## Tool Interface

```python
class BaseTool(ABC):
    @abstractmethod
    def get_definition(self) -> ToolDefinition:
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        pass
```

## Tool Types (Implementation Status)

| Tool Type | Chat Runtime (`api/main.py`) | Process Runtime (`core/tools`) | Notes |
|-----------|-----------------------------|------------------------------|------|
| `api` | ✅ | ✅ | REST API calls |
| `webhook` | ✅ | ✅ | HTTP callbacks |
| `database` | 🔶 | ✅ | Chat runtime has a placeholder executor; process runtime has a real `DatabaseTool` (drivers required) |
| `knowledge` / `document` | ✅ | 🔶 | Chat runtime has ingestion + chunking + search; core has `RAGTool` but it is not wired into the chat path |
| `website` | ✅ | 🔴 | Implemented in monolith via scraper + chunking; no core tool wrapper |
| `email` | 🔶 | 🔴 | Implemented in monolith; no core tool wrapper |
| `slack` | ✅ | 🔴 | Implemented in monolith via webhook; no core tool wrapper |
| `websearch` | 🔶 | 🔴 | Placeholder in monolith; requires real web search provider integration |

## Coming Soon Tools (12 Types - UI Only)

| Tool Type | Purpose | Status |
|-----------|---------|--------|
| `spreadsheet` | Excel/Google Sheets | UI Only |
| `storage` | Cloud storage | UI Only |
| `calendar` | Calendar integration | UI Only |
| `crm` | CRM systems | UI Only |
| `erp` | ERP systems | UI Only |
| `imagegen` | AI image generation | UI Only |
| `stt` | Speech to text | UI Only |
| `tts` | Text to speech | UI Only |
| `translate` | Translation | UI Only |
| `ocr` | OCR processing | UI Only |
| `code` | Code execution | UI Only |
| `hitl` | Human in the loop | UI Only |

## Auto Re-processing on Config Change

When editing a tool via the Edit Panel, the backend automatically re-processes data:

| Tool Type | Trigger | Action |
|-----------|---------|--------|
| `website` | URL changed | Auto re-scrape all pages |
| `document/knowledge` | chunk_size or overlap changed | Auto re-index all documents |
| Others | Config changed | Update confirmation |

---

# 📚 Knowledge Base / RAG

## RAG Pipeline

```
Document → Extract → Chunk → Embed → Store → Search → Retrieve
```

## Current Implementation (What is Real)

### Chat RAG (Monolith Path)
- Location: `api/main.py`
- Ingestion:
  - Upload documents via `POST /api/tools/{tool_id}/documents`
  - Extract text (PDF/DOCX/XLSX/PPTX/TXT/CSV) → chunk → store chunks in `app_state.document_chunks`
- Retrieval:
  - Keyword search fallback (`search_documents_keyword`) is always available
  - Optional vector search is used when a vector DB/embedding provider is configured via `ProviderFactory`
- Website scraping:
  - Websites can be scraped and chunked; chunks are stored alongside document chunks (type: `website`)

### Database Models (Schema Exists)
- Location: `database/models/knowledge_base.py`
- Entities: `KnowledgeBase`, `Document`, `DocumentChunk`, `KBQuery`
- Status: **schema and services exist**, but the monolith RAG path primarily uses in-memory `app_state` and JSON backups; DB-first integration for KB ingestion/search is a **known gap** (see Gap Analysis).

### Core RAG Tool (Process/Engine Path)
- Location: `core/tools/builtin/rag.py`
- Provides a vector-store based `RAGTool` implementation.
- Status: implemented as a core tool, but it is **not the same execution path** as the monolith chat RAG.

---

# 🔒 Security Module

## Overview

The Security Module provides enterprise-grade authentication, authorization, and access control with **full database integration**. All security data is persisted in PostgreSQL with JSON files as backup only.

## Architecture

**Database-First Security Architecture:**

```
API Endpoints (api/security.py)
    ↓
SecurityState (core/security/state.py)
    ↓
Database Services (database/services/)
    ↓
PostgreSQL Database (Primary)
    ↓
JSON Files (Backup Only)
```

**Key Components:**

1. **SecurityState** (`core/security/state.py`)
   - In-memory cache of security data
   - Loads from database first, falls back to JSON
   - Saves to database first, then JSON as backup
   - Provides helper methods for permission checks

2. **Database Services** (`database/services/`)
   - `UserService`: User CRUD operations
   - `RoleService`: Role CRUD operations
   - `OrganizationService`: Organization CRUD operations
   - `SecuritySettingsService`: Security settings management
   - `InvitationService`: Invitation management
   - `AuditService`: Audit log management

3. **API Endpoints** (`api/security.py`)
   - All endpoints use database services directly
   - Comprehensive logging for all operations
   - Error handling with fallback to JSON

## Database Integration

**How Security Data is Loaded:**

1. **Application Startup:**
   - `SecurityState.__init__()` calls `load_from_disk()`
   - `load_from_disk()` attempts to load from database first
   - If database unavailable, falls back to JSON files
   - Logs all operations with `📊 [DATABASE]` prefix

2. **Data Loading Priority:**
   ```
   Database (Primary)
       ↓ (if fails)
   JSON Files (Fallback)
       ↓ (if fails)
   Default Values
   ```

3. **Data Saving Priority:**
   ```
   Database (Primary)
       ↓ (always)
   JSON Files (Backup)
   ```

**Example: User Loading**

```python
# In SecurityState.load_from_disk()
try:
    from database.services import UserService
    db_users = UserService.get_all_users()
    if db_users:
        for user in db_users:
            self.users[user.id] = user
        print(f"✅ [DATABASE] Loaded {len(db_users)} users from database")
        db_users_loaded = True
except Exception as db_error:
    print(f"❌ [DATABASE ERROR] Failed to load users: {e}")
    # Fallback to JSON files
    # ... load from users.json
```

**Example: User Saving**

```python
# In SecurityState.save_to_disk()
try:
    from database.services import UserService
    for user in self.users.values():
        UserService.save_user(user)
    print("💾 Security state saved to database")
except Exception as db_error:
    print(f"❌ Database save failed: {e}")
    # Still save to JSON as backup
    # ... save to users.json
```

## Authentication Flow

**1. Regular Login (Email/Password):**

```
User submits credentials
    ↓
POST /api/security/auth/login
    ↓
SecurityState.get_user_by_email() → Database first
    ↓
PasswordService.verify_password()
    ↓
Check MFA requirement
    ↓
If MFA required:
    - Send MFA code (Email)
    - Return requires_mfa=True
    - Frontend shows MFA modal
    ↓
User submits MFA code
    ↓
POST /api/security/auth/login (with mfa_code)
    ↓
MFAService.verify_code()
    ↓
Create session → Database
    ↓
Return access_token
```

**2. OAuth Login (Google/Microsoft):**

```
User clicks "Sign in with Google"
    ↓
GET /api/security/oauth/google/login
    ↓
OAuthService.get_authorization_url()
    ↓
Redirect to Google OAuth
    ↓
Google redirects to /api/security/oauth/google/callback
    ↓
OAuthService.exchange_code()
    ↓
Find or create user → Database
    ↓
Check MFA requirement
    ↓
If MFA required:
    - Send MFA code (Email)
    - Create temporary session → Database
    - Redirect to /ui/#mfa-verify?session_id=...
    - Frontend detects hash and shows MFA modal
    ↓
User submits MFA code
    ↓
POST /api/security/oauth/mfa/verify
    ↓
MFAService.verify_code()
    ↓
Create active session → Database
    ↓
Return access_token
```

**3. MFA Verification:**

- **TOTP:** User enters 6-digit code from authenticator app
- **Email:** User enters 6-digit code sent to email
- **Code Expiry:** 10 minutes
- **Code Storage:** Encrypted in database (`mfa_secret_encrypted` for TOTP, `email_code` in UserMFA for Email)

## Authorization (RBAC)

**Permission System:**

- **32 Permissions** across 8 resource types
- **4 Default Roles:** Super Admin (32), Admin (28), Presales (30), User (1)
- **Role Hierarchy:** Level-based (0 = Super Admin, 1 = Admin, 100 = User)
- **Permission Storage:** JSON array in `roles.permissions` column

**Permission Check Flow:**

```
API Endpoint requires permission
    ↓
get_current_user() → Load from database
    ↓
security_state.check_permission(user, permission)
    ↓
PolicyEngine._get_user_permissions(user)
    ↓
Get user's roles from database
    ↓
Aggregate permissions from all roles
    ↓
Check if permission in aggregated list
    ↓
Return True/False
```

**Role Management:**

- **Create Role:** `POST /api/security/roles` → `RoleService.save_role()` → Database
- **Update Role:** `PUT /api/security/roles/{role_id}` → `RoleService.save_role()` → Database
- **Delete Role:** `DELETE /api/security/roles/{role_id}` → `RoleService.delete_role()` → Database
- **List Roles:** `GET /api/security/roles` → `RoleService.get_all_roles()` → Database

**Role Hierarchy Enforcement:**

- Users cannot modify roles with equal or higher privilege
- Super Admin (level 0) can modify any role
- Admin (level 1) can modify roles with level > 1
- Implemented in `update_role` endpoint with integer level comparison

## User Management

**User CRUD Operations:**

- **Create User:** `POST /api/security/users` → `UserService.create_user()` → Database
- **Update User:** `PUT /api/security/users/{user_id}` → `UserService.update_user()` → Database
- **Delete User:** `DELETE /api/security/users/{user_id}` → `UserService.delete_user()` → Database
- **List Users:** `GET /api/security/users` → `UserService.get_all_users()` → Database
- **Get User:** `GET /api/security/users/{user_id}` → `UserService.get_user_by_id()` → Database

**User Profile Updates:**

- **Profile Fields:** `first_name`, `last_name`, `display_name`, `phone`, `job_title`, `timezone`, `language`
- **Update Flow:** `PUT /api/security/users/{user_id}` → Update `user.profile` → `UserService.save_user()` → Database
- **MFA Settings:** Updated in `user.mfa` object → `UserService.save_user()` → Database
- **Password Change:** `POST /api/security/auth/change-password` → Hash password → `UserService.update_user()` → Database

**Self-Registration (OAuth):**

- **Default Role:** "User" role with chat-only permissions
- **Role Assignment:** `RoleService.get_or_create_user_role(org_id)` → Database
- **User Creation:** `UserService.create_user()` → Database
- **Profile:** Populated from OAuth provider (Google/Microsoft)

## MFA (Multi-Factor Authentication)

**MFA Methods:**

1. **TOTP (Time-Based One-Time Password)**
   - Secret stored in `users.mfa_secret_encrypted`
   - QR code generated for setup
   - 6-digit code from authenticator app
   - Verified in `MFAService.verify_totp()`

2. **Email MFA**
   - Code stored in `UserMFA.email_code` (in-memory, not in DB)
   - 6-digit code sent via SendGrid/SMTP
   - Expires in 10 minutes
   - Verified in `MFAService.verify_email_code()`

**MFA Configuration:**

- **Enable MFA:** `POST /api/security/auth/mfa/enable` → Update `user.mfa.enabled` → `UserService.save_user()` → Database
- **Disable MFA:** `POST /api/security/auth/mfa/disable` → Update `user.mfa.enabled` → `UserService.save_user()` → Database
- **Toggle MFA:** `POST /api/security/mfa/user-toggle` → Update `user.mfa.enabled` → `UserService.save_user()` → Database
- **Setup TOTP:** `POST /api/security/auth/mfa/setup` → Generate secret → `UserService.save_user()` → Database
- **Verify TOTP:** `POST /api/security/auth/mfa/verify` → Verify code → Update `user.mfa.totp_verified` → `UserService.save_user()` → Database

**MFA Persistence:**

- All MFA settings immediately saved to database
- `mfa_enabled`, `mfa_method`, `mfa_secret_encrypted` stored in `users` table
- User refreshed from database on each login to ensure latest MFA settings

## OAuth Integration

**Supported Providers:**

- **Google OAuth:** Fully implemented with MFA support
- **Microsoft OAuth:** Partially implemented (credentials stored, flow not complete)

**OAuth Configuration:**

- **Storage:** OAuth credentials stored in `organizations` table
  - `google_client_id`, `google_client_secret`
  - `microsoft_client_id`, `microsoft_client_secret`, `microsoft_tenant_id`
- **Configuration:** `POST /api/security/oauth/configure` → `OrganizationService.save_organization()` → Database
- **Environment Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (auto-configured on deployment)

**OAuth Flow with MFA:**

1. User clicks "Sign in with Google"
2. Backend redirects to Google OAuth
3. Google redirects back with authorization code
4. Backend exchanges code for user info
5. Backend finds or creates user → Database
6. If MFA required:
   - Send MFA code to email
   - Create temporary session → Database
   - Redirect to `/ui/#mfa-verify?session_id=...&email=...&provider=google`
7. Frontend detects `#mfa-verify` hash and shows MFA modal
8. User enters MFA code
9. Backend verifies code via `POST /api/security/oauth/mfa/verify`
10. Backend creates active session → Database
11. Backend returns access_token

**OAuth Endpoints:**

- `GET /api/security/oauth/{provider}/login`: Initiate OAuth flow
- `GET /api/security/oauth/{provider}/callback`: Handle OAuth callback
- `POST /api/security/oauth/mfa/verify`: Verify MFA code for OAuth login
- `POST /api/security/oauth/mfa/resend`: Resend MFA code for OAuth login
- `POST /api/security/oauth/configure`: Configure OAuth credentials

## Audit Logging

**Audit Log Storage:**

- **Primary:** `audit_logs` table in PostgreSQL
- **Backup:** `audit_logs.json` file
- **Service:** `AuditService.create_audit_log()` → Database

**Audit Log Fields:**

- `id`: UUID primary key
- `org_id`: Organization identifier
- `user_id`: User identifier
- `action`: Action type (LOGIN, USER_CREATE, ROLE_UPDATE, etc.)
- `resource_type`: Resource type (USER, ROLE, AGENT, etc.)
- `resource_id`: Resource identifier
- `resource_name`: Resource name
- `details`: Additional details (JSON object)
- `ip_address`: Client IP address
- `user_agent`: Client user agent
- `created_at`: Timestamp (indexed for fast queries)

**Audit Log Creation:**

- Automatically created on:
  - User login/logout
  - User creation/update/deletion
  - Role creation/update/deletion
  - Permission changes
  - MFA enable/disable
  - OAuth login
  - Any security-sensitive operation

**Audit Log Retrieval:**

- `GET /api/security/audit-logs`: Get audit logs (filtered by org, user, action, etc.)
- `AuditService.get_audit_logs(org_id, limit=1000)`: Get audit logs from database

## Security Architecture

- JWT-based authentication
- RBAC with 2 default roles (Super Admin, Admin)
- MFA support (TOTP + Email)
- OAuth integration (Google, Microsoft)
- Audit logging
- Session management
- 32 granular permissions

## Permissions System (32 Total)

```python
# Location: core/security/permissions.py

ALL_PERMISSIONS = [
    # Agent Management (4)
    "agents:read", "agents:write", "agents:delete", "agents:execute",
    
    # Tool Management (4)
    "tools:read", "tools:write", "tools:delete", "tools:edit",
    
    # User Management (3)
    "users:read", "users:write", "users:delete",
    
    # Role Management (3)
    "roles:read", "roles:write", "roles:delete",
    
    # Security Management (5)
    "security:admin", "security:audit", "security:mfa_manage",
    "security:oauth_manage", "security:ldap_manage",
    
    # Knowledge Base (3)
    "kb:read", "kb:write", "kb:delete",
    
    # Settings (2)
    "settings:read", "settings:write",
    
    # Integrations (3)
    "integrations:read", "integrations:write", "integrations:delete",
    
    # Demo (2)
    "demo:access", "demo:manage",
    
    # Invitations (2)
    "invitations:read", "invitations:write",
    
    # Analytics (1)
    "analytics:read"
]
```

## Default Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **Super Admin** | 32 (all) | Full system access including security management |
| **Admin** | 25 | Administrative access without security management |

## MFA Implementation

- **TOTP:** Standard authenticator app support (Google Authenticator, Authy)
- **Email MFA:** 6-digit code sent via email (SendGrid/SMTP), expires in 10 minutes

## Security Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/auth/login` | POST | Login with email/password |
| `/api/security/auth/logout` | POST | Logout current session |
| `/api/security/auth/me` | GET | Get current user info |
| `/api/security/users/{user_id}` | PUT | Update user profile (self) |
| `/api/security/auth/change-password` | POST | Change own password |
| `/api/security/auth/mfa/setup` | POST | Setup MFA (TOTP) |
| `/api/security/auth/mfa/verify` | POST | Verify MFA code |
| `/api/security/auth/mfa/enable` | POST | Enable MFA |
| `/api/security/auth/mfa/disable` | POST | Disable MFA |
| `/api/security/auth/mfa/email/send` | POST | Send MFA code via email |
| `/api/security/auth/mfa/email/verify` | POST | Verify email MFA code |
| `/api/security/roles/reset-defaults` | POST | Reset to default roles (Super Admin only) |

## Known Security Gaps (Must Be Addressed)

The platform has strong RBAC/MFA/OAuth foundations, but **some non-security endpoints** currently bypass or weaken authorization and must be fixed for production hardening:

- **Unauthenticated agent memory endpoints** (critical):
  - `GET /api/agents/{agent_id}/memory`
  - `PUT /api/agents/{agent_id}/memory/toggle`
  - `DELETE /api/agents/{agent_id}/memory`
- **Agent details access control**:
  - `GET /api/agents/{agent_id}` currently authenticates the caller but does **not** enforce that the caller has access to the agent (owner/delegated/admin rules).
- **Unauthenticated access-control “check/preview” endpoints**:
  - `GET /api/access-control/check/{agent_id}` accepts `user_id`, `role_ids`, `group_ids` as query params without authentication.
  - `GET /api/access-control/preview/{agent_id}` is also unauthenticated.

Recommendation: require authentication and derive `user_id/roles/groups` from the session, then enforce agent ACL consistently.

## User Profile Page (UI)

### Access
- Click on user avatar/name in sidebar (no separate menu item)
- Enterprise-style UX pattern

### Features
1. **Profile Information**
   - View: Name, Email, Role, Created Date
   - Edit: First Name, Last Name, Email

2. **Change Password**
   - Current password verification
   - New password with confirmation
   - Password visibility toggle (professional SVG icons)
   - Validation: Min 8 characters, uppercase, lowercase, number, special char

3. **MFA Settings**
   - Toggle to enable/disable MFA
   - Choose MFA type: TOTP (Authenticator App) or Email
   - TOTP: QR code display for setup, verification step
   - Email: Send test code, verify
   - Current status display

### UI Components
```html
<!-- Profile Info Card -->
<div class="profile-info">
  <label>Name</label>
  <input type="text" id="profile-name" />
  <label>Email</label>
  <input type="email" id="profile-email" />
  <button onclick="saveProfile()">Save Changes</button>
</div>

<!-- Change Password -->
<div class="change-password">
  <div class="relative">
    <input type="password" id="current-password" />
    <button onclick="togglePasswordVisibility('current-password')">
      <!-- SVG eye icons -->
    </button>
  </div>
  <input type="password" id="new-password" />
  <input type="password" id="confirm-password" />
  <button onclick="changePassword()">Change Password</button>
</div>

<!-- MFA Settings -->
<div class="mfa-settings">
  <div class="toggle-container">
    <input type="checkbox" id="mfa-enabled" onchange="toggleMFA()" />
    <label>Enable MFA</label>
  </div>
  <select id="mfa-method">
    <option value="totp">Authenticator App (TOTP)</option>
    <option value="email">Email Code</option>
  </select>
  <div id="mfa-setup-container">
    <!-- Dynamic: QR code for TOTP or Email verification -->
  </div>
</div>
```

---

# 🧪 Demo Lab

The Demo Lab is a standalone module for generating realistic **test artifacts** (documents, mock APIs, document images) so teams can validate tools, OCR/RAG pipelines, and agent behavior.

## What is implemented (verified in code)

- **Document generator**: `POST /api/lab/generate/document`
  - Formats: `docx`, `pdf`, `xlsx`, `pptx` (falls back to `txt` if optional deps are missing)
  - Implementation: `api/modules/lab/service.py::LabService.generate_document()`
- **Document image generator (OCR testing)**: `POST /api/lab/generate/image`
  - Generates document-like images using PIL (not “art” image generation)
- **Mock API generator**: `POST /api/lab/generate/api`
  - Generates JSON datasets and serves them via a mock endpoint
- **Download/view**:
  - Download: `GET /api/lab/download/{item_id}`
  - View image inline: `GET /api/lab/image/{item_id}`
- **History (DB-backed)**:
  - Stored in `lab_history_items` table (created by Alembic migration)

## Operational notes
- Optional Python deps are required for rich formats:
  - Word: `python-docx`
  - PDF: `reportlab`
  - Excel: `openpyxl`
  - PowerPoint: `python-pptx`
- If deps are missing, the platform will still return a usable text file.

---

# 🔄 Process Builder & Workflow Engine

AgentForge supports **process agents** (workflows) that are generated from a natural-language prompt and edited in a visual builder.

## UX Flow (Prompt → Cinematic Build → Edit)

1. User enters a prompt in the Process Wizard (`ui/index.html`).
2. Platform immediately opens the visual builder: `ui/process-builder.html?draft=wait`.
3. The wizard calls `POST /process/wizard/generate` with `output_format=visual_builder`.
4. The generated workflow draft is sent to the builder via `window.postMessage` (fallback: sessionStorage polling).
5. Builder runs a **cinematic build animation** that places nodes and connects edges.

## Business-friendly inputs (Label ↔ Key mapping)

Trigger/start fields support:
- `label`: business-friendly display label (no snake_case)
- `name`: internal `lowerCamelCase` key used in templates (e.g., `employeeEmail`)

The UI exposes labels and friendly controls while keeping internal keys stable for execution and variable references.

## Derived fields (auto-calculation)

Trigger fields can be marked derived:
- `readOnly: true`
- `derived.expression`: evaluated client-side in the builder/test modal and used at runtime as a submitted value.

Supported derived functions (current UI implementation):
- `daysBetween(startDate, endDate)`
- `concat(a, " ", b)`
- `sum(a, b, ...)`
- `round(value, decimals)`
- `toNumber(value)`

## Profile context / prefill (logged-in user)

Workflows can avoid asking the user to retype profile data:
- UI supports `prefill: { source: "currentUser", key: "email|name" }` and marks the field read-only.
- Engine sets runtime variables at start:
  - `currentUser.id`, `currentUser.name`, `currentUser.email`, `currentUser.roles`, `currentUser.groups`, `currentUser.orgId`
  - Implementation: `core/process/nodes/flow.py::StartNodeExecutor`

## Documents (Upload + Generate)

### Upload (input)
- Start form supports `type: "file"` and renders a file picker.
- Current status: **UI collects metadata only** (name/size/type); storing file content for process executions is a known gap.

### Generate (output)
- Builder supports an **Action** step with `actionType: "generateDocument"`.
- Normalization maps this to engine node type `file_operation` with `operation=generate_document`.
- Engine writes a real document to disk under `data/process_outputs/{execution_id}/...` and supports:
  - `docx`, `pdf`, `xlsx`, `pptx` (fallback `txt`)
- Implementation: `core/process/nodes/integration.py::FileOperationNodeExecutor`

## Layout & routing rules

### Goals (business readability)
- Avoid overlaps
- Keep flow top-to-bottom
- Avoid connections passing through shapes

### Implementation
- Connections are rendered with routing logic that attempts to avoid crossing node rectangles.
- AI drafts get an **auto-layout pass** (layered layout + condition YES-left/NO-right preference) before the cinematic build animation.

## Testing (business-friendly)

The builder includes a “Test run” UX that:
- Generates a user-friendly input form from the Start step fields
- Simulates execution path and shows:
  - A step-by-step timeline (“What happened”)
  - Animated playback highlighting nodes/edges on the canvas
  - Approval steps show “pending” state and (when authenticated) can list potential approvers

## Generation grounding (anti-hallucination)

The Process Wizard grounds generation using a curated platform KB:
- Retrieval module: `core/process/platform_knowledge.py`
- KB sources (runtime files): `docs/PROCESS_BUILDER_KB_*.md`
- Dropdown guardrail: dropdowns are only accepted when options match safe taxonomies; otherwise they are downgraded to text fields.

Tool grounding:
- `ui/index.html` fetches configured tools from `GET /api/tools` and sends **sanitized** tool info (including input parameters) into wizard context.

## What is NOT fully implemented yet (must be explicit)

- **Schedule/Webhook automation end-to-end**: Start method can be configured as schedule/webhook in the builder UI, but platform-trigger execution infrastructure is not complete.
- **File upload persistence for process runs**: file fields do not upload/store the file contents yet.
- **Process output downloads**: generated documents exist on disk; a dedicated API/UI download link is not implemented yet.
- **Advanced engine nodes**: the engine contains executors for additional node types (switch/parallel/transform/etc.), but they are not exposed in the builder palette and require more UI+normalization work.

---

# 📊 Platform Assessment

## Current State Analysis

| Area | Score | Issues |
|------|-------|--------|
| Code Organization | 4/10 | Monolithic files |
| Scalability | 5/10 | DB-first, but several critical paths still rely on in-memory state (sessions/tools) |
| Deployment | 5/10 | Docker + Railway deployment exists; CI/CD and multi-cloud are not fully standardized |
| Testing | 2/10 | No automated tests |
| Documentation | 6/10 | Canonical doc exists; needs continuous updates and automated checks |

---

# 📋 Gap Analysis

## Implementation Status Summary

This is a **qualitative summary**. For the itemized, source-of-truth status, see the **Features Matrix** section above.

| Category | ✅ Implemented | 🔶 Partial / Split | 🔴 Missing | Notes |
|----------|-----------------|-------------------|-----------|------|
| Agents (chat) | ✅ | 🔶 | 🔶 | Core CRUD/wizard works; streaming/analytics are not complete |
| LLM Providers | ✅ | 🔶 | 🔶 | Implemented primarily in `api/main.py`; `core/llm/` supports a smaller subset |
| Tools | ✅ | 🔶 | 🔶 | Chat vs process tool runtimes differ; some tool types are placeholders in chat runtime |
| Knowledge/RAG | ✅ | 🔶 | 🔶 | Monolith RAG exists; DB-backed KB pipeline is not fully wired end-to-end |
| Process Builder | ✅ | 🔶 | 🔶 | Builder UX + generation grounded; triggers/files/outputs have gaps (see Process Builder section) |
| Security | ✅ | 🔶 | 🔶 | Strong RBAC/MFA/OAuth foundation; some endpoints may bypass authorization (must be fixed) |
| Infrastructure | ✅ | 🔶 | 🔶 | Docker + Railway; missing tests/CI, multi-cloud, queues/caching |

---

# 💻 Code Quality

## Current Issues

1. **`api/main.py` (~16K lines)** - Violates Single Responsibility; mixes API, tool runtime, RAG, LLM routing, storage
2. **`ui/index.html` (~32K lines)** - Unmaintainable; UI monolith makes safe iteration harder
3. **No TypeScript** - Type safety missing
4. **No Tests** - Zero coverage
5. **No Linting** - Inconsistent code style
6. **Split runtime stacks** - chat vs process engines have overlapping concepts (LLM/tools/RAG) implemented in different places

---

# 🔄 Code Modernization Strategy

## Overview

The modernization will follow a **Strangler Fig Pattern** - gradually replacing the monolithic code with modular services while maintaining full functionality throughout the migration.

## Migration Principles

1. **Zero Downtime** - System remains operational during migration
2. **Incremental** - Small, testable changes
3. **Reversible** - Ability to rollback any change
4. **Feature Parity** - No functionality loss
5. **Parallel Running** - Old and new code can coexist

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Setup Project Structure

```bash
# Create new directory structure alongside existing code
mkdir -p packages/{frontend,auth-service,agent-service,llm-service,rag-service,tools-service,shared}
mkdir -p infrastructure/{docker,kubernetes,terraform}
mkdir -p scripts tools/cli docs tests
```

### 1.2 Add Development Tools

```bash
# Add linting and formatting
# pyproject.toml
[tool.black]
line-length = 100

[tool.isort]
profile = "black"

[tool.mypy]
python_version = "3.11"
strict = true

# Add pre-commit hooks
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.0.0
    hooks:
      - id: black
  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.0.0
    hooks:
      - id: mypy
```

### 1.3 Add CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install black isort mypy
      - run: black --check .
      - run: isort --check .
      - run: mypy .

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install pytest pytest-asyncio pytest-cov
      - run: pytest --cov=./ --cov-report=xml

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
        with:
          push: false
          tags: agentforge:${{ github.sha }}
```

## Phase 2: Backend Modularization (Weeks 3-6)

### 2.1 Extract Shared Models

```python
# packages/shared/models/agent.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AgentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class AgentPersonality(BaseModel):
    tone: str = "professional"
    voice: str = "helpful"
    creativity: int = Field(5, ge=1, le=10)
    formality: int = Field(5, ge=1, le=10)
    empathy: int = Field(5, ge=1, le=10)
    length: int = Field(5, ge=1, le=10)

class AgentGuardrails(BaseModel):
    anti_hallucination: bool = True
    cite_sources: bool = True
    pii_protection: bool = True
    max_length: str = "medium"
    language: str = "auto"
    avoid_topics: List[str] = []
    focus_topics: List[str] = []

class AgentTask(BaseModel):
    id: str
    name: str
    description: str
    instructions: List[str] = []

class Agent(BaseModel):
    id: str
    name: str
    icon: str = "🤖"
    goal: str
    model_id: str
    personality: AgentPersonality = Field(default_factory=AgentPersonality)
    guardrails: AgentGuardrails = Field(default_factory=AgentGuardrails)
    tasks: List[AgentTask] = []
    tool_ids: List[str] = []
    memory_enabled: bool = True
    status: AgentStatus = AgentStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True
```

### 2.2 Create Service Interfaces

```python
# packages/shared/interfaces/agent_service.py
from abc import ABC, abstractmethod
from typing import List, Optional
from ..models.agent import Agent

class IAgentService(ABC):
    @abstractmethod
    async def create(self, agent: Agent) -> Agent:
        pass
    
    @abstractmethod
    async def get(self, agent_id: str) -> Optional[Agent]:
        pass
    
    @abstractmethod
    async def list(self, filters: dict = None) -> List[Agent]:
        pass
    
    @abstractmethod
    async def update(self, agent_id: str, updates: dict) -> Agent:
        pass
    
    @abstractmethod
    async def delete(self, agent_id: str) -> bool:
        pass
```

### 2.3 Extract Services from main.py (Step by Step)

**Step 1: Create Agent Service**

```python
# packages/agent-service/src/services/agent_service.py
from typing import List, Optional
from shared.interfaces.agent_service import IAgentService
from shared.models.agent import Agent
from .repository import AgentRepository

class AgentService(IAgentService):
    def __init__(self, repository: AgentRepository):
        self.repository = repository
    
    async def create(self, agent: Agent) -> Agent:
        # Validation
        if not agent.name:
            raise ValueError("Agent name is required")
        if not agent.goal:
            raise ValueError("Agent goal is required")
        
        # Generate ID if not provided
        if not agent.id:
            agent.id = f"agent_{uuid.uuid4().hex[:8]}"
        
        # Save
        return await self.repository.create(agent)
    
    async def get(self, agent_id: str) -> Optional[Agent]:
        return await self.repository.get(agent_id)
    
    # ... other methods
```

**Step 2: Create API Router**

```python
# packages/agent-service/src/api/agents.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from shared.models.agent import Agent
from ..services.agent_service import AgentService
from ..dependencies import get_agent_service

router = APIRouter(prefix="/api/agents", tags=["Agents"])

@router.get("", response_model=List[Agent])
async def list_agents(
    status: str = None,
    service: AgentService = Depends(get_agent_service)
):
    filters = {"status": status} if status else None
    return await service.list(filters)

@router.post("", response_model=Agent)
async def create_agent(
    agent: Agent,
    service: AgentService = Depends(get_agent_service)
):
    return await service.create(agent)

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: str,
    service: AgentService = Depends(get_agent_service)
):
    agent = await service.get(agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")
    return agent
```

**Step 3: Add Feature Flag for Gradual Migration**

```python
# packages/shared/config/feature_flags.py
import os

class FeatureFlags:
    USE_NEW_AGENT_SERVICE = os.getenv("FF_NEW_AGENT_SERVICE", "false").lower() == "true"
    USE_NEW_AUTH_SERVICE = os.getenv("FF_NEW_AUTH_SERVICE", "false").lower() == "true"
    USE_NEW_RAG_SERVICE = os.getenv("FF_NEW_RAG_SERVICE", "false").lower() == "true"
    USE_DATABASE = os.getenv("FF_USE_DATABASE", "false").lower() == "true"

# In main.py (existing)
from shared.config.feature_flags import FeatureFlags

if FeatureFlags.USE_NEW_AGENT_SERVICE:
    from packages.agent_service.src.api.agents import router as agents_router
    app.include_router(agents_router)
else:
    # Use existing inline code
    @app.get("/api/agents")
    async def list_agents():
        # ... existing code
```

### 2.4 Migration Order

```
Week 3: Extract Shared Models & Interfaces
Week 4: Extract Agent Service (with feature flag)
Week 5: Extract Auth Service (with feature flag)
Week 6: Extract LLM Service (with feature flag)
Week 7: Extract RAG Service (with feature flag)
Week 8: Extract Tools Service (with feature flag)
Week 9: Remove old code, enable all flags
Week 10: Testing & Stabilization
```

## Phase 3: Frontend Modernization (Weeks 7-12)

### 3.1 Setup React Project

```bash
# Create React app with Vite
cd packages/frontend
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install @tanstack/react-query axios react-router-dom zustand
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react
npm install -D @types/node vitest @testing-library/react
```

### 3.2 Project Structure

```
packages/frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── DataTable.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   ├── agents/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentForm.tsx
│   │   │   ├── AgentWizard.tsx
│   │   │   └── AgentChat.tsx
│   │   ├── tools/
│   │   ├── knowledge/
│   │   └── security/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── AgentHub.tsx
│   │   ├── AgentStudio.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAgents.ts
│   │   └── useApi.ts
│   ├── services/
│   │   ├── api.ts              # Axios instance
│   │   ├── auth.service.ts
│   │   ├── agent.service.ts
│   │   └── ...
│   ├── store/
│   │   ├── auth.store.ts       # Zustand store
│   │   ├── agent.store.ts
│   │   └── ui.store.ts
│   ├── types/
│   │   ├── agent.types.ts
│   │   ├── auth.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
```

### 3.3 Component Migration Strategy

**Step 1: Create API Service Layer**

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Step 2: Create Type Definitions**

```typescript
// src/types/agent.types.ts
export interface AgentPersonality {
  tone: string;
  voice: string;
  creativity: number;
  formality: number;
  empathy: number;
  length: number;
}

export interface AgentGuardrails {
  anti_hallucination: boolean;
  cite_sources: boolean;
  pii_protection: boolean;
  max_length: string;
  language: string;
  avoid_topics: string[];
  focus_topics: string[];
}

export interface AgentTask {
  id: string;
  name: string;
  description: string;
  instructions: string[];
}

export interface Agent {
  id: string;
  name: string;
  icon: string;
  goal: string;
  model_id: string;
  personality: AgentPersonality;
  guardrails: AgentGuardrails;
  tasks: AgentTask[];
  tool_ids: string[];
  memory_enabled: boolean;
  status: 'draft' | 'active' | 'paused' | 'archived';
  created_at: string;
  updated_at: string;
}
```

**Step 3: Create State Management**

```typescript
// src/store/agent.store.ts
import { create } from 'zustand';
import { Agent } from '../types/agent.types';
import { agentService } from '../services/agent.service';

interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAgents: () => Promise<void>;
  selectAgent: (id: string) => void;
  createAgent: (agent: Partial<Agent>) => Promise<Agent>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgent: null,
  loading: false,
  error: null,
  
  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const agents = await agentService.list();
      set({ agents, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  selectAgent: (id: string) => {
    const agent = get().agents.find(a => a.id === id);
    set({ selectedAgent: agent || null });
  },
  
  createAgent: async (agent: Partial<Agent>) => {
    set({ loading: true, error: null });
    try {
      const newAgent = await agentService.create(agent);
      set(state => ({ 
        agents: [...state.agents, newAgent],
        loading: false 
      }));
      return newAgent;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // ... other actions
}));
```

**Step 4: Create Reusable Components**

```tsx
// src/components/common/Button.tsx
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white focus:ring-gray-500',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 focus:ring-gray-500',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4\" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
```

**Step 5: Migrate Pages Incrementally**

```tsx
// src/pages/AgentHub.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '../store/agent.store';
import { Button } from '../components/common/Button';
import { AgentCard } from '../components/agents/AgentCard';
import { Loading } from '../components/common/Loading';
import { PlusIcon } from '@heroicons/react/24/outline';

export const AgentHub: React.FC = () => {
  const navigate = useNavigate();
  const { agents, loading, error, fetchAgents } = useAgentStore();
  
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  
  if (loading) return <Loading />;
  if (error) return <div className="text-red-500">{error}</div>;
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Agent Hub</h1>
        <Button
          onClick={() => navigate('/agents/new')}
          icon={<PlusIcon className="h-5 w-5" />}
        >
          Create Agent
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onClick={() => navigate(`/agents/${agent.id}`)}
          />
        ))}
      </div>
      
      {agents.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No agents yet. Create your first agent!
        </div>
      )}
    </div>
  );
};
```

### 3.4 Migration Timeline

```
Week 7-8: Setup React project, API services, types
Week 9: Migrate Login & Auth components
Week 10: Migrate Agent Hub & Agent Card
Week 11: Migrate Agent Studio wizard
Week 12: Migrate remaining pages
Week 13: Testing & bug fixes
Week 14: Remove old index.html
```

---

# 🗄️ Database Migration Plan

## Overview

Migrate from JSON file storage to PostgreSQL with zero downtime using a dual-write strategy.

## Migration Strategy

```
Phase 1: Setup          → Add PostgreSQL alongside JSON ✅ COMPLETED
Phase 2: Data Migration → Migrate existing data from JSON ✅ COMPLETED
Phase 3: Database-First → Read from DB, write to DB (JSON backup) ✅ COMPLETED
Phase 4: Cutover        → PostgreSQL only (optional - JSON can remain as backup)
Phase 5: Cleanup        → Remove JSON code (optional - can keep as backup)
```

**Current Status:** **Phase 3 Complete** - Platform operates database-first with JSON as backup only.

## Phase 1: Database Setup

### 1.1 Docker Compose Update

```yaml
# infrastructure/docker/docker-compose.yml
version: '3.8'

services:
  agentforge:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://agentforge:password@postgres:5432/agentforge
      - REDIS_URL=redis://redis:6379
      - FF_USE_DATABASE=true
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: agentforge
      POSTGRES_PASSWORD: password
      POSTGRES_DB: agentforge
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 1.2 Database Schema

```python
# packages/shared/db/models.py
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class AgentStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String(50), primary_key=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    icon = Column(String(10), default="🤖")
    goal = Column(Text, nullable=False)
    model_id = Column(String(100), nullable=False)
    personality = Column(JSON, default={})
    guardrails = Column(JSON, default={})
    tasks = Column(JSON, default=[])
    tool_ids = Column(JSON, default=[])
    memory = Column(JSON, default=[])
    memory_enabled = Column(Boolean, default=True)
    status = Column(Enum(AgentStatus), default=AgentStatus.DRAFT)
    created_by = Column(String(50), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="agents")
    creator = relationship("User", back_populates="agents")
    conversations = relationship("Conversation", back_populates="agent")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    role_ids = Column(JSON, default=[])
    status = Column(String(20), default="active")
    email_verified = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    agents = relationship("Agent", back_populates="creator")
    sessions = relationship("Session", back_populates="user")

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    domain = Column(String(255), unique=True)
    plan = Column(String(50), default="free")
    settings = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="tenant")
    agents = relationship("Agent", back_populates="tenant")

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(String(50), primary_key=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    permissions = Column(JSON, default=[])
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(50), primary_key=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id"), index=True)
    user_id = Column(String(50), index=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(50))
    details = Column(JSON)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
```

### 1.3 Alembic Migrations

```python
# packages/shared/db/migrations/versions/001_initial.py
"""Initial migration

Revision ID: 001
Create Date: 2026-01-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '001'
down_revision = None

def upgrade():
    # Tenants table
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('domain', sa.String(255), unique=True),
        sa.Column('plan', sa.String(50), default='free'),
        sa.Column('settings', JSON, default={}),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
    )
    
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255)),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('role_ids', JSON, default=[]),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('email_verified', sa.Boolean(), default=False),
        sa.Column('mfa_enabled', sa.Boolean(), default=False),
        sa.Column('mfa_secret', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('last_login', sa.DateTime()),
    )
    op.create_index('ix_users_tenant_id', 'users', ['tenant_id'])
    
    # Agents table
    op.create_table(
        'agents',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('icon', sa.String(10), default='🤖'),
        sa.Column('goal', sa.Text(), nullable=False),
        sa.Column('model_id', sa.String(100), nullable=False),
        sa.Column('personality', JSON, default={}),
        sa.Column('guardrails', JSON, default={}),
        sa.Column('tasks', JSON, default=[]),
        sa.Column('tool_ids', JSON, default=[]),
        sa.Column('memory', JSON, default=[]),
        sa.Column('memory_enabled', sa.Boolean(), default=True),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('created_by', sa.String(50), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now()),
    )
    op.create_index('ix_agents_tenant_id', 'agents', ['tenant_id'])
    
    # ... other tables

def downgrade():
    op.drop_table('agents')
    op.drop_table('users')
    op.drop_table('tenants')
```

### 1.4 Repository Pattern with Dual Storage

```python
# packages/shared/db/repository.py
from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic
from sqlalchemy.orm import Session
from .feature_flags import FeatureFlags

T = TypeVar('T')

class BaseRepository(ABC, Generic[T]):
    @abstractmethod
    async def create(self, entity: T) -> T:
        pass
    
    @abstractmethod
    async def get(self, id: str) -> Optional[T]:
        pass
    
    @abstractmethod
    async def list(self, filters: dict = None) -> List[T]:
        pass
    
    @abstractmethod
    async def update(self, id: str, updates: dict) -> T:
        pass
    
    @abstractmethod
    async def delete(self, id: str) -> bool:
        pass


class DualWriteRepository(BaseRepository[T]):
    """Repository that writes to both JSON and PostgreSQL during migration"""
    
    def __init__(
        self,
        json_repo: BaseRepository[T],
        db_repo: BaseRepository[T],
        read_from_db: bool = False
    ):
        self.json_repo = json_repo
        self.db_repo = db_repo
        self.read_from_db = read_from_db
    
    async def create(self, entity: T) -> T:
        # Always write to both
        await self.json_repo.create(entity)
        result = await self.db_repo.create(entity)
        return result
    
    async def get(self, id: str) -> Optional[T]:
        if self.read_from_db:
            return await self.db_repo.get(id)
        return await self.json_repo.get(id)
    
    async def list(self, filters: dict = None) -> List[T]:
        if self.read_from_db:
            return await self.db_repo.list(filters)
        return await self.json_repo.list(filters)
    
    async def update(self, id: str, updates: dict) -> T:
        await self.json_repo.update(id, updates)
        return await self.db_repo.update(id, updates)
    
    async def delete(self, id: str) -> bool:
        await self.json_repo.delete(id)
        return await self.db_repo.delete(id)


# Usage in service
class AgentService:
    def __init__(self):
        if FeatureFlags.USE_DATABASE:
            if FeatureFlags.READ_FROM_DATABASE:
                # Phase 3: Read from DB, write to both
                self.repository = DualWriteRepository(
                    json_repo=JSONAgentRepository(),
                    db_repo=PostgreSQLAgentRepository(),
                    read_from_db=True
                )
            else:
                # Phase 2: Read from JSON, write to both
                self.repository = DualWriteRepository(
                    json_repo=JSONAgentRepository(),
                    db_repo=PostgreSQLAgentRepository(),
                    read_from_db=False
                )
        else:
            # Phase 1: JSON only
            self.repository = JSONAgentRepository()
```

### 1.5 Data Migration Script

```python
# scripts/migrate_data.py
"""
Script to migrate data from JSON files to PostgreSQL
"""

import asyncio
import json
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from packages.shared.db.models import Base, Tenant, User, Agent, Role

async def migrate_users(session: AsyncSession, data_path: Path, tenant_id: str):
    """Migrate users from JSON to PostgreSQL"""
    users_file = data_path / "security" / "users.json"
    
    if not users_file.exists():
        print("No users.json found, skipping...")
        return
    
    with open(users_file) as f:
        users_data = json.load(f)
    
    for user_id, user_dict in users_data.items():
        user = User(
            id=user_id,
            tenant_id=tenant_id,
            email=user_dict.get("email"),
            password_hash=user_dict.get("password_hash"),
            first_name=user_dict.get("profile", {}).get("first_name"),
            last_name=user_dict.get("profile", {}).get("last_name"),
            role_ids=user_dict.get("role_ids", []),
            status=user_dict.get("status", "active"),
            email_verified=user_dict.get("email_verified", False),
            mfa_enabled=user_dict.get("mfa", {}).get("enabled", False),
        )
        session.add(user)
    
    await session.commit()
    print(f"Migrated {len(users_data)} users")

async def migrate_agents(session: AsyncSession, data_path: Path, tenant_id: str):
    """Migrate agents from JSON to PostgreSQL"""
    agents_file = data_path / "agents.json"
    
    if not agents_file.exists():
        print("No agents.json found, skipping...")
        return
    
    with open(agents_file) as f:
        agents_data = json.load(f)
    
    for agent_dict in agents_data:
        agent = Agent(
            id=agent_dict.get("id"),
            tenant_id=tenant_id,
            name=agent_dict.get("name"),
            icon=agent_dict.get("icon", "🤖"),
            goal=agent_dict.get("goal", ""),
            model_id=agent_dict.get("model_id", ""),
            personality=agent_dict.get("personality", {}),
            guardrails=agent_dict.get("guardrails", {}),
            tasks=agent_dict.get("tasks", []),
            tool_ids=agent_dict.get("tool_ids", []),
            memory=agent_dict.get("memory", []),
            memory_enabled=agent_dict.get("memory_enabled", True),
            status=agent_dict.get("status", "draft"),
        )
        session.add(agent)
    
    await session.commit()
    print(f"Migrated {len(agents_data)} agents")

async def main():
    # Configuration
    database_url = "postgresql+asyncpg://agentforge:password@localhost:5432/agentforge"
    data_path = Path("./data")
    
    # Create engine and session
    engine = create_async_engine(database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Create default tenant
        tenant = Tenant(
            id="tenant_default",
            name="Default Organization",
            plan="enterprise"
        )
        session.add(tenant)
        await session.commit()
        
        # Migrate data
        await migrate_users(session, data_path, "tenant_default")
        await migrate_agents(session, data_path, "tenant_default")
        # ... migrate other entities
    
    print("Migration completed!")

if __name__ == "__main__":
    asyncio.run(main())
```

## Migration Checklist

```markdown
## Database Migration Checklist

### Pre-Migration
- [x] Backup all JSON files
- [x] Document current data structure
- [x] Set up PostgreSQL server (Railway)
- [x] Create database and user
- [x] Test connection

### Phase 1: Setup ✅ COMPLETED
- [x] Add PostgreSQL to Railway
- [x] Create SQLAlchemy models (Organization, Role, User, UserSession, MFASetting, PasswordHistory)
- [x] Create database initialization script
- [x] Run initialization on startup
- [x] Verify tables created
- [x] Add health check endpoint (/api/health/db)

### Phase 2: Data Migration ✅ COMPLETED
- [x] Create automated migration script (scripts/migrate_to_db.py)
- [x] Handle dict-of-dicts JSON format
- [x] Generate UUIDs for string IDs
- [x] Map references between entities (org_id, role_id)
- [x] Handle nested data structures (profile, mfa)
- [x] Run migration on deployment
- [x] Verify data integrity
- [x] Migrated successfully:
  - Organizations: 1
  - Roles: 3
  - Users: 2

### Phase 3: Database-First Architecture ✅ **COMPLETED (January 2026)**
- [x] Implement database service layer (`database/services/`)
- [x] Update `SecurityState.load_from_disk()` to prioritize database
- [x] Update `SecurityState.save_to_disk()` to save to database first
- [x] Update all API endpoints to use database services
- [x] Implement comprehensive error handling and fallback
- [x] Add extensive logging for database operations
- [x] Test all CRUD operations (Create, Read, Update, Delete)
- [x] Verify data persistence across deployments
- [x] Migrate all security entities (Users, Roles, Organizations, Settings, etc.)
- [x] Migrate platform settings (SystemSettings, OrganizationSettings)
- [x] Implement OAuth MFA verification with database persistence
- [x] Test user profile updates and MFA settings persistence

**Implementation Details:**
- **Service Layer:** Complete service layer for all entities
  - `UserService`: `create_user()`, `update_user()`, `delete_user()`, `get_all_users()`, `get_user_by_id()`, `get_user_by_email()`, `save_user()`
  - `RoleService`: `save_role()`, `get_all_roles()`, `get_role_by_id()`, `get_or_create_user_role()`
  - `OrganizationService`: `save_organization()`, `get_all_organizations()`, `get_organization_by_id()`, `get_organization_by_slug()`
  - `InvitationService`: `save_invitation()`, `delete_invitation()`, `get_all_invitations()`
  - `SecuritySettingsService`: `save_settings()`, `get_settings()`
  - `SystemSettingsService`: `save_settings()`, `get_settings()`
  - `AuditService`: `create_audit_log()`, `get_audit_logs()`

- **State Management:**
  - `SecurityState.load_from_disk()`: Loads from database first, falls back to JSON
  - `SecurityState.save_to_disk()`: Saves to database first, then JSON as backup
  - All modifications immediately persisted to database

- **API Integration:**
  - All security endpoints use database services directly
  - No feature flags needed - database is always primary
  - JSON files maintained as backup only

### Phase 4: Cutover (Optional)
- [ ] Remove JSON write operations (optional - can keep as backup)
- [ ] Update all services to DB only (already done)
- [ ] Remove feature flags (not needed - database is always primary)
- [ ] Archive JSON files (optional - can keep as backup)

**Note:** Phase 4 is optional. Current architecture keeps JSON as backup, which provides:
- Disaster recovery
- Data portability
- Easy migration to other systems

### Post-Migration
- [ ] Remove JSON repository code
- [ ] Update documentation
- [ ] Performance testing
- [ ] Backup strategy for PostgreSQL
- [ ] Add remaining models (Agents, Tools, etc.)
```

## Implementation Details

### Completed Components

#### 1. Database Schema (`database/models/`)

**Complete Enterprise-Grade Schema - Database-Agnostic Design**

All models use database-agnostic types from `database/types.py`:
- `UUID`: Database-agnostic UUID type (works with PostgreSQL, MySQL, SQLite, etc.)
- `JSON`: Database-agnostic JSON type (JSONB in PostgreSQL, JSON in MySQL, TEXT in SQLite)
- `JSONArray`: Database-agnostic JSON array type

##### Security & Access Control Models

**1. Organization (`organizations` table)**
```python
class Organization(Base):
    __tablename__ = "organizations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for organization/tenant
    # Populated: Auto-generated UUID on creation
    
    # Basic Info
    name = Column(String(255), nullable=False)
    # Purpose: Organization display name
    # Populated: From JSON migration or user input
    
    slug = Column(String(100), unique=True, nullable=False, index=True)
    # Purpose: URL-friendly identifier (e.g., "acme-corp")
    # Populated: Generated from name or user input
    
    # Plan & Settings
    plan = Column(String(50), default="free")  # free, starter, pro, enterprise
    # Purpose: Subscription plan tier
    # Populated: From JSON migration or admin configuration
    
    settings = Column(JSON, default={})
    # Purpose: Organization-specific settings (JSON object)
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as dict in OrganizationService
    
    # Auth Settings
    allowed_auth_providers = Column(JSONArray, default=list)
    # Purpose: List of allowed authentication providers (e.g., ["local", "google", "microsoft"])
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as list in OrganizationService
    
    require_mfa = Column(String(10), default="false")  # "true" or "false" (string for DB-agnostic)
    # Purpose: Whether MFA is required for all users
    # Populated: From JSON migration or admin configuration
    # Code Usage: Converted to boolean in OrganizationService
    
    allowed_email_domains = Column(JSONArray, default=list)
    # Purpose: List of allowed email domains for registration (e.g., ["@company.com"])
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as list in OrganizationService
    
    # OAuth Credentials (should be encrypted in production)
    google_client_id = Column(String(500), nullable=True)
    # Purpose: Google OAuth Client ID
    # Populated: From environment variables or admin configuration
    # Code Usage: Used in OAuthService.get_authorization_url()
    
    google_client_secret = Column(String(500), nullable=True)
    # Purpose: Google OAuth Client Secret
    # Populated: From environment variables or admin configuration
    # Code Usage: Used in OAuthService.exchange_code()
    
    microsoft_client_id = Column(String(500), nullable=True)
    microsoft_client_secret = Column(String(500), nullable=True)
    microsoft_tenant_id = Column(String(255), nullable=True)
    # Purpose: Microsoft OAuth credentials
    # Populated: From environment variables or admin configuration
    
    # LDAP/AD Settings
    ldap_config_id = Column(UUID, nullable=True)
    # Purpose: Reference to LDAP configuration
    # Populated: From admin configuration
    
    # Limits
    max_users = Column(String(10), default="100")  # Integer as string for DB-agnostic
    max_agents = Column(String(10), default="50")
    max_tools = Column(String(10), default="100")
    # Purpose: Resource limits for organization
    # Populated: From JSON migration or admin configuration
    # Code Usage: Converted to int in OrganizationService
    
    # Status
    status = Column(String(20), default="active")  # active, suspended, deleted
    # Purpose: Organization status
    # Populated: From JSON migration or admin configuration
    
    # Domain & Branding
    domain = Column(String(255), nullable=True)
    # Purpose: Custom domain for organization
    # Populated: From admin configuration
    
    logo_url = Column(String(500), nullable=True)
    # Purpose: Organization logo URL
    # Populated: From admin configuration
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps for audit and tracking
    # Populated: Auto-set by SQLAlchemy
```

**2. User (`users` table)**
```python
class User(Base):
    __tablename__ = "users"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for user
    # Populated: Auto-generated UUID on creation (or from JSON migration)
    
    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    # Purpose: User email (unique, indexed for fast lookups)
    # Populated: From JSON migration or user registration
    # Code Usage: Used in UserService.get_user_by_email()
    
    password_hash = Column(String(255), nullable=True)
    # Purpose: Hashed password (nullable for OAuth users)
    # Populated: From PasswordService.hash_password() or None for OAuth
    # Code Usage: Verified in PasswordService.verify_password()
    
    # Profile
    first_name = Column(String(100))
    last_name = Column(String(100))
    display_name = Column(String(100))
    phone = Column(String(20))
    job_title = Column(String(100))
    # Purpose: User profile information
    # Populated: From JSON migration (profile object) or user input
    # Code Usage: Mapped to UserProfile Pydantic model in UserService
    
    # Status
    status = Column(SQLEnum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    # Purpose: User account status (active, inactive, pending, suspended)
    # Populated: From JSON migration or admin action
    # Code Usage: Enum converted in UserService
    
    email_verified = Column(Boolean, default=False)
    # Purpose: Whether email is verified
    # Populated: From JSON migration or email verification flow
    
    # MFA
    mfa_enabled = Column(Boolean, default=False)
    # Purpose: Whether MFA is enabled for user
    # Populated: From JSON migration or user action
    # Code Usage: Checked in login flow and MFA verification
    
    mfa_method = Column(SQLEnum(MFAMethod), default=MFAMethod.NONE)
    # Purpose: Primary MFA method (totp, email, none)
    # Populated: From JSON migration or user configuration
    # Code Usage: Used in MFA verification flow
    
    mfa_secret_encrypted = Column(Text)
    # Purpose: Encrypted TOTP secret (if TOTP enabled)
    # Populated: From MFAService.generate_totp_secret()
    # Code Usage: Used in TOTP verification
    
    # Organization (Multi-tenancy)
    org_id = Column(UUID, nullable=True, index=True)
    # Purpose: Organization/tenant identifier
    # Populated: From JSON migration or user assignment
    # Code Usage: Used for multi-tenant data isolation
    
    # RBAC - Roles & Permissions
    role_ids = Column(JSONArray, default=list)
    # Purpose: List of role UUIDs assigned to user (stored as JSON array)
    # Populated: From JSON migration or admin assignment
    # Code Usage: Parsed as list in UserService, used in permission checks
    
    department_id = Column(UUID, nullable=True, index=True)
    # Purpose: Department identifier
    # Populated: From JSON migration or admin assignment
    
    group_ids = Column(JSONArray, default=list)
    # Purpose: List of user group UUIDs (stored as JSON array)
    # Populated: From JSON migration or admin assignment
    # Code Usage: Parsed as list in UserService
    
    # External Auth
    auth_provider = Column(String(50), default='local')
    # Purpose: Authentication provider (local, google, microsoft, ldap, saml)
    # Populated: From JSON migration or OAuth registration
    # Code Usage: Used in authentication flow
    
    external_id = Column(String(255), index=True)
    # Purpose: External system user ID (e.g., Google user ID)
    # Populated: From OAuth registration
    # Code Usage: Used for OAuth user lookup
    
    # Security
    must_change_password = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, nullable=True)
    # Purpose: Security tracking fields
    # Populated: From security policies or admin action
    
    # Activity Tracking
    last_active = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)  # Alias for compatibility
    # Purpose: Track user activity
    # Populated: Updated on login and activity
    # Code Usage: Updated in get_current_user() endpoint
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps for audit and tracking
    # Populated: Auto-set by SQLAlchemy
    
    # Additional data
    user_metadata = Column(JSON, default={})
    # Purpose: Flexible JSON field for additional user data
    # Populated: From JSON migration or custom fields
    # Code Usage: Parsed as dict in UserService
```

**3. Role (`roles` table)**
```python
class Role(Base):
    __tablename__ = "roles"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for role
    # Populated: Auto-generated UUID on creation (or from JSON migration)
    
    # Role Info
    name = Column(String(100), nullable=False)
    # Purpose: Role display name (e.g., "Super Admin", "Admin", "User")
    # Populated: From JSON migration or admin creation
    
    description = Column(Text)
    # Purpose: Role description
    # Populated: From JSON migration or admin input
    
    # Permissions
    permissions = Column(JSONArray, default=list)
    # Purpose: List of permission strings (e.g., ["users:view", "users:edit", "agents:create"])
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as list in RoleService, used in permission checks
    # Important: Stored as JSON array, may be double-encoded (handled in RoleService)
    
    # Hierarchy
    parent_id = Column(UUID, nullable=True)
    # Purpose: Parent role for inheritance (not currently used)
    # Populated: From JSON migration or admin configuration
    
    level = Column(String(10), default="100")
    # Purpose: Role hierarchy level (lower = more privileged, 0 = super admin)
    # Populated: From JSON migration or admin configuration
    # Code Usage: Converted to int in role hierarchy checks
    # Important: Stored as string for database-agnostic design
    
    # System vs Custom
    is_system = Column(Boolean, default=False)
    # Purpose: Whether role is system role (cannot be deleted)
    # Populated: From JSON migration or admin creation
    # Code Usage: Used in role deletion checks
    
    # Organization (Multi-tenancy)
    org_id = Column(UUID, index=True, nullable=True)
    # Purpose: Organization/tenant identifier
    # Populated: From JSON migration or admin creation
    # Code Usage: Used for multi-tenant data isolation
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    # Purpose: Timestamps and creator tracking
    # Populated: Auto-set by SQLAlchemy or admin action
```

**4. UserSession (`user_sessions` table)**
```python
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for session
    # Populated: Auto-generated UUID on login
    
    # User Reference
    user_id = Column(UUID, nullable=False, index=True)
    # Purpose: User identifier (no FK for simplicity)
    # Populated: From logged-in user
    # Code Usage: Used for session lookup and cleanup
    
    # Session Data
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    # Purpose: Hashed access token (unique, indexed)
    # Populated: From TokenService.create_access_token()
    # Code Usage: Used for session validation
    
    ip_address = Column(String(45))  # IPv6 support
    # Purpose: Client IP address
    # Populated: From request.client.host
    
    user_agent = Column(Text)
    # Purpose: Client user agent string
    # Populated: From request.headers.get("user-agent")
    
    # Expiry
    expires_at = Column(DateTime, nullable=False)
    # Purpose: Session expiration time
    # Populated: Calculated from current time + token lifetime
    
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime)
    # Purpose: Session revocation tracking
    # Populated: From logout or admin action
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    # Purpose: Session tracking
    # Populated: Auto-set by SQLAlchemy, updated on activity
```

**5. Invitation (`invitations` table)**
```python
class Invitation(Base):
    __tablename__ = "invitations"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for invitation
    # Populated: Auto-generated UUID on creation
    
    # Invitation Details
    email = Column(String(255), nullable=False, index=True)
    # Purpose: Invited user email
    # Populated: From admin invitation
    
    org_id = Column(UUID, nullable=True, index=True)
    # Purpose: Organization identifier
    # Populated: From admin invitation
    
    role_ids = Column(JSONArray, default=list)
    # Purpose: List of role UUIDs for invited user
    # Populated: From admin invitation
    # Code Usage: Parsed as list in InvitationService
    
    # Status
    status = Column(String(20), default="pending")  # pending, accepted, expired, revoked
    # Purpose: Invitation status
    # Populated: Updated on acceptance or expiration
    
    # Metadata
    invited_by = Column(UUID, nullable=True)
    # Purpose: User who sent invitation
    # Populated: From admin user
    
    expires_at = Column(DateTime, nullable=True)
    # Purpose: Invitation expiration time
    # Populated: Calculated from creation time
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps
    # Populated: Auto-set by SQLAlchemy
```

**6. SecuritySettings (`security_settings` table)**
```python
class SecuritySettings(Base):
    __tablename__ = "security_settings"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for settings
    # Populated: Auto-generated UUID on creation
    
    # Organization Reference
    org_id = Column(UUID, nullable=False, unique=True, index=True)
    # Purpose: Organization identifier (one settings per org)
    # Populated: From organization creation
    
    # Settings (stored as JSON)
    settings = Column(JSON, default={})
    # Purpose: All security settings as JSON object
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as SecuritySettings Pydantic model in SecuritySettingsService
    # Contains: mfa_enforcement, password_policy, session_timeout, etc.
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps
    # Populated: Auto-set by SQLAlchemy
```

**7. AuditLog (`audit_logs` table)**
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for audit log entry
    # Populated: Auto-generated UUID on creation
    
    # Organization & User
    org_id = Column(UUID, nullable=True, index=True)
    user_id = Column(UUID, nullable=True, index=True)
    # Purpose: Organization and user identifiers
    # Populated: From request context
    
    # Action Details
    action = Column(String(100), nullable=False)
    # Purpose: Action type (e.g., "LOGIN", "USER_CREATE", "ROLE_UPDATE")
    # Populated: From ActionType enum
    
    resource_type = Column(String(50))
    resource_id = Column(String(255))
    resource_name = Column(String(255))
    # Purpose: Resource information
    # Populated: From action context
    
    # Details
    details = Column(JSON, default={})
    # Purpose: Additional action details (JSON object)
    # Populated: From action context
    # Code Usage: Parsed as dict in AuditService
    
    # Request Info
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(Text)
    # Purpose: Request tracking
    # Populated: From request headers
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    # Purpose: Action timestamp (indexed for fast queries)
    # Populated: Auto-set by SQLAlchemy
```

##### Platform Models

**8. SystemSetting (`system_settings` table)**
```python
class SystemSetting(Base):
    __tablename__ = "system_settings"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Setting Key
    key = Column(String(100), unique=True, nullable=False, index=True)
    # Purpose: Setting key (e.g., "system_settings", "llm_providers")
    # Populated: From JSON migration or system initialization
    
    # Setting Value
    value = Column(JSON, nullable=False)
    # Purpose: Setting value as JSON object
    # Populated: From JSON migration or admin configuration
    # Code Usage: Parsed as SystemSettings Pydantic model in SystemSettingsService
    # Contains: LLM config, vector DB config, theme, etc.
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps
    # Populated: Auto-set by SQLAlchemy
```

**9. Tool (`tools` table)**
```python
class Tool(Base):
    __tablename__ = "tools"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    # Purpose: Unique identifier for tool
    # Populated: Auto-generated UUID on creation
    
    # Tool Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False)  # VARCHAR (database-agnostic, not enum)
    # Purpose: Tool type (e.g., "website", "api", "database")
    # Populated: From JSON migration or user creation
    # Code Usage: Used in ToolType.from_legacy() for normalization
    
    # Configuration
    config = Column(JSON, default={})
    # Purpose: Tool-specific configuration (JSON object)
    # Populated: From JSON migration or user configuration
    # Code Usage: Parsed as dict, validated per tool type
    
    # Status
    is_active = Column(Boolean, default=True)
    # Purpose: Whether tool is active
    # Populated: From JSON migration or user action
    
    # Organization
    org_id = Column(UUID, nullable=True, index=True)
    # Purpose: Organization identifier
    # Populated: From JSON migration or user creation
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Purpose: Timestamps
    # Populated: Auto-set by SQLAlchemy
```

**Note:** Additional models exist for Agents, Conversations, KnowledgeBase, Documents, etc. See `database/models/__init__.py` for complete list.

#### 2. Database Configuration (`database/config.py`)

**Database-Agnostic Configuration System**

The platform uses a database-agnostic configuration system that supports multiple database types:

```python
class DatabaseConfig:
    """Database configuration with environment variable support"""
    
    # Database type (default: PostgreSQL)
    DB_TYPE = os.getenv('DB_TYPE', 'postgresql')
    # Supported: postgresql, mysql, sqlite, sqlserver, oracle
    
    # Connection parameters
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'agentforge')
    DB_USER = os.getenv('DB_USER', 'agentforge')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # Railway automatic DATABASE_URL (highest priority)
    # If DATABASE_URL is set, it overrides all other settings
    # Railway uses postgres:// but SQLAlchemy 2.0 needs postgresql://
    # Automatically converted in get_database_url()
    
    # Connection pooling
    POOL_SIZE = int(os.getenv('DB_POOL_SIZE', '20'))
    MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', '10'))
    POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', '30'))
    POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))
    POOL_PRE_PING = True  # Verify connections before using
    
    # SSL/TLS settings
    DB_SSL_MODE = os.getenv('DB_SSL_MODE', 'require')  # PostgreSQL
    DB_SSL_CA = os.getenv('DB_SSL_CA', '')
    DB_SSL_CERT = os.getenv('DB_SSL_CERT', '')
    DB_SSL_KEY = os.getenv('DB_SSL_KEY', '')
```

**How Database Connection Works:**

1. **Environment Variable Priority:**
   - `DATABASE_URL` (Railway automatic) → Highest priority
   - `DB_TYPE`, `DB_HOST`, `DB_PORT`, etc. → Fallback

2. **Connection URL Generation:**
   - PostgreSQL: `postgresql://user:pass@host:port/db?sslmode=require`
   - MySQL: `mysql+pymysql://user:pass@host:port/db?charset=utf8mb4`
   - SQLite: `sqlite:///data/agentforge.db`
   - SQL Server: `mssql+pyodbc://user:pass@host:port/db?driver=ODBC+Driver+17+for+SQL+Server`
   - Oracle: `oracle+cx_oracle://user:pass@host:port/db`

3. **Engine Configuration:**
   - Connection pooling enabled (except SQLite)
   - Pre-ping enabled (verify connections before use)
   - SQLAlchemy 2.0 style (`future=True`)

4. **Session Management:**
   - Context manager pattern: `with get_db_session() as session:`
   - Automatic commit/rollback on context exit
   - `expire_on_commit=False` for better performance

#### 3. Database Services (`database/services/`)

**Service Layer Pattern - All CRUD Operations**

All database operations go through service classes that:
- Convert between SQLAlchemy models and Pydantic models
- Handle JSON parsing/encoding
- Provide consistent error handling
- Add comprehensive logging

**Service Architecture:**

```
API Endpoint
    ↓
Service Layer (database/services/)
    ↓
SQLAlchemy Model (database/models/)
    ↓
Database
```

**Key Services:**

1. **UserService** (`database/services/user_service.py`)
   - `create_user(user: User) -> User`: Create new user
   - `update_user(user: User) -> User`: Update existing user
   - `delete_user(user_id: str) -> bool`: Delete user
   - `get_all_users(org_id: Optional[str]) -> List[User]`: Get all users
   - `get_user_by_id(user_id: str, org_id: str) -> Optional[User]`: Get user by ID
   - `get_user_by_email(email: str, org_id: str) -> Optional[User]`: Get user by email
   - `save_user(user: User) -> User`: Save user (insert or update)
   - `_db_to_core_user(db_user: DBUser) -> User`: Convert DB model to Core model
   - **JSON Handling:** Parses `role_ids` (may be double-encoded), `group_ids`
   - **MFA Handling:** Converts between Core MFAMethod and DB MFAMethod enums
   - **Profile Handling:** Maps profile fields (first_name, last_name, display_name, phone, job_title)

2. **RoleService** (`database/services/role_service.py`)
   - `save_role(role: Role) -> Role`: Save role (insert or update)
   - `get_all_roles(org_id: Optional[str]) -> List[Role]`: Get all roles
   - `get_role_by_id(role_id: str) -> Optional[Role]`: Get role by ID
   - `get_or_create_user_role(org_id: str) -> Role`: Get or create default "User" role
   - `_db_to_core_role(db_role: DBRole) -> Role`: Convert DB model to Core model
   - **JSON Handling:** Parses `permissions` (may be double-encoded)
   - **Level Handling:** Converts string level to int for hierarchy checks

3. **OrganizationService** (`database/services/organization_service.py`)
   - `save_organization(org: Organization) -> Organization`: Save organization
   - `get_all_organizations() -> List[Organization]`: Get all organizations
   - `get_organization_by_id(org_id: str) -> Optional[Organization]`: Get org by ID
   - `get_organization_by_slug(slug: str) -> Optional[Organization]`: Get org by slug
   - `_db_to_core_org(db_org: DBOrganization) -> Organization`: Convert DB model to Core model
   - **JSON Handling:** Parses `allowed_auth_providers`, `allowed_email_domains`, `settings`
   - **OAuth Handling:** Maps OAuth credentials (google_client_id, microsoft_client_id, etc.)

4. **SecuritySettingsService** (`database/services/security_settings_service.py`)
   - `save_settings(settings: SecuritySettings, org_id: str) -> SecuritySettings`: Save settings
   - `get_settings(org_id: str) -> Optional[SecuritySettings]`: Get settings
   - **JSON Handling:** Parses `settings` JSON field to SecuritySettings Pydantic model

5. **SystemSettingsService** (`database/services/system_settings_service.py`)
   - `save_settings(settings: SystemSettings) -> SystemSettings`: Save system settings
   - `get_settings() -> Optional[SystemSettings]`: Get system settings
   - **JSON Handling:** Parses `value` JSON field to SystemSettings Pydantic model

6. **InvitationService** (`database/services/invitation_service.py`)
   - `save_invitation(invitation: Invitation) -> Invitation`: Save invitation
   - `delete_invitation(invitation_id: str) -> bool`: Delete invitation
   - `get_all_invitations(org_id: Optional[str]) -> List[Invitation]`: Get all invitations
   - **JSON Handling:** Parses `role_ids`

7. **AuditService** (`database/services/audit_service.py`)
   - `create_audit_log(log: AuditLog) -> AuditLog`: Create audit log entry
   - `get_audit_logs(org_id: Optional[str], limit: int = 1000) -> List[AuditLog]`: Get audit logs
   - **JSON Handling:** Parses `details` JSON field

**Service Pattern Example:**

```python
# In UserService.save_user()
@staticmethod
def save_user(user: User) -> User:
    """Save user to database (insert or update)"""
    with get_db_session() as db:
        # Check if user exists by ID
        db_user = db.query(DBUser).filter_by(id=user.id).first()
        
        if not db_user:
            # If not found by ID, try finding by email (for OAuth users)
            db_user = db.query(DBUser).filter_by(email=user.email.lower()).first()
            if db_user:
                # Update user ID to match database
                user.id = str(db_user.id)
        
        if db_user:
            # Update existing
            return UserService.update_user(user)
        else:
            # Create new
            return UserService.create_user(user)
```

**Error Handling:**
- All services use try-except blocks
- Comprehensive logging with `📊 [DATABASE]`, `💾 [DATABASE]`, `✅ [DATABASE]`, `❌ [DATABASE ERROR]` prefixes
- Traceback printing for debugging
- Graceful fallback to JSON if database unavailable

#### 4. Database Initialization (`database/init_db.py`)

**Automatic Database Setup on Startup**

The database is automatically initialized when the application starts:

1. **Connection Check:**
   - Checks for `DATABASE_URL` environment variable
   - Waits for database to be ready (max 90 seconds with retries)
   - Tests connection with simple query

2. **Table Creation:**
   - Imports all models from `database/models/`
   - Creates all tables using `Base.metadata.create_all(bind=engine)`
   - Handles missing tables gracefully

3. **Migration Scripts:**
   - Runs `scripts/migrate_to_db_complete.py` to migrate data from JSON
   - Runs `scripts/create_missing_tables.py` to ensure all tables exist
   - Runs `scripts/add_user_columns.py` to add missing columns
   - Runs `scripts/add_role_columns.py` to add missing columns
   - Runs `scripts/add_organization_oauth_columns.py` to add OAuth columns
   - Runs `scripts/make_password_hash_nullable.py` to make password_hash nullable

4. **Verification:**
   - Verifies all required tables exist
   - Logs table creation status
   - Continues even if some tables already exist (idempotent)

**Initialization Flow:**

```
Application Start
    ↓
Check DATABASE_URL
    ↓
Wait for Database (max 90s)
    ↓
Create Engine
    ↓
Import All Models
    ↓
Create All Tables (Base.metadata.create_all)
    ↓
Run Migration Scripts
    ↓
Verify Tables
    ↓
Application Ready
```

#### 2. Migration Script (`scripts/migrate_to_db.py`)
Features:
- Handles both list and dict-of-dicts JSON formats
- Smart UUID generation for string IDs (e.g., 'org_default' → UUID)
- ID mapping across entities (old_id → new_uuid)
- Nested data extraction (profile, mfa objects)
- Duplicate detection and skipping
- Full error handling with traceback
- Verification step after migration

#### 3. Deployment Integration (`Dockerfile`)
```bash
# Automatic on startup:
1. Check DATABASE_URL environment variable
2. Wait for PostgreSQL (max 90s with retries)
3. Initialize database tables
4. Run migration script (JSON → DB)
5. Start application server
```

#### 4. Database Configuration (`database/config.py`)
- Multi-database support (PostgreSQL, MySQL, SQLite, SQL Server, Oracle)
- Railway-specific environment variable detection
- Connection pooling with configurable settings
- Retry logic with exponential backoff

#### 5. Health Monitoring (`api/health.py`)
Endpoints:
- `GET /api/health` - Overall API health
- `GET /api/health/db` - Database connection status
  ```json
  {
    "status": "healthy",
    "database": {
      "type": "postgresql",
      "connected": true,
      "host": "...",
      "port": 5432,
      "name": "railway"
    }
  }
  ```

### Known Limitations (Temporary)

1. **Foreign Key Constraints Removed**
   - Reason: Circular dependency issues during table creation
   - Impact: No automatic cascade deletes, no referential integrity at DB level
   - Mitigation: Handled at application level
   - Future: Will be re-added after migration complete

2. **Relationship Definitions Removed**
   - Reason: SQLAlchemy requires ForeignKeys for relationships
   - Impact: No ORM-level navigation (e.g., `user.sessions`)
   - Mitigation: Manual queries using IDs
   - Future: Will be re-added with ForeignKeys

3. **Remaining Models Not Migrated Yet**
   - Agents, Tools, Knowledge Base, Chat History
   - Will be added in Phase 3 (Dual-Write implementation)

---

# 🎨 UI/UX Modernization

## Current Issues

### 1. Monolithic Architecture
- **Problem:** 17,500 lines in single HTML file
- **Impact:** Impossible to maintain, test, or scale
- **Solution:** Component-based architecture with React/Vue

### 2. No State Management
- **Problem:** Global variables, DOM manipulation
- **Impact:** Unpredictable behavior, hard to debug
- **Solution:** Zustand or Redux for state

### 3. Poor Code Organization
- **Problem:** Mixed HTML, CSS, JS in one file
- **Impact:** Can't reuse components
- **Solution:** Separate concerns, component library

### 4. No Type Safety
- **Problem:** Vanilla JavaScript
- **Impact:** Runtime errors, no IDE support
- **Solution:** TypeScript

### 5. Accessibility Issues
- **Problem:** No ARIA labels, keyboard navigation
- **Impact:** Not usable by screen readers
- **Solution:** Follow WCAG 2.1 guidelines

### 6. Mobile Experience
- **Problem:** Not optimized for touch
- **Impact:** Poor mobile usability
- **Solution:** Mobile-first responsive design

## Design System

### Color Palette

```css
/* colors.css */
:root {
  /* Primary */
  --color-primary-50: #fff7ed;
  --color-primary-100: #ffedd5;
  --color-primary-200: #fed7aa;
  --color-primary-300: #fdba74;
  --color-primary-400: #fb923c;
  --color-primary-500: #f97316;  /* Main orange */
  --color-primary-600: #ea580c;
  --color-primary-700: #c2410c;
  --color-primary-800: #9a3412;
  --color-primary-900: #7c2d12;
  
  /* Neutral (Dark theme) */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;  /* Background */
  --color-gray-900: #111827;  /* Darker background */
  
  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Typography

```css
/* typography.css */
:root {
  /* Font families */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Font sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### Spacing

```css
/* spacing.css */
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

### Component Library

```tsx
// Component specifications for consistent UI

// Button variants
<Button variant="primary" />      // Orange, filled
<Button variant="secondary" />    // Gray, filled
<Button variant="outline" />      // Border only
<Button variant="ghost" />        // Text only
<Button variant="danger" />       // Red, filled

// Input variants
<Input type="text" />
<Input type="email" />
<Input type="password" showToggle />
<Input type="search" />
<Textarea rows={4} />
<Select options={[]} />

// Card variants
<Card>                            // Default
<Card variant="elevated" />       // With shadow
<Card variant="bordered" />       // With border
<Card interactive />              // Hover effect

// Modal sizes
<Modal size="sm" />               // 400px
<Modal size="md" />               // 500px
<Modal size="lg" />               // 700px
<Modal size="xl" />               // 900px
<Modal size="full" />             // Full screen

// Toast types
<Toast type="success" />
<Toast type="error" />
<Toast type="warning" />
<Toast type="info" />
```

### Accessibility Requirements

```tsx
// Every interactive element must have:
// 1. Focusable (tabIndex)
// 2. Keyboard accessible (Enter/Space to activate)
// 3. ARIA labels for screen readers
// 4. Sufficient color contrast (4.5:1 minimum)

// Example: Accessible Button
<button
  type="button"
  role="button"
  aria-label="Create new agent"
  aria-disabled={disabled}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick();
    }
  }}
>
  Create Agent
</button>

// Example: Accessible Form
<form aria-labelledby="form-title">
  <h2 id="form-title">Create Agent</h2>
  
  <label htmlFor="agent-name">Agent Name</label>
  <input
    id="agent-name"
    type="text"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "name-error" : undefined}
  />
  {hasError && (
    <span id="name-error" role="alert">
      Name is required
    </span>
  )}
</form>

// Example: Accessible Modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Delete</h2>
  <p id="modal-description">Are you sure you want to delete this agent?</p>
</div>
```

### Responsive Breakpoints

```css
/* Mobile first approach */
/* Base styles for mobile (< 640px) */

/* Small devices (tablets) */
@media (min-width: 640px) { /* sm */ }

/* Medium devices (small laptops) */
@media (min-width: 768px) { /* md */ }

/* Large devices (laptops) */
@media (min-width: 1024px) { /* lg */ }

/* Extra large devices (desktops) */
@media (min-width: 1280px) { /* xl */ }

/* 2XL devices (large desktops) */
@media (min-width: 1536px) { /* 2xl */ }
```

### UI/UX Checklist

```markdown
## UI/UX Quality Checklist

### Visual Design
- [ ] Consistent color usage
- [ ] Proper typography hierarchy
- [ ] Adequate spacing
- [ ] Visual feedback on interactions
- [ ] Loading states for async operations
- [ ] Empty states for lists
- [ ] Error states for forms

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast passes WCAG 2.1
- [ ] Focus indicators visible
- [ ] ARIA labels on interactive elements
- [ ] Form labels properly associated
- [ ] Error messages accessible

### Responsiveness
- [ ] Mobile layout works
- [ ] Touch targets adequate (44x44px minimum)
- [ ] No horizontal scroll
- [ ] Text readable without zoom
- [ ] Images scale properly
- [ ] Modals work on mobile

### Performance
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3s
- [ ] No layout shift
- [ ] Images optimized
- [ ] Code split by route
- [ ] Lazy loading for non-critical
```

---

# 🚀 Deployment Architecture

## Deployment Models

### 1. Single-Tenant Dedicated

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer Infrastructure                   │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    AgentForge Instance                   ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       ││
│  │  │Frontend │ │  API    │ │  DB     │ │ Vector  │       ││
│  │  │         │ │ Gateway │ │PostgreSQL│ │ChromaDB │       ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Customer Data stays in customer infrastructure              │
│  Full customization possible                                 │
│  Customer manages updates                                    │
└─────────────────────────────────────────────────────────────┘

Use Cases:
- Enterprise customers with strict data residency
- Government/Healthcare with compliance requirements
- Large organizations with custom requirements
```

### 2. Multi-Tenant SaaS

```
┌──────────────────────────────────────────────────────────────────┐
│                     AgentForge SaaS Platform                      │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      Load Balancer                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│       ┌──────────────────────┼──────────────────────┐            │
│       ▼                      ▼                      ▼            │
│  ┌─────────┐           ┌─────────┐           ┌─────────┐        │
│  │ App Pod │           │ App Pod │           │ App Pod │        │
│  │   #1    │           │   #2    │           │   #3    │        │
│  └─────────┘           └─────────┘           └─────────┘        │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Shared Database                           │ │
│  │  ┌─────────────────┬─────────────────┬─────────────────┐   │ │
│  │  │    Tenant A     │    Tenant B     │    Tenant C     │   │ │
│  │  │    (Acme Inc)   │   (BigCorp)     │   (StartupX)    │   │ │
│  │  └─────────────────┴─────────────────┴─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Data isolated by tenant_id                                       │
│  Shared infrastructure = lower cost                               │
│  Automatic updates for all tenants                                │
└──────────────────────────────────────────────────────────────────┘

Use Cases:
- Small to medium businesses
- Startups
- Teams wanting quick setup
```

### 3. Hybrid (Multi-Tenant with Dedicated Options)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AgentForge Platform                            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                      Control Plane                               │ │
│  │   • Tenant Management    • Billing    • Updates    • Monitoring │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│       ┌──────────────────────┼──────────────────────┐                │
│       │                      │                      │                │
│       ▼                      ▼                      ▼                │
│  ┌──────────┐          ┌──────────┐          ┌──────────┐           │
│  │  Shared  │          │ Dedicated │          │ Dedicated │          │
│  │  Tenant  │          │ Tenant A  │          │ Tenant B  │          │
│  │   Pool   │          │(Enterprise)│         │  (Gov)    │          │
│  ├──────────┤          ├──────────┤          ├──────────┤           │
│  │ Tenant 1 │          │ Own DB    │          │ Own Infra │          │
│  │ Tenant 2 │          │ Own Redis │          │ Own DB    │          │
│  │ Tenant 3 │          │ Scaled    │          │ Isolated  │          │
│  └──────────┘          └──────────┘          └──────────┘           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

# ☁️ Multi-Cloud Deployment Guide

## Supported Platforms

| Platform | Support Level | Deployment Method |
|----------|--------------|-------------------|
| **AWS** | Full | EKS, ECS, EC2 |
| **Azure** | Full | AKS, Container Apps |
| **GCP** | Full | GKE, Cloud Run |
| **Oracle Cloud** | Full | OKE, Compute |
| **On-Premise** | Full | Docker, Kubernetes |
| **Railway** | Basic | Container |
| **DigitalOcean** | Basic | App Platform, K8s |

## Infrastructure as Code

### AWS Deployment (Terraform)

```hcl
# infrastructure/terraform/aws/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "production"
}

variable "app_name" {
  default = "agentforge"
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "${var.app_name}-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  
  cluster_name    = "${var.app_name}-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    main = {
      min_size     = 2
      max_size     = 10
      desired_size = 3
      
      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
    }
  }
}

# RDS PostgreSQL
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  
  identifier = "${var.app_name}-db"
  
  engine               = "postgres"
  engine_version       = "15"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = "db.t3.medium"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  
  db_name  = "agentforge"
  username = "agentforge"
  port     = 5432
  
  multi_az               = var.environment == "production"
  db_subnet_group_name   = module.vpc.database_subnet_group
  vpc_security_group_ids = [module.security_group.security_group_id]
  
  backup_retention_period = 7
  deletion_protection     = var.environment == "production"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.app_name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [module.security_group.security_group_id]
}

# S3 for file storage
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.app_name}-uploads-${var.environment}"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Outputs
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
```

### Azure Deployment (Terraform)

```hcl
# infrastructure/terraform/azure/main.tf

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  default = "East US"
}

variable "environment" {
  default = "production"
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "agentforge-${var.environment}-rg"
  location = var.location
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "agentforge-${var.environment}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "agentforge"
  
  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
  }
  
  identity {
    type = "SystemAssigned"
  }
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "agentforge-${var.environment}-db"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "15"
  administrator_login    = "agentforge"
  administrator_password = var.db_password
  storage_mb             = 32768
  sku_name               = "GP_Standard_D2s_v3"
}

# Redis Cache
resource "azurerm_redis_cache" "main" {
  name                = "agentforge-${var.environment}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
}

# Storage Account
resource "azurerm_storage_account" "main" {
  name                     = "agentforge${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
}
```

### Google Cloud Deployment (Terraform)

```hcl
# infrastructure/terraform/gcp/main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {}
variable "region" {
  default = "us-central1"
}

# GKE Cluster
resource "google_container_cluster" "main" {
  name     = "agentforge-cluster"
  location = var.region
  
  initial_node_count = 3
  
  node_config {
    machine_type = "e2-medium"
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# Cloud SQL PostgreSQL
resource "google_sql_database_instance" "main" {
  name             = "agentforge-db"
  database_version = "POSTGRES_15"
  region           = var.region
  
  settings {
    tier = "db-f1-micro"
    
    backup_configuration {
      enabled = true
    }
  }
}

# Memorystore Redis
resource "google_redis_instance" "main" {
  name           = "agentforge-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = var.region
}

# Cloud Storage
resource "google_storage_bucket" "uploads" {
  name     = "agentforge-uploads-${var.project_id}"
  location = var.region
  
  versioning {
    enabled = true
  }
}
```

### On-Premise / Docker Compose (Production)

```yaml
# infrastructure/docker/docker-compose.prod.yml
version: '3.8'

services:
  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api-gateway
      - frontend
    restart: always

  # Frontend
  frontend:
    build:
      context: ../../packages/frontend
      dockerfile: Dockerfile
    environment:
      - VITE_API_URL=/api
    restart: always
    deploy:
      replicas: 2

  # API Gateway
  api-gateway:
    build:
      context: ../../packages/api-gateway
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://agentforge:${DB_PASSWORD}@postgres:5432/agentforge
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - AUTH_SERVICE_URL=http://auth-service:8001
      - AGENT_SERVICE_URL=http://agent-service:8002
      - RAG_SERVICE_URL=http://rag-service:8003
    depends_on:
      - postgres
      - redis
    restart: always
    deploy:
      replicas: 2

  # Auth Service
  auth-service:
    build:
      context: ../../packages/auth-service
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://agentforge:${DB_PASSWORD}@postgres:5432/agentforge
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
    depends_on:
      - postgres
      - redis
    restart: always

  # Agent Service
  agent-service:
    build:
      context: ../../packages/agent-service
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://agentforge:${DB_PASSWORD}@postgres:5432/agentforge
      - REDIS_URL=redis://redis:6379
      - LLM_SERVICE_URL=http://llm-service:8004
    depends_on:
      - postgres
      - redis
    restart: always
    deploy:
      replicas: 2

  # LLM Service
  llm-service:
    build:
      context: ../../packages/llm-service
      dockerfile: Dockerfile
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    restart: always
    deploy:
      replicas: 2

  # RAG Service
  rag-service:
    build:
      context: ../../packages/rag-service
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://agentforge:${DB_PASSWORD}@postgres:5432/agentforge
      - CHROMADB_HOST=chromadb
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - chromadb
    restart: always

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: agentforge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: agentforge
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: always

  # ChromaDB
  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - chroma_data:/chroma/chroma
    restart: always

volumes:
  postgres_data:
  redis_data:
  chroma_data:

networks:
  default:
    driver: bridge
```

### Kubernetes Deployment (Helm)

```yaml
# infrastructure/kubernetes/helm/agentforge/values.yaml

# Global settings
global:
  environment: production
  domain: agentforge.example.com

# Frontend
frontend:
  replicas: 2
  image:
    repository: agentforge/frontend
    tag: latest
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

# API Gateway
apiGateway:
  replicas: 3
  image:
    repository: agentforge/api-gateway
    tag: latest
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

# Auth Service
authService:
  replicas: 2
  image:
    repository: agentforge/auth-service
    tag: latest

# Agent Service
agentService:
  replicas: 3
  image:
    repository: agentforge/agent-service
    tag: latest

# LLM Service
llmService:
  replicas: 3
  image:
    repository: agentforge/llm-service
    tag: latest

# RAG Service
ragService:
  replicas: 2
  image:
    repository: agentforge/rag-service
    tag: latest

# PostgreSQL (use external in production)
postgresql:
  enabled: false
  external:
    host: "your-rds-endpoint.amazonaws.com"
    port: 5432
    database: agentforge
    existingSecret: agentforge-db-credentials

# Redis (use external in production)
redis:
  enabled: false
  external:
    host: "your-elasticache-endpoint.amazonaws.com"
    port: 6379

# Ingress
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: agentforge.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: agentforge-tls
      hosts:
        - agentforge.example.com

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

---

# 🧙 Installation Wizard & CLI

## AgentForge CLI

### Installation

```bash
# Install via pip
pip install agentforge-cli

# Or install from source
git clone https://github.com/ahamdihussein-star/agentforge
cd agentforge/tools/cli
pip install -e .
```

### CLI Commands

```bash
# Initialize new AgentForge installation
agentforge init

# Configure existing installation
agentforge config

# Deploy to various targets
agentforge deploy

# Database operations
agentforge db migrate
agentforge db seed
agentforge db backup

# Health checks
agentforge health

# View logs
agentforge logs [service]

# Scale services
agentforge scale [service] [replicas]
```

### Interactive Setup Wizard

```python
# tools/cli/agentforge/commands/init.py

import click
import questionary
from rich.console import Console
from rich.panel import Panel

console = Console()

@click.command()
@click.option('--non-interactive', is_flag=True, help='Run without prompts')
def init(non_interactive):
    """Initialize AgentForge installation"""
    
    console.print(Panel.fit(
        "[bold orange]🔥 AgentForge Setup Wizard[/bold orange]\n"
        "This wizard will help you configure AgentForge for your environment.",
        border_style="orange"
    ))
    
    if non_interactive:
        # Use defaults
        config = get_default_config()
    else:
        config = run_interactive_wizard()
    
    # Generate configuration files
    generate_config_files(config)
    
    console.print("\n[green]✅ Configuration complete![/green]")
    console.print("\nNext steps:")
    console.print("  1. Review generated config files")
    console.print("  2. Run: [cyan]agentforge deploy[/cyan]")


def run_interactive_wizard():
    """Run interactive configuration wizard"""
    
    config = {}
    
    # Step 1: Deployment Type
    console.print("\n[bold]Step 1: Deployment Type[/bold]")
    config['deployment_type'] = questionary.select(
        "How would you like to deploy AgentForge?",
        choices=[
            questionary.Choice("Local Development (Docker Compose)", value="local"),
            questionary.Choice("Single Server (Docker)", value="single"),
            questionary.Choice("Kubernetes Cluster", value="kubernetes"),
            questionary.Choice("AWS (EKS + RDS)", value="aws"),
            questionary.Choice("Azure (AKS + PostgreSQL)", value="azure"),
            questionary.Choice("Google Cloud (GKE + Cloud SQL)", value="gcp"),
            questionary.Choice("Oracle Cloud (OKE + PostgreSQL)", value="oracle"),
        ]
    ).ask()
    
    # Step 2: Multi-tenancy
    console.print("\n[bold]Step 2: Tenancy Model[/bold]")
    config['multi_tenant'] = questionary.select(
        "Select tenancy model:",
        choices=[
            questionary.Choice("Single Tenant (Dedicated)", value=False),
            questionary.Choice("Multi-Tenant (SaaS)", value=True),
        ]
    ).ask()
    
    # Step 3: Database
    console.print("\n[bold]Step 3: Database Configuration[/bold]")
    config['database'] = questionary.select(
        "Database option:",
        choices=[
            questionary.Choice("Create new PostgreSQL (Docker)", value="docker"),
            questionary.Choice("Use existing PostgreSQL", value="external"),
            questionary.Choice("AWS RDS", value="aws_rds"),
            questionary.Choice("Azure Database", value="azure_db"),
            questionary.Choice("Google Cloud SQL", value="gcp_sql"),
        ]
    ).ask()
    
    if config['database'] == 'external':
        config['db_host'] = questionary.text("Database host:").ask()
        config['db_port'] = questionary.text("Database port:", default="5432").ask()
        config['db_name'] = questionary.text("Database name:", default="agentforge").ask()
        config['db_user'] = questionary.text("Database user:").ask()
        config['db_password'] = questionary.password("Database password:").ask()
    
    # Step 4: LLM Providers
    console.print("\n[bold]Step 4: LLM Providers[/bold]")
    config['llm_providers'] = questionary.checkbox(
        "Select LLM providers to enable:",
        choices=[
            questionary.Choice("OpenAI", checked=True),
            questionary.Choice("Anthropic"),
            questionary.Choice("Google Gemini"),
            questionary.Choice("AWS Bedrock"),
            questionary.Choice("Azure OpenAI"),
            questionary.Choice("Ollama (Local)"),
        ]
    ).ask()
    
    # Get API keys for selected providers
    if "OpenAI" in config['llm_providers']:
        config['openai_api_key'] = questionary.password("OpenAI API Key:").ask()
    if "Anthropic" in config['llm_providers']:
        config['anthropic_api_key'] = questionary.password("Anthropic API Key:").ask()
    
    # Step 5: Authentication
    console.print("\n[bold]Step 5: Authentication[/bold]")
    config['auth_providers'] = questionary.checkbox(
        "Select authentication methods:",
        choices=[
            questionary.Choice("Email/Password", checked=True),
            questionary.Choice("Google OAuth"),
            questionary.Choice("Microsoft OAuth"),
            questionary.Choice("SAML SSO"),
            questionary.Choice("LDAP/Active Directory"),
        ]
    ).ask()
    
    # Step 6: Domain & SSL
    console.print("\n[bold]Step 6: Domain & SSL[/bold]")
    config['domain'] = questionary.text(
        "Domain name (leave empty for localhost):",
        default=""
    ).ask()
    
    if config['domain']:
        config['ssl'] = questionary.confirm(
            "Enable SSL/TLS (Let's Encrypt)?",
            default=True
        ).ask()
    
    # Step 7: Monitoring
    console.print("\n[bold]Step 7: Monitoring & Observability[/bold]")
    config['monitoring'] = questionary.checkbox(
        "Select monitoring options:",
        choices=[
            questionary.Choice("Prometheus + Grafana"),
            questionary.Choice("Datadog"),
            questionary.Choice("New Relic"),
            questionary.Choice("AWS CloudWatch"),
            questionary.Choice("None"),
        ]
    ).ask()
    
    return config


def generate_config_files(config):
    """Generate configuration files based on wizard answers"""
    
    console.print("\n[bold]Generating configuration files...[/bold]")
    
    # Generate .env file
    env_content = generate_env_file(config)
    with open('.env', 'w') as f:
        f.write(env_content)
    console.print("  ✅ Created .env")
    
    # Generate docker-compose.yml
    if config['deployment_type'] in ['local', 'single']:
        compose_content = generate_docker_compose(config)
        with open('docker-compose.yml', 'w') as f:
            f.write(compose_content)
        console.print("  ✅ Created docker-compose.yml")
    
    # Generate Kubernetes manifests
    if config['deployment_type'] == 'kubernetes':
        generate_kubernetes_manifests(config)
        console.print("  ✅ Created kubernetes/ manifests")
    
    # Generate Terraform files
    if config['deployment_type'] in ['aws', 'azure', 'gcp', 'oracle']:
        generate_terraform_files(config)
        console.print(f"  ✅ Created terraform/{config['deployment_type']}/ files")
    
    # Generate values.yaml for Helm
    if config['deployment_type'] == 'kubernetes':
        helm_values = generate_helm_values(config)
        with open('values.yaml', 'w') as f:
            f.write(helm_values)
        console.print("  ✅ Created values.yaml")


def generate_env_file(config):
    """Generate .env file content"""
    lines = [
        "# AgentForge Configuration",
        f"# Generated by AgentForge CLI",
        "",
        "# Environment",
        f"ENVIRONMENT={'production' if config['deployment_type'] != 'local' else 'development'}",
        "",
        "# Database",
    ]
    
    if config['database'] == 'docker':
        lines.extend([
            "DATABASE_URL=postgresql://agentforge:agentforge@postgres:5432/agentforge",
            "DB_PASSWORD=agentforge",
        ])
    elif config['database'] == 'external':
        lines.append(
            f"DATABASE_URL=postgresql://{config['db_user']}:{config['db_password']}@{config['db_host']}:{config['db_port']}/{config['db_name']}"
        )
    
    lines.extend([
        "",
        "# Redis",
        "REDIS_URL=redis://redis:6379",
        "",
        "# Security",
        "JWT_SECRET=change-this-to-a-secure-secret",
        "",
        "# LLM Providers",
    ])
    
    if config.get('openai_api_key'):
        lines.append(f"OPENAI_API_KEY={config['openai_api_key']}")
    if config.get('anthropic_api_key'):
        lines.append(f"ANTHROPIC_API_KEY={config['anthropic_api_key']}")
    
    if config.get('domain'):
        lines.extend([
            "",
            "# Domain",
            f"DOMAIN={config['domain']}",
            f"BASE_URL=https://{config['domain']}",
        ])
    
    if config['multi_tenant']:
        lines.extend([
            "",
            "# Multi-tenancy",
            "MULTI_TENANT=true",
        ])
    
    return "\n".join(lines)
```

### Deploy Command

```python
# tools/cli/agentforge/commands/deploy.py

import click
import subprocess
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

@click.command()
@click.option('--target', type=click.Choice(['local', 'docker', 'kubernetes', 'aws', 'azure', 'gcp']), 
              help='Deployment target')
@click.option('--dry-run', is_flag=True, help='Show what would be done')
def deploy(target, dry_run):
    """Deploy AgentForge to target environment"""
    
    if not target:
        target = detect_deployment_target()
    
    console.print(f"\n[bold]Deploying to: {target}[/bold]\n")
    
    if dry_run:
        console.print("[yellow]Dry run mode - no changes will be made[/yellow]\n")
    
    deployers = {
        'local': deploy_local,
        'docker': deploy_docker,
        'kubernetes': deploy_kubernetes,
        'aws': deploy_aws,
        'azure': deploy_azure,
        'gcp': deploy_gcp,
    }
    
    deployer = deployers.get(target)
    if deployer:
        deployer(dry_run)
    else:
        console.print(f"[red]Unknown target: {target}[/red]")


def deploy_local(dry_run):
    """Deploy locally with Docker Compose"""
    
    steps = [
        ("Checking Docker...", "docker --version"),
        ("Pulling images...", "docker-compose pull"),
        ("Building custom images...", "docker-compose build"),
        ("Starting services...", "docker-compose up -d"),
        ("Running migrations...", "docker-compose exec api python -m alembic upgrade head"),
        ("Health check...", "curl -s http://localhost:8000/health"),
    ]
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        for description, command in steps:
            task = progress.add_task(description, total=1)
            
            if not dry_run:
                result = subprocess.run(command, shell=True, capture_output=True)
                if result.returncode != 0:
                    console.print(f"[red]Error: {result.stderr.decode()}[/red]")
                    return
            
            progress.update(task, completed=1)
    
    console.print("\n[green]✅ Deployment complete![/green]")
    console.print("\nAccess AgentForge at: [cyan]http://localhost:8000[/cyan]")


def deploy_kubernetes(dry_run):
    """Deploy to Kubernetes cluster"""
    
    steps = [
        ("Checking kubectl...", "kubectl version --client"),
        ("Checking Helm...", "helm version"),
        ("Creating namespace...", "kubectl create namespace agentforge --dry-run=client -o yaml | kubectl apply -f -"),
        ("Installing/upgrading Helm chart...", "helm upgrade --install agentforge ./infrastructure/kubernetes/helm/agentforge -n agentforge -f values.yaml"),
        ("Waiting for rollout...", "kubectl rollout status deployment/agentforge-api-gateway -n agentforge"),
    ]
    
    # Similar progress tracking...
```

---

# 🏢 Multi-Tenancy Architecture

## Overview

AgentForge supports both single-tenant and multi-tenant deployments. This section explains how to implement and configure multi-tenancy.

## Tenant Isolation Strategies

### 1. Database-Level Isolation (Recommended for SaaS)

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Database                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                     Schema: public                      ││
│  │                                                          ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     ││
│  │  │   tenants   │  │    users    │  │   agents    │     ││
│  │  │             │  │  tenant_id  │  │  tenant_id  │     ││
│  │  │  id (PK)    │◀─│  (FK)       │  │  (FK)       │     ││
│  │  │  name       │  │  email      │  │  name       │     ││
│  │  │  domain     │  │  ...        │  │  ...        │     ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘     ││
│  │                                                          ││
│  │  Row-Level Security (RLS) ensures tenant isolation       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

Pros:
✅ Simple to manage
✅ Efficient resource usage
✅ Easy tenant creation

Cons:
❌ Shared resources
❌ Less isolation
```

### 2. Schema-Level Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Database                          │
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │ Schema: acme  │  │ Schema: corp  │  │Schema: startup│  │
│  │               │  │               │  │               │  │
│  │ • users       │  │ • users       │  │ • users       │  │
│  │ • agents      │  │ • agents      │  │ • agents      │  │
│  │ • tools       │  │ • tools       │  │ • tools       │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│                                                             │
│  Each tenant has own schema with identical structure        │
└─────────────────────────────────────────────────────────────┘

Pros:
✅ Better isolation
✅ Per-tenant backups possible
✅ Can customize per tenant

Cons:
❌ More complex management
❌ Schema migrations per tenant
```

### 3. Database-Level Isolation (Enterprise)

```
┌─────────────────────────────────────────────────────────────┐
│                     Database Cluster                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   DB: acme   │  │   DB: corp   │  │ DB: startup  │      │
│  │              │  │              │  │              │      │
│  │  All tables  │  │  All tables  │  │  All tables  │      │
│  │  for Acme    │  │  for Corp    │  │  for Startup │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Each tenant has completely separate database               │
└─────────────────────────────────────────────────────────────┘

Pros:
✅ Complete isolation
✅ Independent scaling
✅ Per-tenant maintenance

Cons:
❌ Highest resource usage
❌ Complex management
❌ Higher cost
```

## Implementation

### Tenant Middleware

```python
# packages/shared/middleware/tenant.py

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware to identify and set tenant context"""
    
    async def dispatch(self, request: Request, call_next):
        # Get tenant from various sources
        tenant_id = await self._get_tenant_id(request)
        
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant not identified")
        
        # Verify tenant exists and is active
        tenant = await self._get_tenant(tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(status_code=403, detail="Invalid or inactive tenant")
        
        # Set tenant in request state
        request.state.tenant_id = tenant_id
        request.state.tenant = tenant
        
        response = await call_next(request)
        return response
    
    async def _get_tenant_id(self, request: Request) -> str:
        """Extract tenant ID from request"""
        
        # Method 1: From subdomain (tenant.agentforge.com)
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            if subdomain not in ["www", "api", "app"]:
                tenant = await self._get_tenant_by_domain(subdomain)
                if tenant:
                    return tenant.id
        
        # Method 2: From header (X-Tenant-ID)
        tenant_header = request.headers.get("X-Tenant-ID")
        if tenant_header:
            return tenant_header
        
        # Method 3: From JWT token (tenant_id claim)
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if token:
            payload = decode_jwt(token)
            if payload and "tenant_id" in payload:
                return payload["tenant_id"]
        
        # Method 4: From query parameter (for API calls)
        tenant_param = request.query_params.get("tenant_id")
        if tenant_param:
            return tenant_param
        
        return None
```

### Tenant-Scoped Queries

```python
# packages/shared/db/tenant_scope.py

from sqlalchemy.orm import Session, Query
from sqlalchemy import event
from contextvars import ContextVar

# Context variable to hold current tenant
current_tenant: ContextVar[str] = ContextVar('current_tenant', default=None)

def get_current_tenant() -> str:
    return current_tenant.get()

def set_current_tenant(tenant_id: str):
    current_tenant.set(tenant_id)

class TenantQuery(Query):
    """Query class that automatically filters by tenant"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def _add_tenant_filter(self):
        tenant_id = get_current_tenant()
        if tenant_id:
            # Check if model has tenant_id column
            for mapper in self.column_descriptions:
                entity = mapper.get('entity')
                if entity and hasattr(entity, 'tenant_id'):
                    self = self.filter(entity.tenant_id == tenant_id)
        return self
    
    def all(self):
        return self._add_tenant_filter().parent_all()
    
    def first(self):
        return self._add_tenant_filter().parent_first()
    
    def get(self, ident):
        return self._add_tenant_filter().parent_get(ident)


class TenantSession(Session):
    """Session that uses tenant-scoped queries"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._query_cls = TenantQuery


# Usage in repository
class AgentRepository:
    def __init__(self, session: TenantSession):
        self.session = session
    
    async def list(self) -> List[Agent]:
        # Automatically filtered by tenant
        return self.session.query(Agent).all()
    
    async def create(self, agent: Agent) -> Agent:
        # Automatically set tenant_id
        agent.tenant_id = get_current_tenant()
        self.session.add(agent)
        await self.session.commit()
        return agent
```

### Tenant Configuration

```python
# packages/shared/config/tenant_config.py

from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from enum import Enum

class TenantPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class PlanLimits(BaseModel):
    """Limits per plan"""
    max_agents: int
    max_users: int
    max_documents: int
    max_storage_gb: int
    max_api_calls_per_month: int
    features: List[str]

PLAN_LIMITS: Dict[TenantPlan, PlanLimits] = {
    TenantPlan.FREE: PlanLimits(
        max_agents=3,
        max_users=2,
        max_documents=100,
        max_storage_gb=1,
        max_api_calls_per_month=1000,
        features=["basic_agents", "basic_tools"]
    ),
    TenantPlan.STARTER: PlanLimits(
        max_agents=10,
        max_users=5,
        max_documents=500,
        max_storage_gb=5,
        max_api_calls_per_month=10000,
        features=["basic_agents", "basic_tools", "api_tools", "email_tools"]
    ),
    TenantPlan.PROFESSIONAL: PlanLimits(
        max_agents=50,
        max_users=20,
        max_documents=5000,
        max_storage_gb=50,
        max_api_calls_per_month=100000,
        features=["all_agents", "all_tools", "custom_tools", "analytics"]
    ),
    TenantPlan.ENTERPRISE: PlanLimits(
        max_agents=-1,  # Unlimited
        max_users=-1,
        max_documents=-1,
        max_storage_gb=-1,
        max_api_calls_per_month=-1,
        features=["all_agents", "all_tools", "custom_tools", "analytics", "sso", "audit_logs", "sla"]
    ),
}

class TenantConfig(BaseModel):
    """Tenant-specific configuration"""
    
    id: str
    name: str
    plan: TenantPlan = TenantPlan.FREE
    
    # Customization
    branding: Optional[Dict[str, Any]] = None  # Logo, colors
    custom_domain: Optional[str] = None
    
    # Features
    enabled_llm_providers: List[str] = ["openai"]
    enabled_tools: List[str] = ["knowledge_base", "api"]
    
    # Limits (override plan defaults)
    custom_limits: Optional[Dict[str, int]] = None
    
    # Settings
    settings: Dict[str, Any] = {}
    
    def get_limit(self, limit_name: str) -> int:
        """Get limit value, considering custom overrides"""
        if self.custom_limits and limit_name in self.custom_limits:
            return self.custom_limits[limit_name]
        return getattr(PLAN_LIMITS[self.plan], limit_name)
    
    def has_feature(self, feature: str) -> bool:
        """Check if tenant has access to a feature"""
        return feature in PLAN_LIMITS[self.plan].features
```

### Tenant Provisioning

```python
# packages/auth-service/src/services/tenant_service.py

from typing import Optional
from shared.models.tenant import Tenant
from shared.db.repository import TenantRepository

class TenantService:
    def __init__(self, repository: TenantRepository):
        self.repository = repository
    
    async def provision_tenant(
        self,
        name: str,
        admin_email: str,
        plan: str = "free",
        custom_domain: Optional[str] = None
    ) -> Tenant:
        """Provision a new tenant with all required resources"""
        
        # 1. Create tenant record
        tenant = Tenant(
            name=name,
            plan=plan,
            custom_domain=custom_domain,
        )
        tenant = await self.repository.create(tenant)
        
        # 2. Create default roles
        await self._create_default_roles(tenant.id)
        
        # 3. Create admin user
        await self._create_admin_user(tenant.id, admin_email)
        
        # 4. Initialize default settings
        await self._initialize_settings(tenant.id)
        
        # 5. Send welcome email
        await self._send_welcome_email(admin_email, tenant)
        
        return tenant
    
    async def _create_default_roles(self, tenant_id: str):
        """Create default roles for new tenant"""
        default_roles = [
            {"id": f"{tenant_id}_admin", "name": "Admin", "permissions": ["*"]},
            {"id": f"{tenant_id}_user", "name": "User", "permissions": ["agents:read", "agents:create"]},
            {"id": f"{tenant_id}_viewer", "name": "Viewer", "permissions": ["agents:read"]},
        ]
        for role_data in default_roles:
            await self.role_repository.create(Role(**role_data, tenant_id=tenant_id))
    
    async def _create_admin_user(self, tenant_id: str, email: str):
        """Create admin user for tenant"""
        user = User(
            tenant_id=tenant_id,
            email=email,
            role_ids=[f"{tenant_id}_admin"],
            status="pending",  # Will activate after email verification
        )
        await self.user_repository.create(user)
        await self._send_activation_email(user)
```

## Configuration Options

```yaml
# config/multi-tenant.yaml

multi_tenancy:
  enabled: true
  
  # Tenant identification method
  identification:
    subdomain: true      # tenant.agentforge.com
    header: true         # X-Tenant-ID header
    jwt_claim: true      # tenant_id in JWT
    query_param: false   # ?tenant_id= (not recommended)
  
  # Isolation level
  isolation: "row"       # row | schema | database
  
  # Default tenant (for single-tenant mode)
  default_tenant: "default"
  
  # Tenant limits
  limits:
    enforce: true
    grace_period_days: 7  # Days after limit exceeded before enforcement
  
  # Provisioning
  provisioning:
    auto_create: false    # Auto-create tenant on first request
    require_approval: true
    webhook_url: null     # Notify on tenant creation
  
  # Cleanup
  cleanup:
    soft_delete: true
    retention_days: 30
    auto_archive_inactive_days: 90
```

---

# 📡 API Reference

## Main Endpoints

### Agents (Chat Agents)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents (ownership + delegated access) |
| GET | `/api/agents/accessible` | List published/accessible agents for the user |
| POST | `/api/agents` | Create agent |
| GET | `/api/agents/{agent_id}` | Get agent (⚠️ must enforce access control) |
| PUT | `/api/agents/{agent_id}` | Update agent (owner/delegated admin checks) |
| DELETE | `/api/agents/{agent_id}` | Delete agent (owner only) |
| POST | `/api/agents/generate-config` | LLM generate agent config |
| POST | `/api/agents/{agent_id}/start-chat` | Start end-user chat session |
| POST | `/api/agents/{agent_id}/chat` | Chat with agent |
| POST | `/api/agents/{agent_id}/chat/stream` | Streaming chat |

### Tools
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools` | List tools (with access filtering) |
| GET | `/api/tools/accessible` | List tools accessible to user |
| POST | `/api/tools` | Create tool |
| GET | `/api/tools/{tool_id}` | Get tool |
| PUT | `/api/tools/{tool_id}` | Update tool |
| DELETE | `/api/tools/{tool_id}` | Delete tool |
| POST | `/api/tools/{tool_id}/documents` | Upload document for KB/RAG ingestion |
| POST | `/api/tools/{tool_id}/scrape` | Scrape website tool URL(s) |
| POST | `/api/tools/{tool_id}/ask` | Ask a KB tool (RAG) |
| POST | `/api/tools/{tool_id}/search` | Search KB tool |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/test-llm` | Test LLM providers |

### Security (Auth/MFA/OAuth/RBAC)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/security/auth/login` | Login (may return MFA challenge) |
| POST | `/api/security/auth/logout` | Logout |
| POST | `/api/security/auth/refresh` | Refresh token |
| GET | `/api/security/auth/me` | Current user profile |
| POST | `/api/security/auth/register` | Register |
| POST | `/api/security/auth/forgot-password` | Forgot password |
| POST | `/api/security/auth/reset-password` | Reset password |
| POST | `/api/security/mfa/enable` | Enable MFA |
| POST | `/api/security/mfa/verify` | Verify MFA |
| GET/POST/PUT/DELETE | `/api/security/users` | Users management (admin) |
| GET/POST/PUT/DELETE | `/api/security/roles` | Roles management (admin) |
| GET/POST/PUT/DELETE | `/api/security/groups` | Groups management |
| GET/POST/PUT/DELETE | `/api/security/policies` | Policy management |

### Access Control (Delegated Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/access-control/agents/{agent_id}/access` | Agent ACL (users/groups/departments) |
| GET/PUT | `/api/access-control/agents/{agent_id}/tasks` | Task permissions matrix |
| GET/PUT | `/api/access-control/agents/{agent_id}/tools` | Tool permissions |

### Demo Lab
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lab/generate/document` | Generate document (docx/pdf/xlsx/pptx) |
| POST | `/api/lab/generate/image` | Generate document-like image |
| POST | `/api/lab/generate/api` | Generate mock API dataset |
| GET | `/api/lab/download/{item_id}` | Download generated artifact |

### Process Execution (Workflows)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/process/wizard/generate` | Generate visual builder workflow from prompt |
| POST | `/process/execute` | Execute a process definition |
| GET | `/process/executions` | List executions |
| GET | `/process/approvals` | List approvals |

---

# 📚 Repository File Reference

This section explains **what each tracked file does** in the current repository.
It is grouped by directory to keep it readable.

## Root (project-level files)

| Path | What it is / what it contains |
|------|-------------------------------|
| `.cursorrules` | Cursor AI guardrails and DB rules (must-read before DB work) |
| `.env.example` | Example environment variables for local dev |
| `.gitignore` | Git ignore rules (note: keeps `AgentForge_Logo.png` tracked) |
| `.redeploy-trigger` | Marker file used to trigger redeploys (ops convenience) |
| `AgentForge_Logo.png` | Product logo (served at `/AgentForge_Logo.png`) |
| `Dockerfile` | Container build for FastAPI server + UI assets |
| `docker-compose.yml` | Local docker compose (app + Postgres) |
| `requirements.txt` | Python dependencies for API/engines/UI-serving |
| `run.py` | Convenience entrypoint to run `uvicorn api.main:app` |
| `setup_demo_db.sh` | Shell script for bootstrapping a demo DB (local/dev ops) |
| `alembic.ini` | Alembic configuration |
| `PROJECT_STATUS.md` | Canonical “start here” current status + rules summary |
| `README.md` | Repository landing page + quick start (kept intentionally short) |

## `alembic/` (database migrations)

| Path | Purpose |
|------|---------|
| `alembic/env.py` | Alembic environment setup (DB URL, metadata) |
| `alembic/script.py.mako` | Alembic revision template |
| `alembic/versions/001_add_website_tooltype.py` | No-op (historical): tooltype enum extension (now VARCHAR) |
| `alembic/versions/002_add_tool_access_control.py` | Adds tool access control columns to `tools` |
| `alembic/versions/003_add_process_agent_support.py` | Adds process-agent columns + process execution tables |
| `alembic/versions/004_add_process_settings_tables.py` | Adds org settings + node types + templates tables |
| `alembic/versions/005_add_approval_assigned_group_ids.py` | Adds `assigned_group_ids` to approval requests |
| `alembic/versions/006_add_lab_history_items.py` | Adds `lab_history_items` table |
| `alembic/versions/007_add_lab_mock_apis.py` | Adds `lab_mock_apis` table |

## `api/` (FastAPI application)

| Path | Purpose |
|------|---------|
| `api/__init__.py` | Python package marker for `api` |
| `api/main.py` | Main FastAPI app: UI serving, agents/tools/settings endpoints, chat runtime (LLM + tools + RAG), startup/loading, misc assets |
| `api/security.py` | Security router under `/api/security`: auth, MFA, OAuth, users/roles/groups, policies, audit |
| `api/health.py` | Health router under `/api/health`: DB/overall health checks |
| `api/modules/__init__.py` | Python package marker for `api.modules` |
| `api/modules/` | Feature modules (routers + services + schemas) |

### `api/modules/access_control/`
| Path | Purpose |
|------|---------|
| `api/modules/access_control/__init__.py` | Package marker; exports the module router |
| `api/modules/access_control/router.py` | HTTP API under `/api/access-control` for agent ACL + delegated admin config |
| `api/modules/access_control/service.py` | Business logic: agent access, task/tool permissions, delegated admin rules |
| `api/modules/access_control/schemas.py` | Pydantic request/response models for access control |

### `api/modules/conversations/`
| Path | Purpose |
|------|---------|
| `api/modules/conversations/__init__.py` | Package marker; exports the module router |
| `api/modules/conversations/router.py` | HTTP API under `/api/conversations` |
| `api/modules/conversations/service.py` | DB-backed conversation operations (list/get/create) |

### `api/modules/lab/`
| Path | Purpose |
|------|---------|
| `api/modules/lab/__init__.py` | Package marker |
| `api/modules/lab/router.py` | HTTP API under `/api/lab` for lab generation + downloads |
| `api/modules/lab/service.py` | Document/image/mock API generation (uses optional deps + LLM) |
| `api/modules/lab/schemas.py` | Pydantic models for lab endpoints |

### `api/modules/process/`
| Path | Purpose |
|------|---------|
| `api/modules/process/__init__.py` | Package marker |
| `api/modules/process/router.py` | HTTP API under `/process`: wizard generate, execute, executions, approvals, config/templates |
| `api/modules/process/service.py` | Bridges API ↔ process engine; normalization from builder to engine; tool filtering via ACL |
| `api/modules/process/schemas.py` | Pydantic models for process endpoints |

## `core/` (engines and reusable libraries)

| Path | Purpose |
|------|---------|
| `core/__init__.py` | Python package marker for `core` |
| `core/feature_flags.py` | Feature flag definitions/toggles used across modules |

### `core/agent/`
| Path | Purpose |
|------|---------|
| `core/agent/__init__.py` | Package marker |
| `core/agent/engine.py` | Conversational agent execution loop (messages, tools, guardrails) |
| `core/agent/generator.py` | Agent config generation helpers |

### `core/llm/`
| Path | Purpose |
|------|---------|
| `core/llm/__init__.py` | Package marker |
| `core/llm/base.py` | Core LLM interface + message schema |
| `core/llm/factory.py` | Provider factory/registration for core LLM layer |
| `core/llm/registry.py` | Model registry (available models/providers) |
| `core/llm/router.py` | Model/provider routing logic |
| `core/llm/instruction_enforcer.py` | Guardrail layer to enforce system instructions |
| `core/llm/providers/__init__.py` | Package marker for providers |
| `core/llm/providers/openai.py` | OpenAI + Azure OpenAI provider implementation (core layer) |
| `core/llm/providers/anthropic.py` | Anthropic provider (core layer) |
| `core/llm/providers/ollama.py` | Ollama provider (core layer) |

### `core/security/`
| Path | Purpose |
|------|---------|
| `core/security/__init__.py` | Package marker |
| `core/security/models.py` | Pydantic models/enums for users/roles/policies |
| `core/security/engine.py` | PolicyEngine (RBAC + ABAC evaluation) |
| `core/security/services.py` | Token, MFA, password, OAuth services |
| `core/security/state.py` | SecurityState cache + DB/JSON load/save + permission checks |

### `core/tools/`
| Path | Purpose |
|------|---------|
| `core/tools/__init__.py` | Package marker |
| `core/tools/base.py` | Tool base classes (`ToolDefinition`, `ToolConfig`, `ToolRegistry`) |
| `core/tools/builtin/__init__.py` | Package marker for builtin tools |
| `core/tools/builtin/api.py` | Builtin API/GraphQL/Webhook tools (process runtime) |
| `core/tools/builtin/database.py` | Builtin database tool (process runtime) |
| `core/tools/builtin/rag.py` | Builtin RAG tool (process runtime, vector DB oriented) |

### `core/process/` (workflow engine + wizard)
| Path | Purpose |
|------|---------|
| `core/process/__init__.py` | Package marker; exports main process types |
| `core/process/schemas.py` | Workflow definition schema (nodes/edges/settings) |
| `core/process/engine.py` | Workflow execution engine (step runner, state, transitions) |
| `core/process/state.py` | Process state (variables, interpolation) |
| `core/process/result.py` | Execution result structure |
| `core/process/messages.py` | Structured engine messages/logging |
| `core/process/wizard.py` | LLM-driven workflow generator + validation/guardrails |
| `core/process/platform_knowledge.py` | RAG-lite retrieval over KB markdown + safe taxonomies parsing |
| `core/process/services/__init__.py` | Service package marker |
| `core/process/services/approval.py` | Approval service used by approval nodes |
| `core/process/services/notification.py` | Notification dispatch service |
| `core/process/nodes/__init__.py` | Node executors package marker |
| `core/process/nodes/base.py` | Base executor interfaces + registry |
| `core/process/nodes/flow.py` | Start/End/Merge executors (flow control) |
| `core/process/nodes/logic.py` | Condition/Switch/Loop/Parallel executors (logic control) |
| `core/process/nodes/task.py` | AI task + tool call executors |
| `core/process/nodes/human.py` | Approval/Notification/human-step executors |
| `core/process/nodes/integration.py` | HTTP/database/file operation executors (incl. generate_document) |
| `core/process/nodes/data.py` | Transform/validate/filter/map executors |
| `core/process/nodes/timing.py` | Delay executor |

## `database/` (DB layer)

| Path | Purpose |
|------|---------|
| `database/__init__.py` | DB package entrypoint (lazy imports / convenience exports) |
| `database/README.md` | DB usage notes (high-level) |
| `database/base.py` | SQLAlchemy Base + engine/session + `init_db()` |
| `database/config.py` | DB configuration loader |
| `database/column_types.py` | DB-agnostic UUID/JSON/JSONArray types |
| `database/enums.py` | Central enums (stored as strings) |
| `database/init_db.py` | CLI script to initialize DB + run migrations |
| `database/COMMON_ISSUES.md` | DB pitfalls + prevention checklist (mandatory before DB work) |

### `database/models/` (SQLAlchemy models)
| Path | What it represents |
|------|---------------------|
| `database/models/__init__.py` | Exports model classes |
| `database/models/organization.py` | `organizations` table (tenants) |
| `database/models/role.py` | `roles`, `permissions`, `role_permissions` tables |
| `database/models/user.py` | `users`, `user_sessions`, `mfa_settings`, `password_history` |
| `database/models/invitation.py` | `invitations` table |
| `database/models/department.py` | `departments` table |
| `database/models/user_group.py` | `user_groups` table |
| `database/models/policy.py` | `policies` table (ABAC policies) |
| `database/models/tool.py` | `tools`, `tool_executions` tables |
| `database/models/tool_permission.py` | `tool_permissions` table |
| `database/models/kb_permission.py` | `kb_permissions` table |
| `database/models/db_permission.py` | `db_permissions` table |
| `database/models/ldap_config.py` | `ldap_configs` table |
| `database/models/oauth_config.py` | `oauth_configs` table |
| `database/models/security_settings.py` | `security_settings` table |
| `database/models/agent.py` | `agents` table |
| `database/models/agent_access.py` | `agent_access_policies`, `agent_action_policies`, deployments/sessions tables |
| `database/models/conversation.py` | `conversations`, `messages`, `conversation_shares` |
| `database/models/knowledge_base.py` | `knowledge_bases`, `documents`, `document_chunks`, `kb_queries` |
| `database/models/settings.py` | `system_settings`, `organization_settings`, `api_keys`, `integrations`, `user_integrations` |
| `database/models/audit.py` | `audit_logs`, `security_events`, `data_exports`, `compliance_reports` |
| `database/models/process_execution.py` | `process_executions`, `process_node_executions`, `process_approval_requests` |
| `database/models/process_settings.py` | `process_org_settings`, `process_node_types`, `process_templates` |
| `database/models/lab_history.py` | `lab_history_items` |
| `database/models/lab_mock_api.py` | `lab_mock_apis` |

### `database/services/` (service layer)
| Path | Purpose |
|------|---------|
| `database/services/__init__.py` | Package marker |
| `database/services/encryption.py` | Encryption helpers used for secrets at rest |
| `database/services/organization_service.py` | Organization CRUD |
| `database/services/role_service.py` | Role CRUD |
| `database/services/user_service.py` | User CRUD + auth-related DB operations |
| `database/services/user_group_service.py` | Group CRUD |
| `database/services/department_service.py` | Department CRUD |
| `database/services/invitation_service.py` | Invitation flows |
| `database/services/security_settings_service.py` | Security settings CRUD |
| `database/services/system_settings_service.py` | Platform/system settings CRUD |
| `database/services/audit_service.py` | Audit logs persistence |
| `database/services/tool_service.py` | Tool CRUD + executions persistence |
| `database/services/agent_service.py` | Agent CRUD |
| `database/services/conversation_service.py` | Conversation + message persistence |
| `database/services/process_settings_service.py` | Process org settings + node types + templates |
| `database/services/process_execution_service.py` | Process execution persistence |

## `ui/` (frontend)

| Path | Purpose |
|------|---------|
| `ui/index.html` | Admin portal (agent wizard, tools/KB setup, security center, process wizard entry) |
| `ui/process-builder.html` | Visual workflow builder (edit, test run, playback, auto-layout, properties) |
| `ui/chat.html` | End-user portal (auth + chat) |
| `ui/lab.html` | Demo Lab UI |
| `ui/theme.css` | Shared styling |
| `ui/theme.js` | Shared theme behavior (dark/light, persistence) |

## `scripts/` (maintenance)

This folder contains operational scripts for DB migration/repairs and validation.

| Path | Purpose |
|------|---------|
| `scripts/README.md` | Documentation for DB validation + migration scripts |
| `scripts/comprehensive_db_check.sh` | Primary DB validation script (blocks commits via pre-commit hook) |
| `scripts/migrate_to_db_complete.py` | Migrate JSON seed data into PostgreSQL (multi-entity) |
| `scripts/create_missing_tables.py` | Bootstrap missing DB tables/columns in some environments |
| `scripts/add_user_columns.py` | One-off migration helper (users table columns) |
| `scripts/add_role_columns.py` | One-off migration helper (roles table columns) |
| `scripts/add_organization_oauth_columns.py` | One-off migration helper (org OAuth columns) |
| `scripts/add_google_oauth_credentials.py` | One-off helper to insert Google OAuth creds |
| `scripts/fix_all_enums_to_string.py` | One-off helper to convert enums → strings (DB-agnostic) |
| `scripts/fix_agent_status_enum.py` | One-off helper to fix agent status enum issues |
| `scripts/fix_agent_status_to_string.py` | One-off helper: agent status conversion |
| `scripts/fix_message_role_to_string.py` | One-off helper: message role conversion |
| `scripts/make_password_hash_nullable.py` | One-off helper: allow NULL password hashes (migration compatibility) |
| `scripts/auto-commit.sh` | Optional helper script for auto-commit workflow (local dev ops) |

## `docs/` (documentation + runtime KB files)

| Path | Purpose |
|------|---------|
| `docs/MASTER_DOCUMENTATION_UPDATED.md` | Canonical engineering documentation |
| `docs/PROCESS_BUILDER_KB_SHAPES.md` | Runtime KB: supported builder nodes + field schemas |
| `docs/PROCESS_BUILDER_KB_ROUTING.md` | Runtime KB: layout/routing rules |
| `docs/PROCESS_BUILDER_KB_TAXONOMIES.md` | Runtime KB: safe dropdown option taxonomies |
| `docs/PROCESS_BUILDER_KB_PROFILE_CONTEXT.md` | Runtime KB: available `currentUser.*` context |
| `docs/PROCESS_BUILDER_KB_DOCUMENTS.md` | Runtime KB: upload/generate document guidance |

## `examples/` (example assets)

| Path | Purpose |
|------|---------|
| `examples/customer-support.yaml` | Example agent configuration/spec used as a reference/demo input |

## `data/` and `uploads/` (local storage)

| Path | Purpose |
|------|---------|
| `data/.gitkeep` | Keep empty dir in git |
| `data/security/audit_logs.json` | JSON backup/seed: audit logs |
| `data/security/db_permissions.json` | JSON backup/seed: DB permissions |
| `data/security/departments.json` | JSON backup/seed: departments |
| `data/security/groups.json` | JSON backup/seed: groups |
| `data/security/invitations.json` | JSON backup/seed: invitations |
| `data/security/kb_permissions.json` | JSON backup/seed: KB permissions |
| `data/security/ldap_configs.json` | JSON backup/seed: LDAP configs |
| `data/security/oauth_configs.json` | JSON backup/seed: OAuth configs |
| `data/security/organizations.json` | JSON backup/seed: organizations |
| `data/security/policies.json` | JSON backup/seed: ABAC policies |
| `data/security/roles.json` | JSON backup/seed: roles |
| `data/security/settings.json` | JSON backup/seed: security settings |
| `data/security/tool_permissions.json` | JSON backup/seed: tool permissions |
| `data/security/users.json` | JSON backup/seed: users |
| `uploads/.gitkeep` | Keep uploads dir in git |

---

# 🗺️ Recommendations & Roadmap

## Implementation Priority

### ✅ Phase 1: Foundation - **COMPLETED (January 2026)**
| Task | Status | Completion |
|------|--------|------------|
| Database migration (PostgreSQL) | ✅ **COMPLETE** | 100% - Database-first architecture operational |
| Database service layer | ✅ **COMPLETE** | 100% - All CRUD operations via services |
| Security module database integration | ✅ **COMPLETE** | 100% - All security data in database |
| Platform settings database integration | ✅ **COMPLETE** | 100% - All settings in database |
| OAuth MFA verification | ✅ **COMPLETE** | 100% - Full OAuth MFA flow with database persistence |
| User profile database persistence | ✅ **COMPLETE** | 100% - Profile updates saved to database |
| MFA settings database persistence | ✅ **COMPLETE** | 100% - MFA enabled/disabled saved to database |
| Setup monorepo structure | 🔴 **PENDING** | 0% - Still monolithic |
| Add CI/CD pipeline | 🔴 **PENDING** | 0% - Manual deployments |
| Add rate limiting | 🔴 **PENDING** | 0% - Not implemented |

### Phase 2: Backend Modularization (Weeks 5-10)
| Task | Effort | Impact |
|------|--------|--------|
| Extract Auth Service | 1 week | High |
| Extract Agent Service | 1 week | High |
| Extract LLM Service | 1 week | Medium |
| Extract RAG Service | 1 week | Medium |
| Add Redis caching | 3 days | Medium |

### Phase 3: Frontend Modernization (Weeks 11-16)
| Task | Effort | Impact |
|------|--------|--------|
| Setup React project | 3 days | High |
| Migrate Auth pages | 1 week | High |
| Migrate Agent pages | 2 weeks | High |
| Migrate remaining pages | 2 weeks | Medium |

### Phase 4: Enterprise Features (Weeks 17-24)
| Task | Effort | Impact |
|------|--------|--------|
| Multi-tenancy | 3 weeks | High |
| Kubernetes deployment | 2 weeks | High |
| CLI & Installation Wizard | 1 week | Medium |
| Multi-cloud Terraform | 2 weeks | Medium |

## Estimated Timeline

```
Month 1-2: Foundation + Backend Modularization
Month 3-4: Frontend Modernization
Month 5-6: Enterprise Features + Testing
Month 7:   Documentation + Launch Preparation
```

---

# 📝 Documentation Maintenance

## Update Triggers

| Event | Action |
|-------|--------|
| New feature | Add to Features section |
| Architecture change | Update diagrams |
| New deployment option | Add to Deployment Guide |
| API change | Update API Reference |
| Quarterly | Full review |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 11, 2026 | Initial comprehensive documentation |
| 1.1 | Jan 14, 2026 | Updated with database migration completion, OAuth MFA, database schema documentation |
| 3.5 | Feb 10, 2026 | Process Builder documentation, grounded workflow generation (KB/RAG-lite), doc consolidation + updated file reference |

## Optional: GitHub CLI Setup (for automated push workflows)

If your workflow needs GitHub authentication on the machine (e.g., to enable scripted pushes), configure GitHub CLI:

```bash
# Install (macOS)
brew install gh

# Login
gh auth login

# Verify
gh auth status
```

Then regular `git push origin main` should work without re-auth prompts (depending on your Git credential helper configuration).

---

# 👥 Support

- **GitHub:** https://github.com/ahamdihussein-star/agentforge
- **Production:** https://agentforge2.up.railway.app
- **Railway Project:** agentforge2
- **Domain:** agentforge.to

---

---

# 🚀 Next Steps & Future Development

## Immediate Next Steps (Priority Order)

### 1. **Security Hardening (Authorization Gaps + Rate Limiting)** (Critical)
- **Status:** Core security is strong, but some endpoints bypass authorization.
- **Tasks:**
  - Require auth + enforce agent ACL on `GET /api/agents/{agent_id}`.
  - Protect agent memory endpoints under `/api/agents/{agent_id}/memory*` (owner/delegated checks).
  - Secure `/api/access-control/check/{agent_id}` and `/api/access-control/preview/{agent_id}` (derive user identity from auth; avoid user_id in query).
  - Add API rate limiting middleware (per-user/per-endpoint).

### 2. **Process Builder End-to-End Triggers + Files** (High)
- **Status:** Visual builder + execution works for manual runs; triggers/files/outputs need completion.
- **Tasks:**
  - Implement schedule trigger execution (cron runner / queue) and webhook ingestion end-to-end.
  - Implement file upload persistence for process executions (store content, not just metadata).
  - Add a safe download API/UI for process outputs (generated documents).

### 3. **Unify Tool Runtimes (Chat vs Process)** (High)
- **Status:** There are two tool execution paths with overlapping tool concepts.
- **Tasks:**
  - Decide a single source of truth for tool execution and schemas.
  - Replace placeholder executors in chat runtime (e.g., `database`, `websearch`) or clearly mark them as unavailable in UI.
  - Align tool access control checks consistently in both runtimes.

### 4. **Knowledge Base DB-Backed Pipeline** (Medium)
- **Status:** Monolith KB ingestion/search exists; DB schema exists; wiring is incomplete.
- **Tasks:**
  - Persist KB documents/chunks to DB models (`knowledge_bases`, `documents`, `document_chunks`).
  - Add background re-indexing jobs and vector store synchronization.

### 5. **Testing + CI** (Medium)
- **Status:** No automated tests or CI gates.
- **Tasks:**
  - Add unit/integration tests for security, access control, process normalization/execution.
  - Add formatting/linting + GitHub Actions CI workflow.

### 6. **Observability & Reliability** (Medium)
- **Tasks:**
  - Structured logging (JSON), consistent error envelopes, request correlation IDs.
  - DB backups/restore runbooks; monitoring and alerting.

### 7. **Frontend Modernization (Long-term)** (High effort)
- **Status:** Still monolithic (~32K lines in `ui/index.html`).
- **Tasks:** migrate to a component-based frontend (React/Vue + TypeScript).

### 8. **Backend Modularization (Long-term)** (High effort)
- **Status:** Still monolithic (~16K lines in `api/main.py`).
- **Tasks:** extract modules/services or move to a package-based structure.

## Code Agent Guidelines

**Where to Make Changes:**

1. **Database Operations:**
   - **Location:** `database/services/`
   - **Pattern:** Use service classes (UserService, RoleService, etc.)
   - **Never:** Direct SQLAlchemy queries in API endpoints
   - **Always:** Use service methods for CRUD operations

2. **Security Operations:**
   - **Location:** `api/security.py`
   - **Pattern:** Use database services, update SecurityState cache
   - **Never:** Direct database queries in security endpoints
   - **Always:** Save to database first, then update in-memory cache

3. **State Management:**
   - **Location:** `core/security/state.py`
   - **Pattern:** Database-first, JSON fallback
   - **Never:** Modify JSON files directly
   - **Always:** Use database services for persistence

4. **Model Changes:**
   - **Location:** `database/models/`
   - **Pattern:** Use database-agnostic types from `database/column_types.py`
   - **Never:** Use PostgreSQL-specific types directly
   - **Always:** Add migration script for schema changes

5. **API Endpoints:**
   - **Location:** `api/security.py`, `api/main.py`
   - **Pattern:** Use database services, add comprehensive logging
   - **Never:** Bypass service layer
   - **Always:** Handle errors gracefully with fallback

**Important Files for Code Agents:**

- **Database Schema:** `database/models/` - All model definitions
- **Database Services:** `database/services/` - All CRUD operations
- **Database Configuration:** `database/config.py` - Connection settings
- **Security State:** `core/security/state.py` - In-memory cache management
- **Security API:** `api/security.py` - All security endpoints
- **Migration Scripts:** `scripts/migrate_to_db_complete.py` - Data migration
- **Common Issues:** `database/COMMON_ISSUES.md` - Documented issues and solutions

**Database Schema Reference:**

- **Users:** `database/models/user.py` - User, UserSession, MFASetting, PasswordHistory
- **Roles:** `database/models/role.py` - Role, Permission
- **Organizations:** `database/models/organization.py` - Organization with OAuth settings
- **Settings:** `database/models/settings.py` - SystemSetting, OrganizationSetting
- **Security:** `database/models/security_settings.py` - SecuritySettings
- **Audit:** `database/models/audit.py` - AuditLog

**Key Patterns to Follow:**

1. **Database-First:** Always save to database first, JSON as backup
2. **Service Layer:** All database operations through services
3. **Error Handling:** Try-except with comprehensive logging
4. **JSON Parsing:** Handle double-encoding (role_ids, permissions)
5. **UUID Conversion:** Convert string IDs to UUIDs when needed
6. **Enum Mapping:** Map between Core enums and DB enums (MFAMethod)
7. **Profile Mapping:** Map profile fields between Core and DB models

---

*Last Updated: February 10, 2026*  
*Document Version: 3.5*  
*Platform Version: 3.5*
