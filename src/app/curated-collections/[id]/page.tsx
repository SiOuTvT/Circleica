import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export const revalidate = 300

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
    openGraph: { title: `${c.name} · 精选合集`, description: c.description, images: ["/opengraph-image"] },
  }
}

export default async function CuratedCollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const collection = await prisma.curatedCollection.findUnique({
    where: { id, published: true },
    include: {
      games: {
        orderBy: { sortOrder: "asc" },
        include: {
          game: {
            select: {
              id: true, serialId: true, title: true, coverImage: true,
              studioName: true, releaseDate: true, description: true,
            },
          },
        },
      },
      _count: { select: { games: true } },
    },
  })

  if (!collection) notFound()

  const covers = collection.games.map((g: any) => g.game)

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* 顶部封面 */}
      <div className="relative h-52 sm:h-64 rounded-2xl overflow-hidden bg-muted">
        {covers.length > 0 ? (
          <div className="absolute inset-0 flex items-end justify-center pb-6">
            {covers.slice(0, 5).map((g: any, i: number) => (
              <div key={i} className="absolute" style={{ left: `${10 + i * 16}%`, zIndex: 5 - i, transform: `rotate(${(i - 2) * 2.5}deg)` }}>
                {g.coverImage ? (
                  <Image src={g.coverImage} alt={g.title} width={120} height={168}
                    className="w-[120px] h-[168px] rounded-xl object-cover shadow-3 ring-1 ring-black/10" unoptimized />
                ) : (
                  <div className="w-[120px] h-[168px] rounded-xl bg-muted-foreground/10 shadow-3 ring-1 ring-black/10" />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* 合集信息 */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{collection.name}</h1>
        {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
        <p className="text-sm text-muted-foreground">{collection._count.games} 部游戏</p>
      </div>

      {/* 游戏列表 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collection.games.map(({ game }: any) => (
          <Link key={game.id} href={`/games/${game.serialId}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/40 transition-all group">
            {game.coverImage ? (
              <Image src={game.coverImage} alt={game.title} width={56} height={75}
                className="w-14 h-[75px] rounded-lg object-cover shrink-0" unoptimized />
            ) : (
              <div className="w-14 h-[75px] rounded-lg bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{game.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {game.studioName && <span>{game.studioName}</span>}
                {game.studioName && game.releaseDate && <span> · </span>}
                {game.releaseDate && <span>{new Date(game.releaseDate).getFullYear()}</span>}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
