# 🔥 AgentForge Documentation v3.2

**AI Agent Builder Platform**

Last Updated: December 26, 2025

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & File Structure](#2-architecture--file-structure)
3. [Backend API](#3-backend-api)
4. [Frontend UI](#4-frontend-ui)
5. [Demo Lab](#5-demo-lab) ⭐ NEW
6. [Features Status](#6-features-status)
7. [Deployment Guide](#7-deployment-guide)
8. [Configuration](#8-configuration)
9. [Quick Reference](#9-quick-reference)
10. [Changelog v3.2](#10-changelog-v32) ⭐ NEW

---

## 1. Project Overview

### 1.1 What is AgentForge?

AgentForge is an open-source AI Agent Builder platform that allows users to create, configure, test, and deploy intelligent AI agents with custom tools, knowledge bases, and guardrails.

### 1.2 Key Capabilities

- **AI-Powered Agent Configuration** - Automatically generates agent configs from goals
- **Multi-LLM Support** - OpenAI, Anthropic, Azure, Ollama, Google, AWS Bedrock
- **RAG Integration** - Document upload, website scraping, vector search
- **Tool System** - Knowledge bases, APIs, databases, and more
- **Guardrails** - Anti-hallucination, PII protection, escalation rules
- **Demo Lab** - LLM-powered mock API and document generation

### 1.3 Local Setup

| Setting | Value |
|---------|-------|
| Project Root | `/Users/ahmedhamdy/Documents/agentforge/` |
| Deployment | Docker (localhost:8000) |
| Container | agentforge |
| Frontend URL | http://localhost:8000/frontend |
| API Docs | http://localhost:8000/docs |

---

## 2. Architecture & File Structure

### 2.1 Project Structure

```
agentforge/
├── api/
│   └── main.py           # Backend (6,500+ lines)
├── ui/
│   └── index.html        # Frontend (8,700+ lines)
├── data/                  # Persistent data (mounted)
│   ├── agents.json
│   ├── tools.json
│   ├── documents.json
│   ├── conversations.json
│   ├── demo_items.json   # Demo Lab items
│   └── settings.json
├── uploads/               # File uploads (mounted)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env                   # Environment variables
```

### 2.2 Docker Configuration

The `ui/` folder is mounted as a volume, so frontend changes are instant. Backend changes require a rebuild.

```yaml
# docker-compose.yml volumes:
volumes:
  - ./data:/app/data
  - ./uploads:/app/uploads
  - ./ui:/app/ui  # <- Live reload for frontend
```

### 2.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| OPENAI_API_KEY | OpenAI API key for LLM and embeddings | Required |
| PINECONE_API_KEY | Pinecone API key | Optional |
| PINECONE_INDEX_NAME | Pinecone index name | Optional |
| CORS_ORIGINS | Allowed origins (comma-separated) | * |
| DATA_PATH | Data storage path | data |
| UPLOAD_PATH | Upload storage path | data/uploads |

---

## 3. Backend API

### 3.1 Core Components

#### LLM Providers

| Provider | Implementation |
|----------|---------------|
| OpenAI | OpenAILLM - GPT-4, GPT-4o, GPT-3.5 |
| Azure OpenAI | AzureOpenAILLM - Enterprise Azure deployment |
| Anthropic | AnthropicLLM - Claude models |
| Ollama | OllamaLLM - Local models (Llama, Mistral) |
| Custom | CustomLLM - Any OpenAI-compatible API |

#### Embedding Providers

- OpenAI (text-embedding-3-small)
- Sentence Transformers (local)
- Ollama (local)
- Cohere

#### Vector DB Providers

- ChromaDB (local)
- Pinecone (cloud)
- Memory (in-memory keyword search)

### 3.2 API Endpoints

#### Agent Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agents | List all agents |
| GET | /api/agents/{id} | Get agent details |
| POST | /api/agents | Create agent |
| PUT | /api/agents/{id} | Update agent |
| DELETE | /api/agents/{id} | Delete agent |
| POST | /api/agents/generate-config | AI config generation |
| POST | /api/agents/configure-tools | AI tool recommendations |

#### Chat & Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/agents/{id}/chat | Send message |
| POST | /api/agents/{id}/chat-with-files | Chat with attachments |
| GET | /api/agents/{id}/conversations | List conversations |
| DELETE | /api/conversations/{id} | Delete conversation |

#### Tools Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tools | List all tools |
| POST | /api/tools | Create tool |
| POST | /api/tools/{id}/documents | Upload documents |
| POST | /api/tools/{id}/scrape | Scrape website |
| POST | /api/tools/test-api | Test API endpoint |
| POST | /api/tools/parse-openapi | Parse OpenAPI spec |

---

## 4. Frontend UI

### 4.1 Navigation Sections

| Section | Description |
|---------|-------------|
| Chat | Main chat interface with agents |
| Agents | List and manage agents (Draft/Published tabs) |
| Tools | Create and manage tools (Knowledge, API, etc.) |
| Demo Lab | Generate mock APIs, documents, images |
| Create Agent | 7-step AI-powered wizard |
| Settings | LLM, Embedding, VectorDB configuration |

### 4.2 Agent Creation Wizard (7 Steps)

1. **Step 0: Goal Input** - User enters goal in plain language
2. **Step 1: Basics** - AI suggests name, icon, tone, voice, model
3. **Step 2: Tasks** - AI generates tasks with instructions
4. **Step 3: Tools** - Dynamic tool recommendations based on goal
5. **Step 4: Guardrails** - Anti-hallucination, topic control, PII protection
6. **Step 5: Preview** - Full configuration review
7. **Step 6: Test** - Interactive chat to test agent
8. **Step 7: Deploy** - Deployment options (UI ready, backend pending)

---

## 5. Demo Lab ⭐

Demo Lab is an LLM-powered sandbox for generating mock data, documents, and images for testing agents.

### 5.1 Features

| Feature | Description |
|---------|-------------|
| Mock APIs | Generate realistic API responses based on context |
| Documents | Create PDFs, Word docs, Excel spreadsheets |
| Images | Generate images for OCR testing, logos, charts |
| Tool Creation | Convert demo items into agent tools |

### 5.2 Demo Lab Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/demo/items | List all demo items (APIs, docs, images) |
| POST | /api/demo/generate | Generate new demo item |
| PUT | /api/demo/items/{id} | Update demo item |
| DELETE | /api/demo/items/{id} | Delete demo item |
| DELETE | /api/demo/items/clear | Clear all demo items |
| GET | /api/demo/files/{filename} | Download generated file |
| POST | /api/demo/create-tool | Create tool from demo item |
| GET | /api/demo/test-document | Test document generation |

### 5.3 Dynamic Mock APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /demo-api | List available mock API patterns |
| GET | /demo-api/_cache | Get cache statistics |
| DELETE | /demo-api/_cache | Clear LLM response cache |
| GET/POST/PUT/DELETE | /demo-api/{api_name} | Dynamic mock API endpoint |
| GET/POST/PUT/DELETE | /demo-api/{api_name}/{path} | Dynamic mock API with path |

### 5.4 Mock API Examples

```bash
# Egyptian retail companies
GET /demo-api/egyptian-retail-companies

# UAE real estate
GET /demo-api/uae-real-estate-companies

# Banking accounts
GET /demo-api/banking/accounts

# Electronics products
GET /demo-api/electronics-store-products
```

### 5.5 Document Generation

Supported document types:
- **PDF** - Invoices, reports, policies, general documents
- **Word (.docx)** - Professional documents with formatting
- **Excel (.xlsx)** - Spreadsheets with data and formulas

Example request:
```json
POST /api/demo/generate
{
  "message": "Create an HR policy document for vacation leave",
  "mode_hint": "document"
}
```

### 5.6 Image Generation

Supported image types:
- **Invoice** - Clear, OCR-friendly invoice images
- **Receipt** - Receipt images for testing
- **Logo** - Company logos
- **Chart** - Business charts and graphs
- **Screenshot** - UI mockups

Example request:
```json
POST /api/demo/generate
{
  "message": "Generate an invoice image for OCR testing",
  "mode_hint": "image"
}
```

### 5.7 Data Persistence

Demo items are now persisted to disk:
- Items saved to `data/demo_items.json`
- Mock API data saved to `data/mock_api_data.json`
- Survives server restarts

---

## 6. Features Status

### 6.1 Working Features ✅

1. Agent CRUD with Draft/Published status
2. Chat interface with markdown, code, LaTeX
3. Conversation history - persistent across sessions
4. File attachments in chat
5. Knowledge Base tools - document upload (PDF, DOCX, TXT, CSV, XLSX)
6. Website scraping - Playwright for dynamic sites
7. API tools - OpenAPI parsing, parameter configuration
8. AI-powered wizard - config generation, tool recommendations
9. Demo Lab - mock APIs, documents, images
10. Multi-LLM support
11. Guardrails integration

### 6.2 In Progress 🔄

| Feature | Status |
|---------|--------|
| Deploy step backend | UI ready, backend pending |
| Database tool connectors | UI ready, connectors needed |
| Email tool | UI ready, SMTP integration needed |
| Calendar tool | UI ready, OAuth needed |

### 6.3 Not Yet Implemented ❌

- Multi-channel (WhatsApp, Telegram, Web Widget)
- Agent memory (long-term)
- Analytics dashboard
- Team collaboration
- Agentic workflows (multi-agent)

---

## 7. Deployment Guide

### 7.1 Quick Update Commands

#### Frontend Only (Instant - No Rebuild)

```bash
cp ~/Downloads/index.html ~/Documents/agentforge/ui/index.html
# Refresh browser - changes are live immediately
```

#### Backend (Requires Rebuild)

```bash
cp ~/Downloads/main.py ~/Documents/agentforge/api/main.py
cd ~/Documents/agentforge
docker-compose up -d --build
```

#### Full Rebuild (When Changing Dependencies)

```bash
cd ~/Documents/agentforge
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 7.2 View Logs

```bash
docker-compose logs -f
# Or for just the last 100 lines:
docker-compose logs --tail 100
```

### 7.3 Container Management

```bash
docker-compose ps        # Check status
docker-compose restart   # Quick restart
docker-compose down      # Stop and remove
docker exec -it agentforge bash  # Shell access
```

---

## 8. Configuration

### 8.1 CORS Configuration

For production, set allowed origins via environment variable:

```bash
# .env file
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### 8.2 LLM Configuration

Configure via Settings page or API:

```json
POST /api/settings
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 4096
  }
}
```

### 8.3 Vector DB Configuration

```json
{
  "vector_db": {
    "provider": "chromadb",
    "chroma_path": "./data/chromadb",
    "chroma_collection": "agentforge"
  }
}
```

---

## 9. Quick Reference

### 9.1 File Locations

| What | Path |
|------|------|
| Backend Code | ~/Documents/agentforge/api/main.py |
| Frontend Code | ~/Documents/agentforge/ui/index.html |
| Docker Config | ~/Documents/agentforge/docker-compose.yml |
| Environment | ~/Documents/agentforge/.env |
| Data (Persistent) | ~/Documents/agentforge/data/ |
| Uploads | ~/Documents/agentforge/uploads/ |

### 9.2 URLs

| Page | URL |
|------|-----|
| Frontend | http://localhost:8000/frontend |
| Admin | http://localhost:8000/admin |
| Monitor | http://localhost:8000/monitor |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
| Demo API List | http://localhost:8000/demo-api |

---

## 10. Changelog v3.2 ⭐

### Bug Fixes

1. **Unicode Encoding** - Fixed broken Unicode characters in formatting instructions
2. **Version Sync** - Unified version across all files to 3.2.0
3. **Async/Sync Issue** - Fixed synchronous call inside async context in chat processing
4. **CORS Security** - Made CORS origins configurable via environment variable

### Improvements

1. **Demo Lab Persistence** - Demo items and mock APIs now saved to disk
2. **File Security** - Added path traversal protection in file serving endpoint
3. **Startup Events** - Added proper startup/shutdown events for demo items

### New Features

1. **Demo Lab Documentation** - Complete documentation added
2. **Configurable CORS** - Set via CORS_ORIGINS environment variable

### Breaking Changes

None - fully backward compatible

---

## Support

- **Issues**: Report bugs or request features via GitHub
- **Documentation**: Check API docs at /docs endpoint
- **Logs**: View logs with `docker-compose logs -f`

---

*End of Documentation*
