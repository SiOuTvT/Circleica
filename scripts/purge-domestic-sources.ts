/**
 * 清理被排除数据源（CnGal / YmGal / Bangumi）的残留数据。
 * 本脚本删除 WorkSource 中 source∈(CNGL,YMGAL,BANGUMI) 的行；若某 Work 因此彻底无源，则连 Work 一并删。
 *
 * 安全：默认 DRY-RUN（只统计不删）。加 PURGE=1 才真删。
 * 用法：
 *   npm run galvelica:purge-domestic          # 预览
 *   PURGE=1 npm run galvelica:purge-domestic  # 真删
 */
import { PrismaClient, type WorkSourceType } from "@prisma/client"

const prisma = new PrismaClient()
const DRY = process.env.PURGE !== "1"
const SOURCES: WorkSourceType[] = ["CNGL", "YMGAL", "BANGUMI"]

async function main() {
  const ws = await prisma.workSource.findMany({
    where: { source: { in: SOURCES } },
    select: { workId: true },
  })
  const workIds = Array.from(new Set(ws.map((w) => w.workId)))
  console.log(`[purge] DRY-RUN=${DRY} 待删 WorkSource(${SOURCES.join("/")})=${ws.length}，涉及 Work=${workIds.length}`)
  if (workIds.length === 0) {
    console.log("[purge] 无数据，结束。")
    return
  }

  const orphanWorkIds: string[] = []
  for (const id of workIds) {
    const remaining = await prisma.workSource.count({
      where: { workId: id, NOT: { source: { in: SOURCES } } },
    })
    if (remaining === 0) orphanWorkIds.push(id)
  }
  console.log(`[purge] 其中完全无其它源的孤立 Work=${orphanWorkIds.length}`)

  if (DRY) {
    console.log("[purge] DRY-RUN 模式，未删除。加 PURGE=1 执行。")
    return
  }
  const delWs = await prisma.workSource.deleteMany({
    where: { source: { in: SOURCES } },
  })
  const delWorks = await prisma.work.deleteMany({ where: { id: { in: orphanWorkIds } } })
  console.log(`[purge] 已删 WorkSource=${delWs.count}，孤立 Work=${delWorks.count}`)
}

main()
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
