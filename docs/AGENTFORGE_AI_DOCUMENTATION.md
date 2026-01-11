# 🔥 AgentForge AI Agent Documentation
## Complete Reference for AI Code Assistants

**Version:** 3.3  
**Last Updated:** January 11, 2026  
**GitHub:** https://github.com/ahamdihussein-star/agentforge  
**Production:** https://agentforge2.up.railway.app  
**Railway Project:** agentforge2

---

# 🚀 Quick Start for AI Agents

## Project Overview
AgentForge is an Enterprise AI Agent Builder platform. The codebase is a **monolith** with:
- **Backend:** `api/main.py` (~12,000 lines) - FastAPI
- **Frontend:** `ui/index.html` (~15,000 lines) - Vanilla JS + Tailwind
- **Security:** `api/security.py` + `core/security/` - RBAC, MFA, OAuth

## Deployment Commands
```bash
# After making changes:
git add -A
git commit -m "Your commit message"
git push origin main
# Railway auto-deploys from main branch
```

## Key URLs
- **Production UI:** https://agentforge2.up.railway.app/ui
- **Production API:** https://agentforge2.up.railway.app/api
- **GitHub Repo:** https://github.com/ahamdihussein-star/agentforge

---

# 📁 Project Structure

```
agentforge/
├── api/
│   ├── main.py              # Main FastAPI app (~12,000 lines)
│   └── security.py          # Security module (~2,200 lines)
├── core/
│   ├── llm/
│   │   ├── base.py          # LLM abstract base class
│   │   ├── openai_llm.py    # OpenAI provider
│   │   ├── anthropic_llm.py # Anthropic provider
│   │   └── ollama_llm.py    # Ollama provider
│   ├── security/
│   │   ├── __init__.py
│   │   ├── models.py        # Security Pydantic models
│   │   ├── permissions.py   # Permission definitions (32 permissions)
│   │   └── rbac.py          # Role-based access control
│   ├── tools/
│   │   └── base.py          # Tool base class
│   └── agent/
│       └── base.py          # Agent base class
├── ui/
│   └── index.html           # Single-page app (~15,000 lines)
├── data/                    # JSON file storage (auto-created)
│   ├── agents.json
│   ├── tools.json
│   ├── settings.json
│   └── security/
│       ├── users.json
│       ├── roles.json
│       ├── audit_logs.json
│       └── ...
├── Dockerfile
├── railway.json
├── requirements.txt
└── AgentForge_Logo.png
```

---

# 🔐 Security Module (Complete Reference)

## Overview
The security module provides enterprise-grade authentication and authorization.

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
```python
# Location: core/security/permissions.py

DEFAULT_ROLES = {
    "Super Admin": {
        "description": "Full system access",
        "permissions": ALL_PERMISSIONS,  # All 32 permissions
        "is_system": True
    },
    "Admin": {
        "description": "Administrative access without security management",
        "permissions": [
            "agents:read", "agents:write", "agents:delete", "agents:execute",
            "tools:read", "tools:write", "tools:delete", "tools:edit",
            "users:read", "users:write",
            "roles:read",
            "kb:read", "kb:write", "kb:delete",
            "settings:read", "settings:write",
            "integrations:read", "integrations:write", "integrations:delete",
            "demo:access", "demo:manage",
            "invitations:read", "invitations:write",
            "analytics:read"
        ],  # 25 permissions
        "is_system": True
    }
}
```

## Authentication Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/auth/login` | POST | Login with email/password |
| `/api/security/auth/logout` | POST | Logout current session |
| `/api/security/auth/me` | GET | Get current user info |
| `/api/security/auth/mfa/setup` | POST | Setup MFA (TOTP) |
| `/api/security/auth/mfa/verify` | POST | Verify MFA code |
| `/api/security/auth/mfa/email/send` | POST | Send MFA code via email |
| `/api/security/auth/mfa/email/verify` | POST | Verify email MFA code |
| `/api/security/auth/forgot-password` | POST | Request password reset |
| `/api/security/auth/reset-password` | POST | Reset password with token |

