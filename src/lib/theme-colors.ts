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

  // 焦点环：对比度安全的专用色（WCAG 1.4.11 非文本对比 ≥ 3:1）。
  // 主题色由用户自选、无下界，若直接用作焦点环描边，浅色主题下可能 ≈1:1 不可见。
  // 故按「各模式背景」在 JS 层派生两档安全色（亮背景暗化版 / 暗背景提亮版），
  // 由 CSS 按 .light 类选用 —— 切换明暗模式只切 class，无需重跑此函数。
  // 与用户自选主题色解耦：任何主题下焦点位置始终可辨识。
  root.style.setProperty("--focus-ring-light", deriveFocusRing(tokens.primary, "#fafafa"))
  root.style.setProperty("--focus-ring-dark", deriveFocusRing(tokens.primary, "#08080a"))
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

/* ── 焦点环对比度安全派生（WCAG 1.4.11 非文本对比 ≥ 3:1）──
 * 主题色由用户自选、无下界，若直用作焦点环描边，浅色主题下对比度可能 ≈1:1 不可见。
 * 故此处在 JS 层按「当前模式背景」派生两档安全色：亮背景用暗化版、暗背景用提亮版，
 * 校验 ≥ 目标对比度后才写入，与用户自选主题色解耦。 */

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

function mixToward(
  hex: string,
  target: [number, number, number],
  t: number,
): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return [
    Math.round(r + (target[0] - r) * t),
    Math.round(g + (target[1] - g) * t),
    Math.round(b + (target[2] - b) * t),
  ]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

/**
 * 推导对比度安全的焦点环颜色。
 * @param primaryHex 用户主题色
 * @param bgHex      目标模式背景色
 * @param threshold  目标对比度（默认 4.5，留足余量高于 3:1 强制线）
 */
function deriveFocusRing(primaryHex: string, bgHex: string, threshold = 4.5): string {
  const bg = hexToRgb(bgHex)
  const primary = hexToRgb(primaryHex)
  if (contrastRatio(primary, bg) >= threshold) return primaryHex

  // 背景亮 → 向黑靠拢；背景暗 → 向白靠拢
  const target: [number, number, number] = relativeLuminance(bg) > 0.5 ? [17, 17, 19] : [255, 255, 255]
  let current = primary
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    current = mixToward(primaryHex, target, Math.min(t, 1))
    if (contrastRatio(current, bg) >= threshold) break
  }
  return rgbToHex(current)
}
