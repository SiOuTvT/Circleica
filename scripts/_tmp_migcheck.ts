import { PrismaClient } from "@prisma/client";

const ADMIN = "postgresql://fangame:fangame2024@127.0.0.1:5432/circleica";
const TEST_DB = "circleica_migration_test";

async function main() {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN } } });
  try {
    const role = await admin.$queryRawUnsafe<{ rolcreatedb: boolean }[]>(
      `SELECT rolcreatedb FROM pg_roles WHERE rolname='fangame'`,
    );
    console.log("ROLE_CHECK:", JSON.stringify(role));

    // 已存在则跳过
    const exists = await admin.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='${TEST_DB}') AS exists`,
    );
    console.log("EXISTS_CHECK:", JSON.stringify(exists));

    if (!exists[0]?.exists) {
      try {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${TEST_DB}"`);
        console.log("CREATE_DB: OK");
      } catch (e) {
        console.log("CREATE_DB_FAILED:", (e as Error).message);
      }
    } else {
      console.log("CREATE_DB: already exists, skip");
    }

    // 确认建好
    const list = await admin.$queryRawUnsafe<{ datname: string }[]>(
      `SELECT datname FROM pg_database WHERE datname='${TEST_DB}'`,
    );
    console.log("LIST_AFTER:", JSON.stringify(list));
  } finally {
    await admin.$disconnect();
  }
}

main().catch((e) => {
  console.error("SCRIPT_ERR:", e);
  process.exit(1);
});
