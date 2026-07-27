"use client"

import type { ThemeTokens } from "./theme-presets"
import { resolveThemeTokens } from "./theme-colors-shared"

/** 根据 hex 解析出 ThemeTokens（客户端版） */
export function resolveTokens(hex?: string): ThemeTokens {
  return resolveThemeTokens(hex)
}

/**
 * 应用主题 Token。
 * --primary 由 JS 注入；悬停/按下令牌（--primary-hover/--primary-active 等）
 * 交由 globals.css 用 color-mix(var(--primary) …) 统一派生，
 * 保证任何主题色（含自定义）都不做机械加深，前后台共用一套语言。
 */
export function applyThemeTokens(tokens: ThemeTokens) {
  const root = document.documentElement

  // 强调色系：--primary 由 JS 注入
  root.style.setProperty("--primary", tokens.primary)
  // 注意：--accent 是 shadcn 的中性 hover 底（ghost 按钮 / navlink hover 等），
  // 必须保持中性，不在此覆盖成主题强调色，否则全站中性 hover 会泛主题色。
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
