"use client"

import { useRouter } from "next/navigation"
import { Compass } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 副站「随机」入口（客户端按钮）。
 * 每次点击带时间戳 query（?v=Date.now()）→ 产生新 URL，绕过 Next Router Cache
 * （next.config staleTimes.dynamic=30s），确保每次都向服务端要一个新的随机作品，
 * 而不是命中缓存 → 观感上"和刷新一样"。
 */
export function GalvelicaRandomLink({
  label = "随机",
  className,
  showIcon = true,
  active = false,
}: {
  label?: string
  className?: string
  showIcon?: boolean
  active?: boolean
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      data-active={active}
      onClick={() => router.push(`/galvelica/random?v=${Date.now()}`)}
      className={cn("inline-flex cursor-pointer items-center gap-1.5", className)}
    >
      {showIcon && <Compass className="h-4 w-4 shrink-0" strokeWidth={2} />}
      <span>{label}</span>
    </button>
  )
}
