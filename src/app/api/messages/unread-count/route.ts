import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"

/** 未读私聊总数 */
export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const count = await messageService.getUnreadCount(userId)
  return json({ count })
})
