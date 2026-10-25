# Generates anime-style card faces for MN001-MN040 into /cards/anime.
# Face = full-bleed art + one name at the top (1400x1960, quality 90).
# Art: Wallhaven API (SFW anime category, portrait only). Text: from customCards.js.
# shortcut: Windows-only (GDI+). Rerun to re-roll art; the default /cards/custom deck is untouched.
param(
  [string]$Only = '',
  [switch]$ReuseCache
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$dataFile = Join-Path $root 'client/src/data/customCards.js'
$outDir = Join-Path $root 'client/public/cards/anime'
$cacheDir = Join-Path $env:TEMP 'meo-no-anime-art'
New-Item -ItemType Directory -Force -Path $outDir, $cacheDir | Out-Null

# Search terms chosen to fit each card's role. Same term may repeat; images are de-duplicated.
$queries = @{
  MN001 = 'dark';      MN002 = 'squirrel'; MN003 = 'knight';  MN004 = 'detective'
  MN005 = 'shield';    MN006 = 'chibi';    MN007 = 'lightning'; MN008 = 'cute cat'
  MN009 = 'cute';      MN010 = 'fairy';    MN011 = 'sleeping'; MN012 = 'witch'
  MN013 = 'ninja';     MN014 = 'ocean';    MN015 = 'angel';    MN016 = 'robot'
  MN017 = 'rabbit';    MN018 = 'demon';    MN019 = 'cute cat'; MN020 = 'idol'
  MN021 = 'samurai';   MN022 = 'cards';    MN023 = 'vampire';  MN024 = 'storm'
  MN025 = 'elf';       MN026 = 'kemonomimi'; MN027 = 'cake';   MN028 = 'phoenix'
  MN029 = 'space';     MN030 = 'map';      MN031 = 'wolf';     MN032 = 'dragon'
  MN033 = 'penguin';   MN034 = 'animal';   MN035 = 'mirror';   MN036 = 'wind'
  MN037 = 'stars';     MN038 = 'royal';    MN039 = 'chibi';    MN040 = 'stars'
}

# Hand-picked Wallhaven ids for cards where the top search hit was off-tone.
$picks = @{
  MN005 = 'g8q9dd'; MN006 = 'zxl62y'; MN008 = '8g8qrk'; MN019 = 'mlg3yk'
  MN026 = 'w83rpx'; MN034 = '3z9o23'; MN038 = '6dl356'; MN039 = '83k1go'
  MN040 = '57e7x5'
}

function Get-CardData {
  $cards = @()
  foreach ($line in Get-Content -LiteralPath $dataFile -Encoding UTF8) {
    $m = [regex]::Match($line, '^\s*"(MN\d{3})":\s*(\{.*\}),?\s*$')
    if ($m.Success) { $cards += ($m.Groups[2].Value | ConvertFrom-Json) }
  }
  return $cards
}

function Search-Wallhaven([string]$query, [int]$page = 1) {
  $url = 'https://wallhaven.cc/api/v1/search?q=' + [Uri]::EscapeDataString($query) +
    '&categories=010&purity=100&sorting=relevance&atleast=1000x1500' +
    '&ratios=9x16,10x16,3x4,2x3,5x7&page=' + $page
  for ($try = 0; $try -lt 3; $try++) {
    try {
      $res = Invoke-RestMethod -Uri $url -UserAgent 'Mozilla/5.0' -TimeoutSec 30
      return @($res.data)
    } catch {
      if ($try -eq 2) { throw }
      Start-Sleep -Seconds 6
    }
  }
}

function Get-Artwork($item, [string]$id, [string]$index) {
  $ext = [IO.Path]::GetExtension($item.path)
  if (-not $ext) { $ext = '.jpg' }
  $file = Join-Path $cacheDir ($id + '_' + $index + $ext)
  if (-not ($ReuseCache -and (Test-Path -LiteralPath $file) -and (Get-Item $file).Length -gt 10000)) {
    Invoke-WebRequest -Uri $item.path -OutFile $file -UseBasicParsing -UserAgent 'Mozilla/5.0' -TimeoutSec 60
  }
  return $file
}

function Get-FittedFont($g, [string]$text, $maxW, $maxH, [int]$maxSize, [int]$minSize, $style) {
  for ($size = $maxSize; $size -ge $minSize; $size -= 2) {
    $font = New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
    $measured = $g.MeasureString($text, $font, [System.Drawing.SizeF]::new([single]$maxW, 5000))
    if ($measured.Height -le $maxH -and $measured.Width -le $maxW + 2) {
      return @{ Font = $font; Height = [single]$measured.Height }
    }
    $font.Dispose()
  }
  throw "Text does not fit even at ${minSize}px: $text"
}

function New-CardFace($card, [string]$artPath, [string]$outPath) {
  $W = 1400; $H = 1960
  $art = [System.Drawing.Image]::FromFile($artPath)
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $cleanup = New-Object System.Collections.ArrayList
  try {
    # Cover-crop the artwork to 5:7.
    $scale = [Math]::Max($W / $art.Width, $H / $art.Height)
    $sw = $W / $scale; $sh = $H / $scale
    $sx = ($art.Width - $sw) / 2; $sy = ($art.Height - $sh) / 2
    $g.DrawImage($art,
      [System.Drawing.RectangleF]::new(0, 0, $W, $H),
      [System.Drawing.RectangleF]::new($sx, $sy, $sw, $sh),
      [System.Drawing.GraphicsUnit]::Pixel)

    $white = [System.Drawing.Brushes]::White
    $fmt = New-Object System.Drawing.StringFormat
    [void]$cleanup.Add($fmt)
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Near

    $titleFit = Get-FittedFont $g $card.name 1240 380 180 90 ([System.Drawing.FontStyle]::Bold)
    [void]$cleanup.Add($titleFit.Font)
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
    [void]$cleanup.Add($shadow)

    # Chỉ một tên lá ở trên cùng; phần còn lại là ảnh full-bleed.
    $scrimRect = [System.Drawing.Rectangle]::new(0, 0, $W, 560)
    $scrimBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $scrimRect,
      [System.Drawing.Color]::FromArgb(225, 6, 8, 14),
      [System.Drawing.Color]::FromArgb(0, 6, 8, 14),
      [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    [void]$cleanup.Add($scrimBrush)
    $g.FillRectangle($scrimBrush, $scrimRect)

    $titleRect = [System.Drawing.RectangleF]::new(80, 90, 1240, 380)
    $shadowRect = [System.Drawing.RectangleF]::new(84, 96, 1240, 380)
    $g.DrawString($card.name, $titleFit.Font, $shadow, $shadowRect, $fmt)
    $g.DrawString($card.name, $titleFit.Font, $white, $titleRect, $fmt)

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]90)
    $bmp.Save($outPath, $codec, $encParams)
  } finally {
    foreach ($item in $cleanup) { if ($item) { $item.Dispose() } }
    $g.Dispose(); $bmp.Dispose(); $art.Dispose()
  }
}

