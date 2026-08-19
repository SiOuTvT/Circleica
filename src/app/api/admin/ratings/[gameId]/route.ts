import { withHandler, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

/** 删除某游戏的全部评分数据 */
export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { gameId } = await ctx!.params
  await prisma.gameRating.deleteMany({ where: { gameId } })
  return noContent()
})
