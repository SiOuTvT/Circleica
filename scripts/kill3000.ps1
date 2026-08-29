$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$pids = $conns.OwningProcess | Sort-Object -Unique
if ($pids) {
  foreach ($id in $pids) {
    try { Stop-Process -Id $id -Force; Write-Output "killed $id" } catch { Write-Output "fail $id $_" }
  }
} else {
  Write-Output "none listening on 3000"
}
