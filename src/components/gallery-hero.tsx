"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface GalleryHeroProps {
  coverImage: string
  gameTitle: string
  screenshots: string[]
}

export function GalleryHero({ coverImage, gameTitle, screenshots }: GalleryHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const thumbnailBarRef = useRef<HTMLDivElement>(null)

  // Combine cover + screenshots for gallery (cover is always first)
  const galleryImages = [coverImage, ...screenshots]
  const hasMultipleImages = galleryImages.length > 1

  // Auto-rotate every 5s
  const startAutoPlay = useCallback(() => {
    if (!hasMultipleImages) return
    stopAutoPlay()
    timerRef.current = setInterval(() => {
      setIsTransitioning(true)
      setActiveIndex((prev) => {
        const next = (prev + 1) % galleryImages.length
        return next
      })
      setTimeout(() => setIsTransitioning(false), 300)
    }, 5000)
  }, [hasMultipleImages, galleryImages.length])

  const stopAutoPlay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    startAutoPlay()
    return () => stopAutoPlay()
  }, [startAutoPlay, stopAutoPlay])

  // Navigate
  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex || isTransitioning) return
      setIsTransitioning(true)
      setActiveIndex(index)
      setTimeout(() => setIsTransitioning(false), 300)
      // Reset auto-play timer on manual interaction
      startAutoPlay()
    },
    [activeIndex, isTransitioning, startAutoPlay]
  )

  const goPrev = useCallback(() => {
    goTo(activeIndex === 0 ? galleryImages.length - 1 : activeIndex - 1)
  }, [activeIndex, galleryImages.length, goTo])

  const goNext = useCallback(() => {
    goTo((activeIndex + 1) % galleryImages.length)
  }, [activeIndex, galleryImages.length, goTo])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailBarRef.current) return
    const activeThumb = thumbnailBarRef.current.children[activeIndex] as HTMLElement
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [activeIndex])

  const activeImage = galleryImages[activeIndex] || coverImage

  return (
    <div className="flex w-full" style={{ gap: "0" }}>
      {/* ═══ 左侧封面 (30%) ═══ */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: "30%",
          aspectRatio: "3/4",
          borderRadius: "12px 0 0 12px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={gameTitle}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {/* Subtle right-edge gradient for seam blending */}
        <div
          className="absolute inset-y-0 right-0 w-8"
          style={{
            background: "linear-gradient(to right, transparent, hsl(var(--background)))",
          }}
        />
      </div>

      {/* ═══ 右侧画廊 (70%) ═══ */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: "70%",
          borderRadius: "0 12px 12px 0",
          background: "hsl(var(--card))",
        }}
      >
        {/* ── 大图展示位 (70% of right height) ── */}
        <div className="relative" style={{ flex: "7" }}>
          {/* Main image with transition */}
          <div className="absolute inset-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={activeIndex}
              src={activeImage}
              alt={`${gameTitle} - 截图 ${activeIndex + 1}`}
              className="h-full w-full object-cover animate-fade-in"
              style={{
                animation: "galleryFadeIn 0.3s ease-in-out",
              }}
              draggable={false}
            />
          </div>

          {/* Gradient overlay at bottom for smooth transition */}
          <div
            className="absolute inset-x-0 bottom-0 h-16"
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
                onMouseEnter={stopAutoPlay}
                onMouseLeave={startAutoPlay}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110"
                style={{
                  background: "hsl(var(--background) / 0.6)",
                  color: "var(--clr-blue)",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                onMouseEnter={stopAutoPlay}
                onMouseLeave={startAutoPlay}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110"
                style={{
                  background: "hsl(var(--background) / 0.6)",
                  color: "var(--clr-blue)",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image counter badge */}
          {hasMultipleImages && (
            <div
              className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
              style={{
                background: "hsl(var(--background) / 0.7)",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {activeIndex + 1} / {galleryImages.length}
            </div>
          )}
        </div>

        {/* ── 缩略图条 (30% of right height) ── */}
        {hasMultipleImages && (
          <div
            className="relative"
            style={{
              flex: "3",
              borderTop: "1px solid hsl(var(--border))",
            }}
          >
            <div
              ref={thumbnailBarRef}
              className="flex h-full items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-hide"
              style={{
                scrollBehavior: "smooth",
              }}
            >
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  onMouseEnter={stopAutoPlay}
                  onMouseLeave={startAutoPlay}
                  className="relative shrink-0 overflow-hidden transition-all duration-300"
                  style={{
                    height: "100%",
                    aspectRatio: "16/10",
                    borderRadius: "6px",
                    border: i === activeIndex
                      ? "2px solid var(--clr-blue)"
                      : "2px solid transparent",
                    opacity: i === activeIndex ? 1 : 0.5,
                    transform: i === activeIndex ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`缩略图 ${i + 1}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  {/* Dim overlay for inactive thumbnails */}
                  {i !== activeIndex && (
                    <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 hover:opacity-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS Animation keyframes injected via style tag */}
      <style jsx global>{`
        @keyframes galleryFadeIn {
          from {
            opacity: 0;
            transform: scale(1.02);
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