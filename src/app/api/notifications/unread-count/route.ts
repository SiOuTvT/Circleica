import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { notificationService } from "@/services/user"

export const GET = withHandler(async () => {
  const auth = await requireAuth().catch(() => null)
  if (!auth) return json({ unreadCount: 0 })
  const count = await notificationService.getUnreadCount(auth.userId)
  return json({ unreadCount: count })
})
