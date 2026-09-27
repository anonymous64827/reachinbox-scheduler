@echo off
echo ========================================================
echo  ReachInbox Email Job Scheduler - Production Launcher
echo ========================================================

:: 1. Start Redis
echo [1/3] Starting Redis Server on port 6379...
start "ReachInbox-Redis" "%~dp0redis-bin\redis-server.exe" --bind 127.0.0.1 --port 6379

:: Wait 2 seconds for Redis to be ready
timeout /t 2 /nobreak >nul

:: 2. Start Backend
echo [2/3] Starting Backend API & BullMQ Worker on port 5000...
cd /d "%~dp0backend"
start "ReachInbox-Backend" cmd /k "npm run dev"

:: Wait 3 seconds for Backend
timeout /t 3 /nobreak >nul

:: 3. Start Frontend
echo [3/3] Starting Frontend Dashboard on port 3000...
cd /d "%~dp0frontend"
start "ReachInbox-Frontend" cmd /k "npm run dev"

:: Open browser
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo ========================================================
echo  All services started successfully!
echo  - Frontend Dashboard: http://localhost:3000
echo  - BullMQ Queue Monitor: http://localhost:5000/admin/queues
echo  - API Health: http://localhost:5000/api/health
echo ========================================================
pause
