# AI Context System - Setup Guide

## ✅ What Was Created

### 1. **`.windsurfrules`** (Core Rules)
- Simplified from 309 lines to ~100 lines
- Focuses on platform vision and mandatory rules
- Automatically loaded by Windsurf on startup

### 2. **`.windsurf/workflows/smart-coding.md`** (Auto Workflow)
- Windsurf runs this automatically when you request changes
- Searches RAG for similar patterns
- Checks regression watchlist
- Auto-updates context after changes

### 3. **`.ai/context/`** (RAG System)
- `config.yaml` - Configuration
- `scripts/index_all.py` - Index codebase
- `scripts/search.py` - Search for patterns
- `scripts/auto_update.py` - Auto-update on changes
- `embeddings/` - Stored embeddings (gitignored)

### 4. **`project-brain/`** (Organized Knowledge)
- `product.md` - What we're building
- `architecture.md` - How it works
- `module-map.md` - Where to find code
- `regression-watchlist.md` - Don't break these
- `current-task.md` - Track current work
- `decision-log.md` - Important decisions

### 5. **`.ai/tools/`** (Helper Scripts)
- `rag_search.sh` - Quick search from terminal
- `update_context.sh` - Manual update

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
pip install openai numpy pyyaml
```

### Step 2: Set OpenAI API Key

```bash
# Add to your ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="your-openai-api-key"

# Or set for current session
export OPENAI_API_KEY="your-openai-api-key"
```

### Step 3: Run Initial Indexing

```bash
python .ai/context/scripts/index_all.py
```

**This will:**
- Index all Python files (~500-1000 chunks)
- Index all documentation (~100-200 chunks)
- Generate embeddings using OpenAI
- Save to `.ai/context/embeddings/`

**Expected output:**
```
🚀 Starting full indexing...

📝 Indexing code...
   Created 847 chunks from 156 files
   🧠 Generating embeddings...
      Processed 100/847 chunks
      Processed 200/847 chunks
      ...
   ✅ Saved code index: 847 chunks

📚 Indexing documentation...
   Created 123 chunks from 12 files
   🧠 Generating embeddings...
      Processed 100/123 chunks
      Processed 123/123 chunks
   ✅ Saved docs index: 123 chunks

✅ Indexing complete!
📊 Indexes saved to: .ai/context/embeddings
```

**Cost:** ~$0.50 (one-time)

### Step 4: Test Search

```bash
python .ai/context/scripts/search.py "process execution with approval"
```

**Expected output:**
```
🔍 Searching code for: 'process execution with approval'

1. core/process/nodes/human.py:45-89 (score: 0.892)
   Context: class ApprovalNodeExecutor(BaseNodeExecutor):
   Preview: async def execute(self, node, state, context) -> NodeResult:
        """Execute approval node"""...

2. core/process/engine.py:234-267 (score: 0.854)
   Context: async def _execute_node(self, node, state, context):
   Preview: if result.status == NodeStatus.WAITING:
        # Save checkpoint for approval...
```

---

## 📖 How To Use

### For You (Non-Developer)

**Just write your requests in business language!**

Example:
```
"عايز أضيف approval step في الـ workflow"
```

Windsurf will automatically:
1. Read `.windsurfrules`
2. Search RAG for "approval" patterns
3. Find `ApprovalNodeExecutor` in the code
4. Use the same pattern
5. Write the code
6. Update the RAG index

**You don't need to do anything!**

### For Windsurf (Automatic)

Windsurf automatically:
- Loads `.windsurfrules` on startup
- Runs `.windsurf/workflows/smart-coding.md` workflow
- Searches RAG before making changes
- Updates context after changes

### Manual Search (Optional)

If you want to search manually:

```bash
# Search code
python .ai/context/scripts/search.py "your query"

# Or use the shortcut
./.ai/tools/rag_search.sh "your query"
```

### Manual Update (Optional)

If you want to manually update the index:

```bash
# Full re-index
python .ai/context/scripts/index_all.py

# Or use the shortcut
./.ai/tools/update_context.sh
```

---

## 🔄 Auto-Update System

### Git Hooks (Coming Soon)

Will auto-update on every commit. For now, run manually after major changes:

```bash
python .ai/context/scripts/auto_update.py
```

---

## 📊 What Gets Indexed

### Code Files:
- `core/**/*.py` - All core modules
- `api/**/*.py` - All API endpoints
- `database/**/*.py` - All database models/services

### Documentation Files:
- `project-brain/**/*.md` - All project brain docs
- `docs/MASTER_DOCUMENTATION_UPDATED.md` - Master docs
- `PROJECT_STATUS.md` - Project status
- `README.md` - Main readme
- `database/COMMON_ISSUES.md` - Database issues
- `database/README.md` - Database guide

### Excluded:
- `**/__pycache__/**` - Python cache
- `**/migrations/**` - Database migrations (too noisy)
- `**/node_modules/**` - Node modules
- `**/.venv/**` - Virtual environments

---

## 💰 Cost Estimate

- **Initial indexing**: $0.50 (one-time)
- **Per-commit update**: $0.01-0.05 (only changed files)
- **Monthly**: < $5 (assuming 100 commits/month)

Using `text-embedding-3-small` model (cheap and fast).

---

## 🎯 Benefits

✅ **AI always has latest context** - Auto-updates on changes
✅ **No duplicate code** - AI finds existing patterns
✅ **Consistent patterns** - AI follows existing code style
✅ **Faster development** - AI doesn't need to read entire codebase
✅ **Better suggestions** - AI understands your architecture

---

## 🔧 Troubleshooting

### "Index not found"
```bash
python .ai/context/scripts/index_all.py
```

### "OpenAI not available"
```bash
pip install openai
export OPENAI_API_KEY="your-key"
```

### "No results found"
Index might be outdated:
```bash
python .ai/context/scripts/index_all.py
```

### Check index status
```bash
cat .ai/context/embeddings/metadata.json
```

---

## 📝 Next Steps

1. ✅ Run initial indexing (Step 3 above)
2. ✅ Test search (Step 4 above)
3. ✅ Start using Windsurf normally
4. ✅ Watch it automatically use RAG
5. ✅ Enjoy better AI suggestions!

---

## 🎓 Learning Resources

- `.windsurfrules` - Core platform rules
- `project-brain/product.md` - What we're building
- `project-brain/architecture.md` - How it works
- `project-brain/module-map.md` - Where to find code
- `.ai/README.md` - RAG system details

---

**Questions? Check `.ai/README.md` for more details.**
