import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * EmptyState — 全站统一空数据态（设计规范 canonical 件）
 * 居中图标 + 标题 +（可选）描述 +（可选）操作区，供前后台共用。
 *  容器：flex flex-col items-center gap-3 py-20 text-center
 *  图标：h-10 w-10 text-muted-foreground/40 strokeWidth 1.5
 *  title：text-sm font-medium text-foreground
 *  description：text-sm text-muted-foreground max-w-sm
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bordered = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  bordered?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 py-20 text-center",
        bordered && "rounded-xl border border-dashed border-border",
        className,
      )}
    >
      <Icon className="h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
