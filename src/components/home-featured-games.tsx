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

/** Percentage-based 5-panel layout — full width, overlapping, continuous visual.
 *  Panels are positioned so they overlap slightly, creating depth and a
 *  magazine-cover composition rather than 5 separate cards.
 *  Total span: 0% → 103% (panels intentionally overlap). */
const PANEL_POSITIONS = [
  { left: "0%",   width: "24%" },   // A — left anchor
  { left: "19%",  width: "20%" },   // B — overlaps A
  { left: "37%",  width: "30%" },   // C — wider centerpiece
  { left: "65%",  width: "20%" },   // D — overlaps C
  { left: "83%",  width: "20%" },   // E — right anchor
]

const HUES = [245, 265, 185, 35, 0]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => {
    const hue = HUES[i % HUES.length]
    return {
      ...g,
      gradientFrom: `linear-gradient(to top, hsla(${hue}, 65%, 30%, 0.92), hsla(${hue}, 45%, 20%, 0.4) 30%, transparent 65%)`,
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
      {/* Label — minimal */}
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/50" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/30 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/50" />
      </div>

      {/* Panels container — full width, tall, continuous */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(320px, 50vh, 540px)" }}
      >
        {/* Dark base fill */}
        <div className="absolute inset-0 bg-muted/50" />

        {featured.map((game, i) => {
          const pos = PANEL_POSITIONS[i]
          const isHovered = hoveredIdx === i

          // Alternating diagonal right edges for stepped composition
          const clipRight = i < featured.length - 1
            ? (i % 2 === 0
                ? "polygon(0 0, 82% 0, 100% 14%, 82% 100%, 0 100%)"
                : "polygon(0 0, 88% 0, 100% 6%, 88% 100%, 0 100%)")
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
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-108"
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
                  opacity: isHovered ? 0.92 : 0.78,
                }}
              />

              {/* Hover brightness */}
              <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06]" />

              {/* Game title */}
              <div className="absolute inset-x-0 bottom-0 z-[2] p-3 sm:p-5">
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-lg transition-transform duration-300 group-hover:scale-[1.03]">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Colored diagonal dividers — visible, creates the cutting effect */}
        {featured.length > 1 &&
          PANEL_POSITIONS.slice(0, -1).map((pos, i) => {
            const rightEdge = parseFloat(pos.left) + parseFloat(pos.width)
            const hue = HUES[i % HUES.length]
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${rightEdge - 0.3}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 2%, hsla(${hue}, 55%, 55%, 0.5) 20%, hsla(${hue}, 55%, 45%, 0.3) 80%, transparent 98%)`,
                  transform: `skewX(${i % 2 === 0 ? "-6" : "6"}deg)`,
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
