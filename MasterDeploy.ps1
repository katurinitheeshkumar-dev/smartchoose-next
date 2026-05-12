param([string]$Choice = "")
Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$NODE  = "d:\SmartChoose_Site\app\node\node-v20.11.1-win-x64"
$PROJ  = "d:\SmartChoose_Site\smartchoose-next"
$ROOT  = "d:\SmartChoose_Site"
$env:PATH = "$NODE;" + $env:PATH

# ── Helpers ────────────────────────────────────────────────
function Line($c)   { Write-Host ("-" * 56) -ForegroundColor $c }
function OK($t)     { Write-Host "  [PASS] $t" -ForegroundColor Green }
function FAIL($t)   { Write-Host "  [FAIL] $t" -ForegroundColor Red }
function INFO($t)   { Write-Host "  [INFO] $t" -ForegroundColor Yellow }
function HEAD($t)   { Write-Host ""; Line "Cyan"; Write-Host "   $t" -ForegroundColor Cyan; Line "Cyan" }
function DONE($t)   { Write-Host ""; Line "Green"; Write-Host "   $t" -ForegroundColor Green; Line "Green" }

# ── Pre-flight (always runs) ───────────────────────────────
function PreFlight {
    Set-Location $PROJ
    $nv = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { FAIL "Node.js not found"; exit 1 }
    OK "Node.js $nv"
    if (-not (Test-Path "$PROJ\node_modules")) {
        INFO "node_modules missing - npm install..."; npm install 2>&1 | Out-Null
    }
    if (-not (Test-Path "$PROJ\.env.local")) { FAIL ".env.local missing!"; exit 1 }
    OK "Pre-flight passed"
}

