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
    <section ref={containerRef} className="w-full select-none px-3 sm:px-6 lg:px-10" onKeyDown={handleKeyNav}>
      {/* Label */}
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/50" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/30 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/50" />
      </div>

      {/* 5-panel continuous visual — single surface with overlapping images */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(380px, 50vh, 560px)" }}
      >
        {/* Dark base fill — this IS the "banner" surface */}
        <div className="absolute inset-0 bg-muted/40" />

        {/* 5 panels — each slightly overlaps the previous, creating continuous composition */}
        {featured.map((game, i) => {
          const isHovered = hoveredIdx === i
          const isLast = i === featured.length - 1

          // Each panel is wider than its "slot" and overlaps the next
          // This creates the continuous visual effect
          const leftPercent = i === 0 ? 0 : (i * 20) - 3
          const widthPercent = i === 0 ? 23 : i === 4 ? 22 : 22

          // Diagonal right edge clip — staggered angles for organic feel
          const clipRight = !isLast
            ? (i % 2 === 0
                ? "polygon(0 0, 82% 0, 100% 14%, 82% 100%, 0 100%)"
                : "polygon(0 0, 87% 0, 100% 6%, 87% 100%, 0 100%)")
            : "polygon(0 0, 100% 0, 100% 100%, 0 100%)"

          return (
            <Link
              key={game.id}
              data-panel={i}
              href={`/games/${game.serialId ?? game.id}`}
              className="group absolute inset-y-0 overflow-hidden transition-all duration-500 ease-out focus:outline-none"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                zIndex: isHovered ? 10 : featured.length - i,
                transform: isHovered ? "scale(1.025)" : "scale(1)",
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

              {/* Subtle hover brighten */}
              <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

              {/* Game title */}
              <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-5">
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Diagonal accent dividers — subtle, color-matched */}
        {featured.length > 1 &&
          [0, 1, 2, 3].map((i) => {
            const hue = HUES[i % HUES.length]
            // Right edge of each panel
            const rightEdges = [23, 43, 63, 83]
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${rightEdges[i] - 0.2}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 3%, hsla(${hue}, 55%, 55%, 0.5) 20%, hsla(${hue}, 55%, 45%, 0.3) 80%, transparent 97%)`,
                  transform: `skewX(${i % 2 === 0 ? "-5" : "5"}deg)`,
                }}
              />
            )
          })}

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-[6] pointer-events-none" />
      </div>
    </section>
  )
}
