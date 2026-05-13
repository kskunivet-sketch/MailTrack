@echo off
:: Set Title (visible if console shown, useful for debugging)
title MailTrackerPro_Bridge_Process_V2

cd /d "%~dp0"

:: Activate Env
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else (
    echo Python environment not found.
    exit /b 1
)

:: Run Python bridge directly (no 'start' - keep as child process for watchdog tracking)
pythonw bridge/bridge_tray.py

