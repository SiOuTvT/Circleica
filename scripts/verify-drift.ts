import { prisma } from "@/lib/prisma"

async function main() {
  // 1) bak 表
  const bak = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '_bak_%'
  `
  console.log("bak 表:", JSON.stringify(bak))

  // 2) WorkSourceType 枚举实际变体
  const enumVals = await prisma.$queryRaw`
    SELECT e.enumlabel AS val
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'WorkSourceType'
    ORDER BY e.enumsortorder
  `
  console.log("WorkSourceType 实际变体:", JSON.stringify((enumVals as any[]).map((x) => x.val)))

  // 3) Collection.slug 列
  const colSlug = await prisma.$queryRaw`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name='Collection' AND column_name='slug'
  `
  console.log("Collection.slug:", JSON.stringify(colSlug))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
