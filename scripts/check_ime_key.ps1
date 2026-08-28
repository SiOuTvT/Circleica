$imeGuid = "81D4E9C9-1D3B-41BC-9E6C-4B40BF79E35E"
$imeKey = "HKCU:\Software\Microsoft\CTF\TIP\{$imeGuid}"

Write-Host "Checking IME key: $imeKey"
if (Test-Path $imeKey) {
    Write-Host "STATUS: IME key EXISTS - reset was successful"
    $props = Get-ItemProperty $imeKey -ErrorAction SilentlyContinue
    $count = 0
    $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        $count++
        Write-Host "  $($_.Name) = $($_.Value)"
        if ($count -ge 15) { Write-Host "  ... (truncated)"; return }
    }
} else {
    Write-Host "STATUS: IME key MISSING - this is a problem!"
    Write-Host ""
    Write-Host "Checking if TIP folder exists..."
    $tipPath = "HKCU:\Software\Microsoft\CTF\TIP"
    if (Test-Path $tipPath) {
        $guids = Get-ChildItem $tipPath -ErrorAction SilentlyContinue
        Write-Host "  TIP folder exists with $($guids.Count) entries:"
        foreach ($g in $guids) {
            Write-Host "    - $($g.PSChildName)"
        }
    } else {
        Write-Host "  TIP folder does not exist!"
    }
}
