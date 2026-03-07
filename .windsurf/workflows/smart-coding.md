---
description: Smart coding with RAG context
---

# Smart Coding Workflow

This workflow runs automatically when you request code changes.

## Steps:

### 1. Load Core Rules
Read `.windsurfrules` for core principles.

### 2. Search RAG Context
// turbo
Run: `python .ai/context/scripts/search.py "{user_request}"`

This searches the code index for similar patterns.

### 3. Check Regression Watchlist
Read `project-brain/regression-watchlist.md` to avoid breaking critical features.

### 4. Check Module Map
Read `project-brain/module-map.md` to find the right files to modify.

### 5. Implement Changes
Write code following the patterns found in RAG search.
Follow enterprise standards from `.windsurfrules`.

### 6. Update Context
// turbo
After changes, run: `python .ai/context/scripts/auto_update.py`

This re-indexes modified files.

### 7. Update Documentation
If architecture changed, update `project-brain/architecture.md`.
If new feature added, update `project-brain/product.md`.

### 8. Commit & Push
// turbo
Auto-commit and push changes with conventional commit message.
