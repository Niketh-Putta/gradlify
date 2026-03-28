# Gradlify – GCSE Maths Practised Properly

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
3. Always open the Vite URL in your browser or the VS Code preview—if a tab tries to open `https://gradlify.com`, close it and continue on `http://127.0.0.1:5173`.
4. If you accidentally land on `gradlify.com` after auth, copy the cookies/local storage back to the dev tab by reloading the Vite URL; the app uses the same Supabase session, so it will recognize you immediately.

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
