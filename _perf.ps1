Write-Output "=== CPU load ==="
try { $p = Get-CimInstance Win32_Processor; Write-Output ("LoadPercent=" + $p.LoadPercentage) } catch { Write-Output "cpu query err" }

Write-Output "=== node procs (top by CPU) ==="
Get-Process node -ErrorAction SilentlyContinue | Sort-Object CPU -Descending | Select-Object -First 15 Id, @{n='CPU(s)';e={[math]::Round($_.CPU,1)}}, @{n='WS(MB)';e={[math]::Round($_.WorkingSet/1MB,0)}}, Threads | Format-Table -AutoSize | Out-String | Write-Output

Write-Output "=== port 3000 listeners ==="
netstat -ano | findstr :3000 | findstr LISTENING

Write-Output "=== home response time (x3) ==="
for ($i = 1; $i -le 3; $i++) {
  $t = Measure-Command { try { $r = Invoke-WebRequest -Uri http://127.0.0.1:3000/ -UseBasicParsing -TimeoutSec 40; Write-Output ("  try $i -> " + $r.StatusCode) } catch { Write-Output ("  try $i ERR: " + $_.Exception.Message) } }
  Write-Output ("  try $i elapsed=" + $t.TotalSeconds.ToString('F2') + 's')
}

Write-Output "=== dev3 log tail ==="
Get-Content d:\Circleica\_dev3.log -Tail 25
