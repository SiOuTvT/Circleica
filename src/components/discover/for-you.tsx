"use client"

import { useEffect, useState } from "react"
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { getRecentlyViewed } from "@/lib/recently-viewed"
import { apiFetchSafe } from "@/lib/api-client"

/** 为你推荐（相似作品）：基于最近浏览的一款作品，拉取其相似游戏 */
export function ForYou() {
  const [games, setGames] = useState<GameCardData[] | null>(null)

  useEffect(() => {
    const recent = getRecentlyViewed()
    const seed = recent[0]
    if (!seed) {
      setGames([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { ok, data } = await apiFetchSafe<{ games?: GameCardData[] }>(
          `/api/games/similar?id=${encodeURIComponent(seed.id)}&limit=8`,
          { cache: "no-store" },
        )
        if (!cancelled) setGames(ok && data?.games ? data.games : [])
      } catch {
        if (!cancelled) setGames([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (games == null) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[140px] sm:w-[160px] shrink-0">
            <GameCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (games.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20" style={{ contain: "layout style" }}>
      {games.map((g) => (
        <div key={g.id} className="w-[140px] sm:w-[160px] shrink-0">
          <GameCard game={g} />
        </div>
      ))}
    </div>
  )
}
