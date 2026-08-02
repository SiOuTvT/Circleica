"use client"

import { GameCard, GameListRow, GameListRowSkeleton, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { ResultToolbar } from "@/components/result-toolbar"
import { Pagination } from "@/components/ui/pagination"

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
// 常驻占位槽位数：内容稀疏时游戏卡 + 空占位卡凑满 8 格，使首页网格永远有体量。
// 仅在第 1 页生效；分页（total>24）或内容充足（>=8）时不补占位。
const PLACEHOLDER_SLOTS = 8

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

  // 常驻占位：首页且真实卡片不足 8 张时，用空卡补满 8 格。
  // 有数据时真实卡片从前面覆盖，剩余槽位显示空卡——加载前后视觉一致，不闪「暂无游戏」。
  const placeholderCount = page === 1 ? Math.max(0, PLACEHOLDER_SLOTS - initialGames.length) : 0
  const hasReal = initialGames.length > 0
  const showGrid = hasReal || placeholderCount > 0

  if (!showGrid) return null

  return (
    <>
      {hasReal && (
        <ResultToolbar
          total={total}
          resultLabel={resultLabel}
          sort={sort}
          basePath={basePath}
          params={params}
          view={view}
        />
      )}
      <div className="mt-4">
        {view === "list" ? (
          <div className="flex flex-col gap-2">
            {initialGames.map((game) => (
              <GameListRow key={game.id} game={game} />
            ))}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <GameListRowSkeleton key={`ph-${i}`} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
            {initialGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <GameCardSkeleton key={`ph-${i}`} />
            ))}
          </div>
        )}
      </div>

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
