// 探测登录响应的 Set-Cookie
import { randomBytes } from 'crypto'
const BASE = process.env.BASE || 'http://localhost:3100'
const uname = 't_' + randomBytes(3).toString('hex')
const jar = new Map()
const cookieHeader = () => [...jar.entries()].map(([k,v]) => `${k}=${v}`).join('; ')

// 注册
let r = await fetch(BASE+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:BASE,Referer:BASE+'/'},body:JSON.stringify({username:uname,email:`${uname}@t.local`,password:'Test1234!',confirmPassword:'Test1234!'})})
console.log('register', r.status)
for (const sc of r.headers.getSetCookie?.()||[]) { const [p]=sc.split(';'); const i=p.indexOf('='); if(i>0) jar.set(p.slice(0,i).trim(), p.slice(i+1).trim()) }

// csrf
let c = await fetch(BASE+'/api/auth/csrf',{headers:{Cookie:cookieHeader()}})
const ct = (await c.json()).csrfToken
console.log('csrfToken:', ct ? 'yes' : 'none')

// 登录（URLSearchParams）
let l = await fetch(BASE+'/api/auth/callback/credentials',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:BASE,Referer:BASE+'/login',Cookie:cookieHeader()},body:new URLSearchParams({csrfToken:ct,identifier:uname,password:'Test1234!',callbackUrl:'/',json:'true'}),redirect:'follow'})
console.log('login status', l.status, 'url', l.url)
console.log('--- login Set-Cookie ---')
for (const sc of l.headers.getSetCookie?.()||[]) console.log('  ', sc.split(';')[0])
// 跟随重定向后继续收集
for (const sc of l.headers.getSetCookie?.()||[]) { const [p]=sc.split(';'); const i=p.indexOf('='); if(i>0) jar.set(p.slice(0,i).trim(), p.slice(i+1).trim()) }

// session 检查
let s = await fetch(BASE+'/api/auth/session',{headers:{Cookie:cookieHeader()}})
const sj = await s.json()
console.log('session:', JSON.stringify(sj).slice(0,120))
console.log('jar cookies:', [...jar.keys()].join(', '))
