$filePath = "dist\assets\index-D5ZT58pm.js"
$content = Get-Content -Path $filePath -Raw
$svg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%25' stop-color='%2310B981'/><stop offset='100%25' stop-color='%23065f46'/></linearGradient></defs><rect width='600' height='600' fill='url(%23g)'/><text x='50%25' y='50%25' fill='white' font-family='sans-serif' font-size='36' font-weight='500' text-anchor='middle' dominant-baseline='middle'>SmartChoose</text></svg>"
$newContent = [regex]::Replace($content, 'https://images\.unsplash\.com/photo-[A-Za-z0-9\-\?&=]+', $svg)
Set-Content -Path $filePath -Value $newContent

$srcPath = "src\contexts\DatabaseContext.tsx"
if (Test-Path $srcPath) {
    $srcContent = Get-Content -Path $srcPath -Raw
    $newSrcContent = [regex]::Replace($srcContent, 'https://images\.unsplash\.com/photo-[A-Za-z0-9\-\?&=]+', $svg)
    Set-Content -Path $srcPath -Value $newSrcContent
}

$htmlPath = "dist\index.html"
$htmlContent = Get-Content -Path $htmlPath -Raw
if ($htmlContent -notmatch "localStorage\.removeItem\('sc_products'\)") {
    $htmlContent = $htmlContent -replace '<head>', "<head><script>localStorage.removeItem('sc_products');</script>"
    Set-Content -Path $htmlPath -Value $htmlContent
}

Write-Host "Success!"
