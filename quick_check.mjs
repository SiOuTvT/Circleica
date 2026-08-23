import fs from 'fs'
try {
  const top = fs.readdirSync('.next')
  console.log('NEXT_TOP:', top.join(', '))
  let n = 0
  function w(d) {
    let e; try { e = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const x of e) {
      const p = d + '/' + x.name
      if (x.isDirectory()) w(p)
      else if (x.name.endsWith('.js')) n++
    }
  }
  w('.next')
  console.log('JS_FILES:', n)
  const gamesPage = '.next/server/app/games/[id]/page.js'
  console.log('games page exists:', fs.existsSync(gamesPage))
  // 列出 static/chunks 顶层
  try { console.log('CHUNKS_TOP:', fs.readdirSync('.next/static/chunks').slice(0, 20).join(', ')) } catch (e) { console.log('no chunks dir') }
} catch (e) { console.log('ERR', e.message) }
