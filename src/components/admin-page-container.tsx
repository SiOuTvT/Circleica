import { cn } from "@/lib/utils"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

interface AdminPageContainerProps {
  children: React.ReactNode
  /** 页面标题 */
  title?: string
  /** 小标签（eyebrow），大写，与全站 Archive 系统同源 */
  eyebrow?: string
  /** 页面描述 */
  description?: React.ReactNode
  /** 标题右侧操作区 */
  actions?: React.ReactNode
  /** 额外 className */
  className?: string
  /** 副站 Galvelica 皮肤：衬线 H1 + 铜绿 --gal-accent 主色 */
  galvelica?: boolean
}

/**
 * Admin 后台统一页面容器
 * 所有后台页面使用此组件确保一致的间距、宽度、标题样式。
 * 标题区内部复用 AdminPageHeader，与全站 Archive 系统同源（eyebrow + H1 + description）。
 * galvelica 模式下：容器根设 --admin-accent → --gal-accent，H1 走衬线 galvelica-h1，eyebrow 用铜绿。
 */
export function AdminPageContainer({
  children,
  title,
  eyebrow,
  description,
  actions,
  className,
  galvelica,
}: AdminPageContainerProps) {
  const rootStyle = galvelica
    ? ({
        "--admin-accent": "var(--gal-accent)",
        "--admin-accent-strong": "var(--gal-accent-strong)",
      } as React.CSSProperties)
    : undefined

  return (
    <div className={cn("space-y-6", className)} style={rootStyle}>
      {title && (
        galvelica ? (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {eyebrow && (
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--gal-accent)]">
                  {eyebrow}
                </p>
              )}
              <h1 className="galvelica-h1 break-words">{title}</h1>
              {description && (
                <div className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        ) : (
          <AdminPageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={actions}
          />
        )
      )}
      {children}
    </div>
  )
}
