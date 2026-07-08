import { withHandler, json } from '@/lib/api-handler'
import { gameService } from '@/services/game'

export const POST = withHandler(async (_req, ctx) => {
  const { id } = await ctx!.params
  const result = await gameService.incrementView(id)
  return json(result)
})
