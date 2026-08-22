const fs = require('fs')
const { Client } = require('pg')
const env = fs.readFileSync('d:/Circleica/.env', 'utf8')
const m = env.match(/DATABASE_URL="([^"]+)"/)
const url = m[1]
;(async () => {
  const c = new Client({ connectionString: url })
  await c.connect()
  const r = await c.query(
    `UPDATE "Tag" SET "groupId"='preset_detail_header' WHERE "source"='circleica' AND ("groupId" IS NULL OR "groupId" NOT IN ('preset_home_card','preset_detail_header','preset_discover','preset_resource_tab'))`
  )
  console.log('更新行数:', r.rowCount)
  const check = await c.query(`SELECT "groupId", count(*) FROM "Tag" WHERE "source"='circleica' GROUP BY "groupId" ORDER BY 1`)
  for (const row of check.rows) console.log('  ', row.groupId, '=', row.count)
  await c.end()
})().catch(e => { console.error('ERR:', String(e)); process.exit(1) })
