/**
 * reconcile-link.ts  (D-H)
 * 只读：检查 Circleica Game ↔ Galvelica Work 关联一致性。
 *   - 悬空 gameId（Work.gameId 指向不存在的 Game）
 *   - 候选关联（Work 无 gameId 但标题命中某 Game.title）
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

async function main(): Promise<void> {
  h1("RECONCILE link: Game ↔ Work 关联 (D-H)")
  const dangling = (await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS cnt FROM "Work" w
    WHERE w."gameId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Game" g WHERE g.id = w."gameId")
  `)) as Array<{ cnt: number }>
  log(`\n[Work.gameId 悬空] 数量=${dangling[0]?.cnt ?? 0}`)

  const workNoGame = await prisma.work.count({ where: { gameId: null } })
  const workWithGame = await prisma.work.count({ where: { NOT: { gameId: null } } })
  log(`[Work] 有 gameId=${workWithGame}, 无 gameId=${workNoGame}`)

  const candidates = (await prisma.$queryRawUnsafe(`
    SELECT w.id, w.title, g.id AS candidate_game_id
    FROM "Work" w
    JOIN "Game" g ON g.title = w.title
    WHERE w."gameId" IS NULL
    LIMIT 50
  `)) as Array<{ id: string; title: string; candidate_game_id: string }>
  log(`\n[候选关联] 无 gameId 但标题命中 Game.title 的 Work 数=${candidates.length}`)
  if (candidates.length) rows("候选样例", candidates, 50)
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-link] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
