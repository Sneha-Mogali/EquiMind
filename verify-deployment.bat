@echo off
REM EquiMind Deployment Verification Script
REM This script verifies that the deployment is working correctly

echo ========================================
echo EquiMind Deployment Verification
echo ========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [✗] Docker is not running
    pause
    exit /b 1
)

echo [✓] Docker is running

REM Check if containers are running
echo.
echo Checking container status...
docker-compose ps

REM Wait for services to be ready
echo.
echo Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Test backend health
echo.
echo Testing backend health...
curl -f http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Backend is healthy
) else (
    echo [✗] Backend health check failed
)

REM Test backend API
echo Testing backend API...
curl -f http://localhost:8000/docs >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Backend API documentation accessible
) else (
    echo [✗] Backend API documentation not accessible
)

REM Test frontend
echo Testing frontend...
curl -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Frontend is accessible
) else (
    echo [✗] Frontend not accessible
)

REM Check resource usage
echo.
echo Resource Usage:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

REM Check logs for errors
echo.
echo Checking for recent errors...
docker-compose logs --tail=10 backend | findstr /i "error\|exception\|failed" >nul
if %errorlevel% equ 0 (
    echo [!] Found errors in backend logs - check with: docker-logs.bat backend
) else (
    echo [✓] No recent errors in backend logs
)

docker-compose logs --tail=10 frontend | findstr /i "error\|exception\|failed" >nul
if %errorlevel% equ 0 (
    echo [!] Found errors in frontend logs - check with: docker-logs.bat frontend
) else (
    echo [✓] No recent errors in frontend logs
)

echo.
echo ========================================
echo Verification Complete!
echo ========================================
echo.
echo Access your services:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - API Docs: http://localhost:8000/docs
echo.
echo For monitoring: docker-status.bat
echo For logs: docker-logs.bat [service]
echo ========================================

pause