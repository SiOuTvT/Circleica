import { withHandler, json } from '@/lib/api-handler'
import { gameService } from '@/services/game'

export const POST = withHandler(async (req) => {
  const { gameIds } = await req.json()
  const result = await gameService.batchIncrementView(gameIds)
  return json(result)
})