## User Management Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/users` | GET | List all users |
| `/api/security/users` | POST | Create new user |
| `/api/security/users/{id}` | GET | Get user by ID |
| `/api/security/users/{id}` | PUT | Update user |
| `/api/security/users/{id}` | DELETE | Delete user |
| `/api/security/users/{id}/roles` | PUT | Update user roles |

## Role Management Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/security/roles` | GET | List all roles |
| `/api/security/roles` | POST | Create new role |
| `/api/security/roles/{id}` | PUT | Update role |
| `/api/security/roles/{id}` | DELETE | Delete role |
| `/api/security/roles/reset-defaults` | POST | Reset to default roles (Super Admin only) |

## MFA Implementation
```python
# Email MFA Flow:
# 1. User logs in with email/password
# 2. If MFA enabled, server sends 6-digit code to user's email
# 3. User enters code within 10 minutes
# 4. Server verifies and issues JWT token

# Email MFA uses SendGrid or SMTP
# Configuration in settings: email_provider, sendgrid_api_key, smtp_*
```

---

# 🛠️ Tools System

## Active Tools (8 Types with Backend Support)

### 1. Website Tool (`website`)
- **Purpose:** Web scraping with JavaScript rendering
- **Features:** 
  - Playwright for dynamic sites
  - httpx for static sites
  - Auto table extraction
  - Recursive scraping
- **Config Fields:**
  ```json
  {
    "url": "https://example.com",
    "recursive": true,
    "max_pages": 10,
    "chunk_size": 1000,
    "overlap": 200
  }
  ```

### 2. Document/Knowledge Tool (`document`, `knowledge`)
- **Purpose:** RAG (Retrieval Augmented Generation)
- **Features:**
  - PDF, DOCX, TXT, CSV support
  - Vector search with ChromaDB
  - Hybrid/Semantic/Keyword search
- **Config Fields:**
  ```json
  {
    "chunk_size": 1000,
    "overlap": 200,
    "top_k": 5,
    "search_type": "hybrid"
  }
  ```

### 3. Database Tool (`database`)
- **Purpose:** SQL query execution
- **Supported:** PostgreSQL, MySQL, SQL Server, MongoDB, SQLite
- **Config Fields:**
  ```json
  {
    "db_type": "postgresql",
    "connection_string": "postgresql://user:pass@host:5432/db",
    "tables": ["users", "orders"]
  }
  ```

### 4. API Tool (`api`)
- **Purpose:** REST API integration
- **Features:** GET/POST/PUT/DELETE, Auth types
- **Config Fields:**
  ```json
  {
    "base_url": "https://api.example.com",
    "api_key": "sk-xxx",
    "headers": {"Content-Type": "application/json"}
  }
  ```

### 5. Email Tool (`email`)
- **Purpose:** Send emails
- **Providers:** SMTP, SendGrid, AWS SES
- **Config Fields:**
  ```json
  {
    "provider": "sendgrid",
    "from_email": "noreply@example.com",
    "api_key": "SG.xxx"
  }
  ```

### 6. Webhook Tool (`webhook`)
- **Purpose:** HTTP callbacks
- **Config Fields:**
  ```json
  {
    "url": "https://webhook.site/xxx",
    "method": "POST",
    "headers": {}
  }
  ```

### 7. Slack Tool (`slack`)
- **Purpose:** Slack messaging
- **Config Fields:**
  ```json
  {
    "bot_token": "xoxb-xxx",
    "default_channel": "#general",
    "channels": ["general", "alerts"]
  }
  ```

### 8. Web Search Tool (`websearch`)
- **Purpose:** Internet search
- **Providers:** Tavily, Serper, Bing, DuckDuckGo
- **Config Fields:**
  ```json
  {
    "provider": "tavily",
    "api_key": "tvly-xxx",
    "max_results": 10
  }
  ```

