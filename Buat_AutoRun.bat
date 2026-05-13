@echo off
title Setup Auto-Run MailTrack Bridge
cd /d "%~dp0"

echo ========================================================
echo   MENGATUR SUPAYA BRIDGE JALAN OTOMATIS SAAT KOMPUTER NYALA
echo ========================================================
echo.

set "VBS_TARGET=%~dp0start_hidden.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\MailTrack_Bridge.vbs"

:: Copy the VBS to the startup folder directly
copy "%VBS_TARGET%" "%SHORTCUT_PATH%" /Y

echo Berhasil membuat sistem auto-run di latar belakang!
echo Jembatan (Bridge) akan otomatis menyala di System Tray (Pojok Kanan Bawah)
echo setiap kali komputer Anda dinyalakan.
echo.
echo Mencoba menyalakan Bridge sekarang...
cd /d "%~dp0"
start "" "%SHORTCUT_PATH%"

echo Selesai! Silahkan cek pojok kanan bawah desktop Anda.
pause
