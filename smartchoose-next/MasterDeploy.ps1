# SmartChoose Master Deployment Script
# 1. Setup Portable Node Environment
$nodePath = "D:\SmartChoose_Site\app\node\node-v20.11.1-win-x64"
if (Test-Path $nodePath) {
    $env:PATH = "$nodePath;" + $env:PATH
    Write-Host "🚀 Portable Node detected at $nodePath" -ForegroundColor Cyan
}

Write-Host "🚀 Starting SmartChoose Production Build & Deploy..." -ForegroundColor Green
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "🏗️ Running Next.js Build..." -ForegroundColor Yellow
try {
    # Use the absolute path for npx to be safe
    & "$nodePath\npx.cmd" next build
} catch {
    Write-Host "❌ Build failed! Please fix the errors above." -ForegroundColor Red
    exit 1
}

# 3. Deploy to Vercel
Write-Host "🚀 Deploying to Vercel Production..." -ForegroundColor Yellow
try {
    & "$nodePath\npx.cmd" vercel --prod --yes
} catch {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
}

Write-Host "🎉 Deployment Complete! Your site is now live with the latest optimizations." -ForegroundColor Green
