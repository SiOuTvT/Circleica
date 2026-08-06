"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * AdminBatchActions — 后台批量操作条（仅 chrome）。
 * 批量逻辑（选中态、清除、各操作）由消费页自行实现并透传 onClear / children。
 * 需要 onClick，故为 Client Component。
 */
export function AdminBatchActions({
  count,
  onClear,
  children,
  className,
}: {
  count: number
  onClear?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2",
        className,
      )}
    >
      <span className="text-sm text-muted-foreground">已选 {count} 项</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-[color:var(--admin-accent,var(--primary))] hover:underline"
        >
          清除
        </button>
      )}
      {children}
    </div>
  )
}
