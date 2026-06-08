/**
 * 主题颜色工具函数（纯函数，无浏览器依赖）
 * 可在服务端和客户端共用
 */

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

/* ── 主题变量类型 ── */
export interface ThemeVars {
  color: string
  radius: number
  shadowIntensity: number
  alpha: number
}

/* ── 生成完整 CSS 变量（纯函数，可在服务端使用） ── */
export function getThemeCSSVariables(vars: ThemeVars): string {
  const { color, radius, shadowIntensity, alpha } = vars
  const [r, g, b] = hexToRgb(color)
  const hue = getHue(color)
  const alphaDecimal = alpha / 100

  return [
    `--primary: ${hexToHsl(color)}`,
    `--ring: ${hexToHsl(color)}`,
    `--accent: ${hexToHsl(lightenHex(color, 0.45))}`,
    `--clr-blue: ${darkenHex(color, 0.05)}`,
    `--clr-sky: ${lightenHex(color, 0.2)}`,
    `--clr-glow: rgba(${r}, ${g}, ${b}, ${alphaDecimal * 0.75})`,
    `--clr-warm: #f59e0b`,
    `--theme-radius: ${radius}px`,
    `--theme-shadow-intensity: ${shadowIntensity / 100}`,
    `--theme-alpha: ${alphaDecimal}`,
    `--theme-hue: ${hue}`,
    `--theme-r: ${r}`,
    `--theme-g: ${g}`,
    `--theme-b: ${b}`,
  ].join("; ")
}
