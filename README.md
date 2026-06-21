# GameLog v1.0

GameLog is a Letterboxd-style social game diary with a fast mobile discovery loop: swipe/pass/save games, log reviews, build a backlog, follow people, and grow a real catalog with cover art.

## What v1.0 fixes

- Games no longer vanish when Supabase is connected but the `games` table is empty.
- GameLog now falls back to a built-in starter catalog so Discover still works.
- Added a **Catalog rescue** card in Sources that installs the starter catalog into Supabase.
- Added built-in Steam cover-art fallbacks for many starter/PC games.
- Added `supabase/cover_updates.sql` to patch existing blank covers.
- Added a **Steam mega import** button that searches many categories and imports lots of Steam games with capsule art.
- Existing IGDB, Steam search, RAWG, itch.io manual, and bulk import tools remain available.

## Run locally

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

If pnpm blocks dependency build scripts, run:

```bash
pnpm approve-builds --all
pnpm install
pnpm dev
```

## Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Optional, for IGDB imports
IGDB_CLIENT_ID=your_twitch_client_id
IGDB_CLIENT_SECRET=your_twitch_client_secret

# Optional, for RAWG imports
NEXT_PUBLIC_RAWG_API_KEY=your_rawg_key
```

## Supabase setup

Run these in Supabase SQL Editor:

```text
supabase/schema.sql
supabase/seed.sql
supabase/cover_updates.sql
```

`cover_updates.sql` is important if you already ran an older seed with blank `cover_url` values. It safely fills known cover images where possible.

## If all games disappeared

That usually means you moved to a new Supabase project/table state or opened a fresh repo version without rerunning the seed.

GameLog v1.0 handles it better:

1. It shows the built-in starter catalog locally instead of an empty app.
2. Go to **Sources**.
3. Click **Install starter catalog**.
4. Then run **Steam mega import** or **IGDB popular import** to build a bigger catalog.

## Catalog strategy

Do not try to ship “every game ever” in one static SQL file. That gets huge and stale. The better model is:

```text
Starter catalog
+ Steam imports
+ IGDB imports
+ RAWG imports
+ itch.io manual/bulk imports
+ user-added games
= growing GameLog catalog
```

## Main app pages

- Home
- Discover
- Games
- Log
- Feed
- Lists
- People
- History
- Sources
- Profile

## Notes

- Steam cover fallbacks are visual fallbacks in the app. They make the starter catalog look good even when the database cover field is blank.
- IGDB is still the best long-term source for cross-platform box art, platforms, genres, summaries, developers, and release years.
- itch.io does not behave like a simple public “all games” catalog in this version, so GameLog supports manual and bulk import for itch.io titles.


## v1.3 Library Hub

GameLog v1.3 adds a dedicated **Library** tab so the app is not only discovery and reviews — it now helps players actually manage what they saved.

New in v1.3:

- Library tab
- Shelves for Playing, Backlog, Completed, Dropped, and Replaying
- Completion-rate score card
- Current year and current month snapshot
- Top genre / top vibe stats
- Backlog attack plan using taste matching
- Review prompts for completed games with no written review
- Faster path from saved games to actual reviews

Use `start-gamelog.bat` to run locally, or `update-gamelog.bat` after pulling updates from GitHub.
