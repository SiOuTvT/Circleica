"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
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
      className="relative flex h-11 w-11 items-center justify-center rounded-full transition-all lg:h-11 lg:w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/40 text-zinc-500 hover:bg-zinc-500/10 hover:text-zinc-400"
    >
      <Bell className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}