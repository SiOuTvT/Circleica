# Fix input method by re-registering Chinese language
# This does NOT delete anything

Write-Host "=== Fixing Chinese Input Method ==="

# Check current language list
$langList = Get-WinUserLanguageList -ErrorAction SilentlyContinue
$hasChinese = $false
foreach ($lang in $langList) {
    if ($lang.LanguageTag -eq "zh-Hans-CN") {
        $hasChinese = $true
        Write-Host "Chinese language IS installed."
        Write-Host "Input methods: $($lang.InputMethodTips -join ', ')"
        break
    }
}

if (-not $hasChinese) {
    Write-Host "Chinese language NOT found - need to re-add it."
} else {
    Write-Host ""
    Write-Host "Chinese is installed. Let me restart the Text Services Framework..."

    # Restart ctfmon
    Stop-Process -Name "ctfmon" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Process "ctfmon.exe" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    # Restart ChsIME
    Stop-Process -Name "ChsIME" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    $newCtf = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
    $newIme = Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue
    Write-Host "ctfmon running: $($newCtf -ne $null)"
    Write-Host "ChsIME running: $($newIme -ne $null)"
}

# Check the IME registry key
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"
Write-Host ""
Write-Host "Checking IME registry..."
if (Test-Path $imeKey) {
    Write-Host "IME key EXISTS - good!"
    $enable = (Get-ItemProperty $imeKey -Name "Enable" -ErrorAction SilentlyContinue).Enable
    Write-Host "Enable value: $enable"
} else {
    Write-Host "IME key MISSING - need to recreate"

    # Create the key
    New-Item $imeKey -Force | Out-Null
    Set-ItemProperty $imeKey -Name "Enable" -Value 1 -Type DWord
    Set-ItemProperty $imeKey -Name "Layout" -Value 804 -Type DWord

    # Check TIP entries
    $tipPath = "HKCU:\Software\Microsoft\CTF\TIP"
    $entries = (Get-ChildItem $tipPath -ErrorAction SilentlyContinue).Count
    Write-Host "Created IME key. TIP entries: $entries"
}

# Check substitution
Write-Host ""
Write-Host "Checking keyboard substitution..."
$subst = Get-ItemProperty "HKCU:\Keyboard Layout\Substitutes" -ErrorAction SilentlyContinue
if ($subst) {
    Write-Host "Substitution entries:"
    $subst.PSObject.Properties | Where-Object { $_.Name -notmatch 'PS' } | ForEach-Object {
        Write-Host "  $($_.Name) = $($_.Value)"
    }
}

# Restart TSF
Write-Host ""
Write-Host "Restarting Text Services Framework..."
Stop-Process -Name "ctfmon" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process "ctfmon.exe" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Final check
Write-Host ""
Write-Host "=== Final Status ==="
$finalImeKey = "HKCU:\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"
$imeExists = Test-Path $finalImeKey
$ctfRunning = (Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue) -ne $null
$imeRunning = (Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue) -ne $null
$preload = Get-ItemProperty "HKCU:\Keyboard Layout\Preload" -ErrorAction SilentlyContinue
$hasZh = $false
if ($preload) {
    $preload.PSObject.Properties | Where-Object { $_.Name -notmatch 'PS' } | ForEach-Object {
        if ($_.Value -eq "00000804") { $hasZh = $true }
    }
}

Write-Host "IME registry key:     $(if($imeExists){'EXISTS'}else{'MISSING'})"
Write-Host "CTF (ctfmon) running: $ctfRunning"
Write-Host "ChsIME running:       $imeRunning"
Write-Host "Chinese layout:       $(if($hasZh){'LOADED'}else{'NOT LOADED'})"
Write-Host ""
Write-Host "Please try typing now. Press Shift to toggle Chinese/English mode."
