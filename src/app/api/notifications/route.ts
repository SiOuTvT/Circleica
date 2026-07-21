import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { notificationService } from "@/services/user"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const cursor = req.nextUrl.searchParams.get("cursor")
  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true"
  const limit = 30

  const where: Record<string, unknown> = { userId }
  if (unreadOnly) where.isRead = false
  if (cursor) where.createdAt = { lt: new Date(cursor) }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { actor: { select: { id: true, username: true, avatar: true } } },
  })

  const hasMore = notifications.length > limit
  if (hasMore) notifications.pop()
  const nextCursor = hasMore ? notifications[notifications.length - 1]?.createdAt.toISOString() ?? null : null

  return json({ notifications, nextCursor })
})

export const PUT = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await req.json().catch(() => ({}))
  if (body.ids?.length) {
    await notificationService.markRead(body.ids, userId)
  } else {
    await notificationService.markAllRead(userId)
  }
  return json({ ok: true })
})

export const DELETE = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await req.json().catch(() => ({}))
  if (body.ids?.length) {
    await notificationService.deleteNotifications(body.ids, userId)
  } else {
    await notificationService.deleteAllRead(userId)
  }
  return noContent()
})
