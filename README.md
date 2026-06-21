# GameLog v2.5 — Deal Radar Layer

GameLog is a videogame diary, discovery, backlog, price watch, and deal-decision app.

## New in v2.5

- Deal Radar view
- Deal Digest ranking for sales
- Buy zone / strong sale / watch close verdicts
- Lowest-seen price boost
- Backlog and watchlist boosted deals
- DLC/add-on sale detection under base-game families
- Watchlist gaps from Matchmaker and For You picks
- PWA shortcut for Deal Radar

## Run

```bash
pnpm install
pnpm dev
```

## Vercel

Keep these environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `IGDB_CLIENT_ID`
- `IGDB_CLIENT_SECRET`

## Notes

Deal Radar uses the same price snapshots from Price Watch. Use Steam checks for real data or Seed sample history while testing.
