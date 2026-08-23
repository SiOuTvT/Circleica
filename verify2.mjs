import fs from 'fs'
import path from 'path'

// 1) grep .next for resource-tab unique markers
let markers = { userActivity: [], gameDynamic: [], flexWrap: [] }
function walk(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.isFile() && p.endsWith('.js')) {
      let c; try { c = fs.readFileSync(p, 'utf8') } catch { return }
      if (c.includes('UserActivityTimeline')) markers.userActivity.push(p)
      if (c.includes('游戏动态')) markers.gameDynamic.push(p)
      if (c.includes('flexWrap')) markers.flexWrap.push(p)
    }
  }
}
walk('.next')
console.log('UserActivityTimeline in', markers.userActivity.length, 'files')
console.log('游戏动态 in', markers.gameDynamic.length, 'files')
console.log('flexWrap in', markers.flexWrap.length, 'files')

// 2) tail dev-server.out for compile log
try {
  const out = fs.readFileSync('dev-server.out', 'utf8').split('\n')
  const tail = out.slice(-40).filter(Boolean)
  console.log('=== dev-server.out TAIL ===')
  console.log(tail.join('\n'))
} catch (e) { console.log('NO OUT', e.message) }
