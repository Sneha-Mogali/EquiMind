@echo off
REM EquiMind Docker Deployment Script for Windows
REM This script builds and deploys both backend and frontend services securely

echo ========================================
echo EquiMind Docker Deployment
echo ========================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/6] Checking secrets...
if not exist "secrets\supabase_url.txt" (
    echo ERROR: secrets\supabase_url.txt not found
    echo Please create the secrets directory with required files
    pause
    exit /b 1
)

if not exist "secrets\supabase_key.txt" (
    echo ERROR: secrets\supabase_key.txt not found
    echo Please create the secrets directory with required files
    pause
    exit /b 1
)

echo [2/6] Stopping existing containers...
docker-compose down --remove-orphans

echo [3/6] Building backend image...
docker-compose build backend
if %errorlevel% neq 0 (
    echo ERROR: Backend build failed
    pause
    exit /b 1
)

echo [4/6] Building frontend image...
docker-compose build frontend
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

echo [5/6] Starting services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)

echo [6/6] Checking service health...
timeout /t 10 /nobreak >nul

docker-compose ps

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo Backend Docs: http://localhost:8000/docs
echo.
echo Use 'docker-compose logs -f' to view logs
echo Use 'docker-compose down' to stop services
echo ========================================

pause