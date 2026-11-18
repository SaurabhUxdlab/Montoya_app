Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceIcon = Join-Path $projectRoot "assets\app-icon.png"

Write-Host "Source icon: $sourceIcon"
if (-not (Test-Path $sourceIcon)) {
    Write-Error "Source icon does not exist!"
    exit 1
}

# 1. Update assets folder
Copy-Item -Path $sourceIcon -Destination (Join-Path $projectRoot "assets\icon.png") -Force
Copy-Item -Path $sourceIcon -Destination (Join-Path $projectRoot "assets\adaptive-icon.png") -Force
Copy-Item -Path $sourceIcon -Destination (Join-Path $projectRoot "assets\favicon.png") -Force
Write-Host "Updated assets/icon.png, adaptive-icon.png, favicon.png"

# Load source image
$srcImg = [System.Drawing.Image]::FromFile($sourceIcon)
Write-Host "Source image loaded: $($srcImg.Width)x$($srcImg.Height)"

$densities = @(
    @{ Name = "mdpi"; LegacySize = 48; ForegroundSize = 108 },
    @{ Name = "hdpi"; LegacySize = 72; ForegroundSize = 162 },
    @{ Name = "xhdpi"; LegacySize = 96; ForegroundSize = 216 },
    @{ Name = "xxhdpi"; LegacySize = 144; ForegroundSize = 324 },
    @{ Name = "xxxhdpi"; LegacySize = 192; ForegroundSize = 432 }
)

$resDir = Join-Path $projectRoot "android\app\src\main\res"

foreach ($d in $densities) {
    $folder = Join-Path $resDir "mipmap-$($d.Name)"
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }

    # Delete existing webp files so no duplicate resource conflict occurs
    $webpFiles = Get-ChildItem -Path $folder -Filter "*.webp"
    foreach ($wf in $webpFiles) {
        Remove-Item $wf.FullName -Force
    }

    # Generate ic_launcher.png (legacy standard icon)
    $legacyBmp = New-Object System.Drawing.Bitmap($d.LegacySize, $d.LegacySize)
    $g1 = [System.Drawing.Graphics]::FromImage($legacyBmp)
    $g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g1.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g1.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g1.Clear([System.Drawing.Color]::Transparent)
    $g1.DrawImage($srcImg, 0, 0, $d.LegacySize, $d.LegacySize)
    $g1.Dispose()
    $legacyBmp.Save((Join-Path $folder "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $legacyBmp.Dispose()

    # Generate ic_launcher_round.png (legacy round icon)
    $roundBmp = New-Object System.Drawing.Bitmap($d.LegacySize, $d.LegacySize)
    $g2 = [System.Drawing.Graphics]::FromImage($roundBmp)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g2.Clear([System.Drawing.Color]::Transparent)
    $g2.DrawImage($srcImg, 0, 0, $d.LegacySize, $d.LegacySize)
    $g2.Dispose()
    $roundBmp.Save((Join-Path $folder "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    # Generate ic_launcher_foreground.png (Adaptive icon foreground with safe-zone margin: ~66% of total canvas)
    $fgSize = $d.ForegroundSize
    $fgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $g3 = [System.Drawing.Graphics]::FromImage($fgBmp)
    $g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g3.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g3.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g3.Clear([System.Drawing.Color]::Transparent)
    
    # Safe zone for adaptive icons is inner 66% (e.g. 72dp out of 108dp)
    $logoSize = [int][Math]::Round($fgSize * 0.72)
    $offset = [int][Math]::Round(($fgSize - $logoSize) / 2)
    $g3.DrawImage($srcImg, $offset, $offset, $logoSize, $logoSize)
    $g3.Dispose()
    $fgBmp.Save((Join-Path $folder "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Host "Generated icons for mipmap-$($d.Name)"
}

$srcImg.Dispose()
Write-Host "All Android icons generated successfully!"
