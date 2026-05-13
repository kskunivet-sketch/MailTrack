@echo off
title Force Sync Data to Firebase dan Google Drive
cd /d "%~dp0"

echo ==========================================
echo    MENJALANKAN FORCE SYNC SEMUA DATA
echo ==========================================
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" force_sync.py
) else (
    python force_sync.py
)

echo.
echo ==========================================
echo    SELESAI
echo ==========================================
pause
