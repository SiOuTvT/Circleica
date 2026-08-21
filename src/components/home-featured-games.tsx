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

/** 5-panel layout using percentages for true full-width responsiveness.
 *  Panel widths add up to ~100% with intentional asymmetric gaps.
 *  Diagonal edges are created with clip-path on alternating panels. */
const PANEL_POSITIONS = [
  { left: "0%",   width: "20%" },   // A
  { left: "17%",  width: "19%" },   // B — slightly overlaps A
  { left: "34%",  width: "26%" },   // C — wider center
  { left: "58%",  width: "19%" },   // D — slightly overlaps C
  { left: "75%",  width: "25%" },   // E — wide right anchor
]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => {
    const hues = [240, 260, 180, 38, 0]
    const hue = hues[i % hues.length]
    return {
      ...g,
      gradientFrom: `linear-gradient(to top, hsla(${hue}, 70%, 40%, 0.85), hsla(${hue}, 60%, 30%, 0.3) 40%, transparent 75%)`,
      gradientTo: `hsla(${hue}, 50%, 20%, 0.15)`,
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
      {/* Section label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      </div>

      {/* Panels — full width, tall, continuous visual */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: "clamp(260px, 36vh, 440px)",
        }}
      >
        {/* Subtle background base */}
        <div className="absolute inset-0 bg-muted/30" />

        {featured.map((game, i) => {
          const pos = PANEL_POSITIONS[i]
          const isHovered = hoveredIdx === i
          // Create diagonal edge on right side of odd panels
          const clipRight = i < featured.length - 1 && i % 2 === 1
            ? "polygon(0 0, 88% 0, 100% 8%, 88% 100%, 0 100%)"
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
                transform: isHovered ? "scale(1.02)" : "scale(1)",
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
                <div className="absolute inset-0 bg-muted" />
              )}

              {/* Gradient overlay — always visible, stronger on hover */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{
                  background: game.gradientFrom,
                  opacity: isHovered ? 0.95 : 0.82,
                }}
              />

              {/* Hover brighten */}
              <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

              {/* Title — always visible, never hidden */}
              <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-[1.02]">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Diagonal accent dividers between panels */}
        {featured.length > 1 &&
          PANEL_POSITIONS.slice(0, -1).map((pos, i) => {
            const rightEdge = parseFloat(pos.left) + parseFloat(pos.width)
            const hue = [240, 260, 180, 38, 0][i % 5]
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${rightEdge - 0.3}%`,
                  width: "3px",
                  background: `linear-gradient(to bottom, transparent 5%, hsla(${hue}, 60%, 60%, 0.5) 30%, hsla(${hue}, 60%, 50%, 0.35) 70%, transparent 95%)`,
                  transform: `skewX(${i % 2 === 0 ? "-6" : "6"}deg)`,
                }}
              />
            )
          })}

        {/* Bottom edge fade — subtle */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent z-[6] pointer-events-none" />
      </div>
    </section>
  )
}
