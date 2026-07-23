import { withHandler, json, safeParseJson } from '@/lib/api-handler'
import { gameService } from '@/services/game'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { RateLimitError } from '@/lib/errors'

export const POST = withHandler(async (req) => {
  // 匿名可达的写入端点：必须限流 + 限制批量大小，否则可被任意伪造浏览量（统计篡改）或触发无界 DB 写入（DoS）
  const rl = await checkRateLimit(rateLimits.search, "batch-view")
  if (!rl.success) throw new RateLimitError("操作过于频繁，请稍后再试", rl.reset)
  const body = await safeParseJson(req)
  // 兼容两种格式：{ views: [{gameId, ts}] } 或 { gameIds: [...] }
  const ids: string[] = body.views
    ? body.views.map((v: { gameId: string }) => v.gameId)
    : body.gameIds || []
  // 限制单次批量大小，防止无界写入 / DoS（P1）
  const capped = Array.isArray(ids) ? ids.slice(0, 50) : []
  if (!capped.length) return json({ updated: 0 })
  const result = await gameService.batchIncrementView(capped)
  return json(result)
})
