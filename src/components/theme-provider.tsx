"use client"

import { applyThemeTokens, resolveTokens } from "@/lib/theme-colors"
import { logger } from "@/lib/logger"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { apiFetchSafe } from "@/lib/api-client"

export interface FullThemeSettings {
  themeColor: string
  themeRadius: number
  themeShadowIntensity: number
  themeAlpha: number
}

interface ThemeContextType {
  settings: FullThemeSettings
  setColor: (color: string) => void
  setRadius: (r: number) => void
  setShadowIntensity: (v: number) => void
  setAlpha: (v: number) => void
  applyAll: (s: FullThemeSettings) => void
}

const DEFAULT_SETTINGS: FullThemeSettings = {
  themeColor: "#5FA8A0",
  themeRadius: 12,
  themeShadowIntensity: 50,
  themeAlpha: 15,
}

const STORAGE_KEY = "site-theme-settings"

const ThemeContext = createContext<ThemeContextType>({
  settings: DEFAULT_SETTINGS,
  setColor: () => {},
  setRadius: () => {},
  setShadowIntensity: () => {},
  setAlpha: () => {},
  applyAll: () => {},
})

export function useThemeSettings() {
  return useContext(ThemeContext)
}

// Legacy compat
export function useThemeColor() {
  const { settings, setColor } = useThemeSettings()
  return { themeColor: settings.themeColor, setThemeColor: setColor, presets: [], currentPreset: null }
}

function doApply(s: FullThemeSettings) {
  document.documentElement.setAttribute("data-theme", "custom")
  // 应用 Token（不自动派生颜色）
  applyThemeTokens(resolveTokens(s.themeColor))
  // 半径 / 阴影 / 透明度作为独立 CSS 变量
  document.documentElement.style.setProperty("--theme-radius", `${s.themeRadius}px`)
  document.documentElement.style.setProperty("--theme-shadow-intensity", `${s.themeShadowIntensity / 100}`)
  document.documentElement.style.setProperty("--theme-alpha", `${(s.themeAlpha ?? 15)}%`)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FullThemeSettings>(DEFAULT_SETTINGS)
  const [, setLoaded] = useState(false)

  // Fetch from server on mount；API 为权威来源，localStorage 仅作 API 不可达时的回退
  useEffect(() => {
    const controller = new AbortController()
    apiFetchSafe<{
      themeColor?: string
      themeRadius?: number
      themeShadowIntensity?: number
      themeAlpha?: number
    }>("/api/site-settings", { signal: controller.signal })
      .then(({ ok, data }) => {
        if (ok && data?.themeColor) {
          const s: FullThemeSettings = {
            themeColor: data.themeColor,
            themeRadius: data.themeRadius ?? 12,
            themeShadowIntensity: data.themeShadowIntensity ?? 50,
            themeAlpha: data.themeAlpha ?? 15,
          }
          setSettings(s)
          doApply(s)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
          document.documentElement.setAttribute("data-theme", "custom")
        }
        // API 正常返回但无 themeColor（未初始化/DB 无数据）：
        // 保持服务端下发的颜色（ThemeScript 已在 <head> 中设置好），
        // 不信任可能陈旧的 localStorage（避免重装后残留值覆盖默认薄荷）。
      })
      .catch(() => {
        // 网络断开时回退 localStorage
        try {
          const cached = localStorage.getItem(STORAGE_KEY)
          if (cached) {
            const parsed = JSON.parse(cached) as FullThemeSettings
            if (parsed.themeColor) {
              setSettings(parsed)
              doApply(parsed)
              document.documentElement.setAttribute("data-theme", "custom")
            }
          }
        } catch (err) { logger.api.warn("[ThemeProvider] fallback localStorage failed", { error: err instanceof Error ? err.message : String(err) }) }
      })
      .finally(() => setLoaded(true))

    return () => controller.abort()
  }, [])

  // Re-apply on dark/light toggle
  useEffect(() => {
    const observer = new MutationObserver(() => doApply(settings))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [settings])

  const updateAndApply = useCallback((patch: Partial<FullThemeSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      doApply(next)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      // 设置 data-theme 属性
      document.documentElement.setAttribute("data-theme", "custom")
      return next
    })
  }, [])

  const setColor = useCallback((c: string) => updateAndApply({ themeColor: c }), [updateAndApply])
  const setRadius = useCallback((r: number) => updateAndApply({ themeRadius: r }), [updateAndApply])
  const setShadowIntensity = useCallback((v: number) => updateAndApply({ themeShadowIntensity: v }), [updateAndApply])
  const setAlpha = useCallback((v: number) => updateAndApply({ themeAlpha: v }), [updateAndApply])
  const applyAll = useCallback((s: FullThemeSettings) => {
    setSettings(s)
    doApply(s)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    // 设置 data-theme 属性
    document.documentElement.setAttribute("data-theme", "custom")
  }, [])

  const value = useMemo(() => ({ settings, setColor, setRadius, setShadowIntensity, setAlpha, applyAll }), [settings, setColor, setRadius, setShadowIntensity, setAlpha, applyAll])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}