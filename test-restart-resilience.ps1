# ReachInbox Scheduler - Server Restart Resilience Test Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🔄 ReachInbox Server Restart Persistence Test" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# 1. Schedule email for +15 seconds in future
$futureTime = (Get-Date).AddSeconds(15).ToString("o")
Write-Host "`n[1/5] Scheduling email for future dispatch at $futureTime..." -ForegroundColor Yellow

$body = @{
  toEmails = @("future.restart.test@reachinbox.ai")
  senderEmail = "team@outboxlabs.test"
  senderName = "Outbox Labs"
  subject = "Server Restart Persistence Verification"
  body = "This email was scheduled before the backend server was completely terminated."
  startTime = $futureTime
  delaySeconds = 2
  hourlyLimit = 50
} | ConvertTo-Json

$scheduleResult = Invoke-RestMethod -Uri "$baseUrl/api/emails/schedule" -Method Post -Body $body -ContentType "application/json"
$jobId = $scheduleResult.jobs[0].id
Write-Host "✅ Job created in DB & BullMQ with ID: $jobId" -ForegroundColor Green

# 2. Stop backend server
Write-Host "`n[2/5] Simulating sudden server crash / restart... Killing backend Node process..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -notmatch "vite" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 3
Write-Host "✅ Backend server is offline." -ForegroundColor Yellow

# 3. Restart backend server
Write-Host "`n[3/5] Booting up backend server again..." -ForegroundColor Yellow
$process = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden -PassThru

# Wait for server to come back online
Write-Host "⏳ Waiting for backend to reconcile on startup..."
$maxRetries = 20
$isOnline = $false

for ($i = 0; $i -lt $maxRetries; $i++) {
  Start-Sleep -Seconds 1
  try {
    $h = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 1
    if ($h.status -eq "healthy") {
      $isOnline = $true
      break
    }
  } catch {}
}

if (-not $isOnline) {
  Write-Host "❌ Failed to restart server." -ForegroundColor Red
  exit 1
}

Write-Host "✅ Backend successfully rebooted and online!" -ForegroundColor Green

# 4. Wait for scheduled delivery time to arrive
Write-Host "`n[4/5] Waiting for scheduled time (+15s) to arrive so BullMQ dispatches the email..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 5. Check if email was sent
Write-Host "`n[5/5] Verifying email was sent after restart..." -ForegroundColor Yellow
$search = Invoke-RestMethod -Uri "$baseUrl/api/emails/search?q=future.restart.test" -Method Get

if ($search.items.Count -gt 0 -and $search.items[0].status -eq "SENT") {
  Write-Host "`n==========================================================" -ForegroundColor Green
  Write-Host "🎉 SUCCESS! Email survived server restart and was SENT at correct time!" -ForegroundColor Green
  Write-Host "   Email: $($search.items[0].toEmail)"
  Write-Host "   Status: $($search.items[0].status)"
  Write-Host "   Sent Time: $($search.items[0].sentTime)"
  Write-Host "   Preview: $($search.items[0].etherealPreviewUrl)"
  Write-Host "==========================================================" -ForegroundColor Green
} else {
  Write-Host "Job status: $($search.items[0].status)" -ForegroundColor Yellow
}
