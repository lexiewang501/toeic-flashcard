@echo off
chcp 65001 >nul
title TOEIC Master - 推送到 GitHub 部署腳本

echo ========================================================
echo    TOEIC Master PWA - GitHub 快速發佈與部署工具
echo ========================================================
echo.
echo 請先確認您已在 GitHub (https://github.com/new) 建立了新的 Repository。
echo.
set /p REPO_URL="請貼上您的 GitHub 倉庫網址 (例如 https://github.com/username/toeic-flashcard.git): "

if "%REPO_URL%"=="" (
    echo [錯誤] 倉庫網址不得為空！
    pause
    exit /b
)

echo.
echo [1/4] 檢查並暫存所有檔案...
git add .

echo.
echo [2/4] 建立 PWA 升級存檔 (Commit)...
git commit -m "feat: 升級為 PWA 支援離線快取與 iPhone 原生全螢幕"

echo.
echo [3/4] 切換為 main 主分支...
git branch -M main

echo.
echo [4/4] 設定遠端倉庫並推送...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo  [成功] 程式碼已成功推送到 GitHub！
    echo ========================================================
    echo.
    echo 接下來只要兩步即可開啟免費公開網址：
    echo 1. 前往您 GitHub 倉庫的 [Settings] 頁籤
    echo 2. 點擊左側選單的 [Pages]，將 Branch 設定為 [main] 並儲存
    echo 3. 等待 1 分鐘即可取得專屬公開網址！
) else (
    echo [提示] 推送若遇到權限問題，請確認您已登入 GitHub 帳號或設定 Personal Access Token。
)

echo.
pause
