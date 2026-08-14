import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

/** 会话详情（含消息游标分页 + 标记对方已读） */
export const GET = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const url = new URL(req.url)
  const cursor = url.searchParams.get("cursor") || undefined
  const result = await messageService.getConversation(userId, id, { cursor, limit: 30 })
  return json(result)
})

/** 发消息 */
export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "message-send")
  if (!rl.success) throw new RateLimitError()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const message = await messageService.sendMessage(userId, id, body.content)
  return json(message)
})
