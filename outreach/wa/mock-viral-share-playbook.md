# Make the 14 June mock spread beyond Level Field

## Pricing mechanic (must match checkout)

- **60 families** can register at **£9.99** (marketing cap)
- With ~50 already in, you say **"next 10 spots"**
- Spot **61+** pays **£14.99**
- Checkout enforces this automatically after you deploy edge functions

**Before you post:** deploy `live-mock-signup-count` + `create-live-mock-payment` so Stripe actually charges £14.99 when spots are gone.

---

## Send sequence

### Message 1 — Voice note (15 sec)

> "Quick one. Sunday's live mock has about 10 spots left at £9.99. After that it's £14.99. Nearly 50 families already in. Forward the next message to one parent in your year chat if they'll find it useful."

### Message 2 — Poster + caption

`mock-gc-caption.txt` + poster image.

### Message 3 — Forward ask (2 min later)

`mock-forward-ask.txt`

### Message 4 — When spots are low or gone

`mock-spots-reminder.txt` (gets forwarded again).

---

## FOMO lines (all enforceable)

| Line | Why it works |
|------|----------------|
| Nearly 50 families registered | Social proof |
| Only the next 10 spots at £9.99 | Real cap in Stripe |
| Then £14.99 | Standard price on site already |
| Forward before spots are gone | Reason to share *today* |

---

## Multipliers

1. DM 5 engaged parents: "10 spots left at £9.99 — mind forwarding to your year chat?"
2. Post in 2–3 year-group chats you're already in
3. Instagram story when spots hit 5, 3, 1
