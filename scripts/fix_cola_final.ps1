# Step 1: Kill any remaining Cola processes
taskkill /F /IM Cola.exe 2>$null
Start-Sleep -Seconds 3

# Step 2: Rename the Cola data folder
$colaData = $env:APPDATA
$oldFolder = Join-Path $colaData "Cola"
$timestamp = Get-Date -Format "HHmmss"
$newFolder = Join-Path $colaData "Cola_backup_safe_$timestamp"

Write-Host "Renaming: $oldFolder"
Write-Host "     To: $newFolder"

if (Test-Path $oldFolder) {
    Rename-Item $oldFolder $newFolder -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1

    if (-not (Test-Path $oldFolder)) {
        Write-Host "SUCCESS: Folder renamed! Your data is safe at:"
        Write-Host $newFolder
    } else {
        Write-Host "ERROR: Could not rename folder"
    }
} else {
    Write-Host "Folder already renamed or doesn't exist"
}

# Step 3: Launch Cola
Write-Host ""
Write-Host "Launching Cola..."
Start-Process "D:\Program Files\Cola\Cola.exe"
Write-Host "Waiting 15 seconds for Cola to initialize..."
Start-Sleep -Seconds 15

# Step 4: Check result
Write-Host ""
Write-Host "=== Result ==="
$procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($procs) {
    $hasWindow = $false
    foreach ($p in $procs) {
        Write-Host "PID $($p.Id): HWND=$($p.MainWindowHandle) Title='$($p.MainWindowTitle)'"
        if ($p.MainWindowHandle -ne 0) { $hasWindow = $true }
    }
    Write-Host ""
    if ($hasWindow) {
        Write-Host "Cola opened! Login and your data will sync from cloud."
    } else {
        Write-Host "Still no window. Check taskbar for Cola icon."
    }
} else {
    Write-Host "Cola process not found!"
}
