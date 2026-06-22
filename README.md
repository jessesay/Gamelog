# GameLog Discovery Feed v1

This is the drop-in upgrade that adds:

- RAWG game sync
- Supabase `games` table
- Supabase `game_swipes` table
- Swipe-style mobile feed
- API routes for loading the feed and saving swipes
- `npm run sync:games`

## Fast setup

1. Unzip this folder.
2. Copy `apply-gamelog-discovery.ps1` into the root of your GameLog project.
3. Open PowerShell in the GameLog project root.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\apply-gamelog-discovery.ps1
```

5. Go to Supabase → SQL Editor → New query.
6. Paste/run `gamelog_discovery_schema.sql`.
7. In `.env.local`, replace placeholders:

```env
RAWG_API_KEY=your_real_rawg_key
SUPABASE_SERVICE_ROLE_KEY=your_real_service_role_key
```

8. Run:

```bash
npm run sync:games
npm run dev
```

## What changes

The installer writes these files into your project:

```txt
src/lib/gameSources/rawg.ts
src/lib/supabase/admin.ts
scripts/sync-games.ts
src/app/api/games/feed/route.ts
src/app/api/games/swipe/route.ts
src/components/GameSwipeDeck.tsx
src/app/page.tsx
```

It also adds this package script:

```json
"sync:games": "tsx scripts/sync-games.ts"
```

## Important

The installer replaces `src/app/page.tsx` with the swipe feed homepage. If you want to keep your old homepage, copy it somewhere first.

The Supabase service role key must only stay in `.env.local` and server-side scripts/routes. Do not put it inside client components.
