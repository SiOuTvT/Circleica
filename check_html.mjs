import http from 'http'
function get(url) {
  return new Promise((res, rej) => {
    const r = http.get(url, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ s: x.statusCode, b: d })) })
    r.on('error', rej); r.setTimeout(30000, () => r.destroy(new Error('to')))
  })
}
(async () => {
  const html = (await get('http://localhost:3000/games/41')).b
  console.log('status', (await get('http://localhost:3000/games/41')).s, 'len', html.length)
  for (const k of ['flex-direction', 'flexDirection', '游戏动态', '暂无动态', '下载链接', '后台配置的下载链接', 'display:flex']) {
    const cnt = (html.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    console.log(k, '=>', cnt)
  }
  const m = html.match(/style="[^"]*flex[^"]*"/i)
  console.log('style with flex:', m ? m[0] : 'NONE')
})().catch(e => console.log('ERR', e.message))
