import Link from "next/link"
import { cn } from "@/lib/utils"

interface AZIndexProps {
  /** 当前数据中实际存在的首字 key（已排序），用于渲染索引条目 */
  available: string[]
  active?: string
  anchorPrefix?: string
  className?: string
}

/**
 * AZIndex — 字母 / 首字索引导航（Framework，仅 Archive 浏览体系）
 *
 * 稀疏自动隐藏：当可用首字 < 2 个时返回 null（例如 compact 态只有 1~3 条、
 * 或搜索结果集中在同一首字）。Studio 用组名首字母；Creator 用名首字；
 * Collection 不挂载此组件。
 */
export function AZIndex({ available, active, anchorPrefix = "archive-letter-", className }: AZIndexProps) {
  if (available.length < 2) return null
  return (
    <nav
      aria-label="首字索引"
      className={cn(
        "sticky top-0 z-20 -mx-1 overflow-x-auto rounded-xl border-b border-border/60 bg-card/90 px-1 py-2 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex w-max items-center gap-1">
        {available.map((key) => {
          const isActive = active === key
          return (
            <Link
              key={key}
              href={`#${anchorPrefix}${encodeURIComponent(key)}`}
              className={cn(
                "min-w-[1.75rem] rounded-md px-2 py-1 text-center text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {key === "#" ? "#" : key}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
