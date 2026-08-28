# Deep check of keyboard layout and IME settings
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeMethods {
    [DllImport("user32.dll")]
    public static extern IntPtr GetKeyboardLayout(uint idThread);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
}
"@

$hkl = [NativeMethods]::GetKeyboardLayout([NativeMethods]::GetCurrentThreadId())
$layoutId = $hkl.ToInt64() -band 0xFFFF
Write-Host "=== Current Keyboard Layout ==="
Write-Host "  HKL: $hkl"
Write-Host "  Layout ID: $layoutId (hex: $([Convert]::ToString($layoutId, 16).ToUpper()))"

Write-Host ""
Write-Host "=== Layout ID Legend ==="
Write-Host "  00000409 = English (US)"
Write-Host "  00000804 = Chinese (Simplified, PRC)"
Write-Host "  00000411 = Japanese"
Write-Host "  00000402 = Bulgarian"

Write-Host ""
Write-Host "=== Keyboard Toggle Settings ==="
$toggle = Get-ItemProperty "HKCU:\Keyboard Layout\Toggle" -ErrorAction SilentlyContinue
if ($toggle) {
    $toggle.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        Write-Host "  $($_.Name) = $($_.Value)"
    }
} else {
    Write-Host "  No Toggle settings found"
}

Write-Host ""
Write-Host "=== Substitute Layouts ==="
$subst = Get-ItemProperty "HKCU:\Keyboard Layout\Substitutes" -ErrorAction SilentlyContinue
if ($subst) {
    $subst.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        Write-Host "  $($_.Name) = $($_.Value)"
    }
} else {
    Write-Host "  No Substitutes found"
}

Write-Host ""
Write-Host "=== IME Advanced Settings ==="
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"
if (Test-Path $imeKey) {
    Get-ItemProperty $imeKey -ErrorAction SilentlyContinue | ForEach-Object {
        $_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
            Write-Host "  $($_.Name) = $($_.Value)"
        }
    }
} else {
    Write-Host "  No IME advanced settings found"
}
