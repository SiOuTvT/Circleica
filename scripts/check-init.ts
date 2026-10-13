/** 确认站点是否真的初始化成功：站长账号是否创建、initialized 标志的值 */
import { prisma } from "../src/lib/prisma"

async function main() {
  const userCount = await prisma.user.count()
  const admin = await prisma.user.findUnique({ where: { username: "admin" } })
  console.log("用户总数 =", userCount)
  console.log("admin 是否已创建 =", !!admin, admin ? `(role=${admin.role})` : "")

  // initialized 标志：不同版本可能存 siteSetting / systemConfig，逐个探测
  for (const key of ["initialized", "site_initialized", "setup_completed"]) {
    try {
      const row = await (prisma as any).siteSetting.findUnique({ where: { key } })
      if (row) console.log(`siteSetting[${key}] =`, row.value)
    } catch {
      /* 该模型不存在则跳过 */
    }
  }
}

main()
  .catch((e) => console.error("查询失败:", e))
  .finally(() => prisma.$disconnect().catch(() => {}))
