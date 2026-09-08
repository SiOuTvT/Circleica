"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * AdminBackButton — 用途：返回「浏览器上一页」（router.back() 走浏览历史），
 * 用于没有明确上级路由的页面；与 AdminBackLink（跳指定 href）不是同一功能，勿互相替换。
 */
export function AdminBackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex h-8 items-center gap-1.5 px-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      返回
    </button>
  )
}
