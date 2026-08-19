// 临时脚本：检查本地 circleica 库有哪些种子数据（仅探测）
import pg from 'pg'
const { Client } = pg
const c = new Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const tables = ['User','Game','GameRating','Follow','Favorite','CheckIn','EmotionalMessage','ForumPost','Comment','Work','Notification','SiteSetting']
for (const t of tables) {
  try {
    const r = await c.query(`SELECT COUNT(*) AS n FROM "${t}"`)
    console.log(`${t}: ${r.rows[0].n}`)
  } catch (e) { console.log(`${t}: ERR ${e.message}`) }
}
await c.end()
