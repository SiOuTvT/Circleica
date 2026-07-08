import { withHandler, json } from '@/lib/api-handler'
import { getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const GET = withHandler(async (req, ctx) => {
  await getOptionalAuth()
  const { id } = await ctx!.params
  const game = await gameService.getBySerialId(Number(id))
  return json(game)
})