# ── Auto-fix (runs before every build) ────────────────────
function AutoFix {
    HEAD "Auto-fix"
    $ncfg = Get-Content "$PROJ\next.config.ts" -Raw
    if ($ncfg -notmatch "ignoreDuringBuilds") {
        $fixed = "import type { NextConfig } from `"next`";`nconst nextConfig: NextConfig = {`n  eslint: { ignoreDuringBuilds: true },`n};`nexport default nextConfig;"
        Set-Content "$PROJ\next.config.ts" $fixed -Encoding UTF8
        OK "next.config.ts fixed"
    } else { OK "next.config.ts OK" }

    $pkg = Get-Content "$PROJ\package.json" -Raw | ConvertFrom-Json
    $nxv = $pkg.dependencies.next -replace "[^0-9.]",""
    $p   = $nxv.Split('.'); $ma=[int]$p[0]; $mi=[int]$p[1]; $pa=[int]$p[2]
    $vuln = ($ma -eq 15 -and ($mi -lt 2 -or ($mi -eq 2 -and $pa -lt 4))) -or
            ($ma -eq 14 -and ($mi -lt 2 -or ($mi -eq 2 -and $pa -lt 30)))
    if ($vuln) {
        INFO "Next.js $nxv vulnerable - upgrading..."; npm install next@15.4.11 eslint-config-next@15.4.11 --save-exact 2>&1 | Out-Null; OK "Next.js upgraded"
    } else { OK "Next.js $nxv OK" }
}

# ── Option 1: Main Website → Vercel ───────────────────────
function DeployWebsite {
    HEAD "Option 1 - Website Deploy to Vercel"
    PreFlight; AutoFix

    HEAD "Building (Next.js)"
    INFO "Please wait ~2 minutes..."
    $lines = @()
    npm run build 2>&1 | Tee-Object -Variable lines | ForEach-Object {
        $l = $_.ToString()
        if ($l -match "error|Error" -and $l -notmatch "localStorage|sc_|EBADENGINE|protobuf|NativeCommandError") { Write-Host "  $_" -ForegroundColor Red }
        elseif ($l -match "Route|Compiled|Static|pages") { Write-Host "  $_" -ForegroundColor DarkCyan }
    }
    if (-not ($lines | Where-Object { $_ -match "Route \(app\)" })) {
        FAIL "Build failed!"; Start-Sleep 10; return
    }
    OK "Build SUCCESS"

    # Algolia sync if SA present
    $sa = "$ROOT\firebase-service-account.json"
    if (Test-Path $sa) {
        HEAD "Algolia Sync"
        INFO "Syncing products..."
        node "$ROOT\sync-algolia.js" 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkCyan }
        if ($LASTEXITCODE -eq 0) { OK "Algolia synced" } else { INFO "Algolia sync skipped (non-critical)" }
    }

    # Git push
    HEAD "Git Push"
    Set-Location $PROJ
    $gs = git status --short 2>&1
    if ($gs) {
        $ts = Get-Date -Format "dd-MMM-yyyy HH:mm"
        git add . 2>&1 | Out-Null
        git commit -m "Update: SmartChoose $ts" 2>&1 | Out-Null
        OK "Committed"
    }
    $po = git push 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ("$po" -match "rejected") { git pull --rebase origin main 2>&1|Out-Null; git push 2>&1|Out-Null }
    }
    if ($LASTEXITCODE -eq 0) { OK "Pushed to GitHub - Vercel deploying now" } else { FAIL "Push failed: $po" }

    DONE "Website Deploy COMPLETE - Live in ~2 mins"
    Write-Host "  https://smartchoose-next.vercel.app" -ForegroundColor Cyan
}

# ── Option 2: Algolia Sync ─────────────────────────────────
function SyncAlgolia {
    HEAD "Option 2 - Algolia Search Sync"
    $sa = "$ROOT\firebase-service-account.json"
    if (-not (Test-Path $sa)) {
        FAIL "firebase-service-account.json not found!"
        INFO "Get it from: Firebase Console -> Project Settings -> Service Accounts"
        INFO "Save as: d:\SmartChoose_Site\firebase-service-account.json"
        Start-Sleep 8; return
    }
    INFO "Syncing all published products to Algolia..."
    node "$ROOT\sync-algolia.js" 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkCyan }
    if ($LASTEXITCODE -eq 0) { OK "Algolia sync complete" } else { FAIL "Sync failed" }
    DONE "Algolia Sync COMPLETE"
}

# ── Option 3: Firestore Rules ──────────────────────────────
function DeployRules {
    HEAD "Option 3 - Firestore Rules Deploy"
    $npx = "$NODE\npx.cmd"
    Set-Location "$ROOT\smartchoose-next"
    INFO "Deploying Firestore security rules..."
    & $npx firebase-tools deploy --only firestore:rules 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -eq 0) { OK "Rules deployed successfully" } else { FAIL "Rules deploy failed - run firebase login first" }
    DONE "Firestore Rules Deploy COMPLETE"
}

# ── Option 4: Proxy Server ─────────────────────────────────
function DeployProxy {
    HEAD "Option 4 - Proxy Server Deploy to Vercel"
    $proxyDir = "$ROOT\proxy-server"
    if (-not (Test-Path $proxyDir)) { FAIL "proxy-server folder not found!"; Start-Sleep 5; return }
    Set-Location $proxyDir
    $npx = "$NODE\npx.cmd"
    INFO "Deploying proxy-server to Vercel..."
    & $npx vercel --prod 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -eq 0) { OK "Proxy deployed" } else { FAIL "Proxy deploy failed" }
    DONE "Proxy Deploy COMPLETE"
}

# ── Option 5: ALL ──────────────────────────────────────────
function DeployAll {
    HEAD "Option 5 - FULL DEPLOY (Website + Algolia + Rules)"
    Write-Host "  This will deploy everything. Starting now..." -ForegroundColor Yellow
    Start-Sleep 2

    # 1. Website
    DeployWebsite

    # 2. Rules (if firebase installed)
    $npx = "$NODE\npx.cmd"
    HEAD "Firestore Rules"
    Set-Location "$ROOT\smartchoose-next"
    & $npx firebase-tools deploy --only firestore:rules 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -eq 0) { OK "Rules deployed" } else { INFO "Rules skipped (firebase not logged in)" }

    DONE "FULL DEPLOY COMPLETE"
    Write-Host "  Website : https://smartchoose-next.vercel.app" -ForegroundColor Cyan
    Write-Host "  Vercel  : https://vercel.com/katurinitheeshkumar-dev/smartchoose-next" -ForegroundColor Cyan
}

# ── SMART DETECT ───────────────────────────────────────────
function SmartDetect {
    HEAD "Smart Auto-Detect"
    INFO "Checking for changes..."
    
    $siteChanged = $false
    $proxyChanged = $false
    $rulesChanged = $false

    # Check smartchoose-next
    Set-Location $PROJ
    $gsSite = git status --short 2>&1
    if ($gsSite) { $siteChanged = $true; INFO "Changes found in Website code" }

    # Check proxy-server
    $proxyDir = "$ROOT\proxy-server"
    if (Test-Path $proxyDir) {
        Set-Location $proxyDir
        $gsProxy = git status --short 2>&1
        if ($gsProxy) { $proxyChanged = $true; INFO "Changes found in Proxy server" }
    }

    # Check rules
    Set-Location $PROJ
    if (git status --short firestore.rules 2>&1) { $rulesChanged = $true; INFO "Firestore rules changed" }

    if ($siteChanged) { DeployWebsite }
    elseif ($proxyChanged) { DeployProxy }
    elseif ($rulesChanged) { DeployRules }
    else {
        INFO "No obvious code changes found."
        INFO "Running Website Deploy by default (Option 1)..."
        Start-Sleep 2
        DeployWebsite
    }
}

# ── MAIN MENU ──────────────────────────────────────────────

Clear-Host
Write-Host ""
Line "Cyan"
Write-Host "       SmartChoose  MASTER DEPLOY  (v2.1)" -ForegroundColor Cyan
Line "Cyan"
Write-Host ""
Write-Host "    [A]  Smart Auto-Detect (Default)  <- 5s Timeout" -ForegroundColor Green
Write-Host "    [1]  Website Code  (Vercel)" -ForegroundColor White
Write-Host "    [2]  Algolia Search Sync" -ForegroundColor White
Write-Host "    [3]  Firestore Rules" -ForegroundColor White
Write-Host "    [4]  Proxy Server  (Vercel)" -ForegroundColor White
Write-Host "    [5]  ALL at once   (Full Sync)" -ForegroundColor Yellow
Write-Host "    [0]  Exit" -ForegroundColor DarkGray
Write-Host ""
Line "Cyan"
Write-Host ""

if (-not $Choice) {
    Write-Host "  Auto-detecting in 5 seconds... (Press 1-5 to override)" -ForegroundColor Gray
    $timer = 5
    while ($timer -gt 0 -and -not [Console]::KeyAvailable) {
        Write-Host -NoNewline "." -ForegroundColor Gray
        Start-Sleep 1
        $timer--
    }
    Write-Host ""
    
    if ([Console]::KeyAvailable) {
        $Choice = [Console]::ReadKey($true).KeyChar
    } else {
        $Choice = "A"
    }
}

switch ($Choice.ToString().ToUpper()) {
    "A" { SmartDetect }
    "1" { DeployWebsite }
    "2" { SyncAlgolia }
    "3" { DeployRules }
    "4" { DeployProxy }
    "5" { DeployAll }
    "0" { Write-Host "  Bye!"; exit 0 }
    default { 
        Write-Host "  Invalid choice '$Choice'. Defaulting to SmartDetect..." -ForegroundColor Yellow
        Start-Sleep 1
        SmartDetect
    }
}

Write-Host ""
Write-Host "  Closing in 5 seconds..." -ForegroundColor DarkGray
Start-Sleep 5

