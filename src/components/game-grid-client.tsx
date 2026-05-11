"use client"

import { GameCard, type GameCardData } from "@/components/game-card"
import { ChevronDown, Loader2 } from "lucide-react"
import { useState, useTransition } from "react"

interface Props {
  initialGames: GameCardData[]
  total: number
  tag: string
  q: string
  nsfw: boolean
}

export function GameGridClient({ initialGames, total, tag, q, nsfw }: Props) {
  const [games, setGames]   = useState(initialGames)
  const [page, setPage]     = useState(1)
  const [pending, startTransition] = useTransition()

  const hasMore = games.length < total

  function loadMore() {
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        params.set("page", String(page + 1))
        params.set("limit", "24")
        if (q)   params.set("q",    q)
        if (tag && tag !== "全部") params.set("tag", tag)
        if (nsfw) params.set("nsfw", "1")

        const res  = await fetch(`/api/games?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setGames(prev => [...prev, ...data.games])
        setPage(p => p + 1)
      } catch (err) {
        console.error("加载更多游戏失败:", err)
      }
    })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={pending}
            className="flex items-center gap-2 rounded-xl bg-card/60 px-6 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            {pending
              ? <><Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />加载中…</>
              : <><ChevronDown className="h-5 w-5" strokeWidth={2.5} />加载更多（还有 {total - games.length} 个）</>
            }
          </button>
        </div>
      )}

      {!hasMore && games.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">— 已加载全部 {total} 个游戏 —</p>
      )}
    </>
  )
}
