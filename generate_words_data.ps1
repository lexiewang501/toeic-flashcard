$json = [System.IO.File]::ReadAllText((Join-Path $PSScriptRoot "words.json"), [System.Text.Encoding]::UTF8)
$jsContent = "window.TOEIC_WORDS = " + $json + ";"
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot "words-data.js"), $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "words-data.js successfully written! Size: $((Get-Item (Join-Path $PSScriptRoot 'words-data.js')).Length) bytes"
