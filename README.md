# Gradlify – 11+ Practised Properly

## Project info

**Live site**: https://gradlify.com

## How can I edit this project?

You can edit locally or through any standard Git workflow:

1. Clone the repository: `git clone https://github.com/Niketh-Putta/exam-mate-genie.git`
2. Install dependencies: `npm install`
3. Run the dev server: `npm run dev`
4. Commit and push your changes to `main` – the deployment setup will pick it up.

If you prefer cloud editors (Codespaces, GitHub Web), open the repo there and make your edits; pushing changes syncs everywhere.

## Staying local during auth

When you run `npm run dev`, the Vite server (usually at `http://127.0.0.1:5173`) should be the only page you interact with. To keep that dev experience after logging in:

1. Add `http://127.0.0.1:5173/auth/callback` (and `http://localhost:5173/auth/callback` if you use the bare hostname) to your Supabase project’s **Redirect URLs** so OAuth and magic links land back on the local build instead of `gradlify.com`.
2. Point `APP_BASE_URL` (used by the Supabase Edge functions) at your local origin while testing so return URLs stay on `localhost`.
3. Always open the Vite URL in your browser or the VS Code preview-if a tab tries to open `https://gradlify.com`, close it and continue on `http://127.0.0.1:5173`.
4. If you accidentally land on `gradlify.com` after auth, copy the cookies/local storage back to the dev tab by reloading the Vite URL; the app uses the same Supabase session, so it will recognize you immediately.

## UI density

When designing screens in this app, default to a compact layout sized around one-third of the visible screen:

- Keep primary cards, setup panels, and action blocks visually within roughly the top third of the viewport on desktop whenever the workflow allows it.
- Keep cards, sections, and controls tight. Prefer smaller paddings, gaps, icon containers, and radii unless the feature clearly needs more breathing room.
- Avoid oversized headings, badges, and CTA buttons on app screens. Prioritize dense, scan-friendly layouts over presentation-style spacing.
- Fit the important content above the fold where possible, especially on dashboard, exam, and setup screens. Use side-by-side layouts on desktop before adding vertical stacking.

## Live mock analytics

The live mock exam is a one-off authored paper, separate from normal practice and mock exams. After completion, students should only see a submitted state until results are released. The later analytics release should feel like a professional cohort report:

- Overall result: raw score, percentage, percentile, rank band, cohort mean, median, top quartile, and standard deviation.
- Section breakdown: comprehension, SPaG, vocabulary, timing, accuracy, unanswered questions, and strongest/weakest skill areas.
- Question review: every wrong question, the student's answer, the correct answer, explanation, topic tag, difficulty, and how many students missed the same question.
- Cohort comparison: distribution chart, percentile curve, average score by section, hardest/easiest questions, and common distractors.
- Readiness summary: school-style benchmark bands, target-school competitiveness, recommended next revision actions, and priority topics.
- Admin view: participation count, completion rate, suspiciously fast attempts, question-level item analysis, discrimination index, and exportable CSV.

## Tech stack

- Vite
- TypeScript
- React
- shadcn UI
- Tailwind CSS

## Deploying

Host the static build anywhere (Vercel, Netlify, etc.) and point your DNS to that deployment. The app already rewrites all routes to `index.html`.

## Custom domains

Configure your host’s domain settings to point at the deployed build, then add the domain within that platform’s dashboard. No third-party services are required beyond your chosen host.
