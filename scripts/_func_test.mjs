// 功能连通性测试：前台动作 → API → 后台可读
// 目标：主站前台/后台、副站前台/后台 各功能链路
import { randomBytes } from 'crypto'

const BASE = process.env.BASE || 'http://localhost:3100'
let cookieJar = {}
const results = []
function log(name, ok, detail) {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}
function cookieHeader() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ')
}
async function req(method, path, { body, expectAuth } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (Object.keys(cookieJar).length) headers.Cookie = cookieHeader()
  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  const setCookies = r.headers.getSetCookie?.() || []
  for (const sc of setCookies) {
    const [pair] = sc.split(';')
    const [k, v] = pair.split('=')
    if (k && v) cookieJar[k.trim()] = v.trim()
  }
  let data = null
  try { data = await r.json() } catch { /* non-json */ }
  return { status: r.status, data }
}

// 1. 注册测试用户
const uname = 't_' + randomBytes(3).toString('hex')
let reg = await req('POST', '/api/auth/register', {
  body: { username: uname, email: `${uname}@test.local`, password: 'Test1234!', confirmPassword: 'Test1234!' },
})
log('注册用户', [200, 201].includes(reg.status), `user=${uname} status=${reg.status} email=${uname}@test.local`)

// 2. 登录
let login = await req('POST', '/api/auth/callback/credentials', {
  body: { identifier: uname, password: 'Test1234!', csrfToken: '', callbackUrl: '/', json: true },
})
// NextAuth credentials 登录需要 csrf token，先取
const csrf = await req('GET', '/api/auth/csrf')
if (csrf.data?.csrfToken) cookieJar['csrfToken'] = csrf.data.csrfToken
login = await req('POST', '/api/auth/callback/credentials', {
  body: { identifier: uname, password: 'Test1234!', csrfToken: csrf.data.csrfToken, callbackUrl: '/', json: true },
})
log('登录', login.status === 200, `status=${login.status} cookies=${Object.keys(cookieJar).length}`)

// 3. 验证 session
let me = await req('GET', '/api/auth/session')
log('获取会话', !!me.data?.user, me.data?.user ? `user=${me.data.user.name}` : 'no session')

// 4. 前台可读 API（游客或登录）
const publicChecks = [
  ['/api/emotional-messages', '情感消息(游客)'],
  ['/api/site-settings', '站点设置(游客)'],
  ['/api/music', '音乐列表(游客)'],
  ['/api/games', '游戏列表(游客)'],
  ['/api/achievements', '成就列表(游客)'],
  ['/api/discover', '发现页(游客)'],
  ['/api/ranking', '排行榜(游客)'],
  ['/api/forum', '论坛(游客)'],
]
for (const [p, n] of publicChecks) {
  const r = await req('GET', p)
  const ok = r.status === 200
  const detail = Array.isArray(r.data) ? `count=${r.data.length}` : (r.data?.data ? `items=${Array.isArray(r.data.data)?r.data.data.length:'?'}` : `status=${r.status}`)
  log(`${n}`, ok, detail)
}

// 5. 需要登录的写操作
const gm = await req('GET', '/api/games')
let gameId = null
if (Array.isArray(gm.data)) gameId = gm.data[0]?.id
else if (gm.data?.data?.length) gameId = gm.data.data[0].id
log('获取游戏ID', !!gameId, gameId ? `id=${gameId}` : '无游戏')

if (gameId) {
  const fav = await req('POST', `/api/games/${gameId}/favorite`, { body: {} })
  log('收藏游戏', [200,201,204].includes(fav.status), `status=${fav.status}`)

  const rate = await req('POST', `/api/games/${gameId}/rating`, { body: { score: 5 } })
  log('评分游戏', [200,201].includes(rate.status), `status=${rate.status} ${rate.data?JSON.stringify(rate.data).slice(0,80):''}`)
}

// 6. 关注/取消关注（找另一个用户）
const users = await req('GET', '/api/users')
log('获取用户列表', users.status === 200, `status=${users.status}`)

// 7. 签到
const checkin = await req('POST', '/api/checkin', { body: {} })
log('签到', [200,201].includes(checkin.status), `status=${checkin.status}`)

// 8. 汇总
const pass = results.filter(r => r.ok).length
const fail = results.filter(r => !r.ok).length
console.log(`\n===== 汇总: ${pass} PASS / ${fail} FAIL / ${results.length} TOTAL =====`)
if (fail > 0) {
  console.log('失败项:')
  results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.name}: ${r.detail}`))
}
process.exit(fail > 0 ? 1 : 0)
