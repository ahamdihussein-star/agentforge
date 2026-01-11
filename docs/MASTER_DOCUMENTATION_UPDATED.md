# 🔥 AgentForge Master Documentation
## Enterprise AI Agent Builder Platform

**Version:** 3.3  
**Last Updated:** January 11, 2026  
**GitHub:** https://github.com/ahamdihussein-star/agentforge  
**Production:** https://agentforge2.up.railway.app  
**Railway Project:** agentforge2  
**Domain:** agentforge.to

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

## Part 3: Technical Assessment
11. [Platform Assessment](#-platform-assessment)
12. [Gap Analysis](#-gap-analysis)
13. [Code Quality](#-code-quality)

## Part 4: Modernization & Best Practices
14. [Code Modernization Strategy](#-code-modernization-strategy)
15. [Database Migration Plan](#-database-migration-plan)
16. [UI/UX Modernization](#-uiux-modernization)

## Part 5: Deployment & Operations
17. [Deployment Architecture](#-deployment-architecture)
18. [Multi-Cloud Deployment Guide](#-multi-cloud-deployment-guide)
19. [Installation Wizard & CLI](#-installation-wizard--cli)
20. [Multi-Tenancy Architecture](#-multi-tenancy-architecture)

## Part 6: Maintenance
21. [API Reference](#-api-reference)
22. [Recommendations & Roadmap](#-recommendations--roadmap)
23. [Documentation Maintenance](#-documentation-maintenance)

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
- ✅ Comprehensive security module with RBAC, MFA, OAuth
- ✅ AI-powered agent generation (fully dynamic)
- ✅ Multi-LLM support with tool calling
- ✅ Demo Lab with realistic data generation
- ✅ Clean core abstractions (LLM, Tools interfaces)

## Critical Issues Requiring Immediate Attention
- 🔴 **Monolithic Code** - 11,800 lines in main.py, 17,500 in index.html
- 🔴 **JSON File Storage** - Not scalable, no transactions
- 🔴 **No Containerization Strategy** - Difficult multi-cloud deployment
- 🔴 **No Multi-tenancy** - Can't run as SaaS
- 🔴 **No CI/CD Pipeline** - Manual deployments

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

## Backend Improvements
- `UpdateToolRequest` model includes `is_active` field
- Smart config change detection in `update_tool` endpoint
- Proper async scraping with result tracking

## Deployment
- **Production URL:** https://agentforge2.up.railway.app
- **Railway Project:** agentforge2
- Auto-deploy from main branch

---

# 🏗️ System Architecture

## Current Architecture (Monolithic)

```
┌──────────────────────────────────────────────────────────────────┐
│                     CURRENT ARCHITECTURE                          │
│                        (Monolithic)                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    ui/index.html                             │ │
│  │                   (17,500 lines)                             │ │
│  │    Login │ Hub │ Studio │ Tools │ KB │ Demo │ Settings      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    api/main.py                               │ │
│  │                   (11,800 lines)                             │ │
│  │   Agents │ Chat │ Tools │ RAG │ Demo │ Settings │ Email     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    JSON Files                                │ │
│  │         agents.json │ tools.json │ users.json               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

Problems:
❌ Single point of failure
❌ Cannot scale horizontally  
❌ No separation of concerns
❌ Difficult to test
❌ Hard to deploy across clouds
❌ No multi-tenancy support
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
| Frontend | Vanilla JS (17.5K lines) | React/Vue + TypeScript | High |
| API | FastAPI Monolith | FastAPI Modular Services | Medium |
| Database | JSON Files | PostgreSQL + Redis | High |
| Vector DB | ChromaDB | ChromaDB/Pinecone/Qdrant | Low |
| Queue | None | RabbitMQ/Redis | Medium |
| Cache | None | Redis | Low |
| Container | Docker | Docker + K8s Ready | Medium |
| CI/CD | None | GitHub Actions | Low |

---

# 📁 Folder Structure

## Current Structure

```
agentforge/                    # ❌ Flat, monolithic
├── api/
│   ├── main.py               # ❌ 11,800 lines - too large
│   └── security.py           # ✅ 2,200 lines - acceptable
├── core/                     # ✅ Well structured
│   ├── agent/
│   ├── llm/
│   ├── security/
│   └── tools/
├── ui/
│   └── index.html            # ❌ 17,500 lines - too large
├── data/                     # ❌ JSON file storage
│   ├── agents.json
│   ├── tools.json
│   └── security/
└── docker-compose.yml
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
| Google Gemini | 🔴 | High | Low |
| AWS Bedrock | 🔴 | High | Medium |
| Azure OpenAI | 🔶 | High | Low |
| Groq | 🔴 | Medium | Low |
| Mistral | 🔴 | Medium | Low |

### Tools
| Tool | Status | Priority | Effort |
|------|--------|----------|--------|
| API Tool | ✅ | - | - |
| Database Tool | ✅ | - | - |
| RAG Tool | ✅ | - | - |
| Email Tool | ✅ | - | - |
| Website Scraping | ✅ | - | - |
| Web Search | ✅ | - | - |
| Slack | ✅ | - | - |
| Webhook | ✅ | - | - |
| Spreadsheet | 🔶 | Medium | Medium |
| Calendar | 🔶 | Low | Medium |
| CRM Integration | 🔶 | Low | High |

### Security
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| JWT Auth | ✅ | - | - |
| RBAC (32 permissions) | ✅ | - | - |
| MFA (TOTP) | ✅ | - | - |
| MFA (Email) | ✅ | - | - |
| Google OAuth | ✅ | - | - |
| Microsoft OAuth | 🔶 | High | Low |
| SAML SSO | 🔴 | High | High |
| API Rate Limiting | 🔴 | Critical | Low |

### Infrastructure
| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Docker Deployment | ✅ | - | - |
| Kubernetes Ready | 🔴 | Critical | High |
| Multi-Cloud Support | 🔴 | Critical | High |
| Multi-Tenancy | 🔴 | Critical | High |
| CI/CD Pipeline | 🔴 | Critical | Medium |

---

# 🔌 LLM Providers

## Provider Configuration

```python
class LLMConfig(BaseModel):
    provider: LLMProvider
    model: str
    api_key: str
    api_base: str
    temperature: float = 0.7
    max_tokens: int = 4096
```

## Adding New Provider

1. Create file: `packages/llm-service/src/providers/{provider}.py`
2. Implement `BaseLLM` interface
3. Register in provider factory
4. Add environment variables
5. Update UI provider selection

---

# 🛠️ Tools System

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

## Active Tools (8 Types with Backend Support)

| Tool Type | Purpose | Key Features |
|-----------|---------|--------------|
| `website` | Web scraping | Playwright for JS sites, httpx for static, table extraction |
| `document` | Document RAG | PDF/DOCX/TXT/CSV support, chunking, vector search |
| `knowledge` | Knowledge base | Same as document, alias for RAG |
| `database` | SQL queries | PostgreSQL, MySQL, SQL Server, MongoDB, SQLite |
| `api` | REST API calls | GET/POST/PUT/DELETE, auth types, custom headers |
| `email` | Send emails | SMTP, SendGrid, AWS SES providers |
| `webhook` | HTTP callbacks | POST/GET/PUT/PATCH methods |
| `slack` | Slack messaging | Bot token, channel management |
| `websearch` | Internet search | Tavily, Serper, Bing, DuckDuckGo providers |

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

---

# 🔒 Security Module

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
| `/api/security/auth/mfa/setup` | POST | Setup MFA (TOTP) |
| `/api/security/auth/mfa/verify` | POST | Verify MFA code |
| `/api/security/auth/mfa/email/send` | POST | Send MFA code via email |
| `/api/security/auth/mfa/email/verify` | POST | Verify email MFA code |
| `/api/security/roles/reset-defaults` | POST | Reset to default roles (Super Admin only) |

---

# 📊 Platform Assessment

## Current State Analysis

| Area | Score | Issues |
|------|-------|--------|
| Code Organization | 4/10 | Monolithic files |
| Scalability | 3/10 | JSON storage, single instance |
| Deployment | 4/10 | Docker only, manual |
| Testing | 2/10 | No automated tests |
| Documentation | 5/10 | Incomplete |

---

# 📋 Gap Analysis

## Implementation Status Summary

| Category | ✅ Done | 🔶 Partial | 🔴 Missing |
|----------|---------|------------|------------|
| Agent Features | 8 | 2 | 4 |
| LLM Providers | 3 | 1 | 9 |
| Tools | 4 | 0 | 3 |
| Security | 10 | 2 | 4 |
| Infrastructure | 1 | 0 | 5 |

---

# 💻 Code Quality

## Current Issues

1. **main.py (11,800 lines)** - Violates Single Responsibility
2. **index.html (17,500 lines)** - Unmaintainable
3. **No TypeScript** - Type safety missing
4. **No Tests** - Zero coverage
5. **No Linting** - Inconsistent code style

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
Phase 1: Setup          → Add PostgreSQL alongside JSON
Phase 2: Dual Write     → Write to both, read from JSON
Phase 3: Dual Read      → Write to both, read from PostgreSQL
Phase 4: Cutover        → PostgreSQL only
Phase 5: Cleanup        → Remove JSON code
```

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
- [ ] Backup all JSON files
- [ ] Document current data structure
- [ ] Set up PostgreSQL server
- [ ] Create database and user
- [ ] Test connection

### Phase 1: Setup
- [ ] Add PostgreSQL to docker-compose
- [ ] Create SQLAlchemy models
- [ ] Create Alembic migrations
- [ ] Run migrations
- [ ] Verify tables created

### Phase 2: Dual Write
- [ ] Implement DualWriteRepository
- [ ] Enable FF_USE_DATABASE=true
- [ ] Test write operations
- [ ] Monitor for errors
- [ ] Run for 1 week minimum

### Phase 3: Data Migration
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] Compare counts JSON vs DB
- [ ] Enable FF_READ_FROM_DATABASE=true
- [ ] Test read operations

### Phase 4: Cutover
- [ ] Remove JSON write operations
- [ ] Update all services to DB only
- [ ] Remove feature flags
- [ ] Archive JSON files

### Post-Migration
- [ ] Remove JSON repository code
- [ ] Update documentation
- [ ] Performance testing
- [ ] Backup strategy for PostgreSQL
```

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

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents` | List agents |
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/agents/{id}` | Get agent |
| PUT | `/api/v1/agents/{id}` | Update agent |
| DELETE | `/api/v1/agents/{id}` | Delete agent |
| POST | `/api/v1/agents/{id}/chat` | Chat with agent |
| POST | `/api/v1/agents/generate-config` | AI generate config |

### Security
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/auth/forgot-password` | Password reset |

### Tenants (Multi-tenant only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants` | List tenants (super admin) |
| POST | `/api/v1/tenants` | Create tenant |
| GET | `/api/v1/tenants/{id}` | Get tenant |
| PUT | `/api/v1/tenants/{id}` | Update tenant |

---

# 🗺️ Recommendations & Roadmap

## Implementation Priority

### Phase 1: Foundation (Weeks 1-4) - Critical
| Task | Effort | Impact |
|------|--------|--------|
| Setup monorepo structure | 1 week | High |
| Add CI/CD pipeline | 3 days | High |
| Database migration (PostgreSQL) | 2 weeks | Critical |
| Add rate limiting | 2 days | Critical |

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
| 1.0 | Jan 2026 | Initial comprehensive documentation |

---

# 👥 Support

- **GitHub:** https://github.com/ahamdihussein-star/agentforge
- **Production:** https://agentforge.up.railway.app
- **Domain:** agentforge.to

---

*Last Updated: January 2026*  
*Document Version: 1.0*  
*Platform Version: 3.2*
