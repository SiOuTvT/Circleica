import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

/**
 * 副站作品浏览计数（Work.viewCount）批量上报。
 * 与主站 /api/games/views/batch 完全分离：只递增 Work 表，绝不触碰 Game。
 * 匿名可达的写入端点：限流 + 限制批量大小（防统计篡改 / DoS）。
 */
export const POST = withHandler(async (req) => {
  const rl = await checkRateLimit(rateLimits.search, "galvelica-batch-view")
  if (!rl.success) throw new RateLimitError("操作过于频繁，请稍后再试", rl.reset)
  const body = await safeParseJson(req)

  const ids: string[] = body.views
    ? body.views.map((v: { workId?: string; gameId?: string }) => v.workId ?? v.gameId ?? "")
    : body.workIds || []
  const capped = Array.isArray(ids) ? ids.filter(Boolean).slice(0, 50) : []
  if (!capped.length) return json({ ok: true, counted: 0 })

  let counted = 0
  // 逐条原子 increment（尽力而为：无效 id / 不存在的 Work 静默跳过，不抛错）
  for (const id of capped) {
    try {
      await prisma.work.update({ where: { id }, data: { viewCount: { increment: 1 } } })
      counted++
    } catch { /* 忽略 */ }
  }
  return json({ ok: true, counted })
})
