"use client"

import { useEffect, useState } from "react"
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { getRecentlyViewed } from "@/lib/recently-viewed"

/** 继续浏览：读取 localStorage 中最近看过的游戏（真实浏览历史，无假数据） */
export function RecentlyViewed() {
  const [games, setGames] = useState<GameCardData[] | null>(null)

  useEffect(() => {
    setGames(getRecentlyViewed())
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

  if (games.length === 0) {
    return <p className="text-sm text-muted-foreground">你还没有浏览记录，去看点什么吧～</p>
  }

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