$cards = Get-CardData
$onlyIds = @($Only -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($onlyIds.Count -gt 0) {
  $cards = @($cards | Where-Object { $onlyIds -contains $_.id })
}

$used = @{}
$index = 0
foreach ($card in $cards) {
  $index++
  if ($ReuseCache) {
    $files = @(Get-ChildItem -LiteralPath $cacheDir -File |
      Where-Object { $_.Name -like ($card.id + '_*') } | Sort-Object Name)
    $preferred = $picks[$card.id]
    $preferredFile = if ($preferred) {
      $files | Where-Object { $_.Name -like ($card.id + '_' + $preferred + '.*') } | Select-Object -First 1
    } else { $null }
    $ordered = @($preferredFile) + @($files | Where-Object { -not $preferredFile -or $_.Name -ne $preferredFile.Name })
    $pickedFile = $null
    foreach ($f in $ordered) {
      if (-not $f -or $used.ContainsKey($f.Name)) { continue }
      try {
        $probe = [System.Drawing.Image]::FromFile($f.FullName)
        $ok = $probe.Width -ge 700 -and $probe.Height -gt $probe.Width
        $probe.Dispose()
        if ($ok) { $pickedFile = $f; break }
      } catch {
        continue
      }
    }
    if (-not $pickedFile) { throw "No cached artwork for $($card.id)" }
    $used[$pickedFile.Name] = $true
    $outPath = Join-Path $outDir ($card.id + '.jpg')
    New-CardFace $card $pickedFile.FullName $outPath
    Write-Host ("[{0}/{1}] {2} {3}  <- cached {4}" -f $index, $cards.Count, $card.id, $card.name, $pickedFile.Name)
    continue
  }

  $query = $queries[$card.id]
  Write-Host ("[{0}/{1}] {2} {3}  <- {4}" -f $index, $cards.Count, $card.id, $card.name, $query)
  Start-Sleep -Milliseconds 1500

  $picked = $null
  $preferred = $picks[$card.id]
  foreach ($page in 1, 2) {
    if ($picked) { break }
    $results = Search-Wallhaven $query $page
    foreach ($item in $results) {
      if ($preferred -and $item.id -ne $preferred) { continue }
      if ($used.ContainsKey($item.id)) { continue }
      try {
        $artFile = Get-Artwork $item $card.id $item.id
        $probe = [System.Drawing.Image]::FromFile($artFile)
        $ok = $probe.Width -ge 900 -and $probe.Height -gt $probe.Width
        $probe.Dispose()
        if (-not $ok) { continue }
        $picked = @{ Item = $item; File = $artFile }
        break
      } catch {
        Write-Host ("    skip: {0}" -f $_.Exception.Message)
        continue
      }
    }
  }
  if (-not $picked) { throw "No usable artwork for $($card.id) (query: $query)" }

  $used[$picked.Item.id] = $true
  $outPath = Join-Path $outDir ($card.id + '.jpg')
  New-CardFace $card $picked.File $outPath
  Write-Host ("    ok  {0}  {1}" -f $picked.Item.resolution, $picked.Item.path)
}

Write-Host 'Done. Restart Vite if it is running so the new images are picked up.'
