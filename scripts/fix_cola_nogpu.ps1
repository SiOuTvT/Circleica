# Kill Cola, then relaunch with --disable-gpu flag
Write-Host "=== Testing Cola with GPU disabled ==="

# Kill existing processes
$colaProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($colaProcs) {
    foreach ($p in $colaProcs) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 3
}

$colaExe = "D:\Program Files\Cola\Cola.exe"

Write-Host ""
Write-Host "Launching Cola with --disable-gpu flag..."
Start-Process $colaExe -ArgumentList "--disable-gpu","--disable-software-rasterizer" -ErrorAction SilentlyContinue
Write-Host "Launched! Waiting 10 seconds..."
Start-Sleep -Seconds 10

$newProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($newProcs) {
    $hasWindow = $false
    foreach ($p in $newProcs) {
        $hwnd = $p.MainWindowHandle
        $title = $p.MainWindowTitle
        Write-Host "   PID $($p.Id): HWND=$hwnd Title='$title'"
        if ($hwnd -ne 0) { $hasWindow = $true }
    }
    Write-Host ""
    if ($hasWindow) {
        Write-Host "   Window appeared! If it's slow/buggy, we'll fix it permanently."
    } else {
        Write-Host "   Still no window. Let me check Windows Error Reporting..."
    }
} else {
    Write-Host "   Cola process not found!"
}
