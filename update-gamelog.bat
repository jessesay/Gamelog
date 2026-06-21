@echo off
setlocal
cd /d "%~dp0"

title GameLog Update

echo ========================================
echo GameLog Update / Start
echo ========================================
echo.

if not exist ".git" (
  echo ERROR: This folder is not a GitHub clone.
  echo Use your GitHub Desktop cloned Gamelog folder.
  pause
  exit /b 1
)

echo Saving local env file if it exists...
if exist ".env.local" copy ".env.local" ".env.local.backup" >nul

echo.
echo Pulling latest code from GitHub...
git pull
if errorlevel 1 (
  echo.
  echo Git pull failed. Open GitHub Desktop and resolve any changes/conflicts first.
  pause
  exit /b 1
)

echo.
echo Restoring .env.local if backup exists...
if exist ".env.local.backup" copy ".env.local.backup" ".env.local" >nul

echo.
echo Checking pnpm...
pnpm -v >nul 2>&1
if errorlevel 1 (
  echo pnpm not found. Trying Corepack...
  corepack enable
  corepack prepare pnpm@latest --activate
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
echo Starting GameLog...
echo http://localhost:3000
echo.

pnpm dev

pause
