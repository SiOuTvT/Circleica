import { PrismaClient } from "@prisma/client";

const ADMIN = "postgresql://fangame:fangame2024@127.0.0.1:5432/circleica";
const TEST_DB = "circleica_migration_test";

async function main() {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN } } });
  try {
    // 先断开所有到测试库的连接（防止 DROP 被占用）
    await admin.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${TEST_DB}' AND pid<>pg_backend_pid()`,
    );
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
    console.log("DROPPED:", TEST_DB);
  } finally {
    await admin.$disconnect();
  }
}
main().catch((e) => {
  console.error("DROP_ERR:", e);
  process.exit(1);
});
