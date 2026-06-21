@echo off
setlocal
cd /d "%~dp0"

title GameLog AI Gateway Setup

echo ========================================
echo GameLog AI Gateway Setup
echo ========================================
echo.

echo Installing AI SDK dependency...
pnpm add ai
if errorlevel 1 (
  echo pnpm failed. Trying npm install ai...
  npm install ai
)

echo.
echo Checking Vercel CLI...
vercel --version >nul 2>&1
if errorlevel 1 (
  echo Installing Vercel CLI globally...
  npm install -g vercel
)

echo.
echo Linking this folder to your Vercel project...
echo If prompted, choose the GameLog project.
vercel link

echo.
echo Pulling Vercel environment variables into .env.local...
vercel env pull .env.local

echo.
echo Running AI Gateway smoke test...
node --env-file=.env.local index.mjs

echo.
echo Done. If you saw a streamed answer above, AI Gateway works.
echo.
pause
