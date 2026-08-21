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

/** Percentage-based 5-panel layout for full-width responsiveness.
 *  Panels overlap slightly, creating a continuous visual composition.
 *  Odd-numbered panels get diagonal right edges via clip-path. */
const PANEL_POSITIONS = [
  { left: "0%",   width: "22%" },   // A — left anchor, widest
  { left: "18%",  width: "18%" },   // B — overlaps A
  { left: "34%",  width: "28%" },   // C — center, widest panel
  { left: "60%",  width: "18%" },   // D — overlaps C
  { left: "76%",  width: "24%" },   // E — right anchor
]

const HUES = [240, 265, 185, 38, 0]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => {
    const hue = HUES[i % HUES.length]
    return {
      ...g,
      gradientFrom: `linear-gradient(to top, hsla(${hue}, 70%, 35%, 0.9), hsla(${hue}, 50%, 25%, 0.4) 35%, transparent 70%)`,
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
    <section
      ref={containerRef}
      className="w-full select-none"
      onKeyDown={handleKeyNav}
    >
      {/* Section label — thin line separators */}
      <div className="flex items-center gap-3 mb-2">
        <span className="h-px flex-1 bg-border/60" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/35 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/60" />
      </div>

      {/* Panels — full width, tall, continuous visual */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: "clamp(280px, 42vh, 480px)",
        }}
      >
        {/* Base dark fill */}
        <div className="absolute inset-0 bg-muted/40" />

        {featured.map((game, i) => {
          const pos = PANEL_POSITIONS[i]
          const isHovered = hoveredIdx === i

          // Diagonal right edge on panels 1 and 3 (even indices in 0-based)
          const clipRight = i < featured.length - 1
            ? "polygon(0 0, 90% 0, 100% 6%, 90% 100%, 0 100%)"
            : undefined

          return (
            <Link
              key={game.id}
              data-panel={i}
              href={`/games/${game.serialId ?? game.id}`}
              className="group absolute inset-y-0 overflow-hidden transition-all duration-500 ease-out focus:outline-none"
              style={{
                left: pos.left,
                width: pos.width,
                zIndex: isHovered ? 10 : 1,
                transform: isHovered ? "scale(1.025)" : "scale(1)",
                transformOrigin: "center center",
                clipPath: clipRight,
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Cover image */}
              {game.coverImage ? (
                <Image
                  src={game.coverImage}
                  alt={game.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="20vw"
                  priority={i === 0}
                  quality={80}
                />
              ) : (
                <div className="absolute inset-0 bg-muted/50" />
              )}

              {/* Gradient overlay */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: game.gradientFrom,
                  opacity: isHovered ? 0.95 : 0.82,
                }}
              />

              {/* Subtle hover brighten */}
              <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.05]" />

              {/* Game title — always visible */}
              <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-5">
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Diagonal accent dividers */}
        {featured.length > 1 &&
          PANEL_POSITIONS.slice(0, -1).map((pos, i) => {
            const rightEdge = parseFloat(pos.left) + parseFloat(pos.width)
            const hue = HUES[i % HUES.length]
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${rightEdge - 0.2}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 3%, hsla(${hue}, 55%, 55%, 0.45) 25%, hsla(${hue}, 55%, 45%, 0.3) 75%, transparent 97%)`,
                  transform: `skewX(${i % 2 === 0 ? "-5" : "5"}deg)`,
                }}
              />
            )
          })}

        {/* Bottom fade into page background */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-[6] pointer-events-none" />
      </div>
    </section>
  )
}
