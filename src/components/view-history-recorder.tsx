"use client"

import { useEffect } from "react"
import type { TargetType } from "@/lib/view-history"

/**
 * 无 UI 的记录器：在作品/游戏详情挂载时向服务端上报一次浏览，
 * 服务端按当前登录用户写入 ViewHistory（继续浏览）。未登录则接口返回 401，静默忽略。
 */
export function ViewHistoryRecorder({ targetType, targetId }: { targetType: TargetType; targetId: string }) {
  useEffect(() => {
    if (!targetId) return
    const controller = new AbortController()
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})
    return () => controller.abort()
  }, [targetType, targetId])
  return null
}
