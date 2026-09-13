"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Clapperboard } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * 副站「真人实拍/写实 3D」过滤开关（不登录）。
 * 默认隐藏 contentFlags=LIVE_ACTION 的作品（用户偏好：不喜欢真人 3D）。
 * 偏好写入 cookie `gal_realfilter`（1=显示 / 0=隐藏），默认隐藏。
 * router.refresh() 触发服务端重渲染，galvelica.ts 的 workWhere 读取该 cookie 过滤。
 */
export function GalvelicaRealFilterToggle({ className }: { className?: string }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const v = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gal_realfilter="))
      ?.split("=")[1]
    setEnabled(v === "1")
    setMounted(true)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    document.cookie = `gal_realfilter=${next ? "1" : "0"};path=/;max-age=31536000`
    router.refresh()
  }

  const label = mounted ? (enabled ? "显示真人3D" : "隐藏真人3D") : "真人3D"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={enabled}
          aria-label={`切换真人实拍/写实3D作品显示（当前${label}）`}
          data-active={enabled}
          className={
            className ??
            "galvelica-navlink galvelica-fs-body inline-flex h-9 items-center gap-1.5 px-2.5 font-medium whitespace-nowrap"
          }
        >
          <Clapperboard className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>真人实拍/写实 3D 作品过滤：默认隐藏，点击可切换显示或隐藏（无需登录）</TooltipContent>
    </Tooltip>
  )
}
