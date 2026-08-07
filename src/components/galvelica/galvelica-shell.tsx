import type { ReactNode } from "react"
import Link from "next/link"
import { GalvelicaNav } from "./galvelica-nav"
import { GalvelicaHeader } from "./galvelica-header"

/**
 * Galvelica 子站外壳：独立的页面框架。
 * 主站 LayoutWrapper 已对 /galvelica 短路掉主站框架（侧边栏 / 顶栏 / 面包屑），
 * 这里承载子站自己的品牌头、内部导航、页面主体与极简页脚，
 * 让用户明显感到进入了另一个产品（仍属 Circleica）。
 */
export async function GalvelicaShell({ children }: { children: ReactNode }) {
  return (
    <div className="galvelica-root flex min-h-screen flex-col bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_98%,transparent)]">
      <a
        href="#galvelica-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[10000] focus:rounded-lg focus:bg-[var(--gal-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--theme-fg)] focus:outline-none"
      >
        跳到主内容
      </a>

      {/* ── 独立子站 Header（档案刊头）── */}
      <GalvelicaHeader />

      {/* ── 页面主体 ── */}
      <main id="galvelica-main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>

      {/* ── 极简页脚（与主站的联系点之一）── */}
      <footer className="mt-12 border-t border-[color-mix(in_srgb,var(--gal-accent)_14%,transparent)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="galvelica-wordmark text-base font-semibold text-foreground">Galvelica</span>
            <span className="ml-2">· Circleica 旗下同人视觉小说资料库</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/" className="transition-colors hover:text-foreground">返回 Circleica</Link>
            <Link href="/galvelica/works" className="transition-colors hover:text-foreground">浏览全部作品</Link>
            <Link href="/galvelica/tags" className="transition-colors hover:text-foreground">标签索引</Link>
            <Link href="/galvelica/years" className="transition-colors hover:text-foreground">年份索引</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
