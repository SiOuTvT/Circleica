import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ArchiveDensity } from "./density"

export interface StatItem {
  label: string
  value: ReactNode
  hint?: string
}

interface StatsBarProps {
  items: StatItem[]
  /** 预留密度感知（dense 可加均值 / 年份分布等扩展项），当前统一渲染 */
  density?: ArchiveDensity
  className?: string
}

/**
 * StatsBar — 统计条（Design Language，四类档案 + Game Detail 共用，按需）
 */
export function StatsBar({ items, density: _density = "standard", className }: StatsBarProps) {
  if (items.length === 0) return null
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch gap-x-6 gap-y-3 rounded-2xl bg-muted/40 px-5 py-3.5 ring-1 ring-border/50",
        className,
      )}
    >
      {items.map((it, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-caption font-medium uppercase tracking-wider text-muted-foreground/70">
            {it.label}
          </span>
          <span className="mt-0.5 text-lg font-semibold text-foreground tabular-nums sm:text-xl">
            {it.value}
          </span>
          {it.hint && <span className="text-caption text-muted-foreground/60">{it.hint}</span>}
        </div>
      ))}
    </div>
  )
}
