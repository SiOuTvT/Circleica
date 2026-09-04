# Fix Cola by clearing stale lock and restarting
$colaDir = "D:\Program Files\Cola"
$colaData = "$env:APPDATA\Cola"
$colaExe = Join-Path $colaDir "Cola.exe"

Write-Host "=== Fixing Cola Application ==="

# Step 1: Kill all Cola processes
Write-Host ""
Write-Host "1. Terminating all Cola processes..."
$colaProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($colaProcs) {
    foreach ($p in $colaProcs) {
        Write-Host "   Killing PID $($p.Id)..."
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2

    $remaining = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "   Some processes still alive, force killing..."
        foreach ($p in $remaining) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
    Write-Host "   All Cola processes terminated."
} else {
    Write-Host "   No Cola processes found."
}

# Step 2: Delete the lockfile
Write-Host ""
Write-Host "2. Removing stale lockfile..."
$lockfile = Join-Path $colaData "lockfile"
if (Test-Path $lockfile) {
    Remove-Item $lockfile -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $lockfile)) {
        Write-Host "   Lockfile deleted successfully."
    } else {
        Write-Host "   WARNING: Could not delete lockfile (may be locked)."
    }
} else {
    Write-Host "   No lockfile found."
}

# Step 3: Check crash reports
Write-Host ""
Write-Host "3. Checking for crash reports..."
$crashDir = Join-Path $colaData "Crashpad\reports"
if (Test-Path $crashDir) {
    $crashes = Get-ChildItem $crashDir -Filter "*.dmp" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 3
    if ($crashes) {
        Write-Host "   Found crash reports (oldest first):"
        foreach ($c in $crashes) {
            Write-Host "   - $($c.Name) ($($c.LastWriteTime)) ($([math]::Round($c.Length / 1MB, 1)) MB)"
        }
        Write-Host ""
        Write-Host "   Deleting old crash reports..."
        Remove-Item (Join-Path $crashDir "*") -Force -ErrorAction SilentlyContinue
        Write-Host "   Crash reports cleared."
    } else {
        Write-Host "   No crash reports found."
    }
}

# Step 4: Check if User Data dir has a SingletonLock (Electron's instance lock)
Write-Host ""
Write-Host "4. Checking for Electron singleton lock..."
$singletonLocks = @(
    (Join-Path $colaData "SingletonLock"),
    (Join-Path $colaData "SingletonSocket"),
    (Join-Path $colaData "SingletonCookie")
)
foreach ($lock in $singletonLocks) {
    if (Test-Path $lock) {
        Write-Host "   Found: $lock - removing..."
        Remove-Item $lock -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "   Singleton locks cleared."

# Step 5: Restart Cola
Write-Host ""
Write-Host "5. Starting Cola..."
if (Test-Path $colaExe) {
    Start-Process $colaExe -ErrorAction SilentlyContinue
    Write-Host "   Cola launched!"
    Start-Sleep -Seconds 5

    # Verify
    $newProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
    if ($newProcs) {
        Write-Host ""
        Write-Host "   Verifying new processes..."
        foreach ($p in $newProcs) {
            $hwnd = $p.MainWindowHandle
            $title = $p.MainWindowTitle
            Write-Host "   PID $($p.Id): HWND=$hwnd Title='$title' Responding=$($p.Responding)"
        }

        $mainProc = $newProcs | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($mainProc) {
            Write-Host ""
            Write-Host "   SUCCESS! Cola window is visible."
            Write-Host "   Window title: '$($mainProc.MainWindowTitle)'"
        } else {
            Write-Host ""
            Write-Host "   Processes running but window still not visible."
            Write-Host "   Possible causes: GPU driver issue, display scaling, or renderer crash."
            Write-Host ""
            Write-Host "   Try:"
            Write-Host "   - Right-click Cola icon in taskbar > Restore"
            Write-Host "   - Press Alt+Space, then M (move), then arrow keys"
            Write-Host "   - Win+Left/Right arrow to snap window"
        }
    } else {
        Write-Host "   WARNING: Cola process not found after launch!"
    }
} else {
    Write-Host "   ERROR: Cola.exe not found at $colaExe"
}
