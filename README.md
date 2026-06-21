# GameLog v1.6

GameLog is a Letterboxd-style social game diary for video games: discover, log, rate, review, build a backlog, and share your taste.

## v1.6 focus

This release adds Internet Archive support while cutting down UI clutter.

### New

- Internet Archive importer in the Sources / Import hub
- Archive search modes:
  - Manuals / guides
  - Software records
  - Box art / scans
- Archive thumbnails used as cover-art fallbacks
- Archive source links stored in imported game summaries
- Game detail preview now has a "Find manuals/guides" link
- Public game pages now link to Internet Archive manual/guide searches
- Top navigation trimmed down to the core app areas
- Old multi-panel Sources page consolidated into one compact source picker

## Important note about Internet Archive

GameLog uses Internet Archive as a metadata, manuals, guides, scans, and preservation-link source. It should link to Archive item pages and respect rights/licensing. Do not use GameLog as a ROM-download app.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3000
```

## Windows shortcuts

- `setup-gamelog.bat` — first setup
- `start-gamelog.bat` — start local dev server
- `update-gamelog.bat` — pull latest GitHub code, install dependencies, and start

## Supabase

Copy `.env.example` to `.env.local` and add your Supabase keys:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Optional external sources:

```env
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
NEXT_PUBLIC_RAWG_API_KEY=
```
