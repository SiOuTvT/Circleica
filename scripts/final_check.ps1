# Check the current state of the IME registry after reset
$imeGuid = "81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E"

# Check if key exists and what values it has
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\{$imeGuid}"
Write-Host "=== Current IME Key State ==="
if (Test-Path $imeKey) {
    Write-Host "Key EXISTS"
    $props = Get-ItemProperty $imeKey -ErrorAction SilentlyContinue
    $count = 0
    $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        $count++
        Write-Host "  $($_.Name) = $($_.Value)"
    }
    if ($count -eq 0) { Write-Host "  (empty - only default value)" }
} else {
    Write-Host "Key MISSING!"
}

# Check the preload keyboard layout
Write-Host ""
Write-Host "=== Keyboard Layout Preload ==="
$preload = Get-ItemProperty "HKCU:\Keyboard Layout\Preload" -ErrorAction SilentlyContinue
if ($preload) {
    $preload.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        $hex = [Convert]::ToInt64($_.Value, 16)
        Write-Host "  Slot $($_.Name): $($_.Value) = Layout $hex"
        switch ($hex) {
            0x409 { Write-Host "    -> English (US)" }
            0x804 { Write-Host "    -> Chinese (Simplified, PRC)" }
            default { Write-Host "    -> Unknown layout" }
        }
    }
}

# Check the Substitute for Chinese layout
Write-Host ""
Write-Host "=== Keyboard Layout Substitute ==="
$subst = Get-ItemProperty "HKCU:\Keyboard Layout\Substitutes" -ErrorAction SilentlyContinue
if ($subst) {
    $subst.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        Write-Host "  $($_.Name) = $($_.Value)"
    }
} else {
    Write-Host "  No substitutes"
}

# Check loaded IME modules in ctfmon
Write-Host ""
Write-Host "=== CTF Module Check ==="
$ctf = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
if ($ctf) {
    Write-Host "  ctfmon is running (PID: $($ctf.Id))"
    Write-Host "  Main window title: '$($ctf.MainWindowTitle)'"
} else {
    Write-Host "  ctfmon NOT running!"
}

# List all running processes with "ime" or "chinese" in name
Write-Host ""
Write-Host "=== All IME-related processes ==="
Get-Process | Where-Object { $_.ProcessName -match "ctf|ime|text|input|chinese|chs" } | ForEach-Object {
    Write-Host "  $($_.ProcessName) (PID: $($_.Id)) Responding: $($_.Responding)"
}
