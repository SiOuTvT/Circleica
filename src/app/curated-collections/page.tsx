import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "精选合集",
  description: "精选游戏合集，发现更多精彩作品",
  openGraph: { title: "精选合集 · 同人游戏站", description: "精选游戏合集", images: ["/opengraph-image"] },
}

export const revalidate = 300

export default async function CuratedCollectionsPage() {
  let collections: any[] = []
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
    // 构建期数据库不可用，返回空列表
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col gap-6 pt-4">
        <h1 className="text-2xl font-bold text-foreground">精选合集</h1>
        <div className="text-center py-16 text-muted-foreground">暂无精选合集</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="text-2xl font-bold text-foreground">精选合集</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c: any) => (
          <CollectionCard
            key={c.id}
            id={c.id}
            name={c.name}
            description={c.description}
            count={c._count.games}
            covers={c.games.map((g: any) => ({ title: g.game.title, cover: g.game.coverImage }))}
          />
        ))}
      </div>
    </div>
  )
}

function CollectionCard({ id, name, description, count, covers }: {
  id: string; name: string; description: string; count: number
  covers: Array<{ title: string; cover: string }>
}) {
  return (
    <Link href={`/curated-collections/${id}`}
      className="group block rounded-2xl bg-card ring-1 ring-border overflow-hidden hover:ring-primary/40 transition-all">
      {/* 堆叠封面效果 */}
      <div className="relative h-44 overflow-hidden bg-muted">
        {covers.length > 0 ? (
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            {covers.slice(0, 4).map((g, i) => (
              <div key={i}
                className="absolute transition-transform duration-300 group-hover:translate-y-[-4px]"
                style={{
                  left: `${15 + i * 18}%`,
                  zIndex: 4 - i,
                  transform: `rotate(${(i - 1.5) * 3}deg)`,
                }}>
                {g.cover ? (
                  <Image src={g.cover} alt={g.title} width={100} height={140}
                    className="w-[100px] h-[140px] rounded-lg object-cover shadow-lg ring-1 ring-black/10" unoptimized />
                ) : (
                  <div className="w-[100px] h-[140px] rounded-lg bg-muted-foreground/10 shadow-lg ring-1 ring-black/10 flex items-center justify-center text-muted-foreground text-xs">
                    无封面
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">暂无游戏</div>
        )}
      </div>

      {/* 信息 */}
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{name}</h3>
        {description && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
        <p className="text-xs text-muted-foreground">{count} 部游戏</p>
      </div>
    </Link>
  )
}
