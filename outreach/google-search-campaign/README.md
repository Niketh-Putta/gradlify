# Gradlify Google Search campaign

**Status:** conversion tracking live on site · campaign **not yet enabled** in Google Ads  
**Account tag:** `AW-18325194310`  
**Signup conversion:** `AW-18325194310/560aCMek9NAcEMaMkaJE`  
**Updated:** 2026-07-16

## What’s already shipped (code)

| Item | Where |
|------|--------|
| gtag config | `index.html` |
| Signup conversion (once/session) | `src/lib/googleAds.ts` → Auth / AuthModal / AuthComponent |
| SEO title/meta for Search intent | `index.html` |
| Ad click attribution (gclid + UTMs) | `src/lib/adAttribution.ts` → LandingPage |

## What you do in Google Ads (paste from this folder)

1. Open [Google Ads](https://ads.google.com) → account tied to `AW-18325194310`
2. Confirm **Sign-up** conversion is recording (Tools → Conversions)
3. Create campaign using `campaign-settings.md`
4. Paste keywords from `keywords.md` into ad groups
5. Paste RSA copy from `ads.md`
6. Add negatives from `negatives.md`
7. Final URL: `https://gradlify.com/11-plus?utm_source=google&utm_medium=cpc&utm_campaign=search_11plus_uk`
8. Enable at **£20/day** · UK only · Search only
9. Kill rule: pause if CAC > **£50** after **£150** spend with ≥20 conversions or if signup→paid is trash

## Kill / scale rules

| After | Action |
|-------|--------|
| £50 spend, 0 signups | Pause · check landing + conversion tag |
| £150 spend, CAC > £50 (to signup) | Pause · rewrite ads/keywords |
| CAC ≤ £40 to signup and ≥1 paid in 14 days | Scale to £40/day |
| Still no paid after 30 signups | Stop Search · funnel first |

## Files

- `campaign-settings.md` - structure, geo, bidding, budget
- `keywords.md` - ad groups + match types
- `ads.md` - RSA headlines + descriptions
- `negatives.md` - account + campaign negatives
- `launch-checklist.md` - tick before enabling
