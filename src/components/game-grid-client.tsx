"use client"

import { GameCard, type GameCardData } from "@/components/game-card"
import { Pagination } from "@/components/ui/pagination"
import { Gamepad2 } from "lucide-react"

interface Props {
  initialGames: GameCardData[]
  total: number
  tag: string
  q: string
  nsfw: boolean
  page: number
}

const GAMES_PER_PAGE = 24

export function GameGridClient({ initialGames, total, tag, q, nsfw, page }: Props) {
  const totalPages = Math.ceil(total / GAMES_PER_PAGE)

  function buildHref(page: number): string {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (tag && tag !== "全部") params.set("tag", tag)
    if (nsfw) params.set("nsfw", "1")
    if (page > 1) params.set("page", String(page))
    const s = params.toString()
    const base = tag && tag !== "全部" ? "/search" : "/"
    return `${base}${s ? `?${s}` : ""}`
  }

  return (
    <>
      {initialGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            {q ? "没有找到匹配的游戏" : "暂无游戏"}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
        {initialGames.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={tag && tag !== "全部" ? "/search" : "/"}
            extraParams={{
              ...(q && { q }),
              ...(tag && tag !== "全部" && { tag }),
              ...(nsfw && { nsfw: "1" }),
            }}
          />
        </div>
      )}

      {totalPages <= 1 && initialGames.length > 0 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          — 已加载全部 {total} 个游戏 —
        </p>
      )}
    </>
  )
}