@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo   Task Manager - Quick Start
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 18+ first:
  echo         https://nodejs.org/
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set "NODE_VERSION=%%v"
echo [1/3] Node.js %NODE_VERSION% detected

if not exist "node_modules" (
  echo [2/3] Installing root dependencies...
  call npm install
  if errorlevel 1 goto failed
) else (
  echo [2/3] Root dependencies ready
)

echo [3/3] Starting server (first run installs deps and builds frontend)...
echo.
echo   URL: http://127.0.0.1:8001
echo   Close this window or press Ctrl+C to stop
echo.

if "%~1"=="" (
  call npm run dev
) else (
  call npm run dev -- %*
)
if errorlevel 1 goto failed

exit /b 0

:failed
echo.
echo [ERROR] Startup failed. Check the log above.
pause
exit /b 1
