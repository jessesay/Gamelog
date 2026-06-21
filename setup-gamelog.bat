@echo off
setlocal
cd /d "%~dp0"

title GameLog Setup

echo ========================================
echo GameLog Setup
echo ========================================
echo.

echo Checking Node.js...
node -v >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
node -v

echo.
echo Checking pnpm...
pnpm -v >nul 2>&1
if errorlevel 1 (
  echo pnpm not found. Trying Corepack...
  corepack enable
  corepack prepare pnpm@latest --activate
)
pnpm -v

echo.
if not exist ".env.local" (
  if exist ".env.example" (
    copy ".env.example" ".env.local" >nul
    echo Created .env.local from .env.example.
    echo IMPORTANT: Open .env.local and add your Supabase keys before using online mode.
  ) else (
    echo No .env.example found. Creating blank .env.local.
    (
      echo NEXT_PUBLIC_SUPABASE_URL=
      echo NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
      echo IGDB_CLIENT_ID=
      echo IGDB_CLIENT_SECRET=
      echo NEXT_PUBLIC_RAWG_API_KEY=
    ) > ".env.local"
  )
) else (
  echo .env.local already exists. Keeping it safe.
)

echo.
echo Approving dependency build scripts...
pnpm approve-builds --all

echo.
echo Installing dependencies...
pnpm install
if errorlevel 1 (
  echo.
  echo Install failed. Try running this file as Administrator.
  pause
  exit /b 1
)

echo.
echo Setup complete.
echo To start GameLog, double-click start-gamelog.bat.
echo.
pause
