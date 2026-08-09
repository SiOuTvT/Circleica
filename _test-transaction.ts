// 验证 prisma 代理包装下 $transaction 数组是否工作
import { prisma } from "@/lib/prisma"
import { gameRepo } from "@/repositories/game"
import { PrismaClient } from "@prisma/client"

async function main() {
  const raw = new PrismaClient()

  // 1. 拿一个存在的游戏 id
  const g = await raw.game.findFirst({ select: { id: true } })
  console.log("存在游戏:", g?.id)
  if (!g) { await raw.$disconnect(); return }

  // 2. 用代理 prisma 跑 $transaction 数组（findUnique 读操作）
  try {
    const r = await prisma.$transaction([
      prisma.game.findUnique({ where: { id: g.id } }),
      prisma.game.findUnique({ where: { id: g.id } }),
    ])
    console.log("代理 $transaction(读) OK, 长度:", r.length)
  } catch (e) {
    console.log("代理 $transaction(读) FAIL:", (e as Error).message.slice(0, 300))
  }

  // 3. 直接测 batchIncrementViewCount
  try {
    const r = await gameRepo.batchIncrementViewCount([g.id])
    console.log("batchIncrementViewCount OK:", JSON.stringify(r))
  } catch (e) {
    console.log("batchIncrementViewCount FAIL:", (e as Error).message.slice(0, 300))
  }

  await raw.$disconnect()
}
main()
