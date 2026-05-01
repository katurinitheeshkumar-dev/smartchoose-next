@echo off
set "NODE_DIR=%~dp0app\node\node-v20.11.1-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
set "NODE=%NODE_DIR%\node.exe"
set "NPX=%NODE_DIR%\npx.cmd"

echo --- STEP 1: Deploying Proxy Server to Vercel ---
cd /d "%~dp0proxy-server"
call "%NPX%" vercel --prod --yes

echo --- STEP 2: Building App ---
cd /d "%~dp0app"
"%NODE%" "node_modules\vite\bin\vite.js" build

echo --- STEP 3: Deploying App to Firebase Hosting ---
call "%NPX%" firebase-tools deploy --only hosting --non-interactive

echo --- DEPLOYMENT COMPLETE ---
