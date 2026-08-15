import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * AdminCard — 后台统一卡片容器。
 * 纯 Server Component，数据无关。hover 时边框随 accent（var(--admin-accent) → 默认 --primary）。
 */
export function AdminCard({
  children,
  className,
  galvelica: _galvelica,
  hover,
}: {
  children: ReactNode
  className?: string
  galvelica?: boolean
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        hover && "transition-colors hover:border-[color:var(--admin-accent,var(--primary))]",
        className,
      )}
    >
      {children}
    </div>
  )
}
