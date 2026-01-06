# 🔥 AgentForge

**Build Intelligent AI Agents, No Code Required**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-green.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-teal.svg)](https://fastapi.tiangolo.com)

AgentForge is an open-source platform for building, deploying, and managing AI agents. Create powerful agents that can reason, take actions, and integrate with any system - all through a simple interface or natural language.

## ✨ Features

- **🤖 AI-Assisted Agent Creation** - Describe what you want, AI generates the agent
- **🔌 Any LLM** - OpenAI, Anthropic, Azure, Ollama, or any custom model
- **🛠️ Pluggable Tools** - RAG, databases, APIs, webhooks, custom code
- **🔀 Smart Model Router** - Auto-select best model per task
- **📱 Multi-Channel** - Web, Slack, WhatsApp, Teams, API
- **🏪 Marketplace** - Share and discover community agents
- **🚀 Deploy Anywhere** - Cloud, on-premise, or hybrid

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/agentforge.git
cd agentforge

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Start with Docker Compose
docker-compose up -d

# Open http://localhost:8080
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agentforge.git
cd agentforge

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OPENAI_API_KEY=your-key-here

# Run the server
uvicorn api.main:app --reload

# Open http://localhost:8000
```

## 📖 Documentation

- [Getting Started](docs/getting-started.md)
- [Creating Agents](docs/creating-agents.md)
- [Adding Custom Tools](docs/custom-tools.md)
- [LLM Configuration](docs/llm-configuration.md)
- [Deployment Guide](docs/deployment.md)
- [API Reference](docs/api-reference.md)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AgentForge Platform                   │
├─────────────────────────────────────────────────────────┤
│  Agent Builder (UI/API)                                  │
│  ├── AI-Assisted Mode (describe → generate)              │
│  └── Manual Mode (full control)                          │
├─────────────────────────────────────────────────────────┤
│  Agent Engine                                            │
│  ├── Planner (reasoning & task decomposition)            │
│  ├── Executor (tool execution)                           │
│  └── Memory (state management)                           │
├─────────────────────────────────────────────────────────┤
│  LLM Layer                                               │
│  ├── Registry (any model)                                │
│  ├── Router (smart selection)                            │
│  └── Adapters (OpenAI, Anthropic, Ollama, etc.)          │
├─────────────────────────────────────────────────────────┤
│  Tool System                                             │
│  ├── RAG/Knowledge Base                                  │
│  ├── Database (SQL/NoSQL)                                │
│  ├── API (REST/GraphQL)                                  │
│  ├── Actions (Email, Webhook, etc.)                      │
│  └── Custom Tools                                        │
├─────────────────────────────────────────────────────────┤
│  Channels: Web │ Slack │ WhatsApp │ Teams │ API          │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Creating Your First Agent

### Option 1: AI-Assisted (Recommended)

```python
from agentforge import AgentForge

forge = AgentForge()

# Just describe what you want
agent = await forge.create_from_description("""
    I need an agent that helps customers track their orders,
    process returns, and answer product questions. It should
    be friendly and support both English and Arabic.
""")

# AI generates: name, personality, tasks, suggested tools
print(agent.config)

# Add your tools
agent.add_tool("knowledge_base", config={...})
agent.add_tool("database", config={...})

# Deploy
agent.deploy()
```

### Option 2: Manual Configuration

```yaml
# agents/my_agent.yaml
agent:
  name: "Customer Support Agent"
  
  objective: |
    Help customers with orders and product questions
    
  personality:
    tone: "friendly"
    languages: ["English", "Arabic"]
    
  model_config:
    mode: "auto"  # Smart model selection
    available_models: ["gpt-4o", "claude-3-5-sonnet"]
    optimize_for: "quality"
    
  tools:
    - type: "rag"
      name: "product_docs"
      config:
        vector_db: {type: "pinecone", index: "products"}
        
    - type: "database"
      name: "orders_db"
      config:
        type: "postgresql"
        connection: "${DATABASE_URL}"
        
  tasks:
    - name: "track_order"
      trigger: "Customer asks about order status"
      steps:
        - "Query orders_db for order details"
        - "Provide status update"
```

```python
from agentforge import AgentForge

forge = AgentForge()
agent = forge.load_agent("agents/my_agent.yaml")
agent.deploy()
```

## 🔌 Supported Integrations

### LLM Providers
| Provider | Models | Status |
|----------|--------|--------|
| OpenAI | GPT-4o, GPT-4, GPT-3.5 | ✅ |
| Anthropic | Claude 3.5, Claude 3 | ✅ |
| Azure OpenAI | All Azure models | ✅ |
| Google | Gemini Pro, PaLM | ✅ |
| Ollama | Llama, Mistral, etc. | ✅ |
| AWS Bedrock | All Bedrock models | ✅ |
| Custom | Any OpenAI-compatible | ✅ |

### Vector Databases
| Database | Status |
|----------|--------|
| Pinecone | ✅ |
| Qdrant | ✅ |
| ChromaDB | ✅ |
| Weaviate | ✅ |
| Milvus | ✅ |

### Channels
| Channel | Status |
|---------|--------|
| Web Widget | ✅ |
| REST API | ✅ |
| Slack | ✅ |
| WhatsApp | ✅ |
| Microsoft Teams | ✅ |
| Telegram | ✅ |

## 🤝 Contributing

We love contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with ❤️ by the AgentForge community.
