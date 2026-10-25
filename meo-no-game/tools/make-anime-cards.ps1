# Generates anime-style card faces for MN001-MN040 into /cards/anime.
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
$brand = "M$([char]0x00C8)O N$([char]0x1ED4)"
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

$accent = @{
  bomb = '#EF4444'; attack = '#F97316'; draw = '#38BDF8'; search = '#38BDF8'
  defense = '#22C55E'; combo = '#A855F7'; steal = '#EAB308'; reveal = '#06B6D4'
  nope = '#EC4899'; skip = '#94A3B8'; destroy = '#F43F5E'; extra_turn = '#F59E0B'
  self_attack = '#F43F5E'; shuffle = '#8B5CF6'; disable = '#64748B'; group = '#FB7185'
  revive = '#10B981'; recycle = '#14B8A6'; reverse = '#818CF8'; future = '#A78BFA'
  response = '#F472B6'; copy = '#60A5FA'; beast = '#F59E0B'; defuse = '#22C55E'
}

function Get-HexColor([string]$hex, [int]$alpha = 255) {
  $h = $hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb($alpha,
    [Convert]::ToInt32($h.Substring(0, 2), 16),
    [Convert]::ToInt32($h.Substring(2, 2), 16),
    [Convert]::ToInt32($h.Substring(4, 2), 16))
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

function New-RoundedPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
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
  $W = 700; $H = 980
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

    $hex = $accent[$card.category]
    if (-not $hex) { $hex = '#64748B' }
    $c = Get-HexColor $hex
    $white = [System.Drawing.Brushes]::White
    $fmt = New-Object System.Drawing.StringFormat
    [void]$cleanup.Add($fmt)

    $brandFont = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    [void]$cleanup.Add($brandFont)
    $brandBrush = New-Object System.Drawing.SolidBrush($c)
    [void]$cleanup.Add($brandBrush)

    $titleFit = Get-FittedFont $g $card.name 612 130 52 30 ([System.Drawing.FontStyle]::Bold)
    [void]$cleanup.Add($titleFit.Font)
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(190, 0, 0, 0))
    [void]$cleanup.Add($shadow)

    $subFont = New-Object System.Drawing.Font('Segoe UI', 19, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    [void]$cleanup.Add($subFont)
    $sub = $card.subtitle
    $subMeasured = $g.MeasureString($sub, $subFont, [System.Drawing.SizeF]::new(612, 200))
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 255, 209, 102))
    [void]$cleanup.Add($subBrush)

    $titleBottom = 58 + $titleFit.Height
    $textBottom = $titleBottom + 6 + [single]$subMeasured.Height
    $scrimBottom = [int]($textBottom + 14)
    $topH = $scrimBottom + 120

    # Solid scrim behind the header, then a short fade so the art stays visible.
    $scrimBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      [System.Drawing.Rectangle]::new(0, 0, $W, $scrimBottom),
      [System.Drawing.Color]::FromArgb(228, 8, 10, 18),
      [System.Drawing.Color]::FromArgb(205, 8, 10, 18),
      [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    [void]$cleanup.Add($scrimBrush)
    $g.FillRectangle($scrimBrush, [System.Drawing.Rectangle]::new(0, 0, $W, $scrimBottom))
    $topRect = [System.Drawing.Rectangle]::new(0, $scrimBottom - 1, $W, $topH - $scrimBottom + 1)
    $topBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($topRect,
      [System.Drawing.Color]::FromArgb(205, 8, 10, 18),
      [System.Drawing.Color]::FromArgb(0, 8, 10, 18),
      [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    [void]$cleanup.Add($topBrush)
    $g.FillRectangle($topBrush, $topRect)

    $g.DrawString($brand, $brandFont, $brandBrush, 44, 34)
    $g.DrawString($card.name, $titleFit.Font, $shadow, [System.Drawing.RectangleF]::new(46, 60, 612, 140), $fmt)
    $g.DrawString($card.name, $titleFit.Font, $white, [System.Drawing.RectangleF]::new(44, 58, 612, 140), $fmt)
    $g.DrawString($sub, $subFont, $shadow, [System.Drawing.RectangleF]::new(46, $titleBottom + 8, 612, 100), $fmt)
    $g.DrawString($sub, $subFont, $subBrush, [System.Drawing.RectangleF]::new(44, $titleBottom + 6, 612, 100), $fmt)

    $panelTop = 560
    $fade = [System.Drawing.Rectangle]::new(0, $panelTop, $W, 120)
    $fadeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($fade,
      [System.Drawing.Color]::FromArgb(0, 8, 10, 18),
      [System.Drawing.Color]::FromArgb(238, 8, 10, 18),
      [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
    [void]$cleanup.Add($fadeBrush)
    $g.FillRectangle($fadeBrush, $fade)
    $solid = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(238, 8, 10, 18))
    [void]$cleanup.Add($solid)
    $g.FillRectangle($solid, [System.Drawing.Rectangle]::new(0, $panelTop + 120, $W, $H - $panelTop - 120))

    $effectFit = Get-FittedFont $g $card.effect 612 215 30 16 ([System.Drawing.FontStyle]::Regular)
    [void]$cleanup.Add($effectFit.Font)
    $g.DrawString($card.effect, $effectFit.Font, $white, [System.Drawing.RectangleF]::new(44, 670, 612, 240), $fmt)

    # Category pill bottom-left.
    $pillFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    [void]$cleanup.Add($pillFont)
    $label = $card.category.ToUpperInvariant()
    $labelW = [single]$g.MeasureString($label, $pillFont).Width
    $pillPath = New-RoundedPath 44 908 ($labelW + 32) 38 10
    [void]$cleanup.Add($pillPath)
    $pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, $c.R, $c.G, $c.B))
    [void]$cleanup.Add($pillBrush)
    $g.FillPath($pillBrush, $pillPath)
    $g.DrawString($label, $pillFont, $white, 60, 917)

    $idFont = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    [void]$cleanup.Add($idFont)
    $idBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(165, 203, 213, 225))
    [void]$cleanup.Add($idBrush)
    $idLabel = $card.id + '  -  ' + $brand
    $idW = [single]$g.MeasureString($idLabel, $idFont).Width
    $g.DrawString($idLabel, $idFont, $idBrush, $W - 44 - $idW, 917)

    $framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55, 255, 255, 255), 2)
    [void]$cleanup.Add($framePen)
    $g.DrawRectangle($framePen, 1, 1, $W - 2, $H - 2)

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
      Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
      [System.Drawing.Imaging.Encoder]::Quality, [long]86)
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
