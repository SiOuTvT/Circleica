import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"

/** 会话详情（含消息 + 标记对方已读） */
export const GET = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const result = await messageService.getConversation(userId, id)
  return json(result)
})

/** 发消息 */
export const POST = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const message = await messageService.sendMessage(userId, id, body.content)
  return json(message)
})
