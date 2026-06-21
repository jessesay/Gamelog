# GameLog v2.9

GameLog is a gaming command center: track your library, decide what to play, watch prices, follow releases, group DLC/add-ons, build collections, and share your gaming taste.

## v2.9 update — Public beta website readiness

This version makes GameLog feel more like a real public app/website, not just a project folder.

New website routes:

- `/features` — product feature map
- `/beta` — beta tester guide and invite copy
- `/faq` — first-time visitor questions
- `/changelog` — public release history
- `/status` — beta status and configuration notes
- `not-found.tsx` — branded 404 page

Updated:

- Landing page navigation and beta funnel
- Sitemap includes new public routes
- PWA shortcuts include Beta Guide and Feature Map
- Metadata updated for public beta positioning

## Local setup

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

The public website starts at `/` and the full app opens at `/app`.

## Environment variables

Keep secrets out of GitHub. Use `.env.local` locally and Vercel Environment Variables for production.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
```

## Version

Current build: `2.9.0`
