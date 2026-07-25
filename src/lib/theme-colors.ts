"use client"

import type { ThemeTokens } from "./theme-presets"
import { THEME_PRESETS, DEFAULT_TOKENS } from "./theme-presets"

/** 根据 hex 解析出 ThemeTokens（客户端版） */
export function resolveTokens(hex?: string): ThemeTokens {
  if (hex) {
    const preset = THEME_PRESETS.find((p) => p.color.toLowerCase() === hex.toLowerCase())
    if (preset) return preset.tokens
  }
  return DEFAULT_TOKENS
}

/**
 * 应用主题 Token：直接设置精心设计的颜色值，不做任何自动派生。
 * 每套预设的 hover / active / accent 都已人工调好，
 * 不再依赖 darkenHex / lightenHex 一刀切。
 */
export function applyThemeTokens(tokens: ThemeTokens) {
  const root = document.documentElement

  // 强调色系
  root.style.setProperty("--primary", tokens.primary)
  root.style.setProperty("--primary-hover", tokens.hover)
  root.style.setProperty("--primary-active", tokens.active)
  root.style.setProperty("--accent", tokens.accent)
  root.style.setProperty("--ring", tokens.ring)
  root.style.setProperty("--clr-glow", tokens.glow)

  // 向后兼容：--theme-color / --clr-blue / --clr-sky / --clr-warm
  root.style.setProperty("--theme-color", tokens.primary)
  root.style.setProperty("--theme-color-hover", tokens.hover)
  root.style.setProperty("--theme-color-active", tokens.active)
  root.style.setProperty("--clr-blue", tokens.primary)
  root.style.setProperty("--clr-sky", tokens.accent)

  // 原始分量（供 color-mix / rgba 引用）
  const [r, g, b] = hexToRgb(tokens.primary)
  root.style.setProperty("--theme-r", String(r))
  root.style.setProperty("--theme-g", String(g))
  root.style.setProperty("--theme-b", String(b))

  // 前景文字（primary 上的文字颜色，WCAG 对比度）
  root.style.setProperty("--primary-foreground", computeContrastFg(tokens.primary))
  root.style.setProperty("--theme-fg", computeContrastFg(tokens.primary))
}

/** 兼容旧接口：从单个 hex 构建 ThemeTokens 并应用（不推荐） */
export function applyThemeColor(hex: string) {
  const tokens: ThemeTokens = {
    primary: hex,
    hover:   hex,  // 降级——建议使用预设
    active:  hex,
    accent:  hex,
    ring:    hex,
    glow:    hex.replace("#", "rgba(") + ",0.1)",
  }
  applyThemeTokens(tokens)
}

/* ── 工具 ── */

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "")
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)]
}

function computeContrastFg(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  const R = r / 255, G = g / 255, B = b / 255
  const lum = 0.2126 * (R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4))
            + 0.7152 * (G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4))
            + 0.0722 * (B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4))
  return (1.05 / (lum + 0.05)) >= 4.5 ? "#ffffff" : "#18181b"
}
