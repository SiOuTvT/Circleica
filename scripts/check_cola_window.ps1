# Check for hidden/minimized/off-screen Cola windows and try to restore
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI2 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left, Top, Right, Bottom;
    }
}
"@

Write-Host "=== Searching for Cola windows ==="

# Try to find any Cola window
$colaWindow = [WinAPI2]::FindWindow($null, $null)
Write-Host "  FindWindow returned handle: $colaWindow"

# Check all top-level windows for Cola
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI3 {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
}
"@

$colaWindows = @()
$callback = [WinAPI3+EnumWindowsProc]{
    param($hWnd, $lParam)
    $pid = 0
    [WinAPI3]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null
    $sb = New-Object System.Text.StringBuilder 256
    [WinAPI3]::GetWindowText($hWnd, $sb, 256) | Out-Null
    $title = $sb.ToString()
    $visible = [WinAPI3]::IsWindowVisible($hWnd)

    if ($pid -eq 4432 -or $pid -eq 5288 -or $pid -eq 11056 -or $pid -eq 28388) {
        $colaWindows += "$hWnd | PID:$pid | Visible:$visible | Title:'$title'"
    }
    return $true
}
[WinAPI3]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

Write-Host "  Cola-related windows found:"
foreach ($w in $colaWindows) {
    Write-Host "    $w"
}

if ($colaWindows.Count -eq 0) {
    Write-Host "    None - Cola has NO windows at all!"
}

# Check screen resolution and display setup
Write-Host ""
Write-Host "=== Display Setup ==="
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
Write-Host "  Primary screen: $($screen.DeviceName)"
Write-Host "  Bounds: $($screen.Bounds)"
Write-Host "  WorkingArea: $($screen.WorkingArea)"
Write-Host "  BitsPerPixel: $($screen.BitsPerPixel)"

$allScreens = [System.Windows.Forms.Screen]::AllScreens
Write-Host "  Total screens: $($allScreens.Count)"
foreach ($s in $allScreens) {
    Write-Host "    $($s.DeviceName): $($s.Bounds) Primary=$($s.Primary)"
}
