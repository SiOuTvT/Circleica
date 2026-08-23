import http from 'http'
import fs from 'fs'
import path from 'path'

function get(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, len: d.length }))
    })
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}
async function poll() {
  for (let i = 0; i < 150; i++) {
    try { await get('http://localhost:3000/', 3000); console.log('PORT_UP after', i, 's'); return } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('port never up')
}
function findFlexWrap() {
  let found = []
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile() && p.endsWith('.js')) {
        let c; try { c = fs.readFileSync(p, 'utf8') } catch { return }
        if (c.includes('flexWrap:"wrap"') || c.includes("flexWrap:'wrap'") || c.includes('flexDirection:"row"')) {
          found.push(p)
        }
      }
    }
  }
  walk('.next')
  return found
}
(async () => {
  await poll()
  console.log('preheating /games/41 ...')
  const t = Date.now()
  const r1 = await get('http://localhost:3000/games/41', 300000)
  console.log('first GET', r1, 'took', Date.now() - t, 'ms')
  const r2 = await get('http://localhost:3000/games/41', 180000)
  console.log('second GET', r2)
  await new Promise(r => setTimeout(r, 3000))
  const hits = findFlexWrap()
  console.log('FLEXWRAP_HITS:', JSON.stringify(hits, null, 2))
  console.log(hits.length ? 'COMPILED_NEW_CODE_OK' : 'NEW_CODE_NOT_IN_NEXT')
})().catch(e => console.log('ERR', e.message))
