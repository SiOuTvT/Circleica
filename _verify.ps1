$urls = @(
  'http://127.0.0.1:3000/',
  'http://127.0.0.1:3000/discover',
  'http://127.0.0.1:3000/galvelica',
  'http://127.0.0.1:3000/about',
  'http://127.0.0.1:3000/api/auth/session',
  'http://127.0.0.1:3000/api/user/stats'
)
foreach ($u in $urls) {
  $t = Measure-Command {
    try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30; Write-Output ("  " + $r.StatusCode + " " + $u) }
    catch { Write-Output ("  ERR " + $u + " : " + $_.Exception.Message) }
  }
  Write-Output ("  elapsed=" + $t.TotalSeconds.ToString('F2') + 's ' + $u)
}
Write-Output "VERIFY DONE"
