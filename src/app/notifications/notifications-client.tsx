"use client"

import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Heart,
  MessageSquare,
  Trash2,
  UserPlus,
} from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { timeAgo } from "@/lib/time-ago"

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
}

const TYPE_CONFIG: Record<
  string,
  {
    icon: typeof Heart
    text: (actor: string) => string
    href: (targetType: string, targetId: string) => string
    category: string
  }
> = {
  forum_post_like: {
    icon: Heart,
    text: (actor) => `${actor} 赞了你的帖子`,
    href: (_type, _id) => "/forum",
    category: "like",
  },
  forum_comment_like: {
    icon: Heart,
    text: (actor) => `${actor} 赞了你的评论`,
    href: (_type, _id) => "/forum",
    category: "like",
  },
  forum_comment_new: {
    icon: MessageSquare,
    text: (actor) => `${actor} 评论了你的帖子`,
    href: (_type, _id) => "/forum",
    category: "comment",
  },
  follow: {
    icon: UserPlus,
    text: (actor) => `${actor} 关注了你`,
    href: (_type, id) => `/user/${id}`,
    category: "follow",
  },
}

const FILTER_TABS = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "like", label: "点赞" },
  { key: "comment", label: "评论" },
  { key: "follow", label: "关注" },
] as const

export default function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationItem[]
  initialUnreadCount: number
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

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
    } catch {
      // ignore
    }
    setLoadingMore(false)
  }, [nextCursor, loadingMore])

  async function markRead(ids: string[]) {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      )
    } catch {
      // ignore
    }
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
        const deletedUnread = notifications.filter(
          (n) => ids.includes(n.id) && !n.isRead
        ).length
        return Math.max(0, c - deletedUnread)
      })
    } catch {
      // ignore
    }
  }

  async function deleteAll() {
    setLoading(true)
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setNotifications([])
      setUnreadCount(0)
    } catch {
      // ignore
    }
    setLoading(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const visible = filteredNotifications
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visible.map((n) => n.id)))
    }
  }

  function handleDeleteSelected() {
    if (selectedIds.size === 0) return
    deleteNotifications(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  function handleMarkSelectedRead() {
    const unreadSelected = Array.from(selectedIds).filter(
      (id) => !notifications.find((n) => n.id === id)?.isRead
    )
    if (unreadSelected.length > 0) markRead(unreadSelected)
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead
    if (filter === "all") return true
    const config = TYPE_CONFIG[n.type]
    return config?.category === filter
  })

  return (
    <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 light:text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-200 light:hover:bg-zinc-100 light:hover:text-zinc-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-zinc-400 light:text-zinc-600" />
            <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900">
              消息中心
            </h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key)
                setSelectMode(false)
                setSelectedIds(new Set())
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === tab.key
                  ? "bg-white text-black light:bg-zinc-900 light:text-white"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 light:text-zinc-500 light:hover:bg-zinc-100 light:hover:text-zinc-700"
              }`}
            >
              {tab.label}
              {tab.key === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({unreadCount})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectMode(!selectMode)
                setSelectedIds(new Set())
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 light:text-zinc-500 light:hover:bg-zinc-100 light:hover:text-zinc-700"
            >
              {selectMode ? "取消选择" : "管理"}
            </button>
            {selectMode && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 light:text-zinc-500 light:hover:bg-zinc-100 light:hover:text-zinc-700"
                >
                  {selectedIds.size === filteredNotifications.length
                    ? "取消全选"
                    : "全选"}
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={handleMarkSelectedRead}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-zinc-800 light:text-primary light:hover:bg-zinc-100"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      标记已读
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-zinc-800 light:text-red-600 light:hover:bg-zinc-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除 ({selectedIds.size})
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {notifications.length > 0 && !selectMode && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-red-400 light:hover:text-red-600"
            >
              清空全部
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Bell className="mb-4 h-12 w-12 text-zinc-700 light:text-zinc-300" />
              <p className="text-sm text-zinc-600 light:text-zinc-400">
                {filter === "unread" ? "所有消息都看过了~" : "暂时没有新消息~"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const config = TYPE_CONFIG[n.type]
              if (!config) return null
              const Icon = config.icon
              const href = config.href(n.targetType, n.targetId)
              return (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 rounded-xl px-4 py-3 transition-colors ${
                    !n.isRead
                      ? "bg-zinc-900/80 light:bg-primary/5/60"
                      : "hover:bg-zinc-900/40 light:hover:bg-zinc-50"
                  } ${selectMode && selectedIds.has(n.id) ? "ring-1 ring-primary/50 bg-primary/10 light:bg-primary/5" : ""}`}
                >
                  {selectMode && (
                    <button
                      onClick={() => toggleSelect(n.id)}
                      className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-600 transition-colors light:border-zinc-300"
                    >
                      {selectedIds.has(n.id) && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </button>
                  )}

                  <div className="relative shrink-0">
                    {n.actor.avatar ? (
                    <Link href={`/user/${n.actor.serialId || n.actor.id}`}>
                        <img
                          src={n.actor.avatar}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      </Link>
                    ) : (
                      <Link href={`/user/${n.actor.serialId || n.actor.id}`}>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 light:bg-zinc-200">
                          <Icon
                            className="h-4 w-4 text-zinc-500"
                            strokeWidth={1.5}
                          />
                        </div>
                      </Link>
                    )}
                    {!n.isRead && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-black light:border-white bg-primary" />
                    )}
                  </div>

                  <Link
                    href={href}
                    onClick={() => {
                      if (!n.isRead) markRead([n.id])
                    }}
                    className="min-w-0 flex-1"
                  >
                    <p className="text-sm leading-snug text-zinc-200 light:text-zinc-800">
                      {config.text(n.actor.username)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {timeAgo(n.createdAt)}
                    </p>
                  </Link>

                  {!selectMode && (
                    <button
                      onClick={() => deleteNotifications([n.id])}
className="mt-1 shrink-0 rounded-lg p-1.5 text-zinc-600 sm:opacity-0 transition-all sm:group-hover:opacity-100 hover:text-red-400 light:text-zinc-400 light:hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={fetchMore}
              disabled={loadingMore}
              className="rounded-full px-6 py-2 text-sm font-medium text-zinc-400 light:text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-200 light:hover:bg-zinc-100 light:hover:text-zinc-700"
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