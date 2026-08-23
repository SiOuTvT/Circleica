import { withHandler, json } from "@/lib/api-handler"
import { getOptionalAuth } from "@/lib/auth-context"
import { gameService } from "@/services/game"

export const GET = withHandler(async (req, ctx) => {
  await getOptionalAuth()
  const { gameId } = await ctx!.params
  const url = new URL(req.url)
  const limit = Number(url.searchParams.get("limit") ?? "30") || 30
  const data = await gameService.getGameActivities(gameId, { limit })
  return json(data)
})
