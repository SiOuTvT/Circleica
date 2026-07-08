import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { notificationService } from "@/services/user"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const count = await notificationService.getUnreadCount(userId)
  return json({ unreadCount: count })
})
