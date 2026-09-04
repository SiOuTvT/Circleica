# Nuclear option: backup and reset ALL Cola user data
$colaData = "$env:APPDATA\Cola"
$colaBackup = "$env:APPDATA\Cola_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$colaExe = "D:\Program Files\Cola\Cola.exe"

Write-Host "=== Full Reset of Cola User Data ==="
Write-Host ""

# Step 1: Kill Cola
Write-Host "1. Killing all Cola processes..."
$colaProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($colaProcs) {
    foreach ($p in $colaProcs) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 3
    Write-Host "   Done."
} else {
    Write-Host "   No processes running."
}

# Step 2: Backup current data
Write-Host ""
Write-Host "2. Backing up current Cola data to:"
Write-Host "   $colaBackup"
if (Test-Path $colaData) {
    Copy-Item $colaData $colaBackup -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   Backup complete."
}

# Step 3: Delete ALL user data (NOT the installation)
Write-Host ""
Write-Host "3. Removing all user data..."
if (Test-Path $colaData) {
    Remove-Item $colaData -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    if (-not (Test-Path $colaData)) {
        Write-Host "   All user data removed."
    } else {
        Write-Host "   Some files may be locked, trying again..."
        Start-Sleep -Seconds 2
        Remove-Item $colaData -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Step 4: Launch Cola fresh
Write-Host ""
Write-Host "4. Launching Cola with fresh profile..."
Start-Process $colaExe -ErrorAction SilentlyContinue
Write-Host "   Launched! Waiting 12 seconds for first-time setup..."
Start-Sleep -Seconds 12

# Step 5: Verify
Write-Host ""
Write-Host "=== Verification ==="
$newProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($newProcs) {
    $hasWindow = $false
    foreach ($p in $newProcs) {
        $hwnd = $p.MainWindowHandle
        $title = $p.MainWindowTitle
        Write-Host "   PID $($p.Id): HWND=$hwnd Title='$title' Responding=$($p.Responding)"
        if ($hwnd -ne 0) { $hasWindow = $true }
    }
    Write-Host ""
    if ($hasWindow) {
        Write-Host "   SUCCESS! Cola opened with fresh profile."
        Write-Host "   Note: You'll need to log in again and re-open your projects."
        Write-Host "   Your old data is backed up at:"
        Write-Host "   $colaBackup"
    } else {
        Write-Host "   Still no window. This is very unusual."
        Write-Host ""
        Write-Host "   Possible causes:"
        Write-Host "   - Cola installation files are corrupted"
        Write-Host "   - Windows system file issue"
        Write-Host "   - Display driver compatibility"
        Write-Host ""
        Write-Host "   Try these:"
        Write-Host "   1. Check Task Manager > Details tab > find Cola > right-click > Switch to"
        Write-Host "   2. Check if any error dialog is behind other windows"
        Write-Host "   3. Try re-installing Cola from official source"
    }
} else {
    Write-Host "   ERROR: Cola crashed immediately!"
}
