@echo off
set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
cd /d "%~dp0app"
echo --- STEP 1: Building Site ---
call npm run build
echo --- STEP 2: Publishing to live ---
set "NODE_EXE=%~dp0app\node\node-v20.11.1-win-x64\node.exe"
set "FIREBASE_BIN=%~dp0app\node_modules\firebase-tools\lib\bin\firebase.js"
"%NODE_EXE%" "%FIREBASE_BIN%" deploy --only hosting
echo --- FINISHED ---
pause
