import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth, getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { NotFoundError, RateLimitError } from '@/lib/errors'
import { resolveGameCuid } from '@/lib/serial-id'

/**
 * 评分接口
 * - GET：游客可读（返回平均分/人数 + 登录用户自己的分数）；登录用户评分存在则一并返回
 * - POST：需登录，score 1-5 整数，返回最新统计
 */
export const GET = withHandler(async (_req, ctx) => {
  const { id: gameId } = await ctx!.params
  const session = await getOptionalAuth()
  const [userRating, stats] = await Promise.all([
    session ? gameService.getRating(session.userId, gameId) : Promise.resolve(null),
    gameService.getRatingStats(gameId),
  ])
  return json({ userScore: userRating?.score ?? null, stats })
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  // [id] 两种都接：数字 serialId 与 cuid；解析不到直接 404「游戏不存在」
  const gameId = await resolveGameCuid(id)
  if (!gameId) throw new NotFoundError("游戏")
  const rl = await checkRateLimit(rateLimits.interact, "rating")
  if (!rl.success) throw new RateLimitError()
  const { score } = await safeParseJson(req)
  const result = await gameService.setRating(userId, gameId, score)
  return json(result)
})
