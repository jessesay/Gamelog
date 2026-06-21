# GameLog v2.0 — Pulse + Charts Launch Layer

GameLog is a mobile-first social game diary: swipe discovery, IGDB-powered catalog imports, library tracking, reviews, public profiles, shareable lists, beta feedback, and GameLog Coach powered behind the scenes by Vercel AI Gateway.

## v2.0 highlights

- **GameLog Pulse**: a daily command center with tonight's pick, continue-playing prompts, social heat, launch readiness, and next-level missions.
- **GameLog Charts**: For You, Top Rated, Most Logged, Hidden Gems, and Backlog Heat charts.
- Better home command center so the app feels like a daily product, not just a tracker.
- Better mobile bottom nav: Home, Swipe, Pulse, Games, Library.
- Recommendation language stays inside the GameLog product: For You, Pulse, Charts, Coach, and Taste signals. No user-facing "AI recommendation" label.
- Keeps v1.14 product copy polish, v1.13 public sharing, v1.12 beta feedback, v1.11 PWA/mobile polish, v1.10 duplicate cleanup, and v1.9 IGDB-first catalog imports.
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

## Supabase setup

Run the SQL files in Supabase SQL Editor as needed:

```text
supabase/schema.sql
supabase/seed.sql
supabase/mega_seed.sql
supabase/v1_9_catalog_engine.sql
supabase/v1_12_beta_feedback.sql
```

## v2.0 test checklist

- Home → Open Pulse.
- Pulse → tonight's pick, social heat, missions, continue-playing row.
- Charts → For You, Top Rated, Most Logged, Hidden Gems, Backlog Heat.
- Games → IGDB search/import, duplicate cleanup, Show More.
- Library → GameLog Coach / backlog picks.
- Share Studio → profile/review/list links.
- Mobile viewport → bottom nav shows Home, Swipe, Pulse, Games, Library.
