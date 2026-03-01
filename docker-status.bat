@echo off
REM EquiMind Docker Status Checker
REM This script shows the status of all Docker services

echo ========================================
echo EquiMind Docker Status
echo ========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [✗] Docker is not running
    echo Please start Docker Desktop first
    pause
    exit /b 1
)

echo [✓] Docker is running
echo.

echo Container Status:
echo ==================
docker-compose ps

echo.
echo Resource Usage:
echo ===============
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo.
echo Network Information:
echo ===================
docker network ls | findstr equimind

echo.
echo Volume Information:
echo ==================
docker volume ls | findstr equimind

echo.
echo Health Status:
echo ==============
for /f "tokens=1" %%i in ('docker-compose ps -q') do (
    for /f "tokens=1,2" %%a in ('docker inspect --format="{{.Name}} {{.State.Health.Status}}" %%i') do (
        echo %%a: %%b
    )
)

echo.
echo ========================================
echo Status Check Complete
echo ========================================

pause