"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

/**
 * 主题感知的文字容器
 * 深色模式：text-zinc-100
 * 亮色模式：text-zinc-900
 */
export function ThemeText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark")

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null
    const t = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    setTheme(t)

    // 监听 class 变化
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("light") ? "light" : "dark")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className={cn(
      theme === "dark" ? "text-zinc-100" : "text-zinc-900",
      className
    )}>
      {children}
    </div>
  )
}