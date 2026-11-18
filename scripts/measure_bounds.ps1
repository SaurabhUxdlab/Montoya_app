Add-Type -AssemblyName System.Drawing

$projectRoot = $PSScriptRoot | Split-Path -Parent
$sourcePath = Join-Path $projectRoot "assets\app-icon.png"

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
$w = $bmp.Width
$h = $bmp.Height

Write-Host "Source image size: $w x $h"

# Find actual non-white bounding box
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Check if pixel is not pure white or transparent
        if ($c.A -gt 20 -and ($c.R -lt 250 -or $c.G -lt 250 -or $c.B -lt 250)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$bmp.Dispose()

$emblemW = $maxX - $minX + 1
$emblemH = $maxY - $minY + 1

Write-Host "Emblem bounding box: X=[$minX, $maxX] (W=$emblemW), Y=[$minY, $maxY] (H=$emblemH)"
Write-Host "Current Margins: Left=$minX, Right=$($w - 1 - $maxX), Top=$minY, Bottom=$($h - 1 - $maxY)"
