import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight, History, Shuffle, Sparkles } from "lucide-react"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { DiscoverySection } from "@/components/discover/section"
import { RecentlyViewed } from "@/components/discover/recently-viewed"
import { RandomDiscovery } from "@/components/discover/random-discovery"
import { ForYou } from "@/components/discover/for-you"

export const metadata: Metadata = {
  title: "发现",
  description: "探索同人游戏：编辑精选、个性化推荐、随机惊喜与年份时间轴，按你的兴趣发现更多好作品",
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
}

async function getDiscoveryData(): Promise<DiscoveryData | null> {
  try {
    const [collections, years] = await Promise.all([
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
    ])

    return {
      collections,
      years: years.map((y) => ({ year: Number(y.year), count: Number(y.count) })),
    }
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空，绝不注入假数据
    return null
  }
}

/** 主编精选：非对称大特稿卡，作为发现页的编辑锚点 */
function EditorFeature({ collection }: { collection: CuratedCollectionData }) {
  const cover = collection.games.map((g) => g.game.coverImage).find(Boolean) || null
  const firstTitle = collection.games[0]?.game.title

  return (
    <section className="group relative overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-shadow hover:shadow-lg">
      <div className="grid sm:grid-cols-2">
        <div className="relative aspect-[16/10] sm:aspect-auto sm:min-h-[300px]">
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

  return (
    <div className="space-y-12">
      {/* 页头（全站统一 ArchiveHero） */}
      <ArchiveHero
        variant="discover"
        eyebrow="discover"
        title="发现"
        lede="编辑精选、个性推荐与随机惊喜，帮你找到下一部想玩的作品"
      />

      {/* 主编精选：编辑锚点 */}
      {featured ? (
        <EditorFeature collection={featured} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">暂无精选合集</p>
        </div>
      )}

      {/* 个性化双栏 */}
      <div className="grid gap-10 sm:grid-cols-2">
        <DiscoverySection title="继续浏览" description="你最近看过的作品" icon={History}>
          <RecentlyViewed />
        </DiscoverySection>
        <DiscoverySection title="为你推荐" description="基于你的浏览兴趣" icon={Sparkles}>
          <ForYou />
        </DiscoverySection>
      </div>

      {/* 随机发现 */}
      <DiscoverySection title="随机发现" description="换个心情，随便看看" icon={Shuffle}>
        <RandomDiscovery />
      </DiscoverySection>

      {/* 时间轴 */}
      <DiscoverySection title="时间轴" description="按发行年份回顾" icon={CalendarDays} actionHref="/games">
        {years.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {years.map((y) => (
              <Link
                key={y.year}
                href={`/games?year=${y.year}`}
                className="group flex flex-col items-center gap-0.5 rounded-2xl bg-card px-5 py-3 ring-1 ring-border/50 transition-all duration-300 hover:ring-foreground/10 hover:shadow-sm hover:-translate-y-0.5"
              >
                <span className="text-lg font-bold tabular-nums text-foreground">{y.year}</span>
                <span className="text-xs tabular-nums text-muted-foreground/60">{y.count} 部</span>
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
