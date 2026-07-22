"use client"

import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { logger } from "@/lib/logger"
import { apiFetchSafe } from "@/lib/api-client"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { ok, data } = await apiFetchSafe<{ unreadCount?: number }>("/api/notifications/unread-count")
      if (!ok) return
      setUnreadCount(data?.unreadCount ?? 0)
    } catch (err) {
      logger.api.warn("[NotificationBell] fetch unread count failed", { error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  // 每 30 秒轮询一次未读数
  useEffect(() => {
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  // 监听来自通知页面的事件
  useEffect(() => {
    function handleRead() {
      setUnreadCount(0)
    }
    window.addEventListener("notifications-all-read", handleRead)
    return () => window.removeEventListener("notifications-all-read", handleRead)
  }, [])

  return (
    <Link
      href="/notifications"
      className="relative flex h-11 w-11 items-center justify-center rounded-full transition-all lg:h-11 lg:w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted"
    >
      <Bell className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2} />
      {unreadCount > 0 && (
        <Badge variant="destructive-solid" size="sm" className="absolute right-1 top-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Link>
  )
}