/**
 * reconcile-creator.ts  (D-C)
 * 只读：按 name 分组检测 Creator 重名（潜在重复创作者）。
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

async function main(): Promise<void> {
  h1("RECONCILE creator: 重名分组 (D-C)")
  const total = await prisma.creator.count()
  const dup = (await prisma.$queryRawUnsafe(`
    SELECT name, COUNT(*)::int AS cnt, array_agg(id) AS ids
    FROM "Creator"
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `)) as Array<{ name: string; cnt: number; ids: string[] }>
  log(`\nCreator total=${total}, 重名组数=${dup.length}`)
  if (dup.length) rows("重名组样例", dup, 50)
  else log("未发现 Creator 重名。")
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-creator] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
