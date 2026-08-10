$targets = @(
  "http://localhost:3000/login",
  "http://localhost:3000/discover",
  "http://localhost:3000/collections",
  "http://localhost:3000/rules",
  "http://localhost:3000/creators",
  "http://localhost:3000/tags",
  "http://localhost:3000/contact",
  "http://localhost:3000/credits"
)
foreach ($t in $targets) {
  try {
    $r = Invoke-WebRequest -Uri $t -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    $cc = $r.Headers["Cache-Control"]
    $csp = if ($r.Headers["Content-Security-Policy"]) { "CSP:yes" } else { "CSP:no" }
    Write-Output ("GET $t -> STATUS $($r.StatusCode) | Cache-Control: $cc | $csp")
  } catch {
    $ex = $_.Exception
    if ($ex.Response) {
      Write-Output ("GET $t -> HTTP $($ex.Response.StatusCode) : $($ex.Message)")
    } else {
      Write-Output ("GET $t -> CONNERR : $($ex.Message)")
    }
  }
}
# 模拟带登录 cookie 访问首页，看是否异常
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop -Headers @{ "Cookie" = "circleica-session-token=dummy" }
  Write-Output ("GET / (with cookie) -> STATUS $($r.StatusCode) | Cache-Control: $($r.Headers['Cache-Control'])")
} catch {
  $ex = $_.Exception
  Write-Output ("GET / (with cookie) -> HTTP $($ex.Response.StatusCode) : $($ex.Message)")
}
