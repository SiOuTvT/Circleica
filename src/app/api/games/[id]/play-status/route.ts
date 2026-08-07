import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const GET = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const result = await gameService.getPlayStatus(userId, gameId)
  return json(result)
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const rl = await checkRateLimit(rateLimits.interact, "play-status")
  if (!rl.success) throw new RateLimitError()
  const { status } = await safeParseJson(req)
  const result = await gameService.setPlayStatus(userId, gameId, status)
  return json(result)
})
