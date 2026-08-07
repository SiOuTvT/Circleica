import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const GET = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const result = await gameService.getRating(userId, gameId)
  return json(result)
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const rl = await checkRateLimit(rateLimits.interact, "rating")
  if (!rl.success) throw new RateLimitError()
  const { score } = await safeParseJson(req)
  const result = await gameService.setRating(userId, gameId, score)
  return json(result)
})
