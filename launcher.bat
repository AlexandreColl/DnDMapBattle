@echo off
cd /d "%~dp0"
echo ====================================
echo   DnD Battle Map - Servidor Local
echo ====================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js no esta instalado. Descargalo de https://nodejs.org/
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) < 26 ? 1 : 0)"
if errorlevel 1 (
  echo Se necesita Node.js 26 o superior. Actualizalo desde https://nodejs.org/
  node --version
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando dependencias...
  call corepack pnpm install --prod --frozen-lockfile
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
rem The DM key: this browser opens as DM; players use the address the
rem server prints. The key goes after "#", so it never reaches the server.
for /f %%k in ('node server\dm-key.js') do set "DM_KEY=%%k"
start "" "http://localhost:8080/#dm=%DM_KEY%"
node server\index.js
echo.
echo Servidor detenido.
pause
