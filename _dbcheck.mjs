import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const m = await p.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5")
  console.log("recent migrations:", JSON.stringify(m))
  const cols = await p.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='Collection' AND column_name='slug'")
  console.log("Collection.slug exists:", cols.length > 0)
  const enums = await p.$queryRawUnsafe("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='WorkSourceType' ORDER BY e.enumsortorder")
  console.log("WorkSourceType values:", JSON.stringify(enums.map((x) => x.enumlabel)))
} catch (e) {
  console.log("ERR", e.message.slice(0, 300))
} finally {
  await p.$disconnect()
}
