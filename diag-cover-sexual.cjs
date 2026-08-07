/* 诊断：被武断合并的擦边(1)现在在哪？按 raw.image.sexual 全量对账 */
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  // coverSexual=2 的作品里，raw.image.sexual 分布
  const r2 = await p.$queryRaw`
    SELECT w."coverSexual", vn_sex."sexual" AS raw_sexual, COUNT(*)::int AS n
    FROM "Work" w
    JOIN "WorkSource" ws ON ws."workId" = w.id AND ws.source = 'VNDB',
    LATERAL (SELECT (ws.raw -> 'results' -> 0 -> 'image' ->> 'sexual')::int AS sexual) vn_sex
    WHERE w."coverSexual" = 2
    GROUP BY w."coverSexual", vn_sex."sexual"
    ORDER BY vn_sex."sexual"
  `
  console.log("coverSexual=2 且 raw.sexual 分布:", JSON.stringify(r2))

  // coverSexual=-1 里 raw.sexual 分布
  const rn = await p.$queryRaw`
    SELECT vn_sex."sexual" AS raw_sexual, COUNT(*)::int AS n
    FROM "Work" w
    JOIN "WorkSource" ws ON ws."workId" = w.id AND ws.source = 'VNDB',
    LATERAL (SELECT (ws.raw -> 'results' -> 0 -> 'image' ->> 'sexual')::int AS sexual) vn_sex
    WHERE w."coverSexual" = -1
    GROUP BY vn_sex."sexual"
    ORDER BY vn_sex."sexual"
  `
  console.log("coverSexual=-1 里 raw.sexual 分布:", JSON.stringify(rn))
  await p.$disconnect()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
