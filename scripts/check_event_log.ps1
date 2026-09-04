# Check Event Viewer for Cola crashes and errors
Write-Host "=== Checking Windows Event Log for Cola errors ==="

# Application errors
Write-Host ""
Write-Host "1. Application Error events (last 24h):"
$appErrors = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    Level = 2
    StartTime = (Get-Date).AddDays(-1)
} -MaxEvents 50 -ErrorAction SilentlyContinue

$colaEvents = $appErrors | Where-Object {
    $_.Message -like "*Cola*" -or
    $_.Message -like "*Electron*" -or
    $_.ProviderName -like "*Cola*" -or
    $_.ProviderName -like "*Application Error*"
}

if ($colaEvents) {
    foreach ($evt in $colaEvents) {
        Write-Host "  Time: $($evt.TimeCreated)"
        Write-Host "  Provider: $($evt.ProviderName)"
        Write-Host "  Message: $($evt.Message)"
        Write-Host ""
    }
} else {
    Write-Host "  No Cola-related errors found in Application log."
}

# Windows Error Reporting
Write-Host "2. Windows Error Reporting events (last 24h):"
$werEvents = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    ProviderName = 'Windows Error Reporting'
    StartTime = (Get-Date).AddDays(-1)
} -MaxEvents 20 -ErrorAction SilentlyContinue

$colaWer = $werEvents | Where-Object { $_.Message -like "*Cola*" -or $_.Message -like "*cola*" }
if ($colaWer) {
    foreach ($evt in $colaWer) {
        Write-Host "  Time: $($evt.TimeCreated)"
        Write-Host "  Message: $($evt.Message.Substring(0, [Math]::Min(500, $evt.Message.Length)))"
        Write-Host ""
    }
} else {
    Write-Host "  No Cola crash reports in WER."
}

# Check for any recent app errors
Write-Host ""
Write-Host "3. Recent app errors (last 2h, any app):"
$recentErrors = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    Level = 2
    StartTime = (Get-Date).AddHours(-2)
} -MaxEvents 5 -ErrorAction SilentlyContinue
foreach ($evt in $recentErrors) {
    Write-Host "  $($evt.TimeCreated): [$($evt.ProviderName)] $($evt.Message.Substring(0, [Math]::Min(200, $evt.Message.Length)))"
}

# Check DXGI/D3D errors (GPU-related)
Write-Host ""
Write-Host "4. D3D/GPU errors (last 24h):"
$dxErrors = Get-WinEvent -FilterHashtable @{
    LogName = 'Application'
    Level = 2
    StartTime = (Get-Date).AddDays(-1)
} -MaxEvents 100 -ErrorAction SilentlyContinue
$dxErrors = $dxErrors | Where-Object {
    $_.Message -like "*d3d*" -or $_.Message -like "*dxgi*" -or $_.Message -like "*vulkan*" -or
    $_.Message -like "*gpu*" -or $_.Message -like "*renderer*" -or $_.Message -like "*crash*"
}
if ($dxErrors) {
    foreach ($evt in $dxErrors | Select-Object -First 5) {
        Write-Host "  $($evt.TimeCreated): $($evt.Message.Substring(0, [Math]::Min(300, $evt.Message.Length)))"
    }
} else {
    Write-Host "  No GPU/renderer errors found."
}
