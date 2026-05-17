"use client"

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"

interface GalleryHeroProps {
  screenshots: string[]
  gameTitle: string
  activeIndex?: number
  onIndexChange?: (index: number) => void
}

/**
 * 16:10 巨幕预览卡片 — 400px 锁高
 * 支持自动/手动切换 CG 图片
 * 支持受控模式（通过 activeIndex/onIndexChange）和非受控模式
 */
export function HeroCarousel({ screenshots, gameTitle, activeIndex: controlledIndex, onIndexChange }: GalleryHeroProps) {
  const [internalIndex, setInternalIndex] = useState(0)
  const activeIndex = controlledIndex ?? internalIndex
  const setActiveIndex = useCallback((index: number | ((prev: number) => number)) => {
    if (typeof index === "function") {
      setInternalIndex(prev => {
        const next = index(prev)
        onIndexChange?.(next)
        return next
      })
    } else {
      setInternalIndex(index)
      onIndexChange?.(index)
    }
  }, [onIndexChange])
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const galleryImages = screenshots.length > 0 ? screenshots : []
  const hasMultipleImages = galleryImages.length > 1

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startAutoPlay = useCallback(() => {
    if (!hasMultipleImages || isPaused) return
    stopAutoPlay()
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % galleryImages.length)
    }, 4000)
  }, [hasMultipleImages, isPaused, stopAutoPlay, galleryImages.length])

  useEffect(() => {
    startAutoPlay()
    return () => stopAutoPlay()
  }, [startAutoPlay, stopAutoPlay])

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex) return
      setActiveIndex(index)
      if (!isPaused) startAutoPlay()
    },
    [activeIndex, isPaused, startAutoPlay]
  )

  const goPrev = useCallback(() => {
    goTo(activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1)
  }, [activeIndex, galleryImages.length, goTo])

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % galleryImages.length)
  }, [activeIndex, galleryImages.length, goTo])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goPrev, goNext])

  if (galleryImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground/40">
        暂无预览图
      </div>
    )
  }

  const activeImage = galleryImages[activeIndex]

  return (
    <div className="group relative h-full w-full overflow-hidden">
      <Image
        key={activeIndex}
        src={activeImage}
        alt={`${gameTitle} - 预览 ${activeIndex + 1}`}
        fill
        className="object-cover"
        style={{ animation: "heroFadeIn 0.35s ease-out" }}
        draggable={false}
        sizes="(max-width: 1024px) 100vw, 62vw"
        quality={80}
        priority={activeIndex === 0}
        loading={activeIndex === 0 ? undefined : "lazy"}
      />

      {/* 底部渐变遮罩 */}
      <div
        className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}
      />

      {/* 导航箭头 */}
      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="上一张"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="下一张"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* 右上角控件 */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        {hasMultipleImages && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setIsPaused((p) => {
                const next = !p
                if (next) stopAutoPlay()
                else startAutoPlay()
                return next
              })
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-105"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label={isPaused ? "继续轮播" : "暂停轮播"}
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </button>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.45)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          {activeIndex + 1}/{galleryImages.length}
        </span>
      </div>
    </div>
  )
}

/**
 * 画廊缩略图条 — 100px 锁高
 * 横向排列的小缩略图，点击联动巨幕
 */
export function GalleryStrip({
  screenshots,
  gameTitle,
  activeIndex,
  onSelect,
}: {
  screenshots: string[]
  gameTitle: string
  activeIndex: number
  onSelect: (index: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barRef.current) return
    const active = barRef.current.children[activeIndex] as HTMLElement
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
  }, [activeIndex])

  if (screenshots.length === 0) return null

  return (
    <div ref={barRef} className="flex h-full items-center gap-2 overflow-x-auto px-3 scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
      {screenshots.map((img, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className="relative shrink-0 overflow-hidden transition-all duration-200"
          style={{
            height: "72px",
            width: "128px",
            borderRadius: "8px",
            border: i === activeIndex ? `2px solid var(--clr-blue)` : "2px solid transparent",
            opacity: i === activeIndex ? 1 : 0.45,
            transform: i === activeIndex ? "scale(1.04)" : "scale(1)",
            boxShadow: i === activeIndex ? `0 0 10px var(--clr-blue)50` : "none",
          }}
        >
          <Image
            src={img}
            alt={`${gameTitle} 缩略图 ${i + 1}`}
            fill
            className="object-cover"
            draggable={false}
            sizes="128px"
            quality={50}
            loading="lazy"
            decoding="async"
          />
          {i !== activeIndex && (
            <div className="absolute inset-0 bg-black/20 transition-opacity duration-200 hover:opacity-0" />
          )}
        </button>
      ))}
    </div>
  )
}