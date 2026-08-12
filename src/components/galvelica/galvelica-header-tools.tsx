"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import { ThemeModeToggle } from "./theme-mode-toggle"
import { GalvelicaNsfwToggle } from "./galvelica-nsfw-toggle"
import { GalvelicaRealFilterToggle } from "./galvelica-real-filter-toggle"

/**
 * 副站 Header 右侧工具组。
 * - 桌面端：检索 / 主题 / NSFW / 真人3D / 返回主站 全部直列。
 * - 移动端：仅保留检索 + 主题，其余（NSFW / 真人3D / 返回主站）收进「更多」菜单，
 *   避免顶部导航在手机上占掉半个屏幕、下滑时长时间遮挡内容。
 */
export function GalvelicaHeaderTools() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      <ThemeModeToggle />

      {/* 桌面端：过滤器与返回链接直列 */}
      <div className="hidden items-center gap-2.5 sm:flex">
        <GalvelicaNsfwToggle />
        <GalvelicaRealFilterToggle />
        <Link
          href="/"
          className="galvelica-navlink inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          返回 Circleica
        </Link>
      </div>

      {/* 移动端：折叠菜单 */}
      <div className="relative sm:hidden" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="更多选项"
          aria-expanded={open}
          className="galvelica-navlink inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 flex-col gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
              <span className="text-sm text-muted-foreground">NSFW 过滤</span>
              <GalvelicaNsfwToggle />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
              <span className="text-sm text-muted-foreground">真人 / 3D 过滤</span>
              <GalvelicaRealFilterToggle />
            </div>
            <Link
              href="/"
              className="galvelica-navlink flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              返回 Circleica
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
