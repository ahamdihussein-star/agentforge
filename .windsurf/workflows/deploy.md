---
description: Commit, push, and deploy to Railway (automated)
---

# Deploy Workflow

Ships the current changes to production. Railway auto-deploys from `main`, so a
push to `main` IS a production deploy. Full reference: `docs/DEPLOYMENT.md`.

## Prerequisite (one time)
`scripts/.deploy.env` must exist with `GITHUB_TOKEN=<PAT>` (it is gitignored).
If missing: `cp scripts/.deploy.env.example scripts/.deploy.env` and fill the token.

## One-shot deploy
// turbo
Run: `bash scripts/deploy.sh -y -a "chore: {summary_of_change}"`

Stages all changes, commits, pushes to `main`; Railway auto-deploys.

## Hands-off watcher (optional)
Run: `bash scripts/watch-deploy.sh` — auto-commits + pushes on every change
(debounced). Stop with Ctrl+C.

## Safety / env
- Keep `AUTH_GATE_MODE=monitor` on Railway while iterating; switch to `enforce`
  only after Railway logs show no needed routes being blocked.
- Keep `ENABLE_DEBUG_ENDPOINTS=false` in production.
- Secrets (`.env`, `scripts/.deploy.env`) are gitignored — never commit them.
- When adding a new `/api/*` route, either protect it with auth or add it to the
  allow-list in `api/auth_gate.py`, otherwise it will be blocked under `enforce`.
