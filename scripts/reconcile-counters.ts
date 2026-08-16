/**
 * B-18 计数一致性对账（只读，加 --fix 自动修复）
 *
 * 校验并可选修复以下冗余计数（应用层计数维护为原子 increment/decrement，正常不漂移；
 * 本脚本提供对账与应急修复网）：
 *   - Game.favoriteCount     ↔ Favorite 行数
 *   - Game.downloadCount     ↔ GameResourceEntry.downloadCount 之和
 *   - Comment.likeCount      ↔ CommentLike 行数
 *   - ForumPost.likeCount    ↔ ForumPostLike 行数
 *   - ForumComment.likeCount ↔ ForumCommentLike 行数
 *
 * 运行：
 *   npx tsx scripts/reconcile-counters.ts           # 仅报告
 *   npx tsx scripts/reconcile-counters.ts --fix     # 报告并修复漂移
 */
import { realPrisma as prisma } from "@/lib/prisma"


const FIX = process.argv.includes("--fix");

type CounterCheck = {
  label: string;
  selectSql: string;
  fixSql: string;
};

const checks: CounterCheck[] = [
  {
    label: "Game.favoriteCount",
    selectSql: `
      SELECT g.id, g."favoriteCount" AS stored, COALESCE(c.cnt,0) AS real_cnt
      FROM "Game" g
      LEFT JOIN (SELECT "gameId", COUNT(*)::int cnt FROM "Favorite" GROUP BY "gameId") c ON c."gameId" = g.id
      WHERE g."favoriteCount" IS DISTINCT FROM COALESCE(c.cnt,0)`,
    fixSql: `
      UPDATE "Game" SET "favoriteCount" = COALESCE((SELECT COUNT(*) FROM "Favorite" WHERE "Favorite"."gameId" = "Game"."id"), 0)
      WHERE "favoriteCount" IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM "Favorite" WHERE "Favorite"."gameId" = "Game"."id"), 0)`,
  },
  {
    label: "Game.downloadCount",
    selectSql: `
      SELECT g.id, g."downloadCount" AS stored, COALESCE(c.cnt,0) AS real_cnt
      FROM "Game" g
      LEFT JOIN (
        SELECT gr."gameId", SUM(gre."downloadCount")::int cnt
        FROM "GameResource" gr
        JOIN "GameResourceEntry" gre ON gre."resourceId" = gr."id"
        GROUP BY gr."gameId"
      ) c ON c."gameId" = g.id
      WHERE g."downloadCount" IS DISTINCT FROM COALESCE(c.cnt,0)`,
    fixSql: `
      UPDATE "Game" SET "downloadCount" = COALESCE((
        SELECT SUM(gre."downloadCount")::int
        FROM "GameResource" gr
        JOIN "GameResourceEntry" gre ON gre."resourceId" = gr."id"
        WHERE gr."gameId" = "Game"."id"
      ), 0)
      WHERE "downloadCount" IS DISTINCT FROM COALESCE((
        SELECT SUM(gre."downloadCount")::int
        FROM "GameResource" gr
        JOIN "GameResourceEntry" gre ON gre."resourceId" = gr."id"
        WHERE gr."gameId" = "Game"."id"
      ), 0)`,
  },
  {
    label: "Comment.likeCount",
    selectSql: `
      SELECT c.id, c."likeCount" AS stored, COALESCE(l.cnt,0) AS real_cnt
      FROM "Comment" c
      LEFT JOIN (SELECT "commentId", COUNT(*)::int cnt FROM "CommentLike" GROUP BY "commentId") l ON l."commentId" = c.id
      WHERE c."likeCount" IS DISTINCT FROM COALESCE(l.cnt,0)`,
    fixSql: `
      UPDATE "Comment" SET "likeCount" = COALESCE((SELECT COUNT(*) FROM "CommentLike" WHERE "CommentLike"."commentId" = "Comment"."id"), 0)
      WHERE "likeCount" IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM "CommentLike" WHERE "CommentLike"."commentId" = "Comment"."id"), 0)`,
  },
  {
    label: "ForumPost.likeCount",
    selectSql: `
      SELECT p.id, p."likeCount" AS stored, COALESCE(l.cnt,0) AS real_cnt
      FROM "ForumPost" p
      LEFT JOIN (SELECT "postId", COUNT(*)::int cnt FROM "ForumPostLike" GROUP BY "postId") l ON l."postId" = p.id
      WHERE p."likeCount" IS DISTINCT FROM COALESCE(l.cnt,0)`,
    fixSql: `
      UPDATE "ForumPost" SET "likeCount" = COALESCE((SELECT COUNT(*) FROM "ForumPostLike" WHERE "ForumPostLike"."postId" = "ForumPost"."id"), 0)
      WHERE "likeCount" IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM "ForumPostLike" WHERE "ForumPostLike"."postId" = "ForumPost"."id"), 0)`,
  },
  {
    label: "ForumComment.likeCount",
    selectSql: `
      SELECT c.id, c."likeCount" AS stored, COALESCE(l.cnt,0) AS real_cnt
      FROM "ForumComment" c
      LEFT JOIN (SELECT "commentId", COUNT(*)::int cnt FROM "ForumCommentLike" GROUP BY "commentId") l ON l."commentId" = c.id
      WHERE c."likeCount" IS DISTINCT FROM COALESCE(l.cnt,0)`,
    fixSql: `
      UPDATE "ForumComment" SET "likeCount" = COALESCE((SELECT COUNT(*) FROM "ForumCommentLike" WHERE "ForumCommentLike"."commentId" = "ForumComment"."id"), 0)
      WHERE "likeCount" IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM "ForumCommentLike" WHERE "ForumCommentLike"."commentId" = "ForumComment"."id"), 0)`,
  },
];

async function main() {
  console.log(`[reconcile-counters] FIX=${FIX}`);
  let totalDrift = 0;
  for (const check of checks) {
    const rows = (await prisma.$queryRawUnsafe(check.selectSql)) as Array<{
      id: string;
      stored: number;
      real_cnt: number;
    }>;
    const drift = rows.length;
    totalDrift += drift;
    if (drift > 0) {
      console.log(`[DRIFT] ${check.label}: ${drift} 行`);
      for (const r of rows.slice(0, 20)) {
        console.log(`   id=${r.id} stored=${r.stored} real=${r.real_cnt}`);
      }
      if (FIX) {
        const res = (await prisma.$executeRawUnsafe(check.fixSql)) as number;
        console.log(`[FIXED] ${check.label}: ${res} 行已修复`);
      }
    } else {
      console.log(`[OK] ${check.label}: 0 漂移`);
    }
  }
  console.log(`[reconcile-counters] 完成，漂移总数=${totalDrift}${FIX ? "（已尝试修复）" : ""}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[reconcile-counters] 失败", e);
    await prisma.$disconnect();
    process.exit(1);
  });
