# 🏗️ AgentForge Architecture

## Overview

AgentForge is designed as a modular, pluggable platform where every component can be swapped, extended, or customized. The architecture follows these principles:

1. **Modularity** - Every component is independent and replaceable
2. **Configuration-Driven** - Behavior controlled via YAML/JSON configs
3. **Provider-Agnostic** - Works with any LLM, database, or service
4. **Extensibility** - Easy to add new tools, channels, and integrations

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AgentForge Platform                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         🎨 Agent Builder Layer                         │ │
│  │                                                                        │ │
│  │   ┌──────────────────────┐      ┌──────────────────────┐              │ │
│  │   │   AI-Assisted Mode   │      │    Manual Mode       │              │ │
│  │   │   (Describe→Generate)│      │   (Full Control)     │              │ │
│  │   └──────────────────────┘      └──────────────────────┘              │ │
│  │                                                                        │ │
│  │   Agent Generator │ Config Validator │ Agent Tester                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         🧠 Agent Core Engine                           │ │
│  │                                                                        │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │ │
│  │   │   Planner    │  │   Executor   │  │   Memory     │                │ │
│  │   │  (Reasoning) │  │   (Actions)  │  │   (State)    │                │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘                │ │
│  │                                                                        │ │
│  │   Conversation Manager │ Task Router │ Response Generator             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│              ┌────────────────────────┼────────────────────────┐            │
│              ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   🧠 LLM Layer      │  │   🔧 Tool Layer     │  │   💾 Storage Layer  │ │
│  │                     │  │                     │  │                     │ │
│  │  Registry           │  │  Registry           │  │  Agent Configs      │ │
│  │  Router             │  │  Built-in Tools:    │  │  Conversations      │ │
│  │  Adapters:          │  │  • RAG              │  │  Memory             │ │
│  │  • OpenAI           │  │  • Database         │  │  Analytics          │ │
│  │  • Anthropic        │  │  • API              │  │                     │ │
│  │  • Azure            │  │  • Email            │  │  Providers:         │ │
│  │  • Ollama           │  │  • Webhook          │  │  • PostgreSQL       │ │
│  │  • Custom           │  │  • Custom           │  │  • MongoDB          │ │
│  │                     │  │                     │  │  • Redis            │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                       │                                      │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         🌐 API Gateway                                 │ │
│  │                                                                        │ │
│  │   REST API │ WebSocket │ GraphQL │ Webhooks                           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                      │
│              ┌────────────────────────┼────────────────────────┐            │
│              ▼                        ▼                        ▼            │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   📱 Channels       │  │   🔗 Integrations   │  │   🏪 Marketplace    │ │
│  │                     │  │                     │  │                     │ │
│  │  • Web Widget       │  │  • MuleSoft         │  │  • Browse Agents    │ │
│  │  • Slack            │  │  • Zapier           │  │  • Install/Fork     │ │
│  │  • WhatsApp         │  │  • Power Automate   │  │  • Publish          │ │
│  │  • Teams            │  │  • Custom Webhooks  │  │  • Reviews          │ │
│  │  • Telegram         │  │                     │  │                     │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. LLM Layer (`core/llm/`)

The LLM layer provides a unified interface to any language model.

```
core/llm/
├── base.py          # Abstract base class for all LLMs
├── registry.py      # LLM registration and management
├── router.py        # Smart model selection
├── factory.py       # Create LLM instances from config
└── providers/
    ├── openai.py
    ├── anthropic.py
    ├── azure.py
    ├── ollama.py
    ├── bedrock.py
    └── custom.py
```

#### Key Interfaces

```python
class BaseLLM(ABC):
    """All LLM providers implement this interface"""
    
    @abstractmethod
    async def chat(self, messages: List[Message], tools: List[Tool] = None) -> LLMResponse:
        """Send messages and get response"""
        pass
    
    @abstractmethod
    async def stream(self, messages: List[Message], tools: List[Tool] = None) -> AsyncIterator[str]:
        """Stream response tokens"""
        pass

class LLMRegistry:
    """Registry for all available LLM models"""
    
    async def register(self, config: LLMConfig) -> str
    async def get(self, model_id: str) -> LLMConfig
    async def list_all(self) -> List[LLMConfig]
    async def get_by_capability(self, capability: str) -> List[LLMConfig]

class LLMRouter:
    """Intelligent model selection"""
    
    async def route(self, prompt: str, constraints: dict) -> Tuple[LLMConfig, str]
```

### 2. Tool Layer (`core/tools/`)

Tools are the capabilities that agents can use.

```
core/tools/
├── base.py          # Abstract tool interface
├── registry.py      # Tool registration
├── factory.py       # Create tools from config
└── builtin/
    ├── rag.py       # Knowledge base search
    ├── database.py  # SQL/NoSQL queries
    ├── api.py       # REST/GraphQL calls
    ├── email.py     # Send emails
    ├── webhook.py   # HTTP webhooks
    └── code.py      # Execute custom code
```

#### Key Interfaces

```python
class BaseTool(ABC):
    """All tools implement this interface"""
    
    @abstractmethod
    def get_definition(self) -> ToolDefinition:
        """Return tool schema for LLM"""
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool"""
        pass
    
    @classmethod
    def from_config(cls, config: dict) -> "BaseTool":
        """Create from configuration"""
        pass

class ToolRegistry:
    """Registry for all tools"""
    
    def register(self, tool_type: str, tool_class: Type[BaseTool])
    def create(self, tool_type: str, config: dict) -> BaseTool
    def list_types(self) -> List[str]
```

