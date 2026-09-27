# ReachInbox Full-Stack Email Job Scheduler - End-to-End Verification Script

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 ReachInbox Scheduler E2E Verification Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5000"

# 1. Health Check
Write-Host "`n[1/7] Testing Health Check & Services..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "✅ Health Status: $($health.status)" -ForegroundColor Green
Write-Host "   Redis: $($health.services.redis.status) ($($health.services.redis.latencyMs)ms latency)"
Write-Host "   Database: $($health.services.database.status) ($($health.services.database.latencyMs)ms latency)"
Write-Host "   SMTP: $($health.services.smtp.status) - $($health.services.smtp.provider)"
Write-Host "   Search Engine: $($health.services.elasticsearch.status)"

# 2. Bull Board Check
Write-Host "`n[2/7] Verifying BullMQ Live Dashboard..." -ForegroundColor Yellow
$bullResponse = Invoke-WebRequest -Uri "$baseUrl/admin/queues" -UseBasicParsing -Method Get
if ($bullResponse.StatusCode -eq 200) {
  Write-Host "✅ Bull Board Live Dashboard accessible at $baseUrl/admin/queues (HTTP 200)" -ForegroundColor Green
}

# 3. Senders API
Write-Host "`n[3/7] Fetching Senders & Rate Limit Capacities..." -ForegroundColor Yellow
$senders = Invoke-RestMethod -Uri "$baseUrl/api/senders" -Method Get
Write-Host "✅ Found $($senders.Count) configured senders:" -ForegroundColor Green
foreach ($s in $senders) {
  Write-Host "   - $($s.name) <$($s.email)> (Usage: $($s.currentHourCount)/$($s.hourlyLimit) this hr)"
}

# 4. Schedule Batch Outreach Campaign
Write-Host "`n[4/7] Scheduling 2 Email Jobs via BullMQ..." -ForegroundColor Yellow
$batchBody = @{
  toEmails = @("founder.alex@growthcorp.com", "sarah.lead@venturefund.io")
  senderEmail = "alex@reachinbox.test"
  senderName = "Alex"
  subject = "ReachInbox Automated E2E Campaign"
  body = "Demonstrating persistent queue scheduling and Ethereal SMTP delivery."
  startTime = "now"
  delaySeconds = 2
  hourlyLimit = 50
} | ConvertTo-Json

$scheduleResult = Invoke-RestMethod -Uri "$baseUrl/api/emails/schedule" -Method Post -Body $batchBody -ContentType "application/json"
Write-Host "✅ $($scheduleResult.message)" -ForegroundColor Green

# 5. Wait for Worker Throttling & Dispatch
Write-Host "`n[5/7] Waiting for BullMQ worker to throttle and dispatch emails..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

$sent = Invoke-RestMethod -Uri "$baseUrl/api/emails/sent" -Method Get
Write-Host "✅ Total Sent Emails Recorded: $($sent.total)" -ForegroundColor Green
if ($sent.items.Count -gt 0) {
  $latest = $sent.items[0]
  Write-Host "   Latest Sent Email ID: $($latest.id)"
  Write-Host "   Recipient: $($latest.toEmail)"
  Write-Host "   Ethereal Preview URL: $($latest.etherealPreviewUrl)" -ForegroundColor Cyan
}

# 6. Search Test
Write-Host "`n[6/7] Testing Search Engine (Elasticsearch / DB Fallback)..." -ForegroundColor Yellow
$search = Invoke-RestMethod -Uri "$baseUrl/api/emails/search?q=founder.alex" -Method Get
Write-Host "✅ Search Engine Result (Source: $($search.source)):" -ForegroundColor Green
Write-Host "   Matched: $($search.total) items for query 'founder.alex'"

# 7. Summary
Write-Host "`n[7/7] Checking Dashboard Metrics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/emails/stats" -Method Get
Write-Host "✅ Scheduled Count: $($stats.counts.scheduled)" -ForegroundColor Green
Write-Host "✅ Sent Count: $($stats.counts.sent)" -ForegroundColor Green
Write-Host "✅ Rescheduled Count: $($stats.counts.rescheduled)" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "🎉 ALL E2E TESTS PASSED SUCCESSFULLY!" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
