$ErrorActionPreference = 'Continue'
$env:CODEBUDDY_SAFE_DELETE_ENABLED = '0'
$log = 'd:\Circleica\_build_phase0.log'
$err = 'd:\Circleica\_build_phase0.err'
Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', "cd /d d:\Circleica && npm run build > $log 2>$err" `
  -WindowStyle Hidden `
  -PassThru | Select-Object Id
