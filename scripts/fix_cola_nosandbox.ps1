# Try Cola with --no-sandbox and session restore disabled
# This bypasses the corrupted session state

Write-Host "Killing existing Cola processes..."
taskkill /F /IM Cola.exe 2>$null
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Trying Cola with --no-sandbox flag..."
Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--no-sandbox" -ErrorAction SilentlyContinue
Write-Host "Waiting 15 seconds..."
Start-Sleep -Seconds 15

$procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($procs) {
    foreach ($p in $procs) {
        Write-Host "PID $($p.Id): HWND=$($p.MainWindowHandle) Title='$($p.MainWindowTitle)' CPU=$($p.CPU)"
    }
    $hasWin = $procs | Where-Object { $_.MainWindowHandle -ne 0 }
    if ($hasWin) {
        Write-Host "SUCCESS!"
    } else {
        Write-Host "No window yet. Let me check what's in the crash reports..."
        $crashDir = "$env:APPDATA\Cola\Crashpad\reports"
        if (Test-Path $crashDir) {
            $crashes = Get-ChildItem $crashDir -Filter "*.dmp" -ErrorAction SilentlyContinue
            Write-Host "Crash reports: $($crashes.Count)"
            foreach ($c in $crashes) {
                Write-Host "  $($c.Name) ($($c.Length / 1MB) MB) $($c.LastWriteTime)"
            }
        }
    }
} else {
    Write-Host "Cola not running at all!"
}
