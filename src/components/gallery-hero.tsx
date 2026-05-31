"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, X } from "lucide-react"
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
  const setActiveIndex = useCallback((index: number) => {
    setInternalIndex(index)
  }, [])

  // Notify parent of index changes outside of render to avoid setState-during-render
  const prevInternalRef = useRef(internalIndex)
  useEffect(() => {
    if (prevInternalRef.current !== internalIndex) {
      prevInternalRef.current = internalIndex
      onIndexChange?.(internalIndex)
    }
  }, [internalIndex, onIndexChange])
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
      setInternalIndex(prev => (prev + 1) % galleryImages.length)
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

  // Lightbox 状态
  const [lightboxOpen, setLightboxOpen] = useState(false)
  useBodyScrollLock(lightboxOpen)

  const openLightbox = useCallback(() => setLightboxOpen(true), [])
  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  if (galleryImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground/40">
        暂无预览图
      </div>
    )
  }

  const activeImage = galleryImages[activeIndex]

  // Track previous image for crossfade
  const prevImageRef = useRef<string>(activeImage)
  const [fading, setFading] = useState(false)
  useEffect(() => {
    if (prevImageRef.current !== activeImage) {
      setFading(true)
      const timer = setTimeout(() => {
        prevImageRef.current = activeImage
        setFading(false)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [activeImage])

  return (
    <>
    {/* Lightbox 弹层 */}
    {lightboxOpen && (
      <div
        className="fixed inset-0 z-[100] touch-none flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={closeLightbox}
      >
        <button
          type="button"
          onClick={closeLightbox}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        {hasMultipleImages && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="上一张"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={galleryImages[activeIndex]}
          alt={`${gameTitle} - 预览 ${activeIndex + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />

        {hasMultipleImages && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="下一张"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
          {activeIndex + 1} / {galleryImages.length}
        </div>
      </div>
    )}

    <div className="group relative h-full w-full overflow-hidden">
      {/* Previous image underneath for crossfade */}
      {prevImageRef.current !== activeImage && (
        <Image
          src={prevImageRef.current}
          alt=""
          fill
          className="object-cover"
          draggable={false}
          sizes="(max-width: 1024px) 100vw, 62vw"
          quality={80}
        />
      )}
      <Image
        src={activeImage}
        alt={`${gameTitle} - 预览 ${activeIndex + 1}`}
        fill
        className={`object-cover cursor-pointer ${fading ? 'hero-fade-enter' : ''}`}
        style={fading ? { animation: "heroFadeIn 0.35s ease-out" } : undefined}
        draggable={false}
        sizes="(max-width: 1024px) 100vw, 62vw"
        quality={80}
        priority={activeIndex === 0}
        loading={activeIndex === 0 ? undefined : "lazy"}
        onDoubleClick={openLightbox}
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
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", opacity: 0.7 }}
            aria-label="上一张"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", opacity: 0.7 }}
            aria-label="下一张"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      )}

      {/* 放大按钮 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openLightbox() }}
        className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 active:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:hover:scale-105"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", opacity: 0.7 }}
        aria-label="放大查看"
      >
        <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      </button>

      {/* 右上角控件 */}
      <div className="absolute right-2 top-2 sm:right-3 sm:top-3 flex items-center gap-1 sm:gap-1.5">
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
            className="flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 sm:hover:scale-105"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", opacity: 0.7 }}
            aria-label={isPaused ? "继续轮播" : "暂停轮播"}
          >
            {isPaused ? <Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <Pause className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          </button>
        )}
        <span
          className="rounded-full px-1.5 py-0.5 text-[8px] sm:px-2 sm:text-[10px] font-semibold tabular-nums backdrop-blur-md"
          style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          {activeIndex + 1}/{galleryImages.length}
        </span>
      </div>
    </div>
    </>
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
    <div ref={barRef} className="flex h-full items-center gap-1.5 sm:gap-2 overflow-x-auto px-2 sm:px-3 scrollbar-hide" style={{ scrollBehavior: "smooth" }}>
      {screenshots.map((img, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className="relative shrink-0 overflow-hidden transition-all duration-200 h-[48px] w-[85px] sm:h-[60px] sm:w-[106px] lg:h-[72px] lg:w-[128px]"
          style={{
            borderRadius: "8px",
            border: i === activeIndex ? `2px solid hsl(var(--primary))` : "2px solid transparent",
            opacity: i === activeIndex ? 1 : 0.45,
          }}
        >
          <Image
            src={img}
            alt={`${gameTitle} 缩略图 ${i + 1}`}
            fill
            className="object-cover"
            draggable={false}
            sizes="(max-width: 640px) 85px, (max-width: 1024px) 106px, 128px"
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