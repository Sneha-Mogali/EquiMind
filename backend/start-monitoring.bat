@echo off
echo ========================================
echo   Starting EquiMind Monitoring Stack
echo ========================================
echo.

echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not running
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo Starting Prometheus and Grafana...
docker-compose -f docker-compose.monitoring.yml up -d

echo.
echo ========================================
echo   Monitoring Stack Started!
echo ========================================
echo.
echo Prometheus: http://localhost:9090
echo Grafana:    http://localhost:3001
echo   Username: admin
echo   Password: admin
echo.
echo Backend Metrics: http://localhost:8000/metrics
echo.
echo To stop: docker-compose -f docker-compose.monitoring.yml down
echo.
pause
