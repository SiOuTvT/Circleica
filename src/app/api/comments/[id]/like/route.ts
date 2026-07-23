import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.like, "global-comment-like")
  if (!rl.success) throw new RateLimitError("操作过于频繁，请稍后再试", rl.reset)
  const { id } = await ctx!.params
  const result = await commentService.toggleLike(userId, id)
  const comment = await prisma.comment.findUnique({ where: { id }, select: { likeCount: true } })
  return json({ liked: result.liked, count: comment?.likeCount ?? 0 })
})
