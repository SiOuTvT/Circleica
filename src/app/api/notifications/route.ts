import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { notificationService } from "@/services/user"

export const GET = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true"
  const data = await notificationService.getPaginated(userId, page, unreadOnly)
  return json(data)
})

export const PUT = withHandler(async () => {
  const { userId } = await requireAuth()
  await notificationService.markAllRead(userId)
  return json({ ok: true })
})
