# TOEIC Master PWA 免費部署與手機安裝完整教學

本指南將引導您將背單字網站免費發佈至網路上，並在 iPhone 上一鍵安裝為無網址列的原生 App。

---

## 方案一：GitHub Pages（推薦，完全免費、永久有效）

因為專案已為您初始化好 Git 儲存庫，使用 GitHub Pages 是最穩定且完全免費的方式。

### 第一步：在 GitHub 建立 Repository
1. 開啟瀏覽器進入 [GitHub New Repository](https://github.com/new)（需登入 GitHub）。
2. **Repository name**：填寫您喜歡的名稱（例如 `toeic-flashcard`）。
3. **設定公開**：選擇 **Public**。
4. **不要勾選** Initialize with README / .gitignore（因為本機專案已經有了）。
5. 點擊綠色的 **Create repository** 按鈕。

---

### 第二步：推送專案到 GitHub
您有兩種簡單方式推送：

#### 方式 A（一鍵腳本）：
- 在本機專案資料夾中，直接雙擊執行 **`push-to-github.bat`**。
- 依提示貼上您剛建立的 GitHub 倉庫網址（例如 `https://github.com/你的帳號/toeic-flashcard.git`），按 Enter 即可自動完成提交與推送！

#### 方式 B（指令方式）：
在專案目錄開啟 PowerShell 終端機，依序輸入：
```bash
git add .
git commit -m "feat: 升級為 PWA 支援離線快取與 iPhone 原生全螢幕"
git branch -M main
git remote add origin https://github.com/你的帳號/toeic-flashcard.git
git push -u origin main
```

---

### 第三步：啟用 GitHub Pages 公開網址
1. 前往您 GitHub 上的 `toeic-flashcard` 倉庫頁面。
2. 點擊頂部的 **Settings** 齒輪圖示。
3. 在左側選單點選 **Pages**（位於 Code and automation 下）。
4. 在 **Build and deployment** 下方的 **Branch**：
   - 將分支選為 **`main`**，資料夾保持 **`/ (root)`**。
   - 點擊 **Save**。
5. 等待約 1~2 分鐘，重新整理頁面，頂部會出現綠色提示：
   > **Your site is live at `https://<你的帳號>.github.io/toeic-flashcard/`**
6. 這個網址就是您的專屬公開 HTTPS 網址！

---

## 方案二：Vercel 部署（超高速度、自動 HTTPS）

如果您習慣使用 Vercel，它提供極速的 CDN 與簡潔的自訂網址：

1. 前往 [Vercel 官網](https://vercel.com/) 並使用 GitHub 登入。
2. 點擊右上角 **Add New...** > **Project**。
3. 在 Import Git Repository 列表中找到剛剛建立的 `toeic-flashcard`，點擊 **Import**。
4. **Framework Preset** 保持為 `Other`，Build Command 與 Output Directory 無需修改。
5. 點擊 **Deploy**。
6. 約 15 秒後即可部署完成，獲得專屬網址（例如 `https://toeic-flashcard.vercel.app`）。

---

## iPhone (iOS) 安裝為原生 App 教學

在取得上述 HTTPS 公開網址後，拿起您的 iPhone：

1. 使用 **Safari 瀏覽器** 開啟您的專屬網址。
2. 點擊螢幕下方正中間的 **「分享」圖示**（一個方框帶向上箭頭 ⎋）。
3. 在彈出的選單中往下滑，點選 **「加入主畫面 (Add to Home Screen)」**。
4. 名稱會自動預設為 **TOEIC Master**，右側會顯示金色證書 900 質感的專屬 App Icon。
5. 點擊右上角 **「新增」**。
6. 此時 iPhone 主畫面上就會出現一個獨立的 **TOEIC Master** 原生 App 圖示！

> [!TIP]
> **離線測試**：
> 點開主畫面上的 TOEIC Master，即使開啟手機「飛航模式（無網路）」，字卡依然可以順暢翻面、發音、切換與記錄學習進度！
