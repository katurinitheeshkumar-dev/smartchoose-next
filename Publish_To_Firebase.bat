@echo off
echo ===================================================
echo     SMARTCHOOSE FIREBASE LOGIN & DEPLOY
echo ===================================================

set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "NODE=%NODE_DIR%\node.exe"
set "FIREBASE_BIN=%~dp0app\node_modules\firebase-tools\lib\bin\firebase.js"

cd /d "%~dp0app"

echo.
echo STEP 1 of 2: Logging into Firebase...
"%NODE%" "%FIREBASE_BIN%" login

echo.
echo STEP 2 of 2: Publishing to Hosting...
"%NODE%" "%FIREBASE_BIN%" deploy --only hosting

echo ===================================================
echo DONE!
pause
