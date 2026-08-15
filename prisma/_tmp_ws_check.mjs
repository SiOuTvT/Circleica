import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const r = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM (SELECT "source","externalId" FROM "WorkSource" GROUP BY "source","externalId" HAVING COUNT(*)>1) x`);
console.log('WorkSource (source,externalId) duplicate groups =>', r[0].c);
const r2 = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM (SELECT "workId","source" FROM "WorkSource" GROUP BY "workId","source" HAVING COUNT(*)>1) x`);
console.log('WorkSource (workId,source) duplicate groups =>', r2[0].c);
await p.$disconnect();
