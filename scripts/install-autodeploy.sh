#!/usr/bin/env bash
#
# AgentForge - install the auto-deploy watcher as a macOS LaunchAgent.
#
# After this runs ONCE, scripts/watch-deploy.sh runs in the background, starts at
# login, and restarts if it dies. From then on every change is auto-committed +
# pushed + deployed with ZERO further intervention - including across reboots.
#
# Usage:
#   bash scripts/install-autodeploy.sh            # install + start
#   bash scripts/install-autodeploy.sh status     # is it running?
#   bash scripts/install-autodeploy.sh uninstall  # stop + remove
#
# Prereq: scripts/.deploy.env must exist with GITHUB_TOKEN (gitignored).
#
# NOTE: this means ANY change to the repo auto-deploys to PRODUCTION (Railway).
# Keep AUTH_GATE_MODE=monitor while iterating. To pause, run `uninstall`.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="com.agentforge.autodeploy"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
BASH_BIN="$(command -v bash)"
ACTION="${1:-install}"

case "$ACTION" in
  install)
    if [[ ! -f "$ROOT/scripts/.deploy.env" ]]; then
      echo "ERROR: $ROOT/scripts/.deploy.env not found." >&2
      echo "       cp scripts/.deploy.env.example scripts/.deploy.env  and add GITHUB_TOKEN first." >&2
      exit 1
    fi
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${BASH_BIN}</string>
    <string>${ROOT}/scripts/watch-deploy.sh</string>
  </array>
  <key>WorkingDirectory</key><string>${ROOT}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${ROOT}/scripts/watch-deploy.log</string>
  <key>StandardErrorPath</key><string>${ROOT}/scripts/watch-deploy.log</string>
</dict>
</plist>
PLISTEOF
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "Installed & started: $LABEL"
    echo "It now auto-commits/pushes on every change, starts at login, and self-restarts."
    echo "Logs:  $ROOT/scripts/watch-deploy.log"
    echo "Pause: bash scripts/install-autodeploy.sh uninstall"
    ;;
  uninstall|stop)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "Stopped & removed: $LABEL"
    ;;
  status)
    if launchctl list | grep -q "$LABEL"; then
      echo "running: $LABEL"
    else
      echo "not running"
    fi
    ;;
  *)
    echo "usage: bash scripts/install-autodeploy.sh [install|status|uninstall]" >&2
    exit 1
    ;;
esac
