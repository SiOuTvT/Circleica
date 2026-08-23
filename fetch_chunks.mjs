import http from 'http'
function get(url) {
  return new Promise((res, rej) => {
    const r = http.get(url, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ s: x.statusCode, b: d })) })
    r.on('error', rej); r.setTimeout(30000, () => r.destroy(new Error('timeout')))
  })
}
(async () => {
  const html = (await get('http://localhost:3000/games/41')).b
  const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/[^"]+\.js)"/g)].map(m => m[1]))]
  console.log('found', urls.length, 'js urls in html')
  let hit = []
  for (const u of urls) {
    try {
      const r = await get('http://localhost:3000' + u)
      const b = r.b
      if (b.includes('游戏动态') || /flexDirection["']?\s*:\s*["']row/.test(b)) hit.push(u + ' (len=' + b.length + ')')
    } catch (e) {}
  }
  console.log('HITS with 游戏动态/flexRow:', hit)
  if (hit.length === 0) {
    console.log('--- HTML TAIL (last 1200 chars) ---')
    console.log(html.slice(-1200))
  }
})().catch(e => console.log('ERR', e.message))
