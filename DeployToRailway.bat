@echo off
echo ===================================================
echo   SMARTCHOOSE — Railway Project Creator
echo ===================================================
echo.
set /p TOKEN="Paste your Railway token and press Enter: "
if "%TOKEN%"=="" ( echo No token! & pause & exit /b 1 )

set "NODE=%~dp0app\node\node-v20.11.1-win-x64\node.exe"
"%NODE%" "%~dp0playwright-service\deploy-railway.js" %TOKEN%
pause
