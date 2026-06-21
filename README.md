# GameLog v1.14 — Taste Recommendations Polish

GameLog is a mobile-first social game diary: swipe discovery, IGDB-powered catalog imports, library tracking, reviews, lists, beta feedback, and a smart GameLog Coach powered behind the scenes by Vercel AI Gateway.

## v1.14 highlights

- Product copy now says **GameLog Coach** / **Taste Engine** instead of labeling recommendations as AI.
- The coach still uses the same smart backend, but the app experience feels native to GameLog.
- Removed AI review-writing language: **Log prompts** now gives reflection angles instead of writing reviews for the user.
- Recommendation language shifted toward **For You**, **play plan**, **backlog picks**, and **taste signals**.
- Beta/share copy now talks about a smart backlog coach, not an AI gimmick.
- Keeps v1.13 public sharing, v1.12 beta feedback, v1.11 mobile/PWA polish, v1.10 catalog cleanup, v1.9 IGDB-first imports, and the Vercel AI Gateway backend.
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

## v1.14 test checklist

- Home → GameLog Coach.
- Coach → Next game / Weekend plan / Log prompts / Taste profile.
- Confirm no user-facing copy says “AI recommendation.”
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
