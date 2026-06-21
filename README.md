# GameLog v3.0 — Beta Launch System

GameLog is a mobile-first gaming command center for tracking your library, deciding what to play, watching prices, following releases, building collections, and sharing your taste.

## v3.0 adds

- Beta signup / waitlist page at `/join`
- First-run tester checklist at `/start`
- Feedback inbox and voting board at `/feedback`
- What's new page at `/updates`
- Updated landing page funnel
- Updated beta, features, changelog, sitemap, PWA shortcuts, and metadata
- Optional Supabase beta launch schema at `supabase/v3_0_beta_launch.sql`

## Run locally

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Test v3.0

```text
/           landing page
/join       beta signup
/start      first-run checklist
/feedback   feedback and voting
/updates    what's new
/app        full GameLog app
```

## Optional Supabase

Run `supabase/v3_0_beta_launch.sql` when you want beta waitlist, feedback, and onboarding progress stored in Supabase instead of local browser storage.
