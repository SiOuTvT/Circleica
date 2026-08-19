// 临时脚本：检查本地 circleica 库现状（仅探测，不修改）
process.env.DATABASE_URL = "postgresql://fangame:fangame2024@127.0.0.1:5432/circleica"
const { PrismaClient } = require("../src/generated/prisma/client.js")
const p = new PrismaClient()
;(async () => {
  try {
    const r = await p.$queryRawUnsafe("SELECT COUNT(*) AS n FROM pg_tables WHERE schemaname='public'")
    console.log("tables count:", r[0].n)
  } catch (e) {
    console.log("DB ERROR:", e.message)
  } finally {
    await p.$disconnect()
  }
})()
