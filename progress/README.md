# Gradlify Mission Control

Private progress dashboard — **not linked to gradlify.com**.

## Open it

Double-click or run:

```bash
open "/Users/nikethputta/Downloads/Projects/Gradlify/GRADLIFY APP CODES/11+ GRADLIFY/progress/index.html"
```

Or from the repo root:

```bash
open progress/index.html
```

## How it works

| File | Purpose |
|------|---------|
| `index.html` | Visual UI (progress ring, blocks, timeline, filters) |
| `data.js` | **Source of truth** — Cursor/Codex updates this when milestones change |

You can click step checkboxes or “Success by 20 June” items — those save in **your browser only** (localStorage). The main status comes from `data.js`.

## Ask Cursor to update

Say: *“Update Mission Control — Block 2 call with Andy is done”* and the agent will edit `progress/data.js`.
