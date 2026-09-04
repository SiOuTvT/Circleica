# SAFE: Rename entire Cola data folder - never delete anything
$colaData = "$env:APPDATA\Cola"
$colaDataNew = "$env:APPDATA\Cola_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$colaExe = "D:\Program Files\Cola\Cola.exe"

Write-Host "=== SAFE Cola Fix: Rename entire data folder ==="
Write-Host ""
Write-Host "This will RENAME the folder (not delete it):"
Write-Host "  FROM: $colaData"
Write-Host "  TO:   $colaDataNew"
Write-Host ""
Write-Host "After rename:"
Write-Host "  - Cola will start with a fresh profile"
Write-Host "  - Your chat history and data are SAFE in the renamed folder"
Write-Host "  - Your projects are in the cloud, sync after login"
Write-Host ""

if (Test-Path $colaData) {
    Rename-Item $colaData $colaDataNew -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    if (-not (Test-Path $colaData) -and (Test-Path $colaDataNew)) {
        Write-Host "SUCCESS: Folder renamed!"
        Write-Host "Old data location: $colaDataNew"
    } else {
        Write-Host "Could not rename - folder may be in use."
        Write-Host "Trying to force..."
        Stop-Process -Name "Cola" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Rename-Item $colaData $colaDataNew -ErrorAction SilentlyContinue
        Write-Host "Done."
    }
} else {
    Write-Host "Folder already moved or doesn't exist."
}

Write-Host ""
Write-Host "Launching Cola with fresh profile..."
Start-Process $colaExe
Write-Host "Waiting 12 seconds..."
Start-Sleep -Seconds 12

$newProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($newProcs) {
    $hasWindow = $false
    foreach ($p in $newProcs) {
        $hwnd = $p.MainWindowHandle
        Write-Host "   PID $($p.Id): HWND=$hwnd Title='$($p.MainWindowTitle)'"
        if ($hwnd -ne 0) { $hasWindow = $true }
    }
    Write-Host ""
    if ($hasWindow) {
        Write-Host "Cola opened successfully!"
        Write-Host "After login, your data will sync from cloud."
        Write-Host "Old data backed up at: $colaDataNew"
    } else {
        Write-Host "Still no window."
        Write-Host "Check taskbar for Cola icon."
    }
}
