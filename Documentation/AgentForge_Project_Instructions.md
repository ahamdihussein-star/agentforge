# 🔥 AgentForge Project Instructions

## About This Project
AgentForge is an AI Agent Builder platform - create, configure, test, and deploy intelligent AI agents with custom tools, knowledge bases, and guardrails.

## Local Setup
- **Path:** `/Users/ahmedhamdy/Documents/agentforge/`
- **Deployment:** Docker (localhost:8000)
- **Container:** agentforge

## Project Structure
```
agentforge/
├── api/
│   └── main.py           ← Backend (6,457 lines)
├── ui/
│   └── index.html        ← Frontend (8,697 lines) - MOUNTED AS VOLUME
├── data/                 ← Persistent data
├── uploads/              ← File uploads
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env                  ← OPENAI_API_KEY, PINECONE keys
```

## Quick Deploy Commands

### Frontend Only (Instant - No Rebuild!)
```bash
cp ~/Downloads/index.html ~/Documents/agentforge/ui/index.html
# Refresh browser - done!
```

### Backend (Requires Rebuild)
```bash
cp ~/Downloads/main.py ~/Documents/agentforge/api/main.py
cd ~/Documents/agentforge
docker-compose up -d --build
```

### View Logs
```bash
docker-compose logs -f
```

## URLs
| Page | URL |
|------|-----|
| Frontend | http://localhost:8000/frontend |
| Admin | http://localhost:8000/admin |
| Monitor | http://localhost:8000/monitor |
| API Docs | http://localhost:8000/docs |

## Key Features (Working)
- ✅ Agent CRUD with Draft/Published status
- ✅ 7-step AI-powered agent creation wizard
- ✅ Chat interface with markdown, code, LaTeX
- ✅ Knowledge base tools (document upload, website scraping)
- ✅ API tools with OpenAPI parsing
- ✅ Demo Lab (mock APIs, document/image generation)
- ✅ Multi-LLM support (OpenAI, Anthropic, Azure, Ollama)
- ✅ Guardrails (anti-hallucination, PII protection)

## In Progress / Known Issues
- 🔄 Wizard preview step - recently fixed
- 🔄 Tool types are abstract, need actual tool creation
- 🔄 Deploy step is UI-only

## Documentation
Full documentation is in `AgentForge_Documentation.docx` uploaded to this project.

## Important Notes
1. **UI is live-mounted** - changes to `ui/index.html` are instant
2. **Backend needs rebuild** - changes to `api/main.py` require `docker-compose up -d --build`
3. **Don't use `--no-cache`** unless changing requirements.txt or Dockerfile
