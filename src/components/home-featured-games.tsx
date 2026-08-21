"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { GameCardData } from "@/components/game-card"

interface FeaturedGame extends GameCardData {
  hue: number
}

interface HomeFeaturedGamesProps {
  games: GameCardData[]
}

const HUES = [245, 265, 185, 35, 0]

/** Panel positions — each overlaps the previous, creating a continuous
 *  staggered composition. Total span exceeds 100% for the overlapping effect. */
const PANEL_POSITIONS = [
  { left: "0%",   width: "26%" },   // A — wide left anchor
  { left: "21%",  width: "22%" },   // B — overlaps A
  { left: "39%",  width: "28%" },   // C — center, widest
  { left: "63%",  width: "22%" },   // D — overlaps C
  { left: "81%",  width: "22%" },   // E — right anchor
]

/** Strong diagonal right-edge clips — alternating deep/shallow for organic feel */
const CLIP_RIGHT = [
  "polygon(0 0, 72% 0, 100% 25%, 72% 100%, 0 100%)",  // deep cut
  "polygon(0 0, 84% 0, 100% 9%, 84% 100%, 0 100%)",   // shallow
  "polygon(0 0, 76% 0, 100% 20%, 76% 100%, 0 100%)",  // deep
  "polygon(0 0, 86% 0, 100% 7%, 86% 100%, 0 100%)",   // slight
]

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const featured: FeaturedGame[] = games.slice(0, 5).map((g, i) => ({
    ...g,
    hue: HUES[i % HUES.length],
  }))

  // Per-panel color tint — ensures text readability on light backgrounds
  const panelTints = [
    "linear-gradient(to top, hsla(245, 60%, 25%, 0.88) 0%, hsla(245, 50%, 20%, 0.35) 35%, transparent 65%)",
    "linear-gradient(to top, hsla(265, 55%, 22%, 0.9) 0%, hsla(265, 45%, 18%, 0.4) 35%, transparent 65%)",
    "linear-gradient(to top, hsla(185, 50%, 20%, 0.92) 0%, hsla(185, 40%, 15%, 0.45) 35%, transparent 65%)",  // darker for light cover
    "linear-gradient(to top, hsla(35, 60%, 22%, 0.88) 0%, hsla(35, 45%, 18%, 0.35) 35%, transparent 65%)",
    "linear-gradient(to top, hsla(0, 55%, 22%, 0.88) 0%, hsla(0, 40%, 15%, 0.35) 35%, transparent 65%)",
  ]

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
      {/* Label */}
      <div className="flex items-center gap-3 mb-3 px-3 sm:px-6 lg:px-10">
        <span className="h-px flex-1 bg-border/50" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/30 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/50" />
      </div>

      {/* 5-panel visual — full width, single continuous surface */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(400px, 55vh, 600px)" }}
      >
        {/* Dark base */}
        <div className="absolute inset-0 bg-muted/30" />

        {/* Unified gradient overlay across ALL panels — makes it one surface */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-[1] pointer-events-none" />

        {/* 5 image panels — overlapping, each with diagonal right edge */}
        {featured.map((game, i) => {
          const pos = PANEL_POSITIONS[i]
          const isHovered = hoveredIdx === i
          const isLast = i === featured.length - 1
          const clip = !isLast ? CLIP_RIGHT[i] : undefined

          return (
            <Link
              key={game.id}
              data-panel={i}
              href={`/games/${game.serialId ?? game.id}`}
              className="group absolute inset-y-0 overflow-hidden transition-all duration-500 ease-out focus:outline-none"
              style={{
                left: pos.left,
                width: pos.width,
                zIndex: isHovered ? 10 : featured.length - i,
                transform: isHovered ? "scale(1.025)" : "scale(1)",
                transformOrigin: "center center",
                clipPath: clip,
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
                  sizes="24vw"
                  priority={i === 0}
                  quality={80}
                />
              ) : (
                <div className="absolute inset-0 bg-muted/60" />
              )}

              {/* Per-panel color tint — ensures text readability */}
              <div
                className="absolute inset-0 transition-opacity duration-300 z-[1]"
                style={{ background: panelTints[i], opacity: isHovered ? 0.9 : 0.75 }}
              />

              {/* Hover brighten — subtle */}
              <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.06] z-[2]" />

              {/* Game title — always visible */}
              <div className="absolute inset-x-0 bottom-0 z-[3] p-3 sm:p-5">
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 drop-shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
                  {game.title}
                </h3>
              </div>
            </Link>
          )
        })}

        {/* Diagonal accent dividers — subtle colored lines */}
        {featured.length > 1 &&
          [0, 1, 2, 3].map((i) => {
            const hue = HUES[i % HUES.length]
            const rightEdge = parseFloat(PANEL_POSITIONS[i].left) + parseFloat(PANEL_POSITIONS[i].width)
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${rightEdge - 0.2}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 3%, hsla(${hue}, 50%, 55%, 0.5) 20%, hsla(${hue}, 50%, 45%, 0.3) 80%, transparent 97%)`,
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
