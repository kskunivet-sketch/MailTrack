@echo off
setlocal

:: --- CONFIGURATION ---
set "TASK_NAME=MailTrackerPro_Bridge_Tray"
set "PYTHON_EXE=%~dp0.venv\Scripts\pythonw.exe"
set "SCRIPT_PATH=%~dp0bridge\bridge_tray.py"
set "START_IN=%~dp0"

:: Check if script exists
if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Script not found: %SCRIPT_PATH%
    pause
    exit /b 1
)

:: Verify python exists in venv
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment Python not found. Please setup the environment first.
    pause
    exit /b 1
)

echo ===================================================
echo   REGISTERING TASK SCHEDULER: %TASK_NAME%
echo ===================================================
echo.
echo Script Path: %SCRIPT_PATH%
echo Target: Virtual Environment Python (%PYTHON_EXE%)
echo Working Directory: %START_IN%
echo.

:: Create the Task
:: /SC ONLOGON - Run at user logon
:: /TR - The command to run.
:: /F - Force overwrite if exists

schtasks /Create /F /SC ONLOGON /TN "%TASK_NAME%" /TR "\"%PYTHON_EXE%\" \"%SCRIPT_PATH%\"" /V1
:: Trying to set delayed start or start-in folder usually requires XML or PS, but a simple Logon works for pythonw.

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Task registered successfully!
    echo The bridge will now start automatically when you log in.
    echo.
    echo Attempting to start the task now...
    schtasks /Run /TN "%TASK_NAME%"
) else (
    echo.
    echo [ERROR] Failed to register task. Ensure you run this as Administrator.
)

pause
