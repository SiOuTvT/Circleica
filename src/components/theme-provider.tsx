"use client"

import { applyThemeColor, THEME_PRESETS, type ThemePreset } from "@/lib/theme-colors"
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

interface ThemeContextType {
  themeColor: string
  setThemeColor: (color: string) => void
  presets: ThemePreset[]
  currentPreset: ThemePreset | null
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: "#38BDF8",
  setThemeColor: () => {},
  presets: THEME_PRESETS,
  currentPreset: null,
})

export function useThemeColor() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = "site-theme-color"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState("#38BDF8")
  const [loaded, setLoaded] = useState(false)

  // Apply color to CSS variables
  const applyColor = useCallback((color: string) => {
    applyThemeColor(color)
  }, [])

  // Fetch from server on mount
  useEffect(() => {
    // First try localStorage for instant display
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      setThemeColorState(cached)
      applyColor(cached)
    }

    // Then fetch from server for authoritative value
    fetch("/api/site-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.themeColor) {
          setThemeColorState(data.themeColor)
          applyColor(data.themeColor)
          localStorage.setItem(STORAGE_KEY, data.themeColor)
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [applyColor])

  // Also re-apply when dark/light mode toggles
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyColor(themeColor)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [themeColor, applyColor])

  const setThemeColor = useCallback((color: string) => {
    setThemeColorState(color)
    applyColor(color)
    localStorage.setItem(STORAGE_KEY, color)
    // Note: server persistence is handled by admin theme page with confirm button
  }, [applyColor])

  const currentPreset = THEME_PRESETS.find((p) => p.color.toLowerCase() === themeColor.toLowerCase()) ?? null

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, presets: THEME_PRESETS, currentPreset }}>
      {children}
    </ThemeContext.Provider>
  )
}