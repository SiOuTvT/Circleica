/** 导出 作品标题 → VNDB ID 映射，供人工校正译名时精确绑定 */
import { writeFileSync } from "node:fs"
import { realPrisma as prisma } from "../src/lib/prisma.ts"

async function main() {
  const src = (await prisma.$queryRawUnsafe(
    `SELECT "workId", "externalId" FROM "WorkSource" WHERE source = 'VNDB'`,
  )) as { workId: string; externalId: string }[]
  const idByWork = new Map(src.map((s) => [s.workId, s.externalId]))

  const works = await prisma.work.findMany({
    select: { id: true, title: true, englishName: true },
  })
  const out = works.map((w) => ({
    vndbId: idByWork.get(w.id) ?? "",
    title: w.title,
    en: w.englishName,
  }))
  writeFileSync("data/work-ids.json", JSON.stringify(out))
  console.log("已写出 data/work-ids.json，条数 =", out.length)
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
