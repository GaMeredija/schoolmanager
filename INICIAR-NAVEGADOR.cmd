@echo off
setlocal
cd /d "%~dp0"

echo Preparando banco local para o navegador...
call npm.cmd run setup:browser
if errorlevel 1 exit /b %errorlevel%

echo Iniciando SchoolManager Web em http://localhost:3001 ...
start "" cmd /c "timeout /t 8 >nul && start http://localhost:3001"
call npm.cmd run dev
