import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
try {
  const drift = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS mismatches
    FROM "Game" g
    LEFT JOIN (
      SELECT "gameId", COUNT(*)::int AS cnt
      FROM "ResourceDownloadLog"
      GROUP BY "gameId"
    ) c ON c."gameId" = g.id
    WHERE COALESCE(g."downloadCount",0) IS DISTINCT FROM COALESCE(c.cnt,0)
  `);
  console.log("downloadCount mismatches:", drift[0].mismatches);
  const sample = await prisma.$queryRawUnsafe(`
    SELECT g.id, g."downloadCount", COALESCE(c.cnt,0) AS real_cnt
    FROM "Game" g
    LEFT JOIN (
      SELECT "gameId", COUNT(*)::int AS cnt
      FROM "ResourceDownloadLog"
      GROUP BY "gameId"
    ) c ON c."gameId" = g.id
    WHERE COALESCE(g."downloadCount",0) IS DISTINCT FROM COALESCE(c.cnt,0)
    ORDER BY ABS(COALESCE(g."downloadCount",0) - COALESCE(c.cnt,0)) DESC
    LIMIT 10
  `);
  for (const r of sample) console.log(`game ${r.id}: stored=${r.downloadCount} real=${r.real_cnt}`);
} catch (e) {
  console.log("ERR", e.message);
}
await prisma.$disconnect();
