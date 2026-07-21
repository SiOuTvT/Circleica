import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const body = await safeParseJson(req, { allowEmpty: true })
  const result = await gameService.toggleFavorite(userId, gameId, body.collectionId)
  return json(result)
})
