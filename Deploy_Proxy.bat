@echo off
echo ===================================================
echo     SMARTCHOOSE PROXY DEPLOY (VERCEL)
echo ===================================================

set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "NODE=%NODE_DIR%\node.exe"
set "NPX=%NODE_DIR%\npx.cmd"

set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0proxy-server"

echo.
echo Deploying Proxy to Vercel...
:: Use absolute NPX path for space safety
call "%NPX%" vercel --prod
if %ERRORLEVEL% NEQ 0 (
    echo Vercel deployment failed!
) else (
    echo Vercel deployment successful!
)

echo ===================================================
pause
