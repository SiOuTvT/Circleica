// 临时：列出本地用户（id/username/email/role），供测试登录用
import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const r = await c.query('SELECT id, "serialId", username, email, role, "emailVerified" FROM "User" ORDER BY "createdAt"')
for (const u of r.rows) console.log(`[${u.role}] ${u.username} | ${u.email} | id=${u.id}`)
await c.end()
