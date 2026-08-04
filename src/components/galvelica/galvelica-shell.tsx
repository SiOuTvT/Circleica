import Link from "next/link"
import type { ReactNode } from "react"
import { Search } from "lucide-react"
import { GalvelicaNav } from "./galvelica-nav"
import { getLogoMode } from "@/lib/site-settings"

/**
 * Galvelica 子站外壳：独立的页面框架。
 * 主站 LayoutWrapper 已对 /galvelica 短路掉主站框架（侧边栏 / 顶栏 / 面包屑），
 * 这里承载子站自己的品牌头、内部导航、页面主体与极简页脚，
 * 让用户明显感到进入了另一个产品（仍属 Circleica）。
 */
export async function GalvelicaShell({ children }: { children: ReactNode }) {
  // 副站 Logo 显示模式与主站共享同一数据源（站点设置 logo_mode），保证整体同步
  const logoMode = await getLogoMode()
  return (
    <div className="galvelica-root flex min-h-screen flex-col bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_98%,transparent)]">
      <a
        href="#galvelica-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[10000] focus:rounded-lg focus:bg-[var(--gal-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--theme-fg)] focus:outline-none"
      >
        跳到主内容
      </a>

      {/* ── 独立子站 Header ── */}
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)] bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_88%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_72%,transparent)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/galvelica" className="group inline-flex shrink-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_35%,transparent)]"
              style={{ background: "var(--gal-accent-soft)" }}
              aria-hidden
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className="galvelica-wordmark text-2xl font-semibold text-foreground">Galvelica</span>
              <span className="mt-1 hidden text-[11px] tracking-wide text-muted-foreground sm:block">同人视觉小说资料库</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <form action="/galvelica/works" method="get" className="hidden md:block">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
                <input
                  type="search"
                  name="search"
                  placeholder="检索作品、社团…"
                  className="w-44 rounded-lg border border-input bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none lg:w-52"
                  aria-label="检索"
                />
              </div>
            </form>

            <Link
              href="/"
              className="galvelica-navlink hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium sm:inline-flex"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              返回 Circleica
            </Link>
          </div>
        </div>

        {/* 内部导航：桌面端内联在 header 下沿，移动端单独成行 */}
        <div className="border-t border-[color-mix(in_srgb,var(--gal-accent)_12%,transparent)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <GalvelicaNav className="flex-wrap py-2" logoMode={logoMode} />
          </div>
        </div>
      </header>

      {/* ── 页面主体 ── */}
      <main id="galvelica-main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      {/* ── 极简页脚（与主站的联系点之一）── */}
      <footer className="mt-12 border-t border-[color-mix(in_srgb,var(--gal-accent)_14%,transparent)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="galvelica-wordmark text-base font-semibold text-foreground">Galvelica</span>
            <span className="ml-2">· Circleica 旗下同人视觉小说档案馆</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/" className="transition-colors hover:text-foreground">返回 Circleica</Link>
            <Link href="/galvelica/works" className="transition-colors hover:text-foreground">浏览全部档案</Link>
            <Link href="/galvelica/tags" className="transition-colors hover:text-foreground">标签索引</Link>
            <Link href="/galvelica/years" className="transition-colors hover:text-foreground">年份索引</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
