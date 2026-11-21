@echo off
echo ========================================================
echo       StreetPaw.AI - Automated System Launcher
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "StreetPaw Backend (Port 8000)" cmd /k "cd backend && python main.py"

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "StreetPaw Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Services are starting in separate windows!
echo - Citizen & NGO App: http://localhost:5173
echo - Backend API Docs:  http://localhost:8000/docs
echo ========================================================
echo.
pause
