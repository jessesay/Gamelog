# GameLog prelaunch checklist

## Supabase

- [ ] Back up the database.
- [ ] Run every required migration through `v3_11_catalog_import_health.sql` in order.
- [ ] Confirm RLS is enabled and owner/public policies match `DEPLOYMENT.md`.
- [ ] Set the production Site URL.
- [ ] Add the exact production `/auth/callback` redirect.
- [ ] Add localhost and optional Vercel preview redirects.
- [ ] Enable and test the Email auth provider.
- [ ] Confirm custom email templates preserve `RedirectTo`.

## Vercel

- [ ] Use repository root, Next.js preset, Node.js 24.x, a frozen pnpm install, and `pnpm run build`.
- [ ] Set all three required `NEXT_PUBLIC_` variables.
- [ ] Set exactly one private Supabase admin key.
- [ ] Add optional provider secrets only when those integrations are enabled.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` uses the final HTTPS domain without a trailing slash.
- [ ] Redeploy after changing public environment variables.

## Verification

- [ ] `npm run build` passes locally.
- [ ] The one-game Steam dry run passes without database writes.
- [ ] Sign-up, email callback, onboarding, sign-in, refresh, and sign-out work on production.
- [ ] Discover swipe actions persist.
- [ ] Review create/edit/delete updates the game page, count, profile, rating, and activity.
- [ ] List create/add/public-view works.
- [ ] Public game, review, list, and profile URLs work while signed out.
- [ ] Mobile bottom navigation is visible and usable.
- [ ] Vercel logs contain no unexpected 5xx errors.
- [ ] Browser source/network inspection exposes only publishable public keys.
- [ ] Service-role/secret, IGDB secret, RAWG key, and itch key are absent from client bundles.
