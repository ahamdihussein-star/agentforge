# Regression Watchlist

## Critical Behaviors That Must Not Break

### Agent Execution (Chat)
- **Agentic loop**: Must iterate until no tool_calls or max_iterations
- **Tool execution**: Must execute tools and add results to memory
- **Memory management**: Must respect max_messages limit
- **LLM selection**: Fixed model or auto-routing must work
- **Streaming**: AgentEngine.stream() must yield events correctly
- **Error handling**: Tool failures must not crash agent

**Test**: Chat with agent that uses tools → verify tool execution → verify response

### Process Execution (Workflow)
- **Node-by-node execution**: Must execute nodes in order
- **State management**: Variables must persist across nodes
- **Checkpoint/resume**: Must resume from exact state after approval
- **Node executors**: All node types must execute correctly
- **Error handling**: Node failures must be captured with details
- **Execution limits**: Must respect max_nodes and max_time

**Test**: Run process with condition, loop, approval → verify state → verify resume

### LLM Provider System
- **Provider registration**: All providers must auto-register
- **Config loading**: Must load from database
- **Factory creation**: Must create correct provider from config
- **Routing**: LLMRouter must select appropriate model
- **Tool calling**: Must parse tool_calls from LLM responses
- **Streaming**: Must handle streaming responses

**Test**: Call each provider → verify response → verify tool_calls parsing

### Approval System
- **Approval creation**: Must create ProcessApprovalRequest in database
- **Process pause**: Must save checkpoint and return waiting status
- **Approval decision**: Must record decision and resume execution
- **Assignee resolution**: Must resolve user/role/manager assignees
- **Deadline handling**: Must track and enforce deadlines

**Test**: Process with approval node → verify pause → approve → verify resume

### Database Persistence
- **All writes to database**: No JSON file writes
- **Service layer**: All CRUD through services
- **Transaction handling**: Must handle concurrent access
- **State sync**: SecurityState must load from database
- **Audit logging**: Must log security events

**Test**: Create user → verify in database → restart app → verify loaded

### Security & Access Control
- **Authentication**: JWT tokens must validate correctly
- **MFA**: TOTP and Email MFA must work
- **RBAC**: Permission checks must enforce correctly
- **Agent ACL**: Users must only see permitted agents
- **Delegated admin**: Must respect delegated permissions
- **OAuth**: Google OAuth must work end-to-end

**Test**: Login with MFA → access agent → verify permissions enforced

### Process Builder
- **Workflow generation**: Prompt → visual workflow must work
- **Grounded generation**: Must use KB to prevent hallucinations
- **Node validation**: Must validate node configs
- **Test execution**: Simulation must trace correctly
- **File uploads**: Must handle file inputs in triggers

**Test**: Generate workflow from prompt → validate nodes → test run → verify trace

### API Endpoints
- **Agent chat**: POST /api/agents/{id}/chat must work
- **Process run**: POST /api/process/run/{agent_id} must work
- **User CRUD**: All user endpoints must work
- **Conversation history**: Must load and save correctly
- **Health checks**: /api/health endpoints must report status

**Test**: Call each critical endpoint → verify response → verify database state

## Breaking Changes to Avoid

- **Do not** add JSON file persistence (database-only)
- **Do not** bypass service layer for database access
- **Do not** break AgentEngine agentic loop logic
- **Do not** break ProcessEngine checkpoint/resume
- **Do not** change LLMConfig schema without migration
- **Do not** break node executor registration pattern
- **Do not** remove required permissions from default roles
- **Do not** hardcode business logic (keep everything configurable)
- **Do not** use database-specific types (use column_types.py)
- **Do not** expose technical errors to users (plain language only)

## Files That Are Critical

**Never break these without careful review:**
- `core/agent/engine.py` - Chat agent execution
- `core/process/engine.py` - Workflow execution
- `core/llm/factory.py` - LLM provider system
- `core/security/state.py` - Security state management
- `database/services/*.py` - All service layer classes
- `api/security.py` - Authentication and authorization
- `database/column_types.py` - Database-agnostic types
