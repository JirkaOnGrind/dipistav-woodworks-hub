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

set "DEV_URL=http://localhost:8080"

rem Vite v tomto projektu bezi na portu 8080. Pockame na skutecnou odpoved
rem serveru, aby prohlizec neotevrel prazdnou stranku behem startu aplikace.
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$url='%DEV_URL%'; for ($i = 0; $i -lt 120; $i++) { try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { Start-Process $url; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }; Write-Error 'Vyvojovy server se nepodarilo spustit na adrese %DEV_URL%.'"

echo Spoustim vyvojovy server...
echo Po spusteni bude web dostupny na %DEV_URL%.
call %DEV_CMD%
