@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo     SMARTCHOOSE - BUILD ONLY (Skip TypeScript)
echo ===================================================

set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "NODE=%NODE_DIR%\node.exe"
set "FIREBASE_BIN=%~dp0app\node_modules\firebase-tools\lib\bin\firebase.js"

set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0app"

echo.
echo Running Vite build (TypeScript check skipped)...
"%NODE%" "%~dp0app\node_modules\vite\bin\vite.js" build
if %ERRORLEVEL% NEQ 0 (
    echo Vite build failed!
    pause
    exit /b 1
)
echo Build successful!

echo.
echo Generating Sitemap...
"%NODE%" sitemap-generator.js

echo.
echo Deploying to Firebase...
cd /d "%~dp0app"
"%NODE%" "%FIREBASE_BIN%" deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo DEPLOY FAILED! Run Publish_To_Firebase.bat to login first.
    pause
    exit /b 1
)

echo.
echo SUCCESS! Website is now LIVE on Firebase!
echo ===================================================
pause
