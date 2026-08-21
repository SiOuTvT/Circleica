"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import Link from "next/link"

interface HomeGameTrackProps {
  games: GameCardData[]
  title: string
  viewAllHref?: string
  viewAllLabel?: string
}

export function HomeGameTrack({ games, title, viewAllHref = "/games", viewAllLabel = "查看全部" }: HomeGameTrackProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", checkScroll, { passive: true })
    window.addEventListener("resize", checkScroll)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [checkScroll, games])

  const scroll = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = 200
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" })
  }, [])

  if (games.length === 0) return null

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[11px] text-muted-foreground/50 transition-colors hover:text-foreground"
            >
              {viewAllLabel}
            </Link>
          )}
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/50 transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="向左滚动"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/50 transition-all hover:border-foreground/20 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="向右滚动"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Track */}
      <div className="relative group/track">
        {/* Fade edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-background z-10 pointer-events-none" />
        )}

        {/* Scrollable area */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollSnapType: "x proximity",
          }}
        >
          {/* Hide scrollbar with style tag (WebKit) */}
          <style>{`[data-track]::-webkit-scrollbar { display: none }`}
          </style>

          {games.map((game) => (
            <div
              key={game.id}
              className="shrink-0 w-[150px] sm:w-[170px] scroll-snap-start"
            >
              <GameCard game={game} showTags={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
