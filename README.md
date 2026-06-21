# GameLog v2.2 — Arena Layer

GameLog now includes Arena: a head-to-head game picker that turns backlog indecision into a fast choice.

## New in v2.2

- GameLog Arena view
- Two-game head-to-head duels
- Pick winner saves it to backlog
- New duel / skip button
- Champion shelf from strong backlog picks
- Arena added to top nav and mobile bottom nav
- Keeps Pulse, Matchmaker, Charts, IGDB imports, sharing, beta feedback, and GameLog Coach

## Install patch

Copy the v2.2 patch files into the root of your GameLog folder and replace files.

Commit:

```text
Build GameLog v2.2 Arena layer
```

Then push and run:

```cmd
update-gamelog.bat
```

## Test

- Home → Arena
- Top nav → Arena
- Mobile nav → Arena
- Pick this
- New duel
- Details


---

# GameLog v2.1 — Matchmaker Layer

GameLog v2.1 adds **GameLog Matchmaker**, a new play-next picker that ranks games by session length, mood, backlog status, current library, covers, and taste signals. It is designed to make GameLog feel more useful than a passive tracker: open it, pick the vibe, and know what to play.

## v2.1 highlights

- New **Match** tab in desktop navigation.
- New **Match** shortcut in the mobile bottom bar.
- Session filters: **Quick**, **One night**, **Long haul**.
- Mood filters: **Any**, **Cozy**, **Challenge**, **Story**, **Social**.
- Ranked match cards with fit percent, reasons, Log, Save, and Details actions.
- PWA shortcut for Matchmaker.
- Vercel hotfix preserved: root `GameLogApp.tsx` safely re-exports the real component.

---

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
