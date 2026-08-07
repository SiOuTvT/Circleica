import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { getMainNsfwMode } from "@/lib/nsfw-mode"
import type { Metadata } from "next"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { CollectionShowcaseCard } from "@/components/archive/collection-showcase-card"
import { CollectionCard } from "@/components/collection-card"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity, computeArchiveState, DENSITY_GRID } from "@/components/archive/density"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "精选合集",
  description: "编辑挑选的同人游戏合集",
  openGraph: {
    title: "精选合集 · Circleica",
    description: "编辑挑选的同人游戏合集",
    images: ["/opengraph-image"],
  },
}

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
    // ⚠️ 合集封面条（前 4 部游戏封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwMode = await getMainNsfwMode()
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    all = await prisma.curatedCollection.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        games: {
          where: { game: { isPublished: true, ...nsfwWhere } },
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
  const state = computeArchiveState(total)

  // 空态：保留页头与品牌语言，不渲染列表
  if (total === 0) {
    return (
      <ArchiveShell
        entity="collection"
        density={density}
        state="empty"
        // 页头必须走 header 槽（与下方常态分支一致）：作为 children 传入会落进不同的
        // 容器层级，space-y 间距计算随之改变，导致空态/非空态之间页头位置跳动。
        header={
          <ArchiveHero
            variant="series"
            eyebrow="collections"
            title="精选合集"
            lede="编辑挑选的同人游戏合集"
            meta={
              query ? (
                <span>
                  匹配 <span className="tabular-nums text-foreground">{total}</span> 个合集
                </span>
              ) : (
                <span>
                  共 <span className="tabular-nums text-foreground">{total}</span> 个合集
                </span>
              )
            }
            search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
          />
        }
      >
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
      state={state}
      header={
        <ArchiveHero
          variant="series"
          eyebrow="collections"
          title="精选合集"
          lede="编辑挑选的同人游戏合集"
          meta={
            <span>
              共 <span className="tabular-nums text-foreground">{total}</span> 个合集
            </span>
          }
          search={<HeaderSearch q={q} placeholder="搜索合集名称..." />}
        />
      }
    >
      {featured && (
        <CollectionCard
          id={featured.id}
          slug={featured.slug}
          name={featured.name}
          description={featured.description}
          count={featured._count.games}
          covers={featured.games.map((g) => ({ title: g.game.title, cover: g.game.coverImage }))}
          featured
        />
      )}

      {rest.length > 0 && (
        <div className={cn("grid gap-4", DENSITY_GRID[density])}>
          {rest.map((c) => (
            <CollectionShowcaseCard
              key={c.id}
              id={c.id}
              slug={c.slug}
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
