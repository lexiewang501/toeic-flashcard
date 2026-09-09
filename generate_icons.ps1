Add-Type -AssemblyName System.Drawing

$iconsDir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
}

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background gradient: Slate 950 to Slate 850
    $pt1 = New-Object System.Drawing.PointF(0, 0)
    $pt2 = New-Object System.Drawing.PointF($size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $c2 = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($pt1, $pt2, $c1, $c2)
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    $bgBrush.Dispose()

    # Inner Card Background (Flashcard aesthetic)
    $cardMargin = [int]($size * 0.12)
    $cardWidth = $size - (2 * $cardMargin)
    $cardHeight = $size - (2 * $cardMargin)
    $cardRadius = [int]($size * 0.14)

    # Rounded card path
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.RectangleF($cardMargin, $cardMargin, $cardWidth, $cardHeight)
    $dia = $cardRadius * 2
    $path.AddArc($rect.X, $rect.Y, $dia, $dia, 180, 90)
    $path.AddArc(($rect.Right - $dia), $rect.Y, $dia, $dia, 270, 90)
    $path.AddArc(($rect.Right - $dia), ($rect.Bottom - $dia), $dia, $dia, 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $dia), $dia, $dia, 90, 90)
    $path.CloseFigure()

    # Fill inner card with Slate 800
    $cardColor = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
    $cardBrush = New-Object System.Drawing.SolidBrush($cardColor)
    $g.FillPath($cardBrush, $path)
    $cardBrush.Dispose()

    # Golden border around card
    $goldBorderColor = [System.Drawing.Color]::FromArgb(220, 245, 158, 11)
    $goldPen = New-Object System.Drawing.Pen($goldBorderColor, [float]($size * 0.025))
    $g.DrawPath($goldPen, $path)
    $goldPen.Dispose()
    $path.Dispose()

    # Center string format
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    # 1. Header: "TOEIC"
    $fontToeic = New-Object System.Drawing.Font("Arial", [float]($size * 0.11), [System.Drawing.FontStyle]::Bold)
    $toeicBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 203, 213, 225))
    $toeicRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.22), $size, [float]($size * 0.16))
    $g.DrawString("TOEIC", $fontToeic, $toeicBrush, $toeicRect, $sf)
    $fontToeic.Dispose()
    $toeicBrush.Dispose()

    # 2. Score: "900"
    $fontScore = New-Object System.Drawing.Font("Arial", [float]($size * 0.26), [System.Drawing.FontStyle]::Bold)
    $ptG1 = New-Object System.Drawing.PointF(0, [float]($size * 0.36))
    $ptG2 = New-Object System.Drawing.PointF(0, [float]($size * 0.68))
    $goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($ptG1, $ptG2, [System.Drawing.Color]::FromArgb(255, 252, 211, 77), [System.Drawing.Color]::FromArgb(255, 217, 119, 6))
    $scoreRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.38), $size, [float]($size * 0.32))
    $g.DrawString("900", $fontScore, $goldBrush, $scoreRect, $sf)
    $fontScore.Dispose()
    $goldBrush.Dispose()

    # 3. Subtitle: "MASTER"
    $fontSub = New-Object System.Drawing.Font("Arial", [float]($size * 0.08), [System.Drawing.FontStyle]::Bold)
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
    $subRect = New-Object System.Drawing.RectangleF(0, [float]($size * 0.68), $size, [float]($size * 0.12))
    $g.DrawString("MASTER", $fontSub, $subBrush, $subRect, $sf)
    $fontSub.Dispose()
    $subBrush.Dispose()
    $sf.Dispose()

    $g.Dispose()

    $pngFormat = [System.Drawing.Imaging.ImageFormat]::Png
    $bmp.Save($outputPath, $pngFormat)
    $bmp.Dispose()
    Write-Output "Generated: $outputPath"
}

$p192 = Join-Path $iconsDir "icon-192.png"
$p512 = Join-Path $iconsDir "icon-512.png"
$pMask = Join-Path $iconsDir "icon-512-maskable.png"
$pApple = Join-Path $iconsDir "apple-touch-icon.png"

Generate-Icon -size 192 -outputPath $p192
Generate-Icon -size 512 -outputPath $p512
Generate-Icon -size 512 -outputPath $pMask
Generate-Icon -size 180 -outputPath $pApple

Write-Output "All icons generated successfully!"
