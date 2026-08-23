import { execSync } from 'child_process'
function sh(c) {
  try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) { return (e.stdout || '') + (e.stderr || '') }
}
const psOut = sh('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 3000 -State Listen -EA 0).OwningProcess"')
const pid = psOut.split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0]
if (pid) {
  sh(`taskkill /f /pid ${pid} /t`)
  console.log('killed pid', pid)
} else {
  console.log('no server on 3000')
}
setTimeout(() => {
  const r = sh('cmd /c "rmdir /s /q d:\\Circleica\\.next"')
  console.log('rmdir result:', r.trim() || 'ok')
}, 3000)
