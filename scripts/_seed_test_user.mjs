// 用 bcrypt 直接创建测试用户（绕过注册限流），打印登录凭据
import pg from 'pg'
import bcrypt from 'bcryptjs'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const username = 'func_test'
// 先删旧的同名测试用户，避免冲突
await c.query('DELETE FROM "User" WHERE username = $1', [username])
const password = 'FuncTest#2026!'
const hash = bcrypt.hashSync(password, 12)
await c.query(
  `INSERT INTO "User" ("id","serialId","username","email","password","role","emailVerified","createdAt","updatedAt")
   VALUES ($1,$2,$3,$4,$5,'USER',true,NOW(),NOW())`,
  ['user_' + Date.now(), Math.floor(Math.random()*1e6), username, username+'@func.local', hash]
)
console.log('SEED_USER=' + username)
console.log('SEED_PASS=' + password)
await c.end()
