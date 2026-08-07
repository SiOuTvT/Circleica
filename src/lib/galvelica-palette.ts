/**
 * 副站专属标签预设色板（鲜活、去档案馆味的多元色）。
 * 仅用于副站标签编辑器的快捷取色；不进入主站，不影响主站 `TAG_PRESET_COLORS`。形状对齐（string[]）。
 *
 * 客户端安全模块：禁止 import next/headers / prisma / redis 等仅服务端可用的依赖，
 * 否则会被后台标签编辑组件（"use client"）引入而破坏 next build（webpack 报
 * "You're importing a module that depends on next/headers"）。
 */
export const GAL_PRESET_TAG_COLORS = [
  "#34C3AE", "#F2A65A", "#E0729B", "#7C9CF2", "#9C7AFF",
  "#5FB37A", "#E8B23A", "#E0694B", "#56C2D6", "#C98BD9",
]

/** 副站标签的数据库默认色（新建时未改色即落库此值，同时作为「用统一色」的兜底基准）。 */
export const GAL_DEFAULT_TAG_COLOR = "#34C3AE"

/**
 * 副站标签「统一配色」的 SiteSetting key 与默认色。
 * 单个站点级配置，作为副站标签的兜底/默认色（不区分分类、不与主站共享或关联）。
 * 保存统一色时会级联到「仍停留在上一版统一色」的标签；已单独自定义的标签保持不变。
 */
export const GAL_TAG_COLOR_KEY = "galvelica:tagColor"
export const GAL_TAG_COLOR_DEFAULT = GAL_DEFAULT_TAG_COLOR

/**
 * 副站主题主色（--gal-accent）的 SiteSetting key 与默认色。
 * 独立命名空间（galvelica: 前缀），主站永不读取；保存后由 GalvelicaShell 以
 * inline style 注入 .galvelica-root，仅作用副站作用域 → 与主站主题完全隔离。
 */
export const GAL_THEME_COLOR_KEY = "galvelica:themeColor"
export const GAL_THEME_COLOR_DEFAULT = GAL_DEFAULT_TAG_COLOR

/**
 * 副站主题的圆角 / 阴影强度 / 背景着色透明度（完整版主题编辑器四维，全部独立命名空间）。
 * 只注入 .galvelica-root（--gal-radius/--gal-shadow/--gal-alpha），绝不触碰主站全局
 * --theme-radius/--theme-shadow-intensity/--theme-alpha → 两站连接绝对隔离。
 */
export const GAL_THEME_RADIUS_KEY = "galvelica:themeRadius"
export const GAL_THEME_RADIUS_DEFAULT = 16 // px（副站卡片偏圆润，默认 16 与 rounded-2xl 一致）
export const GAL_THEME_SHADOW_KEY = "galvelica:themeShadowIntensity"
export const GAL_THEME_SHADOW_DEFAULT = 50 // %
export const GAL_THEME_ALPHA_KEY = "galvelica:themeAlpha"
export const GAL_THEME_ALPHA_DEFAULT = 15 // %
