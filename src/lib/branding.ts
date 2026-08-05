/**
 * 品牌素材路径集中管理
 *
 * 素材来源：D:\Circleica_Galvelica_Logos（Circleica / Galvelica Logo 素材包，详见「使用说明.md」）
 * 已复制到 public/branding/ 供站点直接使用。
 *
 * 设计决策（2025-08 精修）：
 * - full 模式直接使用「baked lockup」PNG（图形 + 站名文字烘焙在一起），浅色背景用彩版图，
 *   深色背景用反白版（*-lockup-white.png）。不再用 CSS 字标，避免深色顶栏下软墨文字不可见。
 * - icon 模式统一只显示 emblem 符号（自带配色、主题安全），浅色用彩版、深色用反白版。
 * - 用户上传的自定义 `site_logo` 本质是「完整 Logo」替代，仅在 full 模式显示；其没有反白版，
 *   深色背景下用 CSS `brightness-0 invert` 兜底变白剪影，保证深色顶栏/侧栏可读。
 * - favicon / manifest / PWA 图标使用 emblem 符号（与素材包 03_Favicon 一致）。
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
    /** 完整 Lockup（图形+字标，透明底），浅色背景用 */
    lockup: "/branding/circleica-lockup.png",
    /** 完整 Lockup 反白版，深色背景用 */
    lockupWhite: "/branding/circleica-lockup-white.png",
  },
  galvelica: {
    emblem: "/branding/galvelica-emblem.png",
    emblemWhite: "/branding/galvelica-emblem-white.png",
    lockup: "/branding/galvelica-lockup.png",
    lockupWhite: "/branding/galvelica-lockup-white.png",
  },
} as const

export const CIRCLEICA_EMBLEM = BRANDING.circleica.emblem
export const GALVELICA_EMBLEM = BRANDING.galvelica.emblem

/**
 * Logo 显示模式（单一数据源：站点设置 `logo_mode`）
 * - "full"：完整 Logo = 完整 lockup 图（图形 + 站名文字 baked）
 * - "icon"：仅图标 = 只显示 emblem 符号
 */
export type LogoMode = "full" | "icon"
export const DEFAULT_LOGO_MODE: LogoMode = "full"

export interface ResolvedLogo {
  /** 规范化后的模式（非法值回退 full） */
  mode: LogoMode
  /** 浅色背景使用的图（彩色 lockup / 彩色 emblem / 自定义彩图） */
  lightSrc: string
  /** 深色背景使用的图（白色 lockup / 白色 emblem）。自定义图时与 lightSrc 相同，由 CSS filter 变白 */
  darkSrc: string
  /** 是否为用户上传的自定义 Logo（仅 full 模式）。true 时深色背景用 brightness-0 invert 兜底变白 */
  isCustom: boolean
}

/**
 * 根据显示模式解析应渲染的 Logo 图形源。
 *
 * 规则（与需求一致）：
 * - icon 模式：统一只显示 emblem 符号（保持品牌统一），忽略自定义 siteLogo。
 * - full 模式：显示完整 lockup；若有自定义 siteLogo 则优先用自定义图（本质是「完整 Logo」替代）。
 *
 * @param mode      原始 logo_mode（可能为空或非法）
 * @param opts.emblem      该站点专属 emblem 路径（主站 circleica / 副站 galvelica）
 * @param opts.emblemWhite 该站点 emblem 反白版路径
 * @param opts.lockup      该站点完整 lockup（彩版）
 * @param opts.lockupWhite 该站点完整 lockup 反白版
 * @param opts.siteLogo    自定义 Logo URL（仅主站使用，副站传空）
 */
export function resolveLogo(
  mode: LogoMode | string | undefined | null,
  opts: {
    emblem: string
    emblemWhite: string
    lockup: string
    lockupWhite: string
    siteLogo?: string | null
  },
): ResolvedLogo {
  const resolved: LogoMode = mode === "icon" ? "icon" : "full"

  if (resolved === "icon") {
    // 仅图标：统一显示 emblem 符号（保持品牌统一），忽略自定义 siteLogo
    return { mode: "icon", lightSrc: opts.emblem, darkSrc: opts.emblemWhite, isCustom: false }
  }

  // 完整 Logo：图形 + 文字（baked lockup）。自定义图本质是「完整 Logo」替代，仅 full 模式显示
  if (opts.siteLogo) {
    return { mode: "full", lightSrc: opts.siteLogo, darkSrc: opts.siteLogo, isCustom: true }
  }
  return { mode: "full", lightSrc: opts.lockup, darkSrc: opts.lockupWhite, isCustom: false }
}
