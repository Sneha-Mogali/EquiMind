Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EquiMind Zero Trust Risk Engine" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Please run setup first." -ForegroundColor Red
    Write-Host "You can create it by running: python -m venv venv" -ForegroundColor Yellow
    Write-Host "Then install requirements: venv\Scripts\pip install -r backend\requirements.txt" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/4] Starting Monitoring Stack..." -ForegroundColor Yellow
Write-Host "Starting Prometheus and Grafana..." -ForegroundColor Gray
Set-Location backend
try {
    docker-compose -f docker-compose.monitoring.yml up -d 2>$null
    Write-Host "Monitoring stack started successfully!" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not start monitoring stack. Docker may not be running." -ForegroundColor Yellow
}
Set-Location ..
Start-Sleep -Seconds 2

Write-Host "[3/4] Starting Backend with Virtual Environment..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& venv\Scripts\Activate.ps1; Set-Location backend; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
Start-Sleep -Seconds 3

Write-Host "[4/4] Starting Frontend..." -ForegroundColor Yellow
Set-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  EquiMind is starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:     http://localhost:8000" -ForegroundColor White
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor White
Write-Host "API Docs:    http://localhost:8000/docs" -ForegroundColor White
Write-Host "Prometheus:  http://localhost:9090" -ForegroundColor White
Write-Host "Grafana:     http://localhost:3001 (admin/admin)" -ForegroundColor White
Write-Host "Metrics:     http://localhost:8000/metrics" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
