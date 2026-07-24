import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { GameCard } from "@/components/game-card"
import Image from "next/image"

export const revalidate = 300

type CollectionDetail = Prisma.CuratedCollectionGetPayload<{
  include: {
    games: {
      orderBy: { sortOrder: "asc" }
      include: { game: { select: typeof GAME_CARD_SELECT } }
    }
    _count: { select: { games: true } }
  }
}>

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await prisma.curatedCollection.findUnique({
    where: { id, published: true },
    select: { name: true, description: true },
  })
  if (!c) return { title: "合集不存在" }
  return {
    title: c.name,
    description: c.description || `精选合集：${c.name}`,
    openGraph: {
      title: `${c.name} · 精选合集`,
      description: c.description,
      images: ["/opengraph-image"],
    },
  }
}

export default async function CuratedCollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let collection: CollectionDetail | null = null
  try {
    collection = await prisma.curatedCollection.findUnique({
      where: { id, published: true },
      include: {
        games: {
          orderBy: { sortOrder: "asc" },
          include: { game: { select: GAME_CARD_SELECT } },
        },
        _count: { select: { games: true } },
      },
    })
  } catch {
    // 数据库不可用：交由下方 notFound 处理，绝不注入假数据
  }

  if (!collection) notFound()

  const covers = collection.games.map((g) => g.game).filter((g) => g.coverImage)

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* 顶部堆叠封面（克制、无 glow hero） */}
      <div className="relative h-52 overflow-hidden rounded-2xl bg-muted sm:h-64">
        {covers.length > 0 ? (
          <div className="absolute inset-0 flex items-end justify-center pb-6">
            {covers.slice(0, 5).map((g, i) => (
              <div
                key={g.id}
                className="absolute"
                style={{
                  left: `${10 + i * 16}%`,
                  zIndex: 5 - i,
                  transform: `rotate(${(i - 2) * 2.5}deg)`,
                }}
              >
                <Image
                  src={g.coverImage as string}
                  alt={g.title}
                  width={120}
                  height={168}
                  className="h-[168px] w-[120px] rounded-xl object-cover shadow-md ring-1 ring-black/10"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 合集信息 */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{collection.name}</h1>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground">{collection._count.games} 部游戏</p>
      </div>

      {/* 游戏列表：复用统一 Game Card（与图鉴/发现页一致） */}
      {collection.games.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.games.map(({ game }) => (
            <GameCard key={game.id} game={mapGameToCard(game)} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">该合集暂无游戏</div>
      )}
    </div>
  )
}
