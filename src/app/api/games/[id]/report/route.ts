import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.report, "game")
  if (!rl.success) throw new RateLimitError("举报过于频繁，请稍后再试", rl.reset)
  const { id: gameId } = await ctx!.params
  const { reason } = await safeParseJson(req)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const result = await gameService.report(userId, gameId, ip, reason)
  return json(result)
})
