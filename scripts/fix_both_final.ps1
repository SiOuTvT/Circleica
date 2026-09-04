# Fix 1: Input Method - enable language bar and check
Write-Host "============================================"
Write-Host "  FIX 1: Chinese Input Method"
Write-Host "============================================"

# Enable the language indicator on taskbar
$regPath = "HKCU:\Software\Microsoft\CTF"
New-Item $regPath -Force | Out-Null | Out-Null

$langBar = "HKCU:\Software\Microsoft\CTF\LangBar"
New-Item $langBar -Force | Out-Null
Set-ItemProperty $langBar -Name "ExtraIconsOnMinimized" -Value 1 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty $langBar -Name "ShowStatus" -Value 4 -Type DWord -ErrorAction SilentlyContinue

# Also check and set TIP language bar disable
$tipKey = "HKCU:\Software\Microsoft\CTF\TIP\{81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E}"
if (Test-Path $tipKey) {
    $val = (Get-ItemProperty $tipKey -Name "Hide Tray" -ErrorAction SilentlyContinue)."Hide Tray"
    Write-Host "IME 'Hide Tray' setting: $val"
    if ($val -eq 1) {
        Set-ItemProperty $tipKey -Name "Hide Tray" -Value 0 -Type DWord -ErrorAction SilentlyContinue
        Write-Host "Fixed: Language bar was hidden, now enabled."
    }
}

# Restart TSF
taskkill /F /IM ctfmon.exe 2>$null
taskkill /F /IM ChsIME.exe 2>$null
Start-Sleep -Seconds 2
Start-Process ctfmon.exe
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Input method fix done. Try typing now."
Write-Host "Look for '中' or 'ENG' in the taskbar."
Write-Host ""

# Fix 2: Cola - try different approach
Write-Host "============================================"
Write-Host "  FIX 2: Cola Application"
Write-Host "============================================"

# Kill all Cola
taskkill /F /IM Cola.exe 2>$null
Start-Sleep -Seconds 4

# Try launching with window position forced
Write-Host "Launching Cola with forced window position..."
Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--window-position=200,100","--start-maximized" -ErrorAction SilentlyContinue
Write-Host "Waiting 20 seconds..."
Start-Sleep -Seconds 20

$procs = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
if ($procs) {
    $mainProc = $procs | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($mainProc) {
        Write-Host "SUCCESS! Cola window is open!"
        Write-Host "Title: $($mainProc.MainWindowTitle)"
    } else {
        Write-Host "Processes running, window still not visible."
        Write-Host "CPU usage on main process:"
        foreach ($p in $procs | Sort-Object CPU -Descending | Select-Object -First 2) {
            Write-Host "  PID $($p.Id): CPU=$($p.CPU) WorkingSet=$([math]::Round($p.WorkingSet64/1MB))MB"
        }

        # Try one more time with different args
        Write-Host ""
        Write-Host "Trying one more launch method..."
        taskkill /F /IM Cola.exe 2>$null
        Start-Sleep -Seconds 3

        Start-Process "D:\Program Files\Cola\Cola.exe" -ArgumentList "--disable-gpu","--disable-features=VizDisplayCompositor" -ErrorAction SilentlyContinue
        Write-Host "Launched with GPU disabled. Waiting 15 seconds..."
        Start-Sleep -Seconds 15

        $procs2 = Get-Process -Name "Cola" -ErrorAction SilentlyContinue
        if ($procs2) {
            $mainProc2 = $procs2 | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
            if ($mainProc2) {
                Write-Host "SUCCESS with GPU disabled!"
            } else {
                Write-Host ""
                Write-Host "Still not working. Let me check for crash info..."
                $logs = Get-ChildItem "$env:APPDATA\Cola" -Recurse -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
                if ($logs) {
                    Write-Host "Recent logs:"
                    foreach ($l in $logs | Select-Object -First 3) {
                        Write-Host "  $($l.FullName) ($($l.LastWriteTime))"
                        Write-Host "  Size: $($l.Length) bytes"
                    }
                }

                # Check event log
                Write-Host ""
                Write-Host "Checking Windows Event Log..."
                $recent = Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddHours(-1)} -MaxEvents 20 -ErrorAction SilentlyContinue
                $colaEvts = $recent | Where-Object { $_.Message -like "*Cola*" -or $_.Message -like "*Electron*" }
                if ($colaEvts) {
                    foreach ($e in $colaEvts) {
                        Write-Host "  $($e.TimeCreated): $($e.Message.Substring(0, [Math]::Min(300, $e.Message.Length)))"
                    }
                } else {
                    Write-Host "  No Cola events in Application log."
                }

                # Check WER
                Write-Host ""
                $werDir = "C:\ProgramData\Microsoft\Windows\WER\ReportQueue"
                if (Test-Path $werDir) {
                    $werReports = Get-ChildItem $werDir -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Cola*" }
                    if ($werReports) {
                        Write-Host "Windows Error Reports for Cola:"
                        foreach ($r in $werReports | Select-Object -First 3) {
                            Write-Host "  $($r.FullName)"
                        }
                    }
                }
            }
        }
    }
} else {
    Write-Host "Cola not running after launch!"
}

Write-Host ""
Write-Host "============================================"
Write-Host "  Summary"
Write-Host "============================================"
Write-Host "Input method: Check if you can type Chinese now"
Write-Host "Cola: Check if window appeared"
