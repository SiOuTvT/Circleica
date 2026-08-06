import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * AdminSectionHeading — 后台区块小标题。
 * 主站：<h2 className="text-sm font-semibold">；Galvelica：<h3 className="galvelica-h3">（衬线 18px）。
 * 纯 Server Component，数据无关。
 */
export function AdminSectionHeading({
  children,
  icon: Icon,
  galvelica,
}: {
  children: ReactNode
  icon?: LucideIcon
  galvelica?: boolean
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="h-4 w-4" />}
      {galvelica ? (
        <h3 className="galvelica-h3">{children}</h3>
      ) : (
        <h2 className="font-heading text-base font-semibold">{children}</h2>
      )}
    </div>
  )
}
