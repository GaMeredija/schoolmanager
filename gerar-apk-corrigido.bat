@echo off
echo ========================================
echo    GERANDO APK - SCHOOL MANAGER
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
    echo ERRO: Falha na sincronizacao com Android
    pause
    exit /b 1
)

echo.
echo [3/4] Abrindo Android Studio...
echo.
echo ========================================
echo   INSTRUCOES PARA GERAR O APK:
echo ========================================
echo.
echo 1. No Android Studio que vai abrir:
echo    - Aguarde o projeto carregar completamente
echo    - Va em File ^> Settings ^> Build ^> Build Tools ^> Gradle
echo    - Em "Gradle JDK", selecione Java 17 ou Java 21 (NAO Java 25)
echo.
echo 2. Para gerar o APK:
echo    - Va em Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo    - Aguarde a compilacao terminar
echo.
echo 3. Localizar o APK gerado:
echo    - android/app/build/outputs/apk/debug/app-debug.apk
echo.
echo 4. Copiar para a raiz do projeto:
echo    - Copie o arquivo app-debug.apk
echo    - Cole na pasta raiz do projeto
echo    - Renomeie para: SchoolManager.apk
echo.
echo ========================================
echo   CONFIGURACAO ATUAL:
echo ========================================
echo - Servidor: http://192.168.2.47:3001
echo - Usuario teste: admin / admin123
echo - Usuario teste: professor / prof123
echo.
echo IMPORTANTE: Mantenha o servidor rodando!
echo ========================================
echo.

echo [4/4] Tentando abrir Android Studio...
start "" "C:\Program Files\Android\Android Studio\bin\studio64.exe" "%cd%\android"
if %errorlevel% neq 0 (
    echo.
    echo Android Studio nao encontrado no caminho padrao.
    echo Abra manualmente:
    echo 1. Abra o Android Studio
    echo 2. Open Project: %cd%\android
    echo.
)

echo.
echo ========================================
echo   PROJETO PREPARADO COM SUCESSO!
echo ========================================
echo - Build web: CONCLUIDO
echo - Sync Android: CONCLUIDO  
echo - Configuracao IP: 192.168.2.47:3001
echo.
echo Agora gere o APK no Android Studio seguindo as instrucoes acima.
echo.
pause