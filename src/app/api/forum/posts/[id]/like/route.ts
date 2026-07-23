import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.like, "post-like")
  if (!rl.success) throw new RateLimitError("操作过于频繁，请稍后再试", rl.reset)
  const { id } = await ctx!.params
  const result = await forumService.toggleLike(userId, id)
  return json(result)
})
