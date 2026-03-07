# AI Context System

This folder contains the RAG (Retrieval-Augmented Generation) system for AgentForge.

## What It Does

- **Indexes your codebase** automatically
- **Searches for similar patterns** when you request changes
- **Keeps documentation up-to-date** with code changes
- **Helps AI understand context** without reading entire codebase

## Structure

```
.ai/
├── context/
│   ├── embeddings/          # Generated embeddings (gitignored)
│   │   ├── code.json
│   │   ├── docs.json
│   │   └── metadata.json
│   │
│   ├── config.yaml          # Configuration
│   │
│   └── scripts/
│       ├── index_all.py     # Index everything
│       ├── search.py        # Search the index
│       └── auto_update.py   # Auto-update on changes
│
└── README.md               # This file
```

## Setup

### 1. Install Dependencies

```bash
pip install openai numpy pyyaml
```

### 2. Set OpenAI API Key

```bash
export OPENAI_API_KEY="your-key-here"
```

### 3. Run Initial Indexing

```bash
python .ai/context/scripts/index_all.py
```

This will:
- Index all Python files in `core/`, `api/`, `database/`
- Index all documentation in `project-brain/`, `docs/`
- Generate embeddings using OpenAI
- Save to `.ai/context/embeddings/`

**Cost**: ~$0.50 for initial indexing

## Usage

### Search Code

```bash
python .ai/context/scripts/search.py "process execution with approval"
```

Returns relevant code chunks with file paths and line numbers.

### Auto-Update

The system auto-updates on every git commit via hooks.

To manually update:

```bash
python .ai/context/scripts/auto_update.py
```

## How Windsurf Uses It

Windsurf automatically:
1. Reads `.windsurfrules` on startup
2. Uses `.windsurf/workflows/smart-coding.md` workflow
3. Searches RAG before making changes
4. Finds similar patterns in your codebase
5. Writes code following existing patterns

## Configuration

Edit `.ai/context/config.yaml` to:
- Change which files to index
- Adjust chunk size
- Change embedding model
- Configure auto-update triggers

## Maintenance

### Re-index Everything

```bash
python .ai/context/scripts/index_all.py
```

### Check Index Status

```bash
cat .ai/context/embeddings/metadata.json
```

### Clear Index

```bash
rm -rf .ai/context/embeddings/*.json
```

Then re-run indexing.

## Cost Estimate

- **Initial indexing**: $0.50
- **Per-commit update**: $0.01-0.05
- **Monthly**: < $5

Using `text-embedding-3-small` model (cheap and fast).

## Troubleshooting

**"Index not found"**
→ Run: `python .ai/context/scripts/index_all.py`

**"OpenAI not available"**
→ Install: `pip install openai`
→ Set key: `export OPENAI_API_KEY="..."`

**"No results found"**
→ Index might be outdated, re-run indexing

## Files Ignored

The `.ai/context/embeddings/` folder is gitignored (too large).
Each developer should run indexing locally.
