$urls = @(
  'http://127.0.0.1:3000/',
  'http://127.0.0.1:3000/discover',
  'http://127.0.0.1:3000/galvelica',
  'http://127.0.0.1:3000/collections',
  'http://127.0.0.1:3000/creators',
  'http://127.0.0.1:3000/about',
  'http://127.0.0.1:3000/login',
  'http://127.0.0.1:3000/contact',
  'http://127.0.0.1:3000/rules',
  'http://127.0.0.1:3000/tags',
  'http://127.0.0.1:3000/credits',
  'http://127.0.0.1:3000/api/auth/session',
  'http://127.0.0.1:3000/api/user/stats',
  'http://127.0.0.1:3000/api/notifications/unread-count',
  'http://127.0.0.1:3000/api/messages/unread-count',
  'http://127.0.0.1:3000/api/checkin'
)
foreach ($u in $urls) {
  $t = Measure-Command {
    try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 45; Write-Output ("  " + $r.StatusCode + " " + $u) }
    catch { Write-Output ("  ERR " + $u + " : " + $_.Exception.Message) }
  }
  Write-Output ("  elapsed=" + $t.TotalSeconds.ToString('F1') + 's ' + $u)
}
Write-Output "WARMUP DONE"
