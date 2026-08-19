// 临时脚本：检查本地 circleica 库现状（仅探测）
import { PrismaClient } from "../src/generated/prisma/client"
const p = new PrismaClient()
;(async () => {
  try {
    const r = await p.$queryRawUnsafe("SELECT COUNT(*) AS n FROM pg_tables WHERE schemaname='public'")
    console.log("tables count:", r[0].n)
    const u = await p.$queryRawUnsafe('SELECT COUNT(*) AS n FROM "User"')
    console.log("users:", u[0].n)
  } catch (e) {
    console.log("DB ERROR:", e.message)
  } finally {
    await p.$disconnect()
  }
})()
