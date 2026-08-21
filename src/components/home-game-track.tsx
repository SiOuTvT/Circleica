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
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
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
    const cardW = el.clientWidth * 0.5
    el.scrollBy({ left: dir * cardW, behavior: "smooth" })
  }, [])

  if (games.length === 0) return null

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/35 flex-shrink-0">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[11px] text-muted-foreground/40 transition-colors hover:text-foreground/70 flex-shrink-0"
            >
              {viewAllLabel}
            </Link>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/25 transition-colors hover:text-foreground/60 disabled:opacity-15 disabled:cursor-default"
              aria-label="向左滚动"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/25 transition-colors hover:text-foreground/60 disabled:opacity-15 disabled:cursor-default"
              aria-label="向右滚动"
            >
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Track with fade edges */}
      <div className="relative">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-1 w-10 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-r from-transparent via-background/80 to-background z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="flex gap-3.5 overflow-x-auto scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollPaddingLeft: "4px",
            paddingBottom: "4px",
          }}
        >
          <style>{`
            [data-game-track]::-webkit-scrollbar { display: none }
          `}</style>

          {games.map((game) => (
            <div
              key={game.id}
              data-game-track
              className="shrink-0 w-[300px]"
            >
              <GameCard game={game} showTags={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
