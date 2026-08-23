const fs = require('fs')
const { Client } = require('pg')
const env = fs.readFileSync('d:/Circleica/.env', 'utf8')
const url = env.match(/DATABASE_URL="([^"]+)"/)[1]

;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  // 标签颜色分布 + 组颜色
  const tags = await c.query(`SELECT "color", count(*) FROM "Tag" GROUP BY "color" ORDER BY 2 DESC LIMIT 12`)
  console.log('=== Tag.color 分布 ===')
  for (const r of tags.rows) console.log(JSON.stringify(r.color), r.count)
  const groups = await c.query(`SELECT id, "color" FROM "TagGroup" ORDER BY name`)
  console.log('=== TagGroup 颜色 ===')
  for (const r of groups.rows) console.log(r.id, '=>', JSON.stringify(r.color))
  // 详情页/发现页/首页卡片/资源 几个预设组颜色（来自 TagGroup 或 SiteSetting? 看 TagGroup 是否有这些 id）
  await c.end()
})().catch(e => { console.error('ERR', String(e)); process.exit(1) })
