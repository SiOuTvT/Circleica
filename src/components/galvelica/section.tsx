import Link from "next/link"
import type { ReactNode } from "react"

interface SectionProps {
  title: string
  subtitle?: string
  href?: string
  hrefLabel?: string
  children: ReactNode
  className?: string
}

export function Section({ title, subtitle, href, hrefLabel = "查看全部", children, className }: SectionProps) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="galvelica-serif text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="galvelica-navlink shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            {hrefLabel} →
          </Link>
        )}
      </div>
      <div className="galvelica-rule mb-4" />
      {children}
    </section>
  )
}
