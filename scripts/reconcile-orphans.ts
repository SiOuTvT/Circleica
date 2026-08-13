/**
 * reconcile-orphans.ts  (D-D)
 * 只读：检查多态引用悬空——
 *   ViewHistory.targetId（GAME→Game / WORK→Work）
 *   Notification.targetId（forum_post / forum_comment / user / achievement / conversation）
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log } from "./reconcile/_report"

async function count1(sql: string): Promise<number> {
  const r = (await prisma.$queryRawUnsafe(sql)) as Array<{ cnt: number }>
  return r[0]?.cnt ?? 0
}

async function main(): Promise<void> {
  h1("RECONCILE orphans: 多态引用悬空 (D-D)")
  const viewGame = await count1(`
    SELECT COUNT(*)::int AS cnt FROM "ViewHistory" v
    WHERE v."targetType"='GAME' AND NOT EXISTS (SELECT 1 FROM "Game" g WHERE g.id=v."targetId")`)
  const viewWork = await count1(`
    SELECT COUNT(*)::int AS cnt FROM "ViewHistory" v
    WHERE v."targetType"='WORK' AND NOT EXISTS (SELECT 1 FROM "Work" w WHERE w.id=v."targetId")`)
  log(`\n[ViewHistory] GAME 悬空=${viewGame}, WORK 悬空=${viewWork}`)

  const notifTypes = ["forum_post", "forum_comment", "user", "achievement", "conversation"] as const
  const notifTables: Record<string, string> = {
    forum_post: "ForumPost",
    forum_comment: "ForumComment",
    user: "User",
    achievement: "Achievement",
    conversation: "Conversation",
  }
  for (const t of notifTypes) {
    const n = await count1(`
      SELECT COUNT(*)::int AS cnt FROM "Notification" n
      WHERE n."targetType"='${t}'
        AND NOT EXISTS (SELECT 1 FROM "${notifTables[t]}" x WHERE x.id=n."targetId")`)
    log(`[Notification] targetType=${t} 悬空=${n}`)
  }
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-orphans] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
