"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { GameCardData } from "@/components/game-card"

interface FeaturedGame extends GameCardData {
  gradientFrom: string
  gradientTo: string
}

interface HomeFeaturedGamesProps {
  games: GameCardData[]
}

const HUES = [245, 265, 185, 35, 0]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => {
    const hue = HUES[i % HUES.length]
    return {
      ...g,
      gradientFrom: `linear-gradient(to top, hsla(${hue}, 65%, 28%, 0.92), hsla(${hue}, 45%, 18%, 0.4) 30%, transparent 65%)`,
      gradientTo: `hsla(${hue}, 40%, 15%, 0.2)`,
    }
  })

  const handleKeyNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const dir = e.key === "ArrowRight" ? 1 : -1
        const nextIdx = ((hoveredIdx ?? 0) + dir + featured.length) % featured.length
        const panel = containerRef.current?.querySelector(`[data-panel="${nextIdx}"]`) as HTMLElement | null
        panel?.focus()
        setHoveredIdx(nextIdx)
      }
    },
    [hoveredIdx, featured.length],
  )

  if (featured.length === 0) return null

  return (
    <section ref={containerRef} className="w-full select-none" onKeyDown={handleKeyNav}>
      {/* Inner wrapper — provides padding for full-width breakout */}
      <div className="px-3 sm:px-4 lg:px-8">
        {/* Label */}
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px flex-1 bg-border/50" />
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/30 flex-shrink-0">
            Featured
          </p>
          <span className="h-px flex-1 bg-border/50" />
        </div>

      {/* 5-panel visual — CSS Grid with overlapping percentage widths */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(420px, 58vh, 640px)" }}
      >
        {/* Dark base */}
        <div className="absolute inset-0 bg-muted/50" />

        {/* CSS Grid — panels intentionally overlap via percentage overlap */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: "23% 18% 26% 18% 15%",
            gap: 0,
          }}
        >
          {featured.map((game, i) => {
            const isHovered = hoveredIdx === i
            const isLast = i === featured.length - 1

            // Diagonal clip on non-last panels: cut right edge diagonally
            // Alternating angles: deeper cuts on panels 0,2; shallower on 1,3
            const clipRight = !isLast
              ? (i % 2 === 0
                  ? "polygon(0 0, 78% 0, 100% 18%, 78% 100%, 0 100%)"
                  : "polygon(0 0, 86% 0, 100% 7%, 86% 100%, 0 100%)")
              : undefined

            return (
              <Link
                key={game.id}
                data-panel={i}
                href={`/games/${game.serialId ?? game.id}`}
                className="group relative overflow-hidden transition-all duration-500 ease-out focus:outline-none"
                style={{
                  zIndex: isHovered ? 10 : (featured.length - i),
                  transform: isHovered ? "scale(1.03)" : "scale(1)",
                  transformOrigin: "center center",
                  clipPath: clipRight,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {game.coverImage ? (
                  <Image
                    src={game.coverImage}
                    alt={game.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="22vw"
                    priority={i === 0}
                    quality={80}
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted/60" />
                )}

                {/* Colored gradient overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-300"
                  style={{
                    background: game.gradientFrom,
                    opacity: isHovered ? 0.9 : 0.75,
                  }}
                />

                {/* Hover brighten */}
                <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

                {/* Game title */}
                <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
                    {game.title}
                  </h3>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Colored diagonal accent dividers */}
        {featured.length > 1 &&
          [0, 1, 2, 3].map((i) => {
            const hue = HUES[i % HUES.length]
            // Position at the right edge of each panel's column
            const cumWidths = [23, 41, 67, 85] // cumulative column starts
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${cumWidths[i]}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 2%, hsla(${hue}, 55%, 55%, 0.5) 20%, hsla(${hue}, 55%, 45%, 0.3) 80%, transparent 98%)`,
                  transform: `skewX(${i % 2 === 0 ? "-5" : "5"}deg)`,
                }}
              />
            )
          })}

        {/* Bottom fade into page background */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-[6] pointer-events-none" />
      </div>
      </div>
    </section>
  )
}
