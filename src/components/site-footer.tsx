import Link from "next/link"

const ABOUT_LINKS: { label: string; href: string }[] = [
  { label: "关于我们", href: "/about" },
  { label: "社区规范", href: "/rules" },
  { label: "联系我们", href: "/contact" },
]

const GITHUB_URL = "https://github.com/SiOuTvT/Circleica"

export function SiteFooter({ siteName = "Circleica" }: { siteName?: string }) {
  return (
    <footer role="contentinfo" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-[1140px] px-4 py-6">
        {/* 品牌居左 + 链接居右，中间留白备后续扩展 */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* 左：品牌介绍 */}
          <div className="max-w-sm space-y-1.5 text-center sm:text-left">
            <span className="font-heading text-base font-bold leading-none text-primary">{siteName}</span>
            <p className="text-sm text-muted-foreground">
              视觉小说资源档案库，收录制作组、创作者与精选合集。
            </p>
            <p className="text-xs text-muted-foreground/70">本站资源均来自互联网，仅供学习交流使用</p>
          </div>

          {/* 右：关于 + GitHub */}
          <nav aria-label="关于" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm sm:justify-end">
            {ABOUT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>

        {/* 底栏 */}
        <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} {siteName}. 保留所有权利。
        </div>
      </div>
    </footer>
  )
}
