import { withHandler, json, created } from '@/lib/api-handler'
import { requireAuth, getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const GET = withHandler(async (_req, ctx) => {
  await getOptionalAuth()
  const { id: gameId } = await ctx!.params
  const result = await gameService.getResources(gameId)
  return json(result)
})

export const POST = withHandler(async (req, ctx) => {
  const rl = await checkRateLimit(rateLimits.upload)
  if (!rl.success) throw new RateLimitError()
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const body = await req.json()
  const result = await gameService.createResource(gameId, userId, body)
  return created(result)
})
