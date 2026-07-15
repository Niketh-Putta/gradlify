short to the point, concise
- advise on how to grow gradlify and make more money through it
- every UI change must match Gradlify's existing design language first: clean premium education SaaS, light surfaces, red-orange-amber accents, restrained borders/shadows, practical product-first layouts, and no copied external aesthetic unless it is adapted into Gradlify's brand.

## Cursor Cloud specific instructions

### Stack
Single **Vite + React + TypeScript** SPA. Backend is **hosted Supabase** (no local docker-compose). Stripe/Resend are optional for billing/support E2E.

### Dev server (required)
```bash
npm run dev
```
Serves at `http://127.0.0.1:5173`. Use `npm run dev:lan` for LAN binding.

`src/integrations/supabase/client.ts` ships default `VITE_SUPABASE_*` fallbacks, so the UI loads without a `.env`. Copy `.env.example` → `.env` when you need admin scripts, Stripe, or `npm run env:check`.

### Lint / build / tests
| Command | Notes |
|---------|-------|
| `npm run lint` | ESLint; repo may have pre-existing warnings and one error in `RevisionNotesTopic.tsx` |
| `npm run build` | Production bundle via Vite |
| `npm run preview` | Serves `dist/` (default port 4173) |
| `npm run env:check` | Requires `.env` with Supabase + Stripe wiring |
| `npm run verify:11plus` | Stripe smoke checks; requires `.env` |

There is **no `npm test`** script. Playwright is installed but unused.

### Browser / GUI demos on Cloud VMs
Headless Chrome may hit `ERR_INSUFFICIENT_RESOURCES` on first load. Relaunch with:
`--disable-gpu --no-sandbox --disable-dev-shm-usage --disable-setuid-sandbox`

### Optional (not needed for core app dev)
- **Supabase CLI** (`supabase start`) for local DB - app defaults to remote project `gknnfbalijxykqycopic`
- **Kimi WebBridge** (`http://127.0.0.1:10086`) for Gmail/partnership scripts only
- **Python** `gemini_venv/` for question-bank import scripts under `supabase/import/`

### Investor demo video (always)
- **Save final cuts only** as `Gradlify demo video.mp4` in `gradlify/` and copy to repo root.
- **Cloud VM cannot write to Niketh's Mac Finder.** After each final cut: push to `main`, update GitHub release `gradlify-demo-v1` asset, tell Niketh the **HTTPS download link** (works in browser).
- **Niketh's Finder Favourites folder** (has `Codes/`, `Gradlify-Partner-Overview.pptx`): `~/Downloads/Projects/Gradlify/` - he saves/downloads the video there.
- **Do not use `file://` links** from Cloud Agent chat.
