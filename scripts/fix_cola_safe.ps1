# SAFE: Only rename the corrupted Preferences file - never delete user data
$colaData = "$env:APPDATA\Cola"
$prefsFile = Join-Path $colaData "Preferences"
$backupFile = Join-Path $colaData "Preferences_BAK_safe"
$renameFile = Join-Path $colaData "Preferences_OLD_corrupted"

Write-Host "=== SAFE Cola Fix (no data deletion) ==="
Write-Host ""

if (Test-Path $prefsFile) {
    Write-Host "Step 1: Backing up Preferences (keeping original)..."
    Copy-Item $prefsFile $backupFile -Force
    Write-Host "   Backup saved as: Preferences_BAK_safe"

    Write-Host ""
    Write-Host "Step 2: Renaming corrupted file (NOT deleting)..."
    Rename-Item $prefsFile "Preferences_OLD_corrupted"
    Write-Host "   Renamed to: Preferences_OLD_corrupted"

    Write-Host ""
    Write-Host "Step 3: Verifying..."
    if (-not (Test-Path $prefsFile)) {
        Write-Host "   SUCCESS: Preferences file is gone from its original name."
    }
    if (Test-Path $backupFile) {
        Write-Host "   SUCCESS: Original data is backed up safely."
    }
    if (Test-Path $renameFile) {
        Write-Host "   SUCCESS: Original file is preserved with new name."
    }
} else {
    Write-Host "   Preferences file not found - may already be cleared."
}

Write-Host ""
Write-Host "Step 4: Launching Cola..."
$colaExe = "D:\Program Files\Cola\Cola.exe"
if (Test-Path $colaExe) {
    Start-Process $colaExe
    Write-Host "   Cola launched! Waiting 10 seconds..."
    Start-Sleep -Seconds 10

    $newProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
    if ($newProcs) {
        $hasWindow = $false
        foreach ($p in $newProcs) {
            Write-Host "   PID $($p.Id): HWND=$($p.MainWindowHandle) Title='$($p.MainWindowTitle)'"
            if ($p.MainWindowHandle -ne 0) { $hasWindow = $true }
        }
        Write-Host ""
        if ($hasWindow) {
            Write-Host "   Cola opened successfully!"
        } else {
            Write-Host "   Still no window visible."
            Write-Host ""
            Write-Host "   If Cola icon is in taskbar, right-click > Maximize/Restore"
        }
    }
}
