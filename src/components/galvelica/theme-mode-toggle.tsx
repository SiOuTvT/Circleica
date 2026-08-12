"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, SunMoon } from "lucide-react"

type ThemeMode = "dark" | "light" | "system"

/**
 * 副站明暗模式切换：从主站 TopNav 抽出的三态逻辑（dark → light → system）。
 * 纯 DOM + localStorage，不依赖任何 React context / next-themes。
 * 全局 ThemeScript 已在 <head> 注入，副站 FOUC 已覆盖，此处无需额外处理。
 */
export function ThemeModeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemeMode | null) || "system"
    setTheme(saved)
    setMounted(true)

    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = () => {
      const cur = localStorage.getItem("theme")
      if (cur === "system" || !cur) {
        const isLight = mq.matches
        document.documentElement.classList.toggle("light", isLight)
        document.documentElement.classList.toggle("dark", !isLight)
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  function toggleTheme() {
    const next: ThemeMode =
      theme === "dark" ? "light" : theme === "light" ? "system" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)

    let isLight = false
    if (next === "light") isLight = true
    else if (next === "dark") isLight = false
    else isLight = window.matchMedia("(prefers-color-scheme: light)").matches

    document.documentElement.classList.toggle("light", isLight)
    document.documentElement.classList.toggle("dark", !isLight)
  }

  // 挂载前渲染中性图标，避免 hydration mismatch
  const Icon = !mounted ? SunMoon : theme === "dark" ? Moon : theme === "light" ? Sun : SunMoon
  const label = mounted
    ? theme === "dark"
      ? "深色"
      : theme === "light"
        ? "浅色"
        : "跟随系统"
    : "主题"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`切换主题（当前${label}）`}
      title={`主题：${label}`}
      className={
        className ??
        "galvelica-navlink inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium"
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}
