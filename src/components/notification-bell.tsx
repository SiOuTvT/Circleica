"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count")
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // ignore
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
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}