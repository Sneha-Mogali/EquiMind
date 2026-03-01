#!/usr/bin/env pwsh
# EquiMind Grafana Dashboard Import Script

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "EquiMind Grafana Dashboard Import" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$venvPython = Join-Path $scriptPath "..\venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please ensure venv exists at: $venvPython" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Importing dashboard to Grafana..." -ForegroundColor Green
Write-Host ""

& $venvPython import-grafana-dashboard.py

Write-Host ""
Read-Host "Press Enter to exit"
