# EquiMind Docker Deployment Script for PowerShell
# This script builds and deploys both backend and frontend services securely

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EquiMind Docker Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "[✓] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[✗] ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/6] Checking secrets..." -ForegroundColor Yellow
if (-not (Test-Path "secrets\supabase_url.txt")) {
    Write-Host "[✗] ERROR: secrets\supabase_url.txt not found" -ForegroundColor Red
    Write-Host "Please create the secrets directory with required files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "secrets\supabase_key.txt")) {
    Write-Host "[✗] ERROR: secrets\supabase_key.txt not found" -ForegroundColor Red
    Write-Host "Please create the secrets directory with required files" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[✓] Secrets found" -ForegroundColor Green

Write-Host "[2/6] Stopping existing containers..." -ForegroundColor Yellow
docker-compose down --remove-orphans

Write-Host "[3/6] Building backend image..." -ForegroundColor Yellow
docker-compose build backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] ERROR: Backend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[✓] Backend image built successfully" -ForegroundColor Green

Write-Host "[4/6] Building frontend image..." -ForegroundColor Yellow
docker-compose build frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] ERROR: Frontend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[✓] Frontend image built successfully" -ForegroundColor Green

Write-Host "[5/6] Starting services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[✗] ERROR: Failed to start services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[6/6] Checking service health..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "Backend Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Use 'docker-compose logs -f' to view logs" -ForegroundColor Gray
Write-Host "Use 'docker-compose down' to stop services" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

Read-Host "Press Enter to exit"