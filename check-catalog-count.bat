@echo off
setlocal
cd /d "%~dp0"
node scripts\check-catalog-count.mjs
pause
