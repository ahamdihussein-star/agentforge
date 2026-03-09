# Runtime Architecture

## Execution Models

### Chat Agent Execution
**File**: `core/agent/engine.py` → `AgentEngine`

```
User Message → AgentEngine.chat()
  ├─ Add to Memory
  ├─ Select LLM (fixed or auto-route via LLMRouter)
  ├─ Agentic Loop (max iterations):
  │  ├─ Call LLM with tools
  │  ├─ If tool_calls: execute tools → add results → loop
  │  └─ If no tools: return response
  └─ Return AgentResponse
```

**Key Classes**:
- `AgentConfig`: Agent configuration
- `Memory`: Conversation state (max_messages limit)
- `AgentEngine`: Orchestrates LLM + tools + memory

### Process Agent Execution
**File**: `core/process/engine.py` → `ProcessEngine`

```
Trigger → ProcessEngine.execute()
  ├─ Find START node
  ├─ Initialize ProcessState (variables, completed_nodes)
  ├─ Node Loop:
  │  ├─ Get executor from NodeExecutorRegistry
  │  ├─ Execute node (with timeout + retry)
  │  ├─ Handle result:
  │  │  ├─ Failure → return error
  │  │  ├─ Waiting (approval) → checkpoint + pause
  │  │  └─ Success → update state, find next node
  │  └─ Save checkpoint
  └─ Return ProcessResult
```

**Key Classes**:
- `ProcessEngine`: Workflow orchestrator
- `ProcessState`: Variables, completed nodes, checkpoints
- `NodeExecutorRegistry`: Maps node types to executors
- `BaseNodeExecutor`: Base for all node types (task, condition, approval, etc.)

## LLM Provider System

**3-Layer Architecture**:

1. **Registry** (`core/llm/registry.py`)
   - Stores `LLMConfig` for all models
   - Loads/saves to database
   - Query by provider/capability/strength

2. **Factory** (`core/llm/factory.py`)
   - Maps provider names → implementation classes
   - Creates LLM instances from config
   - Auto-loads provider modules

3. **Providers** (`core/llm/providers/*.py`)
   - Implement `BaseLLM` interface
   - `chat()` and `stream()` methods
   - OpenAI, Anthropic, Ollama, Google, etc.

**Optional Routing** (`core/llm/router.py`):
- Analyzes prompts → selects best model
- Scores by capability, cost, speed, quality

## Database Persistence

**All data in PostgreSQL** (no JSON fallback):

- Security: Users, Roles, Organizations, Sessions, MFA
- Platform: Agents, Tools, Conversations, Knowledge Bases
- Process: ProcessExecution, ProcessNodeExecution, ProcessApprovalRequest
- Settings: SystemSettings, OrganizationSettings

**Service Layer** (`database/services/*.py`):
- All CRUD through service classes
- UserService, RoleService, ProcessExecutionService, etc.

**State Management** (`core/security/state.py`):
- In-memory cache loaded from database
- `load_from_disk()` → database only
- `save_to_disk()` → database only

## API Layer

**Monolithic FastAPI** (`api/main.py` ~16.5K lines):
- Agents, Chat, Tools, RAG, Process, Settings endpoints

**Security API** (`api/security.py` ~4.1K lines):
- Auth, Users, Roles, MFA, OAuth, RBAC, Audit

**Modular Routers** (`api/modules/*`):
- `access_control/`: Delegated admin + agent ACL
- `process/`: Process wizard, publish, run, executions
- `conversations/`: Conversation management
- `lab/`: Demo/test data generator

## Process Wizard Generation Architecture

**Frontend flow** (`ui/index.html`, `ui/index_parts/app-core.js`):

```
Process Agent → AI Build Mode
  → Goal input
  → Either:
    ├─ AI Generate Agent Tasks
    │   → POST /process/wizard/analyze-goal
    │   → Returns ordered task suggestions with suggested instructions
    │   → User reviews/edits task names, task types, and multiple instructions per task
    └─ Define Tasks Manually
        → Opens the same task editor without AI suggestions
  → Generate Workflow
    → POST /process/wizard/generate with goal + explicit tasks
    → Opens generated workflow in Process Builder
```

**Backend flow** (`api/modules/process/router.py`, `core/process/wizard.py`):

```
POST /process/wizard/analyze-goal
  → ProcessWizard.analyze_goal_to_tasks(goal)
  → LLM returns ordered tasks with type + suggested_instructions

POST /process/wizard/generate
  ├─ If tasks were provided:
  │    → ProcessWizard.generate_from_structured_goal(goal, tasks)
  │    → LLM wires nodes from explicit task definitions
  └─ If tasks were not provided:
       → ProcessWizard.generate_from_goal(goal)
       → Legacy goal-only generation path
```

**Key behavior**:
- Structured mode is instruction-first: the process owner defines the task list and per-task instructions explicitly.
- The AI acts primarily as a workflow wiring and data-flow generator, not as a business-intent guesser.
- Each task supports multiple separate instructions.
- Manual and AI-suggested task entry both converge on the same structured generation payload.

## Key Execution Paths

**Chat Flow**:
```
POST /api/agents/{id}/chat
  → api/main.py endpoint
  → AgentEngine.chat()
  → LLM call + tool execution loop
  → Save to Conversation (database)
  → Return response
```

**Process Flow**:
```
POST /api/process/run/{agent_id}
  → api/modules/process/service.py
  → ProcessEngine.execute()
  → Node-by-node execution
  → Save ProcessExecution (database)
  → Return result
```

**Approval Flow**:
```
Approval node → ProcessEngine pauses
  → Save ProcessApprovalRequest (database)
  → Return ProcessResult.waiting
User approves → POST /api/process/approvals/{id}/decide
  → ProcessEngine.resume()
  → Continue from checkpoint
```

## Design Principles

- **Stateless Backend**: Horizontally scalable
- **Service Layer Pattern**: All DB access through services
- **Database-Only**: PostgreSQL single source of truth
- **Async Tasks**: Long operations in background
- **Cloud-Agnostic**: No infrastructure lock-in
