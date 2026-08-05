import { cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

interface AdminPageContainerProps {
  children: React.ReactNode
  /** 页面标题 */
  title?: string
  /** 小标签（eyebrow），大写，与全站 Archive 系统同源 */
  eyebrow?: string
  /** 页面描述 */
  description?: string
  /** 标题右侧操作区 */
  actions?: React.ReactNode
  /** 额外 className */
  className?: string
}

/**
 * Admin 后台统一页面容器
 * 所有后台页面使用此组件确保一致的间距、宽度、标题样式。
 * 标题区内部复用 AdminPageHeader，与全站 Archive 系统同源（eyebrow + H1 + description）。
 */
export function AdminPageContainer({
  children,
  title,
  eyebrow,
  description,
  actions,
  className,
}: AdminPageContainerProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {title && (
        <AdminPageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={actions}
        />
      )}
      {children}
    </div>
  )
}
