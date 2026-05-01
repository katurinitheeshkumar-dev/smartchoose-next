@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo     SMARTCHOOSE BUILD + FIREBASE DEPLOY
echo ===================================================

:: Setup absolute paths with quoting
set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "NODE=%NODE_DIR%\node.exe"
set "NPX=%NODE_DIR%\npx.cmd"
set "FIREBASE_BIN=%~dp0app\node_modules\firebase-tools\lib\bin\firebase.js"

:: Add node to path briefly
set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0app"

echo.
echo STEP 1: Building the website...
echo Running TypeScript check...
"%NODE%" "%~dp0app\node_modules\typescript\bin\tsc" -b
if %ERRORLEVEL% NEQ 0 (
    echo TypeScript errors found! Fix them before deploying.
    pause
    exit /b 1
)

echo Running Vite build...
"%NODE%" "%~dp0app\node_modules\vite\bin\vite.js" build
if %ERRORLEVEL% NEQ 0 (
    echo Vite build failed!
    pause
    exit /b 1
)
echo Build successful!

echo.
echo STEP 1.5: Generating Sitemap...
"%NODE%" sitemap-generator.js

echo.
echo STEP 2: Deploying to Firebase...
cd /d "%~dp0app"
"%NODE%" "%FIREBASE_BIN%" deploy --only hosting,firestore:rules
if %ERRORLEVEL% NEQ 0 (
    echo DEPLOY FAILED! Run Publish_To_Firebase.bat to login.
    pause
    exit /b 1
)

echo.
echo SUCCESS! Website is now LIVE on Firebase!
echo ===================================================
pause
