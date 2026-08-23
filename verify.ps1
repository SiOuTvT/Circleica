$r = Invoke-WebRequest -Uri http://127.0.0.1:3000/admin/tags/all -UseBasicParsing
$html = $r.Content
$hasUngrouped = $html -match '未分组'
Write-Host ("包含未分组? " + $hasUngrouped)
$m = [regex]::Match($html, '共\s*([0-9]+)\s*个标签')
if ($m.Success) { Write-Host ("说明文字: 共 " + $m.Groups[1].Value + " 个标签") }
# 抓取各 tab 的计数 badge（tab 标题后紧跟数字）
[regex]::Matches($html, 'tabular-nums">([0-9]+)</span>') | ForEach-Object { $_.Groups[1].Value } | ForEach-Object { "tabCount=" + $_ }
