# Check current keyboard layout and input method status
Add-Type -AssemblyName System.Windows.Forms

Write-Host "=== Current Input Languages ==="
$langList = [Windows.Globalization.Language]::GetInputMethodLanguages()
foreach ($lang in $langList) {
    Write-Host "  Language: $($lang.DisplayName) ($($lang.LanguageTag))"
}

Write-Host ""
Write-Host "=== Keyboard Layout ==="
$preload = Get-ItemProperty "HKCU:\Keyboard Layout\Preload" -ErrorAction SilentlyContinue
if ($preload) {
    $preload.PSObject.Properties | Where-Object { $_.Name -ne 'PSPath' -and $_.Name -ne 'PSParentPath' -and $_.Name -ne 'PSChildName' -and $_.Name -ne 'PSDrive' -and $_.Name -ne 'PSProvider' } | ForEach-Object {
        $hid = $_.Value
        Write-Host "  $($_.Name) = $hid"
    }
} else {
    Write-Host "  No Preload entries found"
    # Try alternate path
    $preload2 = Get-ItemProperty "HKCU:\Keyboard Layout\Preload\" -ErrorAction SilentlyContinue
    if ($preload2) {
        Write-Host "  Found with trailing slash:"
        $preload2.PSObject.Properties | ForEach-Object {
            Write-Host "    $($_.Name) = $($_.Value)"
        }
    }
}

Write-Host ""
Write-Host "=== Input Method Tips ==="
$userLangList = Get-WinUserLanguageList
foreach ($lang in $userLangList) {
    Write-Host "  Language: $($lang.LanguageTag) - $($lang.EnglishName)"
    foreach ($tip in $lang.InputMethodTips) {
        Write-Host "    IME: $tip"
    }
}

Write-Host ""
Write-Host "=== Running Input Method Processes ==="
$procs = Get-Process | Where-Object { $_.ProcessName -match "ctf|ime|textserv|sogou|rime|baidu" }
foreach ($p in $procs) {
    Write-Host "  $($p.ProcessName) (PID: $($p.Id)) Status: $($p.Responding)"
}

Write-Host ""
Write-Host "=== Taskbar Input Method Check ==="
$lang = Get-WinUserLanguageList | Select-Object -First 1
Write-Host "  Primary language: $($lang.EnglishName) ($($lang.LanguageTag))"
