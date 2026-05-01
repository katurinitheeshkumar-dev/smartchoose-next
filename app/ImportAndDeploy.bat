@echo off
setlocal enabledelayedexpansion
set "LOCAL_NODE=%~dp0node\node-v20.11.1-win-x64"
set "PATH=%LOCAL_NODE%;%PATH%"
set "NODE=%LOCAL_NODE%\node.exe"

echo ============================================================
echo   SmartChoose - Merchant Center CSV Product Importer
echo ============================================================
echo.

:: Check if CSV file exists
if not exist "%~dp0merchant-suggestions.csv" (
    echo [ERROR] CSV file not found!
    echo.
    echo  How to get the CSV:
    echo  1. Open Google Merchant Center ^(merchants.google.com^)
    echo  2. Go to: Products ^& store ^> Popular products
    echo  3. Click "Suggestions" tab
    echo  4. Click the Download arrow ^(bottom right^)
    echo  5. Choose ".csv"
    echo  6. Save/rename file as:  merchant-suggestions.csv
    echo  7. Place it in:  SmartChoose_Site\app\
    echo  8. Run this script again!
    echo.
    pause
    exit /b 1
)

echo [INFO] Found merchant-suggestions.csv
echo [INFO] Starting product import...
echo.

:: Run the importer script
call "%NODE%" --experimental-vm-modules "%~dp0merchant-csv-importer.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Import had some issues. Check the log above.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Import Done! Now deploying to Firebase...
echo ============================================================
echo.

:: Auto-regenerate sitemap with new products
echo [STEP 1/3] Regenerating sitemap with new products...
call "%NODE%" --experimental-vm-modules "%~dp0sitemap-generator.js"
echo.

:: Build + Deploy
echo [STEP 2/3] Building website...
call "%NODE%" "%~dp0node_modules\vite\bin\vite.js" build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo.

echo [STEP 3/3] Deploying to Firebase...
call "%NODE%" "%~dp0node_modules\firebase-tools\lib\bin\firebase.js" deploy --only hosting
echo.

echo ============================================================
echo   SUCCESS! Products are LIVE on https://smartchoose.in
echo ============================================================
echo.
echo  Google will index the new pages in 2-7 days automatically.
echo  No need to re-submit sitemap - it's already set up!
echo.
pause
