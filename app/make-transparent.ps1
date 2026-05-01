Add-Type -AssemblyName System.Drawing

$baseDir = "C:\Users\12039383\OneDrive - MEGHA ENGINEERING & INFRASTRUCTURES LIMITED\Desktop\Smartchoose 1\app\public"
$imgPath = "$baseDir\logo.png"

Write-Host "Loading image..."
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()

Write-Host "Processing pixels..."
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -ge 240 -and $pixel.G -ge 240 -and $pixel.B -ge 240) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}

Write-Host "Saving transparent PNGs..."
$bmp.Save("$baseDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("$baseDir\logo192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("$baseDir\logo512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Success! All logos are now transparent."
