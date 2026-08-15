import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
;(async () => {
  const r = await p.$queryRaw`SELECT
    (SELECT count(*) FROM "Creator" WHERE "slug" IS NULL OR "slug"='') AS creator_null,
    (SELECT count(*) FROM "Tag" WHERE "slug" IS NULL OR "slug"='') AS tag_null,
    (SELECT count(*) FROM "Studio" WHERE "slug" IS NULL OR "slug"='') AS studio_null,
    (SELECT count(*) FROM "Creator" WHERE "slug" IS NOT NULL AND "slug"<>'') AS creator_ok`
  console.log(JSON.stringify(r))
  await p.$disconnect()
})().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
