# Detailed check of Cola processes
Write-Host "=== Cola Process Details ==="
$colaProcs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($colaProcs) {
    foreach ($p in $colaProcs) {
        Write-Host ""
        Write-Host "PID: $($p.Id)"
        Write-Host "  Responding: $($p.Responding)"
        Write-Host "  MainWindowHandle: $($p.MainWindowHandle)"
        Write-Host "  MainWindowTitle: '$($p.MainWindowTitle)'"
        Write-Host "  MainWindowTitle.Length: $($p.MainWindowTitle.Length)"
        Write-Host "  StartTime: $($p.StartTime)"
        Write-Host "  WorkingSet: $([math]::Round($p.WorkingSet64 / 1MB, 1)) MB"
        Write-Host "  CPU: $($p.CPU)"
        Write-Host "  Modules count: $($p.Modules.Count)"
    }
} else {
    Write-Host "No Cola processes found!"
}

# Check if Cola has a visible window
Write-Host ""
Write-Host "=== Window Visibility Check ==="
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);
}
"@

$colaProcs | ForEach-Object {
    $hwnd = $_.MainWindowHandle
    $visible = [WinAPI]::IsWindowVisible($hwnd)
    $minimized = [WinAPI]::IsIconic($hwnd)
    $maximized = [WinAPI]::IsZoomed($hwnd)
    Write-Host "PID $($_.Id):"
    Write-Host "  HWND: $hwnd"
    Write-Host "  Visible: $visible"
    Write-Host "  Minimized: $minimized"
    Write-Host "  Maximized: $maximized"
}

# Find Cola's executable path
Write-Host ""
Write-Host "=== Cola Installation Path ==="
$colaProc = $colaProcs | Select-Object -First 1
if ($colaProc) {
    $exePath = $colaProc.Path
    $exeDir = Split-Path $exePath -Parent
    Write-Host "  Executable: $exePath"
    Write-Host "  Directory: $exeDir"
    Write-Host ""
    Write-Host "  Files in directory:"
    Get-ChildItem $exeDir -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "    $($_.Name) ($([math]::Round($_.Length / 1KB, 1)) KB)"
    }
}
