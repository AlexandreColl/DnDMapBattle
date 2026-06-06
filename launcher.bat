@echo off
cd /d "%~dp0"
echo ====================================
echo   DnD Battle Map - Servidor Local
echo ====================================
echo.
start "" http://localhost:8080
node server.js
echo.
echo Servidor detenido.
pause
