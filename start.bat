@echo off
setlocal

cd /d "%~dp0"

where bun >nul 2>nul
if %errorlevel%==0 (
  set "PKG_MANAGER=bun"
  set "INSTALL_CMD=bun install"
  set "DEV_CMD=bun dev"
) else (
  set "PKG_MANAGER=npm"
  set "INSTALL_CMD=npm install"
  set "DEV_CMD=npm run dev"
)

echo Pouzivam %PKG_MANAGER%.
echo Instaluji zavislosti...
call %INSTALL_CMD%
if errorlevel 1 (
  echo Instalace selhala.
  exit /b %errorlevel%
)

start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:5173'"

echo Spoustim vyvojovy server...
call %DEV_CMD%
