@echo off
echo ========================================
echo   EquiMind Zero Trust Risk Engine
echo ========================================
echo.

echo [1/4] Checking virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Please run setup first.
    echo You can create it by running: python -m venv venv
    echo Then install requirements: venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

echo [2/4] Starting Monitoring Stack...
echo Starting Prometheus and Grafana...
cd backend
docker-compose -f docker-compose.monitoring.yml up -d >nul 2>&1
if errorlevel 1 (
    echo Warning: Could not start monitoring stack. Docker may not be running.
) else (
    echo Monitoring stack started successfully!
)
cd ..
timeout /t 2 /nobreak >nul

echo [3/4] Starting Backend with Virtual Environment...
start "EquiMind Backend" cmd /k "call venv\Scripts\activate.bat && cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend...
cd frontend
start "EquiMind Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   EquiMind is starting...
echo ========================================
echo.
echo Backend:     http://localhost:8000
echo Frontend:    http://localhost:5173
echo API Docs:    http://localhost:8000/docs
echo Prometheus:  http://localhost:9090
echo Grafana:     http://localhost:3001 (admin/admin)
echo Metrics:     http://localhost:8000/metrics
echo.
echo Press any key to exit this window...
pause >nul
