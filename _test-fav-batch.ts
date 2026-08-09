// 验证收藏交互式事务 与 views/batch 数组事务
import { gameRepo } from "@/repositories/game"
import { PrismaClient } from "@prisma/client"

async function main() {
  const raw = new PrismaClient()
  const user = await raw.user.findFirst({ select: { id: true, username: true } })
  const game = await raw.game.findFirst({ where: { serialId: 33 }, select: { id: true } })
  console.log("用户:", user?.username, "游戏:", game?.id)
  if (!user || !game) { await raw.$disconnect(); return }

  // 1. views/batch（数组事务）
  try {
    const r = await gameRepo.batchIncrementViewCount([game.id])
    console.log("batchIncrementViewCount OK:", JSON.stringify(r[0]?.viewCount))
  } catch (e) {
    console.log("batchIncrementViewCount FAIL:", (e as Error).message.slice(0, 200))
  }

  // 2. 收藏 toggle（交互式事务）
  try {
    const r1 = await gameRepo.toggleFavorite(user.id, game.id)
    console.log("收藏 toggle 1:", JSON.stringify(r1))
    const r2 = await gameRepo.toggleFavorite(user.id, game.id)
    console.log("收藏 toggle 2:", JSON.stringify(r2))
  } catch (e) {
    console.log("toggleFavorite FAIL:", (e as Error).message.slice(0, 200))
  }
  await raw.$disconnect()
}
main()
