import { withHandler, json } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const body = await req.json().catch(() => ({}))
  const result = await gameService.toggleFavorite(userId, gameId, body.collectionId)
  return json(result)
})
