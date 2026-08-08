import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

/** 我的会话列表 */
export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const conversations = await messageService.listConversations(userId)
  return json(conversations)
})

/** 发起会话（扣印记） */
export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "conversation-start")
  if (!rl.success) throw new RateLimitError()
  const body = await safeParseJson(req)
  const { conversation, cost } = await messageService.startConversation(userId, body.participantId)
  return created({ conversation, cost })
})
