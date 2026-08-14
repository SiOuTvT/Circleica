import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const cols = await prisma.$queryRawUnsafe(`
  SELECT table_name, column_name, is_nullable
  FROM information_schema.columns
  WHERE column_name = 'slug' AND table_schema = 'public'
  ORDER BY table_name
`);
console.log("=== tables with slug column ===");
for (const c of cols) console.log(`${c.table_name}\t${c.column_name}\t${c.is_nullable}`);
console.log("=== NULL slug counts ===");
for (const c of cols) {
  const t = c.table_name;
  try {
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}" WHERE slug IS NULL`);
    console.log(`${t}\tNULL=${r[0].n}`);
  } catch (e) {
    console.log(`${t}\tERR ${e.message}`);
  }
}
await prisma.$disconnect();
