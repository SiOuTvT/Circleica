import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NotificationsClient from "./notifications-client"
import { NotificationType } from "@prisma/client"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "通知中心",
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  async function fetchNotificationsData() {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, serialId: true, username: true, avatar: true } },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ])

    // 批量查询评论点赞通知对应的帖子 ID
    const commentIds = notifications
      .filter(n => n.type === NotificationType.forum_comment_like && n.targetId)
      .map(n => n.targetId)
    const commentPostMap = new Map<string, string>()
    if (commentIds.length > 0) {
      const comments = await prisma.forumComment.findMany({
        where: { id: { in: commentIds } },
        select: { id: true, postId: true },
      })
      comments.forEach(c => commentPostMap.set(c.id, c.postId))
    }

    return { notifications, unreadCount, commentPostMap }
  }

  let data: Awaited<ReturnType<typeof fetchNotificationsData>>
  try {
    data = await fetchNotificationsData()
  } catch (error) {
    logger.db.error("[NotificationsPage] 查询失败", error)
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-muted-foreground">加载通知失败，请稍后重试</p>
        <Link href="/" className="text-sm text-primary hover:underline">返回首页</Link>
      </div>
    )
  }

  return (
    <NotificationsClient
      initialNotifications={data.notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        postId: n.type === NotificationType.forum_comment_like && n.targetId ? data.commentPostMap.get(n.targetId) ?? null : null,
      }))}
      initialUnreadCount={data.unreadCount}
    />
  )
}