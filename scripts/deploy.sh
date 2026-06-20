#!/usr/bin/env bash
#
# AgentForge - commit & push helper.
#
# Reads a GitHub Personal Access Token from a GITIGNORED file (scripts/.deploy.env)
# so the secret is never hardcoded, never printed, and never committed.
#
# Usage:
#   1) cp scripts/.deploy.env.example scripts/.deploy.env
#   2) put your PAT in scripts/.deploy.env  (GITHUB_TOKEN=...)
#   3) bash scripts/deploy.sh "optional commit message"
#
# Safety:
#   - Stages ONLY the files in FILES_TO_COMMIT (no `git add -A`, so stray/los noise
#     is never committed).
#   - Refuses to run unless the secret file is gitignored.
#   - Redacts the token from any git output.
#   - Asks for confirmation before committing/pushing (push triggers a Railway deploy).
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SECRET_FILE="scripts/.deploy.env"
REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${GIT_BRANCH:-main}"
COMMIT_MSG="${1:-chore(security): Phase 1 - API auth gate (monitor), mask provider keys, block /api/debug; update project-brain docs}"

# Files this script is allowed to commit. Edit this list as the work evolves.
FILES_TO_COMMIT=(
  "api/auth_gate.py"
  "api/main.py"
  "project-brain/decision-log.md"
  "project-brain/module-map.md"
  "project-brain/current-task.md"
  "project-brain/regression-watchlist.md"
  ".gitignore"
  "scripts/deploy.sh"
  "scripts/.deploy.env.example"
)

# --- load the secret ---
if [[ ! -f "$SECRET_FILE" ]]; then
  echo "ERROR: $SECRET_FILE not found." >&2
  echo "       Run: cp scripts/.deploy.env.example $SECRET_FILE  and add your GITHUB_TOKEN." >&2
  exit 1
fi
set -a; # shellcheck disable=SC1090
source "$SECRET_FILE"; set +a
: "${GITHUB_TOKEN:?GITHUB_TOKEN is missing in $SECRET_FILE}"

# --- never leak the secret file ---
if ! git check-ignore -q "$SECRET_FILE"; then
  echo "ERROR: $SECRET_FILE is NOT gitignored. Aborting so your token can't leak." >&2
  exit 1
fi

# --- derive owner/repo from the existing remote (works for SSH or HTTPS remotes) ---
REMOTE_URL="$(git remote get-url "$REMOTE")"
REPO_PATH="$(printf '%s' "$REMOTE_URL" | sed -E 's#^git@github.com:##; s#^https://[^/]*github.com/##; s#\.git$##')"
if [[ -z "$REPO_PATH" || "$REPO_PATH" == "$REMOTE_URL" ]]; then
  echo "ERROR: could not parse owner/repo from remote URL: $REMOTE_URL" >&2
  exit 1
fi

# --- stage only the allowed files ---
echo "Staging:"
for f in "${FILES_TO_COMMIT[@]}"; do
  if [[ -e "$f" ]]; then git add -- "$f"; echo "  + $f"; fi
done

if git diff --cached --quiet; then
  echo "Nothing staged to commit. Exiting."
  exit 0
fi

echo
echo "Target: $REPO_PATH  branch: $BRANCH"
echo "NOTE: pushing will trigger a Railway deploy. (AUTH_GATE_MODE defaults to 'monitor'.)"
git --no-pager diff --cached --stat
read -r -p "Proceed with commit + push? [y/N] " ans
[[ "${ans:-}" == "y" || "${ans:-}" == "Y" ]] || { echo "Aborted (changes remain staged)."; exit 0; }

git commit -m "$COMMIT_MSG"

# Push using the token in the URL, without persisting it to git config, and
# redacting it from any output just in case.
PUSH_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_PATH}.git"
git push "$PUSH_URL" "HEAD:${BRANCH}" 2>&1 | sed -E "s#${GITHUB_TOKEN}#***REDACTED***#g"

echo
echo "Pushed to $REPO_PATH ($BRANCH). Railway will deploy."
echo "Next: watch Railway logs for 'auth_gate[monitor]: would BLOCK ...', then set AUTH_GATE_MODE=enforce when clean."
