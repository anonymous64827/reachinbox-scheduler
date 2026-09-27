@echo off
echo ========================================================
echo  ReachInbox Email Job Scheduler - Production Launcher
echo ========================================================

:: 1. Start Redis
echo [1/3] Starting Redis Server on port 6379...
start "ReachInbox-Redis" "%~dp0redis-bin\redis-server.exe" --bind 127.0.0.1 --port 6379

:: Delay 2 seconds using ping
ping 127.0.0.1 -n 3 >nul

:: 2. Start Backend
echo [2/3] Starting Backend API and BullMQ Worker on port 5000...
cd /d "%~dp0backend"
start "ReachInbox-Backend" cmd /k "npm run dev"

:: Delay 3 seconds using ping
ping 127.0.0.1 -n 4 >nul

:: 3. Start Frontend
echo [3/3] Starting Frontend Dashboard on port 3000...
cd /d "%~dp0frontend"
start "ReachInbox-Frontend" cmd /k "npm run dev"

:: Delay 2 seconds using ping
ping 127.0.0.1 -n 3 >nul
start http://localhost:3000

echo ========================================================
echo  All services started successfully!
echo  - Frontend Dashboard: http://localhost:3000
echo  - BullMQ Queue Monitor: http://localhost:5000/admin/queues
echo  - API Health: http://localhost:5000/api/health
echo ========================================================
