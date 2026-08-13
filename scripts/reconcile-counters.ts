/**
 * reconcile-counters.ts  (D-E)
 * 只读：比对「计数器字段」与「实际关联行数」是否漂移。
 * 覆盖：Game.favoriteCount / downloadCount、Comment/ForumPost/ForumComment.likeCount
 * 使用 $queryRaw（代理识别为只读），SQL 为静态字面量，无外部输入。
 * 严禁任何写操作。
 */
import { prisma } from "@/lib/prisma"
import { h1, log, rows } from "./reconcile/_report"

const checks: Array<{ name: string; run: () => Promise<unknown[]> }> = [
  {
    name: "Game.favoriteCount vs Favorite",
    run: () =>
      prisma.$queryRaw`SELECT g.id, g."favoriteCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
        (g."favoriteCount" - COALESCE(c.cnt,0))::int AS diff
        FROM "Game" g
        LEFT JOIN (SELECT "gameId", COUNT(*) cnt FROM "Favorite" GROUP BY "gameId") c ON c."gameId" = g.id
        WHERE g."favoriteCount" <> COALESCE(c.cnt,0)
        ORDER BY ABS(g."favoriteCount" - COALESCE(c.cnt,0)) DESC LIMIT 50`,
  },
  {
    name: "Game.downloadCount vs ResourceDownloadLog",
    run: () =>
      prisma.$queryRaw`SELECT g.id, g."downloadCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
        (g."downloadCount" - COALESCE(c.cnt,0))::int AS diff
        FROM "Game" g
        LEFT JOIN (SELECT "gameId", COUNT(*) cnt FROM "ResourceDownloadLog" GROUP BY "gameId") c ON c."gameId" = g.id
        WHERE g."downloadCount" <> COALESCE(c.cnt,0)
        ORDER BY ABS(g."downloadCount" - COALESCE(c.cnt,0)) DESC LIMIT 50`,
  },
  {
    name: "Comment.likeCount vs CommentLike",
    run: () =>
      prisma.$queryRaw`SELECT cm.id, cm."likeCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
        (cm."likeCount" - COALESCE(c.cnt,0))::int AS diff
        FROM "Comment" cm
        LEFT JOIN (SELECT "commentId", COUNT(*) cnt FROM "CommentLike" GROUP BY "commentId") c ON c."commentId" = cm.id
        WHERE cm."likeCount" <> COALESCE(c.cnt,0)
        ORDER BY ABS(cm."likeCount" - COALESCE(c.cnt,0)) DESC LIMIT 50`,
  },
  {
    name: "ForumPost.likeCount vs ForumPostLike",
    run: () =>
      prisma.$queryRaw`SELECT p.id, p."likeCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
        (p."likeCount" - COALESCE(c.cnt,0))::int AS diff
        FROM "ForumPost" p
        LEFT JOIN (SELECT "postId", COUNT(*) cnt FROM "ForumPostLike" GROUP BY "postId") c ON c."postId" = p.id
        WHERE p."likeCount" <> COALESCE(c.cnt,0)
        ORDER BY ABS(p."likeCount" - COALESCE(c.cnt,0)) DESC LIMIT 50`,
  },
  {
    name: "ForumComment.likeCount vs ForumCommentLike",
    run: () =>
      prisma.$queryRaw`SELECT fc.id, fc."likeCount" AS stored, COALESCE(c.cnt,0)::int AS actual,
        (fc."likeCount" - COALESCE(c.cnt,0))::int AS diff
        FROM "ForumComment" fc
        LEFT JOIN (SELECT "commentId", COUNT(*) cnt FROM "ForumCommentLike" GROUP BY "commentId") c ON c."commentId" = fc.id
        WHERE fc."likeCount" <> COALESCE(c.cnt,0)
        ORDER BY ABS(fc."likeCount" - COALESCE(c.cnt,0)) DESC LIMIT 50`,
  },
]

async function main(): Promise<void> {
  h1("RECONCILE counters: 计数器漂移 (D-E)")
  for (const c of checks) {
    try {
      const data = (await c.run()) as Array<{ id: string; stored: number; actual: number; diff: number }>
      log(`\n### ${c.name}: 漂移行数=${data.length}`)
      if (data.length) rows("漂移样例", data, 20)
    } catch (e) {
      log(`### ${c.name}: 查询失败 - ${(e as Error)?.message ?? String(e)}`)
    }
  }
  log("\n说明：Work.favoriteCount / viewCount 无对应关系表，无法交叉核对，仅记录不评估。")
  log("DONE (只读，无写入)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[reconcile-counters] 致命错误:", e instanceof Error ? e.message : String(e))
    process.exit(1)
  })
