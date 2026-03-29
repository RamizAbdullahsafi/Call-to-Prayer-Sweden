$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param([int]$Size, [string]$OutPath)
  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(17, 19, 24))

  $blue = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(37, 99, 235))
  $s = $Size / 512.0

  # Left minaret (body + spire)
  $g.FillRectangle($blue, 70 * $s, 140 * $s, 48 * $s, 280 * $s)
  $leftSpire = @(
    [System.Drawing.PointF]::new(70 * $s, 140 * $s),
    [System.Drawing.PointF]::new(94 * $s, 85 * $s),
    [System.Drawing.PointF]::new(118 * $s, 140 * $s)
  )
  $g.FillPolygon($blue, $leftSpire)

  # Right minaret
  $g.FillRectangle($blue, 394 * $s, 140 * $s, 48 * $s, 280 * $s)
  $rightSpire = @(
    [System.Drawing.PointF]::new(394 * $s, 140 * $s),
    [System.Drawing.PointF]::new(418 * $s, 85 * $s),
    [System.Drawing.PointF]::new(442 * $s, 140 * $s)
  )
  $g.FillPolygon($blue, $rightSpire)

  # Main hall
  $g.FillRectangle($blue, 140 * $s, 260 * $s, 232 * $s, 180 * $s)

  # Dome
  $g.FillEllipse($blue, 176 * $s, 120 * $s, 160 * $s, 140 * $s)

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
