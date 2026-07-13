# Level Field — next action only

**Generated from sent-ledger.** Re-run: `python3 scripts/kimi-state-audit.py`

## Current decision: viral_sequence

Poster + caption likely **not sent yet** (status: unknown). Send once only.

### Do this (in order)

1. **Optional voice note (15 sec)** — script in `outreach/wa/mock-viral-share-playbook.md`
2. **Poster** — screenshot `outreach/assets/14-june-mock-poster.html` → attach to group
3. **Caption** — paste `outreach/wa/mock-gc-caption.txt` as image caption
4. **2 min later** — paste `outreach/wa/mock-forward-ask.txt`

### After sending

```bash
# Mark poster sent in ledger (or re-run Kimi audit)
python3 scripts/kimi-state-audit.py
```

### Do NOT send

- Timing poll
- Sprint launch / Y4 Y5 Y6 broadcast
- `mock-14-june-announce.txt` (too long)
- Cold Premium announce to whole group
- Another partner chase email

### If poster already sent (Kimi confirms)

Skip to `outreach/wa/mock-spots-reminder.txt` or `mock-weekend-reminder.txt` only.
