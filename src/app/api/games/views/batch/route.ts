import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { gameService } from '@/services/game'

export const POST = withHandler(async (req) => {
  const body = await safeParseJson(req)
  // 兼容两种格式：{ views: [{gameId, ts}] } 或 { gameIds: [...] }
  const ids: string[] = body.views
    ? body.views.map((v: { gameId: string }) => v.gameId)
    : body.gameIds || []
  if (!ids.length) return json({ updated: 0 })
  const result = await gameService.batchIncrementView(ids)
  return json(result)
})
