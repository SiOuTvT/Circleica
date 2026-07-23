import { withHandler, json } from '@/lib/api-handler'
import { getOptionalAuth } from '@/lib/auth-context'
import { gameService } from '@/services/game'

export const GET = withHandler(async (req) => {
  await getOptionalAuth()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || undefined
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20') || 20))
  const sort = searchParams.get('sort') || undefined
  const tag = searchParams.get('tag') || undefined

  const result = await gameService.getPaginated(page, limit, { q, sort, tag })
  return json(result)
})
