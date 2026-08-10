$targets = @("http://localhost:3000/", "http://localhost:3000/about")
foreach ($t in $targets) {
  try {
    $r = Invoke-WebRequest -Uri $t -UseBasicParsing -TimeoutSec 12 -ErrorAction Stop
    Write-Output "GET $t -> STATUS $($r.StatusCode)"
    $body = $r.Content
    Write-Output ("BODY(1000): " + $body.Substring(0, [Math]::Min(1000, $body.Length)))
  } catch {
    $ex = $_.Exception
    if ($ex.Response) {
      $sr = [System.IO.StreamReader]::new($ex.Response.GetResponseStream())
      $errbody = $sr.ReadToEnd()
      Write-Output "GET $t -> HTTP $($ex.Response.StatusCode) : $($ex.Message)"
      Write-Output ("ERRBODY(1000): " + $errbody.Substring(0, [Math]::Min(1000, $errbody.Length)))
    } else {
      Write-Output "GET $t -> CONNERR : $($ex.Message)"
    }
  }
}
Write-Output "=== node procs ==="
tasklist /fi "imagename eq node.exe" 2>$null
