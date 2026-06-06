# Gradlify autonomous email agent

Reads your Gmail, understands Gradlify context, drafts as Niketh, sends by itself.

## What it does

1. **Read** unread partnership threads via Kimi + Gmail  
2. **Match** sender to `manual-affiliate-tracker.csv`  
3. **Load** `NIKETH-KNOWLEDGE.md` + voice + decision tree  
4. **Draft** reply (OpenAI, your voice, no em dashes)  
5. **Validate** banned AI phrases  
6. **Send** (with `--send`) via Kimi  
7. **Log** everything to `outreach/email-agent-log.jsonl`  
8. **Skip** Sutton, closed partners, already-handled threads  

## Setup (once)

### 1. Kimi WebBridge + Gmail

- Kimi running at `http://127.0.0.1:10086`  
- Session: `gradlify-gmail-partnerships`  
- Gmail logged in as `niketh13putta@gmail.com` (repeat for `team@` in another session if needed)

### 2. OpenAI key

Add to `.env.local` in repo root:

```
OPENAI_API_KEY=sk-...
GRADLIFY_EMAIL_MODEL=gpt-4o-mini
```

### 3. Test dry-run

```bash
cd "/Users/nikethputta/Downloads/Projects/Gradlify/GRADLIFY APP CODES/11+ GRADLIFY"
python3 scripts/gradlify-email-agent.py --limit 3
```

Prints drafts only. Check `outreach/email-agent-log.jsonl`.

### 4. Go live

```bash
python3 scripts/gradlify-email-agent.py --send --limit 5
```

## Run on a schedule (optional)

```bash
# every 2 hours during work day - add to crontab
0 9-18/2 * * * cd "/path/to/repo" && python3 scripts/gradlify-email-agent.py --send --limit 10
```

Or tell Cursor: **"Run the email agent"** and it will execute the script.

## Cursor chat (hands-off)

New chat, pin this repo:

```
Run scripts/gradlify-email-agent.py dry-run first, show me drafts.
If they look human, run with --send --limit 5.
Use gradlify-email skill voice rules.
```

## Files

| File | Role |
|------|------|
| `scripts/gradlify-email-agent.py` | Autonomous loop |
| `scripts/kimi_gmail_lib.py` | Read/send Gmail |
| `outreach/email-agent-log.jsonl` | Audit log |
| `outreach/email-agent-state.json` | Don't double-reply |
| `.cursor/skills/gradlify-email/` | Voice + rules |

## Safety

- Default is **dry-run** (no `--send` = no send)  
- Blocklist: Sutton 11 Plus  
- Skips `do_not_contact`, `closed_no_commission`  
- Rejects drafts with em dashes or AI phrases  
- Deck attachments still manual if needed  

## Tune voice

Paste 2–3 real emails you wrote into `.cursor/skills/gradlify-email/voice.md` under a new "Niketh samples" section.
