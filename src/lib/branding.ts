/**
 * 品牌素材路径集中管理
 *
 * 素材来源：D:\Circleica_Galvelica_Logos（Circleica / Galvelica Logo 素材包，详见「使用说明.md」）
 * 已复制到 public/branding/ 供站点直接使用。
 *
 * 设计决策：
 * - 应用内导航/页脚一律使用「emblem 符号 + CSS 字标」组合，而非完整 lockup PNG。
 *   原因：lockup 的 "Circle" / "Galvel" 部分是软墨深色（#35322E），在深色顶栏/侧栏/页脚下
 *   会不可见；用 emblem（自带配色、主题安全）+ 由 CSS 渲染、随主题变色的字标，可同时保证
 *   浅色/深色模式下的可读性，且无需为 dark/light 各维护一套 PNG。
 * - favicon / manifest / PWA 图标使用 emblem 符号（与素材包 03_Favicon 一致）。
 * - 反白版（*-white）用于已知深色背景场景（如 OG 图）。
 */

/** Circleica 主色（钢青蓝），作为全站默认主题色 */
export const BRAND_THEME_COLOR = "#4C7E96"

export const BRANDING = {
  themeColor: BRAND_THEME_COLOR,
  circleica: {
    /** 透明底符号图标（钢青蓝），主题安全，深浅背景均可用 */
    emblem: "/branding/circleica-emblem.png",
    /** 反白版，专用于深色背景 */
    emblemWhite: "/branding/circleica-emblem-white.png",
    /** 完整 Lockup（图形+字标，透明底），浅色背景场景备用 */
    lockup: "/branding/circleica-lockup.png",
  },
  galvelica: {
    emblem: "/branding/galvelica-emblem.png",
    emblemWhite: "/branding/galvelica-emblem-white.png",
    lockup: "/branding/galvelica-lockup.png",
  },
} as const

export const CIRCLEICA_EMBLEM = BRANDING.circleica.emblem
export const GALVELICA_EMBLEM = BRANDING.galvelica.emblem
