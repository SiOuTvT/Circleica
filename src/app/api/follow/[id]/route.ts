import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { followService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.follow)
  if (!rl.success) throw new RateLimitError("关注操作过于频繁，请稍后再试", rl.reset)
  const { id: targetUserId } = await ctx!.params
  const result = await followService.toggle(userId, targetUserId)
  return json(result)
})
