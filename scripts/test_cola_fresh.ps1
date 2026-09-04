# Try Cola with a completely separate user data directory
# This tests if Cola itself can open without touching existing data

Write-Host "=== Testing Cola with fresh user data dir ==="

# Kill existing
taskkill /F /IM Cola.exe 2>$null
Start-Sleep -Seconds 3

# Create a temp directory for testing
$testDir = "$env:TEMP\Cola_test_$(Get-Random)"
New-Item $testDir -ItemType Directory -Force | Out-Null
Write-Host "Test directory: $testDir"

# Launch with --user-data-dir pointing to empty directory
Write-Host "Launching Cola with empty user data..."
Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--user-data-dir=`"$testDir`"","--window-position=200,100" -ErrorAction SilentlyContinue
Write-Host "Waiting 15 seconds..."
Start-Sleep -Seconds 15

$procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($procs) {
    $hasWindow = $false
    foreach ($p in $procs) {
        $hwnd = $p.MainWindowHandle
        $cpu = $p.CPU
        $mem = [math]::Round($p.WorkingSet64 / 1MB)
        Write-Host "PID $($p.Id): HWND=$hwnd CPU=$cpu Mem=${mem}MB Title='$($p.MainWindowTitle)'"
        if ($hwnd -ne 0) { $hasWindow = $true }
    }
    Write-Host ""

    if ($hasWindow) {
        Write-Host "Cola CAN open with empty data!"
        Write-Host "This means your existing data has the problem."
        Write-Host ""
        Write-Host "You have two options:"
        Write-Host "1. Keep using this fresh profile (you'll need to login)"
        Write-Host "2. Reinstall Cola (your projects are safe in cloud)"
    } else {
        Write-Host "Cola CANNOT open even with empty data."
        Write-Host ""
        Write-Host "This means:"
        Write-Host "- The Cola installation itself is corrupted"
        Write-Host "- Your GPU/driver has a compatibility issue with this version"
        Write-Host ""
        Write-Host "You should REINSTALL Cola:"
        Write-Host "1. Go to Cola's official website and download the latest version"
        Write-Host "2. Run the installer (it will repair the installation)"
        Write-Host "3. Your animation projects are stored in the cloud, they won't be affected"
    }
} else {
    Write-Host "Cola process not found at all!"
}

# Cleanup test dir
Remove-Item $testDir -Recurse -Force -ErrorAction SilentlyContinue
