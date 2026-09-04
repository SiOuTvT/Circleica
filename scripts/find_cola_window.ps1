# Try to find and restore Cola window using window enumeration
# Also try launching with explicit window position

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinFind {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWndProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder sb, int max);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool repaint);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; }

    public delegate bool EnumWndProc(IntPtr hWnd, IntPtr lParam);
}
"@

$found = @()
$cb = [WinFind+EnumWndProc]{
    param($hWnd, $lParam)
    $pid = 0
    [WinFind]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null

    # Check against known Cola PIDs
    $knownPids = @(4392, 4488, 10076, 13992)
    if ($knownPids -contains $pid) {
        $vis = [WinFind]::IsWindowVisible($hWnd)
        $sb = New-Object System.Text.StringBuilder 256
        [WinFind]::GetWindowText($hWnd, $sb, 256) | Out-Null
        $rect = New-Object WinFind+RECT
        [WinFind]::GetWindowRect($hWnd, [ref]$rect) | Out-Null

        $found += [PSCustomObject]@{
            HWND = $hWnd
            PID = $pid
            Visible = $vis
            Title = $sb.ToString()
            Left = $rect.L
            Top = $rect.T
            Right = $rect.R
            Bottom = $rect.B
        }
    }
    return $true
}
[WinFind]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null

Write-Host "=== Cola Windows Found ==="
if ($found.Count -gt 0) {
    foreach ($w in $found) {
        Write-Host "  HWND=$($w.HWND) PID=$($w.PID) Visible=$($w.Visible)"
        Write-Host "  Title='$($w.Title)'"
        Write-Host "  Rect: L=$($w.Left) T=$($w.Top) R=$($w.Right) B=$($w.Bottom)"
        $w = $w.Left
        $w = $w.Top
        $w = $w.Right
        $w = $w.Bottom
        $w = $w.Visible
        $w = $w.Title
        $w = $w.PID
        $w = $w.HWND
    }

    # Try to restore any hidden windows
    foreach ($w in $found) {
        if (-not $w.Visible) {
            Write-Host ""
            Write-Host "Attempting to show hidden window..."
            [WinFind]::ShowWindow($w.HWND, 9) | Out-Null  # SW_RESTORE
            Start-Sleep -Milliseconds 500
            [WinFind]::SetForegroundWindow($w.HWND) | Out-Null
            Write-Host "Window restore attempted."
        }

        # If window is off-screen, move it to center
        if ($w.Left -lt -1000 -or $w.Top -lt -1000) {
            Write-Host "Window appears to be off-screen! Moving to center..."
            [WinFind]::MoveWindow($w.HWND, 100, 100, 1200, 800, $true) | Out-Null
            Write-Host "Window moved to (100, 100)."
        }
    }
} else {
    Write-Host "  No windows found belonging to Cola PIDs."
    Write-Host ""
    Write-Host "Let me try launching Cola again with explicit position..."

    # Kill and relaunch with window position
    taskkill /F /IM Cola.exe 2>$null
    Start-Sleep -Seconds 3

    Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--window-position=100,100","--window-size=1200,800" -ErrorAction SilentlyContinue
    Write-Host "Launched with explicit position. Waiting 15 seconds..."
    Start-Sleep -Seconds 15

    $procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            Write-Host "  PID $($p.Id): HWND=$($p.MainWindowHandle) Title='$($p.MainWindowTitle)'"
        }
    }
}
