import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"
import { prisma } from "@/lib/prisma"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const result = await commentService.toggleLike(userId, id)
  const comment = await prisma.comment.findUnique({ where: { id }, select: { likeCount: true } })
  return json({ liked: result.liked, count: comment?.likeCount ?? 0 })
})
