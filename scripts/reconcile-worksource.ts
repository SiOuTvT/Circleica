/**
 * reconcile-worksource.ts  (D-B)
 * 只读：检查 WorkSource 中 (source, externalId) 重复分组——
 * 即同一外部源作品被映射到多个内部 Work（潜在重复摄入）。
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

async function main(): Promise<void> {
  h1("RECONCILE WorkSource: (source, externalId) 重复 (D-B)")
  const total = await prisma.workSource.count()
  const dup = (await prisma.$queryRaw`
    SELECT "source", "externalId", COUNT(*)::int AS cnt, array_agg("workId") AS work_ids
    FROM "WorkSource"
    GROUP BY "source", "externalId"
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 50
  `) as Array<{ source: string; externalId: string; cnt: number; work_ids: string[] }>
  log(`\nWorkSource total=${total}, 重复 (source,externalId) 组数=${dup.length}`)
  if (dup.length) {
    rows("重复组样例", dup, 50)
    log(`\n建议：重复组数 > 0 表示存在同一外部作品映射到多个 Work，需评估合并或加唯一约束。`)
  } else {
    log("未发现 (source, externalId) 重复分组。")
  }
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-worksource] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
