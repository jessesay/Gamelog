# GameLog v1.13 — Public Share Layer

GameLog is a mobile-first social game diary: swipe discovery, IGDB-powered catalog imports, library tracking, reviews, lists, beta feedback, and an AI Backlog Coach through Vercel AI Gateway.

## v1.13 highlights

- New **Share Studio** inside the app.
- Better public profile pages at `/u/[username]`.
- Better public review pages at `/r/[id]`.
- New public list pages at `/l/[id]`.
- Shareable list cards with cover strips and copy-link actions.
- Profile share card with stats, shelf, top genre, top vibe, latest review, and list links.
- Updated public-page styling so shared links look like a real product, not database output.
- Keeps v1.12 beta feedback, v1.11 mobile/PWA polish, v1.10 catalog cleanup, v1.9 IGDB-first imports, and v1.8 AI Coach.
- Keeps `ai` pinned to `6.0.208` for Vercel lockfile safety.

## Local setup

```cmd
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Environment variables

Create `.env.local` in the project root.

Required for Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Required for IGDB import:

```env
IGDB_CLIENT_ID=your_twitch_igdb_client_id
IGDB_CLIENT_SECRET=your_twitch_igdb_client_secret
```

Required for local Vercel AI Gateway tests:

```cmd
vercel env pull .env.local
```

## AI Gateway smoke test

```cmd
node --env-file=.env.local index.mjs
```

Or double-click:

```text
run-ai-gateway-test.bat
```

## Supabase setup

Run the SQL files in Supabase SQL Editor as needed:

```text
supabase/schema.sql
supabase/seed.sql
supabase/mega_seed.sql
supabase/v1_9_catalog_engine.sql
supabase/v1_12_beta_feedback.sql
```

## v1.13 test checklist

- Home → Share profile.
- Share → Copy profile link.
- Share → Copy share card.
- Share → Copy latest review link.
- Share → Copy list link.
- Profile → Open public profile.
- Feed → Open review.
- Lists → Open list.
- Public routes:
  - `/u/[username]`
  - `/r/[id]`
  - `/l/[id]`

## Deploy on Vercel

Use the existing GitHub repo. Vercel should detect Next.js and pnpm.

Make sure Vercel has these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
IGDB_CLIENT_ID=...
IGDB_CLIENT_SECRET=...
```

Then redeploy from the latest commit.
