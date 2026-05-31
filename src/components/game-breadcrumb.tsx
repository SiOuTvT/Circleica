"use client"

import { useBreadcrumb } from "@/components/breadcrumb-context";
import { useEffect } from "react";

/**
 * 注册游戏详情页的动态面包屑标签
 * @param serialId - URL 中的 serialId（如 "1"），面包屑组件通过 URL 段匹配
 * @param gameTitle - 游戏标题，用于显示
 */
export function GameBreadcrumb({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { setDynamicLabel } = useBreadcrumb()

  useEffect(() => {
    setDynamicLabel(gameId, gameTitle)
    return () => {
      setDynamicLabel(gameId, null)
    }
  }, [gameId, gameTitle, setDynamicLabel])

  return null
}