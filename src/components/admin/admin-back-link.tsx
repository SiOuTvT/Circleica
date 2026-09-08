import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * AdminBackLink — 用途：返回「指定的上级页面」（用 <Link> 跳转到明确 href，如 /admin/tags）。
 * 与 AdminBackButton（router.back() 走浏览历史）不是同一功能，勿互相替换。
 * 纯 Server Component。accent 随 var(--admin-accent) → 默认 --primary。
 */
export function AdminBackLink({
  href,
  label,
  icon: Icon = ArrowLeft,
}: {
  href: string
  label?: string
  icon?: LucideIcon
}) {
  const Glyph = Icon
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1.5 px-2.5 text-sm text-muted-foreground transition-colors hover:text-[color:var(--admin-accent,var(--primary))]"
    >
      <Glyph className="h-4 w-4" />
      {label ?? "返回"}
    </Link>
  )
}
