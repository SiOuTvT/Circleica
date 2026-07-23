import { withHandler, json } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.report, "resource")
  if (!rl.success) throw new RateLimitError("举报过于频繁，请稍后再试", rl.reset)
  const { resourceId } = await ctx!.params
  const result = await gameService.reportResource(userId, resourceId)
  return json(result)
})
