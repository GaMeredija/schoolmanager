@echo off
echo Iniciando servidor de desenvolvimento...
start "Ollama Server" cmd /k "ollama serve"
timeout /t 3
echo Iniciando aplicação...
npm run dev

