@echo off
REM EquiMind Docker Logs Viewer
REM This script provides easy access to container logs

echo ========================================
echo EquiMind Docker Logs
echo ========================================

if "%1"=="" (
    echo Usage: docker-logs.bat [service]
    echo.
    echo Available services:
    echo   backend   - Backend API logs
    echo   frontend  - Frontend Nginx logs
    echo   all       - All services logs
    echo.
    echo Examples:
    echo   docker-logs.bat backend
    echo   docker-logs.bat frontend
    echo   docker-logs.bat all
    echo.
    pause
    exit /b 0
)

if "%1"=="all" (
    echo Showing logs for all services...
    docker-compose logs -f
) else if "%1"=="backend" (
    echo Showing backend logs...
    docker-compose logs -f backend
) else if "%1"=="frontend" (
    echo Showing frontend logs...
    docker-compose logs -f frontend
) else (
    echo Unknown service: %1
    echo Available services: backend, frontend, all
    pause
    exit /b 1
)