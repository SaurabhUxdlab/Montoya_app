Add-Type -AssemblyName System.Drawing

$projectRoot = $PSScriptRoot | Split-Path -Parent
$logoFile = Join-Path $projectRoot "assets\montoyalogo.png"
$iconFile = Join-Path $projectRoot "assets\app-icon.png"

$logoImg = [System.Drawing.Bitmap]::FromFile($logoFile)
Write-Host "montoyalogo.png size: $($logoImg.Width) x $($logoImg.Height)"
$logoImg.Dispose()

$iconImg = [System.Drawing.Bitmap]::FromFile($iconFile)
Write-Host "app-icon.png size: $($iconImg.Width) x $($iconImg.Height)"
$iconImg.Dispose()
