import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type AdminStatusTone = "default" | "success" | "warning" | "danger" | "info"

const toneClass: Record<AdminStatusTone, string> = {
  success: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  danger: "bg-red-500/10 text-red-600 ring-red-500/20",
  warning: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  info: "bg-sky-500/10 text-sky-600 ring-sky-500/20",
  default: "bg-muted text-muted-foreground ring-border",
}

/**
 * AdminStatusBadge — 后台统一状态徽标（药丸）。
 * 纯 Server Component，数据无关。tone 决定配色；galvelica 预留用于子站视觉。
 */
export function AdminStatusBadge({
  tone = "default",
  children,
  galvelica,
}: {
  tone?: AdminStatusTone
  children: ReactNode
  galvelica?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ring-1",
        toneClass[tone],
        galvelica && "ring-[color:var(--gal-accent,var(--admin-accent,var(--primary)))]",
      )}
    >
      {children}
    </span>
  )
}
