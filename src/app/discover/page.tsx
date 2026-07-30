import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight, Clock, History, Sparkles } from "lucide-react"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { DiscoverySection } from "@/components/discover/section"
import { RecentlyViewed } from "@/components/discover/recently-viewed"
import { ForYou } from "@/components/discover/for-you"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { GameCard, type GameCardData } from "@/components/game-card"

export const metadata: Metadata = {
  title: "发现",
  description: "接着看、看点精选、刷刷推荐——找到下一部想玩的作品",
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
  collections: CuratedCollectionData[]
  years: { year: number; count: number }[]
  popular: GameCardData[]
  recent: GameCardData[]
}

async function getDiscoveryData(): Promise<DiscoveryData | null> {
  try {
    const [collections, years, popular, recent] = await Promise.all([
      prisma.curatedCollection.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 8,
        include: {
          games: {
            orderBy: { sortOrder: "asc" },
            take: 4,
            include: { game: { select: { id: true, serialId: true, title: true, coverImage: true } } },
          },
          _count: { select: { games: true } },
        },
      }),
      prisma.$queryRaw<{ year: number; count: number }[]>`
        SELECT EXTRACT(YEAR FROM "releaseDate")::int AS year, COUNT(*)::int AS count
        FROM "Game"
        WHERE "isPublished" = true AND "isNsfw" = false AND "releaseDate" IS NOT NULL
        GROUP BY year
        ORDER BY year DESC
        LIMIT 12
      `,
      prisma.game.findMany({
        where: { isPublished: true, isNsfw: false },
        orderBy: { favoriteCount: "desc" },
        take: 9,
        select: GAME_CARD_SELECT,
      }),
      prisma.game.findMany({
        where: { isPublished: true, isNsfw: false, releaseDate: { not: null } },
        orderBy: { releaseDate: "desc" },
        take: 8,
        select: GAME_CARD_SELECT,
      }),
    ])

    return {
      collections,
      years: years.map((y) => ({ year: Number(y.year), count: Number(y.count) })),
      popular: popular.map((g) => mapGameToCard(g)),
      recent: recent.map((g) => mapGameToCard(g)),
    }
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空，绝不注入假数据
    return null
  }
}

/** 主编精选：非对称大特稿卡，编辑锚点（平衡权重，不压顶） */
function EditorFeature({ collection }: { collection: CuratedCollectionData }) {
  const cover = collection.games.map((g) => g.game.coverImage).find(Boolean) || null
  const firstTitle = collection.games[0]?.game.title

  return (
    <section className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-shadow hover:shadow-lg">
      <div className="grid sm:grid-cols-2">
        <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[280px]">
          {cover ? (
            <Image
              src={cover}
              alt={collection.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground/40">无封面</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/40 sm:via-transparent sm:to-transparent" />
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            主编精选
          </span>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">{collection.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {firstTitle ? `收录《${firstTitle}》等 ` : ""}
              {collection._count.games} 部作品
            </p>
          </div>
          <Link
            href={`/collections/${collection.id}`}
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            查看精选合集
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default async function DiscoverPage() {
  const data = await getDiscoveryData()
  const featured = data?.collections?.[0] ?? null
  const years = data?.years ?? []
  const recent = data?.recent ?? []
  const maxYear = years.length ? Math.max(...years.map((y) => y.count)) : 1

  return (
    <div className="space-y-8">
      {/* 页头（全站统一 ArchiveHero） */}
      <ArchiveHero
        variant="discover"
        eyebrow="discover"
        title="发现"
        lede="接着看、看点精选、刷刷推荐——找到下一部想玩的作品"
      />

      {/* 1. 接着看 */}
      <DiscoverySection title="继续浏览" description="你最近看过的作品" icon={History}>
        <RecentlyViewed />
      </DiscoverySection>

      {/* 2. 看点精选（平衡权重，不压顶） */}
      {featured ? (
        <EditorFeature collection={featured} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">暂无精选合集</p>
        </div>
      )}

      {/* 3. 刷推荐 */}
      <DiscoverySection title="为你推荐" description="基于你的浏览兴趣" icon={Sparkles}>
        <ForYou popular={data?.popular ?? []} />
      </DiscoverySection>

      {/* 4. 发行时间轴（升级为正式板块：自包含年份发行量可视化，不外链别的页面） */}
      <DiscoverySection title="发行时间轴" description="全站作品的年代分布" icon={CalendarDays}>
        {years.length > 0 ? (
          <div className="space-y-2.5">
            {years.map((y) => {
              const pct = Math.max(6, Math.round((y.count / maxYear) * 100))
              return (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{y.year}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{y.count} 部</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无年份数据</p>
        )}
      </DiscoverySection>

      {/* 5. 最近上新（真实内容、自包含，与 /games 完整浏览列表区分） */}
      <DiscoverySection title="最近上新" description="刚刚入库的作品" icon={Clock}>
        {recent.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无新作</p>
        )}
      </DiscoverySection>
    </div>
  )
}
