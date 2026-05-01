@echo off
setlocal
cd /d "%~dp0app"
set "NODE_DIR=%CD%\node\node-v20.11.1-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

echo ===================================================
echo   SMARTCHOOSE AI MAGIC ACTIVATOR (PATH-SAFE)
echo ===================================================
echo.
echo Step 1/2: Building your Premium Frontend...
"%NODE_DIR%\node.exe" .\node_modules\vite\bin\vite.js build

echo.
echo Step 2/2: Publishing to the Global Cloud...
call npx firebase-tools deploy --only hosting --non-interactive --project smartchoose-official

echo.
echo ===================================================
echo   DONE! Refresh your blog admin to see the Magic!
echo ===================================================
pause
