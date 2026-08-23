import fs from 'fs'
import path from 'path'
let gd = [], res = []
function walk(d) {
  let e; try { e = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
  for (const x of e) {
    const p = path.join(d, x.name)
    if (x.isDirectory()) walk(p)
    else if (x.isFile() && (p.endsWith('.js') || p.endsWith('.json'))) {
      let c; try { c = fs.readFileSync(p, 'utf8') } catch { return }
      if (c.includes('GameDetailClient')) gd.push(p)
      if (c.includes('资源')) res.push(p)
    }
  }
}
walk('.next')
console.log('GameDetailClient in', gd.length, 'files')
gd.slice(0, 8).forEach(f => console.log('  ', f))
console.log('资源 in', res.length, 'files')
res.slice(0, 8).forEach(f => console.log('  ', f))
console.log('=== dev-server.out TAIL ===')
try {
  const out = fs.readFileSync('dev-server.out', 'utf8').split('\n')
  console.log(out.slice(-50).filter(Boolean).join('\n'))
} catch (e) { console.log('NO OUT', e.message) }
