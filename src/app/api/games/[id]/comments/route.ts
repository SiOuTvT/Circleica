import { withHandler, json, created } from '@/lib/api-handler'
import { requireAuth, getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const GET = withHandler(async (req, ctx) => {
  await getOptionalAuth()
  const { id } = await ctx!.params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '10')))

  const result = await gameService.getComments(id, page, limit)
  return json(result)
})

export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id: gameId } = await ctx!.params
  const body = await req.json()
  const comment = await gameService.createComment(
    userId,
    gameId,
    body.content,
    body.imageUrl,
    body.parentId
  )
  return created(comment)
})
