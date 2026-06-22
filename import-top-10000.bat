@echo off
setlocal
cd /d "%~dp0"
echo GameLog Top 10,000 IGDB Catalog Import
echo.
echo Before this runs, make sure you ran supabase\v3_3_top_10000_catalog.sql in Supabase.
echo Your .env.local also needs IGDB_CLIENT_ID, IGDB_CLIENT_SECRET, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.
echo.
pause
node scripts\import-igdb-top-10000.mjs --target=10000 --batch=500
pause
