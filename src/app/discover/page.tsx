import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, ChevronRight, History, Shuffle, Sparkles } from "lucide-react"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { DiscoverySection } from "@/components/discover/section"
import { RecentlyViewed } from "@/components/discover/recently-viewed"
import { ForYou } from "@/components/discover/for-you"
import { RandomDiscovery } from "@/components/discover/random-discovery"

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

/** 折叠小按钮样式（默认只显示 summary，展开后才露出内容） */
const summaryBtn =
  "inline-flex list-none cursor-pointer items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [details[open]_&]:bg-card [details[open]_&]:text-foreground [&::-webkit-details-marker]:hidden"

export default async function DiscoverPage() {
  const data = await getDiscoveryData()
  const featured = data?.collections?.[0] ?? null
  const years = data?.years ?? []

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
        <ForYou />
      </DiscoverySection>

      {/* 随机 + 时间轴：仅小按钮（折叠，不重复外链） */}
      <div className="flex flex-wrap items-center gap-3">
        <details>
          <summary className={summaryBtn}>
            <Shuffle className="h-3.5 w-3.5" strokeWidth={1.75} />
            随机一个
          </summary>
          <div className="mt-3">
            <RandomDiscovery autoLoad={false} />
          </div>
        </details>
        <details>
          <summary className={summaryBtn}>
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
            时间轴
          </summary>
          <div className="mt-3">
            {years.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <span
                    key={y.year}
                    className="rounded-full bg-card px-3 py-1 text-xs tabular-nums text-muted-foreground ring-1 ring-border/50"
                  >
                    {y.year} · {y.count} 部
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">暂无年份数据</p>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}
