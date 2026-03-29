$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param([int]$Size, [string]$OutPath)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(15, 20, 25))
  $gold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(201, 162, 39))
  $pad = [int]($Size * 0.22)
  $d = $Size - 2 * $pad
  $g.FillEllipse($gold, $pad, $pad, $d, $d)
  $g.Dispose()
  $dir = Split-Path -Parent $OutPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Save-Icon -Size 512 -OutPath (Join-Path $root "public\icon-512.png")
Save-Icon -Size 192 -OutPath (Join-Path $root "public\icon-192.png")
Write-Host "Wrote public/icon-512.png and public/icon-192.png"
