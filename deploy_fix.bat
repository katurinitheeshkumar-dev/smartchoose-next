@echo off
cd /d "%~dp0app"
set "PATH=%CD%\node\node-v20.11.1-win-x64;%PATH%"
echo Current Path: %PATH%
echo Building Frontend...
call npm run build
echo Deploying to Firebase...
call npx firebase-tools deploy --only hosting --non-interactive --project smartchoose-official
echo Done!
