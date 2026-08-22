taskkill /F /PID 7984
Start-Sleep -Seconds 2
$rem = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
Write-Host "after taskkill 3000 owners: $rem"
