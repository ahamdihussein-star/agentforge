# 🔥 AgentForge

## Enterprise AI Agent Builder Platform

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/agentforge)

**Production:** https://agentforge2.up.railway.app  
**Version:** 3.5  

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/ahamdihussein-star/agentforge.git
cd agentforge

# Install dependencies
pip install -r requirements.txt

# Run locally
python -m uvicorn api.main:app --reload --port 8000

# Access
# UI: http://localhost:8000/ui
# API Docs: http://localhost:8000/docs
```

---

## 📚 Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| **Project Status (Start Here)** | Current state + quick reference | [`PROJECT_STATUS.md`](PROJECT_STATUS.md) |
| **Master Documentation (Canonical)** | Architecture, services, security, DB schema, gaps, file reference | [`docs/MASTER_DOCUMENTATION_UPDATED.md`](docs/MASTER_DOCUMENTATION_UPDATED.md) |
| **Cursor Rules** | Cursor AI configuration | [`.cursorrules`](.cursorrules) |

---

## 📁 Project Structure

```
agentforge/
├── api/
│   ├── main.py              # FastAPI backend (~16,000 lines)
│   ├── security.py          # Auth/MFA/OAuth/users/roles
│   └── modules/             # access_control, process, lab, conversations
├── core/
│   ├── agent/                # Agent engine
│   ├── llm/                  # Core LLM abstraction (used by internal engines)
│   ├── process/              # Workflow engine + wizard + node executors
│   ├── security/             # RBAC/ABAC + token/MFA services
│   └── tools/                # Core tool registry + builtin tools (process runtime)
├── database/
│   ├── models/               # SQLAlchemy models (DB-first)
│   └── services/             # CRUD services
├── ui/
│   ├── index.html            # Admin portal (~32,000 lines)
│   ├── process-builder.html  # Visual workflow builder (~6,800 lines)
│   ├── chat.html             # End-user portal
│   └── lab.html              # Demo Lab UI
├── docs/                     # Canonical docs + Process Builder KB files
├── data/                     # JSON backups/demo data (not primary storage)
├── .cursorrules              # AI assistant rules
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## ✨ Features

### Agent System
- ✅ AI-powered agent configuration
- ✅ Multi-LLM support (OpenAI/Azure OpenAI, Anthropic, Ollama, Google Gemini, Cohere, OpenAI-compatible providers)
- ✅ Tool integration
- ✅ Memory & conversation history
- ✅ Guardrails (anti-hallucination, PII protection)

### Tools (8 Active Types)
- ✅ Website Scraping (with JS rendering)
- ✅ Document/Knowledge RAG
- 🔶 Database Queries (process runtime implemented; chat runtime executor is currently a placeholder)
- ✅ API Integration
- ✅ Email Sending
- ✅ Webhooks
- ✅ Slack Messaging
- 🔶 Web Search (requires real search provider integration)

### Process Builder (Workflows)
- ✅ Prompt → visual workflow generation
- ✅ Business-friendly trigger forms (labels + camelCase keys)
- ✅ Derived fields + profile prefill
- ✅ Cinematic build animation + auto-layout
- ✅ Test run + animated playback
- 🔶 Schedule/Webhook automation and file upload persistence (not fully end-to-end yet)

### Security
- ✅ JWT Authentication
- ✅ RBAC (32 permissions, 2 default roles)
- ✅ MFA (TOTP + Email)
- ✅ OAuth (Google, Microsoft)
- ✅ Audit Logging

---

## 🚀 Deployment

### Railway (Recommended)
```bash
# Push to main branch - Railway auto-deploys
git add -A
git commit -m "Your changes"
git push origin main
```

### Docker
```bash
docker build -t agentforge .
docker run -p 8000:8000 agentforge
```

---

## 🔧 Development

### Making Changes

1. **Backend:** Edit `api/main.py`
2. **Frontend:** Edit `ui/index.html`
3. **Security:** Edit `core/security/` or `api/security.py`

### Before Pushing
```bash
# Check Python syntax
python3 -m py_compile api/main.py

# Check JS syntax (basic)
node -e "require('fs').readFileSync('ui/index.html', 'utf8')"

# Commit and push
git add -A
git commit -m "Description"
git push origin main
```

---

## 📞 Links

- **Production:** https://agentforge2.up.railway.app
- **GitHub:** https://github.com/ahamdihussein-star/agentforge
- **Documentation:** See `docs/` folder

---

## 📄 License

MIT License - See LICENSE file
