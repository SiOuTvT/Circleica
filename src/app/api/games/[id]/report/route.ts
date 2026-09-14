import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { NotFoundError, RateLimitError } from '@/lib/errors'
import { revalidateTag } from 'next/cache'
import { CacheTag, gameTag } from '@/lib/cache-tags'
import { resolveGameCuid } from '@/lib/serial-id'

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.report, "game")
  if (!rl.success) throw new RateLimitError("举报过于频繁，请稍后再试", rl.reset)
  const { id } = await ctx!.params
  // [id] 两种都接：数字 serialId 与 cuid；解析不到直接 404「游戏不存在」
  const gameId = await resolveGameCuid(id)
  if (!gameId) throw new NotFoundError("游戏")
  const { reason } = await safeParseJson(req)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
  const result = await gameService.report(userId, gameId, ip, reason)
  try {
    revalidateTag(gameTag(gameId), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })
  } catch {
    /* revalidateTag 仅在请求上下文可用，非请求场景静默忽略 */
  }
  return json(result)
})
