import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * EmptyState — 统一空数据态（设计语言：Archive 四类 + Game Detail + Forum + Notifications 共用）
 * 居中图标 + 文案，与 archive-placeholder 的 empty 分支像素级一致：
 *   gap-3 py-20 text-center / 图标 h-12 w-12 muted-foreground/20 strokeWidth 1
 */
export function EmptyState({
  icon: Icon,
  message,
  className,
}: {
  icon: LucideIcon
  message: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-20 text-center", className)}>
      <Icon className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}