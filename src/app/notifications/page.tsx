import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NotificationsClient from "./notifications-client"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "通知中心",
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { id: true, serialId: true, username: true, avatar: true } },
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ])

  // 批量查询关联游戏信息
  const gameIds = [...new Set(notifications.filter(n => n.targetType === "game" && n.targetId).map(n => n.targetId))]
  const games = gameIds.length > 0
    ? await prisma.game.findMany({
        where: { serialId: { in: gameIds.map(Number).filter(n => !isNaN(n)) } },
        select: { id: true, serialId: true, title: true },
      })
    : []
  const gameMap = new Map(games.map(g => [String(g.serialId), { id: g.id, title: g.title }]))

  return (
    <NotificationsClient
      initialNotifications={notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        targetGame: n.targetType === "game" && n.targetId ? gameMap.get(n.targetId) ?? null : null,
      }))}
      initialUnreadCount={unreadCount}
    />
  )
}