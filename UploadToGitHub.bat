@echo off
echo ===================================================
echo   SMARTCHOOSE — Auto Upload to GitHub
echo ===================================================
echo.
echo To upload files to GitHub, you need a token.
echo.
echo STEPS:
echo 1. Open: https://github.com/settings/tokens/new
echo 2. Note: "smartchoose-deploy"
echo 3. Expiration: 7 days
echo 4. Check ONLY this box: [x] repo (Full control of private repositories)
echo 5. Click "Generate token"
echo 6. Copy the token (starts with ghp_...)
echo.
set /p GITHUB_TOKEN="Paste GitHub token (starts with ghp_...): "
set /p GITHUB_USER="Enter your GitHub username: "

set "NODE=%~dp0app\node\node-v20.11.1-win-x64\node.exe"
"%NODE%" "%~dp0upload-to-github.js" "%GITHUB_TOKEN%" "%GITHUB_USER%"
pause
