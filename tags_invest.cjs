const fs = require('fs')
const { Client } = require('pg')
const env = fs.readFileSync('d:/Circleica/.env', 'utf8')
const m = env.match(/DATABASE_URL="([^"]+)"/)
if (!m) { console.log('no DATABASE_URL'); process.exit(1) }
const url = m[1]
console.log('URL =', url)
;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  const out = []
  const q = async (label, sql) => { const r = await c.query(sql); out.push(label + ': ' + JSON.stringify(r.rows[0])) }
  await q('1) 全部circleica标签总数', `SELECT count(*) FROM "Tag" WHERE "source"='circleica'`)
  const byGroup = await c.query(`SELECT COALESCE("groupId",'NULL') AS gid, count(*) FROM "Tag" WHERE "source"='circleica' GROUP BY "groupId" ORDER BY gid`)
  let b = '2) 按groupId分布:'
  for (const r of byGroup.rows) b += `  ${r.gid}=${r.count}`
  out.push(b)
  await q('3) preset_detail_header组内', `SELECT count(*) FROM "Tag" WHERE "source"='circleica' AND "groupId"='preset_detail_header'`)
  await q('4) 其中已发布游戏关联', `SELECT count(*) FROM "Tag" t WHERE t."source"='circleica' AND t."groupId"='preset_detail_header' AND EXISTS (SELECT 1 FROM "GameTag" gt JOIN "Game" g ON g.id=gt."gameId" WHERE gt."tagId"=  t.id AND g."isPublished"=true)`)
  await q('5) GameTag总行数', `SELECT count(*) FROM "GameTag"`)
  await q('6) 已发布游戏关联数', `SELECT count(*) FROM "GameTag" gt JOIN "Game" g ON g.id=gt."gameId" WHERE g."isPublished"=true`)
  await q('7) 草稿游戏关联数', `SELECT count(*) FROM "GameTag" gt JOIN "Game" g ON g.id=gt."gameId" WHERE g."isPublished"=false`)
  await q('8) preset_discover组内', `SELECT count(*) FROM "Tag" WHERE "source"='circleica' AND "groupId"='preset_discover'`)
  await q('9) preset_home_card组内', `SELECT count(*) FROM "Tag" WHERE "source"='circleica' AND "groupId"='preset_home_card'`)
  await q('10) preset_resource_tab组内', `SELECT count(*) FROM "Tag" WHERE "source"='circleica' AND "groupId"='preset_resource_tab'`)
  console.log(out.join('\n'))
  await c.end()
})().catch(e => { console.error('ERR:', String(e)); process.exit(1) })
