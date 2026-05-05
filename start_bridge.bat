@echo off
title MailTracker Pro - Bridge Process
cd /d "%~dp0"

:: -------------------------------------------------------------
::  MAILTRACKER PRO BRIDGE LAUNCHER
:: -------------------------------------------------------------

echo Starting MailTrackerPro Python Bridge in the background...
echo You can safely close this window.
echo The application is running in your System Tray (Envelope Icon).
echo.

if exist ".venv\Scripts\pythonw.exe" (
    start "" /B ".venv\Scripts\pythonw.exe" bridge\bridge_tray.py
) else (
    start "" /B py -3.13 -w bridge\bridge_tray.py
)

timeout /t 3 >nul
exit
