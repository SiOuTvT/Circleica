# Clear Cola's Electron cache and restart
$colaData = "$env:APPDATA\Cola"
$colaExe = "D:\Program Files\Cola\Cola.exe"

Write-Host "=== Clearing Cola Electron Cache ==="

# Step 1: Kill all Cola processes
Write-Host ""
Write-Host "1. Terminating Cola processes..."
$colaProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($colaProcs) {
    foreach ($p in $colaProcs) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   Killed PID $($p.Id)"
    }
    Start-Sleep -Seconds 3

    $remaining = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
    if ($remaining) {
        foreach ($p in $remaining) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 2
    }
    Write-Host "   All Cola processes terminated."
} else {
    Write-Host "   No Cola processes found."
}

# Step 2: Delete lockfile and singleton locks
Write-Host ""
Write-Host "2. Removing instance locks..."
$locks = @("lockfile", "SingletonLock", "SingletonSocket", "SingletonCookie")
foreach ($lock in $locks) {
    $path = Join-Path $colaData $lock
    if (Test-Path $path) {
        Remove-Item $path -Force -ErrorAction SilentlyContinue
        Write-Host "   Deleted: $lock"
    }
}

# Step 3: Clear GPU and renderer caches
Write-Host ""
Write-Host "3. Clearing GPU/renderer caches..."
$cacheDirs = @("GPUCache", "DawnGraphiteCache", "DawnWebGPUCache", "Cache", "Code Cache", "Crashpad")
foreach ($dir in $cacheDirs) {
    $path = Join-Path $colaData $dir
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   Cleared: $dir"
    }
}
Write-Host "   Crashpad reports cleared."
$crashPath = Join-Path $colaData "Crashpad\reports"
if (Test-Path $crashPath) {
    Remove-Item "$crashPath\*" -Recurse -Force -ErrorAction SilentlyContinue
}

# Step 4: Delete Sentry queue (crash telemetry)
Write-Host ""
Write-Host "4. Clearing telemetry/crash data..."
$sentryQueue = Join-Path $colaData "sentry\queue"
if (Test-Path $sentryQueue) {
    Remove-Item "$sentryQueue\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Sentry queue cleared."
}

# Step 5: Restart Cola
Write-Host ""
Write-Host "5. Starting Cola..."
Start-Process $colaExe -ErrorAction SilentlyContinue
Write-Host "   Cola launched! Waiting 8 seconds for it to fully initialize..."
Start-Sleep -Seconds 8

# Step 6: Verify
Write-Host ""
Write-Host "=== Verification ==="
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
        Write-Host "   SUCCESS! Cola window is visible."
    } else {
        Write-Host "   Processes running but no window yet."
        Write-Host "   If the window still doesn't appear, try:"
        Write-Host "   - Check if Cola icon appears in the taskbar and click it"
        Write-Host "   - Right-click taskbar > Task Manager > find Cola > right-click > Switch to"
    }
} else {
    Write-Host "   WARNING: Cola process not found after launch!"
    Write-Host "   Check if a crash dialog appeared."
}
