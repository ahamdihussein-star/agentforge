# Module Map

## Core Systems

### `core/agent/`
- `engine.py`: AgentEngine (chat-based agent execution)
- Manages: LLM selection, tool execution, memory, agentic loop

### `core/process/`
- `engine.py`: ProcessEngine (workflow execution)
- `state.py`: ProcessState (variables, checkpoints)
- `nodes/`: Node executors (task, flow, logic, human, integration, data, timing)
- `platform_knowledge.py`: KB grounding for workflow generation
- `schemas.py`: Process definitions, node types, triggers

### `core/llm/`
- `registry.py`: LLMRegistry (model configs)
- `factory.py`: LLMFactory (creates LLM instances)
- `router.py`: LLMRouter (intelligent model selection)
- `base.py`: BaseLLM interface
- `providers/`: OpenAI, Anthropic, Ollama, Google implementations

### `core/security/`
- `state.py`: SecurityState (in-memory cache, DB persistence)
- `engine.py`: PolicyEngine (RBAC/ABAC evaluation)
- `services.py`: Password, MFA, Token, Email, LDAP, OAuth services
- `models.py`: Security data models

### `core/tools/`
- `base.py`: BaseTool interface
- `registry.py`: ToolRegistry
- `builtin/`: API, database, email, RAG, scraping tools

## Database Layer

### `database/models/`
- `user.py`: User, UserSession, MFASetting
- `role.py`: Role, Permission
- `organization.py`: Organization
- `agent.py`: Agent
- `conversation.py`: Conversation, Message
- `process_execution.py`: ProcessExecution, ProcessNodeExecution, ProcessApprovalRequest
- `settings.py`: SystemSetting, OrganizationSetting
- `audit.py`: AuditLog

### `database/services/`
- Service classes for all models (UserService, RoleService, etc.)
- All CRUD operations
- Database-agnostic via SQLAlchemy

## API Layer

### `api/`
- `main.py`: Main FastAPI app (~16.5K lines)
  - Agents, Chat, Tools, RAG, Process, Settings endpoints
- `security.py`: Security endpoints (~4.1K lines)
  - Auth, Users, Roles, MFA, OAuth, RBAC, Audit
- `health.py`: Health check endpoints

### `api/modules/`
- `access_control/`: Agent permissions, delegated admin
- `process/`: Process wizard, publish, run, executions
- `conversations/`: Conversation CRUD
- `lab/`: Demo/test data

## Frontend

### `ui/`
- `index.html` + `index.css` + `index_parts/*.js`: Admin portal
- `chat.html` + `chat.css` + `chat.js`: End-user portal
- `process-builder.html` + `process-builder.css` + `process-builder.js`: Visual workflow builder
- `lab.html`: Demo lab

## System Connections

```
Frontend (ui/) 
  ↓ HTTP
API Layer (api/main.py, api/security.py, api/modules/)
  ↓
Core Engines (core/agent/, core/process/, core/security/)
  ↓
Database Services (database/services/)
  ↓
PostgreSQL Database
```

```
AgentEngine → LLMFactory → Provider (OpenAI/Anthropic/etc.)
AgentEngine → ToolRegistry → Tool Executors
ProcessEngine → NodeExecutorRegistry → Node Executors
ProcessEngine → ProcessExecutionService → Database
```

## Quick Reference

**Need to modify chat agents?** → `core/agent/engine.py`
**Need to modify workflows?** → `core/process/engine.py`
**Need to add LLM provider?** → `core/llm/providers/`
**Need to add tool?** → `core/tools/builtin/`
**Need to modify security?** → `core/security/` + `api/security.py`
**Need to modify database?** → `database/models/` + `database/services/`
**Need to modify UI?** → `ui/index_parts/` (admin) or `ui/chat.js` (user)
