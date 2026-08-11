"use client"

import { useEffect, useState } from "react"
import { Eye } from "lucide-react"

/**
 * 浏览量计数器 — 同时负责「显示」与「上报」。
 * 机制：列表页点击卡片时在 sessionStorage 写入 `pending_view_${id}` 标记，
 *       详情页挂载后检查标记，存在则乐观 +1 显示并上报一次，随后清除标记。
 *       直接访问（无标记）不计、不显示 +1。刷新页面不会重复计数。
 *
 * 上报改用 fetch(keepalive)，比 navigator.sendBeacon 更可靠（可跨域、可重试）。
 */

const DEFAULT_CLS = "inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground"

function reportView(url: string, views: { gameId?: string; workId?: string; ts: number }[]) {
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ views, batch: true }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 忽略上报失败，不影响浏览 */
  }
}

export function ViewCounter({
  gameId,
  initialCount = 0,
  className,
}: {
  gameId: string
  initialCount?: number
  className?: string
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (typeof window === "undefined") return
    const key = `pending_view_${gameId}`
    if (!sessionStorage.getItem(key)) return
    sessionStorage.removeItem(key)
    setCount((c) => c + 1)
    reportView("/api/games/views/batch", [{ gameId, ts: Date.now() }])
  }, [gameId])

  return (
    <span className={className ?? DEFAULT_CLS}>
      <Eye className="h-3.5 w-3.5" />
      <span className="font-bold tabular-nums">{count}</span>
    </span>
  )
}

export function WorkViewCounter({
  workId,
  initialCount = 0,
  className,
}: {
  workId: string
  initialCount?: number
  className?: string
}) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    if (typeof window === "undefined") return
    const key = `pending_work_view_${workId}`
    if (!sessionStorage.getItem(key)) return
    sessionStorage.removeItem(key)
    setCount((c) => c + 1)
    reportView("/api/galvelica/views/batch", [{ workId, ts: Date.now() }])
  }, [workId])

  return (
    <span className={className ?? DEFAULT_CLS}>
      <Eye className="h-3.5 w-3.5" />
      <span className="font-bold tabular-nums">{count}</span>
    </span>
  )
}
