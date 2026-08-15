import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const q = (sql) => p.$queryRawUnsafe(sql);
const checks = [
  ['Creator slug_null', `SELECT COUNT(*)::int FROM "Creator" WHERE "slug" IS NULL OR "slug"=''`],
  ['Tag slug_null', `SELECT COUNT(*)::int FROM "Tag" WHERE "slug" IS NULL OR "slug"=''`],
  ['Studio slug_null', `SELECT COUNT(*)::int FROM "Studio" WHERE "slug" IS NULL OR "slug"=''`],
  ['CuratedCollection slug_null', `SELECT COUNT(*)::int FROM "CuratedCollection" WHERE "slug" IS NULL OR "slug"=''`],
  ['Creator dup_slug', `SELECT COUNT(*)::int FROM (SELECT "slug" FROM "Creator" GROUP BY "slug" HAVING COUNT(*)>1) x`],
  ['Tag dup_slug', `SELECT COUNT(*)::int FROM (SELECT "slug" FROM "Tag" GROUP BY "slug" HAVING COUNT(*)>1) x`],
  ['Studio dup_slug', `SELECT COUNT(*)::int FROM (SELECT "slug" FROM "Studio" GROUP BY "slug" HAVING COUNT(*)>1) x`],
  ['CuratedCollection dup_slug', `SELECT COUNT(*)::int FROM (SELECT "slug" FROM "CuratedCollection" GROUP BY "slug" HAVING COUNT(*)>1) x`],
  ['WorkSource dup (source,externalId)', `SELECT COUNT(*)::int FROM (SELECT "source","externalId" FROM "WorkSource" GROUP BY "source","externalId" HAVING COUNT(*)>1) x`],
  ['WorkSource dup (workId,source)', `SELECT COUNT(*)::int FROM (SELECT "workId","source" FROM "WorkSource" GROUP BY "workId","source" HAVING COUNT(*)>1) x`],
  ['GameTag orphan', `SELECT COUNT(*)::int FROM "GameTag" gt LEFT JOIN "Game" g ON gt."gameId"=g.id WHERE g.id IS NULL`],
  ['GameCreator orphan', `SELECT COUNT(*)::int FROM "GameCreator" gc LEFT JOIN "Game" g ON gc."gameId"=g.id WHERE g.id IS NULL`],
  ['GameStudio orphan', `SELECT COUNT(*)::int FROM "GameStudio" gs LEFT JOIN "Game" g ON gs."gameId"=g.id WHERE g.id IS NULL`],
  ['Comment orphan', `SELECT COUNT(*)::int FROM "Comment" c LEFT JOIN "Game" g ON c."gameId"=g.id WHERE g.id IS NULL`],
  ['CuratedCollectionGame orphan', `SELECT COUNT(*)::int FROM "CuratedCollectionGame" cg LEFT JOIN "CuratedCollection" cc ON cg."collectionId"=cc.id WHERE cc.id IS NULL`],
  ['GameResource orphan', `SELECT COUNT(*)::int FROM "GameResource" gr LEFT JOIN "Game" g ON gr."gameId"=g.id WHERE g.id IS NULL`],
  ['Game favoriteCount mismatch', `SELECT COUNT(*)::int FROM "Game" g WHERE g."favoriteCount" <> (SELECT COUNT(*)::int FROM "Favorite" f WHERE f."gameId"=g.id)`],
  ['Comment likeCount mismatch', `SELECT COUNT(*)::int FROM "Comment" c WHERE c."likeCount" <> (SELECT COUNT(*)::int FROM "CommentLike" cl WHERE cl."commentId"=c.id)`],
  ['Game downloadCount mismatch', `SELECT COUNT(*)::int FROM "Game" g WHERE g."downloadCount" <> (SELECT COALESCE(SUM(gre."downloadCount"),0)::int FROM "GameResource" gr JOIN "GameResourceEntry" gre ON gre."resourceId"=gr.id WHERE gr."gameId"=g.id)`],
  ['Creator dup name_source', `SELECT COUNT(*)::int FROM (SELECT "name","source" FROM "Creator" GROUP BY "name","source" HAVING COUNT(*)>1) x`],
  ['Game empty_title', `SELECT COUNT(*)::int FROM "Game" WHERE "title"='' OR "title" IS NULL`],
  ['Creator empty_name', `SELECT COUNT(*)::int FROM "Creator" WHERE "name"='' OR "name" IS NULL`],
];
console.log('=== POST-MIGRATE verification (live DB) ===');
let total = 0;
for (const [name, sql] of checks) {
  try {
    const r = await q(sql);
    const v = r[0].count;
    total += v;
    console.log((v===0?'OK  ':'BAD '), name.padEnd(32), '=>', v);
  } catch (e) {
    console.log('ERR ', name.padEnd(32), '=>', e.message.split('\n')[0]);
  }
}
console.log('TOTAL ANOMALIES =>', total);
await p.$disconnect();
