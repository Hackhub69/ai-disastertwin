@echo off
TITLE AI DisasterTwin Rescue - Demo Launcher
COLOR 0B

echo ============================================================
echo   AI DisasterTwin Rescue - Multi-Agent Coordinator Demo
echo ============================================================
echo.

cd /d "%~dp0backend"
echo [1/3] Seeding demo database with full operational scenario...
call .\venv\Scripts\python.exe seed.py
if errorlevel 1 (
    echo [WARNING] Seed script encountered a warning, continuing...
)

echo.
echo [2/3] Launching FastAPI Backend Server on port 8000...
start "AI DisasterTwin - Backend Server" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo.
echo [3/3] Launching Vite Frontend Command Center on port 5173...
start "AI DisasterTwin - Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 4 seconds for services to initialize...
timeout /t 4 >nul

echo Opening Command Center in your default web browser...
start http://localhost:5173

echo.
echo ============================================================
echo   DEMO ENVIRONMENT RUNNING!
echo   Frontend Command Center: http://localhost:5173
echo   Backend API & Swagger:   http://localhost:8000/docs
echo ============================================================
echo   Keep this and the opened terminal windows open during your demo.
pause
