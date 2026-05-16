"use client"

import { applyThemeColor } from "@/lib/theme-colors"
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

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
  themeColor: "#38BDF8",
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
  applyThemeColor(s.themeColor, s.themeRadius, s.themeShadowIntensity, s.themeAlpha)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FullThemeSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Fetch from server on mount
  useEffect(() => {
    // Try localStorage for instant display
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as FullThemeSettings
        setSettings(parsed)
        doApply(parsed)
      }
    } catch {}

    // Fetch authoritative value
    fetch("/api/site-settings")
      .then(res => res.json())
      .then(data => {
        if (data.themeColor) {
          const s: FullThemeSettings = {
            themeColor: data.themeColor,
            themeRadius: data.themeRadius ?? 12,
            themeShadowIntensity: data.themeShadowIntensity ?? 50,
            themeAlpha: data.themeAlpha ?? 15,
          }
          setSettings(s)
          doApply(s)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
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
  }, [])

  return (
    <ThemeContext.Provider value={{ settings, setColor, setRadius, setShadowIntensity, setAlpha, applyAll }}>
      {children}
    </ThemeContext.Provider>
  )
}