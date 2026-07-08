import { withHandler, json } from '@/lib/api-handler'
import { gameService } from '@/services/game'

export const GET = withHandler(async () => {
  const games = await gameService.getRandom(5)
  return json(games)
})
