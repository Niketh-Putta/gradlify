#!/usr/bin/env bash
set -euo pipefail

# Simple helper to stage, commit and push all changes on the current branch.
# Usage: ./scripts/auto-commit-push.sh [branch] [message]

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"
MSG="${2:-Automated update $(date -u +"%Y-%m-%dT%H:%M:%SZ")}" 

git add -A

# If there are no staged changes, exit cleanly.
if git diff --staged --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$MSG"
git push origin "$BRANCH"

echo "Changes committed and pushed to origin/$BRANCH"
