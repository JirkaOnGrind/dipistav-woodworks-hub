@echo off
setlocal

cd /d "%~dp0"

rem package-lock.json is authoritative. Install only on a fresh checkout; running
rem npm install on every launch used to delay the dev server by several minutes.
if not exist "node_modules\.bin\vite.cmd" (
  echo Instaluji chybejici zavislosti...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo Instalace selhala.
    exit /b %errorlevel%
  )
)

set "DEV_URL=http://localhost:8080"

echo Spoustim vyvojovy server...
echo Po spusteni bude web dostupny na %DEV_URL%.
echo Server ukoncite zkratkou Ctrl+C.

rem Keep Vite attached to this window, so closing it also stops the server.
rem --no-open is used by automated checks; a normal double-click opens the site.
if /i "%~1"=="--no-open" (
  call npm run dev
) else (
  call npm run dev -- --open /
)

exit /b %errorlevel%
