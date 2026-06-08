"use client"

import { GameCard, type GameCardData } from "@/components/game-card"
import { logger } from "@/lib/logger"
import { ChevronDown, Loader2, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useTransition } from "react"

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
  const [error, setError]   = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<(() => void) | null>(null)

  const hasMore = games.length < total

  const loadMore = useCallback(() => {
    setError(false)
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
        if (!Array.isArray(data?.games)) {
          setError(true)
          return
        }
        setGames(prev => [...prev, ...data.games])
        setPage(p => p + 1)
      } catch (err) {
        logger.game.error("加载更多游戏失败", err)
        setError(true)
      }
    })
  }, [page, q, tag, nsfw])

  // 保持 ref 中引用最新的 loadMore，避免 IntersectionObserver 闭包陈旧
  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  // IntersectionObserver 无限滚动
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !pending) {
          loadMoreRef.current?.()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, pending])

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>

      {/* 加载失败提示 */}
      {error && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">加载失败，请检查网络</p>
          <button
            onClick={loadMore}
            className="flex items-center gap-1.5 rounded-lg bg-card px-4 py-2 text-sm text-foreground ring-1 ring-border transition-all hover:bg-accent"
          >
            <RefreshCw className="h-4 w-4" /> 重试
          </button>
        </div>
      )}

      {/* 无限滚动触发哨兵 + 手动加载 fallback */}
      {hasMore && !error && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
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