import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { notFound } from "next/navigation"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { getMainNsfwMode } from "@/lib/nsfw-mode"
import Image from "next/image"
import Link from "next/link"
import { Eye, Heart } from "lucide-react"

type CollectionDetail = Prisma.CuratedCollectionGetPayload<{
  include: {
    games: {
      orderBy: { sortOrder: "asc" }
      include: { game: { select: typeof GAME_CARD_SELECT } }
    }
    _count: { select: { games: true } }
  }
}>

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await prisma.curatedCollection.findUnique({
    where: { slug, published: true },
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
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // NSFW 过滤模式：服务端按 cookie 解析（未登录强制 sfw）
  const nsfwMode = await getMainNsfwMode()

  let collection: CollectionDetail | null = null
  try {
    // ⚠️ 合集内游戏卡片（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    collection = await prisma.curatedCollection.findUnique({
      where: { slug, published: true },
      include: {
        games: {
          where: { game: { isPublished: true, ...nsfwWhere } },
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

  const games = collection.games
  const heroCover = games.find((g) => g.game.coverImage)?.game.coverImage ?? null
  const gameCount = collection._count.games

  return (
    <div className="space-y-8 pt-4">
      {/* ── 顶部区域：封面 + 信息 ── */}
      <div className="space-y-6">
        {/* 封面 hero（首部游戏的封面放大，有料才展示） */}
        {heroCover ? (
          <div className="relative overflow-hidden rounded-2xl bg-muted" style={{ aspectRatio: "21 / 9" }}>
            <Image
              src={heroCover}
              alt={collection.name}
              fill
              className="object-cover"
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ) : null}

        {/* 合集信息 */}
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              {collection.description}
            </p>
          )}
          <p className="text-xs tabular-nums text-muted-foreground/60">
            {gameCount} 部精选
          </p>
        </div>
      </div>

      {/* ── 游戏游廊 ── */}
      {games.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {games.map(({ game }, index) => {
            const card = mapGameToCard(game)
            return (
              <Link
                key={game.id}
                href={`/games/${game.serialId}`}
                className="group flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/50 transition-all duration-300 hover:ring-foreground/10 hover:shadow-sm sm:p-5"
              >
                {/* 排名 */}
                <div className="flex shrink-0 items-start pt-1">
                  <span className="text-sm font-bold tabular-nums text-muted-foreground/30 transition-colors group-hover:text-primary/50">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* 封面 */}
                <div className="relative w-20 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 transition-all duration-300 group-hover:ring-foreground/10 group-hover:shadow-md sm:w-24">
                  {card.coverImage ? (
                    <Image
                      src={card.coverImage}
                      alt={card.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                      sizes="(max-width: 640px) 80px, 96px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <span className="text-lg font-bold text-primary/30">?</span>
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <h3 className="text-sm font-heading font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
                    {card.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground/60">
                    {card.viewCount != null && card.viewCount > 0 && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                        {card.viewCount}
                      </span>
                    )}
                    {card.favoriteCount > 0 && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <Heart className="h-3 w-3" strokeWidth={1.5} />
                        {card.favoriteCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">该合集暂无游戏</div>
      )}
    </div>
  )
}
