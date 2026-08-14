import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`
  SELECT indexname,
    (SELECT indisunique FROM pg_index WHERE indexrelid = (SELECT oid FROM pg_class WHERE relname = i.indexname)) AS indisunique
  FROM pg_indexes i WHERE i.tablename = 'WorkSource'
`);
console.log("WorkSource indexes:");
for (const r of rows) console.log(`  ${r.indexname}\tunique=${r.indisunique}`);
const dup = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS dup_groups
  FROM (
    SELECT "source", "externalId" FROM "WorkSource" GROUP BY "source", "externalId" HAVING COUNT(*) > 1
  ) d
`);
console.log("重复 (source,externalId) 组数:", dup[0].dup_groups);
await prisma.$disconnect();
