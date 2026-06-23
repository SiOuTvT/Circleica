"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, X } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState, memo } from "react"

// 检测是否为触摸设备
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0)

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
    // setActiveIndex is stable (empty deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, isPaused, startAutoPlay]
  )

  const goPrev = useCallback(() => {
    goTo(activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1)
  }, [activeIndex, galleryImages.length, goTo])

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % galleryImages.length)
  }, [activeIndex, galleryImages.length, goTo])

  // Lightbox 状态（必须在使用它的 useEffect 之前声明）
  const [lightboxOpen, setLightboxOpen] = useState(false)
  useBodyScrollLock(lightboxOpen)

  const openLightbox = useCallback(() => setLightboxOpen(true), [])
  const closeLightbox = useCallback(() => setLightboxOpen(false), [])

  // 键盘事件监听 - 仅在 Lightbox 打开时监听，使用 VisibilityObserver 检测页面可见性
  useEffect(() => {
    // 仅在 Lightbox 打开且页面可见时监听键盘事件
    if (!lightboxOpen || document.hidden) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "Escape") closeLightbox()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [lightboxOpen, goPrev, goNext, closeLightbox])

  // 画廊预览键盘导航 - 仅在多图、可见且 Lightbox 未打开时监听
  useEffect(() => {
    if (screenshots.length <= 1 || lightboxOpen || document.hidden) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goPrev, goNext, screenshots.length, lightboxOpen])

  const activeImage = galleryImages[activeIndex] ?? ""

  // Track previous image for crossfade - 使用 ref 避免额外状态渲染
  const prevImageRef = useRef<string>("")
  const [fading, setFading] = useState(false)
  const [displayImage, setDisplayImage] = useState(activeImage)

  // 预加载前后图片
  useEffect(() => {
    if (!galleryImages.length) return
    const preloadCount = 1
    for (let i = 1; i <= preloadCount; i++) {
      const nextIdx = (activeIndex + i) % galleryImages.length
      const prevIdx = (activeIndex - i + galleryImages.length) % galleryImages.length
      ;[nextIdx, prevIdx].forEach(idx => {
        if (galleryImages[idx]) {
          const img = new Image()
          img.src = galleryImages[idx]
        }
      })
    }
  }, [activeIndex, galleryImages])

  // 当 activeImage 变化时，触发淡入动画
  useEffect(() => {
    if (!activeImage) return
    if (prevImageRef.current !== activeImage) {
      setFading(true)
      setDisplayImage(activeImage)
      prevImageRef.current = activeImage
      // 动画完成后重置 fading 状态
      const timer = setTimeout(() => setFading(false), 350)
      return () => clearTimeout(timer)
    }
  }, [activeImage])

  if (galleryImages.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground/40">
        暂无预览图
      </div>
    )
  }

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
      {fading && prevImageRef.current && (
        <Image
          src={prevImageRef.current}
          alt=""
          fill
          className="object-cover"
          draggable={false}
        />
      )}
      <Image
        src={displayImage}
        alt={`${gameTitle} - 预览 ${activeIndex + 1}`}
        fill
        className={`object-cover cursor-pointer ${fading ? 'hero-fade-enter' : ''}`}
        style={fading ? { animation: "heroFadeIn 0.35s ease-out" } : undefined}
        draggable={false}
        loading={activeIndex === 0 ? "eager" : "lazy"}
        unoptimized
        onPointerUp={(e) => {
          if (e.pointerType === 'touch' || isTouchDevice) {
            openLightbox()
          }
        }}
        onDoubleClick={() => {
          if (!isTouchDevice) {
            openLightbox()
          }
        }}
      />

      {/* 底部渐变遮罩 */}
      <div
        className="absolute inset-x-0 bottom-0 h-16"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5), transparent)" }}
      />

      {/* 导航箭头 - 触摸设备始终显示，非触摸设备 hover 显示 */}
      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 hover:scale-110 active:opacity-100 active:scale-95"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="上一张"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 hover:scale-110 active:opacity-100 active:scale-95"
            style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="下一张"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      )}

      {/* 放大按钮 - 触摸设备始终显示，非触摸设备 hover 显示 */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openLightbox() }}
        className="absolute left-2 sm:left-3 bottom-2 sm:bottom-3 flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 hover:scale-105 active:opacity-100 active:scale-95"
        style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
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
          className="rounded-full px-1.5 py-0.5 text-[10px] sm:px-2 sm:text-xs font-semibold tabular-nums backdrop-blur-md"
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

// 独立缩略图组件，使用 memo 避免不必要的重新渲染
const ThumbnailButton = memo(function ThumbnailButton({
  screenshot,
  gameTitle,
  index,
  isActive,
  onSelect,
}: {
  screenshot: string
  gameTitle: string
  index: number
  isActive: boolean
  onSelect: (index: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`relative shrink-0 overflow-hidden transition-all duration-200 h-[48px] w-[85px] sm:h-[60px] sm:w-[106px] lg:h-[72px] lg:w-[128px] rounded-lg ${
        isActive ? "ring-1 sm:ring-2 ring-primary" : "opacity-45 hover:opacity-70"
      }`}
    >
      <Image
        src={screenshot}
        alt={`${gameTitle} 缩略图 ${index + 1}`}
        fill
        className="object-cover"
        draggable={false}
        sizes="(max-width: 640px) 85px, (max-width: 1024px) 106px, 128px"
        quality={50}
        loading="lazy"
        decoding="async"
      />
      {!isActive && (
        <div className="absolute inset-0 bg-black/20 transition-opacity duration-200 hover:opacity-0" />
      )}
    </button>
  )
})

ThumbnailButton.displayName = "ThumbnailButton"

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

  // 使用 useCallback 稳定 onSelect 引用，避免父组件重渲染时触发子组件更新
  const handleSelect = useCallback((index: number) => {
    onSelect(index)
  }, [onSelect])

  useEffect(() => {
    if (!barRef.current) return
    const container = barRef.current
    const active = container.children[activeIndex] as HTMLElement
    if (!active) return
    // 手动计算水平滚动位置，避免 scrollIntoView 导致页面纵向跳动
    const scrollLeft =
      active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2
    container.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }, [activeIndex])

  if (screenshots.length === 0) return null

  return (
    <div ref={barRef} className="flex h-full items-center gap-1.5 sm:gap-2 overflow-x-auto px-2 sm:px-3 scrollbar-hide" style={{ scrollBehavior: "smooth", overscrollBehaviorX: "contain", overscrollBehaviorY: "none" }}>
      {screenshots.map((img, i) => (
        <ThumbnailButton
          key={i}
          screenshot={img}
          gameTitle={gameTitle}
          index={i}
          isActive={i === activeIndex}
          onSelect={handleSelect}
        />
      ))}
    </div>
  )
}