## Coming Soon Tools (12 Types - UI Only)
- `spreadsheet` - Excel/Google Sheets
- `storage` - Cloud storage
- `calendar` - Calendar integration
- `crm` - CRM systems
- `erp` - ERP systems
- `imagegen` - AI image generation
- `stt` - Speech to text
- `tts` - Text to speech
- `translate` - Translation
- `ocr` - OCR processing
- `code` - Code execution
- `hitl` - Human in the loop

## Tool Auto Re-processing
When editing a tool, the backend automatically re-processes data:

```python
# Location: api/main.py - update_tool endpoint (~line 7891)

# Website: Auto re-scrape when URL changes
if tool.type == 'website':
    if new_url != old_url:
        # Clears old pages, scrapes new URL
        reprocess_action = 'rescrape'

# Document: Auto re-index when chunk settings change
if tool.type in ['document', 'knowledge']:
    if chunk_size changed or overlap changed:
        # Re-chunks all documents
        reprocess_action = 'reindex'

# Other tools: Config update notification
# database, api, email, webhook, slack, websearch
```

---

# 📡 API Reference

## Core Endpoints

### Agents
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List agents (query: ?status=published) |
| `/api/agents` | POST | Create agent |
| `/api/agents/{id}` | GET | Get agent |
| `/api/agents/{id}` | PUT | Update agent |
| `/api/agents/{id}` | DELETE | Delete agent |
| `/api/agents/{id}/chat` | POST | Chat with agent |
| `/api/agents/generate` | POST | AI-generate agent config |

### Tools
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tools` | GET | List tools |
| `/api/tools` | POST | Create tool |
| `/api/tools/{id}` | GET | Get tool with details |
| `/api/tools/{id}` | PUT | Update tool (auto re-process) |
| `/api/tools/{id}` | DELETE | Delete tool |
| `/api/tools/{id}/scrape` | POST | Scrape website |
| `/api/tools/{id}/documents` | POST | Upload document |
| `/api/tools/{id}/documents/{doc_id}` | DELETE | Delete document |
| `/api/tools/{id}/search` | POST | Search tool content |

### Settings
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get all settings |
| `/api/settings` | PUT | Update settings |
| `/api/settings/test-email` | POST | Test email configuration |

### Demo Lab
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/demo/scenarios` | GET | List demo scenarios |
| `/api/demo/environment` | POST | Create demo environment |
| `/api/demo/reset` | POST | Reset demo data |

---

# 🎨 Frontend Architecture

## Single Page App Structure
```
ui/index.html (~15,000 lines)
│
├── CSS Styles (lines 1-2500)
│   ├── Tailwind utilities
│   ├── Dark/Light theme
│   ├── Component styles
│   └── Animation classes
│
├── HTML Structure (lines 2500-12000)
│   ├── Login Page
│   ├── Main App Container
│   │   ├── Sidebar Navigation
│   │   ├── Agent Hub (published agents)
│   │   ├── Agent Studio (create/edit)
│   │   ├── Tools Section
│   │   │   ├── Tools List with Action Bar
│   │   │   ├── Tool Create Wizard
│   │   │   └── Tool Edit Panel (slide-over)
│   │   ├── Knowledge Base
│   │   ├── Demo Lab
│   │   ├── Settings
│   │   └── Security Center
│   └── Modals & Overlays
│
└── JavaScript (lines 12000-15000)
    ├── State Management
    ├── API Functions
    ├── UI Event Handlers
    ├── Tool Management Functions
    └── Security Functions
```

## Key JavaScript Functions

### Tools Management
```javascript
// Load and display tools
async function loadTools() { ... }

// Open tool creation wizard
function openToolWizard() { ... }

// Tool selection pattern (click to select, action bar appears)
function selectTool(toolId) { ... }
function clearToolSelection() { ... }

// Tool actions
function viewSelectedTool() { ... }
function editSelectedTool() { ... }
function duplicateSelectedTool() { ... }
function deleteSelectedTool() { ... }

// Edit panel functions
function openToolEditPanel(toolId) { ... }
function closeToolEditPanel() { ... }
function loadEditConfigFields(tool) { ... }  // Loads config fields based on tool type
async function saveToolChanges() { ... }     // Saves with auto re-processing
```

