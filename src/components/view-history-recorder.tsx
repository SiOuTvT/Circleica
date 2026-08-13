"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import type { TargetType } from "@/lib/view-history"

/**
 * 无 UI 的记录器：在作品/游戏详情挂载时向服务端上报一次浏览，
 * 服务端按当前登录用户写入 ViewHistory（继续浏览）。
 * 仅登录用户上报：游客跳过，避免每个详情页多一次无意义的 401 请求（审计噪音）。
 * 服务端对未登录请求仍返回 401（设计意图，供其他调用方语义正确）。
 */
export function ViewHistoryRecorder({ targetType, targetId }: { targetType: TargetType; targetId: string }) {
  const { status } = useSession()
  useEffect(() => {
    if (!targetId || status !== "authenticated") return
    const controller = new AbortController()
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {})
    return () => controller.abort()
  }, [targetType, targetId, status])
  return null
}
