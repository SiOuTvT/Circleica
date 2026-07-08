import { withHandler, json } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { resourceId } = await ctx!.params
  const result = await gameService.reportResource(userId, resourceId)
  return json(result)
})
