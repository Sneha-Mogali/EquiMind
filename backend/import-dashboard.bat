@echo off
echo ============================================================
echo EquiMind Grafana Dashboard Import
echo ============================================================
echo.

cd /d "%~dp0"

if not exist "..\venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please run from the project root or ensure venv exists.
    pause
    exit /b 1
)

echo Importing dashboard to Grafana...
echo.

..\venv\Scripts\python.exe import-grafana-dashboard.py

echo.
pause
