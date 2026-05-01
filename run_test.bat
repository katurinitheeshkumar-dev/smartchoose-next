@echo off
set "NODE=%~dp0app\node\node-v20.11.1-win-x64\node.exe"
echo Creating Test Blog...
"%NODE%" create-test-blog.js
pause
