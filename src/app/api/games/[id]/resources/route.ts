import { withHandler, json, created, safeParseJson } from '@/lib/api-handler'
import { requireAuth, getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'
import { revalidateTag } from 'next/cache'
import { CacheTag, gameTag } from '@/lib/cache-tags'
import { resolveGameCuid } from '@/lib/serial-id'

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
  const body = await safeParseJson(req)
  const result = await gameService.createResource(gameId, userId, body)
  try {
    const gameCuid = await resolveGameCuid(gameId)
    if (gameCuid) revalidateTag(gameTag(gameCuid), { expire: 0 })
    revalidateTag(CacheTag.gameDetail, { expire: 0 })
  } catch {
    /* revalidateTag 仅在请求上下文可用，非请求场景静默忽略 */
  }
  return created(result)
})
