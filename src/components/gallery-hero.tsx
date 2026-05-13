"use client"

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface GalleryHeroProps {
  coverImage: string
  gameTitle: string
  screenshots: string[]
}

/**
 * 精简橱窗 — 350px 锁高
 * 左侧: 3:4 竖向封面 (~262px)
 * 右侧: 16:10 大图截图 + 底部方形缩略图联动条
 * 截图画廊与封面完全隔离
 */
export function GalleryHero({ coverImage, gameTitle, screenshots }: GalleryHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const thumbnailBarRef = useRef<HTMLDivElement>(null)

  // Only screenshots for gallery — NO cover image
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

  // Navigate
  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex) return
      setActiveIndex(index)
      // Reset timer on manual interaction
      if (!isPaused) {
        startAutoPlay()
      }
    },
    [activeIndex, isPaused, startAutoPlay]
  )

  const goPrev = useCallback(() => {
    goTo(activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1)
  }, [activeIndex, galleryImages.length, goTo])

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % galleryImages.length)
  }, [activeIndex, galleryImages.length, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goPrev, goNext])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailBarRef.current) return
    const activeThumb = thumbnailBarRef.current.children[activeIndex] as HTMLElement
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [activeIndex])

  const activeImage = galleryImages[activeIndex]
  const SHOWCASE_HEIGHT = 350
  const COVER_WIDTH = 262

  // No screenshots case — show only cover
  if (galleryImages.length === 0) {
    return (
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: `${SHOWCASE_HEIGHT}px`,
          borderRadius: "14px",
          background: "hsl(var(--card))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={gameTitle}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      className="flex w-full overflow-hidden"
      style={{
        height: `${SHOWCASE_HEIGHT}px`,
        borderRadius: "14px",
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {/* ═══ 左侧封面 — 3:4 比例 ═══ */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: `${COVER_WIDTH}px`,
          height: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={gameTitle}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {/* Soft right edge blend */}
        <div
          className="absolute inset-y-0 right-0 w-12"
          style={{
            background: "linear-gradient(to right, transparent, hsl(var(--card)))",
          }}
        />
      </div>

      {/* ═══ 右侧截图画廊 ═══ */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* ── 大图展示区 (~70%) ── */}
        <div className="relative flex-1 min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={activeIndex}
            src={activeImage}
            alt={`${gameTitle} - 截图 ${activeIndex + 1}`}
            className="h-full w-full object-cover"
            style={{
              animation: "showcaseFadeIn 0.35s ease-out",
            }}
            draggable={false}
          />

          {/* Bottom gradient overlay for readability */}
          <div
            className="absolute inset-x-0 bottom-0 h-12"
            style={{
              background: "linear-gradient(to top, hsl(var(--card)), transparent)",
            }}
          />

          {/* Navigation arrows */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                style={{
                  background: "hsl(var(--background) / 0.65)",
                  color: "var(--clr-blue)",
                  border: "1px solid hsl(var(--border))",
                }}
                aria-label="上一张"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                style={{
                  background: "hsl(var(--background) / 0.65)",
                  color: "var(--clr-blue)",
                  border: "1px solid hsl(var(--border))",
                }}
                aria-label="下一张"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Counter + Pause/Play button */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
            {hasMultipleImages && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPaused((p) => {
                    const next = !p
                    if (next) stopAutoPlay()
                    else {
                      startAutoPlay()
                    }
                    return next
                  })
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-105"
                style={{
                  background: "hsl(var(--background) / 0.65)",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
                aria-label={isPaused ? "继续轮播" : "暂停轮播"}
              >
                {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-md"
              style={{
                background: "hsl(var(--background) / 0.65)",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {activeIndex + 1}/{galleryImages.length}
            </span>
          </div>
        </div>

        {/* ── 缩略图条 (~30%, ~65px) ── */}
        <div
          className="shrink-0 relative"
          style={{
            height: "65px",
            borderTop: "1px solid hsl(var(--border) / 0.5)",
          }}
        >
          <div
            ref={thumbnailBarRef}
            className="flex h-full items-center gap-1.5 overflow-x-auto px-2.5 scrollbar-hide"
            style={{ scrollBehavior: "smooth" }}
          >
            {galleryImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className="relative shrink-0 overflow-hidden transition-all duration-200"
                style={{
                  height: "50px",
                  width: "50px",
                  borderRadius: "6px",
                  border: i === activeIndex
                    ? `2px solid var(--clr-blue)`
                    : "2px solid transparent",
                  opacity: i === activeIndex ? 1 : 0.45,
                  transform: i === activeIndex ? "scale(1.05)" : "scale(1)",
                  boxShadow: i === activeIndex
                    ? `0 0 8px var(--clr-blue)40`
                    : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`缩略图 ${i + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {/* Dim overlay for inactive */}
                {i !== activeIndex && (
                  <div className="absolute inset-0 bg-black/15 transition-opacity duration-200 hover:opacity-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @keyframes showcaseFadeIn {
          from {
            opacity: 0;
            transform: scale(1.015);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}