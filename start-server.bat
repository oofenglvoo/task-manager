@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ============================================
echo   Task Manager - Server Deploy
echo ============================================
echo.

if not exist "server.env" (
  echo [ERROR] server.env not found.
  echo         Copy server.env.example to server.env and fill in the account settings.
  echo.
  pause
  exit /b 1
)

rem Read server.env (skip blank lines and # comments)
for /f "usebackq eol=# tokens=1,* delims==" %%a in ("server.env") do (
  set "KEY=%%a"
  set "VAL=%%b"
  if not "!KEY!"=="" if not "!VAL!"=="" set "!KEY!=!VAL!"
)

if "%TASK_APP_USERNAME%"=="" goto missing
if "%TASK_APP_PASSWORD%"=="" goto missing
if "%TASK_SECRET_KEY%"=="" goto missing
if "%APP_HOST%"=="" set "APP_HOST=0.0.0.0"
if "%APP_PORT%"=="" set "APP_PORT=8001"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 18+ first: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo [1/4] Node.js:
node -v

if not exist "backend\.venv\Scripts\python.exe" (
  echo [2/4] Creating backend venv and installing dependencies...
  python -m venv backend\.venv
  if errorlevel 1 goto failed
  call backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  if errorlevel 1 goto failed
) else (
  echo [2/4] Backend venv ready
)

if not exist "frontend\node_modules" (
  echo [3/4] Installing frontend dependencies...
  pushd frontend
  call npm install
  if errorlevel 1 ( popd & goto failed )
  popd
) else (
  echo [3/4] Frontend dependencies ready
)
echo       Building frontend...
pushd frontend
call npm run build
if errorlevel 1 ( popd & goto failed )
popd

echo [4/4] Starting server on http://%APP_HOST%:%APP_PORT%
echo.
echo   Local:   http://127.0.0.1:%APP_PORT%
echo   LAN:     http://(this-machine-ip):%APP_PORT%
echo   Press Ctrl+C to stop
echo.

call backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host %APP_HOST% --port %APP_PORT%
goto :eof

:missing
echo [ERROR] server.env must define TASK_APP_USERNAME / TASK_APP_PASSWORD / TASK_SECRET_KEY.
echo.
pause
exit /b 1

:failed
echo.
echo [ERROR] A deployment step failed. Check the log above.
pause
exit /b 1
