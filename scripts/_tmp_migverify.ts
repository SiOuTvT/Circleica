import { PrismaClient } from "@prisma/client";

const TEST = "postgresql://fangame:fangame2024@127.0.0.1:5432/circleica_migration_test";

async function main() {
  const db = new PrismaClient({ datasources: { db: { url: TEST } } });
  try {
    const enumVals = await db.$queryRawUnsafe<{ enumlabel: string }[]>(
      `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='WorkSourceType' ORDER BY enumlabel`,
    );
    console.log("WORKSOURCETYPE_VALUES:", JSON.stringify(enumVals.map((r) => r.enumlabel)));

    const creatorUniq = await db.$queryRawUnsafe<{ conname: string }[]>(
      `SELECT conname FROM pg_constraint WHERE conname='Creator_name_source_unique'`,
    );
    console.log("CREATOR_UNIQUE_CONSTRAINT:", JSON.stringify(creatorUniq));

    const tables = await db.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
    );
    console.log("TABLE_COUNT:", tables.length);
    console.log("TABLES:", JSON.stringify(tables.map((t) => t.tablename)));

    // 抽样关键表结构：Creator 应有 name/source 列
    const creatorCols = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name='Creator' AND column_name IN ('name','source','slug') ORDER BY column_name`,
    );
    console.log("CREATOR_COLS:", JSON.stringify(creatorCols.map((c) => c.column_name)));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error("VERIFY_ERR:", e);
  process.exit(1);
});
