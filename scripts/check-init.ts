/** 诊断：站长账号是否存在、站点 initialized 标志的值 */
import { prisma } from "../src/lib/prisma"

async function main() {
  const total = await prisma.user.count()
  console.log("用户总数 =", total)

  const sio = await prisma.user.findFirst({
    where: { OR: [{ username: "SiOuTvT" }, { email: "SiOuTvT" }] },
  })
  console.log("SiOuTvT 是否存在 =", !!sio, sio ? `(role=${sio.role})` : "")

  const users = await prisma.user.findMany({ select: { username: true, role: true }, take: 10 })
  console.log("用户列表 =", JSON.stringify(users))

  // initialized 标志可能在不同表/键下，逐个探测
  for (const key of ["initialized", "site_initialized", "setup_completed", "siteName"]) {
    try {
      const row = await (prisma as any).siteSetting.findUnique({ where: { key } })
      if (row) console.log(`siteSetting[${key}] =`, String(row.value).slice(0, 60))
    } catch (e) {
      console.log(`siteSetting 查询失败（${key}）:`, String((e as Error).message).slice(0, 80))
      break
    }
  }
}

main()
  .catch((e) => console.error("查询失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
