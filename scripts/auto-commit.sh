#!/bin/bash
# Script for AI to commit and push changes automatically
# Requires: gh CLI authenticated (gh auth login)

set -e

cd "$(dirname "$0")/.." || exit 1

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not installed. Please install it first:"
    echo "   Mac: brew install gh"
    echo "   Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub. Please run: gh auth login"
    exit 1
fi

# Get commit message from argument or use default
COMMIT_MSG="${1:-Auto-commit from AI}"

echo "📝 Staging all changes..."
git add -A

echo "💾 Committing..."
git commit -m "$COMMIT_MSG" || {
    echo "⚠️  No changes to commit"
    exit 0
}

echo "🚀 Pushing to GitHub..."
git push origin main || {
    echo "❌ Push failed. Trying with gh..."
    gh repo sync || {
        echo "❌ Both git push and gh repo sync failed"
        exit 1
    }
}

echo "✅ Successfully committed and pushed to GitHub!"
