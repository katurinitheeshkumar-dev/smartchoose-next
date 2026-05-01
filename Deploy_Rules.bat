@echo off
echo ===================================================
echo     SMARTCHOOSE FIRESTORE RULES DEPLOY
echo ===================================================

set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
set "NPX=%NODE_DIR%\npx.cmd"

cd /d "%~dp0app"

echo.
echo Deploying Firestore Rules...
call "%NPX%" firebase-tools deploy --only firestore:rules

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ DEPLOY FAILED! 
    echo Make sure you are logged in to Firebase.
) else (
    echo.
    echo ✅ SUCCESS! Rules are now LIVE!
)

pause
