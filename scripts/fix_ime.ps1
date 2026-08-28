# Fix Microsoft Pinyin IME by resetting its configuration
# Also try to fix the IME registry

Write-Host "=== Attempting to fix Microsoft Pinyin IME ==="

# 1. Check if we can find the IME registry settings
$imeGuid = "{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\$imeGuid"

Write-Host ""
Write-Host "1. Checking IME registry key..."
if (Test-Path $imeKey) {
    Write-Host "   IME key exists"
    $props = Get-ItemProperty $imeKey -ErrorAction SilentlyContinue
    $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | Select-Object -First 20 | ForEach-Object {
        Write-Host "   $($_.Name) = $($_.Value)"
    }
} else {
    Write-Host "   IME key not found - IME may not be properly registered"
}

# 2. Check TSF settings
$tsfKey = "HKCU:\Software\Microsoft\CTF"
Write-Host ""
Write-Host "2. Checking CTF/TIP settings..."
$tipKey = "$tsfKey\TIP"
if (Test-Path $tipKey) {
    $guids = Get-ChildItem $tipKey | Select-Object -ExpandProperty PSChildName
    Write-Host "   Registered TIPs:"
    foreach ($g in $guids) {
        Write-Host "   - $g"
    }
}

# 3. Check language bar / TSF toggle status
Write-Host ""
Write-Host "3. Checking TSF Enable status..."
$enableCtf = Get-ItemProperty "HKCU:\Software\Microsoft\CTF\Enable" -ErrorAction SilentlyContinue
if ($enableCtf) {
    Write-Host "   CTF Enable: $($enableCtf.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object { $_.Name + '=' + $_.Value })"
}

# 4. Try to restart the CTF/IME services
Write-Host ""
Write-Host "4. Attempting to restart CTF/IME processes..."
$ctfProc = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
$imeProc = Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue

if ($ctfProc) {
    Write-Host "   Restarting ctfmon (PID: $($ctfProc.Id))..."
    Stop-Process -Name "ctfmon" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Start-Process "ctfmon.exe" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ctfmon restarted"
}

if ($imeProc) {
    Write-Host "   Restarting ChsIME (PID: $($imeProc.Id))..."
    Stop-Process -Name "ChsIME" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    # ChsIME will auto-restart when needed
    Write-Host "   ChsIME stopped - will auto-restart"
}

Start-Sleep -Seconds 3

# 5. Check if processes came back
Write-Host ""
Write-Host "5. Checking process status after restart..."
$newCtf = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
$newIme = Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue
if ($newCtf) { Write-Host "   ctfmon is running (PID: $($newCtf.Id))" }
if ($newIme) { Write-Host "   ChsIME is running (PID: $($newIme.Id))" }

Write-Host ""
Write-Host "=== Done ==="
Write-Host "Please try typing now. If still not working, try:"
Write-Host "  1. Press Win + Space to cycle input methods"
Write-Host "  2. Look at the taskbar - is there a language indicator (e.g. '中' or 'ENG')?"
Write-Host "  3. Press Ctrl + Space to toggle IME on/off"
Write-Host "  4. Press Shift to switch between Chinese and English mode within the IME"
