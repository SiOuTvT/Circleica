import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { CalendarDays, History, Layers, LayoutGrid, Shuffle, Sparkles } from "lucide-react"
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

function CollectionStripCard({ collection, isFirst = false }: { collection: CuratedCollectionData; isFirst?: boolean }) {
  const cover = collection.games.map((g) => g.game.coverImage).find(Boolean) || null
  return (
    <Link
      href={`/collections/${collection.id}`}
      className={`group shrink-0 ${isFirst ? "w-[260px] sm:w-[300px]" : "w-[200px] sm:w-[230px]"}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-lg group-hover:ring-foreground/10">
        {cover ? (
          <Image
            src={cover}
            alt={collection.name}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-105"
            sizes="300px"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40">无封面</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {isFirst && (
            <span className="inline-block rounded-full bg-primary/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground mb-1.5">
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

interface BrowseEntry {
  href: string
  label: string
  sub: string
  icon: typeof Layers
}

const BROWSE_ENTRIES: BrowseEntry[] = [
  { href: "/games", label: "全部作品", sub: "按发行浏览完整档案", icon: Layers },
  { href: "/ranking", label: "排行榜", sub: "评分 · 收藏 · 浏览", icon: Sparkles },
  { href: "/collections", label: "精选合集", sub: "编辑主题合集", icon: Layers },
  { href: "/tags", label: "标签", sub: "按题材检索", icon: Layers },
  { href: "/studios", label: "制作组", sub: "社团与工作室", icon: Layers },
  { href: "/creators", label: "创作者", sub: "画师 · 剧本 · 音乐", icon: Layers },
]

function BrowseEntryCard({ entry }: { entry: BrowseEntry }) {
  const Icon = entry.icon
  return (
    <Link
      href={entry.href}
      className="group flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm hover:ring-foreground/15"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-heading font-semibold text-foreground">{entry.label}</p>
        <p className="truncate text-xs text-muted-foreground">{entry.sub}</p>
      </div>
    </Link>
  )
}

export default async function DiscoverPage() {
  const data = await getDiscoveryData()

  return (
    <div className="space-y-10">
      {/* 页头（全站统一 ArchiveHero） */}
      <ArchiveHero
        variant="discover"
        eyebrow="discover"
        title="发现"
        lede="按兴趣探索：编辑精选、个性化推荐、随机惊喜与年份时间轴"
      />

      {/* 编辑精选 */}
      <DiscoverySection title="编辑精选" description="编辑用心挑选的主题合集" icon={Layers} actionHref="/collections">
        {data && data.collections.length > 0 ? (
          <div
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
            style={{ contain: "layout style" }}
          >
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

      {/* 随机发现 */}
      <DiscoverySection title="随机发现" description="换个心情，随便看看" icon={Shuffle}>
        <RandomDiscovery />
      </DiscoverySection>

      {/* 快速入口 */}
      <DiscoverySection title="快速入口" description="按维度浏览整个档案库" icon={LayoutGrid}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BROWSE_ENTRIES.map((e) => (
            <BrowseEntryCard key={e.href} entry={e} />
          ))}
        </div>
      </DiscoverySection>

      {/* 时间轴 */}
      <DiscoverySection title="时间轴" description="按发行年份回顾" icon={CalendarDays} actionHref="/games">
        {data && data.years.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {data.years.map((y) => (
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
