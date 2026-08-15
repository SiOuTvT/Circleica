/**
 * B-19 成就解锁计数对账（只读，加 --fix 自动修复）
 *
 * 校验并可选修复 Achievement.unlockCount 与 UserAchievement 实际行数的一致性。
 * 应用层解锁用 @@unique([userId, achievementId]) + P2002 去重，并发安全；
 * 本脚本提供对账与应急修复网（如历史上手动删除 UserAchievement 未回退计数）。
 *
 * 运行：
 *   npx tsx scripts/reconcile-achievements.ts           # 仅报告
 *   npx tsx scripts/reconcile-achievements.ts --fix     # 报告并修复漂移
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FIX = process.argv.includes("--fix");

async function main() {
  console.log(`[reconcile-achievements] FIX=${FIX}`);
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT a.id, a."unlockCount" AS stored, COALESCE(u.cnt,0) AS real_cnt
    FROM "Achievement" a
    LEFT JOIN (SELECT "achievementId", COUNT(*)::int cnt FROM "UserAchievement" GROUP BY "achievementId") u ON u."achievementId" = a.id
    WHERE a."unlockCount" IS DISTINCT FROM COALESCE(u.cnt,0)
  `)) as Array<{ id: string; stored: number; real_cnt: number }>;

  if (rows.length > 0) {
    console.log(`[DRIFT] Achievement.unlockCount: ${rows.length} 行`);
    for (const r of rows.slice(0, 20)) {
      console.log(`   id=${r.id} stored=${r.stored} real=${r.real_cnt}`);
    }
    if (FIX) {
      const res = (await prisma.$executeRawUnsafe(`
        UPDATE "Achievement" SET "unlockCount" = COALESCE((SELECT COUNT(*) FROM "UserAchievement" WHERE "UserAchievement"."achievementId" = "Achievement"."id"), 0)
        WHERE "unlockCount" IS DISTINCT FROM COALESCE((SELECT COUNT(*) FROM "UserAchievement" WHERE "UserAchievement"."achievementId" = "Achievement"."id"), 0)
      `)) as number;
      console.log(`[FIXED] Achievement.unlockCount: ${res} 行已修复`);
    }
  } else {
    console.log(`[OK] Achievement.unlockCount: 0 漂移`);
  }
  console.log(`[reconcile-achievements] 完成`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("[reconcile-achievements] 失败", e);
    await prisma.$disconnect();
    process.exit(1);
  });
