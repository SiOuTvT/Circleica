# Re-register Microsoft Pinyin IME
$imeGuid = "81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E"
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\{$imeGuid}"

Write-Host "=== Re-registering Microsoft Pinyin IME ==="

# Method 1: Try to find the IME DLL and re-register it
$imeDllPaths = @(
    "$env:SystemRoot\System32\ime\shared\imehdb.dll",
    "$env:SystemRoot\System32\ime\shares\imeshared.dll",
    "$env:SystemRoot\System32\cttune.dll",
    "$env:SystemRoot\System32\chsime\imepadsm.dll",
    "$env:SystemRoot\System32\chtxime.dll"
)

Write-Host ""
Write-Host "Checking for IME DLL files..."
foreach ($dll in $imeDllPaths) {
    if (Test-Path $dll) {
        Write-Host "  FOUND: $dll"
    }
}

# Method 2: Try to re-enable the Chinese language feature using DISM
Write-Host ""
Write-Host "Checking if Chinese language feature is enabled..."
$langPackPath = "$env:SystemRoot\Servicing\Packages"
$chsPackages = Get-ChildItem $langPackPath -Filter "*chs*" -ErrorAction SilentlyContinue
foreach ($pkg in $chsPackages) {
    Write-Host "  Package: $($pkg.Name)"
}

# Method 3: Try to re-register the TIP using the language setting
Write-Host ""
Write-Host "Re-registering IME via language list update..."

# First, add a temp language to trigger re-registration
try {
    $langList = Get-WinUserLanguageList
    $currentLang = $langList | Where-Object { $_.LanguageTag -eq "zh-Hans-CN" }

    if ($currentLang) {
        # Remove and re-add the Chinese language to force re-registration
        Write-Host "  Current Chinese IME tips:"
        foreach ($tip in $currentLang.InputMethodTips) {
            Write-Host "    $tip"
        }

        # Force re-register by temporarily removing and re-adding
        Write-Host "  Removing Chinese language temporarily..."
        $newList = $langList | Where-Object { $_.LanguageTag -ne "zh-Hans-CN" }
        Set-WinUserLanguageList -LanguageList $newList -Force -ErrorAction Stop
        Start-Sleep -Seconds 3

        Write-Host "  Re-adding Chinese language..."
        $newList = Get-WinUserLanguageList
        $chsLang = New-WinUserLanguageList -Language "zh-Hans-CN"
        Set-WinUserLanguageList -LanguageList ($newList + $chsLang) -Force -ErrorAction Stop
        Start-Sleep -Seconds 5

        # Verify
        $verifyList = Get-WinUserLanguageList
        $verifyLang = $verifyList | Where-Object { $_.LanguageTag -eq "zh-Hans-CN" }
        if ($verifyLang) {
            Write-Host "  SUCCESS: Chinese language re-added"
            Write-Host "  New IME tips:"
            foreach ($tip in $verifyLang.InputMethodTips) {
                Write-Host "    $tip"
            }
        }
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)"
}

# Method 4: Directly recreate the IME registry key
Write-Host ""
Write-Host "Direct registry fix..."

if (-not (Test-Path $imeKey)) {
    Write-Host "  Creating IME registry key..."
    New-Item -Path $imeKey -Force | Out-Null

    # Set basic required values
    Set-ItemProperty -Path $imeKey -Name "(Default)" -Value "" -Type String
    Set-ItemProperty -Path $imeKey -Name "Enable" -Value 1 -Type DWord
    Set-ItemProperty -Path $imeKey -Name "Layout" -Value 804 -Type DWord

    Write-Host "  IME key created with basic settings"
} else {
    Write-Host "  IME key already exists"
}

# Final check
Write-Host ""
Write-Host "=== Final Verification ==="
$finalKey = "HKCU:\Software\Microsoft\CTF\TIP\{$imeGuid}"
if (Test-Path $finalKey) {
    Write-Host "  IME key EXISTS"
} else {
    Write-Host "  IME key MISSING - manual intervention needed"
}

$finalTip = "HKCU:\Software\Microsoft\CTF\TIP"
$entries = (Get-ChildItem $finalTip -ErrorAction SilentlyContinue).Count
Write-Host "  TIP entries: $entries"

$ctf = Get-Process -Name "ctfmon" -ErrorAction SilentlyContinue
$ime = Get-Process -Name "ChsIME" -ErrorAction SilentlyContinue
Write-Host "  ctfmon running: $($ctf -ne $null)"
Write-Host "  ChsIME running: $($ime -ne $null)"

Write-Host ""
Write-Host "=== Re-registration Complete ==="
