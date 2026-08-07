/**
 * 主题颜色工具函数（纯函数，无浏览器依赖）
 * 可在服务端和客户端共用
 */

import { THEME_PRESETS, DEFAULT_TOKENS, type ThemeTokens } from "./theme-presets"

/* ── 颜色工具函数 ── */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")
}

export function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

export function darkenHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

export function hexToHsl(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const r1 = r / 255, g1 = g / 255, b1 = b / 255
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6; break
      case g1: h = ((b1 - r1) / d + 2) / 6; break
      case b1: h = ((r1 - g1) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function getHue(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const r1 = r / 255, g1 = g / 255, b1 = b / 255
  const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1)
  let h = 0
  if (max !== min) {
    const d = max - min
    switch (max) {
      case r1: h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) * 60; break
      case g1: h = ((b1 - r1) / d + 2) * 60; break
      case b1: h = ((r1 - g1) / d + 4) * 60; break
    }
  }
  return Math.round(h)
}

/* ── 从任意 hex 派生完整 ThemeTokens（自定义主题色核心） ──
 * hover / active 仅作接口兜底；真正的前台悬停/按下令牌由 CSS
 * 用 color-mix(var(--primary) …) 实时派生，保证不做机械加深。 */
export function deriveTokensFromHex(hex: string): ThemeTokens {
  const [r, g, b] = hexToRgb(hex)
  return {
    primary: hex,
    hover: lightenHex(hex, 0.06),
    active: lightenHex(hex, 0.12),
    accent: lightenHex(hex, 0.18),
    ring: `rgba(${r}, ${g}, ${b}, 0.35)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.10)`,
  }
}

/** 解析主题色 → ThemeTokens：预设走手工调好的 token，自定义色走派生（不再静默回退薄荷） */
export function resolveThemeTokens(hex?: string): ThemeTokens {
  if (hex) {
    const preset = THEME_PRESETS.find((p) => p.color.toLowerCase() === hex.toLowerCase())
    if (preset) return preset.tokens
    return deriveTokensFromHex(hex)
  }
  return DEFAULT_TOKENS
}

/** 主题色上的前景文字色（WCAG 对比度，纯函数，服务端/客户端通用） */
export function computeContrastFg(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const R = r / 255, G = g / 255, B = b / 255
  const lum = 0.2126 * (R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4))
            + 0.7152 * (G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4))
            + 0.0722 * (B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4))
  return (1.05 / (lum + 0.05)) >= 4.5 ? "#ffffff" : "#18181b"
}

