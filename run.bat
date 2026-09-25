@echo off
echo ====================================================
echo Starting QuantumGuard AI Learning Companion
echo ====================================================

echo [1/2] Starting Django Backend on http://localhost:8000 ...
start "QuantumGuard Backend (Django)" cmd /k "cd /d "%~dp0Exam Proactor" && if exist ".venv\Scripts\python.exe" (.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000) else (py manage.py runserver 0.0.0.0:8000)"

ping -n 4 127.0.0.1 >nul

echo [2/2] Starting Vite Frontend on http://localhost:3000 ...
start "QuantumGuard Frontend (Vite)" cmd /k "cd /d "%~dp0" && npm run dev:frontend"

ping -n 4 127.0.0.1 >nul

echo Launching browser...
start http://localhost:3000

echo Done! Both servers are launching.
