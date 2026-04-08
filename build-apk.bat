@echo off
echo ========================================
echo    SCHOOL MANAGER - BUILD APK
echo ========================================
echo.

echo [1/4] Fazendo build do projeto web...
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha no build do projeto web
    pause
    exit /b 1
)

echo.
echo [2/4] Sincronizando com Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERRO: Falha na sincronizacao
    pause
    exit /b 1
)

echo.
echo [3/4] Abrindo Android Studio...
echo IMPORTANTE: No Android Studio:
echo 1. Aguarde o Gradle Sync terminar
echo 2. Va em Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 3. O APK sera gerado em: android\app\build\outputs\apk\debug\
echo.
call npx cap open android

echo.
echo [4/4] Processo concluido!
echo O Android Studio foi aberto. Siga as instrucoes acima para gerar o APK.
echo.
pause