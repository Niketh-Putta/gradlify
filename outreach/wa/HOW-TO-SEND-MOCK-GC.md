# How to send the 14 June mock in The Level Field

## Before you send

- [ ] Deploy edge functions so **£9.99** caps at **60 signups**, then **£14.99** (see below)
- [ ] Optional: create Stripe **£14.99** one-time Price → `LIVE_MOCK_STANDARD_PRICE_ID_LIVE`
- [ ] Image ready (ChatGPT or screenshot from `14-june-mock-poster.html`)

---

## Step 1 — Make the image

**Option A — ChatGPT**

1. Open ChatGPT → create image
2. Paste everything from `outreach/assets/mock-poster-chatgpt-prompt.txt`
3. Download PNG → save as `mock-14-june-poster.png`

**Option B — No ChatGPT**

1. Open `outreach/assets/14-june-mock-poster.html` in browser
2. Screenshot the **left square** poster
3. Save as `mock-14-june-poster.png`

---

## Step 2 — Send in WhatsApp (exact order)

1. Open **The Level Field** group
2. **Optional:** 15 sec voice note from `mock-viral-share-playbook.md` (forward ask + Monday price)
3. Tap **attach** → **Gallery** → select `mock-14-june-poster.png`
4. In the caption box, paste from `outreach/wa/mock-gc-caption.txt`
5. Tap **Send** (one message: image + caption)
6. **2 min later:** paste `mock-forward-ask.txt` as a separate text message

If a parent asks what to forward elsewhere, send them `mock-forward-for-parents.txt` in DM.

---

## Step 0 — Deploy spot pricing (once)

```bash
supabase functions deploy live-mock-signup-count
supabase functions deploy create-live-mock-payment
```

First **60 registrations** → £9.99 at checkout. **61+** → £14.99.

## Step 3 — Spots reminder (`mock-spots-reminder.txt`)

Send when spots are low or after a burst of signups.

---

## Do not

- Send long essay version (`mock-14-june-announce.txt`) — too long for FOMO
- Post link without image
- Re-explain sprint or Premium from scratch
