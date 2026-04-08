@echo off
echo ========================================
echo    SCHOOL MANAGER - BUILD E COPIAR APK
echo ========================================
echo.

echo [1/3] Fazendo build do projeto web...
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha no build do projeto web
    pause
    exit /b 1
)

echo.
echo [2/3] Sincronizando com Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERRO: Falha na sincronizacao
    pause
    exit /b 1
)

echo.
echo [3/3] Gerando APK...
echo Executando Gradle Build...

cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERRO: Falha na geracao do APK
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo Copiando APK para a raiz do projeto...
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy "android\app\build\outputs\apk\debug\app-debug.apk" "SchoolManager.apk"
    echo.
    echo ✅ SUCESSO! APK gerado e copiado para:
    echo    📱 SchoolManager.apk
    echo.
    echo Agora voce pode:
    echo 1. Enviar pelo WhatsApp
    echo 2. Baixar no celular
    echo 3. Instalar diretamente
    echo.
) else (
    echo ❌ ERRO: APK nao encontrado!
    echo Verifique se o build foi concluido com sucesso.
)

echo.
pause