# AI DisasterTwin Rescue - PowerShell Demo Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AI DisasterTwin Rescue - Multi-Agent Coordinator Demo" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/3] Seeding demo database with full operational scenario..." -ForegroundColor Yellow
Set-Location "$root\backend"
& ".\venv\Scripts\python.exe" seed.py

Write-Host ""
Write-Host "[2/3] Launching FastAPI Backend Server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

Write-Host ""
Write-Host "[3/3] Launching Vite Frontend Command Center on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "Waiting 4 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host "Opening Command Center in your default web browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DEMO ENVIRONMENT RUNNING!" -ForegroundColor Green
Write-Host "  Frontend Command Center: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API & Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
