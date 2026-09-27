"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Store } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * 副站「商业系列作品」过滤开关（无需登录）。
 * 默认显示商业作 —— 默认走全库口径，不替用户预先过滤；点击后才隐藏商业作。
 * 偏好写入 cookie `gal_commercial`（0=隐藏 / 1 或缺省=显示）。
 * router.refresh() 触发服务端重渲染，galvelica.ts 的 commercialWhere() / basePoolWhere() 读取该 cookie。
 */
export function GalvelicaCommercialToggle({ className }: { className?: string }) {
  const router = useRouter()
  const [hidden, setHidden] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const v = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gal_commercial="))
      ?.split("=")[1]
    setHidden(v === "0")
    setMounted(true)
  }, [])

  function toggle() {
    const next = !hidden
    setHidden(next)
    document.cookie = `gal_commercial=${next ? "0" : "1"};path=/;max-age=31536000`
    router.refresh()
  }

  const label = mounted ? (hidden ? "隐藏商业作" : "显示商业作") : "商业作"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={hidden}
          aria-label={`切换商业系列作品显示（当前${label}）`}
          data-active={hidden}
          className={
            className ??
            "galvelica-navlink galvelica-fs-body inline-flex h-9 items-center gap-1.5 px-2.5 font-medium whitespace-nowrap"
          }
        >
          <Store className="h-4 w-4" strokeWidth={2} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>商业系列作品过滤：默认显示（全库口径），点击可隐藏商业作（无需登录）</TooltipContent>
    </Tooltip>
  )
}
