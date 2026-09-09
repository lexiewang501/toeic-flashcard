[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "TOEIC Master - GitHub 快速發佈工具"

Clear-Host
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       TOEIC Master PWA - GitHub 一鍵部署與發佈工具" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "【發佈前準備】" -ForegroundColor Yellow
Write-Host "1. 請先在 GitHub (https://github.com/new) 建立一個新的 Repository。"
Write-Host "2. 建議名稱取為 toeic-flashcard，設為 Public，且不要勾選新增 README。"
Write-Host ""

# 檢查目前遠端倉庫
$currentRemote = ""
try {
    $currentRemote = (git remote get-url origin 2>$null).Trim()
} catch {}

if ($currentRemote) {
    Write-Host "目前已設定的 GitHub 網址: $currentRemote" -ForegroundColor Gray
    Write-Host "若要使用此網址請直接按 Enter，或輸入新的網址：" -ForegroundColor Yellow
} else {
    Write-Host "請貼上您的 GitHub 倉庫網址 (例如 https://github.com/username/toeic-flashcard.git)：" -ForegroundColor Yellow
}

$repoUrl = Read-Host "GitHub 倉庫網址"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    if ($currentRemote) {
        $repoUrl = $currentRemote
    } else {
        Write-Host ""
        Write-Host "❌ 錯誤：未輸入 GitHub 倉庫網址！" -ForegroundColor Red
        Write-Host "請重新執行本工具並貼上有效的 GitHub 倉庫網址。" -ForegroundColor Red
        exit 1
    }
}

$repoUrl = $repoUrl.Trim()

Write-Host ""
Write-Host "🚀 正在為您準備檔案並推送到 GitHub..." -ForegroundColor Cyan
Write-Host ""

# 1. 暫存所有變更
Write-Host "[1/4] 暫存所有檔案 (git add .)..." -ForegroundColor Gray
git add .

# 2. 提交變更 (若有未提交的內容)
Write-Host "[2/4] 檢查存檔點 (commit)..." -ForegroundColor Gray
$status = git status --porcelain
if ($status) {
    git commit -m "feat: 升級為 PWA 支援離線快取與 iPhone 原生全螢幕"
} else {
    Write-Host "    檔案均已是最新存檔點，無需額外 commit。" -ForegroundColor Gray
}

# 3. 切換至 main 分支
Write-Host "[3/4] 切換為 main 主分支 (git branch -M main)..." -ForegroundColor Gray
git branch -M main

# 4. 設定遠端並推送
Write-Host "[4/4] 正在推送到遠端倉庫: $repoUrl" -ForegroundColor Gray
if ($currentRemote) {
    git remote set-url origin $repoUrl
} else {
    git remote add origin $repoUrl
}

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  🎉 太棒了！專案已成功推送到 GitHub！" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "【最後兩步：開啟免費公開網址】" -ForegroundColor Yellow
    Write-Host "1. 請至您的 GitHub 倉庫頁面，點擊右上角的 [Settings] (設定)。"
    Write-Host "2. 點擊左邊側邊欄的 [Pages] 選項。"
    Write-Host "3. 在 Branch 選擇 [main]，資料夾保持 [/ (root)]，按下 [Save] 儲存。"
    Write-Host "4. 等待 1~2 分鐘，頁面頂部會出現專屬網址："
    Write-Host "   👉 https://<你的GitHub帳號>.github.io/<倉庫名稱>/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "完成後即可用手機 Safari 開啟該網址並「加入主畫面」！" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "  ⚠️ 推送時遇到問題，請參考以下排查：" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "1. 若彈出 GitHub 登入視窗，請點選 [Sign in with your browser] 完成授權。"
    Write-Host "2. 請確認倉庫網址無誤，且您在該倉庫擁有寫入權限。"
    Write-Host "3. 若在 GitHub 建立倉庫時勾選了 README，可能需要先執行 git pull origin main --rebase。"
}
