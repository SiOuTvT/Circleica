import { prisma } from "@/lib/prisma"

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT
      i.relname AS index_name,
      idx.indisunique AS is_unique
    FROM pg_index idx
    JOIN pg_class i ON i.oid = idx.indexrelid
    JOIN pg_class t ON t.oid = idx.indrelid
    WHERE t.relname = 'WorkSource'
      AND i.relname = 'WorkSource_source_externalId_key'
  `
  console.table(rows)
  const r = (rows as any[])[0]
  if (!r) {
    console.log("FAIL: 唯一索引 WorkSource_source_externalId_key 不存在")
    process.exit(1)
  }
  if (r.is_unique) {
    console.log("OK: (source, externalId) 唯一约束已生效 (indisunique=true)")
  } else {
    console.log("FAIL: 索引存在但非唯一")
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
