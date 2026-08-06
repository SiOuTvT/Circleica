import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * AdminBackLink — 后台统一返回链接。
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
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-[color:var(--admin-accent,var(--primary))]"
    >
      <Glyph className="h-4 w-4" />
      {label ?? "返回"}
    </Link>
  )
}
