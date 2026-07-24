import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarDays,
  Clock,
  Compass,
  Flame,
  History,
  Layers,
  Shuffle,
  Sparkles,
  Users,
} from "lucide-react"
import { GameCard, type GameCardData } from "@/components/game-card"
import { DiscoverySection } from "@/components/discover/section"
import { RecentlyViewed } from "@/components/discover/recently-viewed"
import { RandomDiscovery } from "@/components/discover/random-discovery"
import { ForYou } from "@/components/discover/for-you"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"

export const metadata: Metadata = {
  title: "发现",
  description: "探索同人游戏：编辑精选、热门系列、制作组、随机发现、时间轴，按你的兴趣发现更多好作品",
  openGraph: {
    title: "发现 · Circleica",
    description: "探索同人游戏，发现更多好作品",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/discover" },
}

export const revalidate = 120

interface CuratedCollectionData {
  id: string
  name: string
  games: { game: { id: string; serialId: number; title: string; coverImage: string | null } }[]
  _count: { games: number }
}

interface DiscoveryData {
  newest: GameCardData[]
  popular: GameCardData[]
  collections: CuratedCollectionData[]
  series: { name: string; count: number; cover: string | null; title: string }[]
  creators: { id: string; name: string; avatar: string | null; cover: string | null; count: number }[]
  years: { year: number; count: number }[]
}

async function getDiscoveryData(): Promise<DiscoveryData | null> {
  try {
    const [newest, popular, collections, seriesGroups, creatorGroups, years] = await Promise.all([
      prisma.game.findMany({
        where: { isPublished: true, isNsfw: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: GAME_CARD_SELECT,
      }),
      prisma.game.findMany({
        where: { isPublished: true, isNsfw: false },
        orderBy: { favoriteCount: "desc" },
        take: 10,
        select: GAME_CARD_SELECT,
      }),
      prisma.curatedCollection.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 12,
        include: {
          games: {
            orderBy: { sortOrder: "asc" },
            take: 4,
            include: { game: { select: { id: true, serialId: true, title: true, coverImage: true } } },
          },
          _count: { select: { games: true } },
        },
      }),
      prisma.game.groupBy({
        by: ["originalWork"],
        where: { isPublished: true, isNsfw: false, NOT: { originalWork: "" } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.gameCreator.groupBy({
        by: ["creatorId"],
        _count: { gameId: true },
        orderBy: { _count: { gameId: "desc" } },
        take: 8,
      }),
      prisma.$queryRaw<{ year: number; count: number }[]>`
        SELECT EXTRACT(YEAR FROM "releaseDate")::int AS year, COUNT(*)::int AS count
        FROM "Game"
        WHERE "isPublished" = true AND "isNsfw" = false AND "releaseDate" IS NOT NULL
        GROUP BY year
        ORDER BY year DESC
        LIMIT 12
      `,
    ])

    // ── 热门系列：取每个系列的代表封面 ──
    let series: DiscoveryData["series"] = []
    try {
      const names = seriesGroups.map((g) => g.originalWork)
      if (names.length) {
        const seriesGames = await prisma.game.findMany({
          where: { originalWork: { in: names }, isPublished: true, isNsfw: false },
          orderBy: { favoriteCount: "desc" },
          select: { id: true, serialId: true, title: true, coverImage: true, originalWork: true },
        })
        const byName = new Map<string, { cover: string | null; title: string }>()
        for (const g of seriesGames) {
          if (!byName.has(g.originalWork)) byName.set(g.originalWork, { cover: g.coverImage || null, title: g.title })
        }
        series = seriesGroups
          .map((g) => ({
            name: g.originalWork,
            count: g._count.id,
            ...(byName.get(g.originalWork) ?? { cover: null, title: "" }),
          }))
          .filter((s) => s.cover)
      }
    } catch {
      /* 系列封面查询失败不影响其它区块 */
    }

    // ── 制作组 / 社团：取每个制作组的代表封面 ──
    let creators: DiscoveryData["creators"] = []
    try {
      const ids = creatorGroups.map((g) => g.creatorId)
      if (ids.length) {
        const infos = await prisma.creator.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, avatar: true },
        })
        const creatorGames = await prisma.game.findMany({
          where: { creators: { some: { creatorId: { in: ids } } }, isPublished: true, isNsfw: false },
          orderBy: { favoriteCount: "desc" },
          select: { coverImage: true, creators: { select: { creatorId: true } } },
        })
        const coverMap = new Map<string, string | null>()
        for (const g of creatorGames) {
          for (const c of g.creators) {
            if (!coverMap.has(c.creatorId)) coverMap.set(c.creatorId, g.coverImage || null)
          }
        }
        const countMap = new Map(creatorGroups.map((g) => [g.creatorId, g._count.gameId]))
        creators = infos
          .map((c) => ({
            id: c.id,
            name: c.name,
            avatar: c.avatar || null,
            cover: coverMap.get(c.id) || null,
            count: countMap.get(c.id) ?? 0,
          }))
          .filter((c) => c.cover)
      }
    } catch {
      /* 制作组封面查询失败不影响其它区块 */
    }

    return {
      newest: newest.map((g) => mapGameToCard(g as never)),
      popular: popular.map((g) => mapGameToCard(g as never)),
      collections,
      series,
      creators,
      years: years.map((y) => ({ year: Number(y.year), count: Number(y.count) })),
    }
  } catch {
    return null
  }
}

