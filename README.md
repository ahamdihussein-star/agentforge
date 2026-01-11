# 🔥 AgentForge

## Enterprise AI Agent Builder Platform

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/agentforge)

**Production:** https://agentforge2.up.railway.app  
**Version:** 3.3  

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
| **Master Documentation** | Complete platform reference | [`docs/MASTER_DOCUMENTATION.md`](docs/MASTER_DOCUMENTATION.md) |
| **AI Quick Reference** | Optimized for AI code assistants | [`docs/AI_QUICK_REFERENCE.md`](docs/AI_QUICK_REFERENCE.md) |
| **Cursor Rules** | Cursor AI configuration | [`.cursorrules`](.cursorrules) |

### For AI Code Assistants (Cursor, Copilot, etc.)

1. **Start here:** Read `docs/AI_QUICK_REFERENCE.md` for quick context
2. **Deep dive:** Refer to `docs/MASTER_DOCUMENTATION.md` for detailed information
3. **Rules:** Follow `.cursorrules` for project conventions

---

## 📁 Project Structure

```
agentforge/
├── api/
│   ├── main.py              # FastAPI backend (~12,000 lines)
│   └── security.py          # Security module
├── core/
│   ├── llm/                  # LLM providers (OpenAI, Anthropic, Ollama)
│   ├── security/             # RBAC, permissions (32 total)
│   ├── tools/                # Tool base classes
│   └── agent/                # Agent base classes
├── ui/
│   └── index.html            # Single-page frontend (~15,000 lines)
├── docs/                     # 📚 Documentation
│   ├── MASTER_DOCUMENTATION.md
│   └── AI_QUICK_REFERENCE.md
├── data/                     # JSON storage (auto-created)
├── .cursorrules              # AI assistant rules
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## ✨ Features

### Agent System
- ✅ AI-powered agent configuration
- ✅ Multi-LLM support (OpenAI, Anthropic, Ollama)
- ✅ Tool integration
- ✅ Memory & conversation history
- ✅ Guardrails (anti-hallucination, PII protection)

### Tools (8 Active Types)
- ✅ Website Scraping (with JS rendering)
- ✅ Document/Knowledge RAG
- ✅ Database Queries
- ✅ API Integration
- ✅ Email Sending
- ✅ Webhooks
- ✅ Slack Messaging
- ✅ Web Search

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
