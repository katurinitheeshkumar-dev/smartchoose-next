@echo off
set "NODE=%~dp0node\node-v20.11.1-win-x64\node.exe"
"%NODE%" "node_modules\typescript\bin\tsc" -b
