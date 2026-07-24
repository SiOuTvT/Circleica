import type { ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"

interface DiscoverySectionProps {
  title: string
  icon: LucideIcon
  description?: string
  actionHref?: string
  actionLabel?: string
  children: ReactNode
}

/** 发现页通用区块容器：标题 + 图标 + 可选「查看全部」操作 */
export function DiscoverySection({
  title,
  icon: Icon,
  description,
  actionHref,
  actionLabel = "查看全部",
  children,
}: DiscoverySectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-5 w-5 shrink-0 text-[var(--theme-color)]" strokeWidth={1.75} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-heading font-semibold text-foreground">{title}</h2>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actionHref && (
          <Link
            href={actionHref}
            className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
