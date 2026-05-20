import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NotificationsClient from "./notifications-client"

export const metadata = {
  title: "通知中心",
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    take: 30,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, username: true, avatar: true } },
    },
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  })

  return (
    <NotificationsClient
      initialNotifications={notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      }))}
      initialUnreadCount={unreadCount}
    />
  )
}