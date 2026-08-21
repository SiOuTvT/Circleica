"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type GameCardData } from "@/components/game-card"

interface FeaturedGame extends GameCardData {
  accent: string
  gradientFrom: string
  gradientTo: string
}

interface HomeFeaturedGamesProps {
  games: GameCardData[]
}

/** Diagonal panel offsets (px from left) and widths for 5-panel layout. */
const PANEL_LAYOUT = [
  { left: 0, width: 220 },
  { left: 185, width: 195 },
  { left: 360, width: 260 },
  { left: 590, width: 195 },
  { left: 755, width: 220 },
]

const ACCENTS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => ({
    ...g,
    accent: ACCENTS[i % ACCENTS.length],
    gradientFrom: `color-mix(in srgb, ${ACCENTS[i % ACCENTS.length]} 55%, transparent 70%)`,
    gradientTo: `color-mix(in srgb, ${ACCENTS[i % ACCENTS.length]} 15%, transparent 90%)`,
  }))

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
    <section
      ref={containerRef}
      className="w-full select-none"
      onKeyDown={handleKeyNav}
    >
      {/* Section label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
          Featured
        </p>
      </div>

      {/* Panels container */}
      <div
        className="relative mx-auto overflow-hidden rounded-2xl"
        style={{
          height: "clamp(160px, 20vh, 240px)",
          maxWidth: "100%",
          background: "var(--muted)",
        }}
      >
        {featured.map((game, i) => {
          const layout = PANEL_LAYOUT[i]
          const isHovered = hoveredIdx === i
          const isOdd = i % 2 === 1

          return (
            <Link
              key={game.id}
              data-panel={i}
              href={`/games/${game.serialId ?? game.id}`}
              className="group absolute inset-y-0 overflow-hidden transition-transform duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              style={{
                left: `${layout.left}px`,
                width: `${layout.width}px`,
                zIndex: isHovered ? 3 : 1,
                transform: isHovered ? "scale(1.03)" : undefined,
                transformOrigin: "center center",
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Background image */}
              {game.coverImage && (
                <Image
                  src={game.coverImage}
                  alt={game.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes={`${layout.width}px`}
                  priority={i === 0}
                  quality={75}
                />
              )}

              {/* Diagonal clip on odd panels — creates the stepped edges */}
              {isOdd && (
                <div
                  className="absolute inset-0 z-[2]"
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                  }}
                />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0 z-[1] transition-opacity duration-300"
                style={{
                  background: `linear-gradient(to top, ${game.gradientFrom}, ${game.gradientTo} 60%, transparent 85%)`,
                  opacity: isHovered ? 0.95 : 0.8,
                }}
              />

              {/* Hover brightness */}
              <div
                className="absolute inset-0 z-[1] bg-white/0 transition-all duration-300 group-hover:bg-white/[0.04]"
              />

              {/* Game title */}
              <div className="absolute inset-x-0 bottom-0 z-[3] p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-2 drop-shadow-sm">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Diagonal divider lines between panels */}
        {featured.length > 1 &&
          PANEL_LAYOUT.slice(0, -1).map((layout, i) => {
            const accent = ACCENTS[i % ACCENTS.length]
            const rightEdge = layout.left + layout.width
            const dividerTop = "8%"
            const dividerBottom = "92%"

            return (
              <div
                key={`divider-${i}`}
                className="absolute z-[4] pointer-events-none"
                style={{
                  left: `${rightEdge - 1}px`,
                  top: dividerTop,
                  bottom: dividerBottom,
                  width: "3px",
                  background: `linear-gradient(to bottom, transparent, ${accent}66, ${accent}44, ${accent}66, transparent)`,
                  transform: `skewX(${i % 2 === 0 ? "-8" : "8"}deg)`,
                  transformOrigin: "center",
                }}
              />
            )
          })}
      </div>
    </section>
  )
}
