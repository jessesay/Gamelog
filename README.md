# GameLog

GameLog is a Next.js social game diary with swipe discovery, public profiles, reviews, ratings, lists, and activity feeds. Supabase provides authentication and persistence; the catalog importer can enrich the game database from Steam, RAWG, itch.io, and IGDB.

## Local development

Requirements: Node.js 24.x, npm, and a Supabase project.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open `http://localhost:3000`.

The minimum local variables are:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

The publishable key is intentionally available to browser code and relies on RLS. `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and must remain server-only.

## Database setup

For a new Supabase project, run the SQL files in the exact order documented in [DEPLOYMENT.md](./DEPLOYMENT.md). Do not run `gamelog_discovery_schema.sql` when using the full migration sequence; `supabase/v3_4_import_pipeline.sql` supersedes it.

## Catalog import

```bash
npm run catalog:import -- --dry-run --sources=steam --steam-limit=1
npm run catalog:import
```

Steam needs no API key. RAWG, itch.io, and IGDB are optional and use server-only credentials listed in `.env.example`. Catalog imports are operational jobs; they are not part of the Vercel build.

## Deployment

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for Supabase Auth URLs, Vercel settings, environment variables, RLS assumptions, migrations, and verification. Use [PRELAUNCH_CHECKLIST.md](./PRELAUNCH_CHECKLIST.md) immediately before launch.

## Verification

```bash
npm run build
npm run catalog:import -- --dry-run --sources=steam --steam-limit=1
```
