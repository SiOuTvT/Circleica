import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const r = await c.query(`SELECT key, value FROM "SiteSetting" WHERE key LIKE '%verif%' OR key LIKE '%login%'`)
for (const x of r.rows) console.log(`${x.key} = ${x.value}`)
// 看测试用户 emailVerified
const u = await c.query(`SELECT username, "emailVerified" FROM "User" WHERE username LIKE 't_%' ORDER BY "createdAt" DESC LIMIT 3`)
for (const x of u.rows) console.log(`user ${x.username} emailVerified=${x.emailVerified}`)
await c.end()
