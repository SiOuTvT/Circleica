import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { Metadata } from "next"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { CollectionShowcaseCard } from "@/components/archive/collection-showcase-card"
import { CollectionCard } from "@/components/collection-card"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity } from "@/components/archive/density"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "精选合集",
  description: "编辑精选 · 发现更多精彩作品",
  openGraph: {
    title: "精选合集 · Circleica",
    description: "编辑精选 · 发现更多精彩作品",
    images: ["/opengraph-image"],
  },
}

export const revalidate = 300

type CollectionSummary = Prisma.CuratedCollectionGetPayload<{
  include: {
    games: {
      take: 4
      orderBy: { sortOrder: "asc" }
      include: { game: { select: { id: true; serialId: true; title: true; coverImage: true } } }
    }
    _count: { select: { games: true } }
  }
}>

export default async function CuratedCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim().toLowerCase()

  let all: CollectionSummary[] = []
  try {
    all = await prisma.curatedCollection.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        games: {
          orderBy: { sortOrder: "asc" },
          take: 4,
          include: { game: { select: { id: true, serialId: true, title: true, coverImage: true } } },
        },
        _count: { select: { games: true } },
      },
    })
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空列表，绝不注入假数据
  }

  const collections = query
    ? all.filter((c) => c.name.toLowerCase().includes(query) || (c.description ?? "").toLowerCase().includes(query))
    : all

  const total = collections.length
  const density = computeDensity(total)

  // 空态：保留页头与品牌语言，不渲染列表
  if (total === 0) {
    return (
      <ArchiveShell entity="collection" density="standard">
        <ArchiveHero
          variant="series"
          eyebrow="collections"
          title="精选合集"
          lede="编辑精选 · 发现更多精彩作品"
          search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
        />
        <ArchivePlaceholder state="empty" entity="collection" message="暂无精选合集" />
      </ArchiveShell>
    )
  }

  const minSortOrder = collections.reduce(
    (min, c) => (c.sortOrder < min ? c.sortOrder : min),
    Number.POSITIVE_INFINITY,
  )
  const featured = collections.find((c) => c.sortOrder === minSortOrder) ?? null
  const rest = featured ? collections.filter((c) => c !== featured) : collections

  return (
    <ArchiveShell
      entity="collection"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            首页
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground">精选合集</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="series"
          eyebrow="collections"
          title="精选合集"
          lede="编辑精选 · 发现更多精彩作品"
          meta={<span className="tabular-nums">共 {total} 个合集</span>}
          search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
        />
      }
    >
      {featured && (
        <CollectionCard
          id={featured.id}
          name={featured.name}
          description={featured.description}
          count={featured._count.games}
          covers={featured.games.map((g) => ({ title: g.game.title, cover: g.game.coverImage }))}
          featured
        />
      )}

      {rest.length > 0 && (
        <div className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2")}>
          {rest.map((c) => (
            <CollectionShowcaseCard
              key={c.id}
              id={c.id}
              name={c.name}
              gameCount={c._count.games}
              covers={c.games.slice(0, 4).map((g) => g.game.coverImage)}
              description={c.description}
            />
          ))}
        </div>
      )}
    </ArchiveShell>
  )
}
