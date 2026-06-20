"use client"

import { useEffect } from "react"

/**
 * 浏览量计数器 — 仅当用户从列表页点击游戏卡片进入详情页时计数一次。
 * 原理：GameCard 点击时在 sessionStorage 写入 `pending_view_{gameId}` 标记，
 *       此组件挂载后检查标记，存在则加入队列，延迟批量上报。
 *       刷新页面、切换标签等不会重复计数。
 *
 * 优化：队列积累 + 延迟发送，减少 Beacon 请求数量
 */

// 全局队列，积累多个浏览记录后批量上报
const VIEW_QUEUE: { gameId: string; ts: number }[] = []
let FLUSH_TIMER: ReturnType<typeof setTimeout> | null = null
const FLUSH_DELAY = 1000 // 1 秒延迟发送，积累更多数据
const BATCH_SIZE = 5 // 达到 5 条立即发送

function flushViews() {
  if (VIEW_QUEUE.length === 0) return

  const views = [...VIEW_QUEUE]
  VIEW_QUEUE.length = 0 // 清空队列

  // 批量上报
  const payload = JSON.stringify({ views, batch: true })
  navigator.sendBeacon("/api/games/views/batch", payload)
}

function queueView(gameId: string) {
  VIEW_QUEUE.push({ gameId, ts: Date.now() })

  // 达到批次大小立即发送
  if (VIEW_QUEUE.length >= BATCH_SIZE) {
    flushViews()
    return
  }

  // 否则延迟发送
  if (FLUSH_TIMER) clearTimeout(FLUSH_TIMER)
  FLUSH_TIMER = setTimeout(flushViews, FLUSH_DELAY)
}

export function ViewCounter({ gameId }: { gameId: string }) {
  useEffect(() => {
    const key = `pending_view_${gameId}`
    if (!sessionStorage.getItem(key)) return
    sessionStorage.removeItem(key)

    // 加入队列而非立即发送
    queueView(gameId)
  }, [gameId])

  return null
}