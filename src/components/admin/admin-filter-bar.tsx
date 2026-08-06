import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * AdminFilterBar — 后台统一筛选条容器。
 * 纯 Server Component，仅负责 flex 布局；筛选控件由 children 提供。
 */
export function AdminFilterBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
}
