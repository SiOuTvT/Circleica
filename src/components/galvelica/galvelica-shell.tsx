import Link from "next/link"
import type { ReactNode } from "react"
import { GalvelicaNav } from "./galvelica-nav"

/**
 * Galvelica 子站外壳：在全局 LayoutWrapper（侧边栏 + 顶栏 + 面包屑）之内，
 * 提供子站自己的品牌头与内部导航。作用域 class `galvelica-root` 承载独立主题 token。
 */
export function GalvelicaShell({ children }: { children: ReactNode }) {
  return (
    <div className="galvelica-root">
      <header className="mb-5 sm:mb-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/galvelica" className="group inline-flex items-center gap-2.5">
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
                <span className="mt-1 text-[11px] tracking-wide text-muted-foreground">同人视觉小说资料库 · Archive</span>
              </span>
            </Link>
          </div>
          <GalvelicaNav />
        </div>
        <div className="galvelica-rule mt-3 sm:mt-4" />
      </header>
      {children}
    </div>
  )
}
