import { withHandler, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

/** 删除一个游戏资源（级联删除条目/下载日志/举报） */
export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await prisma.gameResource.delete({ where: { id } })
  return noContent()
})