### 3. Agent Engine (`core/agent/`)

The brain of each agent.

```
core/agent/
├── engine.py        # Main agent loop
├── planner.py       # Task planning & reasoning
├── executor.py      # Tool execution
├── memory.py        # State management
└── conversation.py  # Conversation handling
```

#### Key Interfaces

```python
class AgentEngine:
    """Core agent execution engine"""
    
    def __init__(self, config: AgentConfig, llm: BaseLLM, tools: List[BaseTool]):
        self.config = config
        self.llm = llm
        self.tools = tools
        self.planner = Planner(llm)
        self.executor = Executor(tools)
        self.memory = Memory()
    
    async def chat(self, message: str, context: dict = None) -> AgentResponse:
        """Process a user message"""
        pass
    
    async def stream(self, message: str, context: dict = None) -> AsyncIterator[AgentEvent]:
        """Stream agent thinking and response"""
        pass

class Planner:
    """Decides what to do next"""
    
    async def plan(self, goal: str, context: dict) -> Plan
    async def replan(self, plan: Plan, result: ToolResult) -> Plan

class Executor:
    """Executes tools"""
    
    async def execute(self, tool_name: str, arguments: dict) -> ToolResult
```

### 4. Configuration System (`core/config/`)

Everything is configuration-driven.

```
core/config/
├── loader.py        # Load YAML/JSON configs
├── validator.py     # Validate configurations
├── schema.py        # Pydantic schemas
└── defaults.py      # Default values
```

#### Agent Configuration Schema

```yaml
agent:
  id: string
  name: string
  version: string
  
  objective: string
  
  personality:
    tone: string
    languages: [string]
    traits: [string]
    constraints: [string]
    
  model_config:
    mode: fixed | auto | task_based | hybrid
    model: string  # For fixed mode
    available_models: [string]  # For auto mode
    task_models: {task: model}  # For task_based mode
    optimize_for: quality | cost | speed
    fallback_model: string
    
  tools: [ToolConfig]
  
  tasks:
    - name: string
      trigger: string
      description: string
      steps: [string]
      requires_approval: boolean
      approval_condition: string
      
  guardrails:
    max_actions_per_conversation: integer
    require_approval: [{action, condition}]
    prohibited_actions: [string]
```

---

## Data Flow

### Chat Request Flow

```
User Message
     │
     ▼
┌─────────────────┐
│  API Gateway    │ ← Authentication, Rate Limiting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Channel        │ ← Web, Slack, WhatsApp, etc.
│  Adapter        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Agent Engine   │
│                 │
│  ┌───────────┐  │
│  │  Memory   │  │ ← Load conversation history
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │  Planner  │  │ ← Decide what to do
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │     ┌─────────────┐
│  │ Executor  │──┼────▶│  Tools      │
│  └───────────┘  │     │  • RAG      │
│       │         │     │  • Database │
│       ▼         │     │  • API      │
│  ┌───────────┐  │     └─────────────┘
│  │ Response  │  │
│  │ Generator │  │
│  └───────────┘  │
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Router     │ ← Select best model
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Provider   │ ← OpenAI, Anthropic, etc.
└────────┬────────┘
         │
         ▼
    Response
```

### Agent Creation Flow (AI-Assisted)

```
User Objective (Natural Language)
         │
         ▼
┌─────────────────┐
│ Agent Generator │
│                 │
│  ┌───────────┐  │
│  │ Analyze   │  │ ← Understand requirements
│  │ Objective │  │
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │ Generate  │  │ ← Create agent config
│  │ Config    │  │
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │ Suggest   │  │ ← Recommend tools
│  │ Tools     │  │
│  └───────────┘  │
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User Review &   │ ← User adds tools, tweaks config
│ Customize       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate &      │
│ Deploy          │
└─────────────────┘
```

---

## Deployment Architecture

### Cloud Deployment

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  AgentForge     │ │  AgentForge     │ │  AgentForge     │
│  Instance 1     │ │  Instance 2     │ │  Instance N     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │PostgreSQL│   │  Redis   │   │ Vector   │
       │(Metadata)│   │ (Cache)  │   │   DB     │
       └──────────┘   └──────────┘   └──────────┘
```

### On-Premise Deployment

```
┌─────────────────────────────────────────────────────────┐
│                  Docker / Kubernetes                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  AgentForge     │  │    Ollama       │              │
│  │  (Main App)     │  │   (Local LLM)   │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                          │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │    Qdrant       │  │   PostgreSQL    │              │
│  │  (Vector DB)    │  │   (Metadata)    │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Security Considerations

1. **API Keys** - Stored encrypted, never logged
2. **Tool Permissions** - Configurable per tool (read/write/execute)
3. **Guardrails** - Configurable limits and approval workflows
4. **Audit Logging** - All actions logged for compliance
5. **Data Isolation** - Multi-tenant data separation

---

## Extensibility Points

1. **Custom LLM Providers** - Implement `BaseLLM` interface
2. **Custom Tools** - Implement `BaseTool` interface
3. **Custom Channels** - Implement `BaseChannel` interface
4. **Plugins** - Hook into agent lifecycle events
5. **Middleware** - Intercept and modify requests/responses

---

## Next Steps

See [ROADMAP.md](ROADMAP.md) for the development plan.