### Security Functions
```javascript
// Authentication
async function login(email, password) { ... }
async function logout() { ... }
async function checkAuth() { ... }

// MFA
async function setupMFA() { ... }
async function verifyMFA(code) { ... }
async function sendEmailMFA() { ... }
async function verifyEmailMFA(code) { ... }

// User Management
async function loadUsers() { ... }
async function createUser(data) { ... }
async function updateUser(id, data) { ... }
async function deleteUser(id) { ... }

// Role Management
async function loadRoles() { ... }
async function createRole(data) { ... }
async function updateRole(id, data) { ... }
async function deleteRole(id) { ... }
```

## UI Patterns

### Tool Selection Pattern
- **Single Click:** Select tool (purple ring border)
- **Double Click:** Open tool detail view
- **Action Bar:** Appears at top with View/Edit/Duplicate/Delete buttons
- **Escape Key:** Deselect tool
- **Click Outside:** Deselect tool

### Edit Panel (Slide-over)
- **Tabs:** Basic Info | Configuration | Sources
- **Basic Info:** Name, Description, Active toggle
- **Configuration:** Dynamic fields based on tool type
- **Sources:** List of documents/pages with delete option

### Toast Notifications
```javascript
showToast(message, type)  // type: 'success', 'error', 'warning', 'info'
```

---

# 🔄 Recent Changes (January 2026)

## Tools UX Overhaul
1. **Action Bar Pattern**
   - Replaced three-dots dropdown menu
   - Theme-independent colors (dark background)
   - Actions: View, Edit, Duplicate, Delete

2. **Tool Categorization**
   - Active Tools: 8 types with backend support
   - Coming Soon: 12 types (UI only, dashed borders, "Soon" badge)

3. **Edit Panel Enhancement**
   - Supports all 8 active tool types
   - Dynamic config fields per tool type
   - Warning messages for config changes
   - Auto re-processing on save

4. **Auto Re-processing**
   - Website: Re-scrapes when URL changes
   - Document: Re-indexes when chunk settings change
   - Other tools: Config update confirmation

## Security Cleanup
1. Reduced permissions from 42 to 32
2. Reduced default roles to 2 (Super Admin, Admin)
3. Added `tools:edit` permission
4. Added reset-defaults endpoint
5. Email MFA implementation complete

## Backend Improvements
1. `UpdateToolRequest` model includes `is_active` field
2. Smart config change detection
3. Proper async scraping with result tracking

---

# 🚀 Deployment Guide

## Railway Deployment (Current Setup)

### Configuration
```json
// railway.json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### Environment Variables (Railway Dashboard)
```
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
SENDGRID_API_KEY=SG.xxx
JWT_SECRET=your-secret-key
```

### Deployment Steps
```bash
# 1. Make changes locally
# 2. Test locally (optional)
python -m uvicorn api.main:app --reload

# 3. Commit and push
git add -A
git commit -m "Description of changes"
git push origin main

# 4. Railway auto-deploys (watch logs in Railway dashboard)
```

### Viewing Logs
- Go to Railway Dashboard → agentforge2 project
- Click on the service
- View "Deploy Logs" or "Runtime Logs"

## Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn api.main:app --reload --port 8000

# Access
# UI: http://localhost:8000/ui
# API: http://localhost:8000/api
```

---

# 📝 Code Modification Guidelines

## Making Backend Changes

### Adding New Endpoint
```python
# Location: api/main.py
# Find similar endpoints and add nearby

@app.post("/api/your-endpoint")
async def your_function(request: YourRequest):
    """Description"""
    # Implementation
    return {"status": "success", "data": result}
```

