# PowerShell script to start the backend
Write-Host "Starting EquiMind Backend..." -ForegroundColor Green

if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Please run setup-venv.ps1 first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

Write-Host "Starting FastAPI server with uvicorn..." -ForegroundColor Yellow
uvicorn main:app --host 0.0.0.0 --port 8000 --reload