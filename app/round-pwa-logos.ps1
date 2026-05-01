Add-Type -AssemblyName System.Drawing

function Create-RoundedImage ($srcPath, $destPath) {
    Write-Host "Creating perfectly rounded anti-aliased icon for $destPath..."
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
    
    # Use high quality rendering to prevent jagged edges
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Start with full transparent background
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    # 22% border radius looks exactly like standard iOS squircle
    $r = [int]($img.Width * 0.22)
    $d = $r * 2
    
    # Draw vector paths for the four rounded corners
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($img.Width - $d, 0, $d, $d, 270, 90)
    $path.AddArc($img.Width - $d, $img.Height - $d, $d, $d, 0, 90)
    $path.AddArc(0, $img.Height - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    
    # Clip image context to this vector shape
    $g.SetClip($path)
    
    # Draw the source image inside the vector mask
    $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
    
    # Save as true PNG
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
}

$base = "C:\Users\12039383\OneDrive - MEGHA ENGINEERING & INFRASTRUCTURES LIMITED\Desktop\Smartchoose 1\app\public"
Create-RoundedImage "$base\logo.png" "$base\logo192.png"
Create-RoundedImage "$base\logo.png" "$base\logo512.png"
Create-RoundedImage "$base\logo.png" "$base\logo_rounded.png"

Write-Host "PWA Logos have been successfully clipped with anti-aliasing!"