### Modifying Existing Endpoint
1. Find the endpoint using `grep -n "endpoint-path" api/main.py`
2. Note the line number
3. Make changes carefully
4. Test locally if possible
5. Check syntax: `python3 -m py_compile api/main.py`

## Making Frontend Changes

### Adding New UI Section
1. Find the appropriate section in `ui/index.html`
2. Add HTML in the correct page container
3. Add JavaScript functions at the bottom
4. Add CSS if needed at the top

### Modifying Existing UI
1. Use `grep -n "function-name\|element-id" ui/index.html`
2. Note line numbers
3. Make changes
4. Check syntax: `node -e "require('fs').readFileSync('ui/index.html', 'utf8')"`

## Common Patterns

### Safe String Replacement (sed)
```bash
# View lines first
sed -n 'START,ENDp' file.py

# Replace specific text
sed -i '' 's/old_text/new_text/' file.py

# Delete line
sed -i '' 'LINE_NUMBERd' file.py
```

### File Reconstruction
```bash
# When replacing large blocks
head -BEFORE_LINE file.py > /tmp/new_file.py
cat /tmp/new_content.txt >> /tmp/new_file.py
tail -n +AFTER_LINE file.py >> /tmp/new_file.py
mv /tmp/new_file.py file.py
```

---

# 🔧 Troubleshooting

## Common Issues

### "AttributeError: object has no attribute 'xxx'"
- Usually missing field in Pydantic model
- Check the model definition and add the field
- Example: `is_active: Optional[bool] = None`

### "JSON.parse error" in Frontend
- Usually malformed API response
- Check backend endpoint for errors
- Add console.log to debug response

### Tools Not Re-processing
- Check condition logic in `update_tool` endpoint
- Ensure `new_config.get('field')` returns `None` not default
- Use: `if new_value is not None and old_value != new_value`

### Railway Deployment Fails
- Check Railway logs for specific error
- Verify Python syntax: `python3 -m py_compile api/main.py`
- Verify requirements.txt has all dependencies

---

# 📊 Database Schema (JSON Files)

## agents.json
```json
{
  "agent-uuid": {
    "id": "agent-uuid",
    "name": "Agent Name",
    "description": "Description",
    "system_prompt": "You are...",
    "model_id": "gpt-4",
    "tools": ["tool-uuid-1", "tool-uuid-2"],
    "guardrails": {...},
    "status": "published",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

## tools.json
```json
{
  "tool-uuid": {
    "id": "tool-uuid",
    "name": "Tool Name",
    "type": "website",
    "description": "Description",
    "config": {
      "url": "https://...",
      "recursive": true,
      "max_pages": 10
    },
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

## security/users.json
```json
{
  "user-uuid": {
    "id": "user-uuid",
    "email": "user@example.com",
    "password_hash": "bcrypt-hash",
    "name": "User Name",
    "roles": ["role-uuid"],
    "mfa_enabled": true,
    "mfa_secret": "base32-secret",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

## security/roles.json
```json
{
  "role-uuid": {
    "id": "role-uuid",
    "name": "Super Admin",
    "description": "Full system access",
    "permissions": ["agents:read", "agents:write", ...],
    "is_system": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

# 🎯 Next Steps / Roadmap

## Immediate (Ready to Implement)
- [ ] Streaming responses for chat
- [ ] Agent versioning
- [ ] Agent analytics dashboard
- [ ] Webhook testing endpoint

## Short-term
- [ ] Google Gemini provider
- [ ] AWS Bedrock provider
- [ ] Agent templates library
- [ ] Batch operations for tools

## Long-term (Architecture)
- [ ] Migrate to PostgreSQL
- [ ] Split monolith to microservices
- [ ] Add Redis caching
- [ ] Kubernetes deployment
- [ ] Multi-tenancy support

---

# 📞 Support

**GitHub Issues:** https://github.com/ahamdihussein-star/agentforge/issues
**Production URL:** https://agentforge2.up.railway.app

---

*This documentation is optimized for AI code assistants. For human-readable documentation, see the original MASTER_DOCUMENTATION.md*
