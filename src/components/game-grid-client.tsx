"use client"

import { GameCard, GameListRow, type GameCardData } from "@/components/game-card"
import { ResultToolbar } from "@/components/result-toolbar"
import { Pagination } from "@/components/ui/pagination"
import { Gamepad2 } from "lucide-react"

interface Props {
  initialGames: GameCardData[]
  total: number
  tag: string
  q: string
  nsfw: boolean
  page: number
  sort?: string
  view?: "grid" | "list"
}

const GAMES_PER_PAGE = 24

export function GameGridClient({ initialGames, total, tag, q, nsfw, page, sort = "newest", view = "grid" }: Props) {
  const totalPages = Math.ceil(total / GAMES_PER_PAGE)
  const isSearch = tag && tag !== "全部"
  const basePath = isSearch ? "/search" : "/"
  const params: Record<string, string> = {
    ...(q && { q }),
    ...(isSearch && { tag }),
    ...(nsfw && { nsfw: "1" }),
  }
  const resultLabel = q ? "搜索结果" : isSearch ? `# ${tag}` : "最新资源"

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
        <>
          <ResultToolbar
            total={total}
            resultLabel={resultLabel}
            sort={sort}
            basePath={basePath}
            params={params}
            view={view}
          />
          <div className="mt-4">
            {view === "list" ? (
              <div className="flex flex-col gap-2">
                {initialGames.map((game) => (
                  <GameListRow key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
                {initialGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={basePath}
            extraParams={{
              ...(q && { q }),
              ...(isSearch && { tag }),
              ...(nsfw && { nsfw: "1" }),
              ...(sort !== "newest" && { sort }),
              ...(view !== "grid" && { view }),
            }}
          />
        </div>
      )}
    </>
  )
}
