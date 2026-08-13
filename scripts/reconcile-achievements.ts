/**
 * reconcile-achievements.ts  (D-F)
 * 只读：比对 Achievement.unlockCount 与实际 UserAchievement 解锁记录数。
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

async function main(): Promise<void> {
  h1("RECONCILE achievements: unlockCount 漂移 (D-F)")
  const total = await prisma.achievement.count()
  const data = (await prisma.$queryRawUnsafe(`
    SELECT a.id, a.name, a."unlockCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
           (a."unlockCount" - COALESCE(c.cnt,0))::int AS diff
    FROM "Achievement" a
    LEFT JOIN (SELECT "achievementId", COUNT(*) cnt FROM "UserAchievement" GROUP BY "achievementId") c
      ON c."achievementId" = a.id
    WHERE a."unlockCount" <> COALESCE(c.cnt,0)
    ORDER BY ABS(a."unlockCount" - COALESCE(c.cnt,0)) DESC
    LIMIT 50
  `)) as Array<{ id: string; name: string; stored: number; actual: number; diff: number }>
  log(`\nAchievement total=${total}, unlockCount 漂移行数=${data.length}`)
  if (data.length) rows("漂移样例", data, 50)
  else log("未发现 unlockCount 漂移。")
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-achievements] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
