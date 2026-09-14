import { withHandler, json } from '@/lib/api-handler'
import { gameService } from '@/services/game'
import { getRateLimit, getClientIP } from '@/lib/rate-limit'
import { NotFoundError } from '@/lib/errors'
import { resolveGameCuid } from '@/lib/serial-id'

// 同一 IP 每分钟最多 10 次浏览量增加
const VIEW_RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 }

export const POST = withHandler(async (req, ctx) => {
  const ip = getClientIP(req)
  const { id } = await ctx!.params
  // [id] 两种都接：数字 serialId 与 cuid；解析不到直接 404「游戏不存在」
  const gameId = await resolveGameCuid(id)
  if (!gameId) throw new NotFoundError("游戏")
  const rl = await getRateLimit(`view:${ip}:${gameId}`, VIEW_RATE_LIMIT)
  if (!rl.allowed) return json({ viewCount: null, limited: true })
  const result = await gameService.incrementView(gameId)
  return json(result)
})
