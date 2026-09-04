# Check Cola logs and crash info
$colaDir = "D:\Program Files\Cola"
$userDataDirs = @(
    "$env:LOCALAPPDATA\Cola",
    "$env:APPDATA\Cola",
    "$env:LOCALAPPDATA\Programs\Cola",
    "$env:LOCALAPPDATA\Packages\Cola*",
    "$env:LOCALAPPDATA\Microsoft\WindowsApps\Cola*"
)

Write-Host "=== Cola User Data Directories ==="
foreach ($dir in $userDataDirs) {
    $items = Get-Item $dir -ErrorAction SilentlyContinue
    if ($items) {
        foreach ($item in $items) {
            Write-Host ""
            Write-Host "Found: $($item.FullName)"
            if ($item.PSIsContainer) {
                Get-ChildItem $item.FullName -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
                    $size = if ($_.PSIsContainer) { "(dir)" } else { "$([math]::Round($_.Length / 1KB, 1)) KB" }
                    Write-Host "  $($_.FullName) $size"
                }
            }
        }
    }
}

# Also check AppData for logs
Write-Host ""
Write-Host "=== Searching for Cola log files ==="
$logPaths = @(
    "$env:LOCALAPPDATA\Cola",
    "$env:APPDATA\Cola",
    "$env:LOCALAPPDATA\Packages"
)
foreach ($lp in $logPaths) {
    if (Test-Path $lp) {
        $logs = Get-ChildItem $lp -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 5
        if ($logs) {
            Write-Host "  Logs in $lp :"
            foreach ($log in $logs) {
                Write-Host "    $($log.FullName) ($($log.LastWriteTime))"
            }
        }
    }
}

# Check install-info.json
Write-Host ""
Write-Host "=== install-info.json ==="
$infoPath = Join-Path $colaDir "install-info.json"
if (Test-Path $infoPath) {
    Get-Content $infoPath
}

# Try to check Windows Event Log for Cola crashes
Write-Host ""
Write-Host "=== Recent Application Errors from Event Log ==="
$events = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=(Get-Date).AddHours(-2)} -MaxEvents 10 -ErrorAction SilentlyContinue
foreach ($evt in $events) {
    if ($evt.Message -like "*Cola*" -or $evt.ProviderName -like "*Cola*") {
        Write-Host "  $($evt.TimeCreated): $($evt.Message)"
    }
}
