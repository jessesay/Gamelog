GameLog v1.9 — IGDB-first Catalog Engine patch

Copy these files into your existing GameLog repo and replace when asked.

After copying:
1. Commit in GitHub Desktop:
   Build GameLog v1.9 IGDB-first catalog engine
2. Push origin.
3. Run update-gamelog.bat.
4. Optional but recommended: run supabase/v1_9_catalog_engine.sql in Supabase SQL Editor.
5. Test Games tab: search a missing game, then click Search + import from IGDB.

Vercel note: package.json keeps ai pinned to 6.0.208 so the lockfile fix stays compatible with frozen installs.
