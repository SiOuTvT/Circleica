export interface ThemePreset {
  name: string
  color: string
  label: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: "sky", color: "#38BDF8", label: "天空蓝" },
  { name: "lavender", color: "#D8B8E0", label: "薰衣草紫" },
  { name: "mint", color: "#B2E8D8", label: "薄荷绿" },
  { name: "jade", color: "#C8F2E4", label: "翡翠绿" },
  { name: "ice", color: "#E3EBF5", label: "冰川蓝" },
]

/**
 * Darken a hex color by a percentage (0-1)
 */
function darkenHex(hex: string, amount: number): string {
  hex = hex.replace("#", "")
  const r = Math.max(0, Math.round(parseInt(hex.substring(0, 2), 16) * (1 - amount)))
  const g = Math.max(0, Math.round(parseInt(hex.substring(2, 4), 16) * (1 - amount)))
  const b = Math.max(0, Math.round(parseInt(hex.substring(4, 6), 16) * (1 - amount)))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

/**
 * Lighten a hex color by mixing with white
 */
function lightenHex(hex: string, amount: number): string {
  hex = hex.replace("#", "")
  const r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) + (255 - parseInt(hex.substring(0, 2), 16)) * amount))
  const g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) + (255 - parseInt(hex.substring(2, 4), 16)) * amount))
  const b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) + (255 - parseInt(hex.substring(4, 6), 16)) * amount))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

/**
 * Get luminance of a color to determine if it's light or dark
 */
function getLuminance(hex: string): number {
  hex = hex.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Apply theme color to CSS custom properties on :root
 * Uses hex values directly since globals.css uses hex format
 */
export function applyThemeColor(hex: string) {
  const root = document.documentElement
  const isDark = root.classList.contains("dark")

  if (isDark) {
    // Dark mode: use a slightly muted version of the color
    const primaryDark = darkenHex(hex, 0.15)
    root.style.setProperty("--primary", primaryDark)
    root.style.setProperty("--ring", primaryDark)
    root.style.setProperty("--sidebar-primary", primaryDark)
    root.style.setProperty("--primary-foreground", "#f0f0f2")
    root.style.setProperty("--sidebar-primary-foreground", "#f0f0f2")
    root.style.setProperty("--accent", darkenHex(hex, 0.7))
    root.style.setProperty("--accent-foreground", lightenHex(hex, 0.4))
    // Update accent color variables used across the site
    root.style.setProperty("--clr-blue", primaryDark)
    root.style.setProperty("--clr-sky", lightenHex(hex, 0.25))
    root.style.setProperty("--clr-glow", `${hex}1F`)
  } else {
    // Light mode: use the color as-is
    root.style.setProperty("--primary", hex)
    root.style.setProperty("--ring", hex)
    root.style.setProperty("--sidebar-primary", hex)
    // Primary foreground: dark text if light color, white if dark color
    const fg = getLuminance(hex) > 0.6 ? "#18181b" : "#ffffff"
    root.style.setProperty("--primary-foreground", fg)
    root.style.setProperty("--sidebar-primary-foreground", fg)
    root.style.setProperty("--accent", lightenHex(hex, 0.8))
    root.style.setProperty("--accent-foreground", darkenHex(hex, 0.5))
    // Update accent color variables used across the site
    root.style.setProperty("--clr-blue", darkenHex(hex, 0.2))
    root.style.setProperty("--clr-sky", lightenHex(hex, 0.15))
    root.style.setProperty("--clr-glow", `${hex}1F`)
  }
}
