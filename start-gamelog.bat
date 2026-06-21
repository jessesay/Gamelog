@echo off
setlocal
cd /d "%~dp0"

title GameLog Dev Server

echo ========================================
echo Starting GameLog
echo ========================================
echo.
echo Local app will open at:
echo http://localhost:3000
echo.
echo Keep this window open while using GameLog.
echo Press CTRL + C to stop the server.
echo.

pnpm dev

pause
