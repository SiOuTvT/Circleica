$max = 25
$up = $false
for ($i = 1; $i -le $max; $i++) {
  try {
    $r = Invoke-WebRequest -Uri http://127.0.0.1:3000/ -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) {
      Write-Output ("UP after " + $i + " tries, STATUS=" + $r.StatusCode)
      Write-Output ("HTML head: " + $r.Content.Substring(0, [Math]::Min(200, $r.Content.Length)))
      $up = $true
      break
    }
  } catch {
    Write-Output ("try " + $i + " not ready: " + $_.Exception.Message)
    Start-Sleep -Seconds 3
  }
}
if (-not $up) { Write-Output "NOT UP AFTER RETRIES" }
