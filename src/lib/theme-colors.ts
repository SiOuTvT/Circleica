"use client"

import { darkenHex, getHue, hexToRgb, lightenHex } from "./theme-colors-shared"

export { getThemeCSSVariables, type ThemeVars } from "./theme-colors-shared"

/* ── applyThemeColor：设置 :root CSS 变量（需要浏览器环境） ── */
export function applyThemeColor(hex: string, radius = 12, shadowIntensity = 50, alpha = 15) {
  const root = document.documentElement
  const isDark = !root.classList.contains("light")
  const [r, g, b] = hexToRgb(hex)
  const lum = 0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255)
  // 前景文字：按 WCAG 对比度选择白/黑，确保 ≥ 4.5:1
  const R = r / 255, G = g / 255, B = b / 255
  const bgLum = 0.2126 * (R <= 0.04045 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4))
              + 0.7152 * (G <= 0.04045 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4))
              + 0.0722 * (B <= 0.04045 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4))
  const whiteContrast = 1.05 / (bgLum + 0.05)
  const fg = whiteContrast >= 4.5 ? "#ffffff" : "#18181b"
  const alphaDecimal = alpha / 100
  const hue = getHue(hex)

  if (isDark) {
    const primaryDark = darkenHex(hex, 0.05)
    root.style.setProperty("--primary", primaryDark)
    root.style.setProperty("--ring", primaryDark)
    root.style.setProperty("--accent", lightenHex(hex, 0.15))
    root.style.setProperty("--clr-blue", primaryDark)
    root.style.setProperty("--clr-sky", lightenHex(hex, 0.2))
    root.style.setProperty("--clr-glow", `rgba(${r}, ${g}, ${b}, ${alphaDecimal * 0.75})`)
  } else {
    root.style.setProperty("--primary", hex)
    root.style.setProperty("--ring", hex)
    root.style.setProperty("--accent", lightenHex(hex, 0.45))
    root.style.setProperty("--clr-blue", darkenHex(hex, 0.2))
    root.style.setProperty("--clr-sky", lightenHex(hex, 0.15))
    root.style.setProperty("--clr-glow", `rgba(${r}, ${g}, ${b}, ${alphaDecimal * 0.75})`)
  }

  // 全局主题色原始 hex（供链接、NProgress、focus ring 等直接引用）
  root.style.setProperty("--theme-color", hex)
  // Hover / Active 加深色
  root.style.setProperty("--theme-color-hover", darkenHex(hex, 0.15))
  root.style.setProperty("--theme-color-active", darkenHex(hex, 0.25))
  // 主题色前景文字（白/黑自动判定）
  root.style.setProperty("--primary-foreground", fg)
  root.style.setProperty("--theme-fg", fg)

  // 通用变量
  root.style.setProperty("--clr-warm", "#f59e0b")
  root.style.setProperty("--theme-radius", `${radius}px`)
  root.style.setProperty("--theme-shadow-intensity", `${shadowIntensity / 100}`)
  root.style.setProperty("--theme-alpha", `${alphaDecimal}`)
  root.style.setProperty("--theme-hue", `${hue}`)
  root.style.setProperty("--theme-r", `${r}`)
  root.style.setProperty("--theme-g", `${g}`)
  root.style.setProperty("--theme-b", `${b}`)
}
