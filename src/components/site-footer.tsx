import Link from "next/link"

const FOOTER_GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "浏览",
    links: [
      { label: "发现", href: "/discover" },
      { label: "制作组图鉴", href: "/credits" },
      { label: "创作者图鉴", href: "/creators" },
      { label: "精选合集", href: "/collections" },
      { label: "标签浏览", href: "/tags" },
      { label: "排行榜", href: "/ranking" },
    ],
  },
  {
    title: "社区",
    links: [{ label: "求档区", href: "/forum" }],
  },
  {
    title: "关于",
    links: [
      { label: "关于我们", href: "/about" },
      { label: "社区规范", href: "/rules" },
      { label: "联系我们", href: "/contact" },
    ],
  },
]

export function SiteFooter({ siteName = "Circleica" }: { siteName?: string }) {
  return (
    <footer role="contentinfo" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1140px] px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* 品牌区 */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
              视觉小说 · 同人 · 资源
            </p>
            <p className="font-heading text-lg font-bold leading-tight text-foreground">{siteName}</p>
            <p className="text-sm text-muted-foreground">完全免费开放的视觉小说档案库</p>
            <p className="text-xs text-muted-foreground/70">本站资源均来自互联网，仅供学习交流使用</p>
          </div>

          {/* 链接组 */}
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title} className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                {group.title}
              </p>
              <ul className="space-y-2">
                {group.links.map((link) => (
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
          ))}
        </div>

        {/* 底栏 */}
        <div className="mt-8 border-t border-border/60 pt-6">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {siteName}. 保留所有权利。
          </p>
        </div>
      </div>
    </footer>
  )
}
