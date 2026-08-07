/* 恢复擦边分级：撤销武断的 1→2 合并，擦边/不确定全部送回待审核（人工裁决） */
const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

async function main() {
  const r1 = await p.$executeRawUnsafe(`UPDATE "Work" SET "coverSexual" = -1 WHERE "coverSexual" = 1`)
  console.log("① coverSexual=1 残留 → 待审核:", r1)

  const rows = await p.$queryRaw`
    SELECT w.id, ws.raw FROM "Work" w
    JOIN "WorkSource" ws ON ws."workId" = w.id AND ws.source = 'VNDB'
    WHERE w."coverSexual" = 2 AND (w."coverSexualSource" IS NULL OR w."coverSexualSource" <> 'manual')
  `
  let reverted = 0, kept = 0, noRaw = 0
  for (const r of rows) {
    try {
      const raw = JSON.parse(JSON.stringify(r.raw))
      const vn = Array.isArray(raw?.results) ? raw.results[0] : raw
      const sexual = vn?.image?.sexual
      if (sexual === 1) {
        await p.work.update({ where: { id: r.id }, data: { coverSexual: -1 } })
        reverted++
      } else if (sexual === 2) {
        kept++
      } else {
        noRaw++
      }
    } catch {
      noRaw++
    }
  }
  console.log("② 撤销合并: 恢复待审核", reverted, "/ 确认NSFW", kept, "/ 无法解析保持", noRaw)

  const d = await p.$queryRaw`SELECT "coverSexual", COUNT(*)::int AS n FROM "Work" GROUP BY "coverSexual" ORDER BY "coverSexual"`
  console.log("最终分布:", JSON.stringify(d))
  await p.$disconnect()
}

main().catch((e) => { console.error(e.message); process.exit(1) })
