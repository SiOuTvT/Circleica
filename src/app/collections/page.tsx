import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { ChevronRight, Layers, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import type { Metadata } from "next"

export const revalidate = 120
export const metadata: Metadata = {
  title: "精选合集",
  description: "浏览同人游戏精选合集，按系列、原作、主题发现更多精彩游戏",
  openGraph: { title: "精选合集 · 同人游戏站", description: "按系列、原作、主题发现更多精彩游戏", images: ["/opengraph-image"] },
  alternates: { canonical: "/collections" },
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() || ""

  // 查所有原作系列及其游戏数量
  async function fetchCollectionsData() {
    const groupCounts = await prisma.game.groupBy({
      by: ["originalWork"],
      where: {
        isPublished: true,
        isNsfw: false,
        NOT: { originalWork: "" },
        ...(q ? { originalWork: { contains: q, mode: "insensitive" } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    })

    const seriesNames = groupCounts.map(g => g.originalWork)

    // 单次查询获取所有系列的游戏
    const allGames = await prisma.game.findMany({
      where: {
        isPublished: true,
        isNsfw: false,
        originalWork: { in: seriesNames },
      },
      orderBy: { favoriteCount: "desc" },
      select: {
        id: true, serialId: true, title: true, coverImage: true,
        favoriteCount: true, originalWork: true,
      },
    })

    return { groupCounts, allGames }
  }

  type CollectionsData = Awaited<ReturnType<typeof fetchCollectionsData>>
  let data: CollectionsData
  try {
    data = await fetchCollectionsData()
  } catch (error) {
    logger.db.error("[CollectionsPage] 查询失败", error)
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">精选合集</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">按原作系列整理的同人游戏合集</p>
        </div>
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">加载收藏集失败，请稍后重试</p>
        </div>
      </div>
    )
  }

  const { groupCounts, allGames } = data

  // 按系列分组
  const gamesBySeries = new Map<string, typeof allGames>()
  for (const game of allGames) {
    const list = gamesBySeries.get(game.originalWork) ?? []
    if (list.length < 8) {
      list.push(game)
      gamesBySeries.set(game.originalWork, list)
    }
  }

  // 按系列排序，附带真实游戏数量
  const countMap = new Map(groupCounts.map(g => [g.originalWork, g._count.id]))
  const sorted: [string, typeof allGames, number][] = groupCounts
    .map(g => [g.originalWork, gamesBySeries.get(g.originalWork) ?? [], countMap.get(g.originalWork) ?? 0] as [string, typeof allGames, number])
    .filter(([, games]) => games.length > 0)

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">精选合集</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">按原作系列整理的同人游戏合集</p>
      </div>

      {/* 搜索 */}
      <form className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索系列名..."
          className="w-full rounded-xl bg-muted pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors" aria-label="搜索">
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </form>

      {/* 统计 */}
      <p className="text-xs text-muted-foreground">
        {q ? `找到 ${sorted.length} 个系列` : `共 ${sorted.length} 个系列`}
      </p>

      {/* 系列列表 */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Layers className="h-12 w-12 text-muted-foreground/30" />
          {q && <p className="text-sm text-muted-foreground">没有找到匹配的系列</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {sorted.map(([originalWork, list, realCount]) => {
            const coverGame = list[0]
            return (
              <div
                key={originalWork}
                className="rounded-2xl bg-card ring-1 ring-border overflow-hidden transition-all hover:ring-primary/30"
              >
                {/* 系列头部 */}
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  {/* 系列封面 */}
                  {coverGame?.coverImage ? (
                    <div className="relative h-16 w-12 sm:h-20 sm:w-14 rounded-lg overflow-hidden shrink-0 ring-1 ring-border">
                      <Image
                        src={coverGame.coverImage}
                        alt={originalWork}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-12 sm:h-20 sm:w-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-border">
                      <span className="text-lg text-primary/40">?</span>
                    </div>
                  )}

                  {/* 系列信息 */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                      {originalWork}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {realCount} 个游戏
                      </span>
                    </div>
                  </div>

                  {/* 查看全部 */}
                  <Link
                    href={`/search?q=${encodeURIComponent(originalWork)}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    查看全部 <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
                  </Link>
                </div>

                {/* 游戏列表 - 横向滚动 */}
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-3">
                    {list.map(g => (
                      <Link
                        key={g.id}
                        href={`/games/${g.serialId}`}
                        className="group shrink-0 w-[100px] sm:w-[120px]"
                      >
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-border mb-2">
                          {g.coverImage ? (
                            <Image
                              src={g.coverImage}
                              alt={g.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="120px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                              ?
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {g.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
