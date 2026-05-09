"use client"

import { useEffect } from "react";
import { useBreadcrumb } from "./breadcrumb-context";

/**
 * 在页面中使用此组件来设置当前动态段的面包屑标签。
 * 例如在游戏详情页中：<BreadcrumbSetter segment={gameId} label={game.title} />
 */
export function BreadcrumbSetter({ segment, label }: { segment: string; label: string }) {
  const { setDynamicLabel } = useBreadcrumb()

  useEffect(() => {
    setDynamicLabel(segment, label)
  }, [segment, label, setDynamicLabel])

  return null
}