@echo off
set "LOCAL_NODE=%~dp0node\node-v20.11.1-win-x64"
set "PATH=%LOCAL_NODE%;%PATH%"
echo STEP 1: Building website...
call "%LOCAL_NODE%\node.exe" "%~dp0node_modules\vite\bin\vite.js" build
pause
