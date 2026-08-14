import { prisma } from "@/lib/prisma"

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE column_name = 'slug'
      AND table_schema = 'public'
      AND table_name IN ('Tag','Studio','Creator','CuratedCollection')
    ORDER BY table_name
  `
  console.table(rows)
  const stillNullable = (rows as any[]).filter((r) => r.is_nullable === "YES")
  console.log(stillNullable.length === 0 ? "OK: 全部 slug 列均为 NOT NULL" : `FAIL: 仍有可空列 ${JSON.stringify(stillNullable)}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
