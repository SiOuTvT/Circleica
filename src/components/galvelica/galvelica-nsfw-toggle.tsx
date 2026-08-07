"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

/**
 * 副站 NSFW 封面/截图开关（不登录）。
 * 开关定位 = **封面/截图露骨度**（不是游戏内容是否 R18）：
 * 安全模式（默认）下 coverSexual>=2 的露骨封面 URL 不渲染、露骨截图不入画廊，防平台检测。
 * 偏好写入 cookie `gal_nsfw`（1=显示 / 0=隐藏），默认隐藏。
 * router.refresh() 触发服务端重渲染，galvelica.ts 的 maskNsfwCovers 按 cookie 应用策略。
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
  const label = mounted ? (enabled ? "显示露骨" : "隐藏露骨") : "NSFW"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={`切换露骨封面/截图显示（当前${label}）`}
      title={`露骨封面过滤（封面/截图含露骨内容时隐藏）：${label}`}
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
