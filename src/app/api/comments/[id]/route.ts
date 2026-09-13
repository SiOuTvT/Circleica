import { withHandler, noContent } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import { CacheTag, gameTag } from "@/lib/cache-tags"

export const DELETE = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.comment, "comment-delete")
  if (!rl.success) throw new RateLimitError()
  const { id } = await ctx!.params
  // 失效要拿到所属游戏：删除前先取一次 gameId
  const target = await prisma.comment.findUnique({ where: { id }, select: { gameId: true } })
  await commentService.delete(userId, id)
  try {
    if (target?.gameId) revalidateTag(gameTag(target.gameId), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })
  } catch {
    /* revalidateTag 仅在请求上下文可用，非请求场景静默忽略 */
  }
  return noContent()
})
