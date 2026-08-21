"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import type { GameCardData } from "@/components/game-card"

interface FeaturedGame extends GameCardData {
  hue: number
}

interface HomeFeaturedGamesProps {
  games: GameCardData[]
}

const HUES = [245, 265, 185, 35, 0, 200, 320]
const MIN_PANEL_W = 180

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const [panelCount, setPanelCount] = useState(6)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Dynamic panel count based on container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const count = Math.max(3, Math.min(8, Math.floor(w / MIN_PANEL_W)))
      setPanelCount((prev) => prev === count ? prev : count)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleKeyNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        const dir = e.key === "ArrowRight" ? 1 : -1
        const list = containerRef.current?.querySelectorAll("[data-panel]") as NodeListOf<HTMLElement> | undefined
        if (!list || list.length === 0) return
        const nextIdx = ((hoveredIdx ?? 0) + dir + list.length) % list.length
        list[nextIdx]?.focus()
        setHoveredIdx(nextIdx)
      }
    },
    [hoveredIdx],
  )

  const featured: FeaturedGame[] = games.slice(0, panelCount).map((g, i) => ({
    ...g,
    hue: HUES[i % HUES.length],
  }))

  if (featured.length === 0) return null

  return (
    <section ref={containerRef} className="w-full select-none" onKeyDown={handleKeyNav}>
      {/* Label */}
      <div className="flex items-center gap-3 mb-2.5 px-3 sm:px-6 lg:px-8">
        <span className="h-px flex-1 bg-border/40" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/25 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/40" />
      </div>

      {/* Featured gallery — wide, flat, continuous visual strip */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "clamp(200px, 28vh, 280px)" }}
      >
        {/* Dark base */}
        <div className="absolute inset-0 bg-muted/40" />

        {/* Unified gradient across entire surface — creates ONE visual layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-[1] pointer-events-none" />

        {/* Panels — leftmost on top (highest z), each overlaps into next
            This creates the continuous stepped visual: panel 0 is fully visible,
            panel 1 bleeds 12px into panel 0's space (covered by panel 0's right edge
            clip), panel 2 bleeds 12px into panel 1, etc. */}
        <div className="absolute inset-0 flex">
          {featured.map((game, i) => {
            const isHovered = hoveredIdx === i
            const isFirst = i === 0
            const isLast = i === featured.length - 1
            // Each non-first panel bleeds 16px left into previous panel's space
            const marginLeft = isFirst ? 0 : -16
            // Right clip creates the stepped edge
            const clipRight = !isLast
              ? (i % 2 === 0
                  ? "polygon(0 0, 85% 0, 100% 16%, 85% 100%, 0 100%)"
                  : "polygon(0 0, 90% 0, 100% 7%, 90% 100%, 0 100%)")
              : undefined

            return (
              <Link
                key={game.id}
                data-panel={i}
                href={`/games/${game.serialId ?? game.id}`}
                className="group relative flex-1 overflow-hidden transition-all duration-500 ease-out focus:outline-none"
                style={{
                  marginLeft,
                  zIndex: featured.length - i, // leftmost = highest z
                  transform: isHovered ? "scale(1.02)" : "scale(1)",
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
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes={`${100 / panelCount}vw`}
                    priority={i === 0}
                    quality={80}
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted/60" />
                )}

                {/* Hover brighten */}
                <div className="absolute inset-0 bg-white/0 transition-all duration-300 group-hover:bg-white/[0.05] z-[2]" />

                {/* Title */}
                <div className="absolute inset-x-0 bottom-0 z-[3] p-2.5 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                    {game.title}
                  </h3>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Diagonal accent dividers */}
        {featured.length > 1 &&
          featured.slice(0, -1).map((_, i) => {
            const hue = HUES[i % HUES.length]
            // Right edge of each panel (except last) in flex-1 percentage
            const leftPct = ((i + 1) / featured.length) * 100
            return (
              <div
                key={`div-${i}`}
                className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                style={{
                  left: `${leftPct - 0.3}%`,
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent 3%, hsla(${hue}, 50%, 55%, 0.35) 20%, hsla(${hue}, 50%, 45%, 0.2) 80%, transparent 97%)`,
                  transform: `skewX(${i % 2 === 0 ? "-4" : "4"}deg)`,
                }}
              />
            )
          })}

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent z-[5] pointer-events-none" />
      </div>
    </section>
  )
}
