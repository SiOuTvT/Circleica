import Link from "next/link"

const ABOUT_LINKS: { label: string; href: string }[] = [
  { label: "关于我们", href: "/about" },
  { label: "社区规范", href: "/rules" },
  { label: "联系我们", href: "/contact" },
]

export function SiteFooter({ siteName = "Circleica" }: { siteName?: string }) {
  return (
    <footer role="contentinfo" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1140px] px-4 py-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* 左：品牌介绍 */}
          <div className="max-w-sm space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              视觉小说 · 同人 · 资源
            </p>
            <p className="font-heading text-lg font-bold leading-tight text-foreground">{siteName}</p>
            <p className="text-sm text-muted-foreground">
              完全免费开放的视觉小说档案库，收录制作组、创作者与精选合集。
            </p>
            <p className="text-xs text-muted-foreground/70">本站资源均来自互联网，仅供学习交流使用</p>
          </div>

          {/* 右：关于 */}
          <nav aria-label="关于" className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">关于</p>
            <ul className="space-y-2">
              {ABOUT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* 底栏 */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {siteName}. 保留所有权利。
          </p>
        </div>
      </div>
    </footer>
  )
}
