@echo off
cd /d "%~dp0"
title PharmaCast - Auto Push to GitHub

echo ============================================
echo  PharmaCast Auto-Push to GitHub
echo ============================================
echo Watching this folder. Any saved change is
echo automatically committed and pushed to GitHub
echo every 15 seconds.
echo.
echo Keep this window open while you work.
echo Press Ctrl+C to stop watching.
echo ============================================
echo.

:loop
git add -A >nul 2>&1
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Auto-save from PharmaCast dev (%date% %time%)" >nul 2>&1
    git push origin main
    if errorlevel 1 (
        echo [%date% %time%] Push failed - check your GitHub sign-in in GitHub Desktop / Git Credential Manager.
    ) else (
        echo [%date% %time%] Changes pushed to GitHub.
    )
)
timeout /t 15 /nobreak >nul
goto loop
