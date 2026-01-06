# 🔧 AgentForge v3.2 - Changes Summary

## Files Updated

### 1. main.py (Backend)

#### Bug Fixes

| Line | Issue | Fix |
|------|-------|-----|
| 1591-1594 | Broken Unicode (Ã× instead of ×) | Replaced with ASCII symbols (* / =) |
| 1840 | Broken bullet points (â€¢) | Replaced with ASCII dash (-) |
| 1610, 1626, 1638 | Version mismatch (3.1 vs 3.2) | Unified to 3.2.0 |
| 1502 | Sync call in async function | Changed to `await search_documents_rag()` |
| 1621 | CORS allows all origins | Made configurable via CORS_ORIGINS env var |
| 5042-5050 | Path traversal vulnerability | Added security checks |

#### New Features

| Feature | Description |
|---------|-------------|
| Demo Items Persistence | Added save_demo_items() and load_demo_items() functions |
| Startup/Shutdown Events | Added events to load and save demo items |
| Auto-save on Delete | Demo items saved after deletion |

### 2. Documentation (New)

- Added complete Demo Lab documentation
- Added 14 Demo Lab API endpoints
- Added Mock API examples
- Added Changelog section
- Added Configuration section for CORS

---

## How to Apply Changes

### Option 1: Replace Files

```bash
# Copy the new main.py to your project
cp main.py ~/Documents/agentforge/api/main.py

# Rebuild container
cd ~/Documents/agentforge
docker-compose up -d --build
```

### Option 2: Manual Changes

Apply these specific changes to your existing main.py:

1. **Version Sync** (3 places):
   - Line ~1610: Change startup message to v3.2
   - Line ~1620: Change FastAPI version to "3.2.0"
   - Line ~1626: Change root endpoint version to "3.2.0"

2. **CORS Configuration** (around line 1621):
   ```python
   ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
   app.add_middleware(
       CORSMiddleware, 
       allow_origins=ALLOWED_ORIGINS,
       ...
   )
   ```

3. **File Security** (around line 5042):
   Add path traversal checks to serve_demo_file()

4. **Demo Persistence** (around line 3165):
   Add save_demo_items() and load_demo_items() functions

---

## Testing Checklist

After applying changes:

- [ ] Server starts without errors
- [ ] Version shows 3.2.0 at http://localhost:8000/
- [ ] Demo Lab items persist after restart
- [ ] CORS works with custom origins (if set)
- [ ] File downloads work correctly
- [ ] Chat with agents works correctly

---

## Environment Variables (New)

Add to your .env file:

```bash
# Optional: Restrict CORS origins for production
CORS_ORIGINS=http://localhost:8000,http://localhost:3000
```

---

## Known Issues Remaining

1. **Unicode in Logs** - Emojis may display incorrectly in some terminals
2. **Ollama Models** - Sync request in get_available_models() 
3. **ChromaDB Connections** - No connection pooling

These are minor and don't affect functionality.
