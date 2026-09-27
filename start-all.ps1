# ReachInbox Full-Stack Email Job Scheduler - Unified Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " ReachInbox Email Job Scheduler - Production Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Start Redis
Write-Host "[1/3] Starting Redis Server on port 6379..." -ForegroundColor Yellow
Start-Process -FilePath "$root\redis-bin\redis-server.exe" -ArgumentList "--bind 127.0.0.1 --port 6379" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Start Backend
Write-Host "[2/3] Starting Backend API & BullMQ Worker on port 5000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\backend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

# 3. Start Frontend
Write-Host "[3/3] Starting Frontend Dashboard on port 3000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$root\frontend`" && npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 2

# Open browser
Start-Process "http://localhost:3000"

Write-Host "========================================================" -ForegroundColor Green
Write-Host " All services started successfully in separate windows!" -ForegroundColor Green
Write-Host " - Frontend Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host " - BullMQ Queue Monitor: http://localhost:5000/admin/queues" -ForegroundColor White
Write-Host " - API Health Check: http://localhost:5000/api/health" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
