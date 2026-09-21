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

rem Root deps are only npm's own bootstrap; reinstall when package.json changes.
set "ROOT_HASH_NOW="
for /f "skip=1 tokens=* delims=" %%h in ('certutil -hashfile package.json SHA256 ^| findstr /r /v "^CertUtil: -hashfile"') do if not defined ROOT_HASH_NOW set "ROOT_HASH_NOW=%%h"
set "ROOT_HASH_NOW=%ROOT_HASH_NOW: =%"
set "ROOT_HASH_OLD="
if exist "node_modules\.deps-hash" for /f "usebackq delims=" %%h in ("node_modules\.deps-hash") do set "ROOT_HASH_OLD=%%h"

if not exist "node_modules" goto install_root
if not "%ROOT_HASH_NOW%"=="%ROOT_HASH_OLD%" goto install_root
echo [2/3] Root dependencies ready
goto root_ready

:install_root
echo [2/3] Installing root dependencies...
call npm install
if errorlevel 1 goto failed
if not exist "node_modules" mkdir "node_modules" >nul 2>nul
> "node_modules\.deps-hash" echo %ROOT_HASH_NOW%

:root_ready

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