function CollectionStripCard({ collection, isFirst = false }: { collection: CuratedCollectionData; isFirst?: boolean }) {
  const cover = collection.games.map((g) => g.game.coverImage).find(Boolean) || null
  return (
    <Link href={`/curated-collections/${collection.id}`} className={`group shrink-0 ${isFirst ? "w-[260px] sm:w-[300px]" : "w-[200px] sm:w-[230px]"}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-lg group-hover:ring-[var(--theme-color)]/40">
        {cover ? (
          <Image src={cover} alt={collection.name} fill className="object-cover transition-all duration-700 group-hover:scale-105" sizes="300px" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">无封面</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {isFirst && (
            <span className="inline-block rounded-full bg-[var(--theme-color)]/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white mb-1.5">
              编辑精选
            </span>
          )}
          <p className="truncate text-sm font-heading font-semibold text-white sm:text-base">{collection.name}</p>
          <p className="text-xs text-white/70 mt-0.5">{collection._count.games} 部</p>
        </div>
      </div>
    </Link>
  )
}

export default async function DiscoverPage() {
  const data = await getDiscoveryData()

  return (
    <div className="space-y-8">
      {/* 页头 */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
          <Compass className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">发现</h1>
          <p className="text-sm text-muted-foreground">按兴趣探索：编辑精选、热门系列、制作组与随机惊喜</p>
        </div>
      </header>

      {/* 编辑精选 */}
      <DiscoverySection title="编辑精选" description="编辑用心挑选的主题合集" icon={Layers} actionHref="/curated-collections">
        {data && data.collections.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20" style={{ contain: "layout style" }}>
            {data.collections.map((c, i) => (
              <CollectionStripCard key={c.id} collection={c} isFirst={i === 0} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无精选合集</p>
        )}
      </DiscoverySection>

      {/* 继续浏览 */}
      <DiscoverySection title="继续浏览" description="你最近看过的作品" icon={History}>
        <RecentlyViewed />
      </DiscoverySection>

      {/* 为你推荐（相似作品） */}
      <DiscoverySection title="为你推荐" description="基于你的浏览兴趣" icon={Sparkles}>
        <ForYou />
      </DiscoverySection>

      {/* 新上架 */}
      <DiscoverySection title="新上架" description="最新收录的同人作品" icon={Clock} actionHref="/games?sort=newest">
        {data && data.newest.length > 0 ? (
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            {data.newest.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无新作</p>
        )}
      </DiscoverySection>

      {/* 热门精选 */}
      <DiscoverySection title="热门精选" description="大家都在玩的作品" icon={Flame} actionHref="/games?sort=mostFaved">
        {data && data.popular.length > 0 ? (
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            {data.popular.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无热门作品</p>
        )}
      </DiscoverySection>

      {/* 热门系列 */}
      <DiscoverySection title="热门系列" description="按原作系列整理" icon={Layers} actionHref="/collections">
        {data && data.series.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20" style={{ contain: "layout style" }}>
            {data.series.map((s) => (
              <Link
                key={s.name}
                href={`/search?q=${encodeURIComponent(s.name)}`}
                className="group w-[160px] shrink-0 sm:w-[180px]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-md group-hover:ring-[var(--theme-color)]/40">
                  {s.cover ? (
                    <Image src={s.cover} alt={s.name} fill className="object-cover transition-all duration-700 group-hover:scale-105" sizes="180px" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">无封面</div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-heading font-medium text-foreground transition-colors group-hover:text-[var(--theme-color)]">
                  {s.name}
                </p>
                <p className="text-micro text-muted-foreground">{s.count} 部</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无系列</p>
        )}
      </DiscoverySection>

      {/* 制作组 / 社团 */}
      <DiscoverySection title="制作组 / 社团" description="活跃的创作者与社团" icon={Users} actionHref="/credits">
        {data && data.creators.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20" style={{ contain: "layout style" }}>
            {data.creators.map((c) => (
              <Link
                key={c.id}
                href={`/search?q=${encodeURIComponent(c.name)}`}
                className="group w-[160px] shrink-0 sm:w-[180px]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-md group-hover:ring-[var(--theme-color)]/40">
                  {c.cover ? (
                    <Image src={c.cover} alt={c.name} fill className="object-cover transition-all duration-700 group-hover:scale-105" sizes="180px" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">无封面</div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-heading font-medium text-foreground transition-colors group-hover:text-[var(--theme-color)]">
                  {c.name}
                </p>
                <p className="text-micro text-muted-foreground">{c.count} 部</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无制作组</p>
        )}
      </DiscoverySection>

      {/* 随机发现 */}
      <DiscoverySection title="随机发现" description="换个心情，随便看看" icon={Shuffle}>
        <RandomDiscovery />
      </DiscoverySection>

      {/* 时间轴 */}
      <DiscoverySection title="时间轴" description="按发行年份回顾" icon={CalendarDays} actionHref="/games">
        {data && data.years.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.years.map((y) => (
              <Link
                key={y.year}
                href={`/games?year=${y.year}`}
                className="flex items-baseline gap-1.5 rounded-xl bg-muted px-3 py-2 transition-colors hover:bg-muted/70 hover:ring-1 hover:ring-[var(--theme-color)]/30"
              >
                <span className="text-sm font-semibold tabular-nums text-foreground">{y.year}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{y.count}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无年份数据</p>
        )}
      </DiscoverySection>
    </div>
  )
}
