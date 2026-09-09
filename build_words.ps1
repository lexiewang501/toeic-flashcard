# Merge all 4 batches into words.json and validate
$batches = @(
    "data\batch1.json",
    "data\batch2.json",
    "data\batch3.json",
    "data\batch4.json"
)

$allWords = @()

foreach ($batch in $batches) {
    $fullPath = Join-Path $PSScriptRoot $batch
    if (-not (Test-Path $fullPath)) {
        Write-Error "Batch file not found: $fullPath"
        exit 1
    }
    $content = Get-Content $fullPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $allWords += $content
}

Write-Host "Total words loaded: $($allWords.Count)" -ForegroundColor Cyan

# Validate total count
if ($allWords.Count -ne 200) {
    Write-Error "Expected exactly 200 words, but got $($allWords.Count)"
    exit 1
}

# Verify required keys for every item
$requiredKeys = @("id", "word", "phonetic", "partOfSpeech", "meaning", "example")
for ($i = 0; $i -lt $allWords.Count; $i++) {
    $item = $allWords[$i]
    foreach ($key in $requiredKeys) {
        if (-not ($item.PSObject.Properties.Name -contains $key) -or [string]::IsNullOrWhiteSpace($item.$key)) {
            Write-Error "Missing or empty required field '$key' in word ID $($item.id)"
            exit 1
        }
    }
}

# Output to words.json with UTF-8
$targetFile = Join-Path $PSScriptRoot "words.json"
$jsonOutput = $allWords | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($targetFile, $jsonOutput, [System.Text.Encoding]::UTF8)

# Output to words-data.js for CORS-free local execution
$targetJsFile = Join-Path $PSScriptRoot "words-data.js"
$jsContent = "window.TOEIC_WORDS = " + $jsonOutput + ";"
[System.IO.File]::WriteAllText($targetJsFile, $jsContent, [System.Text.Encoding]::UTF8)

Write-Host "Successfully generated words.json and words-data.js with 200 TOEIC 800-900 words!" -ForegroundColor Green
Write-Host "words.json size: $((Get-Item $targetFile).Length) bytes" -ForegroundColor Yellow
Write-Host "words-data.js size: $((Get-Item $targetJsFile).Length) bytes" -ForegroundColor Yellow
