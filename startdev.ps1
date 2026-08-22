Start-Process -FilePath "cmd.exe" -ArgumentList "/c","cd /d d:\Circleica && npm run dev > d:\Circleica\dev.log 2>&1" -NoNewWindow
Write-Host "started"
Start-Sleep -Seconds 10
Get-Content "d:\Circleica\dev.log" -Tail 25
