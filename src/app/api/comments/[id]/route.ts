import { withHandler, noContent } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const DELETE = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.comment, "comment-delete")
  if (!rl.success) throw new RateLimitError()
  const { id } = await ctx!.params
  await commentService.delete(userId, id)
  return noContent()
})
