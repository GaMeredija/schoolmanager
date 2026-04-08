@echo off
echo ========================================
echo    SCHOOL MANAGER - GERAR APK MANUAL
echo ========================================
echo.

echo PROBLEMA: Java 25 nao e compativel com Gradle atual
echo SOLUCAO: Usar Android Studio para gerar o APK
echo.

echo [1/2] Preparando projeto...
cd /d "%~dp0"
call npm run build
call npx cap sync android

echo.
echo [2/2] Instrucoes para Android Studio:
echo.
echo 1. Abra o Android Studio
echo 2. Open Project: %~dp0android
echo 3. Aguarde Gradle Sync terminar
echo 4. Se der erro Java:
echo    - File ^> Settings ^> Build ^> Build Tools ^> Gradle
echo    - Gradle JDK: Use Project JDK (ou instale Java 17/21)
echo 5. Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo 6. Copie o APK de: android\app\build\outputs\apk\debug\app-debug.apk
echo 7. Cole na raiz como: SchoolManager.apk
echo.

echo Abrindo Android Studio...
start "" "%LOCALAPPDATA%\JetBrains\Toolbox\apps\AndroidStudio\ch-0\*\bin\studio64.exe" "%~dp0android"

echo.
echo ✅ Android Studio deve abrir automaticamente
echo Siga as instrucoes acima para gerar o APK
echo.
pause