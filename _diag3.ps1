$urls = @("/collections", "/creators", "/tags", "/credits")
foreach ($u in $urls) {
  $out = curl.exe -s -o $null -w "final=%{http_code} redirect_url=%{redirect_url}" -L --max-redirs 10 "http://localhost:3000$u" 2>&1
  Write-Output "$u : $out"
}
# 也跟随首页 + 看 /discover 是否真 200
$home = curl.exe -s -o $null -w "final=%{http_code}" -L "http://localhost:3000/" 2>&1
Write-Output "/ (follow) : $home"
