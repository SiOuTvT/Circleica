// 功能连通性测试 v2：修正登录 cookie 处理 + 真实 API 路径 + 后台读取验证
import { randomBytes } from 'crypto'

const BASE = process.env.BASE || 'http://localhost:3100'
let jar = new Map()
const results = []
function log(name, ok, detail) { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`) }
function cookieHeader() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ') }
async function req(method, path, { body, follow = true } = {}) {
  const headers = { 'Content-Type': 'application/json', Origin: BASE, Referer: BASE + '/' }
  if (jar.size) headers.Cookie = cookieHeader()
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: follow ? 'follow' : 'manual' })
  const scs = r.headers.getSetCookie?.() || []
  for (const sc of scs) { const [pair] = sc.split(';'); const i = pair.indexOf('='); if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim()) }
  let data = null; try { data = await r.json() } catch {}
  return { status: r.status, data, url: r.url }
}

const uname = 't_' + randomBytes(3).toString('hex')
console.log('== 阶段1: 注册+登录 ==')
let reg = await req('POST', '/api/auth/register', { body: { username: uname, email: `${uname}@test.local`, password: 'Test1234!', confirmPassword: 'Test1234!' } })
log('注册', reg.status === 201, `user=${uname}`)

const csrf = await req('GET', '/api/auth/csrf')
log('取csrf', csrf.status === 200 && csrf.data?.csrfToken)
// 用表单编码走 credentials 登录（NextAuth 标准）
const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE, Referer: BASE + '/login' },
  body: new URLSearchParams({ csrfToken: csrf.data?.csrfToken || '', identifier: uname, password: 'Test1234!', callbackUrl: '/', json: 'true' }),
  redirect: 'follow',
})
for (const sc of loginRes.headers.getSetCookie?.() || []) { const [pair] = sc.split(';'); const i = pair.indexOf('='); if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim()) }
log('登录(cookie保留)', loginRes.status === 200, `status=${loginRes.status} cookies=${jar.size}`)

let ses = await req('GET', '/api/auth/session')
log('会话有效', !!ses.data?.user, ses.data?.user ? `user=${ses.data.user.name} role=${ses.data.user.role}` : '无session')

console.log('\n== 阶段2: 前台写操作（需登录）==')
let checkin = await req('POST', '/api/checkin', { body: {} })
log('签到', [200,201].includes(checkin.status), `status=${checkin.status}`)

// 取游戏
let gres = await req('GET', '/api/games')
const games = gres.data?.data || (Array.isArray(gres.data) ? gres.data : [])
log('游戏列表', games.length > 0, `count=${games.length}`)
let gameId = games[0]?.id
if (gameId) {
  let fav = await req('POST', `/api/games/${gameId}/favorite`, { body: {} })
  log('收藏游戏', [200,201].includes(fav.status), `status=${fav.status}`)
  let rate = await req('POST', `/api/games/${gameId}/rating`, { body: { score: 5 } })
  log('评分游戏', [200,201].includes(rate.status), `status=${rate.status}`)
  let cmt = await req('POST', `/api/comments`, { body: { gameId, content: '连通性测试评论' } })
  log('游戏评论', [200,201].includes(cmt.status), `status=${cmt.status}`)
}

// 关注另一个用户
const otherUser = 'demo_user'
let follow = await req('POST', `/api/follow/cmskpf5ov0000tl1s5fnc2pgz`, { body: {} })
log('关注demo_user', [200,201].includes(follow.status), `status=${follow.status} ${follow.data ? JSON.stringify(follow.data).slice(0,60) : ''}`)

// 论坛发帖
let post = await req('POST', '/api/forum/posts', { body: { title: '连通性测试帖', content: '测试内容', category: 'general' } })
log('论坛发帖', [200,201].includes(post.status), `status=${post.status} ${post.data ? JSON.stringify(post.data).slice(0,60) : ''}`)

// 情感消息
let emo = await req('GET', '/api/emotional-messages')
log('情感消息', emo.status === 200, emo.data ? `count=${Array.isArray(emo.data) ? emo.data.length : (emo.data.data?.length || '?')}` : 'no')

// 成就
let ach = await req('GET', '/api/achievements')
log('成就列表', ach.status === 200)

// 通知
let notif = await req('GET', '/api/notifications')
log('通知列表', notif.status === 200)

console.log('\n===== 汇总 =====')
const pass = results.filter(r => r.ok).length
const fail = results.filter(r => !r.ok).length
console.log(`${pass} PASS / ${fail} FAIL / ${results.length} TOTAL`)
if (fail) { console.log('失败:'); results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.detail}`)) }
process.exit(fail ? 1 : 0)
