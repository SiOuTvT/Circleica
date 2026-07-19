import { cn } from "@/lib/utils"

interface AdminPageContainerProps {
  children: React.ReactNode
  /** 页面标题 */
  title?: string
  /** 页面描述 */
  description?: string
  /** 标题右侧操作区 */
  actions?: React.ReactNode
  /** 额外 className */
  className?: string
}

/**
 * Admin 后台统一页面容器
 * 所有后台页面使用此组件确保一致的间距、宽度、标题样式
 */
export function AdminPageContainer({
  children,
  title,
  description,
  actions,
  className,
}: AdminPageContainerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          {title && (
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
