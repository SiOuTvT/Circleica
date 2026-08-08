import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"

/** 我的会话列表 */
export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const conversations = await messageService.listConversations(userId)
  return json(conversations)
})

/** 发起会话（扣印记） */
export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await safeParseJson(req)
  const { conversation, cost } = await messageService.startConversation(userId, body.participantId)
  return created({ conversation, cost })
})
