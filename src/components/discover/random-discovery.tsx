"use client"

import { useCallback, useEffect, useState } from "react"
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { apiFetchSafe } from "@/lib/api-client"
import { Shuffle } from "lucide-react"

/** 随机发现：客户端拉取一批随机作品，支持「换一批」 */
export function RandomDiscovery() {
  const [games, setGames] = useState<GameCardData[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { ok, data } = await apiFetchSafe<{ games?: GameCardData[] }>(
        "/api/games/discover-random?limit=8",
        { cache: "no-store" },
      )
      if (ok && data?.games) setGames(data.games)
    } catch {
      /* 网络/数据库不可用时保持空，不注入假数据 */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">换一批，邂逅意外之喜</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          <Shuffle className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={1.75} />
          {loading ? "发现中" : "换一批"}
        </button>
      </div>
      <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
        {games == null
          ? Array.from({ length: 8 }).map((_, i) => <GameCardSkeleton key={i} />)
          : games.map((g) => <GameCard key={g.id} game={g} />)}
      </div>
    </div>
  )
}
