/** 探查：库内作品现有的「获取途径」覆盖率 */
import { realPrisma as prisma } from "../src/lib/prisma.ts"

const q = async (sql: string) => (await prisma.$queryRawUnsafe(sql)) as any[]

async function main() {
  const n = await prisma.work.count()
  const a = await q(`SELECT count(*)::int AS c FROM "Work" WHERE "officialUrl" <> ''`)
  const b = await q(`SELECT count(*)::int AS c FROM "Work" WHERE "steamAppId" <> ''`)
  const c = await q(`SELECT count(*)::int AS c FROM "Work" WHERE "officialWebsite" <> ''`)
  const d = await q(
    `SELECT count(*)::int AS c FROM "Work" WHERE "officialUrl" <> '' OR "steamAppId" <> '' OR "officialWebsite" <> ''`,
  )

  console.log("总作品数        =", n)
  console.log("officialUrl     =", a[0].c)
  console.log("steamAppId      =", b[0].c)
  console.log("officialWebsite =", c[0].c)
  console.log(`有任一获取线索  = ${d[0].c}  (${((d[0].c / n) * 100).toFixed(1)}%)`)
  console.log("完全无线索      =", n - d[0].c)

  const s = await q(`SELECT "officialUrl" FROM "Work" WHERE "officialUrl" <> '' LIMIT 5`)
  console.log("\nofficialUrl 样例:")
  s.forEach((x) => console.log("  " + String(x.officialUrl).slice(0, 90)))

  const st = await q(`SELECT "steamAppId" FROM "Work" WHERE "steamAppId" <> '' LIMIT 3`)
  console.log("steamAppId 样例:", st.map((x) => x.steamAppId).join(", "))

  // VNDB 缓存里是否带有外部链接
  const raw = await q(`SELECT raw FROM "WorkSource" LIMIT 1`)
  const keys = Object.keys(raw[0]?.raw?.results?.[0] ?? {})
  console.log("\nVNDB 缓存字段 =", keys.join(", "))
}

main()
  .catch((e) => console.error("失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
