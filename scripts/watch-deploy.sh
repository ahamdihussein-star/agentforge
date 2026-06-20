#!/usr/bin/env bash
#
# AgentForge - hands-off auto-deploy watcher.
#
# Watches the working tree and, whenever changes appear AND then stay quiet for a
# debounce window (so it never commits a half-finished edit), automatically runs:
#     scripts/deploy.sh -y -a   ->  git add -A, commit, push  ->  Railway deploys.
#
# Start it once, then make changes freely with ZERO further intervention:
#     bash scripts/watch-deploy.sh
#   or in the background:
#     nohup bash scripts/watch-deploy.sh > scripts/watch-deploy.log 2>&1 &
#   stop it with Ctrl+C  (or: kill the background process).
#
# Tunables (env):
#   WATCH_POLL_SECONDS      how often to check for changes        (default 5)
#   WATCH_DEBOUNCE_SECONDS  quiet period required before deploy   (default 20)
#   WATCH_MIN_INTERVAL      min seconds between two deploys       (default 60)
#
# IMPORTANT: every auto-deploy pushes to the deploy branch and ships to PRODUCTION
# on Railway. Keep AUTH_GATE_MODE=monitor while iterating so prod stays safe, and
# only run this watcher while you actually want changes to go live.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

POLL="${WATCH_POLL_SECONDS:-5}"
DEBOUNCE="${WATCH_DEBOUNCE_SECONDS:-20}"
MIN_INTERVAL="${WATCH_MIN_INTERVAL:-60}"

# Fail fast if the token isn't set up, instead of looping on errors.
if [[ ! -f "scripts/.deploy.env" ]]; then
  echo "ERROR: scripts/.deploy.env not found. Set it up before starting the watcher." >&2
  exit 1
fi

echo "watch-deploy: watching $ROOT"
echo "  poll=${POLL}s  debounce=${DEBOUNCE}s  min-interval=${MIN_INTERVAL}s"
echo "  every change -> auto commit + push + Railway deploy. Ctrl+C to stop."

last_deploy_epoch=0

while true; do
  sig="$(git status --porcelain)"
  if [[ -n "$sig" ]]; then
    # Wait for a quiet period; if anything changed during it, restart the wait.
    sleep "$DEBOUNCE"
    sig2="$(git status --porcelain)"
    if [[ "$sig2" == "$sig" ]]; then
      now="$(date +%s)"
      since=$(( now - last_deploy_epoch ))
      if (( since < MIN_INTERVAL )); then
        sleep $(( MIN_INTERVAL - since ))
      fi
      ts="$(date '+%Y-%m-%d %H:%M:%S')"
      echo "watch-deploy: changes detected, deploying ($ts)"
      if bash scripts/deploy.sh -y -a "chore: auto-sync ${ts}"; then
        last_deploy_epoch="$(date +%s)"
      else
        echo "watch-deploy: deploy failed; will retry on next change."
      fi
    fi
  fi
  sleep "$POLL"
done
