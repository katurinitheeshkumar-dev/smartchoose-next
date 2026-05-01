@echo off
set "LOCAL_NODE=%~dp0node\node-v20.11.1-win-x64"
set "PATH=%LOCAL_NODE%;%PATH%"

echo STEP 1: Cleaning old build tools...
if exist node_modules\vite (
    rd /s /q node_modules\vite
)
if exist node_modules\@vitejs (
    rd /s /q node_modules\@vitejs
)

echo STEP 2: Installing compatible build tools (Vite 5)...
call "%LOCAL_NODE%\npm.cmd" install

echo STEP 3: Running build...
call "%LOCAL_NODE%\node.exe" "%~dp0node_modules\vite\bin\vite.js" build

echo.
echo SUCCESS: Build completed! Your files are in the 'dist' folder.
pause
