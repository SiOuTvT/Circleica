import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { notFound } from "next/navigation"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { getMainNsfwMode } from "@/lib/nsfw-mode"
import Image from "next/image"
import Link from "next/link"
import { ImageOff } from "lucide-react"

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
  // Next 16 动态段参数不做自动解码，slug 可能仍是 URL 编码串，需手动解码才能匹配库内数据
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)
  const c = await prisma.curatedCollection.findUnique({
    where: { slug: decodedSlug, published: true },
    select: { name: true, description: true },
  })
  if (!c) return { title: "合集不存在" }
  return {
    title: c.name,
    description: c.description || `精选合集：${c.name}`,
    openGraph: {
      siteName: "Circleica",
      title: `${c.name}`,
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
  // Next 16 动态段参数不做自动解码，slug 可能仍是 URL 编码串，需手动解码才能匹配库内数据
  const { slug } = await params
  const decodedSlug = decodeURIComponent(slug)

  // NSFW 过滤模式：服务端按 cookie 解析（未登录强制 sfw）
  const nsfwMode = await getMainNsfwMode()

  let collection: CollectionDetail | null = null
  try {
    // ⚠️ 合集内游戏卡片（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
    collection = await prisma.curatedCollection.findUnique({
      where: { slug: decodedSlug, published: true },
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
  const gameCount = collection._count.games

  return (
    <div className="space-y-8 pt-4">
      {/* ── 顶部区域：信息 ── */}
      <div className="space-y-6">
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

      {/* ── 游戏海报墙 ── */}
      {games.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {games.map(({ game }) => {
            const card = mapGameToCard(game)
            return (
              <Link
                key={game.id}
                href={`/games/${game.serialId}`}
                className="group relative block overflow-hidden rounded-2xl bg-card ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)] "
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {card.coverImage ? (
                    <Image
                      src={card.coverImage}
                      alt={card.title}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 285px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted to-muted/60 px-2 text-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                      <span className="text-xs font-medium leading-tight">{card.title}</span>
                    </div>
                  )}

                  {/* 有封面：底部半透明黑色渐变 + 游戏名白字叠加 */}
                  {card.coverImage && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 py-2">
                      <h3 className="truncate text-[18px] font-semibold text-white transition-colors group-hover:text-primary">
                        {card.title}
                      </h3>
                    </div>
                  )}
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
