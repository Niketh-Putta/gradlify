Auto-commit & push helper
=========================

This repo includes a small helper script `scripts/auto-commit-push.sh` that stages, commits (with a timestamped default message) and pushes the current working tree to the current branch's `origin` remote.

Usage:

```bash
# Run with default message and current branch
npm run auto:push

# Provide a branch and a custom message
sh ./scripts/auto-commit-push.sh feature/branch "feat: description"
```

Auto-watch mode (commit on changes):

```bash
# Watches key folders and auto-commits + pushes (debounced)
npm run auto:watch
```

Notes:
- The script only commits if there are staged changes. It will print "No changes to commit." if nothing changed.
- This is provided as a convenience. Be careful: automated commits may include unintended changes. Review local changes before running it.
