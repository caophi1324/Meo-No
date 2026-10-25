# Builds the 5 anime beast illustrations used by the "anime" deck theme.
# Hand-picked Safebooru art (no humans, general rating); rerun only to replace art.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$outDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'client/public/cards/anime/beasts'
$cacheDir = Join-Path $env:TEMP 'meo-no-anime-beasts'
New-Item -ItemType Directory -Force -Path $outDir, $cacheDir | Out-Null

$sources = @{
  'cao-lua'   = 'https://safebooru.org/images/1621/2e06382f5a0e6c06fa2b7a341af2d0444e6107b8.jpg'
  'ho-van'    = 'https://safebooru.org/images/4434/8623de9b5964c139f6906e90a8c6010d680456fc.jpg'
  'chim-ung'  = 'https://safebooru.org/images/1090/5f780f9ccc5252299ce7f3f472cd8cf9a4725a2c.jpg'
  'ca-chep'   = 'https://safebooru.org/images/4434/2978c737da820c97c990eb8a8ed98f11558a7907.jpg'
  'huou-sao'  = 'https://safebooru.org/images/4434/99d8ca252cde97da0a25d869266a1565f4f8dcec.jpg'
}

$size = 700
# The tiger source has white letterbox bars; zoom in a little to crop them out.
$zoom = @{ 'ho-van' = 0.82 }
foreach ($slug in $sources.Keys) {
  $src = Join-Path $cacheDir "$slug.jpg"
  if (-not (Test-Path -LiteralPath $src) -or (Get-Item $src).Length -lt 10000) {
    Invoke-WebRequest -Uri $sources[$slug] -OutFile $src -UseBasicParsing -UserAgent 'Mozilla/5.0' -TimeoutSec 60
  }
  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $z = if ($zoom.ContainsKey($slug)) { $zoom[$slug] } else { 1 }
    $side = [Math]::Min($img.Width, $img.Height) * $z
    $sx = ($img.Width - $side) / 2
    $sy = ($img.Height - $side) / 2
    $g.DrawImage($img,
      [System.Drawing.RectangleF]::new(0, 0, $size, $size),
      [System.Drawing.RectangleF]::new($sx, $sy, $side, $side),
      [System.Drawing.GraphicsUnit]::Pixel)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]88)
    $bmp.Save((Join-Path $outDir "$slug.jpg"), $codec, $params)
  } finally {
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  }
  Write-Host "ok $slug"
}
