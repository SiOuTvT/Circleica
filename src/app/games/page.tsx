import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { Pagination } from "@/components/ui/pagination"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import { Suspense } from "react"

export const revalidate = 60

export const metadata: Metadata = {
  title: "全部游戏",
  description: "浏览全部同人游戏、Galgame、视觉小说资源，按最新、最热、收藏数排序",
  openGraph: {
    title: "全部游戏 · 同人游戏站",
    description: "浏览全部同人游戏、Galgame、视觉小说资源",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/games" },
}

const GAMES_PER_PAGE = 24

async function getTotalGames() {
  return prisma.game.count({ where: { isPublished: true } }).catch(() => 0)
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

async function GamesList({ page }: { page: number }) {
  const skip = (page - 1) * GAMES_PER_PAGE

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
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
    prisma.game.count({ where: { isPublished: true } }),
  ]).catch(() => [[], 0] as [never[], number])

  const totalPages = Math.ceil(total / GAMES_PER_PAGE)

  if (!games.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">暂无游戏</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
        {games.map((game) => (
          <GameCard key={game.id} game={{ ...game, tags: game.tags.map(t => t.tag) } as unknown as GameCardData} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} baseUrl="/games" />
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
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1)
  const total = await getTotalGames()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">全部游戏</h1>
        <p className="mt-1 text-sm text-muted-foreground">共收录 {total} 部同人游戏作品</p>
      </div>
      <Suspense fallback={<GridSkeleton />}>
        <GamesList page={page} />
      </Suspense>
    </div>
  )
}
