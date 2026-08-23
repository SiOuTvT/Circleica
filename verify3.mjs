import fs from 'fs'
import path from 'path'
let gameDynamic = [], flexDir = []
function walk(d) {
  let e; try { e = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
  for (const x of e) {
    const p = path.join(d, x.name)
    if (x.isDirectory()) walk(p)
    else if (x.isFile() && p.endsWith('.js')) {
      let c; try { c = fs.readFileSync(p, 'utf8') } catch { return }
      if (c.includes('游戏动态')) gameDynamic.push(p)
      const idx = c.indexOf('flexDirection')
      if (idx >= 0) {
        // 只收集 games 相关或含 row 的
        if (c.includes('flexDirection') && /flexDirection["']?\s*:\s*["']row/.test(c)) flexDir.push(p + ' :: ' + c.slice(idx, idx + 40).replace(/\n/g, ' '))
      }
    }
  }
}
walk('.next')
console.log('游戏动态 files:', gameDynamic.length)
gameDynamic.slice(0, 5).forEach(f => console.log('  ', f))
console.log('flexDirection row matches:', flexDir.length)
flexDir.slice(0, 5).forEach(s => console.log('  ', s))
