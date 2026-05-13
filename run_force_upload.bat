@echo off
title Force Upload JSON to Google Drive
cd /d "%~dp0"

echo ==========================================
echo    MENJALANKAN FORCE UPLOAD JSON
echo ==========================================
echo.

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" force_upload.py
) else (
    python force_upload.py
)

echo.
echo ==========================================
echo    SELESAI
echo ==========================================
pause
