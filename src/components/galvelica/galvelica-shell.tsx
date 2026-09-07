import type { ReactNode } from "react"
import { GalvelicaRail } from "./galvelica-rail"
import { getGalvelicaThemeSettings } from "@/lib/site-settings"
import { computeContrastFg, hexToRgb } from "@/lib/theme-colors-shared"
import { getYears, getStudios, getPopularTags, listWorks } from "@/lib/galvelica"

/**
 * Galvelica 子站外壳：左栏（品牌 / 检索 / 导航 / 开关区）+ 右内容两栏。
 * 副站不再渲染顶部横向 header 与 nav（原 galvelica-header / galvelica-nav 已删除）。
 * 主题隔离：读取 SiteSetting[galvelica:*] 命名空间，以 inline style 注入 .galvelica-root
 * 作用域（--gal-accent / --primary / --theme-* / --gal-radius / --gal-shadow /
 * --gal-alpha），只影响副站页面；主站 :root 不动。
 */
export async function GalvelicaShell({ children }: { children: ReactNode }) {
  const s = await getGalvelicaThemeSettings()
  const [tr, tg, tb] = hexToRgb(s.themeColor)
  const fg = computeContrastFg(s.themeColor)
  const accentStyle = {
    "--gal-accent": s.themeColor,
    "--gal-accent-strong": s.themeColor,
    "--gal-accent-soft": `rgba(${tr}, ${tg}, ${tb}, 0.14)`,
    "--gal-accent-softer": `rgba(${tr}, ${tg}, ${tb}, 0.07)`,
    "--primary": s.themeColor,
    "--primary-foreground": fg,
    "--clr-blue": s.themeColor,
    "--theme-r": String(tr),
    "--theme-g": String(tg),
    "--theme-b": String(tb),
    "--theme-color": s.themeColor,
    "--theme-fg": fg,
    "--gal-radius": `${s.themeRadius}px`,
    "--gal-shadow-alpha": String(s.themeShadowIntensity / 100),
    "--gal-alpha": `${s.themeAlpha}%`,
  } as React.CSSProperties

  // 左栏导航计数：复用现有聚合（getYears / getStudios / getPopularTags / listWorks），
  // 不新增任何查询语义，仅取真实计数用于导航右侧 <small>。
  const [years, studios, tags, worksRes] = await Promise.all([
    getYears(),
    getStudios(),
    getPopularTags(500),
    listWorks({ pageSize: 1 }),
  ])
  const counts = {
    works: worksRes.total,
    tags: tags.length,
    years: years.length,
    studios: studios.length,
  }

  return (
    <div
      className="galvelica-root flex min-h-screen flex-col bg-[color-mix(in_srgb,var(--gal-paper,#0c1413)_98%,transparent)]"
      style={accentStyle}
    >
      <a
        href="#galvelica-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[10000] focus:rounded-lg focus:bg-[var(--gal-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-[var(--theme-fg)] focus:outline-none"
      >
        跳到主内容
      </a>

      <div className="galvelica-layout">
        <GalvelicaRail counts={counts} />
        <main id="galvelica-main" className="galvelica-content">
          {children}
        </main>
      </div>
    </div>
  )
}
