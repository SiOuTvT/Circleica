$html = (Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 20).Content
$urls = [regex]::Matches($html, '/_next/static/[^"]+') | ForEach-Object { $_.Value } | Sort-Object -Unique
Write-Output ("FOUND " + $urls.Count + " static assets referenced by homepage")
$ok = 0; $bad = 0
foreach ($u in $urls) {
  $code = curl.exe -s -o $null -w "%{http_code}" --max-time 20 "http://localhost:3000$u"
  if ($code -eq "200") { $ok++ } else { $bad++; Write-Output ("BAD($code) $u") }
}
Write-Output ("SUMMARY ok=$ok bad=$bad")
# 单独确认根 HTML 与 layout/page chunk 大小
$r = curl.exe -s -o $null -w "root_http=%{http_code} size=%{size_download}" --max-time 20 "http://localhost:3000/"
Write-Output $r
