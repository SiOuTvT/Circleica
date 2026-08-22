import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { messageService } from "@/services/message"

/** 未读私聊总数 */
export const GET = withHandler(async () => {
  const auth = await requireAuth().catch(() => null)
  if (!auth) return json({ count: 0 })
  const count = await messageService.getUnreadCount(auth.userId)
  return json({ count })
})
