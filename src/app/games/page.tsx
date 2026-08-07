import { GameCard, GameCardSkeleton, GameListRow, GameListRowSkeleton, type GameCardData } from "@/components/game-card"
import { Pagination } from "@/components/ui/pagination"
import { ResultToolbar, GAME_SORT_OPTIONS } from "@/components/result-toolbar"
import { prisma } from "@/lib/prisma"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "全部游戏",
  description: "浏览全部同人游戏、Galgame、视觉小说资源，按最新、最热、收藏数排序",
  openGraph: {
    title: "全部游戏 · Circleica",
    description: "浏览全部同人游戏、Galgame、视觉小说资源",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/games" },
}

const GAMES_PER_PAGE = 24

type SortKey = "newest" | "popular" | "mostFaved"
type ViewKey = "grid" | "list"

function GridSkeleton({ view = "grid" }: { view?: ViewKey }) {
  if (view === "list") {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => <GameListRowSkeleton key={i} />)}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

const ORDER_BY: Record<SortKey, { createdAt?: "desc"; viewCount?: "desc"; favoriteCount?: "desc" }> = {
  newest: { createdAt: "desc" },
  popular: { viewCount: "desc" },
  mostFaved: { favoriteCount: "desc" },
}

async function GamesList({ page, sort = "newest", view = "grid", year, nsfwMode }: { page: number; sort?: SortKey; view?: ViewKey; year?: number; nsfwMode: MainNsfwMode }) {
  const skip = (page - 1) * GAMES_PER_PAGE

  // ⚠️ NSFW 三段过滤直接作用于列表本体（cookie 模式，未登录强制 sfw）
  const where = {
    isPublished: true,
    ...(nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}),
    ...(year ? { releaseDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } } : {}),
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip,
      take: GAMES_PER_PAGE,
      select: {
        id: true, serialId: true, title: true, coverImage: true, status: true,
        isNsfw: true, favoriteCount: true, viewCount: true,
        downloadCount: true, downloadLinks: true,
        updatedAt: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
        resources: { select: { language: true, runType: true, resourceContent: true } },
      },
    }),
    prisma.game.count({ where }),
  ]).catch(() => [[], 0] as [never[], number])

  const totalPages = Math.ceil(total / GAMES_PER_PAGE)

  if (!games.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">暂无游戏</p>
      </div>
    )
  }

  const toCardData = (g: (typeof games)[number]) => ({ ...g, tags: g.tags.map((t) => t.tag) } as unknown as GameCardData)

  return (
    <>
      <ResultToolbar
        total={total}
        resultLabel={year ? `${year} 年作品` : "全部游戏"}
        sort={sort}
        sortOptions={GAME_SORT_OPTIONS}
        basePath="/games"
        params={{ ...(year ? { year: String(year) } : {}) }}
        view={view}
      />
      <div className="mt-4">
        {view === "list" ? (
          <div className="flex flex-col gap-2">
            {games.map((game) => (
              <GameListRow key={game.id} game={toCardData(game)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
            {games.map((game) => (
              <GameCard key={game.id} game={toCardData(game)} />
            ))}
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/games"
            extraParams={{ ...(sort !== "newest" && { sort }), ...(view !== "grid" && { view }), ...(year ? { year: String(year) } : {}) }}
          />
        </div>
      )}
      {totalPages <= 1 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          — 已加载全部 {total} 个游戏 —
        </p>
      )}
    </>
  )
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; view?: string; page?: string; year?: string }>
}) {
  const sp = await searchParams
  const VALID_SORTS = ["newest", "popular", "mostFaved"] as const
  const sort = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest"
  const VALID_VIEWS = ["grid", "list"] as const
  const view = VALID_VIEWS.includes(sp.view as ViewKey) ? (sp.view as ViewKey) : "grid"
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1)
  const yearRaw = sp.year
  const yearNum = yearRaw ? parseInt(yearRaw, 10) : NaN
  const year = !Number.isNaN(yearNum) && yearNum > 1900 && yearNum < 2100 ? yearNum : undefined
  // NSFW 过滤模式：服务端按 cookie 解析（未登录强制 sfw）
  const nsfwMode = await getMainNsfwMode()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">全部游戏</h1>
        <p className="mt-1 text-sm text-muted-foreground">按最新、最热、收藏数浏览同人游戏作品</p>
      </div>
      <Suspense fallback={<GridSkeleton view={view} />}>
        <GamesList page={page} sort={sort} view={view} year={year} nsfwMode={nsfwMode} />
      </Suspense>
    </div>
  )
}
