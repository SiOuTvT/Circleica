import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import type { Metadata } from "next"
import { CollectionCard } from "@/components/collection-card"

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

export default async function CuratedCollectionsPage() {
  let collections: CollectionSummary[] = []
  try {
    collections = await prisma.curatedCollection.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: {
        games: {
          orderBy: { sortOrder: "asc" },
          take: 4,
          include: {
            game: { select: { id: true, serialId: true, title: true, coverImage: true } },
          },
        },
        _count: { select: { games: true } },
      },
    })
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空列表，绝不注入假数据
  }

  if (collections.length === 0) {
    return (
      <div className="space-y-6 pt-4">
        <h1 className="text-2xl font-heading font-semibold text-foreground">精选合集</h1>
        <div className="py-20 text-center text-sm text-muted-foreground">暂无精选合集</div>
      </div>
    )
  }

  const [featured, ...rest] = collections

  return (
    <div className="space-y-8 pt-4">
      {/* 页头 */}
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-heading font-semibold text-foreground">精选合集</h1>
      </header>

      {/* 编辑推荐（首条合集） */}
      <CollectionCard
        id={featured.id}
        name={featured.name}
        description={featured.description}
        count={featured._count.games}
        covers={featured.games.map((g) => ({ title: g.game.title, cover: g.game.coverImage }))}
        featured
      />

      {/* 其余合集 */}
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((c) => (
            <CollectionCard
              key={c.id}
              id={c.id}
              name={c.name}
              description={c.description}
              count={c._count.games}
              covers={c.games.map((g) => ({ title: g.game.title, cover: g.game.coverImage }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
