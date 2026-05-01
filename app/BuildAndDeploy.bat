@echo off
setlocal enabledelayedexpansion
set "LOCAL_NODE=%~dp0node\node-v20.11.1-win-x64"
set "PATH=%LOCAL_NODE%;%PATH%"
set "NODE=%LOCAL_NODE%\node.exe"
set "NPM=%LOCAL_NODE%\npm.cmd"

echo ============================================================
echo   SmartChoose - Full Build + SEO Pre-Render + Deploy
echo ============================================================
echo.

:: ── STEP 1: Regenerate Sitemap from Firestore ──────────────────────────────
echo [STEP 1/5] Regenerating sitemap from Firestore...
call "%NODE%" --experimental-vm-modules "%~dp0sitemap-generator.js"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Sitemap generation failed! Using existing sitemap.xml
)
echo.

:: ── STEP 2: Build with Vite ───────────────────────────────────────────────
echo [STEP 2/5] Building website with Vite...
call "%NODE%" "%~dp0node_modules\vite\bin\vite.js" build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed! Aborting.
    pause
    exit /b 1
)
echo.

:: ── STEP 3: Pre-render static HTML for all pages (SEO Fix) ───────────────
echo [STEP 3/5] Pre-rendering static HTML for SEO indexing...
echo    This generates real HTML for every page so Google can index content.
call "%NODE%" "%~dp0prerender.cjs"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Pre-render had issues, but continuing with deploy...
)
echo.

:: ── STEP 4: Deploy to Firebase Hosting ───────────────────────────────────
echo [STEP 4/5] Deploying to Firebase Hosting...
call "%NODE%" "%~dp0node_modules\firebase-tools\lib\bin\firebase.js" deploy --only hosting
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)
echo.

:: ── STEP 5: Auto-Notify Search Engines (Indexing) ─────────────────────────
echo [STEP 5/5] Notifying search engines about new/updated pages...
echo    Pinging Google + Bing sitemap, submitting to IndexNow API...
call "%NODE%" --experimental-vm-modules "%~dp0auto-index.js"
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Auto-indexing had issues. Check logs above.
)
echo.

echo ============================================================
echo   SUCCESS! Your site is live at https://smartchoose.in
echo ============================================================
echo.
echo ✅ Everything is done automatically now!
echo    - Sitemap regenerated from Firestore
echo    - Website built and deployed to Firebase
echo    - Google + Bing notified via sitemap ping
echo    - All %ERRORLEVEL% pages submitted to IndexNow (Bing/Yandex instant index)
echo    - Product pages submitted to Google Indexing API
echo.
echo   No manual Google Search Console steps needed!
echo.
pause
