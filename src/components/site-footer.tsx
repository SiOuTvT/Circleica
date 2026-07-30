import Link from "next/link"

const ABOUT_LINKS: { label: string; href: string }[] = [
  { label: "关于我们", href: "/about" },
  { label: "社区规范", href: "/rules" },
  { label: "联系我们", href: "/contact" },
]

export function SiteFooter({ siteName = "Circleica" }: { siteName?: string }) {
  return (
    <footer role="contentinfo" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1140px] px-4 py-5">
        {/* 品牌 + 关于 同一行，作为居中整体，避免两端推满留大空 */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-12">
          {/* 左：品牌 */}
          <div className="flex items-baseline gap-2.5">
            <span className="font-heading text-base font-bold leading-none text-foreground">{siteName}</span>
            <span className="text-xs text-muted-foreground">视觉小说 · 同人 · 资源</span>
          </div>

          {/* 右：关于 */}
          <nav aria-label="关于" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
            {ABOUT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 底栏 */}
        <div className="mt-4 border-t border-border/60 pt-3 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} {siteName}. 保留所有权利。
        </div>
      </div>
    </footer>
  )
}
