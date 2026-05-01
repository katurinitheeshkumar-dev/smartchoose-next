@echo off
echo ===================================================
echo   SMARTCHOOSE CREATOR AUTOMATION SUITE
echo ===================================================
echo.
echo Launching the n8n deployment guide...
start "" "%~dp0n8n_Setup_Guide.md"
echo.
echo Opening the Railway 1-Click Deploy template in your browser...
timeout /t 3 >nul
start "" "https://railway.app/template/n8n"
echo.
echo Please follow the guide to connect n8n to your SmartChoose proxy!
pause
