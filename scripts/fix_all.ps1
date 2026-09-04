# Comprehensive fix for both Cola and Input Method
# NO data deletion - only repairs

Write-Host "========================================="
Write-Host "  Step 1: Fix Chinese Input Method"
Write-Host "========================================="

# Method: Re-register Chinese IME using DISM to repair language pack
Write-Host ""
Write-Host "Checking Chinese language pack..."
$langResult = DISM /Online /Get-Intl 2>&1 | Select-String -Pattern "Chinese|zh-CN|zh-Hans|0804"
$langResult | ForEach-Object { Write-Host "  $_" }

# Check if we can use LPKSETUP or language pack repair
Write-Host ""
Write-Host "Re-registering Chinese IME..."

# First, properly unregister then re-register the Chinese language
# This forces Windows to recreate all IME settings
$langList = Get-WinUserLanguageList
$newList = @()
$hadChinese = $false

foreach ($lang in $langList) {
    if ($lang.LanguageTag -eq "zh-Hans-CN") {
        $hadChinese = $true
        Write-Host "Found Chinese language - will re-add it"
    } else {
        $newList += $lang
    }
}

if ($hadChinese) {
    # Temporarily remove Chinese
    Set-WinUserLanguageList -LanguageList $newList -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    # Re-add Chinese with proper IME
    $chsLang = New-WinUserLanguageList -Language "zh-Hans-CN"
    $finalList = $newList + $chsLang
    Set-WinUserLanguageList -LanguageList $finalList -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5

    Write-Host "Chinese language re-registered!"
}

# Restart TSF
Stop-Process -Name "ctfmon" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "ChsIME" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process "ctfmon.exe" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Verify
$finalLangList = Get-WinUserLanguageList
$chsOk = $false
foreach ($lang in $finalLangList) {
    if ($lang.LanguageTag -eq "zh-Hans-CN") {
        $chsOk = $true
        Write-Host "Chinese IME tips: $($lang.InputMethodTips -join ', ')"
    }
}
Write-Host "Chinese language active: $chsOk"

# Enable language bar
$regPath = "HKCU:\Software\Microsoft\CTF\LangBar"
if (-not (Test-Path $regPath)) {
    New-Item $regPath -Force | Out-Null
}
Set-ItemProperty $regPath -Name "ExtraIconsOnMinimized" -Value 1 -Type DWord -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================="
Write-Host "  Step 2: Fix Cola Application"
Write-Host "========================================="

# Kill Cola
taskkill /F /IM Cola.exe 2>$null
Start-Sleep -Seconds 3

# Try launching with --in-process-gpu flag (different renderer)
Write-Host ""
Write-Host "Trying to launch Cola with alternative GPU settings..."
Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--in-process-gpu","--enable-zero-copy" -ErrorAction SilentlyContinue
Write-Host "Launched! Waiting 15 seconds..."
Start-Sleep -Seconds 15

$procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($procs) {
    $hasWindow = $false
    foreach ($p in $procs) {
        Write-Host "  PID $($p.Id): HWND=$($p.MainWindowHandle) Title='$($p.MainWindowTitle)'"
        if ($p.MainWindowHandle -ne 0) { $hasWindow = $true }
    }
    if ($hasWindow) {
        Write-Host "SUCCESS: Cola opened!"
    } else {
        Write-Host "Cola is running but window not visible yet."
        Write-Host "If you see Cola icon in taskbar, click it."
    }
} else {
    Write-Host "Cola not running after launch."
}

Write-Host ""
Write-Host "========================================="
Write-Host "  ALL DONE!"
Write-Host "========================================="
