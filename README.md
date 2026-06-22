# GameLog v3.1 — New User Onboarding Polish

GameLog is a gaming command center for tracking, discovering, buying, and sharing games.

## v3.1 adds

- In-app guided setup hub at `/app?view=onboarding`
- Start setup button on the app home screen
- Launch readiness score inside the app
- Seven first-run steps for beta testers
- Starter taste button
- Better `/start` guide links
- PWA shortcut for setup

## Install

Copy the patch files into your GameLog project and replace existing files.

Commit:

`Build GameLog v3.1 onboarding polish`

Then push and redeploy Vercel.

## GameLog v3.3 — Top 10,000 catalog importer

GameLog can now fill Supabase with a much deeper IGDB-powered catalog.

### What changed

- New public page: `/catalog-builder`
- New API route: `/api/igdb/top-10000`
- New Supabase upgrade: `supabase/v3_3_top_10000_catalog.sql`
- New local importer: `scripts/import-igdb-top-10000.mjs`
- New count checker: `scripts/check-catalog-count.mjs`
- New Windows shortcuts: `import-top-10000.bat` and `check-catalog-count.bat`
- `package.json` scripts: `pnpm catalog:igdb-top` and `pnpm catalog:count`

### Required setup

Run this SQL in Supabase first:

```text
supabase/v3_3_top_10000_catalog.sql
```

Then add these to `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
IGDB_CLIENT_ID=...
IGDB_CLIENT_SECRET=...
```

Do not commit the real service role key.

### Import command

```bash
pnpm catalog:igdb-top
```

Or on Windows, double-click:

```text
import-top-10000.bat
```

### Check database count

```bash
pnpm catalog:count
```

Or on Windows, double-click:

```text
check-catalog-count.bat
```
