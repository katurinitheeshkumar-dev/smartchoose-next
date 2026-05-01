@echo off
set "NPM_PATH=%~dp0app\node\node-v20.11.1-win-x64"
set "PATH=%NPM_PATH%;%PATH%"
cd /d "%~dp0app"
call npm run build
call npx firebase-tools deploy --only hosting
