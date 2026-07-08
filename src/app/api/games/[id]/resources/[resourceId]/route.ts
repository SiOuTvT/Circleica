import { withHandler, noContent } from '@/lib/api-handler'
import { requireAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAuth()
  const { resourceId } = await ctx!.params
  await gameService.deleteResource(resourceId)
  return noContent()
})
