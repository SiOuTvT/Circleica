"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

/**
 * 截图灯箱 — 全站唯一的灯箱实现。
 *
 * 原先内联在首屏那套巨幕卡片里，现抽出为独立组件；巨幕与缩略图条搬进简介 tab 的截图网格后
 * 已无人引用，连同组合它们的画廊组件一并删除，本文件只留灯箱本身。
 * 索引外部受控 —— 点第几张就从第几张开，不写死 0。
 */
export function ScreenshotLightbox({
  images,
  index,
  open,
  onClose,
  onIndexChange,
  altTitle,
}: {
  images: string[]
  index: number
  open: boolean
  onClose: () => void
  onIndexChange?: (index: number) => void
  altTitle?: string
}) {
  useBodyScrollLock(open)
  const hasMultiple = images.length > 1

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const didSwipeRef = useRef(false)

  const goPrev = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange?.(index === 0 ? images.length - 1 : index - 1)
  }, [hasMultiple, images.length, index, onIndexChange])

  const goNext = useCallback(() => {
    if (!hasMultiple) return
    onIndexChange?.((index + 1) % images.length)
  }, [hasMultiple, images.length, index, onIndexChange])

  // 键盘导航：仅在灯箱打开且页面可见时监听
  useEffect(() => {
    if (!open || document.hidden) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, goPrev, goNext, onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    didSwipeRef.current = false
  }, [])

  const handleSwipeEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || !hasMultiple) return
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y
      touchStartRef.current = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        didSwipeRef.current = true
        if (dx < 0) goNext()
        else goPrev()
      }
    },
    [hasMultiple, goNext, goPrev]
  )

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index]}
          alt={altTitle ? `${altTitle} - 预览 ${index + 1}` : `预览 ${index + 1}`}
          className="max-h-[92vh] max-w-[92vw] object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="关闭"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="上一张"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {hasMultiple && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="下一张"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 text-sm text-white/70">
        {index + 1} / {images.length}
      </div>
    </div>,
    document.body
  )
}
