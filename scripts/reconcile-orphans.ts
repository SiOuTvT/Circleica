/**
 * reconcile-orphans.ts  (D-D)
 * 只读：检查多态引用悬空——
 *   ViewHistory.targetId（GAME→Game / WORK→Work）
 *   Notification.targetId（forum_post / forum_comment / user / achievement / conversation）
 * 使用 $queryRaw（代理识别为只读），表名均为本脚本硬编码常量。严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log } from "./reconcile/_report"

async function count1(sql: TemplateStringsArray): Promise<number> {
  const r = (await prisma.$queryRaw(sql)) as Array<{ cnt: number }>
  return r[0]?.cnt ?? 0
}

async function main(): Promise<void> {
  h1("RECONCILE orphans: 多态引用悬空 (D-D)")
  const viewGame = await count1`SELECT COUNT(*)::int AS cnt FROM "ViewHistory" v
    WHERE v."targetType"='GAME' AND NOT EXISTS (SELECT 1 FROM "Game" g WHERE g.id=v."targetId")`
  const viewWork = await count1`SELECT COUNT(*)::int AS cnt FROM "ViewHistory" v
    WHERE v."targetType"='WORK' AND NOT EXISTS (SELECT 1 FROM "Work" w WHERE w.id=v."targetId")`
  log(`\n[ViewHistory] GAME 悬空=${viewGame}, WORK 悬空=${viewWork}`)

  const forumPost = await count1`SELECT COUNT(*)::int AS cnt FROM "Notification" n
    WHERE n."targetType"='forum_post' AND NOT EXISTS (SELECT 1 FROM "ForumPost" p WHERE p.id=n."targetId")`
  const forumComment = await count1`SELECT COUNT(*)::int AS cnt FROM "Notification" n
    WHERE n."targetType"='forum_comment' AND NOT EXISTS (SELECT 1 FROM "ForumComment" c WHERE c.id=n."targetId")`
  const user = await count1`SELECT COUNT(*)::int AS cnt FROM "Notification" n
    WHERE n."targetType"='user' AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id=n."targetId")`
  const achievement = await count1`SELECT COUNT(*)::int AS cnt FROM "Notification" n
    WHERE n."targetType"='achievement' AND NOT EXISTS (SELECT 1 FROM "Achievement" a WHERE a.id=n."targetId")`
  const conversation = await count1`SELECT COUNT(*)::int AS cnt FROM "Notification" n
    WHERE n."targetType"='conversation' AND NOT EXISTS (SELECT 1 FROM "Conversation" c WHERE c.id=n."targetId")`
  log(`[Notification] forum_post=${forumPost}, forum_comment=${forumComment}, user=${user}, achievement=${achievement}, conversation=${conversation}`)
  log("\nDONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-orphans] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
