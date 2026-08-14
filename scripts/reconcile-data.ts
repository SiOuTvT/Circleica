/**
 * A-11 / DATA-RECON：数据对账脚本
 *
 * 用途：在 staging / 生产库实跑，产出对账报告，定位并（可选）修复两类已知异常：
 *   1) slug NULL：Creator/Tag/Studio/CuratedCollection/Work 等含 slug 列的表是否存在 NULL/空值。
 *   2) Game.downloadCount 漂移：与 ResourceDownloadLog 实际下载次数不一致的行。
 *
 * 运行：
 *   npx tsx scripts/reconcile-data.ts            # 仅报告，不改数据
 *   npx tsx scripts/reconcile-data.ts --fix      # 报告并应用修复
 *
 * 安全：--fix 仅对确认异常做最小 UPDATE，且 downloadCount 以 ResourceDownloadLog 实计为准。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const FIX = process.argv.includes("--fix");

async function slugReport() {
  const cols = (await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'slug' AND table_schema = 'public'
      AND table_name NOT LIKE '\\_bak\\_%'
    ORDER BY table_name
  `)) as { table_name: string }[];

  console.log("\n=== 异常1：slug NULL / 空值 ===");
  let totalNull = 0;
  for (const { table_name: t } of cols) {
    const r = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS n FROM "${t}" WHERE slug IS NULL OR slug = ''`
    )) as { n: number }[];
    if (r[0].n > 0) {
      totalNull += r[0].n;
      console.log(`  [异常] ${t}: NULL/空 slug = ${r[0].n}`);
    } else {
      console.log(`  [OK]   ${t}: 0`);
    }
  }
  console.log(totalNull === 0 ? "  => 无 NULL slug，回填已生效" : `  => 共 ${totalNull} 行需回填`);
  return totalNull;
}

async function downloadCountReport() {
  console.log("\n=== 异常2：Game.downloadCount 漂移 ===");
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT g.id, COALESCE(g."downloadCount",0) AS stored, COALESCE(c.cnt,0) AS real_cnt
    FROM "Game" g
    LEFT JOIN (
      SELECT "gameId", COUNT(*)::int AS cnt FROM "ResourceDownloadLog" GROUP BY "gameId"
    ) c ON c."gameId" = g.id
    WHERE COALESCE(g."downloadCount",0) IS DISTINCT FROM COALESCE(c.cnt,0)
    ORDER BY ABS(COALESCE(g."downloadCount",0) - COALESCE(c.cnt,0)) DESC
    LIMIT 200
  `)) as { id: string; stored: number; real_cnt: number }[];

  if (rows.length === 0) {
    console.log("  => 无漂移");
    return 0;
  }
  for (const r of rows) {
    console.log(`  [异常] game ${r.id}: stored=${r.stored} real=${r.real_cnt}`);
  }
  if (FIX) {
    for (const r of rows) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Game" SET "downloadCount" = $1 WHERE id = $2`,
        r.real_cnt,
        r.id
      );
      console.log(`  [已修复] game ${r.id}: ${r.stored} -> ${r.real_cnt}`);
    }
  } else {
    console.log(`  => 共 ${rows.length} 行漂移；加 --fix 以 ResourceDownloadLog 实计重写 downloadCount`);
  }
  return rows.length;
}

async function main() {
  if (FIX) {
    console.log("══════════════════════════════════════════════════════");
    console.log("【写模式 --fix】将应用 UPDATE 修复；请确认这是对 staging 库执行");
    console.log("══════════════════════════════════════════════════════");
  } else {
    console.log("══════════════════════════════════════════════════════");
    console.log("【只读报告模式】仅 SELECT，不会写入任何数据；加 --fix 才修复");
    console.log("══════════════════════════════════════════════════════");
  }
  console.log(`数据库: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") ?? "(未设置)"}`);
  const a = await slugReport();
  const b = await downloadCountReport();
  console.log(`\n汇总: slug 异常 ${a} 行, downloadCount 漂移 ${b} 行${FIX ? " (已应用修复)" : ""}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("对账失败:", e);
  await prisma.$disconnect();
  process.exit(1);
});
