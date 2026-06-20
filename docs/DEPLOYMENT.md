# Deployment & Automation

How AgentForge ships to production. Railway auto-deploys from the GitHub `main`
branch, so **pushing to `main` = deploying to production.**

## TL;DR

```bash
# one-time setup
cp scripts/.deploy.env.example scripts/.deploy.env
#   then edit scripts/.deploy.env and set GITHUB_TOKEN=<your PAT>

# deploy now (no prompt, stage everything)
bash scripts/deploy.sh -y -a "chore: <what changed>"

# OR fully hands-off: auto-deploy on every change
bash scripts/watch-deploy.sh
```

## Components

| File | Purpose |
|------|---------|
| `scripts/deploy.sh` | Commit + push helper. Reads the GitHub token from `scripts/.deploy.env`, stages changes, commits, pushes to the deploy branch. |
| `scripts/watch-deploy.sh` | Background watcher. Detects changes, waits for a quiet period (debounce), then calls `deploy.sh -y -a`. Zero intervention. |
| `scripts/.deploy.env` | **Gitignored** secret file holding `GITHUB_TOKEN`. Never committed. Copy it from `.deploy.env.example`. |

## scripts/deploy.sh

Flags:
- `-y`, `--yes` — skip the confirmation prompt (for automation).
- `-a`, `--all` — stage all changes (`git add -A`) instead of the explicit allow-list inside the script. Safe because secrets are gitignored.

Behavior & safety:
- Refuses to run unless `scripts/.deploy.env` is gitignored (guards against leaking the token).
- The token is used only inside the push URL; it is never written to git config and is redacted from output.
- Derives `owner/repo` from the existing `origin` remote (works for SSH or HTTPS remotes).

Examples:
```bash
bash scripts/deploy.sh                      # interactive, explicit file list
bash scripts/deploy.sh -y                    # no prompt, explicit file list
bash scripts/deploy.sh -y -a "fix: ..."      # no prompt, stage everything
```

## scripts/watch-deploy.sh

Run once and forget:
```bash
bash scripts/watch-deploy.sh
# or in the background:
nohup bash scripts/watch-deploy.sh > scripts/watch-deploy.log 2>&1 &
# stop: Ctrl+C, or kill the background PID
```

Tunables (env vars):
- `WATCH_POLL_SECONDS` — how often to check for changes (default 5).
- `WATCH_DEBOUNCE_SECONDS` — quiet period required before deploying (default 20) so a half-finished edit is never committed.
- `WATCH_MIN_INTERVAL` — minimum seconds between two deploys (default 60) so Railway isn't hammered.

## Fully hands-off (auto-start, survives reboot)

Install the watcher as a macOS LaunchAgent so it runs in the background, starts at
login, and self-restarts — set it once and never touch it again:

```bash
bash scripts/install-autodeploy.sh            # install + start
bash scripts/install-autodeploy.sh status     # check it's running
bash scripts/install-autodeploy.sh uninstall  # pause / remove
```

After install, every change is auto-committed + pushed + deployed with zero
intervention. Logs go to `scripts/watch-deploy.log`. Because this deploys to
production on every change, keep `AUTH_GATE_MODE=monitor` while iterating, and run
`uninstall` to pause.

## Railway environment variables

Set these in Railway → Variables:

| Var | Values | Default | Meaning |
|-----|--------|---------|---------|
| `AUTH_GATE_MODE` | `monitor` \| `enforce` | `monitor` | `monitor` logs would-be-blocked `/api/*` requests but allows them; `enforce` returns 401 for unauthenticated protected routes. |
| `ENABLE_DEBUG_ENDPOINTS` | `true` \| `false` | `false` | When false, `/api/debug/*` is blocked (404 in enforce / logged in monitor). Keep false in production. |

## Safe rollout of the auth gate (Phase 1)

1. Deploy with `AUTH_GATE_MODE=monitor` (default).
2. Log in and use the app; watch Railway logs for `auth_gate[monitor]: would BLOCK ...`.
3. If a line corresponds to something the SPA legitimately needs **before** login, add that path to the allow-list in `api/auth_gate.py` (`PUBLIC_API_PATHS` / `PUBLIC_API_PREFIXES`) and redeploy.
4. When the only "would BLOCK" lines are debug/unauthenticated noise, set `AUTH_GATE_MODE=enforce` and redeploy.
5. Verify: `GET /api/debug/agents-ownership` and `GET /api/tools` without a token now return 404/401.

## Important

- Pushing always deploys to **production**. Keep `AUTH_GATE_MODE=monitor` while iterating so prod stays safe, and only run the watcher when you want changes to go live.
- Secrets (`.env`, `scripts/.deploy.env`, `*.deploy.env`, `*.key`, `*.pem`) are gitignored — verify with `git check-ignore scripts/.deploy.env` before trusting automation.
