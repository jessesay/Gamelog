# GameLog v1.4

GameLog is a Letterboxd-style social game diary with a fast mobile discovery loop: swipe/pass/save games, log reviews, build a backlog, follow people, and grow a real catalog with cover art.

## New in v1.4

- New **Quests** tab
- Daily quest board for swiping, reviewing, completing, and backlog building
- Player XP and level card
- Profile-style achievement badges
- Next unlock tracker
- Today stats: swipes, logs, badges, completion rate
- Tonight's best backlog picks
- Review fuel prompts for completed games without reviews

## Main app pages

- Home
- Discover
- Library
- Quests
- Games
- Log
- Feed
- Lists
- People
- History
- Sources
- Profile

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

## Windows scripts

The repo includes:

```text
setup-gamelog.bat
start-gamelog.bat
update-gamelog.bat
```

Use `start-gamelog.bat` for normal local testing and `update-gamelog.bat` after pulling or copying a new patch.

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
