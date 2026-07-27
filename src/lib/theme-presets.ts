/** 主题色预设
 *
 *  精选 8 套，每套携带完整颜色 Token。
 *  结构色（surface / card / border / muted / text）由 globals.css 统一管理，不随预设变化。
 *  只有强调色系（primary / accent / ring / glow）每套不同。
 *
 *  hover / active 一律向白色提亮（lift）派生，绝不机械加深；
 *  与自定义色的 deriveTokensFromHex(lightenHex) 同源，保证前后台一致。
 *  薄荷绿为旗舰默认，呼应 Galvelica 的档案馆气质。 */

export interface ThemeTokens {
  primary: string
  hover: string
  active: string
  /** 较浅的强调色，用于次要强调、icon、hover 背景 */
  accent: string
  /** 聚焦环颜色（通常 primary 半透明） */
  ring: string
  /** 辉光 / 阴影强调色（通常 primary 极低透明度） */
  glow: string
}

export interface ThemePreset {
  name: string
  label: string
  /** 预设主色（向后兼容 + 预览） */
  color: string
  desc: string
  tokens: ThemeTokens
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "mint",
    label: "薄荷",
    color: "#5FA8A0",
    desc: "安静 · 档案馆",
    tokens: {
      primary: "#5FA8A0",
      hover:   "#69ada6",
      active:  "#72b2ab",
      accent:  "#7bbfb8",
      ring:    "rgba(95,168,160,0.3)",
      glow:    "rgba(95,168,160,0.08)",
    },
  },
  {
    name: "dusk",
    label: "黛蓝",
    color: "#6E8CA8",
    desc: "沉静 · 夜色",
    tokens: {
      primary: "#6E8CA8",
      hover:   "#7793ad",
      active:  "#7f9ab2",
      accent:  "#8fa6bc",
      ring:    "rgba(110,140,168,0.3)",
      glow:    "rgba(110,140,168,0.08)",
    },
  },
  {
    name: "haze",
    label: "雾紫",
    color: "#8E84B0",
    desc: "朦胧 · 梦境",
    tokens: {
      primary: "#8E84B0",
      hover:   "#958bb5",
      active:  "#9c93b9",
      accent:  "#a9a0c4",
      ring:    "rgba(142,132,176,0.3)",
      glow:    "rgba(142,132,176,0.08)",
    },
  },
  {
    name: "ochre",
    label: "赭石",
    color: "#C0905E",
    desc: "温润 · 旧纸",
    tokens: {
      primary: "#C0905E",
      hover:   "#c49768",
      active:  "#c89d71",
      accent:  "#d4ab7a",
      ring:    "rgba(192,144,94,0.3)",
      glow:    "rgba(192,144,94,0.08)",
    },
  },
  {
    name: "pine",
    label: "松绿",
    color: "#5C8A7E",
    desc: "幽深 · 林间",
    tokens: {
      primary: "#5C8A7E",
      hover:   "#669186",
      active:  "#70988d",
      accent:  "#7ea89a",
      ring:    "rgba(92,138,126,0.3)",
      glow:    "rgba(92,138,126,0.08)",
    },
  },
  {
    name: "rose",
    label: "灰玫",
    color: "#B08696",
    desc: "温柔 · 余晖",
    tokens: {
      primary: "#B08696",
      hover:   "#b58d9c",
      active:  "#b995a3",
      accent:  "#c7a2ae",
      ring:    "rgba(176,134,150,0.3)",
      glow:    "rgba(176,134,150,0.08)",
    },
  },
  {
    name: "slate",
    label: "烟灰蓝",
    color: "#8898A8",
    desc: "沉稳 · 内敛",
    tokens: {
      primary: "#8898A8",
      hover:   "#8f9ead",
      active:  "#96a4b2",
      accent:  "#a4b1bf",
      ring:    "rgba(136,152,168,0.3)",
      glow:    "rgba(136,152,168,0.08)",
    },
  },
  {
    name: "amber",
    label: "暖琥珀",
    color: "#D4A050",
    desc: "温暖 · 复古",
    tokens: {
      primary: "#D4A050",
      hover:   "#d7a65b",
      active:  "#d9ab65",
      accent:  "#e0b86e",
      ring:    "rgba(212,160,80,0.3)",
      glow:    "rgba(212,160,80,0.08)",
    },
  },
]

/** 获取预设的主题 Token */
export function getThemeTokens(presetName: string): ThemeTokens | null {
  const preset = THEME_PRESETS.find((p) => p.name === presetName)
  return preset?.tokens ?? null
}

/** 默认预设名 */
export const DEFAULT_PRESET = "mint"

/** 默认 Token */
export const DEFAULT_TOKENS: ThemeTokens = {
  primary: "#5FA8A0",
  hover:   "#69ada6",
  active:  "#72b2ab",
  accent:  "#7bbfb8",
  ring:    "rgba(95,168,160,0.3)",
  glow:    "rgba(95,168,160,0.08)",
}
