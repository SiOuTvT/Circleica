"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { timeAgo } from "@/lib/time-ago"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

interface NotificationItem {
  id: string
  type: string
  targetType: string
  targetId: string
  isRead: boolean
  createdAt: string
  actor: {
    id: string
    serialId: number | null
    username: string
    avatar: string
  }
  targetGame?: { id: string; title: string } | null
}

const TYPE_CONFIG: Record<string, {
  icon: typeof Bell
  text: (actor: string, gameTitle?: string) => string
  subtitle?: (actor: string, gameTitle?: string) => string
  href: (targetType: string, targetId: string) => string
}> = {
  forum_post_like: {
    icon: Bell,
    text: (actor) => `${actor} 赞了你的帖子`,
    href: (_targetType, id) => `/forum/${id}`,
  },
  forum_comment_like: {
    icon: Bell,
    text: (actor) => `${actor} 赞了你的评论`,
    href: () => "/forum",
  },
  forum_comment_new: {
    icon: Bell,
    text: (actor) => `${actor} 评论了你的帖子`,
    href: (_targetType, id) => `/forum/${id}`,
  },
  follow: {
    icon: Bell,
    text: (actor) => `${actor} 关注了你`,
    href: (_targetType, id) => `/user/${id}`,
  },
  resource_reported: {
    icon: Bell,
    text: (actor, gameTitle) =>
      gameTitle
        ? `${actor} 反馈了「${gameTitle}」中你的某条资源链接已失效，请检查并更新。`
        : `${actor} 反馈了你的某条资源链接已失效，请检查并更新。`,
    href: (_targetType, id) => `/games/${id}?tab=resource`,
  },
  game_resource_new: {
    icon: Bell,
    text: (_actor, gameTitle) =>
      gameTitle
        ? `你收藏的「${gameTitle}」有新资源上传了`
        : `你收藏的游戏有新资源上传了`,
    subtitle: (actor, gameTitle) =>
      gameTitle
        ? `${actor} 在「${gameTitle}」发布了新资源`
        : `${actor} 发布了新资源`,
    href: (_targetType, id) => `/games/${id}?tab=resource`,
  },
}

export default function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationItem[]
  initialUnreadCount: number
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // 进入页面时标记所有为已读
  useEffect(() => {
    if (unreadCount > 0) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then(() => {
        setUnreadCount(0)
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/notifications?cursor=${nextCursor}`)
      if (!res.ok) return
      const data = await res.json()
      setNotifications((prev) => [...prev, ...(data.notifications ?? [])])
      setNextCursor(data.nextCursor)
    } catch { /* ignore */ }
    setLoadingMore(false)
  }, [nextCursor, loadingMore])

  async function markRead(ids: string[]) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, isRead: true } : n))
      setUnreadCount((c) => Math.max(0, c - ids.length))
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length > 0) await markRead(unreadIds)
  }

  async function deleteNotifications(ids: string[]) {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)))
      setUnreadCount((c) => {
        const deletedUnread = notifications.filter(n => ids.includes(n.id) && !n.isRead).length
        return Math.max(0, c - deletedUnread)
      })
    } catch { /* ignore */ }
  }

  async function deleteRead() {
    const readIds = notifications.filter(n => n.isRead).map(n => n.id)
    if (readIds.length > 0) await deleteNotifications(readIds)
  }

  async function deleteAll() {
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setNotifications([])
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* 标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">消息通知</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} 条未读消息` : "暂无未读消息"}
        </p>
      </div>

      {/* 操作栏 */}
      {notifications.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground transition-all"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            全部已读
          </button>
          <button
            onClick={deleteRead}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除已读
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:text-red-500 hover:ring-red-500/30 transition-all ml-auto"
          >
            清空全部
          </button>
        </div>
      )}

      {/* 通知列表 */}
      <div className="space-y-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Bell className="h-12 w-12 text-muted-foreground/30" />
          </div>
        ) : (
          notifications.map((n) => {
            const config = TYPE_CONFIG[n.type]
            if (!config) return null
            const href = config.href(n.targetType, n.targetId)
            return (
              <Link
                key={n.id}
                href={href}
                onClick={() => { if (!n.isRead) markRead([n.id]) }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer ${
                  !n.isRead
                    ? "bg-primary/5 border-l-2 border-primary"
                    : "hover:bg-accent"
                }`}
              >
                {/* 头像 */}
                <div className="relative shrink-0">
                  {n.actor.avatar ? (
                    <Image
                      src={n.actor.avatar}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {n.actor.username[0]?.toUpperCase()}
                    </div>
                  )}
                  {!n.isRead && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                  )}
                </div>

                {/* 内容 */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{config.text(n.actor.username, n.targetGame?.title)}</p>
                  {config.subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{config.subtitle(n.actor.username, n.targetGame?.title)}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotifications([n.id]) }}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>
            )
          })
        )}
      </div>

      {/* 加载更多 */}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={fetchMore}
            disabled={loadingMore}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground disabled:opacity-50 transition-all"
          >
            {loadingMore ? "加载中…" : "加载更多"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="清空通知"
        description="确定要清空所有通知吗？删了就找不回来了。"
        variant="destructive"
        confirmText="清空"
        onConfirm={deleteAll}
      />
    </div>
  )
}
