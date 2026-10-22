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
if not exist node_modules (
  echo Instalando dependencias...
  call corepack pnpm install --prod --frozen-lockfile
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)
start "" http://localhost:8080
node server\index.js
echo.
echo Servidor detenido.
pause
