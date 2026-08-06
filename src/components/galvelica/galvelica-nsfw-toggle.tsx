"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

/**
 * 副站 R18 / NSFW 内容开关（不登录）。
 * 偏好写入 cookie `gal_nsfw`（1=显示 / 0=隐藏），默认隐藏（公开档案馆的安全默认）。
 * router.refresh() 触发服务端重渲染，galvelica.ts 的 workWhere/publishedWhere 读取该 cookie 过滤。
 */
export function GalvelicaNsfwToggle({ className }: { className?: string }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const v = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gal_nsfw="))
      ?.split("=")[1]
    setEnabled(v === "1")
    setMounted(true)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    document.cookie = `gal_nsfw=${next ? "1" : "0"};path=/;max-age=31536000`
    router.refresh()
  }

  const Icon = enabled ? Eye : EyeOff
  const label = mounted ? (enabled ? "显示 R18" : "隐藏 R18") : "R18"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={`切换 R18 内容显示（当前${label}）`}
      title={`R18 内容：${label}`}
      data-active={enabled}
      className={
        className ??
        "galvelica-navlink inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap"
      }
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
