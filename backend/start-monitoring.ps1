Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting EquiMind Monitoring Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not installed or not running" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Prometheus and Grafana..." -ForegroundColor Yellow
docker-compose -f docker-compose.monitoring.yml up -d

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Monitoring Stack Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "Grafana:    http://localhost:3001" -ForegroundColor White
Write-Host "  Username: admin" -ForegroundColor Gray
Write-Host "  Password: admin" -ForegroundColor Gray
Write-Host ""
Write-Host "Backend Metrics: http://localhost:8000/metrics" -ForegroundColor White
Write-Host ""
Write-Host "To stop: docker-compose -f docker-compose.monitoring.yml down" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"
