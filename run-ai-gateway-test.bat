@echo off
setlocal
cd /d "%~dp0"

title GameLog AI Gateway Test

echo Refreshing Vercel env vars / OIDC token...
vercel env pull .env.local

echo.
echo Running AI Gateway smoke test...
node --env-file=.env.local index.mjs

echo.
pause
