# GameLog deployment: Supabase + Vercel

This guide deploys the current Next.js application without running catalog imports or database migrations during the Vercel build.

## 1. Prepare Supabase

Create a Supabase project and note these values from the project Connect/API Keys screens:

- Project URL: `https://PROJECT_REF.supabase.co`
- Publishable key: `sb_publishable_...`
- Secret key: `sb_secret_...` (recommended), or the legacy `service_role` key

The publishable key is safe in the browser. The secret/service-role key bypasses Row Level Security and must only exist in local server environments, trusted CI, and Vercel server-side environment variables.

### Run SQL in this order

Open Supabase → SQL Editor and run each file once, in order:

1. `supabase/schema.sql`
2. `supabase/v1_9_catalog_engine.sql`
3. `supabase/v1_12_beta_feedback.sql`
4. `supabase/v2_3_price_watch.sql`
5. `supabase/v2_4_product_families.sql`
6. `supabase/v2_7_collections.sql`
7. `supabase/v3_0_beta_launch.sql`
8. `supabase/v3_2_completion_time.sql`
9. `supabase/v3_3_top_10000_catalog.sql`
10. `supabase/v3_4_import_pipeline.sql`
11. `supabase/v3_5_social_foundation.sql`
12. `supabase/v3_6_list_upgrade.sql`
13. `supabase/v3_8_global_search.sql`
14. `supabase/v3_10_discovery_learning.sql`

`v3_5_social_foundation.sql` keeps the newest duplicate user/game log or review before adding uniqueness indexes. `v3_10_discovery_learning.sql` adds per-user discovery preferences and event history. Back up production data before running migrations. Do not also run `gamelog_discovery_schema.sql`; v3.4 contains the maintained discovery schema.

Optional data files such as `seed.sql`, `mega_seed.sql`, and `cover_updates.sql` are data loads, not required migrations.

### Required RLS assumptions

The app assumes the supplied policies are active:

- Profiles, games, game logs, reviews, ratings, activity, and explicitly public lists are publicly readable.
- Authenticated users can only create/update/delete their own profile, logs, reviews, ratings, follows, comments, and lists.
- List items are readable when the parent list is public or owned by the current user.
- Discovery feed/swipe server routes use the server-only admin key and therefore bypass RLS.
- Public server-rendered profile/game/activity pages also use the separate admin client. Never reuse that client in a Client Component.

## 2. Configure Supabase Auth

In Supabase → Authentication → URL Configuration:

- Site URL: `https://YOUR_PRODUCTION_DOMAIN`
- Redirect URL: `https://YOUR_PRODUCTION_DOMAIN/auth/callback`
- Local redirect: `http://localhost:3000/auth/callback`
- Optional local wildcard: `http://localhost:3000/**`
- Optional Vercel preview wildcard: `https://*-YOUR_VERCEL_TEAM_SLUG.vercel.app/**`

Use exact production URLs rather than a production wildcard. Enable the Email provider and decide whether email confirmation is required. If custom email templates construct links from `{{ .SiteURL }}`, update them to respect `{{ .RedirectTo }}` so the callback selected by the app is preserved.

## 3. Create the Vercel project

Import the Git repository into Vercel with:

- Framework preset: Next.js
- Root directory: repository root (`.`)
- Node.js: 24.x
- Install command: `corepack enable && pnpm install --frozen-lockfile`
- Build command: `pnpm run build`
- Output directory: leave blank (Next.js default)

Do not run `catalog:import` as a build command. Vercel functions have finite execution limits; run large imports locally or in a dedicated trusted CI job.

## 4. Set Vercel environment variables

Set these for Production and Preview unless noted otherwise:

### Required public variables

```env
NEXT_PUBLIC_SITE_URL=https://YOUR_PRODUCTION_DOMAIN
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
```

### Required private variable

Use the recommended new key:

```env
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
```

Or use the legacy alternative, not both unless rotating:

```env
SUPABASE_SERVICE_ROLE_KEY=REPLACE_ME
```

### Optional private integrations

```env
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
RAWG_API_KEY=
ITCH_API_KEY=
```

Steam imports do not require a key. `VERCEL_OIDC_TOKEN` is obtained by local `vercel env pull` and should not be manually configured as a production secret. Vercel supplies workload identity for AI Gateway on deployed workloads.

After changing any `NEXT_PUBLIC_` value, redeploy: public variables are embedded at build time.

## 5. Deploy and finish URL configuration

1. Deploy once to obtain the Vercel URL.
2. Add the production/custom domain in Vercel.
3. Update `NEXT_PUBLIC_SITE_URL` to the final `https://` origin without a trailing slash.
4. Update Supabase Site URL and the exact `/auth/callback` redirect to that same origin.
5. Redeploy after environment changes.

## 6. Verify production

Test in a private browser window:

1. Open `/app`, create an account, and complete email confirmation if enabled.
2. Confirm the callback returns to `/app/onboarding` on the production domain.
3. Save onboarding/profile changes, then sign out and back in.
4. Swipe one discovery card.
5. Create, edit, refresh, and delete a review; verify its game count, profile entry, and activity entry.
6. Create a list, add a game, and open its public URL.
7. Open a public game, review permalink, and public profile while signed out.
8. Check Vercel Function logs for errors and confirm no private keys appear in browser bundles or network payloads.

## Key rotation

If a Supabase admin key is exposed, rotate/revoke it in Supabase, replace it in Vercel and local secrets, and redeploy immediately. Never copy the secret/service-role key into a variable beginning with `NEXT_PUBLIC_`.
