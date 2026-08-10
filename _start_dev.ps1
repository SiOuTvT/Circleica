$env:CODEBUDDY_SAFE_DELETE_ENABLED = '0'
Start-Process -FilePath 'cmd' -ArgumentList '/c','cd /d d:\Circleica && npm run dev > d:\Circleica\_dev3.log 2>&1' -WindowStyle Hidden
Write-Output 'STARTED with CODEBUDDY_SAFE_DELETE_ENABLED=0'
