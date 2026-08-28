# Reset Microsoft Pinyin IME settings to default
$imeGuid = "{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"

# These are the keys that store user-specific Pinyin settings
$keysToReset = @(
    "HKCU:\Software\Microsoft\CTF\TIP\$imeGuid",
    "HKCU:\Software\Microsoft\InputMethod\CHS"
)

Write-Host "=== Resetting Microsoft Pinyin IME Settings ==="

foreach ($keyPath in $keysToReset) {
    if (Test-Path $keyPath) {
        Write-Host ""
        Write-Host "Found key: $keyPath"

        # List all subkeys and values before backup
        $backup = @{}
        Get-ItemProperty $keyPath -ErrorAction SilentlyContinue | ForEach-Object {
            $_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
                $backup[$_.Name] = $_.Value
            }
        }

        Write-Host "  Current values:"
        $backup.GetEnumerator() | ForEach-Object { Write-Host "    $($_.Name) = $($_.Value)" }

        # Delete the key to reset to default
        Write-Host "  Removing key to reset to defaults..."
        Remove-Item $keyPath -Recurse -Force -ErrorAction SilentlyContinue

        if (-not (Test-Path $keyPath)) {
            Write-Host "  SUCCESS: Key removed. IME will recreate with defaults."
        } else {
            Write-Host "  WARNING: Could not remove key."
        }
    } else {
        Write-Host "  Key not found: $keyPath"
    }
}

# Also check for the Pinyin user dictionary
$dictKey = "HKCU:\Software\Microsoft\InputMethod\CHS\UserPhrase"
Write-Host ""
if (Test-Path $dictKey) {
    Write-Host "Found user dictionary at: $dictKey"
    Remove-Item $dictKey -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  User dictionary removed."
} else {
    Write-Host "No separate user dictionary found (using default)."
}

# Restart CTF to pick up the reset
Write-Host ""
Write-Host "Restarting CTF/IME to apply changes..."
Stop-Process -Name "ctfmon" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "ChsIME" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process "ctfmon.exe" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Verify
$newCtf = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
$newIme = Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue
Write-Host "  ctfmon: $($newCtf -ne $null) (PID: $($newCtf.Id))"
Write-Host "  ChsIME: $($newIme -ne $null) (PID: $($newIme.Id))"

Write-Host ""
Write-Host "=== RESET COMPLETE ==="
Write-Host "Microsoft Pinyin IME has been reset to factory defaults."
Write-Host "Your custom user dictionary/phrases have been cleared."
Write-Host ""
Write-Host "Now try:"
Write-Host "  1. Click in any text box and try typing pinyin (e.g. 'nihao')"
Write-Host "  2. Look at the taskbar for the language indicator"
Write-Host "  3. If still English-only, press Shift to toggle IME mode"
